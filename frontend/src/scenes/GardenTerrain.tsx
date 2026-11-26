import { pineSnow, propSnow, snowProgramKey } from './snow'
import { useMemo } from 'react'
import {
  BufferAttribute,
  CircleGeometry,
  Color,
  DoubleSide,
  Matrix4,
  PlaneGeometry,
  Vector3,
} from 'three'
import type { InstancedMesh } from 'three'
import { GardenPines } from './GardenPines'
import type { PinePlacement } from './GardenPines'
import { WORLD_BOUNDS, ZONES } from './terrain'
import { createShrubGeometry } from './shrubGeometry'
import { getGravelTexture } from './textures'

const { minX, maxX, minZ, maxZ } = WORLD_BOUNDS

// The walkable floor stays level. Hills rise only outside the play area.
function elevation(x: number, z: number) {
  const beyond = Math.max(minX - x, x - maxX, minZ - z, z - maxZ, 0)
  const rise = Math.min(beyond / 18, 1)
  const wave = Math.sin(x * 0.064 + Math.cos(z * 0.047) * 1.7)
  return -0.045 + rise * rise * (1.8 + wave * 0.77 + Math.sin(z * 0.08) * 0.5)
}

function terrainGeometry() {
  const geometry = new PlaneGeometry(292, 252, 112, 102)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, 0, -6)
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const trail = new Color('#9b8574')
  const earth = new Color('#665c50')
  const moss = new Color('#58654e')
  const color = new Color()
  const frost = new Color('#aeb9c3')
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index)
    const z = positions.getZ(index)
    const texture =
      0.5 + 0.5 * Math.sin(x * 0.32 + Math.sin(z * 0.1)) * Math.cos(z * 0.27)
    positions.setY(index, elevation(x, z))
    color.copy(earth).lerp(moss, texture * 0.72)
    const apron =
      Math.max(0, 1 - Math.abs(x) / 11) * Math.max(0, 1 - Math.abs(z - 53) / 36)
    color.lerp(trail, apron * 0.47)
    const shoulder = Math.min(1, Math.max(0, (Math.abs(x) - 8) / 7))
    const patch = Math.max(
      0,
      0.6 * Math.sin(x * 0.27 + z * 0.14) + 0.4 * Math.cos(z * 0.43 - x * 0.28),
    )
    color.lerp(frost, shoulder * patch * 0.63)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

const GARDEN_TREE_GROUPS: [number, number, number][] = [
  [-15, 34, 0.76],
  [15.8, 32, 0.71],
  [-16.5, 41, 0.67],
  [17, 39, 0.82],
  [-17, 19, 0.76],
  [16.8, 19, 0.64],
  [ZONES.fortune[0] - 7, ZONES.fortune[1] + 3, 0.94],
  [ZONES.wish[0] - 7, ZONES.wish[1] - 2.5, 0.86],
  [ZONES.bell[0] + 6, ZONES.bell[1] + 1.5, 0.79],
  [ZONES.rest[0] + 5.5, ZONES.rest[1] - 5, 1.09],
]

// Keep the new groves on the outer edges, clear of the courtyard and entrance.
const BACKGROUND_GROVES: [number, number, number][] = [
  [-55.4, 42.1, 1.17],
  [-62.8, 35.0, 1.42],
  [-56.2, 25.5, 1.15],
  [-64.9, 16.6, 1.27],
  [-58.2, 6.8, 1.21],
  [-64.5, -9.9, 1.45],
  [56.4, 43.7, 1.21],
  [63.0, 36.7, 1.47],
  [56.6, 28.3, 1.08],
  [62.4, 16.0, 1.32],
  [56.9, 6.6, 1.13],
  [64.6, -8.8, 1.39],
  [-58.4, -25.0, 1.21],
  [-64.4, -35.8, 1.38],
  [-54.5, -47.6, 1.13],
  [-58.5, -57.7, 1.18],
  [-52.0, -65.8, 1.56],
  [-43.8, -69.2, 1.35],
  [58.8, -24.8, 1.18],
  [65.4, -34.7, 1.31],
  [56.4, -46.8, 1.12],
  [61.2, -55.6, 1.41],
  [51.4, -65.5, 1.24],
  [44.8, -68.2, 1.5],
  [-38.5, -72.1, 1.51],
  [-29.9, -74.5, 1.28],
  [-20.6, -70.3, 1.32],
  [21.8, -72.6, 1.52],
  [29.6, -75.2, 1.12],
  [38.8, -72.3, 1.46],
]

