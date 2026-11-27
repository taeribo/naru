import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { WorldPlayer } from '../services/world'
import { MAP_BOUNDS, groundHeight, isWalkable } from './terrain'

function Visitor({ player, own }: { player: WorldPlayer; own: boolean }) {
  const group = useRef<Group>(null)
  const initial = useRef<[number, number, number]>([player.x, 0, player.z])

  useFrame((_state, delta) => {
    if (!group.current) return
    const blend = 1 - Math.exp(-12 * delta)
    const dx = player.x - group.current.position.x
    const dz = player.z - group.current.position.z
    if (Math.hypot(dx, dz) > 0.025) {
      const turn = Math.atan2(-dx, -dz) - group.current.rotation.y
      group.current.rotation.y +=
        Math.atan2(Math.sin(turn), Math.cos(turn)) * blend
    }
    group.current.position.x += dx * blend
    group.current.position.z += dz * blend
    // 계단을 오르내릴 때 높이가 툭툭 튀지 않게 부드럽게 따라간다.
    group.current.position.y +=
      (groundHeight(group.current.position.x, group.current.position.z) -
        group.current.position.y) *
      blend
  })

  return (
    <group ref={group} position={initial.current}>
      <mesh position-y={0.48}>
        <cylinderGeometry args={[0.21, 0.31, 0.67, 8]} />
        <meshStandardMaterial color={own ? '#74b6aa' : '#a17acc'} />
      </mesh>
      <mesh position-y={0.99}>
        <sphereGeometry args={[0.2, 9, 7]} />
        <meshStandardMaterial color="#efd2bc" />
      </mesh>
      <mesh position-y={1.04} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.215, 9, 7]} />
        <meshStandardMaterial color="#1c1822" />
      </mesh>
      <mesh position={[0, 1.26, -0.06]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color="#1c1822" />
      </mesh>
      <mesh position-y={0.52}>
        <cylinderGeometry args={[0.285, 0.285, 0.16, 8]} />
        <meshStandardMaterial color="#c8302a" />
      </mesh>
      {own && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.025}>
          <ringGeometry args={[0.37, 0.43, 22]} />
          <meshBasicMaterial color="#ffe2a2" />
        </mesh>
      )}
    </group>
  )
}

export function PlazaVisitors({
  players,
  ownId,
  onMove,
}: {
  players: WorldPlayer[]
  ownId: string | null
  onMove: (x: number, z: number) => void
}) {
  return (
    <>
      {ownId !== null && (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[
            (MAP_BOUNDS.minX + MAP_BOUNDS.maxX) / 2,
            0.015,
            (MAP_BOUNDS.minZ + MAP_BOUNDS.maxZ) / 2,
          ]}
          onClick={(event) => {
            if (event.delta > 5) return
            if (!isWalkable(event.point.x, event.point.z)) return
            onMove(event.point.x, event.point.z)
          }}
        >
          <planeGeometry
            args={[
              MAP_BOUNDS.maxX - MAP_BOUNDS.minX,
              MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ,
            ]}
          />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
      {players.map((player) => (
        <Visitor key={player.id} player={player} own={player.id === ownId} />
      ))}
    </>
  )
}
