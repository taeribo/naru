import { barkSnow, blossomSnow, snowProgramKey } from './snow'
import { useMemo } from 'react'
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { taperedTube } from './shapes'
import { getBarkTexture, getBlossomTexture } from './textures'

const GOLDEN_ANGLE = 2.39996
const MAX_DEPTH = 3
const TREE_SCALE = 1.6
const FLOWER_COUNT = 26000
const FLOWER_SIZE = 1.9
type Anchor = { point: Vector3; spread: number }

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

// 줄기·가지(수관 구조)와 꽃이 모일 자리(anchors)를 만든다.
function buildTree() {
  const random = createRandom(7)
  const limbs: BufferGeometry[] = []
  const anchors: Anchor[] = []

  const trunk = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(0.12, 1.4, 0.06),
    new Vector3(-0.12, 2.8, -0.04),
    new Vector3(0.06, 4.2, 0.05),
    new Vector3(0, 4.65, 0),
  ])
  limbs.push(taperedTube(trunk, 0.85, 0.3, 12, 1.1))

  for (let index = 0; index < 10; index += 1) {
    const angle = index * (Math.PI / 5) + random() * 0.3
    const root = new CatmullRomCurve3([
      new Vector3(Math.cos(angle) * 0.25, 1.0, Math.sin(angle) * 0.25),
      new Vector3(Math.cos(angle) * 0.75, 0.38, Math.sin(angle) * 0.75),
      new Vector3(Math.cos(angle) * 2.6, -0.02, Math.sin(angle) * 2.6),
    ])
    limbs.push(taperedTube(root, 0.42, 0.07, 7))
  }

  const grow = (
    start: Vector3,
    direction: Vector3,
    length: number,
    radius: number,
    depth: number,
  ) => {
    const steps = 4
    const points = [start.clone()]
    const heading = direction.clone().normalize()
    for (let step = 1; step <= steps; step += 1) {
      heading
        .add(
          new Vector3(
            (random() - 0.5) * 0.6,
            (random() - 0.5) * 0.4 - depth * 0.03,
            (random() - 0.5) * 0.6,
          ),
        )
        .normalize()
      points.push(
        points[step - 1].clone().addScaledVector(heading, length / steps),
      )
    }
    const curve = new CatmullRomCurve3(points)
    limbs.push(taperedTube(curve, radius, radius * 0.38, depth >= 2 ? 5 : 7))

    // 굵은 가지는 비워 두고 가는 가지 쪽에만 꽃이 모이게 한다.
    if (depth >= 2) {
      for (const t of [0.3, 0.5, 0.7, 0.9, 1]) {
        anchors.push({ point: curve.getPointAt(t), spread: 0.6 })
      }
    } else if (depth === 1) {
      for (const t of [0.7, 1]) {
        anchors.push({ point: curve.getPointAt(t), spread: 0.65 })
      }
    }
    if (depth >= MAX_DEPTH) return

    const children = depth === 0 ? 3 : 2
    for (let child = 0; child < children; child += 1) {
      const t = 0.4 + (child / children) * 0.55 + random() * 0.08
      const side = new Vector3(random() - 0.5, random() * 0.6, random() - 0.5)
      grow(
        curve.getPointAt(t),
        curve.getTangentAt(t).add(side.multiplyScalar(1.5)),
        length * (0.55 + random() * 0.15),
        radius * 0.48,
        depth + 1,
      )
    }
  }

  for (let index = 0; index < 8; index += 1) {
    const angle = index * GOLDEN_ANGLE + random() * 0.4
    grow(
      trunk.getPointAt(0.3 + (index / 8) * 0.42),
      new Vector3(Math.cos(angle), 0.24 + random() * 0.28, Math.sin(angle)),
      3.0 + random() * 0.85,
      0.21,
      0,
    )
  }
  for (const angle of [0.2, 2.2, 4.75]) {
    grow(
      trunk.getPointAt(0.77),
      new Vector3(Math.cos(angle), 0.43, Math.sin(angle)),
      2.35,
      0.14,
      0,
    )
  }

  // Offset adjoining lobes so the crown reads as a broad, irregular cloud.
  const lobes = [
    [-3.0, 4.8, 0.4, 1.85, 1.22],
    [-1.65, 5.65, -0.8, 1.95, 1.28],
    [0.25, 5.82, 0.3, 2.2, 1.34],
    [2.1, 5.55, -0.95, 1.9, 1.15],
    [3.5, 4.72, 0.05, 1.65, 1.15],
    [0.8, 4.85, 2.05, 2.15, 1.1],
    [-1.55, 4.82, -2.2, 1.9, 1.18],
  ]
  const crown = lobes.flatMap(([x, y, z, width, height]) =>
    Array.from({ length: 42 }, (_, index): Anchor => {
      const vertical = (2 * (index + 0.5)) / 42 - 1
      const circle = Math.sqrt(1 - vertical * vertical)
      const angle = index * GOLDEN_ANGLE + random() * 0.25
      const radius = 0.63 + random() * 0.37
      return {
        point: new Vector3(
          x + Math.cos(angle) * circle * width * radius,
          y + vertical * height * radius,
          z + Math.sin(angle) * circle * width * 0.86 * radius,
        ),
        spread: 0.58,
      }
    }),
  )
  return { bark: mergeGeometries(limbs), anchors, crown }
}

