import { roofSnow, snowProgramKey } from './snow'
import { ContactShade } from './ContactShade'
import { useSurface } from './surfaces'
import { useMemo } from 'react'
import {
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
import {
  AVENUE,
  CASTLE_SITE,
  ONSEN_ACCESS,
  ONSEN_SITE,
  WORLD_BOUNDS,
  elevation,
  inRect,
} from './terrain'
import { Plaza } from './StoneCourtyard'
import { Stairs } from './Stairs'
import { roofGeometry } from './shapes'
import {
  getBlossomTexture,
  getFacadeGlowTexture,
  getFacadeTexture,
  getPetalTexture,
} from './textures'

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const FLOWER_MIX = ['#ff7fb8', '#ff9fcb', '#ffd0e4', '#ffffff', '#f060a0']

/** 판석 바닥과 바닥에 흩어진 꽃잎. */
export function Ground() {
  const petal = useMemo(getPetalTexture, [])

  return (
    <>
      <Plaza />
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
      <ContactShade width={15} depth={14} opacity={0.62} />
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

function buildVillage() {
  const random = createRandom(23)
  const walls: BufferGeometry[] = []
  const roofs: BufferGeometry[] = []
  const wood: BufferGeometry[] = []
  const stone: BufferGeometry[] = []
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
    // 성 부지와 온천 구역 바깥, 양옆 멀리까지 퍼뜨려 마을 배경을 남긴다.
    const x = side * (17 + random() * 78)
    const tiers = random() < 0.7 ? 1 : random() < 0.75 ? 2 : 3
    const width = tiers === 1 ? 5 + random() * 2.5 : 3.4 + random() * 1.6
    const depth = 3 + random() * 1.2
    const yaw = -side * (0.15 + random() * 0.3)
    if (Math.hypot(x - CASTLE_POSITION[0], z - CASTLE_POSITION[1]) < 24)
      continue
    // 광장 뒤쪽 멀리에 마을을 둔다.
    if (Math.abs(x) < 27 || z > WORLD_BOUNDS.minZ - 12) continue
    // 성 부지와 참배길은 비워 둔다.
    if (
      inRect(x, z, CASTLE_SITE, 6) ||
      inRect(x, z, ONSEN_SITE, 6) ||
      ONSEN_ACCESS.some((area) => inRect(x, z, area, 6)) ||
      AVENUE.some((area) => inRect(x, z, area, 6))
    )
      continue
    // 언덕 지형 위에 앉힌다: 발치 평균 높이보다 살짝 위에 맞추고 기단을 낮은 모서리까지 늘려 틈을 메운다.
    const halfW = width / 2 + 0.45
    const halfD = depth / 2 + 0.45
    const heights = [
      elevation(x, z),
      elevation(x - halfW, z - halfD),
      elevation(x + halfW, z - halfD),
      elevation(x - halfW, z + halfD),
      elevation(x + halfW, z + halfD),
    ]
    const mean = heights.reduce((sum, h) => sum + h, 0) / heights.length
    const ground = mean + 0.3
    const sink = Math.max(0, ground - Math.min(...heights)) + 0.15
    const building = new Matrix4().makeRotationY(yaw).setPosition(x, ground, z)

    place(
      stone,
      new BoxGeometry(width + 0.9, 0.4 + sink, depth + 0.9),
      building,
      0,
      0.2 - sink / 2,
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
  const merge = (list: BufferGeometry[]) =>
    list.length > 0 ? mergeGeometries(list) : new BufferGeometry()
  return {
    walls: merge(walls),
    roofs: merge(roofs),
    wood: merge(wood),
    stone: merge(stone),
  }
}

/** 뒤쪽 언덕 위 마을과 불 켜진 창살 창. */
export function Village() {
  const facade = useMemo(getFacadeTexture, [])
  const facadeGlow = useMemo(getFacadeGlowTexture, [])
  const roofSurface = useSurface('roof')
  const timber = useSurface('wood')
  const village = useMemo(buildVillage, [])

  return (
    <group>
      <mesh geometry={village.stone}>
        <meshStandardMaterial color="#6d6480" roughness={1} />
      </mesh>
      <mesh geometry={village.walls}>
        <meshStandardMaterial
          map={facade}
          emissiveMap={facadeGlow}
          emissive="#ffffff"
          emissiveIntensity={0.95}
          roughness={1}
        />
      </mesh>
      <mesh geometry={village.wood}>
        <meshStandardMaterial {...timber} color="#725242" roughness={1} />
      </mesh>
      <mesh geometry={village.roofs}>
        <meshStandardMaterial
          onBeforeCompile={roofSnow}
          customProgramCacheKey={snowProgramKey}
          {...roofSurface}
          color="#9599a1"
          roughness={0.85}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}
