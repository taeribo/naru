// 중앙 벚꽃나무와 네 체험 구역, 남쪽의 입장 계단과 도리이.
// 입장 계단·스폰 값은 서버(WorldRooms.java)의 스폰·이동 제한과 같아야 한다.

/** Keep the front movement limit and spawn synchronized with WorldRooms.java. */
export const WORLD_BOUNDS = { minX: -54, maxX: 54, minZ: -38, maxZ: 46 }
export const FRONT_WALL_Z = WORLD_BOUNDS.maxZ + 1.6
export const ENTRY_SPAWN_Z = WORLD_BOUNDS.maxZ - 2.5

export const COURTYARD = {
  width: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX,
  depth: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ,
  centerX: (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2,
  centerZ: (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2,
}

/** 확장된 맵 전체. 바깥쪽 숲과 언덕까지 포함하며 걸을 수 있는 곳은 WALKABLE_AREAS뿐이다. */
export const MAP_BOUNDS = { minX: -70, maxX: 70, minZ: -72, maxZ: 46 }

/** [minX, maxX, minZ, maxZ] */
export type Rect = readonly [number, number, number, number]

/** 광장에서 북쪽으로 올라 서쪽 성으로 가는 참배길(폭 8). */
export const AVENUE: Rect[] = [
  [-4, 4, -54, -38],
  [-30, 4, -58, -50],
]

/** 지형이 평평하게 유지되는 구역: 광장, 참배길, 성 부지. */
export const CASTLE_SITE: Rect = [-70, -30, -72, -38]
const FLAT_AREAS: Rect[] = [
  [
    WORLD_BOUNDS.minX,
    WORLD_BOUNDS.maxX,
    WORLD_BOUNDS.minZ,
    WORLD_BOUNDS.maxZ,
  ],
  ...AVENUE,
  CASTLE_SITE,
]

/**
 * 방문객이 걸을 수 있는 구역. 서버(WorldRooms.java)의 AREAS와 같아야 한다.
 * 나머지 숲과 언덕은 접근할 수 없다.
 */
export const WALKABLE_AREAS: Rect[] = [
  [
    WORLD_BOUNDS.minX,
    WORLD_BOUNDS.maxX,
    WORLD_BOUNDS.minZ,
    WORLD_BOUNDS.maxZ,
  ],
  ...AVENUE,
]

export function inRect(x: number, z: number, [x0, x1, z0, z1]: Rect, margin = 0) {
  return (
    x >= x0 - margin && x <= x1 + margin && z >= z0 - margin && z <= z1 + margin
  )
}

export function isWalkable(x: number, z: number) {
  return WALKABLE_AREAS.some((area) => inRect(x, z, area))
}

/** 목표가 막혀 있으면 한 축씩 미끄러지고, 그래도 안 되면 제자리에 둔다. */
export function stepToward(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): [number, number] {
  if (isWalkable(toX, toZ)) return [toX, toZ]
  if (isWalkable(toX, fromZ)) return [toX, fromZ]
  if (isWalkable(fromX, toZ)) return [fromX, toZ]
  return [fromX, fromZ]
}

/**
 * 입장 계단: 남쪽(z 큼)에서 북쪽으로 오르고, 위 단(착지대)에 붉은 도리이가 서며,
 * 도리이를 지나면 반대편 계단으로 내려와 광장에 닿는다.
 */
export const STAIRS = {
  halfWidth: 4.5,
  rise: 0.2,
  run: 0.8,
  upSteps: 6,
  downSteps: 5,
  bottomZ: 32.6, // 올라가는 계단의 맨 아래
  landingDepth: 2.6,
}
export const STAIRS_TOP_Z = STAIRS.bottomZ - STAIRS.upSteps * STAIRS.run
export const LANDING_END_Z = STAIRS_TOP_Z - STAIRS.landingDepth
export const STAIRS_END_Z = LANDING_END_Z - STAIRS.downSteps * STAIRS.run
export const LANDING_HEIGHT = STAIRS.rise * STAIRS.upSteps // 1.2
/** 도리이는 착지대 한가운데에 선다. */
export const TORII_Z = (STAIRS_TOP_Z + LANDING_END_Z) / 2

// Referenced by the server's plaza collision check.
export const CHERRY_POSITION: [number, number, number] = [-7.8, 0, 2.5]

export const ZONES = {
  fortune: [-24, 5],
  wish: [-31, -17],
  bell: [24, 6],
  rest: [34, -14],
} as const

/** (x, z) 지점에서 걷는 사람 발밑의 높이: 계단 위면 계단 높이, 아니면 바닥. */
export function groundHeight(x: number, z: number) {
  if (Math.abs(x) > STAIRS.halfWidth || z >= STAIRS.bottomZ) return 0
  const { rise, run, upSteps } = STAIRS
  if (z >= STAIRS_TOP_Z) {
    const index = Math.floor((STAIRS.bottomZ - z) / run)
    return rise * (Math.min(index, upSteps - 1) + 1)
  }
  if (z >= LANDING_END_Z) return LANDING_HEIGHT
  if (z >= STAIRS_END_Z) {
    const index = Math.floor((LANDING_END_Z - z) / run)
    return Math.max(0, rise * (upSteps - index - 1))
  }
  return 0
}

// 평평한 구역(광장, 참배길, 성 부지) 바깥으로 갈수록 언덕이 솟는다.
export function elevation(x: number, z: number) {
  const beyond = Math.min(
    ...FLAT_AREAS.map(([x0, x1, z0, z1]) =>
      Math.max(x0 - x, x - x1, z0 - z, z - z1, 0),
    ),
  )
  const rise = Math.min(beyond / 18, 1)
  const wave = Math.sin(x * 0.064 + Math.cos(z * 0.047) * 1.7)
  return -0.045 + rise * rise * (1.8 + wave * 0.77 + Math.sin(z * 0.08) * 0.5)
}
