import { useMemo } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CASTLE_POSITION } from './Castle'
import { Plaza, PondDecor } from './Pond'
import { Stairs } from './Stairs'
import { roofGeometry } from './shapes'
import {
  getBlossomTexture,
  getFacadeGlowTexture,
  getFacadeTexture,
  getGlowTexture,
  getPetalTexture,
  getRoofTileTexture,
} from './textures'

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const FLOWER_MIX = ['#ff7fb8', '#ff9fcb', '#ffd0e4', '#ffffff', '#f060a0']

/** 광택 판석 바닥, 연못과 다리, 바닥에 흩어진 꽃잎. */
export function Ground() {
  const petal = useMemo(getPetalTexture, [])

  return (
    <>
      <Plaza />
      <PondDecor />
      <Stairs />
      <instancedMesh
        args={[undefined, undefined, 420]}
        frustumCulled={false}
        ref={(mesh) => {
          if (!mesh) return
          const random = createRandom(17)
          const matrix = new Matrix4()
          const quaternion = new Quaternion()
          const euler = new Euler()
          const position = new Vector3()
          const scale = new Vector3()
          for (let index = 0; index < 420; index += 1) {
            position.set((random() - 0.5) * 52, 0.05, -18 + random() * 44)
            euler.set(-Math.PI / 2, 0, random() * Math.PI * 2)
            quaternion.setFromEuler(euler)
            const size = 0.18 + random() * 0.14
            scale.set(size, size, size)
            mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale))
          }
          mesh.instanceMatrix.needsUpdate = true
        }}
      >
        <planeGeometry args={[1, 1.4]} />
        <meshBasicMaterial
          map={petal}
          alphaTest={0.35}
          side={DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}

