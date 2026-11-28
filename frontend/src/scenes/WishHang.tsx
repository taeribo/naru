import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { DoubleSide } from 'three'
import type { MeshStandardMaterial } from 'three'
import type { WorldPlayer } from '../services/world'
import type { Seat, Snack } from './OnsenTamago'
import { getEmaTexture } from './textures'
import { ZONES } from './terrain'
import { HANG_RELEASE, HANG_SECONDS } from './VisitorModel'

/** 소원패 걸이 구역의 놓임새(Zones.tsx의 소원패 Zone과 같다). */
const RACK_YAW = -0.4
const RACK_SCALE = 1.35
/** 걸이 안쪽 좌표에서 새 소원패가 걸리는 자리: 맨 아래 가로대 가운데, 기존 패보다 살짝 앞. */
const PLAQUE_LOCAL: [number, number, number] = [0.21, 0.85, -0.47]
/** 걸이 앞에 서는 거리(걸이 안쪽 좌표, 걸이 판에서 앞으로). */
const STAND_LOCAL_Z = -0.55 + 0.3

function toWorld(localX: number, localZ: number) {
  const x = localX * RACK_SCALE
  const z = localZ * RACK_SCALE
  return {
    x: ZONES.wish[0] + x * Math.cos(RACK_YAW) + z * Math.sin(RACK_YAW),
    z: ZONES.wish[1] - x * Math.sin(RACK_YAW) + z * Math.cos(RACK_YAW),
  }
}

/** 구역 받침돌 윗면 높이(Zones.tsx 받침: 0.095 + 0.22/2, 구역 배율 1.35). 발이 묻히지 않게 이 위에 선다. */
const PAD_TOP = 0.205 * RACK_SCALE

/** 소원패를 걸 때 서는 자리. 걸이를 바라본다. */
const HANG_SPOT: Seat = {
  ...toWorld(0.21, STAND_LOCAL_Z),
  y: PAD_TOP,
  yaw: RACK_YAW,
}

/**
 * 소원패 걸기 동작: 소원을 보내면 걸이 앞까지 걸어가 팔을 들어 패를 건다.
 * 건 패는 걸이 맨 아래 줄에 은은하게 빛나며 남는다(내 화면에서만, 이번 방문 동안).
 */
export function WishHang({
  signal,
  visitor,
  snack,
  onSnack,
  onMove,
}: {
  /** 소원패를 걸 때마다 1씩 늘어나는 값. */
  signal: number
  visitor: WorldPlayer | undefined
  snack: Snack | null
  onSnack: (snack: Snack | null) => void
  onMove: (x: number, z: number) => void
}) {
  const [hung, setHung] = useState(0)
  const glow = useRef<MeshStandardMaterial>(null)
  const hungAt = useRef(0)
  const handled = useRef(0)

  useEffect(() => {
    if (!signal || signal === handled.current || !visitor) return
    handled.current = signal
    onSnack({ spot: HANG_SPOT, arrived: false, pose: 'hang' })
    onMove(HANG_SPOT.x, HANG_SPOT.z)
  }, [signal, visitor, onSnack, onMove])

  const hanging = !!snack?.arrived && snack.pose === 'hang'
  useEffect(() => {
    if (!hanging) return
    const place = window.setTimeout(
      () => setHung((count) => count + 1),
      HANG_RELEASE * 1000,
    )
    const done = window.setTimeout(() => onSnack(null), HANG_SECONDS * 1000)
    return () => {
      window.clearTimeout(place)
      window.clearTimeout(done)
    }
  }, [hanging, onSnack])

  // 막 건 패는 잠깐 금빛으로 빛났다가 차분해진다.
  useFrame(({ clock }) => {
    if (!glow.current) return
    if (hung && !hungAt.current) hungAt.current = clock.elapsedTime
    const age = clock.elapsedTime - hungAt.current
    glow.current.emissiveIntensity = 0.15 + 0.85 * Math.exp(-age / 2.5)
  })

  if (!hung) return null
  return (
    <group
      position={[ZONES.wish[0], 0, ZONES.wish[1]]}
      rotation-y={RACK_YAW}
      scale={RACK_SCALE}
    >
      <mesh position={PLAQUE_LOCAL} rotation-y={0.08}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial
          ref={glow}
          map={getEmaTexture()}
          alphaTest={0.5}
          side={DoubleSide}
          emissive="#ffcf86"
          emissiveIntensity={1}
          roughness={0.85}
        />
      </mesh>
    </group>
  )
}
