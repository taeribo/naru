import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
} from 'three'
import { getGlowTexture, getMoonTexture } from './textures'

const DOME_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const DOME_FRAGMENT = `varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 horizon = vec3(0.34, 0.1, 0.24);
  vec3 mid = vec3(0.07, 0.035, 0.2);
  vec3 top = vec3(0.012, 0.012, 0.07);
  vec3 color = mix(horizon, mid, smoothstep(0.0, 0.3, h));
  color = mix(color, top, smoothstep(0.22, 0.9, h));
  color = mix(color, vec3(0.09, 0.04, 0.13), smoothstep(0.0, -0.35, h));
  vec3 axis = normalize(vec3(0.55, 0.45, -0.7));
  float band = exp(-pow(dot(vDir, axis) * 5.0, 2.0));
  float cloud = 0.55 + 0.45 * sin(vDir.x * 9.0 + sin(vDir.z * 7.0) * 2.0) * sin(vDir.y * 11.0 + vDir.x * 4.0);
  color += vec3(0.28, 0.1, 0.5) * band * cloud * smoothstep(0.0, 0.25, h);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const STAR_VERTEX = `
uniform float uTime;
uniform float uPixel;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  float twinkle = 0.62 + 0.38 * sin(uTime * (0.7 + aPhase * 1.8) + aPhase * 40.0);
  vTwinkle = twinkle;
  vColor = aColor;
  gl_PointSize = aSize * uPixel * (0.8 + 0.4 * twinkle);
}`

const STAR_FRAGMENT = `
varying vec3 vColor;
varying float vTwinkle;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.0, d);
  float alpha = pow(core, 2.0) * vTwinkle;
  gl_FragColor = vec4(vColor * (1.0 + core), alpha);
  #include <colorspace_fragment>
}`

// 따뜻한 주황빛 풍등과 구분되도록 별은 차가운 흰색·푸른색만 쓴다.
const STAR_TINTS = [
  [0.82, 0.9, 1.0],
  [0.72, 0.82, 1.0],
  [1.0, 1.0, 1.0],
]

function createStarGeometry() {
  let seed = 90210
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const positions: number[] = []
  const sizes: number[] = []
  const phases: number[] = []
  const colors: number[] = []
  const radius = 90
  const push = (
    x: number,
    y: number,
    z: number,
    size: number,
    tint: number[],
  ) => {
    const length = Math.hypot(x, y, z)
    positions.push(
      (x / length) * radius,
      (y / length) * radius,
      (z / length) * radius,
    )
    sizes.push(size)
    phases.push(random())
    colors.push(...tint)
  }

  for (let index = 0; index < 1700; index += 1) {
    const y = 0.02 + random() * 0.98
    const angle = random() * Math.PI * 2
    const ring = Math.sqrt(1 - y * y)
    const bright = random() < 0.07
    push(
      Math.cos(angle) * ring,
      y,
      Math.sin(angle) * ring,
      bright ? 7 + random() * 5 : 1.6 + random() * 2.6,
      STAR_TINTS[Math.floor(random() * STAR_TINTS.length)],
    )
  }

  // 은하수: 기울어진 큰 원 주변에 작은 별을 촘촘히 모은다.
  const tilt = 0.9
  for (let index = 0; index < 1100; index += 1) {
    const phi = random() * Math.PI * 2
    const spread = (random() + random() + random() - 1.5) * 0.17
    const x = Math.cos(phi)
    const y = Math.sin(phi) * Math.cos(tilt) + spread
    const z = Math.sin(phi) * Math.sin(tilt) + spread * 0.5
    if (y < 0.03) continue
    push(x, y, z, 1.2 + random() * 1.8, [0.7, 0.66, 1.0])
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(positions), 3),
  )
  geometry.setAttribute(
    'aSize',
    new BufferAttribute(new Float32Array(sizes), 1),
  )
  geometry.setAttribute(
    'aPhase',
    new BufferAttribute(new Float32Array(phases), 1),
  )
  geometry.setAttribute(
    'aColor',
    new BufferAttribute(new Float32Array(colors), 3),
  )
  return geometry
}

function Stars() {
  const dpr = useThree((state) => state.viewport.dpr)
  const geometry = useMemo(createStarGeometry, [])
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixel: { value: 1 } }),
    [],
  )

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uPixel.value = dpr * 1.2
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-9}>
      <shaderMaterial
        vertexShader={STAR_VERTEX}
        fragmentShader={STAR_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

function Moon() {
  const moon = useMemo(getMoonTexture, [])
  const halo = useMemo(getGlowTexture, [])

  return (
    <group position={[62, 47, -104]}>
      <mesh>
        <sphereGeometry args={[1.2, 48, 32]} />
        <meshBasicMaterial map={moon} toneMapped={false} fog={false} />
      </mesh>
      {(
        [
          [5, '#ffe3b0', 0.38],
          [12.5, '#b9a2ff', 0.14],
        ] as const
      ).map(([size, color, opacity]) => (
        <sprite key={size} scale={[size, size, 1]}>
          <spriteMaterial
            map={halo}
            color={color}
            opacity={opacity}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  )
}

export function Sky() {
  return (
    <>
      <mesh renderOrder={-10}>
        <sphereGeometry args={[170, 32, 24]} />
        <shaderMaterial
          vertexShader={DOME_VERTEX}
          fragmentShader={DOME_FRAGMENT}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <Stars />
      <Moon />
    </>
  )
}
