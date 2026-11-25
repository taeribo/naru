import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { roofGeometry } from './shapes'
import {
  getCastleGlowTexture,
  getCastleSignTexture,
  getCastleWallTexture,
  getRoofTileTexture,
} from './textures'

export const CASTLE_POSITION: [number, number] = [-30, -56]

const GOLD = '#e8b84a'
const ROOF_TINT = '#6e7692'

// 아래에서 위로 쌓이는 층: 벽 크기와 높이.
const TIERS = [
  { width: 16, depth: 12, height: 5.5 },
  { width: 12.5, depth: 9.5, height: 4.5 },
  { width: 9.5, depth: 7.5, height: 4 },
  { width: 6.5, depth: 5.5, height: 3.6 },
]
const STONE_BASE = 4

function Pine({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position-y={1.6} rotation-z={0.18}>
        <cylinderGeometry args={[0.22, 0.38, 3.2, 7]} />
        <meshStandardMaterial color="#4a2f2a" roughness={1} />
      </mesh>
      {(
        [
          [0.3, 3.3, 0, 2.6],
          [-1.5, 2.4, 0.4, 1.9],
          [1.9, 2.0, -0.3, 1.7],
        ] as const
      ).map(([x, y, z, size]) => (
        <mesh
          key={x}
          position={[x, y, z]}
          scale={[size, size * 0.42, size * 0.85]}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#2f7a5a" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** 흰 회반죽 벽, 검은 기와, 금 장식의 일본 성(천수각). */
export function Castle() {
  const wall = useMemo(getCastleWallTexture, [])
  const glow = useMemo(getCastleGlowTexture, [])
  const tiles = useMemo(getRoofTileTexture, [])
  const sign = useMemo(getCastleSignTexture, [])

  const layout = useMemo(() => {
    let base = STONE_BASE
    return TIERS.map((tier) => {
      const entry = {
        ...tier,
        base,
        roof: roofGeometry(
          (tier.width + 6) / 2,
          (tier.depth + 6) / 2,
          2.3,
          0.7,
        ),
      }
      base += tier.height + 1.5
      return entry
    })
  }, [])
  const top = layout[layout.length - 1]
  const topY = top.base + top.height + 2.6

  return (
    <group
      position={[CASTLE_POSITION[0], 0, CASTLE_POSITION[1]]}
      rotation-y={0.34}
      scale={0.95}
    >
      {/* 돌담(이시가키): 아래가 넓은 사각뿔대 */}
      <mesh position-y={STONE_BASE / 2} rotation-y={Math.PI / 4}>
        <cylinderGeometry args={[15.5, 20.5, STONE_BASE, 4]} />
        <meshStandardMaterial color="#8d869c" roughness={1} />
      </mesh>
      {layout.map(({ width, depth, height, base, roof }, index) => (
        <group key={index}>
          <mesh position-y={base + height / 2}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
              map={wall}
              emissiveMap={glow}
              emissive="#ffffff"
              emissiveIntensity={1.1}
              roughness={1}
            />
          </mesh>
          <mesh geometry={roof} position-y={base + height - 0.1}>
            <meshStandardMaterial
              map={tiles}
              color={ROOF_TINT}
              roughness={0.7}
              side={DoubleSide}
            />
          </mesh>
          <mesh position-y={base + height + 0.05}>
            <boxGeometry args={[width + 0.5, 0.22, depth + 0.5]} />
            <meshStandardMaterial color="#23232c" />
          </mesh>
        </group>
      ))}
      {/* 정면 지붕(카라하후) · 현관 · 간판 */}
      <mesh
        geometry={layout[0].roof}
        position={[0, STONE_BASE + 2.8, 6.4]}
        scale={[0.4, 0.5, 0.28]}
      >
        <meshStandardMaterial
          map={tiles}
          color={ROOF_TINT}
          roughness={0.7}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, STONE_BASE + 4.6, 6.05]}>
        <boxGeometry args={[4.4, 1.5, 0.3]} />
        <meshStandardMaterial color="#1a1416" />
      </mesh>
      <mesh position={[0, STONE_BASE + 4.6, 6.22]}>
        <planeGeometry args={[4.2, 1.3]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <mesh position={[0, STONE_BASE + 2.2, 6.02]}>
        <boxGeometry args={[2.6, 2.6, 0.2]} />
        <meshStandardMaterial
          color="#3a2418"
          emissive="#ff9a3c"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* 치도리 박공: 흰 삼각 벽에 금 문장 */}
      <group
        position={[
          0,
          layout[1].base + layout[1].height + 1.2,
          layout[1].depth / 2 + 0.3,
        ]}
      >
        <mesh rotation-z={Math.PI / 2 + Math.PI} scale={[1, 1, 0.12]}>
          <coneGeometry args={[2.7, 2.6, 3]} />
          <meshStandardMaterial color="#f2efe8" />
        </mesh>
        <mesh position={[0, -0.2, 0.12]}>
          <circleGeometry args={[0.55, 24]} />
          <meshStandardMaterial
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
      {/* 꼭대기 금 샤치호코 */}
      <mesh position-y={topY + 0.4}>
        <coneGeometry args={[0.35, 1.8, 8]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.7}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 3.7, topY - 1.5, 0]}
          rotation-z={-side * 0.5}
        >
          <coneGeometry args={[0.35, 1.6, 6]} />
          <meshStandardMaterial
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      <Pine position={[-15, 0, 9]} scale={1.6} />
      <Pine position={[16, 0, 8]} scale={1.9} />
      <Pine position={[-18, 0, -2]} scale={1.3} />
    </group>
  )
}
