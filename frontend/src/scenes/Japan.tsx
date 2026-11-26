import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { ZONES } from './terrain'
import { getNoboriTexture } from './textures'

function Nobori({
  position,
  yaw = 0,
}: {
  position: [number, number, number]
  yaw?: number
}) {
  const banner = useMemo(getNoboriTexture, [])
  return (
    <group position={position} rotation-y={yaw}>
      <mesh position-y={3.2}>
        <cylinderGeometry args={[0.07, 0.09, 6.4, 6]} />
        <meshStandardMaterial color="#2a1a12" />
      </mesh>
      <mesh position-y={6.1} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
        <meshStandardMaterial color="#2a1a12" />
      </mesh>
      <mesh position={[0.6, 4.1, 0]}>
        <planeGeometry args={[1.2, 3.6]} />
        <meshStandardMaterial
          map={banner}
          emissiveMap={banner}
          emissive="#ffffff"
          emissiveIntensity={0.35}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

/** 일본풍 연출: 체험 구역의 축제 깃발(노보리). */
export function Japan() {
  return (
    <group>
      {/* 건물 사이 길가의 축제 깃발 */}
      {[
        [ZONES.fortune[0] - 4.4, ZONES.fortune[1] + 2.0],
        [ZONES.wish[0] - 4.6, ZONES.wish[1] + 2.5],
        [ZONES.bell[0] + 4.8, ZONES.bell[1] + 2.0],
        [ZONES.rest[0] + 5.0, ZONES.rest[1] + 2.6],
      ].map(([x, z]) => (
        <Nobori
          key={`${x}-${z}`}
          position={[x, 0, z]}
          yaw={x < 0 ? 0.3 : -0.3}
        />
      ))}
    </group>
  )
}
