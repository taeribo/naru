export interface FortuneCategory {
  code: string
  name: string
}

export interface FortuneGrade {
  hanja: string
  name: string
}

export interface DailyFortune {
  category: string
  date: string
  grade: FortuneGrade
  content: string
}

const VISITOR_KEY = 'naru.fortuneVisitor'
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
let temporaryId: string | undefined

function createVisitorId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

function visitorId() {
  try {
    const saved = localStorage.getItem(VISITOR_KEY)
    if (saved && UUID_V4.test(saved)) return saved
    temporaryId ??= createVisitorId()
    localStorage.setItem(VISITOR_KEY, temporaryId)
    const id = temporaryId
    temporaryId = undefined
    return id
  } catch {
    // Private storage restrictions still allow a stable ID until this page unloads.
    temporaryId ??= createVisitorId()
    return temporaryId
  }
}

async function read<T>(
  path: string,
  signal: AbortSignal,
  headers?: HeadersInit,
): Promise<T> {
  const response = await fetch(path, { signal, headers, cache: 'no-store' })
  if (!response.ok) throw new Error('운세를 불러오지 못했습니다.')
  return response.json()
}

export function readFortuneCategories(signal: AbortSignal) {
  return read<FortuneCategory[]>('/api/fortunes/categories', signal)
}

export function readDailyFortune(category: string, signal: AbortSignal) {
  const query = new URLSearchParams({ category })
  return read<DailyFortune>(`/api/fortunes/daily?${query}`, signal, {
    'X-Visitor-Id': visitorId(),
  })
}
