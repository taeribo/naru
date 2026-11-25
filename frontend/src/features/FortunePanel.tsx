import { useEffect, useRef, useState } from 'react'
import { FortunePaper } from './FortunePaper'
import './fortune.css'

interface Category {
  code: string
  name: string
}

interface Result extends Category {
  message: string
}

async function readFortune<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('운세를 불러오지 못했습니다.')
  return response.json()
}

export function FortunePanel() {
  const [categories, setCategories] = useState<Category[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    readFortune<Category[]>('/api/fortunes', signal)
      .then((items) => {
        if (!signal.aborted) setCategories(items)
      })
      .catch(() => {
        if (!signal.aborted) setError('운세 항목을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!signal.aborted) setPending(false)
      })
    return () => {
      controller.abort()
      request.current?.abort()
    }
  }, [])

  async function select(category: Category) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')
    try {
      const next = await readFortune<Result>(
        `/api/fortunes/${encodeURIComponent(category.code)}`,
        controller.signal,
      )
      if (!controller.signal.aborted) setResult(next)
    } catch {
      if (!controller.signal.aborted)
        setError('운세를 불러오지 못했습니다. 다시 선택해 주세요.')
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }

  if (result) return <FortunePaper message={result.message} />

  return (
    <div className="fortune-panel">
      <div className="fortune-options" aria-label="운세 카테고리">
        {categories.map((category) => (
          <button
            key={category.code}
            type="button"
            className="plaza-button"
            disabled={pending}
            onClick={() => void select(category)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {pending && <p>운세를 불러오는 중…</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  )
}
