import { OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { Color, Matrix4, Quaternion, Vector3 } from 'three'
import type { Group } from 'three'

const UP = new Vector3(0, 1, 0)
const STONE_COLORS = ['#5e5068', '#6a5971', '#51475e', '#746177']
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
    color: new Color(
      STONE_COLORS[(index * 17 + row * 23) % STONE_COLORS.length],
    ),
  }
})
const BRANCHES = Array.from({ length: 9 }, (_, index) => {
  const angle = index * 2.39996
  const radius = 2.1 + (index % 4) * 0.57
  return {
    start: new Vector3(0.14, 2.5 + (index % 4) * 0.54, 0),
    end: new Vector3(
      Math.cos(angle) * radius,
      5.3 + (index % 5) * 0.58,
      Math.sin(angle) * radius,
    ),
  }
})
const BLOSSOM_INSTANCES = Array.from({ length: 280 }, (_, index) => {
  const branch = BRANCHES[index % BRANCHES.length]
  const angle = index * 2.39996
  const radius = 0.35 + ((index * 13) % 31) * 0.058
  return {
    position: branch.end
      .clone()
      .add(
        new Vector3(
          Math.cos(angle) * radius,
          (((index * 19) % 27) - 13) * 0.097,
          Math.sin(angle) * radius,
        ),
      ),
    scale: new Vector3(
      0.34 + (index % 5) * 0.14,
      0.26 + (index % 7) * 0.08,
      0.45 + (index % 4) * 0.13,
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
          TILE_INSTANCES.forEach(({ position, color }, index) => {
            mesh.setMatrixAt(index, matrix.makeTranslation(position))
            mesh.setColorAt(index, color)
          })
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
        <icosahedronGeometry args={[1, 1]} />
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
      <mesh position-y={3.74} rotation-y={Math.PI / 4} scale={[1.55, 1, 1]}>
        <cylinderGeometry args={[0.18, 3.66, 1.34, 4]} />
        <meshStandardMaterial color="#282237" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 3.16, side * 2.63]}>
          <boxGeometry args={[8.15, 0.13, 0.18]} />
          <meshStandardMaterial color="#39534f" />
        </mesh>
      ))}
    </group>
  )
}

function RisingLantern({ onComplete }: { onComplete: () => void }) {
  const group = useRef<Group>(null)
  const elapsed = useRef(0)

  useFrame((_state, delta) => {
    if (!group.current || elapsed.current >= 2) return
    elapsed.current = Math.min(2, elapsed.current + delta)
    const progress = elapsed.current / 2
    group.current.position.set(
      3.9 + Math.sin(progress * Math.PI) * 0.6,
      1.15 + progress * 7.8,
      3.2 - progress * 2.5,
    )
    group.current.rotation.z = Math.sin(progress * Math.PI * 2) * 0.12
    if (elapsed.current === 2) onComplete()
  })

  return (
    <group ref={group} position={[3.9, 1.15, 3.2]}>
      <Lantern scale={1.36} />
      <pointLight color="#ff9a43" intensity={11} distance={5} />
    </group>
  )
}

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
}: {
  launchId: number | null
  onComplete: () => void
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
      camera={{ position: [0, 5.65, 22], fov: 56, near: 0.1, far: 130 }}
      dpr={[1, 1.5]}
      frameloop={launchId === null ? 'demand' : 'always'}
      fallback={
        <p className="world-fallback">3D 장면을 보려면 WebGL 2가 필요합니다.</p>
      }
    >
      <color attach="background" args={['#171333']} />
      <fog attach="fog" args={['#35214d', 25, 78]} />
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
      <Stars radius={52} depth={15} count={720} factor={2.6} saturation={0.3} />
      <mesh position={[6.2, 13.2, -18]}>
        <sphereGeometry args={[1.04, 24, 16]} />
        <meshBasicMaterial color="#ffdfa6" toneMapped={false} />
      </mesh>
      <StonePlaza />
      <CherryTree />
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
      <OrbitControls
        target={[0, 3.85, 0]}
        enableDamping
        enablePan={false}
        minDistance={10}
        maxDistance={33}
        maxPolarAngle={Math.PI / 2 - 0.09}
      />
    </Canvas>
  )
}
