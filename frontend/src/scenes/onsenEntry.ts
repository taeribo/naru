import { BATH, ENTRY, wobble } from './OnsenBath'
import { ZONES } from './terrain'

/**
 * 노천탕 안팎의 걸음 높이와 목욕 차림 판정.
 * 탕(OnsenBath)은 휴식 구역 한가운데에 회전 없이 놓여 있어, 로컬 좌표는 위치만 뺀다.
 */
const CENTER_X = ZONES.rest[0]
const CENTER_Z = ZONES.rest[1]
/** 탕 바닥 윗면 높이. 물(0.5)보다 낮아 허리 아래가 물에 잠긴다. */
const BATH_FLOOR = 0.06

/** 탕 안쪽 윤곽 대비 얼마나 안에 있는지(1보다 작으면 안쪽). */
function bathRatio(x: number, z: number) {
  const localX = x - CENTER_X
  // 탕 도형은 x-y 평면에서 그린 뒤 눕혔으므로 로컬 z는 -y다.
  const localY = -(z - CENTER_Z)
  const angle = Math.atan2(localY / BATH.b, localX / BATH.a)
  return Math.hypot(localX / BATH.a, localY / BATH.b) / wobble(angle)
}

/** 탕 물속인지. margin이 작을수록 테두리에서 더 안쪽만 센다. */
export function insideBath(x: number, z: number, margin = 1) {
  return bathRatio(x, z) < margin
}

/** 돌계단 위라면 디딤돌 윗면 높이, 아니면 null. */
export function entryStepHeight(x: number, z: number) {
  const localX = x - CENTER_X
  const localZ = z - CENTER_Z
  if (Math.abs(localZ - ENTRY.z) > ENTRY.halfWidth) return null
  const step = ENTRY.steps.find(({ from, to }) => localX >= from && localX < to)
  return step ? step.top : null
}

/** 걸을 때 발밑 높이: 돌계단 > 탕 바닥 > 땅. */
export function onsenGround(x: number, z: number) {
  const step = entryStepHeight(x, z)
  if (step !== null) return step
  return insideBath(x, z) ? BATH_FLOOR : 0
}

/** 목욕 차림으로 갈아입는 곳: 탕 안, 또는 테두리를 넘는 디딤판부터. */
export function isBathing(x: number, z: number) {
  if (insideBath(x, z)) return true
  const localX = x - CENTER_X
  return entryStepHeight(x, z) !== null && localX >= ENTRY.steps[3].from
}

/** 길찾기에서 늘 걸을 수 있게 열어 둘 곳: 돌계단과 탕 안(테두리에서 조금 떨어진 곳까지). */
export function onsenOpen(x: number, z: number) {
  return entryStepHeight(x, z) !== null || insideBath(x, z, 0.9)
}
