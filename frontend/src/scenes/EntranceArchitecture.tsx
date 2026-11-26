import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import {
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector3,
} from 'three'
import type { BufferGeometry } from 'three'
import { createSnowCap, snowMaterial } from './snow'
import { SnowCap } from './SnowCap'
import { projectSurfaceUvs, useSurface } from './surfaces'
import { LANDING_HEIGHT, STAIRS, TORII_Z } from './terrain'

type Model =
  | 'torii'
  | 'shrine-hall'
  | 'tea-house'
  | 'stone-lantern'
  | 'mossy-boulders'
type Position = [number, number, number]

export function Architecture({
  model,
  position,
  scale = 1,
  yaw = 0,
}: {
  model: Model
  position: Position
  scale?: number
  yaw?: number
}) {
  const { scene } = useGLTF(`/models/shrine-preview/${model}.glb`)
  const wood = useSurface('wood')
  const stone = useSurface('stone')
  const roof = useSurface('roof')
  const object = useMemo(() => {
    const copy = scene.clone()
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>()
    const geometries = new Map<BufferGeometry, BufferGeometry>()
    const caps: { source: Mesh; cap: Mesh }[] = []
    copy.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const convert = (original: MeshStandardMaterial) => {
        const cached = materials.get(original)
        if (cached) return cached
        const material = original.clone()
        const surface =
          original.name === 'stone'
            ? stone
            : original.name === 'tile'
              ? roof
              : wood
        if (
          ['stone', 'tile', 'wood', 'timber', 'vermilion'].includes(
            original.name,
          )
        ) {
          if (original.name !== 'vermilion') {
            material.map = surface.map
            material.color.lerp(new Color('#e7d8c8'), 0.52)
          }
          material.normalMap = surface.normalMap
          material.roughnessMap = surface.roughnessMap
          material.normalScale.setScalar(
            original.name === 'vermilion' ? 0.24 : 0.5,
          )
          material.roughness = 0.94
        }
        if (original.name === 'vermilion') material.color.set('#aa422c')
        if (original.name === 'plaster') material.color.set('#b5a58c')
        if (original.name === 'paper') {
          material.color.set('#e1bc88')
          material.emissive.set('#ff9d40')
          material.emissiveIntensity = model === 'stone-lantern' ? 1.15 : 0.47
        }
        materials.set(original, material)
        return material
      }
      if (!child.geometry.hasAttribute('uv')) {
        const source = child.geometry
        let geometry = geometries.get(source)
        if (!geometry) {
          geometry = projectSurfaceUvs(source.clone())
          geometries.set(source, geometry)
        }
        child.geometry = geometry
      }
      const original = Array.isArray(child.material)
        ? child.material[0]
        : child.material
      const top = model === 'torii' && original.name === 'timber'
      const roofOrStone =
        original.name === 'tile' ||
        (model === 'mossy-boulders' && original.name === 'concrete') ||
        (model === 'stone-lantern' && original.name === 'stone')
      if (top || roofOrStone) {
        child.geometry.computeBoundingBox()
        const bounds = child.geometry.boundingBox!
        const range = bounds.max.y - bounds.min.y
        const capGeometry = createSnowCap(
          child.geometry,
          model === 'mossy-boulders' ? 0.12 : 0.1,
          roofOrStone && original.name === 'tile'
            ? -Infinity
            : bounds.min.y + range * (top ? 0.61 : 0.42),
        )
        if (capGeometry.attributes.position.count) {
          const cap = new Mesh(capGeometry, snowMaterial)
          cap.receiveShadow = true
          caps.push({ source: child, cap })
        } else capGeometry.dispose()
      }
      child.material = Array.isArray(child.material)
        ? child.material.map(convert)
        : convert(child.material)
      child.castShadow = model !== 'stone-lantern'
      child.receiveShadow = true
    })
    for (const { source, cap } of caps) source.add(cap)
    return { copy, materials, geometries, caps }
  }, [model, roof, scene, stone, wood])

  useEffect(
    () => () => {
      object.materials.forEach((material) => material.dispose())
      object.geometries.forEach((geometry) => geometry.dispose())
      object.caps.forEach(({ cap }) => cap.geometry.dispose())
    },
    [object],
  )
  return (
    <primitive
      object={object.copy}
      position={position}
      scale={scale}
      rotation-y={yaw}
    />
  )
}

const GATE_ROPE = new CatmullRomCurve3([
  new Vector3(-4.08, 6.35, 0.6),
  new Vector3(-2.25, 5.45, 0.7),
  new Vector3(0, 5.13, 0.77),
  new Vector3(2.25, 5.43, 0.7),
  new Vector3(4.08, 6.35, 0.6),
])

