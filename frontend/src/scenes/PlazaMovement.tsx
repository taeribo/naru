import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

/** 화면 기준 이동 방향. x는 오른쪽, y는 아래쪽이 양수이고 길이는 0~1(세기). */
export type PlazaVector = { x: number; y: number }

/** 손잡이가 움직일 수 있는 반경(패드 지름 대비). */
const KNOB_TRAVEL = 0.32
/** 이 세기보다 약하게 기울이면 움직이지 않는다. */
const DEAD_ZONE = 0.15
const REPEAT_MS = 150

const KEY_VECTORS: Record<string, PlazaVector> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
}

export function PlazaMovement({
  disabled,
  onMove,
}: {
  disabled: boolean
  onMove: (vector: PlazaVector) => void
}) {
  const move = useRef(onMove)
  const vector = useRef<PlazaVector>({ x: 0, y: 0 })
  const hold = useRef<{ pointer: number; timer: number } | null>(null)
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null)
  move.current = onMove

  function stop() {
    if (hold.current) window.clearInterval(hold.current.timer)
    hold.current = null
    vector.current = { x: 0, y: 0 }
    setKnob(null)
  }

  useEffect(() => stop, [disabled])

  useEffect(() => {
    if (disabled) return

    const pressed = new Set<string>()
    let timer: number | undefined

    function clear() {
      pressed.clear()
      window.clearInterval(timer)
      timer = undefined
    }

    function stepKeys() {
      if (hold.current) return
      let x = 0
      let y = 0
      for (const code of pressed) {
        x += KEY_VECTORS[code].x
        y += KEY_VECTORS[code].y
      }
      const length = Math.hypot(Math.sign(x), Math.sign(y))
      if (length)
        move.current({ x: Math.sign(x) / length, y: Math.sign(y) / length })
    }

    function keyDown(event: KeyboardEvent) {
      if (
        !Object.hasOwn(KEY_VECTORS, event.code) ||
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest('input, textarea, select, dialog[open]')))
      )
        return

      event.preventDefault()
      if (event.repeat || pressed.has(event.code)) return
      pressed.add(event.code)
      stepKeys()
      timer ??= window.setInterval(stepKeys, REPEAT_MS)
    }

    function keyUp(event: KeyboardEvent) {
      if (pressed.delete(event.code) && pressed.size === 0) clear()
    }

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      clear()
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [disabled])

  function aim(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const travel = rect.width * KNOB_TRAVEL
    let dx = event.clientX - (rect.left + rect.width / 2)
    let dy = event.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(dx, dy)
    if (length > travel) {
      dx *= travel / length
      dy *= travel / length
    }
    setKnob({ x: dx, y: dy })
    vector.current =
      Math.min(1, length / travel) < DEAD_ZONE
        ? { x: 0, y: 0 }
        : { x: dx / travel, y: dy / travel }
  }

  function step() {
    const { x, y } = vector.current
    if (x !== 0 || y !== 0) move.current(vector.current)
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0 || hold.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    aim(event)
    step()
    hold.current = {
      pointer: event.pointerId,
      timer: window.setInterval(step, REPEAT_MS),
    }
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    if (hold.current?.pointer === event.pointerId) stop()
  }

  return (
    <div
      className="plaza-joystick"
      role="application"
      aria-label="이동 조이스틱. 끌거나 WASD 또는 방향키로 이동"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      data-active={knob !== null}
      onPointerDown={start}
      onPointerMove={(event) => {
        if (hold.current?.pointer === event.pointerId) aim(event)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <span className="plaza-joystick-ring" aria-hidden="true" />
      <span className="plaza-joystick-tick" data-side="up" aria-hidden="true">
        ▲
      </span>
      <span
        className="plaza-joystick-tick"
        data-side="right"
        aria-hidden="true"
      >
        ▶
      </span>
      <span className="plaza-joystick-tick" data-side="down" aria-hidden="true">
        ▼
      </span>
      <span className="plaza-joystick-tick" data-side="left" aria-hidden="true">
        ◀
      </span>
      <span
        className="plaza-joystick-knob"
        aria-hidden="true"
        style={
          knob
            ? { transform: `translate(${knob.x}px, ${knob.y}px)` }
            : undefined
        }
      />
    </div>
  )
}
