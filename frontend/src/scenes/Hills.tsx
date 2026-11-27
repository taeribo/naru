import { useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Matrix4,
  PlaneGeometry,
  Vector3,
} from 'three'
import type { InstancedMesh } from 'three'

// 신사 뒤로 겹겹이 이어지는 숲 언덕.
const LAYERS = [
  { z: -78, depth: 56, height: 13, seed: 1 },
  { z: -125, depth: 70, height: 20, seed: 2 },
  { z: -185, depth: 90, height: 20, seed: 3 },
  { z: -265, depth: 110, height: 29, seed: 4 },
  { z: -370, depth: 140, height: 42, seed: 5 },
]
const WIDTH = 900
// 밤 숲 색: 짙은 초록 계열(계절감이 섞이지 않게 단풍색은 쓰지 않는다).
const FOREST = [
  '#1d3a2a',
  '#234634',
  '#2a4a30',
  '#33503a',
  '#1a3326',
  '#2b4a3a',
]
const HAZE = new Color('#676980')

function ridge(x: number, seed: number) {
  return (
    0.63 +
    0.22 * Math.sin(x * 0.013 + seed) +
    0.1 * Math.sin(x * 0.039 + seed * 2.3) +
    0.045 * Math.sin(x * 0.099 + Math.sin(x * 0.021) + seed) +
    0.024 * Math.cos(x * 0.21 + seed * 3.1)
  )
}

function layerHeight(layer: (typeof LAYERS)[number], x: number, z: number) {
  const local = z - layer.z
  if (Math.abs(local) >= layer.depth / 2) return 0
  const bump = Math.cos((local / (layer.depth / 2)) * (Math.PI / 2))
  return layer.height * ridge(x, layer.seed) * Math.pow(bump, 1.4)
}

function createLayerGeometry(layer: (typeof LAYERS)[number], index: number) {
  const geometry = new PlaneGeometry(WIDTH, layer.depth, 240, 16)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  const color = new Color()
  let state = layer.seed * 9973
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
  const haze = 0.19 + index * 0.12
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const x = positions.getX(vertex)
    const local = positions.getZ(vertex)
    const y = layerHeight(layer, x, local + layer.z)
    positions.setY(vertex, y)
    const noise =
      0.5 +
      0.5 * Math.sin(x * 0.09 + layer.seed) * Math.sin(local * 0.11 + x * 0.03)
    const pick = Math.min(
      FOREST.length - 1,
      Math.max(0, Math.floor((noise + (random() - 0.5) * 0.7) * FOREST.length)),
    )
    color.set(FOREST[pick])
    color.multiplyScalar(0.55 + 0.45 * Math.min(1, y / (layer.height * 0.5)))
    color.lerp(HAZE, haze)
    colors.set([color.r, color.g, color.b], vertex * 3)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

const PINE_FORMS = [
  { height: 1.0, spread: 0.26, lean: 0.075, branches: 13 },
  { height: 0.86, spread: 0.35, lean: -0.11, branches: 12 },
  { height: 1.14, spread: 0.23, lean: 0.039, branches: 15 },
]

function createDistantPine(form: (typeof PINE_FORMS)[number], variant: number) {
  const positions: number[] = []
  const colors: number[] = []
  const evergreen = new Color('#344a43')
  const newGrowth = new Color('#617268')
  const frost = new Color('#b2bdc9')
  const bark = new Color('#534b46')
  const color = new Color()

  function triangle(a: Vector3, b: Vector3, c: Vector3, tint: Color) {
    for (const point of [a, b, c]) {
      positions.push(point.x, point.y, point.z)
      colors.push(tint.r, tint.g, tint.b)
    }
  }

  function stem(from: Vector3, to: Vector3, width: number) {
    for (const side of [new Vector3(width, 0, 0), new Vector3(0, 0, width)]) {
      triangle(from.clone().add(side), to, from.clone().sub(side), bark)
    }
  }

  const trunkTop = new Vector3(form.lean, form.height, variant * 0.018)
  stem(new Vector3(), trunkTop, 0.022)
  for (let index = 0; index < form.branches; index += 1) {
    const height = 0.24 + 0.73 * (index / (form.branches - 1))
    const angle = index * 2.39996 + variant * 0.78
    const reach =
      form.spread * (1 - height * 0.77) * (0.85 + 0.27 * Math.sin(index * 1.95))
    const base = trunkTop.clone().multiplyScalar(height)
    const end = base
      .clone()
      .add(
        new Vector3(
          Math.cos(angle) * reach,
          -0.037 + Math.cos(index * 0.81) * 0.042,
          Math.sin(angle) * reach,
        ),
      )
    stem(base, end, 0.011 * (1 - height * 0.68))
    for (let tuft = 0; tuft < 5; tuft += 1) {
      const bearing =
        angle + (tuft % 2 ? -0.55 : 0.56) + Math.sin(index * 3 + tuft) * 0.28
      const mid = base.clone().lerp(end, 0.39 + tuft * 0.146)
      const size = reach * (0.41 + 0.14 * Math.sin(index + tuft * 1.2)) + 0.024
      mid.y += 0.021 + 0.012 * Math.sin(tuft)
      const axis = new Vector3(
        Math.cos(bearing) * size,
        0.024,
        Math.sin(bearing) * size,
      )
      const cross = new Vector3(-axis.z * 0.43, 0, axis.x * 0.43)
      const tip = mid.clone().add(axis)
      const ridge = mid.clone().addScaledVector(axis, 0.39)
      ridge.y += 0.029 + tuft * 0.003
      const left = mid.clone().add(cross)
      const right = mid.clone().sub(cross)
      color.copy(evergreen).lerp(newGrowth, 0.22 + 0.13 * (tuft % 4))
      triangle(mid, left, ridge, color)
      triangle(mid, ridge, right, color)
      triangle(right, ridge, tip, color)
      if ((index * 5 + tuft * 3 + variant) % 9 < 4) color.lerp(frost, 0.58)
      triangle(left, tip, ridge, color)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(positions), 3),
  )
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(colors), 3),
  )
  geometry.computeVertexNormals()
  return geometry
}