const TREES = [
  ...GARDEN_TREE_GROUPS,
  ...BACKGROUND_GROVES,
  ...[-1, 1].flatMap((side) =>
    Array.from({ length: 20 }, (_, index): [number, number, number] => [
      side * (46 + (index % 4) * 7.5 + Math.sin(index * 1.8) * 2.6),
      -41 + index * 5.2,
      0.82 + (index % 6) * 0.15,
    ]),
  ),
]

const UNDERGROWTH = GARDEN_TREE_GROUPS.flatMap(([x, z, s], index) =>
  Array.from({ length: 5 }, (_, group) => {
    const angle = group * 2.4 + index
    const distance = 1.4 + (group % 3) * 0.51
    return [
      x + Math.cos(angle) * distance,
      z + Math.sin(angle) * distance,
      s * (0.72 + group * 0.1),
    ]
  }),
)

type PlantInstance = {
  position: [number, number, number]
  scale: [number, number, number]
  yaw: number
  color: Color
}

const SHRUBS = ['#eef4d7', '#fff4d9', '#d8e8cb'].map((tone) => new Color(tone))
const ROCK = new Color('#817e7c')
const BEDS = ['#554e47', '#4f5b49', '#60584b'].map((tone) => new Color(tone))

const pines = TREES.map(
  ([x, z, scale]): PinePlacement => [[x, elevation(x, z), z], scale],
)

const beds = GARDEN_TREE_GROUPS.map(
  ([x, z, scale], index): PlantInstance => ({
    position: [x, 0.064, z],
    scale: [scale * 3.5, 1, scale * 2.35],
    yaw: 1.33 + index * 0.7,
    color: BEDS[index % BEDS.length],
  }),
)

const shrubs = UNDERGROWTH.map(
  ([x, z, scale], index): PlantInstance => ({
    position: [x, elevation(x, z) + 0.26, z],
    scale: [scale * 0.94, scale * 0.56, scale * 0.76],
    yaw: index * 2.4,
    color: SHRUBS[index % SHRUBS.length],
  }),
)

const rocks = GARDEN_TREE_GROUPS.flatMap(([x, z, scale], index) =>
  [-1, 1].map((side): PlantInstance => {
    const stoneX = x + side * 2.2
    const stoneZ = z + 0.95
    return {
      position: [stoneX, elevation(stoneX, stoneZ) + 0.2, stoneZ],
      scale: [scale * 0.82, scale * 0.46, scale * 0.7],
      yaw: side * index * 2.4,
      color: ROCK,
    }
  }),
)

function setup(mesh: InstancedMesh | null, items: PlantInstance[]) {
  if (!mesh) return
  const matrix = new Matrix4()
  const scale = new Vector3()
  items.forEach((item, index) => {
    matrix
      .makeRotationY(item.yaw)
      .scale(scale.fromArray(item.scale))
      .setPosition(...item.position)
    mesh.setMatrixAt(index, matrix)
    mesh.setColorAt(index, item.color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

export function GardenTerrain() {
  const geometry = useMemo(terrainGeometry, [])
  const shrubGeometry = useMemo(createShrubGeometry, [])
  const bedGeometry = useMemo(() => {
    const geometry = new CircleGeometry(1, 19).rotateX(-Math.PI / 2)
    const points = geometry.attributes.position
    for (let index = 1; index < points.count; index++) {
      const wobble = 1 + 0.1 * Math.sin(((index - 1) * Math.PI * 6) / 19)
      points.setXYZ(
        index,
        points.getX(index) * wobble,
        0,
        points.getZ(index) * wobble,
      )
    }
    return geometry
  }, [])
  const soil = useMemo(() => {
    const texture = getGravelTexture().clone()
    texture.repeat.set(52, 44)
    texture.needsUpdate = true
    return texture
  }, [])

  return (
    <group name="landscape-beyond-the-courtyard">
      <mesh geometry={geometry}>
        <meshStandardMaterial map={soil} vertexColors roughness={1} />
      </mesh>
      <instancedMesh
        args={[bedGeometry, undefined, beds.length]}
        ref={(mesh) => setup(mesh, beds)}
      >
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <GardenPines placements={pines} />
      <instancedMesh
        args={[shrubGeometry, undefined, shrubs.length]}
        ref={(mesh) => setup(mesh, shrubs)}
      >
        <meshStandardMaterial
          vertexColors
          side={DoubleSide}
          roughness={0.87}
          onBeforeCompile={pineSnow}
          customProgramCacheKey={snowProgramKey}
        />
      </instancedMesh>
      <instancedMesh
        args={[undefined, undefined, rocks.length]}
        ref={(mesh) => setup(mesh, rocks)}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          roughness={0.96}
          onBeforeCompile={propSnow}
          customProgramCacheKey={snowProgramKey}
        />
      </instancedMesh>
    </group>
  )
}