/** 낮게 모여 핀 꽃 덤불(영역 안에 분홍·흰 꽃을 뿌린다). */
export function FlowerBush({
  position,
  innerRadius = 0,
  outerRadius,
  count,
  height = 0.6,
  seed = 1,
}: {
  position: [number, number, number]
  innerRadius?: number
  outerRadius: number
  count: number
  height?: number
  seed?: number
}) {
  const blossom = useMemo(getBlossomTexture, [])
  return (
    <instancedMesh
      args={[undefined, undefined, count]}
      position={position}
      frustumCulled={false}
      ref={(mesh) => {
        if (!mesh) return
        const random = createRandom(seed)
        const matrix = new Matrix4()
        const quaternion = new Quaternion()
        const euler = new Euler()
        const point = new Vector3()
        const scale = new Vector3()
        const color = new Color()
        for (let index = 0; index < count; index += 1) {
          const angle = random() * Math.PI * 2
          const radius = Math.sqrt(
            innerRadius ** 2 + random() * (outerRadius ** 2 - innerRadius ** 2),
          )
          const dome = 1 - (radius / outerRadius) ** 2 * 0.5
          point.set(
            Math.cos(angle) * radius,
            0.25 + random() * height * dome,
            Math.sin(angle) * radius,
          )
          euler.set(
            -Math.PI / 2 + (random() - 0.5) * 1.2,
            (random() - 0.5) * 1.2,
            random() * Math.PI * 2,
          )
          quaternion.setFromEuler(euler)
          const size = 0.4 + random() * 0.4
          scale.set(size, size, size)
          mesh.setMatrixAt(index, matrix.compose(point, quaternion, scale))
          mesh.setColorAt(
            index,
            color.set(FLOWER_MIX[Math.floor(random() * FLOWER_MIX.length)]),
          )
        }
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={blossom}
        alphaTest={0.45}
        side={DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

/** 나무 밑동을 둘러싼 돌 화단과 꽃. */
export function FlowerBed() {
  const stones = Array.from({ length: 30 }, (_, index) => {
    const angle = (index / 30) * Math.PI * 2
    return { angle, x: Math.cos(angle) * 5.0, z: Math.sin(angle) * 5.0 }
  })
  return (
    <group>
      <mesh position-y={0.22}>
        <cylinderGeometry args={[4.9, 5.0, 0.44, 48]} />
        <meshStandardMaterial color="#2c2340" roughness={1} />
      </mesh>
      {stones.map(({ angle, x, z }, index) => (
        <mesh key={index} position={[x, 0.28, z]} rotation-y={-angle}>
          <boxGeometry args={[0.5, 0.55, 0.95]} />
          <meshStandardMaterial
            color={index % 2 ? '#a597b0' : '#968aa3'}
            roughness={0.9}
          />
        </mesh>
      ))}
      <FlowerBush
        position={[0, 0.2, 0]}
        innerRadius={1.2}
        outerRadius={4.6}
        count={3200}
        height={0.8}
        seed={5}
      />
    </group>
  )
}

/** 석등: 돌 받침 위에 나무틀과 한지로 빛나는 사각 등. */
export function StoneLantern({
  position,
  scale = 1,
  light = false,
}: {
  position: [number, number, number]
  scale?: number
  light?: boolean
}) {
  const halo = useMemo(getGlowTexture, [])
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.25}>
        <boxGeometry args={[1.0, 0.5, 1.0]} />
        <meshStandardMaterial color="#a89bb4" roughness={0.9} />
      </mesh>
      <mesh position-y={0.58}>
        <boxGeometry args={[0.82, 0.16, 0.82]} />
        <meshStandardMaterial color="#9487a1" roughness={0.9} />
      </mesh>
      <mesh position-y={1.12}>
        <boxGeometry args={[0.52, 0.6, 0.52]} />
        <meshBasicMaterial color="#ffd488" toneMapped={false} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 0.27, 1.12, z * 0.27]}>
            <boxGeometry args={[0.06, 0.66, 0.06]} />
            <meshStandardMaterial color="#6a3a22" />
          </mesh>
        )),
      )}
      <mesh position-y={1.46}>
        <boxGeometry args={[0.66, 0.07, 0.66]} />
        <meshStandardMaterial color="#6a3a22" />
      </mesh>
      <mesh position-y={1.76} rotation-y={Math.PI / 4}>
        <coneGeometry args={[0.58, 0.45, 4]} />
        <meshStandardMaterial color="#5a2f1c" roughness={0.8} />
      </mesh>
      <sprite position-y={1.15} scale={[3.2, 3.2, 1]}>
        <spriteMaterial
          map={halo}
          color="#ffb04a"
          opacity={0.6}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          fog={false}
        />
      </sprite>
      {light && (
        <pointLight
          position-y={1.2}
          color="#ffb056"
          intensity={16}
          distance={9}
        />
      )}
    </group>
  )
}

