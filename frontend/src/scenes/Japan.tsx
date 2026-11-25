import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { LANDING_HEIGHT, TORII_Z } from './terrain'
import { getNoboriTexture } from './textures'

const VERMILION = '#d23b2a'
const BLACK = '#1a1416'

function Torii({
  position,
  yaw = 0,
  scale = 1,
}: {
  position: [number, number, number]
  yaw?: number
  scale?: number
}) {
  return (
    <group position={position} rotation-y={yaw} scale={scale}>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * 2.9}>
          <mesh position-y={3.6}>
            <cylinderGeometry args={[0.27, 0.34, 7.2, 12]} />
            <meshStandardMaterial color={VERMILION} roughness={0.6} />
          </mesh>
          <mesh position-y={0.25}>
            <cylinderGeometry args={[0.4, 0.44, 0.5, 12]} />
            <meshStandardMaterial color={BLACK} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position-y={5.2}>
        <boxGeometry args={[7.4, 0.3, 0.32]} />
        <meshStandardMaterial color={VERMILION} roughness={0.6} />
      </mesh>
      <mesh position-y={6.9}>
        <boxGeometry args={[8.2, 0.36, 0.5]} />
        <meshStandardMaterial color={VERMILION} roughness={0.6} />
      </mesh>
      <mesh position-y={7.3}>
        <boxGeometry args={[9.0, 0.34, 0.72]} />
        <meshStandardMaterial color={BLACK} roughness={0.7} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 4.45, 7.42, 0]}
          rotation-z={side * 0.22}
        >
          <boxGeometry args={[1.5, 0.34, 0.72]} />
          <meshStandardMaterial color={BLACK} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 6.05, 0]}>
        <boxGeometry args={[0.9, 1.0, 0.14]} />
        <meshStandardMaterial
          color="#e8b84a"
          emissive="#e8b84a"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* 금줄과 종이 장식(시메나와) */}
      <mesh position={[0, 5.55, 0]} rotation-z={Math.PI} scale={[1, 0.16, 1]}>
        <torusGeometry args={[2.9, 0.1, 8, 28, Math.PI]} />
        <meshStandardMaterial color="#d9c28a" roughness={1} />
      </mesh>
      {[-1.5, -0.5, 0.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 5.2, 0]}>
          <boxGeometry args={[0.14, 0.42, 0.02]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

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

/** 일본풍 연출: 붉은 도리이 길, 축제 깃발(노보리). */
export function Japan() {
  return (
    <group>
      {/* 입장 계단 위 착지대의 붉은 도리이 */}
      <Torii position={[0, LANDING_HEIGHT, TORII_Z]} scale={1.6} />
      {/* 건물 사이 길가의 축제 깃발 */}
      {[
        [-22, -6],
        [-22, -2],
        [-22, 2],
        [22, -6],
        [22, -2],
        [22, 2],
      ].map(([x, z]) => (
        <Nobori
          key={`${x}${z}`}
          position={[x, 0, z]}
          yaw={x < 0 ? 0.3 : -0.3}
        />
      ))}
    </group>
  )
}
