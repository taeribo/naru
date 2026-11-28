/**
 * 광장 방문자 닉네임. 꾸밈말과 이름을 하나씩 짝지어 접속 ID로 정한다.
 * 단어는 목록 끝에 덧붙여 늘릴 수 있다(바꾸면 같은 ID의 조합도 달라진다).
 */
const MODIFIERS = [
  '달빛 아래',
  '등불 아래',
  '새해 첫',
  '고요한',
  '반짝이는',
  '노을빛',
  '소복한',
  '따스한',
  '설레는',
  '포근한',
]

const NAMES = [
  // 축제 소품
  '등불',
  '풍경',
  '부적',
  '소원패',
  '찻잔',
  // 겨울 꽃
  '벚꽃',
  '동백',
  '수선화',
  // 신사 동물
  '여우',
  '부엉이',
  '고양이',
  '너구리',
  '두루미',
  '잉어',
]

function hash(text: string) {
  let value = 2166136261
  for (const char of text) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export function nicknameFor(id: string) {
  const seed = hash(`nickname:${id}`)
  const modifier = MODIFIERS[seed % MODIFIERS.length]
  const name = NAMES[Math.floor(seed / MODIFIERS.length) % NAMES.length]
  return `${modifier} ${name}`
}

/** 같은 화면에 같은 닉네임이 겹치면 접속 ID 순서대로 뒤에 숫자를 붙인다. */
export function nicknamesFor(ids: string[]) {
  const result = new Map<string, string>()
  const seen = new Map<string, number>()
  for (const id of [...ids].sort()) {
    const base = nicknameFor(id)
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    result.set(id, count === 1 ? base : `${base} ${count}`)
  }
  return result
}
