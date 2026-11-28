import { CHERRY_POSITION } from './terrain'

/** 서버가 막는 벚나무 화단 반경(WorldRooms.insideCherryBed와 같다). */
const CHERRY_BED_RADIUS = 5.25
/** 화단 가장자리에서 띄워 걷는 여유. */
const CLEARANCE = 1.1

type Point = { x: number; z: number }

/**
 * 서버는 화단 안으로 들어가는 걸음을 그 자리에서 멈춘다.
 * from → to 직선이 화단을 지나면 화단 옆으로 비켜 가는 경유지를 돌려주고, 지나지 않으면 null.
 */
export function detourAroundCherry(from: Point, to: Point): Point | null {
  const cx = CHERRY_POSITION[0]
  const cz = CHERRY_POSITION[2]
  const radius = CHERRY_BED_RADIUS + CLEARANCE
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = dx * dx + dz * dz
  if (length < 1e-6) return null
  const t = Math.max(
    0,
    Math.min(1, ((cx - from.x) * dx + (cz - from.z) * dz) / length),
  )
  const nearX = from.x + dx * t
  const nearZ = from.z + dz * t
  let nx = nearX - cx
  let nz = nearZ - cz
  const distance = Math.hypot(nx, nz)
  if (distance >= radius - 0.05) return null
  // 직선이 화단 한가운데를 지나면 진행 방향의 왼쪽으로 비켜 간다.
  if (distance < 1e-3) {
    nx = -dz
    nz = dx
  }
  const scale = (radius * 1.25) / Math.hypot(nx, nz)
  return { x: cx + nx * scale, z: cz + nz * scale }
}
