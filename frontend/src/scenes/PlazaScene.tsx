import { Castle } from './Castle'
import { CherryPetals } from './CherryPetals'
import { CherryTree } from './CherryTree'
import { EntranceArchitecture } from './EntranceArchitecture'
import { CourtyardLandmarks } from './CourtyardLandmarks'
import { FlowerBed, Ground, Village } from './Landmarks'
import { Fuji } from './Fuji'
import { GardenTerrain } from './GardenTerrain'
import { Hills } from './Hills'
import { Japan } from './Japan'
import { PlazaVisitors } from './PlazaVisitors'
import { Sky } from './Sky'
import { FestivalRim } from './FestivalRim'
import { Forecourt } from './Forecourt'
import { OnsenApproach } from './OnsenApproach'
import { OnsenTamago } from './OnsenTamago'
import { WishHang } from './WishHang'
import { BellRing } from './BellRing'
import type { Snack } from './OnsenTamago'
import { StreetStalls } from './StreetStalls'
import { CHERRY_POSITION, ENTRY_SPAWN_Z, groundHeight } from './terrain'
import { preloadSurfaces } from './surfaces'
import { Zones } from './Zones'
import type { ZoneId } from './Zones'
import type { WorldPlayer } from '../services/world'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { PerspectiveCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const PLAZA_TREE_SCALE = 1.76

const ENTRY_POSITION: [number, number, number] = [0, 0, ENTRY_SPAWN_Z]
const CAMERA_DISTANCE = 8.7
const CAMERA_HEIGHT = 3.55

const PLAZA_CAMERA = {
  position: [0, CAMERA_HEIGHT, ENTRY_POSITION[2] + CAMERA_DISTANCE] as [
    number,
    number,
    number,
  ],
  fov: 67,
  near: 0.1,
  far: 800,
}
const CAMERA_TARGET: [number, number, number] = [
  0,
  CAMERA_HEIGHT - 0.28,
  ENTRY_POSITION[2] - 2.4,
]

function VisitorCamera({
  visitor,
  onBearing,
}: {
  visitor: WorldPlayer | undefined
  onBearing: (bearing: number) => void
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const followed = useRef<{ x: number; y: number; z: number } | null>(null)

  useFrame(({ camera }, delta) => {
    const orbit = controls.current
    if (!visitor || !orbit) return
    const anchor = (followed.current ??= {
      x: ENTRY_POSITION[0],
      y: ENTRY_POSITION[1],
      z: ENTRY_POSITION[2],
    })
    const blend = 1 - Math.exp(-8 * delta)
    const dx = (visitor.x - anchor.x) * blend
    const dz = (visitor.z - anchor.z) * blend
    const dy = (groundHeight(visitor.x, visitor.z) - anchor.y) * blend
    anchor.y += dy
    anchor.x += dx
    anchor.z += dz
    camera.position.y += dy
    orbit.target.y += dy
    camera.position.x += dx
    camera.position.z += dz
    orbit.target.x += dx
    orbit.target.z += dz
  })

  return (
    <OrbitControls
      ref={controls}
      target={CAMERA_TARGET}
      onChange={(event) => {
        if (event) onBearing(event.target.getAzimuthalAngle())
      }}
      enableDamping
      enablePan={false}
      minDistance={4.2}
      maxDistance={16}
      maxPolarAngle={Math.PI * 0.53}
    />
  )
}

/** 해상도 배율 단계. 프레임이 떨어지면 한 단계씩 낮추고, 여유가 생기면 다시 올린다. */
const DPR_STEPS = [0.75, 0.9, 1, 1.15, 1.35]

/**
 * Canvas는 다시 그려질 때마다 dpr 속성값으로 해상도를 되돌리므로,
 * 여기서 정한 값을 onDpr로 올려 Canvas의 dpr 속성 자체를 바꾼다.
 */
function ViewportSettings({ onDpr }: { onDpr: (dpr: number) => void }) {
  const compact = useThree((state) => state.size.width < 680)
  const camera = useThree((state) => state.camera)
  const [step, setStep] = useState(DPR_STEPS.length - 1)
  const frames = useRef({ count: 0, elapsed: 0, cooldown: 0 })

  useEffect(() => {
    const ceiling = Math.min(window.devicePixelRatio, compact ? 1 : 1.35)
    onDpr(Math.min(ceiling, DPR_STEPS[step]))
    if (camera instanceof PerspectiveCamera) {
      camera.fov = compact ? 82 : PLAZA_CAMERA.fov
      camera.updateProjectionMatrix()
    }
  }, [camera, compact, onDpr, step])

  // 1.5초마다 평균 프레임을 보고 해상도를 조절한다.
  useFrame((_state, delta) => {
    const sample = frames.current
    sample.count += 1
    sample.elapsed += Math.min(delta, 0.25)
    if (sample.elapsed < 1.5) return
    const fps = sample.count / sample.elapsed
    sample.count = 0
    sample.elapsed = 0
    if (sample.cooldown > 0) {
      sample.cooldown -= 1
      return
    }
    if (fps < 45 && step > 0) {
      setStep(step - 1)
      sample.cooldown = 1
    } else if (fps > 58 && step < DPR_STEPS.length - 1) {
      setStep(step + 1)
      sample.cooldown = 2
    }
  })
  return null
}

/** 그림자 지도 갱신 간격(프레임). 광장 대부분이 멈춰 있어 매 프레임 다시 그릴 필요가 없다. */
const SHADOW_REFRESH_FRAMES = 12

function ThrottledShadows() {
  const gl = useThree((state) => state.gl)
  const frame = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])
  useFrame(() => {
    frame.current = (frame.current + 1) % SHADOW_REFRESH_FRAMES
    if (frame.current === 0) gl.shadowMap.needsUpdate = true
  })
  return null
}

