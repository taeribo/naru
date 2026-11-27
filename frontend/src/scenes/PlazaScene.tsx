import { Castle } from './Castle'
import { CherryPetals } from './CherryPetals'
import { CherryTree } from './CherryTree'
import { EntranceArchitecture } from './EntranceArchitecture'
import { CourtyardLandmarks } from './CourtyardLandmarks'
import { Avenue } from './Avenue'
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

const PLAZA_TREE_SCALE = 1.9

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

function ViewportSettings() {
  const compact = useThree((state) => state.size.width < 680)
  const setDpr = useThree((state) => state.setDpr)
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio, compact ? 1 : 1.35))
    if (camera instanceof PerspectiveCamera) {
      camera.fov = compact ? 82 : PLAZA_CAMERA.fov
      camera.updateProjectionMatrix()
    }
  }, [camera, compact, setDpr])
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
}: {
  onOpenZone: (zone: ZoneId) => void
  onCameraBearing: (bearing: number) => void
  world: {
    players: WorldPlayer[]
    id: string | null
    move: (x: number, z: number) => void
  }
}) {
  const [canRender] = useState(supportsWebGl)
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
      dpr={[1, 1.35]}
      shadows={
        window.matchMedia('(min-width: 680px) and (pointer: fine)').matches
      }
      fallback={
        <p className="world-fallback">3D 장면을 보려면 WebGL 2가 필요합니다.</p>
      }
    >
      <ViewportSettings />
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
        <Forecourt />
        <FestivalRim />
        <Ground />
        <Avenue />
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
        />
        <group position={CHERRY_POSITION}>
          <group scale={PLAZA_TREE_SCALE / 1.3}>
            <FlowerBed />
          </group>
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
