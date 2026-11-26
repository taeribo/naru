import { useState } from 'react'
import type { FormEvent } from 'react'
import { getWishAuthor, sendWish } from '../services/wishes'
import { WishList } from './WishList'

const MESSAGE_LIMIT = 200

export function WishPanel({
  open,
  onHang,
  roomToken,
}: {
  open: boolean
  onHang: () => void
  roomToken: string | null
}) {
  const [author] = useState(getWishAuthor)
  const [message, setMessage] = useState('')
  const [sendError, setSendError] = useState('')
  const [sending, setSending] = useState(false)
  const trimmed = message.trim()
  const messageLength = Array.from(trimmed).length

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed || messageLength > MESSAGE_LIMIT || sending) return

    setSending(true)
    setSendError('')
    try {
      await sendWish(author, trimmed, roomToken)
      setMessage('')
      onHang()
    } catch {
      setSendError('소원패를 걸지 못했습니다. 잠시 후 다시 시도해 주세요.')
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
          placeholder="소원패에 적을 소원을 남겨 주세요."
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
            {sending ? '거는 중…' : '소원패 걸기'}
          </button>
        </div>
        {sendError && <p role="alert">{sendError}</p>}
      </form>
      {open && <WishList author={author} />}
    </>
  )
}
