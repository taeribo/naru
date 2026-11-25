import { PlazaZones, WISH_ZONE_X, ZONE_DEPTH } from './PlazaZones'
import type { PlazaZone } from './PlazaZones'
import { CherryPetals } from './CherryPetals'
import { PlazaVisitors } from './PlazaVisitors'
import type { WorldPlayer } from '../services/world'
import { OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import type { Group } from 'three'

const UP = new Vector3(0, 1, 0)
const STONE_COLORS = [
  '#514656',
  '#625363',
  '#4e4457',
  '#6c5964',
  '#5b505e',
  '#746270',
  '#605560',
]
const BLOSSOM_COLORS = ['#e595c1', '#f5b3d3', '#ba609b', '#ffd1e6']
const SKY_LANTERNS = Array.from({ length: 34 }, (_, index) => {
  const angle = index * 2.39996
  const radius = 8 + (index % 8) * 1.8
  return {
    x: Math.cos(angle) * radius,
    y: 6 + ((index * 13) % 19) * 0.7,
    z: Math.sin(angle) * radius - 6,
  }
})
const TILE_INSTANCES = Array.from({ length: 32 * 24 }, (_, index) => {
  const row = Math.floor(index / 32)
  return {
    position: new Vector3(
      ((index % 32) - 15.5 + (row % 2) * 0.5) * 1.2,
      -0.07,
      (row - 11.5) * 1.15,
    ),
    rotation: ((Math.sin(index * 77.3) * 2) % 1) * 0.019,
    scale: 0.95 + ((index * 13) % 11) * 0.004,
    color: new Color(
      STONE_COLORS[(index * 17 + row * 23) % STONE_COLORS.length],
    ),
  }
})
const BRANCHES = Array.from({ length: 9 }, (_, index) => {
  const angle = index * 2.39996
  const radius = 2.45 + (index % 4) * 0.66
  return {
    start: new Vector3(0.14, 2.5 + (index % 4) * 0.54, 0),
    end: new Vector3(
      Math.cos(angle) * radius,
      5.3 + (index % 5) * 0.58,
      Math.sin(angle) * radius,
    ),
  }
})
function sampleCanopy(index: number, seed: number) {
  const value = Math.sin(index * 53.173 + seed * 87.43) * 43758.5453
  return value - Math.floor(value)
}

const BLOSSOM_INSTANCES = Array.from({ length: 620 }, (_, index) => {
  const branch = BRANCHES[index % BRANCHES.length]
  const angle = sampleCanopy(index, 1) * Math.PI * 2
  const radius = Math.sqrt(sampleCanopy(index, 2)) * 2.38
  return {
    position: branch.end
      .clone()
      .add(
        new Vector3(
          Math.cos(angle) * radius,
          (sampleCanopy(index, 3) - 0.5) * 2.55,
          Math.sin(angle) * radius,
        ),
      ),
    scale: new Vector3(
      0.14 + (index % 7) * 0.083,
      0.13 + (index % 8) * 0.052,
      0.16 + (index % 6) * 0.09,
    ),
    color: new Color(
      BLOSSOM_COLORS[Math.floor(index / 3) % BLOSSOM_COLORS.length],
    ),
  }
})

function StonePlaza() {
  return (
    <>
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[39, 0.2, 28]} />
        <meshStandardMaterial color="#30293c" roughness={1} />
      </mesh>
      <instancedMesh
        args={[undefined, undefined, TILE_INSTANCES.length]}
        ref={(mesh) => {
          if (!mesh) return
          const matrix = new Matrix4()
          TILE_INSTANCES.forEach(
            ({ position, rotation, scale, color }, index) => {
              matrix
                .makeRotationY(rotation)
                .scale(new Vector3(scale, 1, scale))
                .setPosition(position)
              mesh.setMatrixAt(index, matrix)
              mesh.setColorAt(index, color)
            },
          )
          mesh.instanceMatrix.needsUpdate = true
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
          mesh.computeBoundingSphere()
        }}
      >
        <boxGeometry args={[1.16, 0.14, 1.11]} />
        <meshStandardMaterial roughness={0.94} />
      </instancedMesh>
    </>
  )
}