function supportsWebGl() {
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    preloadSurfaces()
    return true
  } catch {
    return false
  }
}

export function PlazaScene({
  onOpenZone,
  onCameraBearing,
  world,
  wishSignal = 0,
  bellSignal = 0,
}: {
  onOpenZone: (zone: ZoneId) => void
  onCameraBearing: (bearing: number) => void
  /** 소원패를 걸 때마다 늘어나는 값. 늘어나면 걸이 앞으로 가서 패를 건다. */
  wishSignal?: number
  /** 종 울리기를 누를 때마다 늘어나는 값. 늘어나면 종각으로 가서 종을 친다. */
  bellSignal?: number
  world: {
    players: WorldPlayer[]
    id: string | null
    move: (x: number, z: number) => void
    /** 의자·우물 앞처럼 정해진 자리까지 들어가는 이동(없으면 move). */
    arrive?: (x: number, z: number) => void
  }
}) {
  const [canRender] = useState(supportsWebGl)
  const [snack, setSnack] = useState<Snack | null>(null)
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, 1.35))
  const visitor = world.players.find((player) => player.id === world.id)
  if (!canRender) {
    return (
      <p className="world-fallback">3D 장면을 보려면 WebGL 2가 필요합니다.</p>
    )
  }

  return (
    <Canvas
      className="plaza-canvas"
      camera={PLAZA_CAMERA}
      dpr={dpr}
      shadows={
        window.matchMedia('(min-width: 680px) and (pointer: fine)').matches
      }
      fallback={
        <p className="world-fallback">3D 장면을 보려면 WebGL 2가 필요합니다.</p>
      }
    >
      <ViewportSettings onDpr={setDpr} />
      <ThrottledShadows />
      <Suspense fallback={null}>
        <fog attach="fog" args={['#ada3ad', 45, 258]} />
        <hemisphereLight
          color="#dde4ff"
          groundColor="#a7896e"
          intensity={0.76}
        />
        <directionalLight
          position={[30, 18, -38]}
          intensity={1.66}
          color="#ffc28b"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-43}
          shadow-camera-right={43}
          shadow-camera-top={43}
          shadow-camera-bottom={-43}
          shadow-normalBias={0.055}
          shadow-bias={-0.0005}
        />
        <directionalLight
          position={[-9, 10, 26]}
          color="#ffd4b5"
          intensity={0.36}
        />
        <pointLight
          position={[-9, 2.8, 13.2]}
          color="#ffb46b"
          intensity={35}
          distance={13}
        />
        <pointLight
          position={[10.4, 2.5, 10.6]}
          color="#ffc07c"
          intensity={36}
          distance={13}
        />
        <Sky />
        <GardenTerrain />
        <EntranceArchitecture />
        <StreetStalls />
        <OnsenApproach />
        <BellRing
          signal={bellSignal}
          visitor={visitor}
          snack={snack}
          onSnack={setSnack}
          onMove={world.arrive ?? world.move}
        />
        <WishHang
          signal={wishSignal}
          visitor={visitor}
          snack={snack}
          onSnack={setSnack}
          onMove={world.arrive ?? world.move}
        />
        <OnsenTamago
          visitor={visitor}
          onMove={world.arrive ?? world.move}
          snack={snack}
          onSnack={setSnack}
        />
        <Forecourt />
        <FestivalRim />
        <Ground />
        <CourtyardLandmarks />
        <Village />
        <Fuji />
        <Hills />
        <Castle />
        <Japan />

        <Zones onSelect={onOpenZone} visitor={visitor} />
        <PlazaVisitors
          players={world.players}
          ownId={world.id}
          onMove={world.move}
          snack={snack}
        />
        <group position={CHERRY_POSITION}>
          <FlowerBed />
          <group scale={PLAZA_TREE_SCALE}>
            <CherryTree />
            <CherryPetals />
          </group>
        </group>
      </Suspense>
      <VisitorCamera visitor={visitor} onBearing={onCameraBearing} />
    </Canvas>
  )
}
