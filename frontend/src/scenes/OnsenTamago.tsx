import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorldPlayer } from '../services/world'
import { LADLE_SECONDS } from './VisitorModel'
import type { VisitorPose } from './VisitorModel'
import {
  CanvasTexture,
  DoubleSide,
  DodecahedronGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import type { Group, InstancedMesh } from 'three'
import { SnowCap } from './SnowCap'
import { SteamPlume } from './SteamPlume'
import { roofGeometry } from './shapes'
import { projectSurfaceUvs, useSurface } from './surfaces'

/** 온천 달걀 우물을 놓는 자리: 광장 뒤편 빈 바닥. */
export const TAMAGO_POSITION: [number, number, number] = [-1.5, 0, -31]
const SCALE = 1.8

/** 우물 앞에서 버튼이 나타나는 거리. */
const NEAR_DISTANCE = 6.5
/** 달걀이 다 삶아질 때까지(초). 실제로는 한참 걸리지만 기다리기 좋은 길이로 줄였다. */
const BOIL_SECONDS = 12
/** 자리에 앉아 달걀을 먹는 시간(초). */
const EAT_SECONDS = 6

type Stage = 'idle' | 'walking' | 'ladling' | 'boiling' | 'ready'

/** 걸터앉는 자리: 엉덩이가 놓일 높이와 바라보는 방향(얼굴은 -Z가 기준). */
export type Seat = { x: number; y: number; z: number; yaw: number }

/**
 * 내 캐릭터의 체험 자리와 자세(온천 달걀, 소원패 걸기 공용). spot까지 걸어가 도착(arrived)하면 그 자세를 취한다.
 * 서버로 보내지 않고 내 화면에서만 쓴다.
 */
export type Snack = { spot: Seat; arrived: boolean; pose: VisitorPose }

/** 우물 왼편의 쉼터: 붉은 천을 깐 평상 둘과 큰 종이우산. */
const REST_AREA: [number, number] = [-8.6, -29.6]
const BENCH_HEIGHT = 0.46
const BENCHES = [
  { x: REST_AREA[0] + 0.6, z: REST_AREA[1] + 1.2, yaw: 0, length: 2.6 },
  {
    x: REST_AREA[0] - 1.6,
    z: REST_AREA[1] - 0.9,
    yaw: Math.PI / 2,
    length: 2.2,
  },
]
/** 국자로 달걀을 넣을 때 서는 자리: 우물 바로 앞에서 우물을 바라본다. */
const LADLE_SPOT: Seat = {
  x: TAMAGO_POSITION[0],
  y: 0,
  z: TAMAGO_POSITION[2] + 1.75,
  yaw: 0,
}
const SEATS: Seat[] = [
  { x: REST_AREA[0] - 0.1, z: REST_AREA[1] + 1.2, yaw: Math.PI },
  { x: REST_AREA[0] + 1.3, z: REST_AREA[1] + 1.2, yaw: Math.PI },
  { x: REST_AREA[0] - 1.6, z: REST_AREA[1] - 1.4, yaw: -Math.PI / 2 },
  { x: REST_AREA[0] - 1.6, z: REST_AREA[1] - 0.2, yaw: -Math.PI / 2 },
].map((seat) => ({ ...seat, y: BENCH_HEIGHT + 0.02 }))

let signTexture: CanvasTexture | null = null
function getSignTexture() {
  if (signTexture) return signTexture
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#17171a'
  ctx.fillRect(0, 0, 512, 256)
  ctx.strokeStyle = '#5c4a38'
  ctx.lineWidth = 10
  ctx.strokeRect(5, 5, 502, 246)
  // 노른자 같은 작은 달걀
  ctx.fillStyle = '#f2c94c'
  ctx.beginPath()
  ctx.ellipse(256, 50, 15, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4efe4'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font =
    '700 92px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif'
  ctx.fillText('温泉たまご', 256, 138, 470)
  ctx.font =
    '500 30px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif'
  ctx.fillStyle = '#d8d0c2'
  ctx.fillText('ご自由にお召し上がりください', 256, 212, 440)
  signTexture = new CanvasTexture(canvas)
  signTexture.colorSpace = SRGBColorSpace
  signTexture.anisotropy = 4
  return signTexture
}

/** 받침이 잘록한 돌 우물: 아래는 넓고 허리는 좁고, 위는 달걀을 삶는 넓은 솥. */
function basinGeometry() {
  return new LatheGeometry(
    [
      new Vector2(0, 0),
      new Vector2(0.56, 0),
      new Vector2(0.52, 0.12),
      new Vector2(0.4, 0.42),
      new Vector2(0.42, 0.7),
      new Vector2(0.6, 0.9),
      new Vector2(0.72, 1.02),
      new Vector2(0.72, 1.1),
      new Vector2(0.64, 1.1),
      new Vector2(0, 1.06),
    ],
    24,
  )
}

/** 금속 대야에 담긴 달걀들. */
function Eggs({ count = 9 }: { count?: number }) {
  const geometry = useMemo(() => {
    const egg = new SphereGeometry(0.055, 10, 8)
    egg.scale(1, 1.25, 1)
    return egg
  }, [])
  return (
    <instancedMesh
      args={[geometry, undefined, count]}
      castShadow
      ref={(mesh: InstancedMesh | null) => {
        if (!mesh) return
        const matrix = new Matrix4()
        const rotation = new Quaternion()
        for (let index = 0; index < count; index += 1) {
          const angle = index * 2.4
          const radius = index === 0 ? 0 : 0.09 + (index % 3) * 0.05
          rotation.setFromAxisAngle(
            new Vector3(Math.sin(angle), 0, Math.cos(angle)),
            1.2 + (index % 4) * 0.2,
          )
          matrix.compose(
            new Vector3(
              Math.cos(angle) * radius,
              0.05 + (index % 2) * 0.03,
              Math.sin(angle) * radius,
            ),
            rotation,
            new Vector3(1, 1, 1),
          )
          mesh.setMatrixAt(index, matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
      }}
    >
      <meshStandardMaterial color="#eadfca" roughness={0.55} />
    </instancedMesh>
  )
}

/**
 * 온천 달걀(온센 타마고) 우물: 온천수로 달걀을 삶는 돌 우물과 지붕 달린 나무 틀.
 * 뚜껑 틈으로 김이 오르고, 옆 선반에 삶은 달걀과 국자가 놓여 있다.
 */
function TamagoWell({ stage }: { stage: Stage }) {
  const stone = useSurface('stone')
  const wood = useSurface('wood')
  const tile = useSurface('roof')
  const basin = useMemo(basinGeometry, [])
  const roof = useMemo(() => roofGeometry(1.75, 1.3, 0.5, 0.22), [])
  const pad = useMemo(
    () =>
      projectSurfaceUvs(new DodecahedronGeometry(1, 1).scale(2.1, 0.16, 1.7)),
    [],
  )
  const bowl = useMemo(
    () =>
      new LatheGeometry(
        [
          new Vector2(0, 0),
          new Vector2(0.2, 0.01),
          new Vector2(0.3, 0.1),
          new Vector2(0.32, 0.13),
        ],
        20,
      ),
    [],
  )
  const lid = useRef<Group>(null)
  const potEggs = useRef<Group>(null)

  // 계란을 넣으면 뚜껑을 옆으로 밀어 걸치고, 끓는 물속에서 달걀 바구니가 들썩인다.
  useFrame(({ clock }, delta) => {
    const open = stage === 'idle' || stage === 'walking' ? 0 : 1
    const ease = Math.min(1, delta * 4)
    if (lid.current) {
      const target = {
        x: 0.6 * open,
        y: 1.27 + 0.06 * open,
        tilt: -0.32 * open,
      }
      lid.current.position.x += (target.x - lid.current.position.x) * ease
      lid.current.position.y += (target.y - lid.current.position.y) * ease
      lid.current.rotation.z += (target.tilt - lid.current.rotation.z) * ease
    }
    if (potEggs.current) {
      const boil = stage === 'boiling' ? 1 : 0.25
      const t = clock.elapsedTime
      potEggs.current.position.y = 1.19 + Math.sin(t * 7) * 0.012 * boil
      potEggs.current.rotation.y = Math.sin(t * 1.3) * 0.2 * boil
    }
  })

  const rocks = useMemo(
    () =>
      [
        [-1.55, 0.16, 0.95, 0.3],
        [1.55, 0.2, 0.7, 0.34],
        [1.25, 0.16, -1.05, 0.3],
        [-1.6, 0.15, -0.9, 0.26],
      ] as const,
    [],
  )

  return (
    <group position={TAMAGO_POSITION} scale={SCALE}>
      {/* 바닥: 낮게 깔린 넓적한 돌 */}
      <mesh geometry={pad} position-y={0.02} receiveShadow>
        <meshStandardMaterial {...stone} color="#7d7774" roughness={0.95} />
      </mesh>
      {rocks.map(([x, y, z, size], index) => (
        <mesh
          key={index}
          position={[x, y, z]}
          rotation={[index * 0.7, index * 1.3, 0.2]}
          scale={[size * 1.3, size, size * 1.1]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial {...stone} color="#615b55" roughness={1} />
        </mesh>
      ))}

      {/* 돌 우물과 나무 뚜껑 */}
      <mesh geometry={basin} position-y={0.12} castShadow receiveShadow>
        <meshStandardMaterial {...stone} color="#bdb7ae" roughness={0.9} />
      </mesh>
      <group ref={lid} position-y={1.27}>
        <mesh castShadow>
          <cylinderGeometry args={[0.68, 0.68, 0.07, 28]} />
          <meshStandardMaterial {...wood} color="#7a3a24" roughness={0.6} />
        </mesh>
        <mesh position-y={0.07} castShadow>
          <boxGeometry args={[0.07, 0.07, 1.05]} />
          <meshStandardMaterial {...wood} color="#b8743a" roughness={0.7} />
        </mesh>
      </group>
      {/* 뚜껑 아래 온천수, 넣은 달걀은 대나무 바구니째 물에 잠긴다 */}
      <mesh position-y={1.17} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.62, 28]} />
        <meshStandardMaterial
          color="#9cc7bd"
          emissive="#3d6d66"
          emissiveIntensity={0.35}
          roughness={0.15}
        />
      </mesh>
      {(stage === 'boiling' || stage === 'ready') && (
        <group ref={potEggs} position-y={1.19}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.24, 0.022, 6, 20]} />
            <meshStandardMaterial color="#c8a669" roughness={0.9} />
          </mesh>
          <Eggs count={5} />
        </group>
      )}
      {stage === 'boiling' && (
        <SteamPlume
          position={[0, 1.25, 0]}
          radius={0.35}
          height={2.6}
          count={22}
          size={0.85}
          opacity={0.42}
          speed={0.16}
          color={[0.95, 0.95, 0.97]}
          seed={12}
        />
      )}
      <SteamPlume
        position={[0, 1.3, 0]}
        radius={0.5}
        height={2.2}
        count={16}
        size={0.75}
        opacity={0.3}
        speed={0.07}
        color={[0.9, 0.9, 0.93]}
        seed={11}
      />

      {/* 나무 틀과 눈 쌓인 지붕 */}
      {[-1.35, 1.35].flatMap((x) =>
        [-0.95, 0.95].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.4, z]} castShadow>
            <boxGeometry args={[0.13, 2.8, 0.13]} />
            <meshStandardMaterial {...wood} color="#5a3a26" roughness={0.85} />
          </mesh>
        )),
      )}
      {[-0.95, 0.95].map((z) => (
        <mesh key={z} position={[0, 2.72, z]} castShadow>
          <boxGeometry args={[2.95, 0.14, 0.15]} />
          <meshStandardMaterial {...wood} color="#5a3a26" roughness={0.85} />
        </mesh>
      ))}
      <mesh geometry={roof} position-y={2.78} castShadow>
        <meshStandardMaterial {...tile} color="#5b4a3e" side={DoubleSide} />
        <SnowCap source={roof} thickness={0.12} />
      </mesh>

      {/* 앞 보에 매단 간판 */}
      <mesh position={[0, 2.3, 1.0]}>
        <boxGeometry args={[1.5, 0.75, 0.05]} />
        <meshStandardMaterial color="#17171a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.3, 1.027]}>
        <planeGeometry args={[1.48, 0.74]} />
        <meshStandardMaterial map={getSignTexture()} roughness={0.8} />
      </mesh>

      {/* 왼쪽 선반: 달걀 대야와 물통 */}
      <mesh position={[-1.0, 0.86, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.06, 0.62]} />
        <meshStandardMaterial {...wood} color="#6b4a30" roughness={0.85} />
      </mesh>
      <mesh position={[-1.0, 0.43, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.86, 0.08]} />
        <meshStandardMaterial {...wood} color="#5a3a26" roughness={0.85} />
      </mesh>
      <group position={[-1.0, 0.89, 0.2]}>
        <mesh geometry={bowl} castShadow>
          <meshStandardMaterial
            color="#c9c6c0"
            metalness={0.85}
            roughness={0.3}
            side={DoubleSide}
          />
        </mesh>
        <Eggs />
      </group>
      <mesh position={[-1.02, 0.36, -0.45]} castShadow>
        <cylinderGeometry args={[0.22, 0.19, 0.72, 16]} />
        <meshStandardMaterial
          color="#55575c"
          metalness={0.6}
          roughness={0.45}
        />
      </mesh>

      {/* 오른쪽 기둥에 건 국자: 달걀을 넣는 동안에는 손에 들려 있다 */}
      {stage !== 'ladling' && (
        <>
          <group position={[1.27, 1.55, 0.6]} rotation-z={-0.08}>
            <mesh>
              <cylinderGeometry args={[0.018, 0.018, 0.75, 6]} />
              <meshStandardMaterial
                color="#a8743f"
                metalness={0}
                roughness={1}
              />
            </mesh>
            <mesh position-y={-0.42} scale={[1, 0.6, 1]}>
              <sphereGeometry
                args={[0.08, 10, 8, 0, Math.PI * 2, Math.PI / 2]}
              />
              <meshStandardMaterial
                color="#a8743f"
                metalness={0}
                roughness={1}
                side={DoubleSide}
              />
            </mesh>
          </group>
        </>
      )}

      {/* 처마 밑 작은 초롱: 빛은 내지 않고 은은히 밝기만 한다 */}
      <group position={[1.05, 2.25, 1.0]}>
        <mesh position-y={0.18}>
          <cylinderGeometry args={[0.005, 0.005, 0.2, 4]} />
          <meshBasicMaterial color="#2a2522" />
        </mesh>
        <mesh scale={[1, 1.25, 1]}>
          <sphereGeometry args={[0.15, 14, 10]} />
          <meshStandardMaterial
            color="#ffd9a0"
            emissive="#ff9a4a"
            emissiveIntensity={1.4}
            roughness={0.9}
          />
        </mesh>
      </group>
    </group>
  )
}

