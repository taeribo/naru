import { onsenOpen } from './onsenEntry'
import { detourAroundCherry } from './route'
import { CHERRY_POSITION, WORLD_BOUNDS } from './terrain'

/**
 * 걸을 수 있는 곳 지도와 길찾기.
 * public/map/walkable.png(흰 칸 = 막힘, 0.125m 칸)는 개발용 map-capture.html?walkable 로
 * 장면을 찍어 만든다. 장면 배치가 바뀌면 다시 찍어 넣는다.
 */
type Point = { x: number; z: number }

const SOURCE_CELL = 0.125
const CELL = 0.25
const COLUMNS = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / CELL
const ROWS = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / CELL
/** 몸 둘레 여유: 막힌 칸에서 이만큼(칸 수) 떨어져 걷는다. */
const BODY_CELLS = 1.5
/** 서버가 막는 벚나무 화단 반경(WorldRooms.insideCherryBed와 같다). */
const CHERRY_BED_RADIUS = 5.25
/** 정해진 자리(의자, 우물 앞)가 막힌 칸이어도 마지막에 이 거리까지는 곧장 걸어 들어간다. */
const FINAL_STEP = 1.8

let blocked: Uint8Array | null = null

function cellOf({ x, z }: Point) {
  return {
    column: Math.floor((x - WORLD_BOUNDS.minX) / CELL),
    row: Math.floor((z - WORLD_BOUNDS.minZ) / CELL),
  }
}

function centerOf(index: number): Point {
  const column = index % COLUMNS
  const row = Math.floor(index / COLUMNS)
  return {
    x: WORLD_BOUNDS.minX + (column + 0.5) * CELL,
    z: WORLD_BOUNDS.minZ + (row + 0.5) * CELL,
  }
}

function isBlocked(column: number, row: number) {
  if (column < 0 || row < 0 || column >= COLUMNS || row >= ROWS) return true
  return blocked ? blocked[row * COLUMNS + column] === 1 : false
}

function blockedAt(point: Point) {
  const { column, row } = cellOf(point)
  return isBlocked(column, row)
}

/** 걸을 수 있는 곳 지도를 불러와 길찾기용 칸으로 바꾼다. 한 번만 불린다. */
export function loadWalkableMap() {
  if (blocked) return
  const image = new Image()
  image.src = `${import.meta.env.BASE_URL}map/walkable.png`
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, image.width, image.height).data
    const ratio = CELL / SOURCE_CELL
    const solid = new Uint8Array(COLUMNS * ROWS)
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        let hit = false
        for (let dy = 0; dy < ratio && !hit; dy += 1) {
          for (let dx = 0; dx < ratio && !hit; dx += 1) {
            const offset =
              ((row * ratio + dy) * image.width + column * ratio + dx) * 4
            hit = pixels[offset] > 127
          }
        }
        const center = centerOf(row * COLUMNS + column)
        const cherry = Math.hypot(
          center.x - CHERRY_POSITION[0],
          center.z - CHERRY_POSITION[2],
        )
        if (hit || cherry < CHERRY_BED_RADIUS) solid[row * COLUMNS + column] = 1
      }
    }
    // 몸 둘레만큼 막힌 칸을 넓힌다.
    const grown = new Uint8Array(solid)
    const reach = Math.ceil(BODY_CELLS)
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (!solid[row * COLUMNS + column]) continue
        for (let dy = -reach; dy <= reach; dy += 1) {
          for (let dx = -reach; dx <= reach; dx += 1) {
            if (dx * dx + dy * dy > BODY_CELLS * BODY_CELLS) continue
            const r = row + dy
            const c = column + dx
            if (r >= 0 && c >= 0 && r < ROWS && c < COLUMNS)
              grown[r * COLUMNS + c] = 1
          }
        }
      }
    }
    // 노천탕 돌계단과 탕 안은 찍은 지도에서 테두리·바위에 막혀 있으므로 길을 열어 둔다.
    for (let index = 0; index < grown.length; index += 1) {
      const { x, z } = centerOf(index)
      if (onsenOpen(x, z)) grown[index] = 0
    }
    blocked = grown
  }
}

/** 두 점 사이를 막힌 칸 없이 곧장 걸을 수 있는지. */
export function canWalkStraight(from: Point, to: Point) {
  if (!blocked) return !detourAroundCherry(from, to)
  const length = Math.hypot(to.x - from.x, to.z - from.z)
  const steps = Math.max(1, Math.ceil(length / (CELL * 0.4)))
  // 의자·우물 앞처럼 막힌 칸 안에 서 있으면, 빠져나오는 동안은 막힌 칸을 지나도 된다.
  let leaving = blockedAt(from)
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps
    const inside = blockedAt({
      x: from.x + (to.x - from.x) * t,
      z: from.z + (to.z - from.z) * t,
    })
    if (!inside) leaving = false
    else if (!leaving) return false
  }
  return true
}

