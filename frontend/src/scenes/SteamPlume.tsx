import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, ShaderMaterial } from 'three'
import type { PerspectiveCamera } from 'three'

const VERTEX = `
uniform float uTime;
uniform float uHeight;
uniform float uRadius;
uniform float uSpeed;
uniform float uScale;
uniform float uSize;
attribute vec4 aSeed;
varying float vAlpha;
void main() {
  float life = fract(aSeed.z + uTime * uSpeed * (0.65 + 0.35 * aSeed.w));
  vec3 p = vec3(aSeed.x * uRadius, life * uHeight, aSeed.y * uRadius);
  // 위로 올라가며 살랑살랑 흔들린다.
  float sway = life * (0.5 + aSeed.w);
  p.x += sin(uTime * 0.55 + aSeed.z * 31.0 + life * 4.0) * sway;
  p.z += cos(uTime * 0.47 + aSeed.x * 17.0 + life * 3.0) * sway;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  float size = uSize * (0.55 + 1.9 * life) * (0.7 + 0.6 * aSeed.w);
  gl_PointSize = size * uScale / max(-view.z, 0.5);
  vAlpha = smoothstep(0.0, 0.14, life) * (1.0 - smoothstep(0.5, 1.0, life));
}
`

const FRAGMENT = `
uniform float uOpacity;
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float soft = 1.0 - smoothstep(0.0, 1.0, d);
  soft *= soft;
  gl_FragColor = vec4(uColor, soft * vAlpha * uOpacity);
}
`

/** 올라가며 퍼지다 사라지는 김. GPU 셰이더 파티클 하나로 그려 부담을 줄인다. */
export function SteamPlume({
  position = [0, 0, 0],
  radius = 3,
  height = 4,
  count = 60,
  size = 1.6,
  speed = 0.09,
  opacity = 0.34,
  color = [0.94, 0.96, 1],
  seed = 1,
}: {
  position?: [number, number, number]
  radius?: number
  height?: number
  count?: number
  size?: number
  speed?: number
  opacity?: number
  color?: [number, number, number]
  seed?: number
}) {
  const geometry = useMemo(() => {
    let state = seed * 7919
    const random = () => {
      state = (state * 1664525 + 1013904223) % 4294967296
      return state / 4294967296
    }
    const seeds = new Float32Array(count * 4)
    for (let index = 0; index < count; index++) {
      const angle = random() * Math.PI * 2
      const distance = Math.sqrt(random())
      seeds[index * 4] = Math.cos(angle) * distance
      seeds[index * 4 + 1] = Math.sin(angle) * distance
      seeds[index * 4 + 2] = random()
      seeds[index * 4 + 3] = random()
    }
    const result = new BufferGeometry()
    result.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(count * 3), 3),
    )
    result.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    result.boundingSphere = null
    return result
  }, [count, seed])
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: height },
      uRadius: { value: radius },
      uSpeed: { value: speed },
      uScale: { value: 600 },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uColor: { value: color },
    }),
    [height, radius, speed, size, opacity, color],
  )

  useFrame(({ clock, camera, size: viewport, viewport: info }) => {
    const current = material.current
    if (!current) return
    current.uniforms.uTime.value = clock.elapsedTime
    const fov = (camera as PerspectiveCamera).fov ?? 60
    current.uniforms.uScale.value =
      (viewport.height * info.dpr) / (2 * Math.tan((fov * Math.PI) / 360))
  })

  return (
    <points
      geometry={geometry}
      position={position}
      frustumCulled={false}
      renderOrder={5}
    >
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