/** 평상(엔다이): 나무 다리 위에 붉은 모전(히모센)을 깐 긴 의자. */
function Bench({ length }: { length: number }) {
  const wood = useSurface('wood')
  return (
    <group>
      <mesh position-y={BENCH_HEIGHT - 0.04} castShadow receiveShadow>
        <boxGeometry args={[length, 0.08, 0.78]} />
        <meshStandardMaterial {...wood} color="#6b4a30" roughness={0.85} />
      </mesh>
      <mesh position-y={BENCH_HEIGHT + 0.005} receiveShadow>
        <boxGeometry args={[length - 0.08, 0.02, 0.8]} />
        <meshStandardMaterial color="#b3302b" roughness={0.95} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[
              sx * (length / 2 - 0.12),
              (BENCH_HEIGHT - 0.08) / 2,
              sz * 0.3,
            ]}
            castShadow
          >
            <boxGeometry args={[0.08, BENCH_HEIGHT - 0.08, 0.08]} />
            <meshStandardMaterial {...wood} color="#4e3424" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** 큰 종이우산(노다테가사): 붉은 갓이 평상에 그늘을 드리운다. */
function Parasol() {
  const canopy = useMemo(
    () =>
      new LatheGeometry(
        [
          new Vector2(1.75, 0),
          new Vector2(1.2, 0.22),
          new Vector2(0.5, 0.42),
          new Vector2(0.02, 0.5),
        ],
        24,
      ),
    [],
  )
  return (
    <group>
      <mesh position-y={1.35} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 2.7, 8]} />
        <meshStandardMaterial color="#3b2a20" roughness={0.8} />
      </mesh>
      <mesh geometry={canopy} position-y={2.55} castShadow>
        <meshStandardMaterial
          color="#b8322c"
          roughness={0.85}
          side={DoubleSide}
        />
      </mesh>
      <mesh position-y={2.4}>
        <cylinderGeometry args={[0.12, 0.05, 0.14, 10]} />
        <meshStandardMaterial color="#3b2a20" roughness={0.8} />
      </mesh>
    </group>
  )
}

