import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getWishAuthor, readWishes, sendWish } from '../services/wishes'
import type { Wish } from '../services/wishes'

const MESSAGE_LIMIT = 200
const REFRESH_INTERVAL = 8_000

export function WishPanel({
  open,
  onLaunch,
}: {
  open: boolean
  onLaunch: () => void
}) {
  const [author] = useState(getWishAuthor)
  const [message, setMessage] = useState('')
  const [wishes, setWishes] = useState<Wish[]>([])
  const [listStatus, setListStatus] = useState('소원을 불러오는 중…')
  const [sendError, setSendError] = useState('')
  const [sending, setSending] = useState(false)
  const trimmed = message.trim()
  const messageLength = Array.from(trimmed).length

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    let pending = false

    async function refresh() {
      if (pending) return
      pending = true
      try {
        const result = await readWishes(author, controller.signal)
        if (controller.signal.aborted) return
        setWishes(result)
        setListStatus(
          result.length ? '' : '아직 다른 사람이 남긴 소원이 없어요.',
        )
      } catch {
        if (!controller.signal.aborted)
          setListStatus('소원 목록을 불러오지 못했습니다.')
      } finally {
        pending = false
      }
    }

    void refresh()
    const timer = window.setInterval(refresh, REFRESH_INTERVAL)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [author, open])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed || messageLength > MESSAGE_LIMIT || sending) return

    setSending(true)
    setSendError('')
    try {
      await sendWish(author, trimmed)
      setMessage('')
      onLaunch()
    } catch {
      setSendError('소원을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <form className="wish-form" onSubmit={submit}>
        <label htmlFor="wish-message">내 소원</label>
        <textarea
          id="wish-message"
          rows={3}
          aria-describedby="wish-message-length"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="풍등에 담아 보낼 소원을 적어 주세요."
          required
        />
        <small id="wish-message-length">
          {messageLength} / {MESSAGE_LIMIT}자
        </small>
        <div className="wish-form-footer">
          <small>다른 방문자도 볼 수 있어요.</small>
          <button
            className="plaza-button"
            disabled={sending || !trimmed || messageLength > MESSAGE_LIMIT}
          >
            {sending ? '보내는 중…' : '풍등 띄우기'}
          </button>
        </div>
        {sendError && <p role="alert">{sendError}</p>}
      </form>
      <section className="wish-list" aria-labelledby="wish-list-title">
        <h3 id="wish-list-title">다른 사람의 소원</h3>
        {listStatus && <p role="status">{listStatus}</p>}
        {wishes.length > 0 && (
          <ul>
            {wishes.map((wish) => (
              <li key={wish.id}>{wish.message}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
