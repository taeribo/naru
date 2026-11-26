// 중앙 벚꽃나무와 네 체험 구역, 남쪽의 입장 계단과 도리이.
// 입장 계단·스폰 값은 서버(WorldRooms.java)의 스폰·이동 제한과 같아야 한다.

/** 방문객이 움직일 수 있는 범위. 서버(WorldRooms.java)의 move 검사와 같아야 한다. */
export const WORLD_BOUNDS = { minX: -54, maxX: 54, minZ: -38, maxZ: 72 }

/** 물과 바위 테두리의 위치. 서버 이동 검사와 함께 관리한다. */
export const POND = { x: 0, z: -13, width: 38, depth: 12, radius: 3.2 }

export const COURTYARD = {
  width: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX,
  depth: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ,
  centerX: (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2,
  centerZ: (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2,
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
  bottomZ: 28.4, // 올라가는 계단의 맨 아래
  landingDepth: 2.6,
}
export const STAIRS_TOP_Z = STAIRS.bottomZ - STAIRS.upSteps * STAIRS.run // 23.6
export const LANDING_END_Z = STAIRS_TOP_Z - STAIRS.landingDepth // 21
export const STAIRS_END_Z = LANDING_END_Z - STAIRS.downSteps * STAIRS.run // 17
export const LANDING_HEIGHT = STAIRS.rise * STAIRS.upSteps // 1.2
/** 도리이는 착지대 한가운데에 선다. */
export const TORII_Z = (STAIRS_TOP_Z + LANDING_END_Z) / 2

export const ZONES = {
  fortune: [-24, 5],
  wish: [-31, -17],
  bell: [24, 6],
  rest: [35, -16],
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
