import { Html } from '@react-three/drei'

export type PlazaZone = 'fortune' | 'wish'

export const WISH_ZONE_X = 4.55
export const ZONE_DEPTH = -2.05

const ZONES = [
  { id: 'fortune', x: -WISH_ZONE_X, label: '운세보기', color: '#a68cbd' },
  { id: 'wish', x: WISH_ZONE_X, label: '풍등날리기', color: '#d7a46f' },
] as const

export function PlazaZones({
  onOpen,
  wishDisabled,
}: {
  onOpen: (zone: PlazaZone) => void
  wishDisabled: boolean
}) {
  return ZONES.map(({ id, x, label, color }) => (
    <group key={id} position={[x, 0, ZONE_DEPTH]}>
      <mesh position-y={0.015}>
        <cylinderGeometry args={[1.02, 1.06, 0.045, 8]} />
        <meshStandardMaterial color="#4b394c" roughness={0.88} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.041}>
        <ringGeometry args={[0.87, 0.91, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.16}
        />
      </mesh>
      <Html center zIndexRange={[2, 0]} position={[0, 0.62, 0]}>
        <button
          type="button"
          className="plaza-zone-button"
          data-zone={id}
          disabled={id === 'wish' && wishDisabled}
          onClick={() => onOpen(id)}
        >
          {label}
        </button>
      </Html>
    </group>
  ))
}
