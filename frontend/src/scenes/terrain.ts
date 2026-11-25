// 맵 배치(위에서 본 구상도): 맨 위 풍등 연못 → 가운데 벚꽃나무 → 건물 4채 → 아래 입장 계단과 붉은 도리이.
// 입장 계단·스폰 값은 서버(WorldRooms.java)의 스폰·이동 제한과 같아야 한다.

/** 풍등을 띄우는 큰 연못(맨 위). */
export const POND = { cx: 0, cz: -26.5, width: 54, depth: 14, radius: 4 }

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
  fortune: [-16, -10],
  wish: [16, -10],
  bell: [-16, 8],
  rest: [16, 8],
} as const

/** 소원 풍등이 떠오르기 시작하는 곳(연못 한가운데). */
export const LAUNCH_ORIGIN: [number, number, number] = [0, 0.5, POND.cz]

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
