import { useMemo } from 'react'
import { BoxGeometry, PlaneGeometry, Vector2 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useSurface } from './surfaces'
import {
  ONSEN_GATE_Z,
  ONSEN_SITE,
  ONSEN_WALL_X,
  ZONES,
} from './terrain'

const [X0, X1, Z0, Z1] = ONSEN_SITE
const BASE = 0.7
const PLASTER = 1.7
const CAP = 0.32
const THICKNESS = 1
const TILE = 3.4

/** 담 한 구간. 축 정렬이며 (x0, z0)~(x1, z1) 사이를 채운다. */
function segment(x0: number, z0: number, x1: number, z1: number) {
  const width = Math.max(Math.abs(x1 - x0), THICKNESS)
  const depth = Math.max(Math.abs(z1 - z0), THICKNESS)
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const place = (height: number, y: number, grow: number) => {
    const box = new BoxGeometry(width + grow, height, depth + grow)
    box.translate(cx, y + height / 2, cz)
    return box
  }
  return {
    base: place(BASE, 0, 0.1),
    plaster: place(PLASTER, BASE, 0),
    cap: place(CAP, BASE + PLASTER, 0.35),
    snow: place(0.14, BASE + PLASTER + CAP, 0.2),
  }
}

/** 온천 구역을 둘러싼 흙담: 돌 기단, 흰 회벽, 기와 지붕, 윗면의 눈. 서쪽 담에 문이 난다. */
export function OnsenCompound() {
  const stone = useSurface('stone')
  const roof = useSurface('roof')
  const relief = useMemo(() => new Vector2(0.46, 0.46), [])
  const parts = useMemo(() => {
    const [gateA, gateB] = ONSEN_GATE_Z
    const wall = [
      segment(ONSEN_WALL_X, Z0, ONSEN_WALL_X, gateA),
      segment(ONSEN_WALL_X, gateB, ONSEN_WALL_X, Z1),
      segment(X0, Z1, X1, Z1),
      segment(X0, Z0, X1, Z0),
      segment(X1, Z0, X1, Z1),
    ]
    const merge = (key: 'base' | 'plaster' | 'cap' | 'snow') =>
      mergeGeometries(wall.map((part) => part[key]))
    return {
      base: merge('base'),
      plaster: merge('plaster'),
      cap: merge('cap'),
      snow: merge('snow'),
    }
  }, [])
  // 접근로(광장 북쪽 끝에서 문까지)와 탕 앞길의 판석.
  const paving = useMemo(
    () =>
      (
        [
          [30, ONSEN_WALL_X, -54, -38],
          [ONSEN_WALL_X, ZONES.rest[0] - 8.4, ONSEN_GATE_Z[0], ONSEN_GATE_Z[1]],
        ] as const
      ).map(([x0, x1, z0, z1]) => {
        const width = x1 - x0
        const depth = z1 - z0
        const geometry = new PlaneGeometry(width, depth)
        const uv = geometry.attributes.uv
        for (let index = 0; index < uv.count; index++) {
          uv.setXY(
            index,
            (x0 + uv.getX(index) * width) / TILE,
            (-z1 + uv.getY(index) * depth) / TILE,
          )
        }
        return { geometry, x: (x0 + x1) / 2, z: (z0 + z1) / 2 }
      }),
    [],
  )
  return (
    <>
      <mesh geometry={parts.base} castShadow receiveShadow>
        <meshStandardMaterial {...stone} color="#8c8790" roughness={1} />
      </mesh>
      <mesh geometry={parts.plaster} castShadow receiveShadow>
        <meshStandardMaterial color="#d9d4c8" roughness={1} />
      </mesh>
      <mesh geometry={parts.cap} castShadow>
        <meshStandardMaterial {...roof} color="#6f737b" roughness={0.85} />
      </mesh>
      <mesh geometry={parts.snow}>
        <meshStandardMaterial color="#eef2f8" roughness={1} />
      </mesh>
      {paving.map(({ geometry, x, z }, index) => (
        <mesh
          key={index}
          receiveShadow
          geometry={geometry}
          rotation-x={-Math.PI / 2}
          position={[x, 0.03, z]}
        >
          <meshStandardMaterial
            {...stone}
            normalScale={relief}
            roughness={0.89}
            color="#a9a199"
          />
        </mesh>
      ))}
    </>
  )
}
