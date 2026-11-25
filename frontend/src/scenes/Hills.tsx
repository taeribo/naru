import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'

// 연못 뒤로 겹겹이 이어지는 숲 언덕: 멀수록 높고 안개가 낀 듯 흐려진다.
const LAYERS = [
  { z: -78, depth: 56, height: 7, seed: 1 },
  { z: -125, depth: 70, height: 13, seed: 2 },
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
const HAZE = new Color('#4a3a78')

function ridge(x: number, seed: number) {
  return (
    0.62 +
    0.25 * Math.sin(x * 0.013 + seed) +
    0.13 * Math.sin(x * 0.041 + seed * 2.3)
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
  const haze = 0.16 + index * 0.13
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

export function Hills() {
  const geometries = useMemo(
    () => LAYERS.map((layer, index) => createLayerGeometry(layer, index)),
    [],
  )
  return (
    <group>
      {LAYERS.map((layer, index) => (
        <mesh key={layer.z} geometry={geometries[index]} position-z={layer.z}>
          <meshStandardMaterial vertexColors roughness={1} />
        </mesh>
      ))}
    </group>
  )
}
