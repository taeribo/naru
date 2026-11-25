import { useEffect, useRef, useState } from 'react'
import { subscribeToWishUpdates } from '../services/wishUpdates'
import { readWishPage } from '../services/wishes'
import type { WishPage } from '../services/wishes'

const EMPTY_PAGE: WishPage = { items: [], nextCursor: null }
const LOADING_MESSAGE = '소원을 불러오는 중…'
const RETRY_DELAY = 8_000

export function WishList({ author }: { author: string }) {
  const [page, setPage] = useState(EMPTY_PAGE)
  const [listStatus, setListStatus] = useState(LOADING_MESSAGE)
  const [expanded, setExpanded] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const moreRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    if (expanded) return

    const controller = new AbortController()
    let pending = false
    let queued = false
    let retryTimer: number | undefined

    async function refresh() {
      if (controller.signal.aborted) return
      if (pending) {
        queued = true
        return
      }

      pending = true
      do {
        window.clearTimeout(retryTimer)
        queued = false
        try {
          const latest = await readWishPage(author, controller.signal)
          if (controller.signal.aborted) break
          setPage(latest)
          setListStatus(
            latest.items.length ? '' : '아직 다른 사람이 남긴 소원이 없어요.',
          )
        } catch {
          if (!controller.signal.aborted) {
            setListStatus('소원 목록을 불러오지 못했습니다.')
            retryTimer = window.setTimeout(() => void refresh(), RETRY_DELAY)
          }
        }
      } while (queued && !controller.signal.aborted)
      pending = false
    }

    void refresh()
    const unsubscribe = subscribeToWishUpdates(() => void refresh())
    return () => {
      controller.abort()
      window.clearTimeout(retryTimer)
      unsubscribe()
    }
  }, [author, expanded])

  useEffect(() => () => moreRequest.current?.abort(), [])

  async function loadMore() {
    if (!page.nextCursor || moreRequest.current) return
    const controller = new AbortController()
    moreRequest.current = controller
    setExpanded(true)
    setLoadingMore(true)
    setMoreError('')

    try {
      const older = await readWishPage(
        author,
        controller.signal,
        page.nextCursor,
      )
      if (controller.signal.aborted) return

      const visibleIds = new Set(page.items.map((wish) => wish.id))
      setPage({
        items: [
          ...page.items,
          ...older.items.filter((wish) => !visibleIds.has(wish.id)),
        ],
        nextCursor: older.nextCursor,
      })
    } catch {
      if (!controller.signal.aborted)
        setMoreError('이전 소원을 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      moreRequest.current = null
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }

  function showLatest() {
    setPage(EMPTY_PAGE)
    setListStatus(LOADING_MESSAGE)
    setMoreError('')
    setExpanded(false)
  }

  return (
    <section className="wish-list" aria-labelledby="wish-list-title">
      <h3 id="wish-list-title">다른 사람의 소원</h3>
      {listStatus && <p role="status">{listStatus}</p>}
      {page.items.length > 0 && (
        <ul aria-busy={loadingMore}>
          {page.items.map((wish) => (
            <li key={wish.id}>{wish.message}</li>
          ))}
        </ul>
      )}
      {moreError && <p role="alert">{moreError}</p>}
      {(page.nextCursor || expanded) && (
        <div className="wish-list-actions">
          {page.nextCursor && (
            <button
              type="button"
              className="plaza-button"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? '불러오는 중…' : '더 보기'}
            </button>
          )}
          {expanded && (
            <button
              type="button"
              className="plaza-button"
              disabled={loadingMore}
              onClick={showLatest}
            >
              최신 소원
            </button>
          )}
        </div>
      )}
    </section>
  )
}
