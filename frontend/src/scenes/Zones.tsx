import { roofSnow, snowProgramKey } from './snow'
import { ContactShade } from './ContactShade'
import { useSurface } from './surfaces'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { DoubleSide } from 'three'
import { roofGeometry } from './shapes'
import type { WorldPlayer } from '../services/world'
import type { ReactNode } from 'react'
import { BellHall, EmaRack, OmikujiBox, OmikujiRack, RestHall } from './Halls'
import { ZONES } from './terrain'
import { getDoorTextures, getDoorTexturesAlt, getSignTexture } from './textures'

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
  nearby,
  scale = 1,
  accent,
  padColor,
  onSelect,
  children,
}: {
  position: [number, number, number]
  yaw?: number
  label: string
  nearby: boolean
  scale?: number
  accent: string
  padColor: string
  onSelect: () => void
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)

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
      onPointerOver={(event) => {
        if (event.pointerType === 'mouse') setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <ContactShade width={13.2} depth={11.6} height={0.054} />
      <mesh position-y={0.095}>
        <cylinderGeometry args={[4.18, 4.36, 0.22, 12]} />
        <meshStandardMaterial color={padColor} roughness={1} />
      </mesh>
      <group scale={scale} position-y={0.1}>
        {children}
      </group>
      <mesh position={[0, 0.22, 4.25]}>
        <boxGeometry args={[1.9, 0.2, 0.37]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
      {(nearby || hovered) && (
        <Html position={[0, 1.1, 4.35]} center zIndexRange={[2, 0]}>
          <button
            type="button"
            className="zone-label zone-label--nearby"
            onClick={onSelect}
          >
            {label}
          </button>
        </Html>
      )}
    </group>
  )
}

function FortuneStall() {
  const wood = useSurface('wood')
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
        <meshStandardMaterial {...wood} color="#997154" roughness={1} />
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

function TimberShelter({ open = false }: { open?: boolean }) {
  const timber = useSurface('wood')
  const tiles = useSurface('roof')
  const roof = useMemo(() => roofGeometry(3.12, 2.3, 1.25, 0.45), [])
  return (
    <group position-z={-1.15}>
      {[-2.52, 2.52].flatMap((x) =>
        [-1.65, 1.65].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 1.62, z]}>
            <boxGeometry args={[0.23, 3.24, 0.23]} />
            <meshStandardMaterial
              normalMap={timber.normalMap}
              roughnessMap={timber.roughnessMap}
              color={open ? '#85654e' : '#864434'}
              roughness={1}
            />
          </mesh>
        )),
      )}
      <mesh position-y={3.19}>
        <boxGeometry args={[5.45, 0.23, 3.8]} />
        <meshStandardMaterial {...timber} color="#a58065" roughness={1} />
      </mesh>
      <mesh geometry={roof} position-y={3.38}>
        <meshStandardMaterial
          onBeforeCompile={roofSnow}
          customProgramCacheKey={snowProgramKey}
          {...tiles}
          color="#858b96"
          roughness={1}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

export function Zones({
  onSelect,
  visitor,
}: {
  onSelect: (zone: ZoneId) => void
  visitor: WorldPlayer | undefined
}) {
  function closeTo(zone: ZoneId) {
    const [x, z] = ZONES[zone]
    return !!visitor && Math.hypot(visitor.x - x, visitor.z - z) < 8.5
  }
  return (
    <>
      <Zone
        position={[ZONES.fortune[0], 0, ZONES.fortune[1]]}
        yaw={0.4}
        label={ZONE_LABELS.fortune}
        nearby={closeTo('fortune')}
        scale={1.25}
        accent="#837d89"
        padColor="#686477"
        onSelect={() => onSelect('fortune')}
      >
        <TimberShelter />
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
        nearby={closeTo('wish')}
        scale={1.35}
        accent="#987d62"
        padColor="#78665b"
        onSelect={() => onSelect('wish')}
      >
        <EmaRack />
      </Zone>
      <Zone
        position={[ZONES.bell[0], 0, ZONES.bell[1]]}
        yaw={0.4}
        label={ZONE_LABELS.bell}
        nearby={closeTo('bell')}
        scale={1.4}
        accent="#a49171"
        padColor="#77706c"
        onSelect={() => onSelect('bell')}
      >
        <BellHall />
      </Zone>
      <Zone
        position={[ZONES.rest[0], 0, ZONES.rest[1]]}
        yaw={-0.4}
        label={ZONE_LABELS.rest}
        nearby={closeTo('rest')}
        scale={1.26}
        accent="#738879"
        padColor="#6b756a"
        onSelect={() => onSelect('rest')}
      >
        <TimberShelter open />
        <RestHall />
      </Zone>
    </>
  )
}