function CherryTree() {
  return (
    <group>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[2.2, 2.35, 0.28, 12]} />
        <meshStandardMaterial color="#635568" />
      </mesh>
      <mesh position={[0, 2.36, 0]} rotation-z={-0.08}>
        <cylinderGeometry args={[0.32, 0.65, 4.3, 9]} />
        <meshStandardMaterial color="#51313f" roughness={1} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <group key={index} rotation-y={(index * Math.PI) / 4}>
          <mesh position={[0.65, 0.43, 0]} rotation-z={1.14}>
            <cylinderGeometry args={[0.24, 0.045, 1.75, 7]} />
            <meshStandardMaterial color="#5b3946" roughness={1} />
          </mesh>
        </group>
      ))}
      {BRANCHES.map(({ start, end }, index) => {
        const direction = end.clone().sub(start)
        return (
          <mesh
            key={index}
            position={start.clone().lerp(end, 0.5)}
            quaternion={new Quaternion().setFromUnitVectors(
              UP,
              direction.clone().normalize(),
            )}
          >
            <cylinderGeometry args={[0.065, 0.22, direction.length(), 7]} />
            <meshStandardMaterial color="#583441" roughness={1} />
          </mesh>
        )
      })}
      {BRANCHES.map(({ end }, index) => {
        const position = end.clone().multiply(new Vector3(0.77, 1, 0.77))
        position.y -= 1.55 + (index % 3) * 0.18
        return (
          <group key={index} position={position}>
            <mesh position-y={0.55}>
              <cylinderGeometry args={[0.012, 0.012, 1.1, 4]} />
              <meshStandardMaterial color="#876258" />
            </mesh>
            <Lantern scale={0.64} />
          </group>
        )
      })}
      <instancedMesh
        args={[undefined, undefined, BLOSSOM_INSTANCES.length]}
        ref={(mesh) => {
          if (!mesh) return
          const matrix = new Matrix4()
          BLOSSOM_INSTANCES.forEach(({ position, scale, color }, index) => {
            mesh.setMatrixAt(
              index,
              matrix.makeScale(scale.x, scale.y, scale.z).setPosition(position),
            )
            mesh.setColorAt(index, color)
          })
          mesh.instanceMatrix.needsUpdate = true
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
          mesh.computeBoundingSphere()
        }}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#fff1ff"
          emissive="#4e1439"
          emissiveIntensity={0.46}
          roughness={0.85}
        />
      </instancedMesh>
    </group>
  )
}

function Lantern({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.32, 0.24, 0.54, 8]} />
        <meshStandardMaterial
          color="#ffca7b"
          emissive="#ff741b"
          emissiveIntensity={1.25}
        />
      </mesh>
      <mesh position-y={-0.26}>
        <torusGeometry args={[0.237, 0.024, 5, 10]} />
        <meshStandardMaterial color="#793831" />
      </mesh>
    </group>
  )
}

const ROOF_SEGMENTS = 24

