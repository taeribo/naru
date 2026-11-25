import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'

export type PlazaDirection = 'up' | 'down' | 'left' | 'right'

const DIRECTIONS = [
  { direction: 'up', label: '위로 이동', arrow: '↑' },
  { direction: 'left', label: '왼쪽으로 이동', arrow: '←' },
  { direction: 'down', label: '아래로 이동', arrow: '↓' },
  { direction: 'right', label: '오른쪽으로 이동', arrow: '→' },
] as const

export function PlazaMovement({
  disabled,
  onMove,
}: {
  disabled: boolean
  onMove: (direction: PlazaDirection) => void
}) {
  const move = useRef(onMove)
  const hold = useRef<{
    pointer: number
    timer: number
  } | null>(null)
  move.current = onMove

  function stop() {
    if (hold.current) window.clearInterval(hold.current.timer)
    hold.current = null
  }

  useEffect(() => stop, [disabled])

  function start(
    event: PointerEvent<HTMLButtonElement>,
    direction: PlazaDirection,
  ) {
    if (event.button !== 0 || hold.current) return
    const button = event.currentTarget
    button.setPointerCapture(event.pointerId)
    move.current(direction)
    const timer = window.setInterval(() => move.current(direction), 220)
    hold.current = { pointer: event.pointerId, timer }
  }

  function end(event: PointerEvent<HTMLButtonElement>) {
    if (hold.current?.pointer === event.pointerId) stop()
  }

  return (
    <div className="plaza-movement" role="group" aria-label="이동 방향">
      {DIRECTIONS.map(({ direction, label, arrow }) => (
        <button
          key={direction}
          type="button"
          className="plaza-direction"
          data-direction={direction}
          aria-label={label}
          disabled={disabled}
          onPointerDown={(event) => start(event, direction)}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
          onClick={(event) => {
            if (event.detail === 0) onMove(direction)
          }}
        >
          <span aria-hidden="true">{arrow}</span>
        </button>
      ))}
    </div>
  )
}