const FOREST_BATCHES = [
  { layer: LAYERS[0], width: 240, rows: 9, step: 5.4, scale: 8.1 },
  { layer: LAYERS[1], width: 340, rows: 8, step: 7.3, scale: 7.6 },
  { layer: LAYERS[2], width: 430, rows: 5, step: 10.8, scale: 6.9 },
]

function createForest() {
  let seed = 71429
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const scale = new Vector3()
  const forest = PINE_FORMS.map((): Matrix4[] => [])
  for (const batch of FOREST_BATCHES) {
    for (let row = 0; row < batch.rows; row++) {
      for (let column = 0; column < batch.width / batch.step; column++) {
        const x = -batch.width / 2 + (column + random()) * batch.step
        const zOffset =
          (row / (batch.rows - 1) - 0.5) * batch.layer.depth * 0.77
        const z = batch.layer.z + zOffset + (random() - 0.5) * batch.step
        const density = Math.sin(x * 0.055 + row * 0.64) * 0.16
        if (random() < 0.2 + density) continue
        const height = batch.scale * (0.58 + random() * 0.78)
        const width = height * (0.73 + random() * 0.52)
        const elevation = layerHeight(batch.layer, x, z)
        forest[(row * 2 + column) % PINE_FORMS.length].push(
          new Matrix4()
            .makeRotationY(random() * Math.PI * 2)
            .scale(scale.set(width, height, width))
            .setPosition(x, Math.max(0, elevation - 0.17), z),
        )
      }
    }
  }
  return forest
}

export function Hills() {
  const geometries = useMemo(
    () => LAYERS.map((layer, index) => createLayerGeometry(layer, index)),
    [],
  )
  const trees = useMemo(createForest, [])
  const pines = useMemo(() => PINE_FORMS.map(createDistantPine), [])

  function placeForest(mesh: InstancedMesh | null, trees: Matrix4[]) {
    if (!mesh) return
    trees.forEach((tree, index) => mesh.setMatrixAt(index, tree))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }

  return (
    <group>
      {LAYERS.map((layer, index) => (
        <mesh key={layer.z} geometry={geometries[index]} position-z={layer.z}>
          <meshStandardMaterial vertexColors roughness={1} />
        </mesh>
      ))}
      {pines.map((pine, index) => (
        <instancedMesh
          key={pine.uuid}
          name="distant-winter-forest"
          args={[pine, undefined, trees[index].length]}
          ref={(mesh) => placeForest(mesh, trees[index])}
        >
          <meshStandardMaterial vertexColors roughness={1} side={DoubleSide} />
        </instancedMesh>
      ))}
    </group>
  )
}
