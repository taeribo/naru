import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import type { WorldPlayer } from '../services/world'
import { COURTYARD, groundHeight } from './terrain'
import { VisitorModel, lookFor } from './VisitorModel'
import type { Snack } from './OnsenTamago'
import { nicknamesFor } from './nickname'
import { insideBath, isBathing, onsenGround } from './onsenEntry'

/** 탕 안에서 이만큼(초) 가만히 있으면 물속에 앉아 몸을 담근다. */
const SOAK_AFTER = 0.8

/** 이름표가 또렷이 보이는 거리와 사라지는 거리. */
const TAG_NEAR = 9
const TAG_FAR = 16
/** 가까이 있을 때 이름표 글자의 불투명도(app.css의 .visitor-tag와 같게). */
const TAG_OPACITY = 0.6

function Visitor({
  player,
  own,
  nickname,
  snack,
}: {
  player: WorldPlayer
  own: boolean
  nickname: string
  /** 내 캐릭터의 온천 달걀 체험 자리와 자세(내 화면에서만 보인다). */
  snack?: Snack | null
}) {
  const group = useRef<Group>(null)
  const tag = useRef<HTMLSpanElement>(null)
  const initial = useRef<[number, number, number]>([player.x, 0, player.z])
  const look = useMemo(() => lookFor(player.id), [player.id])
  // 걷기 세기(0~1). 실제로 움직인 거리로 정해 팔다리 흔들림에 쓴다.
  const motion = useRef(0)
  const still = useRef(0)
  const [soaking, setSoaking] = useState(false)
  // 탕 안(테두리를 넘는 디딤판부터)에서는 목욕 차림으로 갈아입는다.
  const bathing = isBathing(player.x, player.z)

  useFrame(({ camera }, delta) => {
    if (!group.current) return
    const blend = 1 - Math.exp(-12 * delta)
    // 정해진 자리에 도착하면 그 높이·방향에 맞춰 서거나 앉는다.
    const seat = snack?.arrived ? snack.spot : null
    if (seat) {
      group.current.position.x += (seat.x - group.current.position.x) * blend
      group.current.position.z += (seat.z - group.current.position.z) * blend
      group.current.position.y += (seat.y - group.current.position.y) * blend
      const turn = seat.yaw - group.current.rotation.y
      group.current.rotation.y +=
        Math.atan2(Math.sin(turn), Math.cos(turn)) * blend
      motion.current = 0
      return
    }
    const dx = player.x - group.current.position.x
    const dz = player.z - group.current.position.z
    if (Math.hypot(dx, dz) > 0.025) {
      const turn = Math.atan2(-dx, -dz) - group.current.rotation.y
      group.current.rotation.y +=
        Math.atan2(Math.sin(turn), Math.cos(turn)) * blend
    }
    group.current.position.x += dx * blend
    group.current.position.z += dz * blend
    const pace = Math.min(1, (Math.hypot(dx, dz) * blend) / delta / 2.2)
    motion.current += (pace - motion.current) * Math.min(1, delta * 10)
    if (motion.current < 0.02) motion.current = 0
    // 계단·온천 돌계단을 오르내릴 때 높이가 툭툭 튀지 않게 부드럽게 따라간다.
    const { x, z } = group.current.position
    group.current.position.y +=
      (Math.max(groundHeight(x, z), onsenGround(x, z)) -
        group.current.position.y) *
      blend
    // 탕 안에서 멈춰 있으면 물속에 앉아 쉬고, 움직이면 일어난다.
    still.current = motion.current === 0 ? still.current + delta : 0
    const soak = still.current > SOAK_AFTER && insideBath(x, z, 0.95)
    if (soak !== soaking) setSoaking(soak)
    // 멀리 있는 사람의 이름표는 흐려지다 사라진다. 내 이름표는 늘 보인다.
    if (tag.current && !own) {
      const distance = camera.position.distanceTo(group.current.position)
      const fade = (TAG_FAR - distance) / (TAG_FAR - TAG_NEAR)
      tag.current.style.opacity = String(
        TAG_OPACITY * Math.max(0, Math.min(1, fade)),
      )
    }
  })

  return (
    <group ref={group} position={initial.current}>
      <VisitorModel
        look={look}
        motion={motion}
        pose={snack?.arrived ? snack.pose : soaking ? 'sit' : 'stand'}
        bathing={bathing}
      />
      <Html position-y={1.72} center zIndexRange={[1, 0]}>
        <span
          ref={tag}
          className={own ? 'visitor-tag visitor-tag--own' : 'visitor-tag'}
        >
          {nickname}
        </span>
      </Html>
      {own && !bathing && !(snack?.arrived && snack.spot.y > 0.1) && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.025}>
          <ringGeometry args={[0.37, 0.43, 22]} />
          <meshBasicMaterial color="#ffe2a2" />
        </mesh>
      )}
    </group>
  )
}

export function PlazaVisitors({
  players,
  ownId,
  onMove,
  snack,
}: {
  players: WorldPlayer[]
  ownId: string | null
  onMove: (x: number, z: number) => void
  snack?: Snack | null
}) {
  const nicknames = useMemo(
    () => nicknamesFor(players.map((player) => player.id)),
    [players],
  )
  return (
    <>
      {ownId !== null && (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[COURTYARD.centerX, 0.015, COURTYARD.centerZ]}
          onClick={(event) => {
            if (event.delta > 5) return
            onMove(event.point.x, event.point.z)
          }}
        >
          <planeGeometry args={[COURTYARD.width, COURTYARD.depth]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
      {players.map((player) => (
        <Visitor
          key={player.id}
          player={player}
          own={player.id === ownId}
          nickname={nicknames.get(player.id) ?? ''}
          snack={player.id === ownId ? snack : null}
        />
      ))}
    </>
  )
}
