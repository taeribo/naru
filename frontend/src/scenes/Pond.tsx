import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, Matrix4, Shape, ShapeGeometry, Vector3 } from 'three'
import { POND } from './terrain'

const VERTEX = `
varying vec3 vWorld;
varying vec2 vLocal;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vLocal = position.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FRAGMENT = `
uniform float uTime;
varying vec3 vWorld;
varying vec2 vLocal;
void main() {
  vec2 p = vLocal;
  vec2 q = abs(p) - vec2(${POND.width / 2 - POND.radius}, ${POND.depth / 2 - POND.radius});
  float edge = ${POND.radius} - length(max(q, 0.0)) - min(max(q.x, q.y), 0.0);
  float a = sin(dot(p, vec2(1.64, 2.3)) + uTime * 1.1);
  float b = sin(dot(p, vec2(-2.7, 2.1)) - uTime * 0.83);
  float c = sin(dot(p, vec2(1.1, -4.9)) + uTime * 1.52);
  vec3 normal = normalize(vec3(a * 0.035 + b * 0.017, 1.0, b * 0.026 + c * 0.015));
  vec3 eye = normalize(cameraPosition - vWorld);
  vec3 reflection = reflect(-eye, normal);
  float fresnel = 0.12 + 0.70 * pow(1.0 - max(dot(eye, normal), 0.0), 4.5);
  vec3 water = mix(vec3(0.073, 0.13, 0.15), vec3(0.013, 0.064, 0.115), smoothstep(0.12, 3.4, edge));
  vec3 sky = mix(vec3(0.21, 0.17, 0.255), vec3(0.066, 0.094, 0.190), smoothstep(0.02, 0.68, reflection.y));
  float sunset = pow(max(dot(reflection, normalize(vec3(0.38, 0.14, -0.9))), 0.0), 11.0);
  sky += vec3(0.22, 0.105, 0.06) * sunset;
  vec3 color = mix(water, sky, fresnel);
  float shimmer = pow(max(0.0, a * 0.58 + b * 0.42), 5.0) * sunset;
  color += vec3(0.08, 0.055, 0.045) * shimmer;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function outline() {
  const x = POND.width / 2
  const y = POND.depth / 2
  const r = POND.radius
  const shape = new Shape()
  shape.moveTo(-x + r, -y)
  shape.lineTo(x - r, -y)
  shape.quadraticCurveTo(x, -y, x, -y + r)
  shape.lineTo(x, y - r)
  shape.quadraticCurveTo(x, y, x - r, y)
  shape.lineTo(-x + r, y)
  shape.quadraticCurveTo(-x, y, -x, y - r)
  shape.lineTo(-x, -y + r)
  shape.quadraticCurveTo(-x, -y, -x + r, -y)
  return shape
}

const ROCK_COUNT = 64

export function Pond() {
  const shape = useMemo(outline, [])
  const water = useMemo(() => new ShapeGeometry(shape, 16), [shape])
  const bank = useMemo(
    () => shape.getSpacedPoints(ROCK_COUNT).slice(0, ROCK_COUNT),
    [shape],
  )
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group position={[POND.x, 0, POND.z]} name="rear-pond">
      <mesh geometry={water} rotation-x={-Math.PI / 2} position-y={0.056}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
        />
      </mesh>
      <instancedMesh
        args={[undefined, undefined, ROCK_COUNT]}
        ref={(mesh) => {
          if (!mesh) return
          const transform = new Matrix4()
          const scale = new Vector3()
          const color = new Color()
          bank.forEach(({ x, y }, index) => {
            const width = 0.65 + (index % 5) * 0.1
            scale.set(width * 1.16, 0.25 + (index % 7) * 0.043, width)
            transform
              .makeRotationY(index * 2.39996)
              .scale(scale)
              .setPosition(x, 0.12, -y)
            mesh.setMatrixAt(index, transform)
            mesh.setColorAt(
              index,
              color.setHSL(
                0.065 + (index % 6) * 0.02,
                0.11,
                0.29 + (index % 5) * 0.039,
              ),
            )
          })
          mesh.instanceMatrix.needsUpdate = true
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
          mesh.computeBoundingSphere()
        }}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
    </group>
  )
}
