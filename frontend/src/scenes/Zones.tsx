import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { BellHall, EmaRack, OmikujiBox, OmikujiRack, RestHall } from './Halls'
import { ZONES } from './terrain'
import {
  getDoorTextures,
  getDoorTexturesAlt,
  getSignTexture,
  getWoodTexture,
} from './textures'

export const ZONE_LABELS = {
  bell: '종울리기',
  wish: '소원패',
  fortune: '운세뽑기',
  rest: '휴식공간',
} as const

export type ZoneId = keyof typeof ZONE_LABELS

function Zone({
  position,
  yaw = 0,
  label,
  hint,
  ringColor,
  padColor,
  onSelect,
  children,
}: {
  position: [number, number, number]
  yaw?: number
  label: string
  hint: string
  ringColor: string
  padColor: string
  onSelect: () => void
  children: ReactNode
}) {
  function select(event: ThreeEvent<MouseEvent>) {
    if (event.delta > 5) return
    event.stopPropagation()
    onSelect()
  }

  return (
    <group
      position={position}
      rotation-y={yaw}
      onClick={select}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position-y={0.04}>
        <cylinderGeometry args={[2.5, 2.6, 0.16, 40]} />
        <meshStandardMaterial color={padColor} roughness={0.9} />
      </mesh>
      <mesh position-y={0.13} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.1, 2.3, 48]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position-y={0.13} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.85, 1.9, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.55} />
      </mesh>
      {children}
      <pointLight
        position={[0, 2.4, 0.6]}
        color={ringColor}
        intensity={22}
        distance={9}
      />
      <Html position={[0, 5.0, 0]} center zIndexRange={[5, 0]}>
        <button type="button" className="zone-label" onClick={onSelect}>
          <strong>{label}</strong>
          <span>{hint}</span>
        </button>
      </Html>
    </group>
  )
}

function FortuneStall() {
  const wood = useMemo(getWoodTexture, [])
  const doorsRed = useMemo(getDoorTextures, [])
  const doorsPink = useMemo(getDoorTexturesAlt, [])
  const sign = useMemo(getSignTexture, [])
  const columns = 5

  return (
    <group position-z={-0.9}>
      {/* 아래 검은 사물함 */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[4.1, 0.8, 0.5]} />
        <meshStandardMaterial color="#2a2523" roughness={0.8} />
      </mesh>
      {/* 나무 판벽 */}
      <mesh position={[0, 1.8, -0.05]}>
        <boxGeometry args={[4.1, 1.8, 0.4]} />
        <meshStandardMaterial map={wood} roughness={0.85} />
      </mesh>
      {/* 운세 칸: 종이 쪽지 + 검은 판 위의 꽃 */}
      {[0, 1].flatMap((row) =>
        Array.from({ length: columns }, (_, column) => (
          <mesh
            key={`${row}-${column}`}
            position={[
              (column - (columns - 1) / 2) * 0.78,
              2.18 - row * 0.82,
              0.17,
            ]}
          >
            <planeGeometry args={[0.66, 0.74]} />
            <meshStandardMaterial
              map={(row + column) % 2 === 0 ? doorsRed : doorsPink}
              roughness={0.8}
            />
          </mesh>
        )),
      )}
      {/* 기둥 */}
      {[-2.15, 2.15].map((x) => (
        <mesh key={x} position={[x, 1.55, 0.05]}>
          <boxGeometry args={[0.16, 3.1, 0.3]} />
          <meshStandardMaterial color="#6b3d1c" roughness={0.9} />
        </mesh>
      ))}
      {/* 기와 처마 */}
      <mesh position={[0, 3.25, 0.25]} rotation-x={0.22}>
        <boxGeometry args={[4.7, 0.14, 1.5]} />
        <meshStandardMaterial color="#33353b" roughness={0.9} />
      </mesh>
      {Array.from({ length: 14 }, (_, index) => (
        <mesh
          key={index}
          position={[(index - 6.5) * 0.34, 3.31, 0.25]}
          rotation-x={0.22}
        >
          <boxGeometry args={[0.1, 0.06, 1.5]} />
          <meshStandardMaterial color="#1f2024" roughness={0.9} />
        </mesh>
      ))}
      {/* 천막 */}
      <mesh position={[0, 3.95, 0.35]} rotation-x={-0.42}>
        <boxGeometry args={[5.2, 0.05, 2.1]} />
        <meshStandardMaterial color="#c8302a" roughness={1} />
      </mesh>
      {/* 간판 */}
      <group position={[0.7, 3.0, 1.1]} rotation-z={0.07}>
        <mesh>
          <boxGeometry args={[1.9, 0.62, 0.06]} />
          <meshStandardMaterial color="#1b1a1d" />
        </mesh>
        <mesh position-z={0.04}>
          <planeGeometry args={[1.9, 0.62]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} position={[x, 0.45, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
            <meshStandardMaterial color="#6a5a48" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function Zones({ onSelect }: { onSelect: (zone: ZoneId) => void }) {
  return (
    <>
      <Zone
        position={[ZONES.fortune[0], 0, ZONES.fortune[1]]}
        yaw={0.4}
        label={ZONE_LABELS.fortune}
        hint="한지 운세"
        ringColor="#9c93ff"
        padColor="#2a2750"
        onSelect={() => onSelect('fortune')}
      >
        <FortuneStall />
        <group position={[0, 0, 1.5]}>
          <OmikujiBox />
        </group>
        <group position={[3.7, 0, 0.4]} rotation-y={-0.5}>
          <OmikujiRack />
        </group>
      </Zone>
      <Zone
        position={[ZONES.wish[0], 0, ZONES.wish[1]]}
        yaw={-0.4}
        label={ZONE_LABELS.wish}
        hint="소원 작성"
        ringColor="#ffa24d"
        padColor="#4a2a2c"
        onSelect={() => onSelect('wish')}
      >
        <EmaRack />
      </Zone>
      <Zone
        position={[ZONES.bell[0], 0, ZONES.bell[1]]}
        yaw={0.4}
        label={ZONE_LABELS.bell}
        hint="마음 정리"
        ringColor="#d8b07a"
        padColor="#3a2f2a"
        onSelect={() => onSelect('bell')}
      >
        <BellHall />
      </Zone>
      <Zone
        position={[ZONES.rest[0], 0, ZONES.rest[1]]}
        yaw={-0.4}
        label={ZONE_LABELS.rest}
        hint="고요한 쉼"
        ringColor="#7fd6a0"
        padColor="#22362e"
        onSelect={() => onSelect('rest')}
      >
        <RestHall />
      </Zone>
    </>
  )
}