/** 한옥·목조 건물 마을: 돌 기단, 기둥, 창살 창, 들린 처마의 기와지붕. */
function buildVillage() {
  const random = createRandom(23)
  const walls: BufferGeometry[] = []
  const roofs: BufferGeometry[] = []
  const wood: BufferGeometry[] = []
  const stone: BufferGeometry[] = []
  const lanterns: Matrix4[] = []
  const wallHeight = 1.8
  const stride = 2.5

  const place = (
    target: BufferGeometry[],
    geometry: BufferGeometry,
    building: Matrix4,
    x: number,
    y: number,
    z: number,
  ) => {
    const local = new Matrix4().makeTranslation(x, y, z)
    target.push(geometry.applyMatrix4(building.clone().multiply(local)))
  }

  for (let index = 0; index < 60; index += 1) {
    const side = index % 2 ? 1 : -1
    const z = -26 - random() * 34
    const x = side * (17 + random() * 34)
    const ground = 0
    const tiers = random() < 0.7 ? 1 : random() < 0.75 ? 2 : 3
    const width = tiers === 1 ? 5 + random() * 2.5 : 3.4 + random() * 1.6
    const depth = 3 + random() * 1.2
    const yaw = -side * (0.15 + random() * 0.3)
    if (Math.hypot(x - CASTLE_POSITION[0], z - CASTLE_POSITION[1]) < 24)
      continue
    // 연못(맨 위) 뒤쪽 멀리에만 마을을 둔다.
    if (Math.abs(x) < 30 || z > -40) continue
    const building = new Matrix4().makeRotationY(yaw).setPosition(x, ground, z)

    place(
      stone,
      new BoxGeometry(width + 0.9, 0.4, depth + 0.9),
      building,
      0,
      0.2,
      0,
    )
    for (let tier = 0; tier < tiers; tier += 1) {
      const shrink = 1 - tier * 0.2
      const w = width * shrink
      const d = depth * shrink
      const base = 0.4 + tier * stride
      place(
        walls,
        new BoxGeometry(w, wallHeight, d),
        building,
        0,
        base + wallHeight / 2,
        0,
      )
      for (const px of [-1, 1]) {
        for (const pz of [-1, 1]) {
          place(
            wood,
            new BoxGeometry(0.16, wallHeight, 0.16),
            building,
            (px * w) / 2,
            base + wallHeight / 2,
            (pz * d) / 2,
          )
        }
      }
      for (let slot = -1; slot <= 1; slot += 1) {
        lanterns.push(
          building
            .clone()
            .multiply(
              new Matrix4().makeTranslation(
                slot * w * 0.33,
                base + wallHeight - 0.3,
                d / 2 + 0.9,
              ),
            )
            .multiply(new Matrix4().makeScale(0.22, 0.3, 0.22)),
        )
      }
      place(
        wood,
        new BoxGeometry(w + 0.35, 0.16, d + 0.35),
        building,
        0,
        base + wallHeight + 0.05,
        0,
      )
      place(
        roofs,
        roofGeometry(
          (w + 2.8) / 2,
          (d + 2.8) / 2,
          1.15 + (tier === tiers - 1 ? 0.25 : 0),
          0.4,
        ),
        building,
        0,
        base + wallHeight + 0.1,
        0,
      )
    }
  }
  const merge = (list: BufferGeometry[]) => mergeGeometries(list)
  return {
    walls: merge(walls),
    roofs: merge(roofs),
    wood: merge(wood),
    stone: merge(stone),
    lanterns,
  }
}

/** 뒤쪽 언덕 위 한옥 마을(불 켜진 창살 창), 먼 산, 보랏빛 구름. */
export function Village() {
  const halo = useMemo(getGlowTexture, [])
  const facade = useMemo(getFacadeTexture, [])
  const facadeGlow = useMemo(getFacadeGlowTexture, [])
  const tiles = useMemo(getRoofTileTexture, [])
  const village = useMemo(buildVillage, [])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -300]}>
        <planeGeometry args={[1600, 900]} />
        <meshStandardMaterial color="#1b1636" roughness={1} />
      </mesh>
      <mesh geometry={village.stone}>
        <meshStandardMaterial color="#6d6480" roughness={1} />
      </mesh>
      <mesh geometry={village.walls}>
        <meshStandardMaterial
          map={facade}
          emissiveMap={facadeGlow}
          emissive="#ffffff"
          emissiveIntensity={1.4}
          roughness={1}
        />
      </mesh>
      <mesh geometry={village.wood}>
        <meshStandardMaterial color="#5a2f20" roughness={0.9} />
      </mesh>
      <instancedMesh
        args={[undefined, undefined, village.lanterns.length]}
        frustumCulled={false}
        ref={(mesh) => {
          if (!mesh) return
          village.lanterns.forEach((matrix, index) =>
            mesh.setMatrixAt(index, matrix),
          )
          mesh.instanceMatrix.needsUpdate = true
        }}
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#ff4a35" toneMapped={false} />
      </instancedMesh>
      <mesh geometry={village.roofs}>
        <meshStandardMaterial
          map={tiles}
          color="#7d86a6"
          roughness={0.85}
          side={DoubleSide}
        />
      </mesh>
      {(
        [
          [-40, 13, -75, 70, 18, '#8a5fe0', 0.32],
          [30, 10, -80, 80, 20, '#a35fd8', 0.3],
          [-10, 7, -90, 90, 16, '#6f4fd0', 0.28],
          [60, 16, -85, 60, 16, '#8a5fe0', 0.26],
        ] as const
      ).map(([x, y, z, w, h, color, opacity]) => (
        <sprite key={`${x}-${z}`} position={[x, y, z]} scale={[w, h, 1]}>
          <spriteMaterial
            map={halo}
            color={color}
            opacity={opacity}
            transparent
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  )
}
