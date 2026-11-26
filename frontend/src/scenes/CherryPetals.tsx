import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { DoubleSide, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { InstancedMesh } from 'three'
import { getPetalTexture } from './textures'

const PETAL_COUNT = 3000
const FALL_HEIGHT = 16
const PETALS = Array.from({ length: PETAL_COUNT }, (_, index) => {
  const angle = index * 2.39996
  const radius = 1 + (index % 41) * 0.32
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    phase: index * 0.329,
    speed: 0.6 + (index % 7) * 0.1,
    size: 0.05 + (index % 5) * 0.014,
    spin: 1.2 + (index % 6) * 0.45,
  }
})

export function CherryPetals() {
  const mesh = useRef<InstancedMesh>(null)
  const texture = useMemo(getPetalTexture, [])
  const scratch = useMemo(
    () => ({
      matrix: new Matrix4(),
      euler: new Euler(),
      quaternion: new Quaternion(),
      position: new Vector3(),
      scale: new Vector3(),
    }),
    [],
  )

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const time = clock.elapsedTime
    const { matrix, euler, quaternion, position, scale } = scratch
    PETALS.forEach(({ x, z, phase, speed, size, spin }, index) => {
      const fall = (phase * 3 + time * speed) % FALL_HEIGHT
      position.set(
        x + Math.sin(time * 0.6 + phase) * 1.1 + fall * 0.22,
        FALL_HEIGHT - fall,
        z + Math.cos(time * 0.45 + phase) * 0.8,
      )
      euler.set(time * spin + phase, time * spin * 0.7, phase + time * 0.4)
      quaternion.setFromEuler(euler)
      scale.set(size, size, size)
      mesh.current?.setMatrixAt(
        index,
        matrix.compose(position, quaternion, scale),
      )
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, PETAL_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1.4]} />
      <meshBasicMaterial
        map={texture}
        alphaTest={0.35}
        side={DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
