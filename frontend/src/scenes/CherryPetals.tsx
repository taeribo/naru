import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { BufferAttribute } from 'three'

const PETAL_COUNT = 64
const PETALS = Array.from({ length: PETAL_COUNT }, (_, index) => {
  const angle = index * 2.39996
  const radius = 2 + (index % 11) * 0.53
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, index * 0.329]
})

export function CherryPetals() {
  const positions = useRef(new Float32Array(PETAL_COUNT * 3))
  const attribute = useRef<BufferAttribute>(null)

  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    PETALS.forEach(([x, z, phase], index) => {
      positions.current[index * 3] = x + Math.sin(time * 0.7 + phase) * 0.85
      positions.current[index * 3 + 1] =
        0.25 +
        ((((phase + 20_000 - time * (0.35 + (index % 5) * 0.05)) % 7.5) + 7.5) %
          7.5)
      positions.current[index * 3 + 2] = z + Math.cos(time * 0.4 + phase) * 0.65
    })
    if (attribute.current) attribute.current.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          ref={attribute}
          attach="attributes-position"
          args={[positions.current, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffaacb"
        size={0.085}
        transparent
        opacity={0.82}
        depthWrite={false}
      />
    </points>
  )
}
