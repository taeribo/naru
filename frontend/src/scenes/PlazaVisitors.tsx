import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { WorldPlayer } from '../services/world'

function Visitor({ player, own }: { player: WorldPlayer; own: boolean }) {
  const group = useRef<Group>(null)
  const initial = useRef<[number, number, number]>([player.x, 0, player.z])

  useFrame((_state, delta) => {
    if (!group.current) return
    const blend = 1 - Math.exp(-12 * delta)
    group.current.position.x += (player.x - group.current.position.x) * blend
    group.current.position.z += (player.z - group.current.position.z) * blend
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
      <mesh position-y={1.16}>
        <cylinderGeometry args={[0.12, 0.26, 0.16, 8]} />
        <meshStandardMaterial color="#242037" />
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
          position={[0, 0.015, 3.5]}
          onClick={(event) => {
            if (event.delta > 5) return
            onMove(event.point.x, event.point.z)
          }}
        >
          <planeGeometry args={[32, 15]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
      {players.map((player) => (
        <Visitor key={player.id} player={player} own={player.id === ownId} />
      ))}
    </>
  )
}
