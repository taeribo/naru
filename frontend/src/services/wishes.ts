export interface Wish {
  id: string
  message: string
}

const AUTHOR_KEY = 'naru.wishAuthor'

export function getWishAuthor() {
  const author = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
  try {
    const previous = localStorage.getItem(AUTHOR_KEY)
    if (previous && /^[a-f0-9]{32}$/.test(previous)) return previous
    localStorage.setItem(AUTHOR_KEY, author)
  } catch {
    // The current tab can still post and filter wishes if storage is blocked.
  }
  return author
}

export async function readWishes(
  author: string,
  signal: AbortSignal,
): Promise<Wish[]> {
  const response = await fetch(`/api/wishes?author=${author}`, {
    signal,
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('소원 목록을 불러오지 못했습니다.')
  return response.json()
}

export async function sendWish(author: string, message: string) {
  const response = await fetch('/api/wishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, message }),
  })
  if (!response.ok) throw new Error('소원을 보내지 못했습니다.')
}