function RestArea() {
  return (
    <group>
      {BENCHES.map(({ x, z, yaw, length }, index) => (
        <group key={index} position={[x, 0, z]} rotation-y={yaw}>
          <Bench length={length} />
        </group>
      ))}
      <group position={[REST_AREA[0] + 0.5, 0, REST_AREA[1] - 0.6]}>
        <Parasol />
      </group>
      {/* 평상 위 쟁반: 찻잔과 소금 종지 */}
      <group
        position={[REST_AREA[0] + 0.6, BENCH_HEIGHT + 0.02, REST_AREA[1] + 1.2]}
      >
        <mesh position-y={0.015}>
          <boxGeometry args={[0.36, 0.03, 0.26]} />
          <meshStandardMaterial color="#2c1d17" roughness={0.5} />
        </mesh>
        <mesh position={[-0.08, 0.07, 0]}>
          <cylinderGeometry args={[0.045, 0.035, 0.08, 12]} />
          <meshStandardMaterial color="#5d7a6c" roughness={0.4} />
        </mesh>
        <mesh position={[0.09, 0.05, 0.02]}>
          <cylinderGeometry args={[0.04, 0.03, 0.03, 12]} />
          <meshStandardMaterial color="#efe9df" roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * 온천 달걀 체험: 우물 앞에 가면 버튼이 나타난다.
 * 계란 넣기 → 삶는 동안 진행 표시 → 꺼내서 먹기(옆 평상으로 가서 앉아 먹는다).
 * 진행 상황은 내 화면에만 있고 서버에 저장하지 않는다.
 */
export function OnsenTamago({
  visitor,
  onMove,
  snack,
  onSnack,
}: {
  visitor: WorldPlayer | undefined
  onMove: (x: number, z: number) => void
  snack: Snack | null
  onSnack: (snack: Snack | null) => void
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [ate, setAte] = useState(false)
  const boilStart = useRef(0)
  const bar = useRef<HTMLSpanElement>(null)
  const seconds = useRef<HTMLSpanElement>(null)

  const near =
    !!visitor &&
    Math.hypot(visitor.x - TAMAGO_POSITION[0], visitor.z - TAMAGO_POSITION[2]) <
      NEAR_DISTANCE

  useFrame(({ clock }) => {
    if (stage !== 'boiling') return
    if (!boilStart.current) boilStart.current = clock.elapsedTime
    const elapsed = clock.elapsedTime - boilStart.current
    const progress = Math.min(1, elapsed / BOIL_SECONDS)
    if (bar.current) bar.current.style.transform = `scaleX(${progress})`
    if (seconds.current)
      seconds.current.textContent = String(
        Math.max(0, Math.ceil(BOIL_SECONDS - elapsed)),
      )
    if (progress >= 1) {
      boilStart.current = 0
      setStage('ready')
    }
  })

  // 정해진 자리에 도착하면 그 자세를 취한다. 도착한 뒤 움직이면 체험을 멈춘다.
  useEffect(() => {
    if (!snack || !visitor) return
    const away = Math.hypot(visitor.x - snack.spot.x, visitor.z - snack.spot.z)
    if (!snack.arrived && away < 0.3) {
      onSnack({ ...snack, arrived: true })
      if (snack.pose === 'ladle') setStage('ladling')
    } else if (snack.arrived && away > 0.6) {
      onSnack(null)
      setStage((current) =>
        current === 'walking' || current === 'ladling' ? 'idle' : current,
      )
    }
  }, [snack, visitor, onSnack])

  // 자리로 가다가 다른 곳으로 가 버리면 취소한다.
  useEffect(() => {
    if (!snack || snack.arrived) return
    const timer = window.setTimeout(() => {
      onSnack(null)
      setStage((current) => (current === 'walking' ? 'idle' : current))
    }, 40000)
    return () => window.clearTimeout(timer)
  }, [snack, onSnack])

  // 국자로 달걀을 다 넣으면 삶기 시작하고, 캐릭터는 다시 자유롭게 움직인다.
  useEffect(() => {
    if (stage !== 'ladling') return
    const timer = window.setTimeout(() => {
      setStage('boiling')
      onSnack(null)
    }, LADLE_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [stage, onSnack])

  useEffect(() => {
    if (!snack?.arrived || snack.pose !== 'eat') return
    const timer = window.setTimeout(() => {
      onSnack({ ...snack, pose: 'sit' })
      setAte(true)
    }, EAT_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [snack, onSnack])

  useEffect(() => {
    if (!ate) return
    const timer = window.setTimeout(() => setAte(false), 4000)
    return () => window.clearTimeout(timer)
  }, [ate])

  function putEgg() {
    setStage('walking')
    onSnack({ spot: LADLE_SPOT, arrived: false, pose: 'ladle' })
    onMove(LADLE_SPOT.x, LADLE_SPOT.z)
  }

  function eat() {
    if (!visitor) return
    const seat = SEATS.reduce((best, candidate) =>
      Math.hypot(candidate.x - visitor.x, candidate.z - visitor.z) <
      Math.hypot(best.x - visitor.x, best.z - visitor.z)
        ? candidate
        : best,
    )
    setStage('idle')
    onSnack({ spot: seat, arrived: false, pose: 'eat' })
    onMove(seat.x, seat.z)
  }

  const eating = !!snack?.arrived && snack.pose === 'eat'
  const busy = stage === 'walking' || stage === 'ladling' || stage === 'boiling'
  const showPanel = (near && !snack) || busy || eating || ate

  return (
    <>
      <TamagoWell stage={stage} />
      <RestArea />
      {showPanel && (
        <Html
          position={
            eating || ate
              ? [
                  snack?.spot.x ?? REST_AREA[0],
                  2.75,
                  snack?.spot.z ?? REST_AREA[1],
                ]
              : [TAMAGO_POSITION[0], 5.6, TAMAGO_POSITION[2]]
          }
          center
          zIndexRange={[3, 0]}
        >
          <div className="tamago-panel">
            {eating ? (
              <p className="tamago-panel__note">호호 불어 가며 먹는 중…</p>
            ) : ate ? (
              <p className="tamago-panel__note">
                따끈하고 고소한 온천 달걀이었어요
              </p>
            ) : stage === 'walking' ? (
              <p className="tamago-panel__note">
                국자를 들러 우물 앞으로 가는 중…
              </p>
            ) : stage === 'ladling' ? (
              <p className="tamago-panel__note">
                긴 국자로 달걀을 살며시 넣는 중…
              </p>
            ) : stage === 'boiling' ? (
              <>
                <p className="tamago-panel__note">
                  온천수에 보글보글 삶는 중 ·{' '}
                  <span ref={seconds}>{BOIL_SECONDS}</span>초
                </p>
                <span className="tamago-panel__track">
                  <span ref={bar} className="tamago-panel__bar" />
                </span>
              </>
            ) : stage === 'ready' ? (
              <button type="button" className="zone-label" onClick={eat}>
                <strong>꺼내서 먹기</strong>
                <span>옆 평상에 앉아 먹어요</span>
              </button>
            ) : (
              <button type="button" className="zone-label" onClick={putEgg}>
                <strong>계란 넣기</strong>
                <span>온천수에 달걀을 삶아요</span>
              </button>
            )}
          </div>
        </Html>
      )}
    </>
  )
}
