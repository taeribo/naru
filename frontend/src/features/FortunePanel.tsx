import { useEffect, useRef, useState } from 'react'
import { FortunePaper } from './FortunePaper'
import { readDailyFortune, readFortuneCategories } from '../services/fortunes'
import type { DailyFortune, FortuneCategory } from '../services/fortunes'
import './fortune.css'

export function FortunePanel() {
  const [categories, setCategories] = useState<FortuneCategory[]>([])
  const [result, setResult] = useState<DailyFortune | null>(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const request = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    readFortuneCategories(signal)
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
  }, [reload])

  async function select(category: FortuneCategory) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')
    try {
      const next = await readDailyFortune(category.code, controller.signal)
      if (!controller.signal.aborted) setResult(next)
    } catch {
      if (!controller.signal.aborted)
        setError('운세를 불러오지 못했습니다. 다시 선택해 주세요.')
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }

  if (result)
    return (
      <FortunePaper
        grade={result.grade}
        message={result.content}
        category={result.category}
        categoryName={
          categories.find(({ code }) => code === result.category)?.name
        }
      />
    )

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
        {error && !categories.length && (
          <button
            className="plaza-button"
            type="button"
            onClick={() => {
              setPending(true)
              setError('')
              setReload((current) => current + 1)
            }}
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  )
}
