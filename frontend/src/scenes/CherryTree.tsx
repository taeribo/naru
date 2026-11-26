import { useMemo } from 'react'
import {
  AdditiveBlending,
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
import { getBarkTexture, getBlossomTexture, getGlowTexture } from './textures'

const GOLDEN_ANGLE = 2.39996
const MAX_DEPTH = 3
const TREE_SCALE = 1.6
const FLOWER_COUNT = 16000
const FLOWER_SIZE = 1.9
const GLOW_SPOTS: [number, number, number, number][] = [
  [0, 8, 0, 18],
  [-6, 6.5, 1, 12],
  [6, 6.5, 1, 12],
  [-3, 8, 3, 10],
  [3, 8, 3, 10],
]

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
    new Vector3(0, 4.95, 0),
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
      new Vector3(Math.cos(angle), 0.45 + random() * 0.45, Math.sin(angle)),
      2.6 + random() * 0.9,
      0.21,
      0,
    )
  }
  grow(trunk.getPointAt(1), new Vector3(0.05, 1, 0.02), 1.3, 0.17, 0)

  return { bark: mergeGeometries(limbs), anchors }
}

export function CherryTree() {
  const tree = useMemo(buildTree, [])
  const barkTexture = useMemo(getBarkTexture, [])
  const blossom = useMemo(getBlossomTexture, [])
  const halo = useMemo(getGlowTexture, [])

  return (
    <group>
      <group position-y={0.44} scale={TREE_SCALE}>
        <mesh geometry={tree.bark}>
          <meshStandardMaterial
            map={barkTexture}
            roughness={1}
            color="#c49a84"
          />
        </mesh>
        <Flowers anchors={tree.anchors} texture={blossom} />
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
      {GLOW_SPOTS.map(([x, y, z, size]) => (
        <sprite
          key={`${x}-${y}-${z}`}
          position={[x, y, z]}
          scale={[size, size, 1]}
        >
          <spriteMaterial
            map={halo}
            color="#ff9ccc"
            opacity={0.2}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
      {/* 꽃잎이 광원: 바닥과 주변에 분홍빛이 번지도록 수관 아래에 조명을 둔다. */}
      {(
        [
          [0, 5, 3],
          [-5, 6, 0],
          [5, 6, 0],
          [0, 11, -1],
        ] as const
      ).map(([x, y, z]) => (
        <pointLight
          key={`${x}-${z}`}
          position={[x, y, z]}
          color="#ff9fd0"
          intensity={300}
          distance={26}
        />
      ))}
    </group>
  )
}

function Flowers({
  anchors,
  texture,
}: {
  anchors: Anchor[]
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
        const deep = new Color('#f08ab8')
        const bright = new Color('#ffffff')
        for (let index = 0; index < FLOWER_COUNT; index += 1) {
          const { point, spread } = anchors[index % anchors.length]
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
      <meshBasicMaterial
        map={texture}
        alphaTest={0.45}
        side={DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
