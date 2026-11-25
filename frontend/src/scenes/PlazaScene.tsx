import { Castle } from './Castle'
import { CherryPetals } from './CherryPetals'
import { CherryTree } from './CherryTree'
import { Lantern } from './Lantern'
import { FlowerBed, Ground, StoneLantern, Village } from './Landmarks'
import { Dragon } from './Dragon'
import { LanternStrings } from './Festival'
import { Fuji } from './Fuji'
import { Hills } from './Hills'
import { Japan } from './Japan'
import { PlazaVisitors } from './PlazaVisitors'
import { Sky } from './Sky'
import { LAUNCH_ORIGIN } from './terrain'
import { Zones } from './Zones'
import type { ZoneId } from './Zones'
import type { WorldPlayer } from '../services/world'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'

const LAUNCH_HEIGHT = LAUNCH_ORIGIN[1]

function RisingLantern({
  onComplete,
  offset = 0,
}: {
  onComplete: () => void
  offset?: number
}) {
  const group = useRef<Group>(null)
  const elapsed = useRef(0)
  const originX = LAUNCH_ORIGIN[0] + (offset === 0 ? 0 : (offset - 2.4) * 5)

  useFrame((_state, delta) => {
    if (!group.current || elapsed.current >= 2) return
    elapsed.current = Math.min(2, elapsed.current + delta)
    const progress = elapsed.current / 2
    group.current.position.set(
      originX + Math.sin(progress * Math.PI) * 0.6,
      LAUNCH_HEIGHT + progress * 7.8,
      LAUNCH_ORIGIN[2] - progress * 2.5,
    )
    group.current.rotation.z = Math.sin(progress * Math.PI * 2) * 0.12
    if (elapsed.current === 2) onComplete()
  })

  return (
    <group ref={group} position={[originX, LAUNCH_HEIGHT, LAUNCH_ORIGIN[2]]}>
      <Lantern scale={1.36} glow={1.5} />
      {offset === 0 && (
        <pointLight color="#ff9a43" intensity={11} distance={5} />
      )}
    </group>
  )
}

const PLAZA_CAMERA = {
  position: [0, 17, 50] as [number, number, number],
  fov: 56,
  near: 0.1,
  far: 800,
}
const CAMERA_TARGET: [number, number, number] = [0, 2, 2]

function supportsWebGl() {
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export function PlazaScene({
  launchId,
  onComplete,
  onSelectZone,
  world,
}: {
  launchId: number | null
  onComplete: () => void
  onSelectZone: (zone: ZoneId) => void
  world: {
    players: WorldPlayer[]
    id: string | null
    lanterns: string[]
    finishLantern: (id: string) => void
    move: (x: number, z: number) => void
  }
}) {
  const [canRender] = useState(supportsWebGl)
  if (!canRender) {
    return (
      <p className="world-fallback">3D 장면을 보려면 WebGL 2가 필요합니다.</p>
    )
  }

  return (
    <Canvas
      className="plaza-canvas"
      camera={PLAZA_CAMERA}
      dpr={[1, 1.5]}
      fallback={
        <p className="world-fallback">3D 장면을 보려면 WebGL 2가 필요합니다.</p>
      }
    >
      <color attach="background" args={['#171333']} />
      <fog attach="fog" args={['#35214d', 60, 420]} />
      <ambientLight intensity={1.3} color="#e4c0ff" />
      <directionalLight
        position={[-5, 11, 5]}
        intensity={2.3}
        color="#ffb8e4"
      />
      <pointLight
        position={[1, 3.2, 3]}
        intensity={42}
        distance={12}
        color="#ffa55d"
      />
      <Sky />
      <Ground />
      <Village />
      <Fuji />
      <Hills />
      <Castle />
      <Japan />
      <Dragon />
      <LanternStrings />
      <FlowerBed />
      <Zones onSelect={onSelectZone} />
      <CherryPetals />
      <PlazaVisitors
        players={world.players}
        ownId={world.id}
        onMove={world.move}
      />
      <CherryTree />
      {[
        [-22, -16],
        [22, -16],
        [-24, 0],
        [24, 0],
        [-22, 14],
        [22, 14],
        [-6.2, 23],
        [6.2, 23],
      ].map(([x, z]) => (
        <StoneLantern key={`${x}${z}`} position={[x, 0, z]} scale={1.1} />
      ))}
      {launchId !== null && (
        <RisingLantern key={launchId} onComplete={onComplete} />
      )}
      {world.lanterns.map((id) => (
        <RisingLantern
          key={`remote-${id}`}
          offset={1 + (id.charCodeAt(id.length - 1) % 6) * 0.55}
          onComplete={() => world.finishLantern(id)}
        />
      ))}
      <OrbitControls
        target={CAMERA_TARGET}
        enableDamping
        enablePan={false}
        minDistance={14}
        maxDistance={70}
        maxPolarAngle={Math.PI / 2 - 0.09}
      />
    </Canvas>
  )
}