const SHIDE = new Shape()
SHIDE.moveTo(-0.11, 0)
SHIDE.lineTo(0.15, 0)
SHIDE.lineTo(0.01, -0.2)
SHIDE.lineTo(0.17, -0.29)
SHIDE.lineTo(-0.11, -0.66)
SHIDE.lineTo(-0.21, -0.5)
SHIDE.lineTo(-0.03, -0.32)
SHIDE.lineTo(-0.18, -0.22)
SHIDE.closePath()

function GateRope() {
  const timber = useSurface('wood')
  return (
    <group position={[0, LANDING_HEIGHT, TORII_Z]}>
      <mesh position-y={6.68} castShadow>
        <boxGeometry args={[10.6, 0.47, 0.5]} />
        <meshStandardMaterial
          normalMap={timber.normalMap}
          roughnessMap={timber.roughnessMap}
          color="#9e3f30"
          roughness={0.92}
        />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[GATE_ROPE, 44, 0.115, 7, false]} />
        <meshStandardMaterial color="#c6a16c" roughness={0.94} />
      </mesh>
      {[0.24, 0.37, 0.5, 0.63, 0.76].map((offset, index) => (
        <mesh
          key={offset}
          position={GATE_ROPE.getPointAt(offset)}
          rotation-y={(index - 2) * 0.11}
        >
          <shapeGeometry args={[SHIDE]} />
          <meshStandardMaterial
            color="#fff2d8"
            side={DoubleSide}
            roughness={0.96}
          />
        </mesh>
      ))}
    </group>
  )
}

function Kadomatsu({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.31} castShadow>
        <cylinderGeometry args={[0.39, 0.47, 0.62, 12]} />
        <meshStandardMaterial color="#9b7250" roughness={1} />
      </mesh>
      {[0.22, 0.48].map((height) => (
        <mesh key={height} position-y={height} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.413, 0.038, 5, 18]} />
          <meshStandardMaterial color="#d4b585" roughness={1} />
        </mesh>
      ))}
      {[
        [-0.21, 1.05],
        [0.02, 1.54],
        [0.22, 1.18],
      ].map(([offset, height]) => (
        <group
          key={offset}
          position={[offset, 0.45, -Math.abs(offset)]}
          rotation-z={offset * -0.38}
        >
          <mesh position-y={height / 2} castShadow>
            <cylinderGeometry args={[0.092, 0.114, height, 9]} />
            <meshStandardMaterial color="#708351" roughness={0.78} />
          </mesh>
          <mesh position-y={height + 0.004} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.086, 9]} />
            <meshStandardMaterial color="#f1cf96" roughness={0.91} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function FestivalLantern({ position }: { position: Position }) {
  const wood = useSurface('wood')
  const lanternRoof = useMemo(() => new ConeGeometry(0.46, 0.35, 4), [])
  return (
    <group position={position}>
      <mesh position-y={1.14} castShadow>
        <boxGeometry args={[0.13, 2.28, 0.13]} />
        <meshStandardMaterial {...wood} color="#97705a" roughness={0.91} />
      </mesh>
      <mesh position-y={2.48} castShadow>
        <boxGeometry args={[0.48, 0.61, 0.47]} />
        <meshStandardMaterial
          color="#ffe2a0"
          emissive="#ff9f48"
          emissiveIntensity={1.55}
          roughness={1}
        />
      </mesh>
      <mesh
        geometry={lanternRoof}
        position-y={2.93}
        rotation-y={Math.PI / 4}
        castShadow
      >
        <meshStandardMaterial {...wood} color="#634232" roughness={0.9} />
        <SnowCap source={lanternRoof} thickness={0.065} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={x + ':' + z} position={[x * 0.245, 2.47, z * 0.24]}>
            <boxGeometry args={[0.04, 0.71, 0.04]} />
            <meshStandardMaterial color="#553926" roughness={0.94} />
          </mesh>
        )),
      )}
    </group>
  )
}

const WINTER_BANKS = [
  [-6.85, 31.8, 2.05, 0.62, 0.35],
  [-7.9, 29.5, 1.9, 0.85, -0.41],
  [7.2, 30.2, 2.2, 0.76, 0.34],
  [8.95, 27.35, 2.5, 0.87, -0.21],
  [-13.4, 24.7, 2.4, 0.8, -0.13],
  [13.5, 24.9, 2.5, 0.75, 0.17],
  [-11.5, 14.4, 2.1, 1.15, 0.31],
  [13.7, 12.5, 2.6, 1.12, -0.27],
]

