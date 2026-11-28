import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Object3D } from 'three'
import { playBell } from '../features/bellSound'
import type { WorldPlayer } from '../services/world'
import type { Seat, Snack } from './OnsenTamago'
import { ZONES } from './terrain'
import { RING_HIT, RING_SECONDS } from './VisitorModel'

/**
 * 종각(Halls.tsx의 BellHall)에서 흔들 수 있게 등록해 두는 부품.
 * striker는 당목과 밧줄, bell은 범종. 둘 다 위쪽 매듭을 축으로 x축 회전한다.
 */
export const bellParts: { striker: Object3D | null; bell: Object3D | null } = {
  striker: null,
  bell: null,
}

/** 종각 구역의 놓임새(Zones.tsx의 종울리기 Zone과 같다). */
const HALL_YAW = 0.4
const HALL_SCALE = 1.4
/** 당김 줄 뒤에 서는 자리(종각 안쪽 좌표의 z). 줄은 z 2.45에 늘어져 있다. */
const STAND_LOCAL_Z = 2.7
/** 구역 받침돌 윗면 높이(Zones.tsx 받침: 0.095 + 0.22/2, 구역 배율 1.4). 발이 묻히지 않게 이 위에 선다. */
const PAD_TOP = 0.205 * HALL_SCALE

const RING_SPOT: Seat = {
  x: ZONES.bell[0] + Math.sin(HALL_YAW) * STAND_LOCAL_Z * HALL_SCALE,
  z: ZONES.bell[1] + Math.cos(HALL_YAW) * STAND_LOCAL_Z * HALL_SCALE,
  y: PAD_TOP,
  yaw: HALL_YAW,
}

const smooth = (t: number) => {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/** 당목 각도(+면 종 쪽): 뒤로 당겼다가 앞으로 밀어 치고, 맞고 튕겨 나와 잦아든다. */
function strikerAngle(time: number) {
  if (time < 1.3) return -0.32 * smooth((time - 0.5) / 0.8)
  if (time < RING_HIT)
    return -0.32 + 0.42 * smooth((time - 1.3) / (RING_HIT - 1.3))
  const after = time - RING_HIT
  return (
    0.1 * Math.cos(after * 7) * Math.exp(-after * 1.6) -
    0.04 * Math.sin(after * 7) * Math.exp(-after * 1.6)
  )
}

/**
 * 종 울리기 동작: 종 울리기를 누르면 당목 줄 뒤로 걸어가 줄을 잡고,
 * 뒤로 당겼다가 앞으로 밀어 종을 친다. 당목이 닿는 순간 종소리가 나고 범종이 흔들린다.
 */
export function BellRing({
  signal,
  visitor,
  snack,
  onSnack,
  onMove,
}: {
  /** 종 울리기를 누를 때마다 1씩 늘어나는 값. */
  signal: number
  visitor: WorldPlayer | undefined
  snack: Snack | null
  onSnack: (snack: Snack | null) => void
  onMove: (x: number, z: number) => void
}) {
  const handled = useRef(0)
  const started = useRef(-1)
  const rang = useRef(false)
  const hitAt = useRef(-1)

  useEffect(() => {
    if (!signal || signal === handled.current || !visitor) return
    handled.current = signal
    onSnack({ spot: RING_SPOT, arrived: false, pose: 'ring' })
    onMove(RING_SPOT.x, RING_SPOT.z)
  }, [signal, visitor, onSnack, onMove])

  const ringing = !!snack?.arrived && snack.pose === 'ring'
  useEffect(() => {
    if (!ringing) return
    started.current = -1
    rang.current = false
    const done = window.setTimeout(() => onSnack(null), RING_SECONDS * 1000)
    return () => window.clearTimeout(done)
  }, [ringing, onSnack])

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    const { striker, bell } = bellParts
    if (ringing) {
      if (started.current < 0) started.current = now
      const time = now - started.current
      if (striker) striker.rotation.x = strikerAngle(time)
      if (time >= RING_HIT && !rang.current) {
        rang.current = true
        hitAt.current = now
        void playBell().catch(() => {})
      }
    } else if (striker && striker.rotation.x !== 0) {
      striker.rotation.x *= 0.9
      if (Math.abs(striker.rotation.x) < 0.001) striker.rotation.x = 0
    }
    // 맞은 범종은 몇 초 동안 천천히 흔들리다 멈춘다.
    if (bell && hitAt.current >= 0) {
      const after = now - hitAt.current
      bell.rotation.x = 0.06 * Math.sin(after * 3.2) * Math.exp(-after * 0.7)
      if (after > 8) {
        bell.rotation.x = 0
        hitAt.current = -1
      }
    }
  })

  return null
}