/** 가장 가까운 걸을 수 있는 칸(넓이 우선 탐색). */
function nearestOpen(point: Point) {
  const { column, row } = cellOf(point)
  const start =
    Math.max(0, Math.min(ROWS - 1, row)) * COLUMNS +
    Math.max(0, Math.min(COLUMNS - 1, column))
  if (!blocked || !blocked[start]) return start
  const seen = new Uint8Array(COLUMNS * ROWS)
  const queue = [start]
  seen[start] = 1
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head]
    if (!blocked[index]) return index
    const c = index % COLUMNS
    const r = Math.floor(index / COLUMNS)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dx
      const nr = r + dy
      if (nc < 0 || nr < 0 || nc >= COLUMNS || nr >= ROWS) continue
      const next = nr * COLUMNS + nc
      if (seen[next]) continue
      seen[next] = 1
      queue.push(next)
    }
  }
  return start
}

const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const

/** A* 길찾기. 목적지에 닿을 수 없으면 목적지에 가장 가까이 닿는 칸까지 간다. */
function searchCells(start: number, goal: number) {
  const size = COLUMNS * ROWS
  const cost = new Float32Array(size).fill(Infinity)
  const parent = new Int32Array(size).fill(-1)
  const closed = new Uint8Array(size)
  const goalColumn = goal % COLUMNS
  const goalRow = Math.floor(goal / COLUMNS)
  const guess = (index: number) => {
    const dx = Math.abs((index % COLUMNS) - goalColumn)
    const dy = Math.abs(Math.floor(index / COLUMNS) - goalRow)
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
  }
  // 작은 이진 힙: [우선순위, 칸] 쌍.
  const heap: number[] = []
  const push = (priority: number, index: number) => {
    heap.push(priority, index)
    let i = heap.length / 2 - 1
    while (i > 0) {
      const up = (i - 1) >> 1
      if (heap[up * 2] <= heap[i * 2]) break
      ;[heap[up * 2], heap[i * 2]] = [heap[i * 2], heap[up * 2]]
      ;[heap[up * 2 + 1], heap[i * 2 + 1]] = [heap[i * 2 + 1], heap[up * 2 + 1]]
      i = up
    }
  }
  const pop = () => {
    const index = heap[1]
    const lastPriority = heap[heap.length - 2]
    const lastIndex = heap[heap.length - 1]
    heap.length -= 2
    if (heap.length) {
      heap[0] = lastPriority
      heap[1] = lastIndex
      let i = 0
      const count = heap.length / 2
      for (;;) {
        const left = i * 2 + 1
        const right = left + 1
        let smallest = i
        if (left < count && heap[left * 2] < heap[smallest * 2]) smallest = left
        if (right < count && heap[right * 2] < heap[smallest * 2])
          smallest = right
        if (smallest === i) break
        ;[heap[smallest * 2], heap[i * 2]] = [heap[i * 2], heap[smallest * 2]]
        ;[heap[smallest * 2 + 1], heap[i * 2 + 1]] = [
          heap[i * 2 + 1],
          heap[smallest * 2 + 1],
        ]
        i = smallest
      }
    }
    return index
  }

  cost[start] = 0
  push(guess(start), start)
  let best = start
  let bestGuess = guess(start)
  while (heap.length) {
    const index = pop()
    if (closed[index]) continue
    closed[index] = 1
    const remaining = guess(index)
    if (remaining < bestGuess) {
      best = index
      bestGuess = remaining
    }
    if (index === goal) break
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    for (const [dx, dy, step] of NEIGHBORS) {
      const nc = column + dx
      const nr = row + dy
      if (isBlocked(nc, nr)) continue
      // 대각선으로 갈 때 모서리를 깎지 않는다.
      if (
        dx &&
        dy &&
        (isBlocked(column + dx, row) || isBlocked(column, row + dy))
      )
        continue
      const next = nr * COLUMNS + nc
      const total = cost[index] + step
      if (total >= cost[next]) continue
      cost[next] = total
      parent[next] = index
      push(total + guess(next), next)
    }
  }
  const cells: number[] = []
  for (let index = best; index !== -1; index = parent[index]) cells.push(index)
  return cells.reverse()
}

/**
 * from에서 to까지 건물·노점·나무를 피해 가는 경유지 목록(출발점 제외).
 * exact이면 to가 막힌 칸이어도 마지막에 짧게 곧장 걸어 들어간다(의자, 우물 앞처럼 정해진 자리).
 */
export function planRoute(from: Point, to: Point, exact = false): Point[] {
  const target = {
    x: Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, to.x)),
    z: Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, to.z)),
  }
  if (!blocked) {
    const via = detourAroundCherry(from, target)
    return via ? [via, target] : [target]
  }
  const cells = searchCells(nearestOpen(from), nearestOpen(target))
  const points = cells.map(centerOf)
  // 곧장 갈 수 있는 경유지는 건너뛰어 길을 매끄럽게 만든다.
  const smooth: Point[] = []
  let anchor = from
  let index = 0
  while (index < points.length) {
    let far = index
    for (let next = index + 1; next < points.length; next += 1) {
      if (!canWalkStraight(anchor, points[next])) break
      far = next
    }
    smooth.push(points[far])
    anchor = points[far]
    index = far + 1
  }
  const end = smooth[smooth.length - 1] ?? from
  if (!blockedAt(target) && canWalkStraight(end, target)) {
    if (Math.hypot(end.x - target.x, end.z - target.z) > 0.05)
      smooth.push(target)
  } else if (
    exact &&
    Math.hypot(end.x - target.x, end.z - target.z) <= FINAL_STEP
  ) {
    smooth.push(target)
  }
  return smooth
}