function WinterBanks() {
  const geometry = useMemo(() => {
    const patch = new CircleGeometry(1, 28).rotateX(-Math.PI / 2)
    const points = patch.attributes.position
    for (let index = 1; index < points.count; index += 1) {
      const angle = ((index - 1) * Math.PI * 2) / 28
      const edge = 1 + 0.18 * Math.sin(angle * 3) + 0.1 * Math.cos(angle * 7)
      points.setXYZ(
        index,
        points.getX(index) * edge,
        0,
        points.getZ(index) * edge,
      )
    }
    points.setY(0, 0.13)
    patch.computeVertexNormals()
    return patch
  }, [])

  return WINTER_BANKS.map(([x, z, width, depth, yaw], index) => (
    <mesh
      key={x}
      geometry={geometry}
      position={[x, 0.063, z]}
      scale={[width, 1, depth]}
      rotation-y={yaw}
      receiveShadow
    >
      <meshStandardMaterial
        color={index % 2 ? '#d5d5d3' : '#c0c8ce'}
        roughness={1}
      />
    </mesh>
  ))
}

function PaperLantern({ position }: { position: Position }) {
  return (
    <group position={position}>
      <mesh scale={[0.76, 1, 0.76]} castShadow>
        <sphereGeometry args={[0.56, 14, 10]} />
        <meshStandardMaterial
          color="#ffc675"
          emissive="#ff922f"
          emissiveIntensity={0.95}
          roughness={0.89}
        />
      </mesh>
      {[-0.36, -0.18, 0, 0.18, 0.36].map((y) => (
        <mesh key={y} position-y={y} rotation-x={Math.PI / 2}>
          <torusGeometry
            args={[0.416 * Math.sqrt(1 - (y / 0.56) ** 2), 0.013, 4, 18]}
          />
          <meshStandardMaterial color="#9f623a" roughness={1} />
        </mesh>
      ))}
      <mesh position-y={0.61}>
        <cylinderGeometry args={[0.027, 0.027, 0.23, 6]} />
        <meshStandardMaterial color="#583724" roughness={1} />
      </mesh>
    </group>
  )
}

export function EntranceArchitecture() {
  return (
    <group>
      <Architecture
        model="torii"
        position={[0, LANDING_HEIGHT, TORII_Z]}
        scale={2.72}
      />
      <GateRope />
      <WinterBanks />
      <PaperLantern position={[-16.4, 3.2, TORII_Z + 1.9]} />
      <PaperLantern position={[-18.45, 3.2, TORII_Z + 1.3]} />
      <PaperLantern position={[16.45, 3.66, TORII_Z + 0.15]} />
      <PaperLantern position={[18.3, 3.66, TORII_Z + 1.03]} />
      <Kadomatsu x={-4.65} z={STAIRS.bottomZ + 0.25} />
      <Kadomatsu x={4.65} z={STAIRS.bottomZ + 0.25} />
      <FestivalLantern position={[-6.4, 0, 34.4]} />
      <FestivalLantern position={[6.6, 0, 33.8]} />
      <FestivalLantern position={[-11.2, 0, 17.2]} />
      <FestivalLantern position={[12.4, 0, 16.1]} />
      <FestivalLantern position={[-8.4, 0, 3.7]} />
      <FestivalLantern position={[9.8, 0, 1.15]} />
      <pointLight
        position={[-6.4, 2.25, 34.4]}
        color="#ffbc68"
        intensity={14}
        distance={6}
      />
      <pointLight
        position={[6.6, 2.25, 33.8]}
        color="#ffb56c"
        intensity={13}
        distance={6}
      />
      <Architecture
        model="tea-house"
        position={[-17.2, 0, TORII_Z - 2.4]}
        scale={1.55}
        yaw={0.39}
      />
      <Architecture
        model="shrine-hall"
        position={[17.7, 0, TORII_Z - 4.4]}
        scale={1.72}
        yaw={-0.49}
      />
      <Architecture
        model="stone-lantern"
        position={[-5.3, 0, STAIRS.bottomZ + 0.9]}
        scale={0.85}
      />
      <Architecture
        model="stone-lantern"
        position={[5.2, 0, STAIRS.bottomZ - 0.4]}
        scale={0.83}
      />
      <Architecture
        model="mossy-boulders"
        position={[-6.8, 0, STAIRS.bottomZ - 1.3]}
        scale={0.64}
      />
      <Architecture
        model="mossy-boulders"
        position={[6.9, 0, STAIRS.bottomZ - 2.5]}
        scale={0.72}
      />
      <pointLight
        position={[-5.3, 1.5, STAIRS.bottomZ + 0.9]}
        color="#ffbb6c"
        intensity={12}
        distance={6}
      />
      <pointLight
        position={[5.2, 1.45, STAIRS.bottomZ - 0.4]}
        color="#ffbb6c"
        intensity={11}
        distance={6}
      />
    </group>
  )
}