export function CherryTree() {
  const tree = useMemo(buildTree, [])
  const barkTexture = useMemo(getBarkTexture, [])
  const blossom = useMemo(getBlossomTexture, [])

  return (
    <group>
      <group position-y={0.44} scale={TREE_SCALE}>
        <mesh geometry={tree.bark}>
          <meshStandardMaterial
            map={barkTexture}
            onBeforeCompile={barkSnow}
            customProgramCacheKey={snowProgramKey}
            roughness={1}
            color="#c49a84"
          />
        </mesh>
        <Flowers anchors={tree.anchors} crown={tree.crown} texture={blossom} />
      </group>
      {/* 신목(神木)의 금줄과 종이 장식 */}
      <group position={[0, 2.5, 0]}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.65, 0.14, 8, 40]} />
          <meshStandardMaterial color="#d9c28a" roughness={1} />
        </mesh>
        {Array.from({ length: 10 }, (_, index) => {
          const angle = (index / 10) * Math.PI * 2
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * 1.72, -0.35, Math.sin(angle) * 1.72]}
              rotation-y={-angle}
            >
              <boxGeometry args={[0.04, 0.7, 0.28]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.4}
              />
            </mesh>
          )
        })}
      </group>
      <pointLight
        position={[0, 4, 2]}
        color="#ffd5ab"
        intensity={64}
        distance={40}
      />
    </group>
  )
}

function Flowers({
  anchors,
  crown,
  texture,
}: {
  anchors: Anchor[]
  crown: Anchor[]
  texture: ReturnType<typeof getBlossomTexture>
}) {
  return (
    <instancedMesh
      args={[undefined, undefined, FLOWER_COUNT]}
      frustumCulled={false}
      ref={(mesh) => {
        if (!mesh) return
        const random = createRandom(99)
        const matrix = new Matrix4()
        const rotation = new Euler()
        const quaternion = new Quaternion()
        const position = new Vector3()
        const scale = new Vector3()
        const color = new Color()
        const deep = new Color('#d78da6')
        const bright = new Color('#fff1dd')
        for (let index = 0; index < FLOWER_COUNT; index += 1) {
          const locations = index % 5 === 0 ? anchors : crown
          const { point, spread } = locations[index % locations.length]
          position.set(
            point.x + (random() + random() - 1) * spread * 1.5,
            point.y + (random() + random() - 1) * spread,
            point.z + (random() + random() - 1) * spread * 1.5,
          )
          rotation.set(
            random() * Math.PI * 2,
            random() * Math.PI * 2,
            random() * Math.PI * 2,
          )
          quaternion.setFromEuler(rotation)
          const size = (0.26 + random() * 0.26) * FLOWER_SIZE
          scale.set(size, size, size)
          mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale))
          // 위쪽·바깥쪽은 환하게, 아래·안쪽은 진하게 해서 입체감을 준다.
          const glow = Math.min(
            1,
            Math.max(0, (position.y - 2.5) / 6 + 0.15 + (random() - 0.5) * 0.9),
          )
          mesh.setColorAt(index, color.copy(deep).lerp(bright, glow))
        }
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture}
        onBeforeCompile={blossomSnow}
        customProgramCacheKey={snowProgramKey}
        roughness={0.94}
        emissive="#e1a6af"
        emissiveIntensity={0.16}
        alphaTest={0.45}
        side={DoubleSide}
      />
    </instancedMesh>
  )
}
