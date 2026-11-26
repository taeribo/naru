import { Castle } from './Castle'
import { CherryPetals } from './CherryPetals'
import { CherryTree } from './CherryTree'
import { FlowerBed, Ground, Village } from './Landmarks'
import { Fuji } from './Fuji'
import { Hills } from './Hills'
import { Japan } from './Japan'
import { PlazaVisitors } from './PlazaVisitors'
import { Sky } from './Sky'
import { Zones } from './Zones'
import type { ZoneId } from './Zones'
import type { WorldPlayer } from '../services/world'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'

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
      <FlowerBed />
      <Zones onSelect={onOpenZone} />
      <CherryPetals />
      <PlazaVisitors
        players={world.players}
        ownId={world.id}
        onMove={world.move}
      />
      <CherryTree />
      <OrbitControls
        target={CAMERA_TARGET}
        onChange={(event) => {
          if (event) onCameraBearing(event.target.getAzimuthalAngle())
        }}
        enableDamping
        enablePan={false}
        minDistance={14}
        maxDistance={70}
        maxPolarAngle={Math.PI / 2 - 0.09}
      />
    </Canvas>
  )
}