function pavilionRoof() {
  const positions: number[] = []
  const indices: number[] = []
  for (let row = 0; row <= 8; row++) {
    const slope = (row - 4) / 4
    for (let column = 0; column <= ROOF_SEGMENTS; column++) {
      const along = (column * 2) / ROOF_SEGMENTS - 1
      const edge = Math.abs(slope)
      const lift = Math.abs(along) ** 5 * 0.28
      positions.push(
        along * (3.46 + edge * 0.56),
        (1 - edge) ** 1.7 * 1.16 + lift,
        slope * 2.48,
      )
      if (row > 0 && column > 0) {
        const current = row * (ROOF_SEGMENTS + 1) + column
        const above = current - ROOF_SEGMENTS - 1
        indices.push(above - 1, current - 1, current, above - 1, current, above)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const PAVILION_ROOF = pavilionRoof()

function Pavilion({
  position,
  angle,
}: {
  position: [number, number, number]
  angle: number
}) {
  return (
    <group position={position} rotation-y={angle}>
      <mesh position-y={0.18}>
        <boxGeometry args={[6.8, 0.36, 4.4]} />
        <meshStandardMaterial color="#7f6c7d" />
      </mesh>
      {[-2.65, 0, 2.65].map((x) => (
        <group key={x} position-x={x}>
          {[-1.62, 1.62].map((z) => (
            <mesh key={z} position={[0, 1.72, z]}>
              <cylinderGeometry args={[0.13, 0.16, 2.75, 8]} />
              <meshStandardMaterial color="#692e3e" />
            </mesh>
          ))}
        </group>
      ))}
      {[-2.2, 2.2].map((x) => (
        <group key={x} position={[x, 2.61, 1.57]}>
          <Lantern scale={0.7} />
        </group>
      ))}
      <mesh position-y={3.05}>
        <boxGeometry args={[6.5, 0.36, 3.8]} />
        <meshStandardMaterial color="#28635c" />
      </mesh>
      <mesh geometry={PAVILION_ROOF} position-y={3.18}>
        <meshStandardMaterial color="#302b46" roughness={0.95} side={2} />
      </mesh>
      <mesh position-y={4.38} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 7.05, 7]} />
        <meshStandardMaterial color="#514361" />
      </mesh>
      {[-1.61, 1.61].map((z) => (
        <group key={z} position-z={z}>
          {[-1.34, 1.34].map((x) => (
            <group key={x} position={[x, 1.84, 0]}>
              <mesh>
                <boxGeometry args={[1.82, 1.14, 0.08]} />
                <meshStandardMaterial
                  color="#ffbd73"
                  emissive="#c15b25"
                  emissiveIntensity={0.85}
                />
              </mesh>
              {[-0.61, 0, 0.61].map((bar) => (
                <mesh key={bar} position-x={bar}>
                  <boxGeometry args={[0.065, 1.23, 0.13]} />
                  <meshStandardMaterial color="#58303b" />
                </mesh>
              ))}
              <mesh>
                <boxGeometry args={[1.91, 0.075, 0.13]} />
                <meshStandardMaterial color="#58303b" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 3.16, side * 2.63]}>
          <boxGeometry args={[8.15, 0.13, 0.18]} />
          <meshStandardMaterial color="#39534f" />
        </mesh>
      ))}
    </group>
  )
}

function RisingLantern({
  onComplete,
  offset = 0,
}: {
  onComplete: () => void
  offset?: number
}) {
  const group = useRef<Group>(null)
  const elapsed = useRef(0)

  useFrame((_state, delta) => {
    if (!group.current || elapsed.current >= 2) return
    elapsed.current = Math.min(2, elapsed.current + delta)
    const progress = elapsed.current / 2
    group.current.position.set(
      WISH_ZONE_X + offset + Math.sin(progress * Math.PI) * 0.6,
      1.15 + progress * 7.8,
      ZONE_DEPTH - progress * 2.5,
    )
    group.current.rotation.z = Math.sin(progress * Math.PI * 2) * 0.12
    if (elapsed.current === 2) onComplete()
  })

  return (
    <group ref={group} position={[WISH_ZONE_X + offset, 1.15, ZONE_DEPTH]}>
      <Lantern scale={1.36} />
      {offset === 0 && (
        <pointLight color="#ff9a43" intensity={11} distance={5} />
      )}
    </group>
  )
}

const PLAZA_CAMERA = {
  position: [0, 5.65, 22] as [number, number, number],
  fov: 56,
  near: 0.1,
  far: 130,
}
const CAMERA_TARGET: [number, number, number] = [0, 3.85, 0]

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
  world,
  onOpenZone,
  onCameraBearing,
}: {
  launchId: number | null
  onComplete: () => void
  onOpenZone: (zone: PlazaZone) => void
  onCameraBearing: (bearing: number) => void
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
      <fog attach="fog" args={['#35214d', 25, 78]} />
      <ambientLight intensity={0.85} color="#e4c0ff" />
      <directionalLight
        position={[-5, 11, 5]}
        intensity={1.65}
        color="#ffb8e4"
      />
      <pointLight
        position={[1, 3.2, 3]}
        intensity={42}
        distance={12}
        color="#ffa55d"
      />
      <Stars radius={52} depth={15} count={720} factor={2.6} saturation={0.3} />
      <mesh position={[6.2, 13.2, -18]}>
        <sphereGeometry args={[1.04, 24, 16]} />
        <meshBasicMaterial color="#ffdfa6" toneMapped={false} />
      </mesh>
      <StonePlaza />
      <CherryPetals />
      <PlazaVisitors
        players={world.players}
        ownId={world.id}
        onMove={world.move}
      />
      <CherryTree />
      <PlazaZones onOpen={onOpenZone} wishDisabled={launchId !== null} />
      <Pavilion position={[-8.7, 0, -6.8]} angle={0.37} />
      <Pavilion position={[8.4, 0, -8]} angle={-0.42} />
      <group position={[13, 0, -12]} scale={0.76}>
        <Pavilion position={[0, 0, 0]} angle={-0.33} />
      </group>
      <group position={[-13, 0, -11]} scale={0.78}>
        <Pavilion position={[0, 0, 0]} angle={0.28} />
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.4, 0, 4.7]}>
          <mesh position-y={0.58}>
            <cylinderGeometry args={[0.13, 0.27, 1.15, 6]} />
            <meshStandardMaterial color="#50424f" />
          </mesh>
          <group position-y={1.35}>
            <Lantern scale={0.9} />
            <pointLight color="#ff9a43" intensity={14} distance={5} />
          </group>
        </group>
      ))}
      {SKY_LANTERNS.map(({ x, y, z }, index) => (
        <group
          key={index}
          position={[x, y, z]}
          rotation-z={((index % 3) - 1) * 0.15}
        >
          <Lantern scale={0.55 + (index % 5) * 0.16} />
        </group>
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
        onChange={(event) => {
          if (event) onCameraBearing(event.target.getAzimuthalAngle())
        }}
        enableDamping
        enablePan={false}
        minDistance={10}
        maxDistance={33}
        maxPolarAngle={Math.PI / 2 - 0.09}
      />
    </Canvas>
  )
}
