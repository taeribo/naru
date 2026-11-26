import { STYLES } from './shopStyles'
import type { ShopKind } from './shopStyles'
import { WORLD_BOUNDS } from './terrain'

/**
 * 맵 테두리 노점 거리 배치(순수 데이터). 뒷면은 월드 가장자리, 앞면은 광장 안쪽을 보며
 * 남쪽(스폰) 변과 본전 앞 중앙, 온천 구역은 비운다. 위치는 WORLD_BOUNDS 기준이다.
 */
export interface RimShop {
  x: number
  z: number
  yaw: number
  kind: ShopKind
  /** 가까이 볼 때 한 군집에서 한두 곳만 따뜻하게 밝히는 강약 표시. */
  glow: boolean
}

export interface RimSeparator {
  x: number
  z: number
  yaw: number
  type: 'tree' | 'lantern' | 'rock'
  /** 이 자리에 붉은 노보리를 하나 세운다. */
  nobori: boolean
}

export interface RimString {
  /** 처마 앞 초롱 줄이 지나는 월드 좌표 점들. */
  points: [number, number, number][]
}

const { minX, maxX, minZ } = WORLD_BOUNDS
const SHOP_DEPTH = 3.2
/** 가게 중심을 경계에서 안쪽으로 들이는 거리: 깊이의 절반 + 기단 + 여유. */
const INSET = SHOP_DEPTH / 2 + 1.2

const KINDS: ShopKind[] = [
  'okonomiyaki',
  'izakaya',
  'dango',
  'takoyaki',
  'fruit',
  'yakisoba',
]
const SEPARATORS: RimSeparator['type'][] = ['tree', 'lantern', 'rock', 'tree']

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

interface Line {
  from: [number, number]
  to: [number, number]
  /** 광장 안쪽을 향하는 단위 벡터. */
  inward: [number, number]
  yaw: number
  seed: number
  kindOffset: number
}

export const RIM_SHOPS: RimShop[] = []
export const RIM_SEPARATORS: RimSeparator[] = []
export const RIM_STRINGS: RimString[] = []

function lay({ from, to, inward, yaw, seed, kindOffset }: Line) {
  const random = createRandom(seed)
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  const direction: [number, number] = [
    (to[0] - from[0]) / length,
    (to[1] - from[1]) / length,
  ]
  const at = (distance: number, forward: number): [number, number] => [
    from[0] + direction[0] * distance + inward[0] * forward,
    from[1] + direction[1] * distance + inward[1] * forward,
  ]

  let position = 0
  let index = 0
  let inCluster = 0
  let clusterSize = 3 + Math.floor(random() * 2)
  // 군집마다 앞으로 나오는 정도가 달라 줄이 곧게 이어지지 않는다.
  let clusterForward = random() * 2.2
  let separators = 0
  while (position < length) {
    const kind = KINDS[(kindOffset + index) % KINDS.length]
    const width = STYLES[kind].width
    if (position + width > length) break
    // 군집마다 앞으로 나오거나 살짝 틀어 일직선을 피한다.
    const forward = clusterForward + random() * 0.6
    const tilt = (random() - 0.5) * 0.3
    const [x, z] = at(position + width / 2, forward)
    const glow = inCluster === 1 || (clusterSize > 3 && inCluster === 3)
    RIM_SHOPS.push({ x, z, yaw: yaw + tilt, kind, glow })

    // 처마 앞 초롱 줄: 양끝 기둥 사이에서 늘어진다.
    const front = SHOP_DEPTH / 2 + 1.0
    const steps = Math.max(3, Math.round(width / 0.9))
    const cos = Math.cos(yaw + tilt)
    const sin = Math.sin(yaw + tilt)
    const points = Array.from({ length: steps + 1 }, (_, step) => {
      const u = step / steps
      const local = (u - 0.5) * (width + 0.8)
      const y = 3.3 - 0.22 * Math.sin(Math.PI * u)
      // 가게 로컬 +x(폭 방향), +z(앞) → 월드. yaw는 y축 회전.
      return [
        x + local * cos + front * sin,
        y,
        z - local * sin + front * cos,
      ] as [number, number, number]
    })
    RIM_STRINGS.push({ points })

    position += width + 0.6 + random() * 0.8
    index += 1
    inCluster += 1
    if (inCluster >= clusterSize && position < length - 6) {
      const [sx, sz] = at(position + 1.4, 0.6)
      RIM_SEPARATORS.push({
        x: sx,
        z: sz,
        yaw,
        type: SEPARATORS[(separators + seed) % SEPARATORS.length],
        nobori: separators % 2 === 0,
      })
      separators += 1
      position += 3.4
      inCluster = 0
      clusterSize = 3 + Math.floor(random() * 2)
      clusterForward = random() * 2.2
    }
  }
}

// 북쪽 변: 본전 앞 중앙(x −16~16)과 온천 건물(동쪽)은 비운다.
lay({
  from: [minX + 5, minZ + INSET],
  to: [-17.5, minZ + INSET],
  inward: [0, 1],
  yaw: 0,
  seed: 11,
  kindOffset: 0,
})
// 서쪽 변: 북쪽 모서리 아래부터 스폰 옆까지.
lay({
  from: [minX + INSET, minZ + 8],
  to: [minX + INSET, 41],
  inward: [1, 0],
  yaw: Math.PI / 2,
  seed: 23,
  kindOffset: 3,
})
// 동쪽 변: 온천 탕 남쪽에서 스폰 옆까지.
lay({
  from: [maxX - INSET, -3],
  to: [maxX - INSET, 41],
  inward: [-1, 0],
  yaw: -Math.PI / 2,
  seed: 37,
  kindOffset: 1,
})
