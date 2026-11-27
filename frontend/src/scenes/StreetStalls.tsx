import { useMemo } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from 'three'
import type { BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SnowCap } from './SnowCap'
import { projectSurfaceUvs, useSurface } from './surfaces'
import { STAIRS } from './terrain'

import { NOREN_HEIGHT, NOREN_Y, STYLES, norenPanels } from './shopStyles'
import type { ShopKind } from './shopStyles'

const DEPTH = 3.2
const POST_HEIGHT = 2.8
const PITCH = 0.3
const REACH = DEPTH / 2 + 0.9

/** 색을 정점에 입혀 한 덩어리로 합치는 도우미: 가게 한 채의 정적 부품을 한 번에 그린다. */
class Parts {
  readonly list: BufferGeometry[] = []

  add(geometry: BufferGeometry, color: string) {
    const rgb = new Color(color)
    const count = geometry.attributes.position.count
    const colors = new Float32Array(count * 3)
    for (let index = 0; index < count; index++) {
      colors[index * 3] = rgb.r
      colors[index * 3 + 1] = rgb.g
      colors[index * 3 + 2] = rgb.b
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    this.list.push(geometry)
  }

  box(
    size: [number, number, number],
    at: [number, number, number],
    color: string,
    yaw = 0,
  ) {
    const geometry = new BoxGeometry(...size)
    geometry.rotateY(yaw)
    geometry.translate(...at)
    this.add(geometry, color)
  }

  cylinder(
    radii: [number, number],
    height: number,
    at: [number, number, number],
    color: string,
    segments = 10,
    tilt: [number, number] = [0, 0],
  ) {
    const geometry = new CylinderGeometry(radii[0], radii[1], height, segments)
    geometry.rotateX(tilt[0])
    geometry.rotateZ(tilt[1])
    geometry.translate(...at)
    this.add(geometry, color)
  }

  sphere(
    radius: number,
    at: [number, number, number],
    color: string,
    squash = 1,
  ) {
    const geometry = new SphereGeometry(radius, 10, 8)
    geometry.scale(1, squash, 1)
    geometry.translate(...at)
    this.add(geometry, color)
  }

  torus(
    radius: number,
    tube: number,
    at: [number, number, number],
    color: string,
  ) {
    const geometry = new TorusGeometry(radius, tube, 6, 14)
    geometry.rotateX(Math.PI / 2)
    geometry.translate(...at)
    this.add(geometry, color)
  }

  merged() {
    return mergeGeometries(this.list)
  }
}

const COUNTER_Y = 1.45
const COUNTER_Z = DEPTH / 2 - 0.45

/** 종류별 카운터 위 품목. 좌표는 카운터 윗면 기준. */
function addGoods(parts: Parts, kind: ShopKind, width: number) {
  const top = COUNTER_Y + 0.05
  const z = COUNTER_Z
  if (kind === 'okonomiyaki') {
    parts.box([1.7, 0.08, 0.8], [-0.7, top + 0.04, z], '#2a2a2e')
    ;[
      [-1.15, -0.12],
      [-0.65, 0.12],
      [-0.2, -0.1],
    ].forEach(([x, dz]) => {
      parts.cylinder([0.23, 0.23], 0.06, [x, top + 0.11, z + dz], '#b8793a', 14)
      parts.cylinder([0.17, 0.17], 0.02, [x, top + 0.15, z + dz], '#7c9a45', 14)
    })
    parts.box([0.5, 0.03, 0.12], [-0.1, top + 0.14, z + 0.3], '#a9a9ad', 0.3)
    ;[1.2, 1.5].forEach((x, index) =>
      parts.cylinder(
        [0.05, 0.05],
        0.24,
        [x, top + 0.12, z],
        index ? '#6b3b1c' : '#b32d22',
      ),
    )
    parts.cylinder(
      [0.16, 0.16],
      0.12,
      [width / 2 - 0.5, top + 0.06, z + 0.1],
      '#e8dcc4',
      12,
    )
  } else if (kind === 'dango') {
    parts.box([1.6, 0.08, 0.5], [-0.4, top + 0.04, z], '#6b3d1c')
    for (let index = 0; index < 8; index++) {
      const x = -1.1 + index * 0.22
      parts.cylinder(
        [0.008, 0.008],
        0.55,
        [x, top + 0.35, z],
        '#c9a56b',
        4,
        [0, 0.12],
      )
      ;['#e8a0b5', '#f4efe4', '#9bc07a'].forEach((color, ball) =>
        parts.sphere(
          0.055,
          [x + 0.012 * ball, top + 0.42 + ball * 0.11, z],
          color,
        ),
      )
    }
    parts.cylinder(
      [0.2, 0.26],
      0.28,
      [width / 2 - 0.5, top + 0.14, z],
      '#2c2c30',
      14,
    )
  } else if (kind === 'fruit') {
    ;[-1.2, -0.2, 0.8].forEach((x, index) => {
      parts.box([0.9, 0.22, 0.6], [x, top + 0.11, z + 0.1], '#a98255')
      const palette = ['#c0392b', '#e9962e', '#d9731f']
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 4; column++) {
          parts.sphere(
            0.1,
            [x - 0.3 + column * 0.2, top + 0.3, z - 0.1 + row * 0.2],
            palette[(index + row) % 3],
          )
        }
      }
    })
    parts.box(
      [0.8, 0.5, 0.5],
      [width / 2 - 0.5, top + 0.25, z + 0.1],
      '#a98255',
    )
    for (let index = 0; index < 5; index++) {
      parts.sphere(
        0.11,
        [width / 2 - 0.7 + index * 0.1, top + 0.58, z + 0.1],
        '#c0392b',
      )
    }
  } else if (kind === 'yakisoba') {
    parts.cylinder([0.62, 0.62], 0.06, [-0.6, top + 0.03, z], '#252529', 22)
    ;[
      [-0.9, -0.05, 0.22],
      [-0.4, 0.1, 0.2],
      [-0.7, 0.2, 0.17],
    ].forEach(([x, dz, radius]) => {
      parts.sphere(radius, [x, top + 0.1, z + dz], '#d9b04a', 0.55)
      parts.sphere(radius * 0.6, [x + 0.04, top + 0.17, z + dz], '#6b3b1c', 0.5)
    })
    parts.box([0.45, 0.02, 0.1], [0.1, top + 0.08, z - 0.1], '#a9a9ad', 0.5)
    parts.box([0.45, 0.02, 0.1], [0.1, top + 0.08, z + 0.1], '#a9a9ad', -0.4)
    for (let index = 0; index < 6; index++) {
      parts.sphere(
        0.12,
        [0.9 + (index % 3) * 0.2, top + 0.12 + Math.floor(index / 3) * 0.1, z],
        '#8fb068',
      )
    }
    parts.box([0.5, 0.14, 0.35], [width / 2 - 0.5, top + 0.07, z], '#efe4c8')
  } else if (kind === 'takoyaki') {
    parts.box([1.2, 0.07, 0.62], [-0.2, top + 0.035, z], '#222226')
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 6; column++) {
        parts.sphere(
          0.075,
          [-0.65 + column * 0.17, top + 0.1, z - 0.2 + row * 0.2],
          '#9a5a2b',
        )
      }
    }
    parts.box([0.5, 0.12, 0.3], [0.9, top + 0.06, z], '#efe4c8')
    // 수레 모양: 바퀴와 손잡이
    ;[-1, 1].forEach((side) => {
      const wheel = new CylinderGeometry(0.55, 0.55, 0.1, 18)
      wheel.rotateZ(Math.PI / 2)
      wheel.translate(side * (width / 2 + 0.05), 0.55, 0)
      parts.add(wheel, '#3a2a20')
    })
    ;[-1, 1].forEach((side) =>
      parts.box(
        [0.1, 0.1, 1.4],
        [side * (width / 2 - 0.3), 0.7, -DEPTH / 2 - 0.5],
        '#3a2a20',
      ),
    )
  } else {
    // 이자카야: 술병 줄, 작은 접시, 입구 옆 술통
    ;[-1.9, -1.4, -0.9, 0.9, 1.4, 1.9].forEach((x, index) =>
      parts.cylinder(
        [0.06, 0.07],
        0.3,
        [x, top + 0.15, z],
        ['#3d6a4c', '#7c5430', '#d9ccae'][index % 3],
        10,
      ),
    )
    ;[0.1, -0.1].forEach((x) =>
      parts.cylinder([0.14, 0.11], 0.05, [x, top + 0.03, z], '#e8dcc4', 14),
    )
    ;[-1, 1].forEach((side) => {
      const x = side * (width / 2 + 0.45)
      parts.cylinder([0.42, 0.42], 0.62, [x, 0.5, 0.9], '#c9a36b', 16)
      ;[0.28, 0.72].forEach((y) =>
        parts.torus(0.43, 0.025, [x, y, 0.9], '#3a2a20'),
      )
      parts.cylinder([0.43, 0.43], 0.04, [x, 0.82, 0.9], '#e9e3d4', 16)
    })
  }
}

interface Built {
  timber: BufferGeometry
  goods: BufferGeometry
  glow: BufferGeometry | null
  lanterns: BufferGeometry
  noren: BufferGeometry
  roofSlab: BufferGeometry | null
}

const built = new Map<ShopKind, Built>()

function build(kind: ShopKind): Built {
  const cached = built.get(kind)
  if (cached) return cached
  const { width, frame, walls, roof } = STYLES[kind]
  const timber = new Parts()
  const goods = new Parts()
  // 기단과 기둥 네 개
  timber.box([width + 0.5, 0.2, DEPTH + 0.4], [0, 0.1, 0], '#5f4636')
  ;[-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) =>
      timber.box(
        [0.2, POST_HEIGHT, 0.2],
        [(sx * width) / 2, 0.2 + POST_HEIGHT / 2, (sz * DEPTH) / 2],
        frame,
      ),
    ),
  )
  // 뒷벽과 옆벽
  if (walls) {
    timber.box([width, 2.5, 0.12], [0, 1.45, -DEPTH / 2 + 0.06], '#8a6850')
    ;[-1, 1].forEach((side) =>
      timber.box(
        [0.1, 2.5, DEPTH / 2],
        [(side * width) / 2, 1.45, -DEPTH / 4],
        '#7a5a45',
      ),
    )
  } else {
    timber.box([width, 0.9, 0.12], [0, 0.65, -DEPTH / 2 + 0.06], '#7a5a45')
  }
  // 카운터와 앞 보
  timber.box([width - 0.3, 1.18, 0.7], [0, 0.78, COUNTER_Z - 0.05], '#7a5640')
  timber.box(
    [width + 0.1, 0.09, 0.95],
    [0, COUNTER_Y - 0.05, COUNTER_Z],
    '#a07858',
  )
  timber.box(
    [width + 0.4, 0.24, 0.24],
    [0, 0.2 + POST_HEIGHT, DEPTH / 2],
    frame,
  )

  if (kind === 'izakaya') {
    // 나무 격자창과 걸상
    for (let index = -2; index <= 2; index++) {
      timber.box(
        [0.05, 1.4, 0.06],
        [index * 0.55, 2.05, DEPTH / 2 + 0.2],
        '#2e1f17',
      )
    }
    ;[1.4, 2.0, 2.7].forEach((y) =>
      timber.box([width - 0.6, 0.05, 0.06], [0, y, DEPTH / 2 + 0.2], '#2e1f17'),
    )
    ;[-1.6, 0, 1.6].forEach((x) =>
      timber.cylinder(
        [0.24, 0.21],
        0.54,
        [x, 0.5, DEPTH / 2 + 1.1],
        '#745338',
        12,
      ),
    )
  } else if (kind === 'dango') {
    // 붉은 와가사를 꽂은 낮은 걸상
    timber.box(
      [1.4, 0.1, 0.5],
      [width / 2 + 0.2, 0.5, DEPTH / 2 + 1.0],
      '#9b7248',
    )
    ;[-0.55, 0.55].forEach((x) =>
      timber.box(
        [0.1, 0.45, 0.4],
        [width / 2 + 0.2 + x, 0.28, DEPTH / 2 + 1.0],
        '#7a5638',
      ),
    )
    goods.cylinder(
      [0.02, 0.02],
      1.9,
      [width / 2 + 0.2, 1.4, DEPTH / 2 + 1.0],
      '#3a2a1a',
      6,
    )
    const umbrella = new CylinderGeometry(0.05, 0.85, 0.35, 20, 1, true)
    umbrella.translate(width / 2 + 0.2, 2.2, DEPTH / 2 + 1.0)
    goods.add(umbrella, '#c8302a')
  } else if (kind === 'yakisoba' || kind === 'okonomiyaki') {
    ;[-1.2, 0, 1.2].forEach((x) =>
      timber.cylinder(
        [0.24, 0.21],
        0.54,
        [x, 0.5, DEPTH / 2 + 1.0],
        '#745338',
        12,
      ),
    )
  }
  addGoods(goods, kind, width)

  // 뒷벽 선반과 술병·그릇
  if (walls) {
    timber.box([width - 0.8, 0.07, 0.4], [0, 1.2, -DEPTH / 2 + 0.34], '#4a3226')
    ;[-1.4, -0.9, -0.4, 0.5, 1.0, 1.4].forEach((x, index) =>
      goods.cylinder(
        [0.07, 0.09],
        0.3 + (index % 2) * 0.08,
        [x * (width / 4.4), 1.4, -DEPTH / 2 + 0.34],
        ['#3d6a4c', '#7c5430', '#d9ccae'][index % 3],
        10,
      ),
    )
  }

  // 초롱은 처마 끝 양쪽에 달아 상품과 격자창을 가리지 않는다.
  const lanternSpheres = [-width / 2 - 0.2, width / 2 + 0.2].map((x) => {
    const sphere = new SphereGeometry(1, 14, 10)
    sphere.scale(0.3, 0.4, 0.3)
    sphere.translate(x, 2.2, DEPTH / 2 + 0.4)
    return sphere
  })

  // 노렌: 앞 보 바로 밑에 걸린 짧은 휘장
  const { panels, panelWidth } = norenPanels(kind)
  const norenGeometry = Array.from({ length: panels }, (_, index) => {
    const panel = new PlaneGeometry(panelWidth - 0.06, NOREN_HEIGHT)
    panel.translate(
      -width / 2 + 0.2 + panelWidth * (index + 0.5),
      NOREN_Y,
      DEPTH / 2 + 0.14,
    )
    return panel
  })

  let glow: BufferGeometry | null = null
  if (walls) {
    glow = new PlaneGeometry(width - 0.5, 1.5)
    glow.translate(0, 1.55, -DEPTH / 2 + 0.14)
  }

  let roofSlab: BufferGeometry | null = null
  if (roof === 'gable') {
    roofSlab = projectSurfaceUvs(
      new BoxGeometry(width + 1.3, 0.13, REACH / Math.cos(PITCH)),
    )
  } else if (roof === 'shed') {
    roofSlab = projectSurfaceUvs(
      new BoxGeometry(width + 1.2, 0.13, (DEPTH + 1.4) / Math.cos(0.22)),
    )
  }

  const result = {
    timber: projectSurfaceUvs(timber.merged()),
    goods: goods.merged(),
    glow,
    lanterns: mergeGeometries(lanternSpheres),
    noren: mergeGeometries(norenGeometry),
    roofSlab,
  }
  built.set(kind, result)
  return result
}

const textures = new Map<string, CanvasTexture>()

function norenTexture(text: string, cloth: string, panelWidth: number) {
  const height = 96
  const width = Math.round((height * panelWidth) / NOREN_HEIGHT)
  const key = `${text}${cloth}${width}`
  const cached = textures.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = cloth
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1)
  // 위 끝단과 아래 끝단의 흰 띠
  ctx.fillStyle = '#efe4cb'
  ctx.fillRect(0, 0, width, 7)
  ctx.fillRect(0, height - 5, width, 5)
  ctx.fillStyle = '#f4ead4'
  ctx.font = `bold ${Math.round(height * 0.66)}px "Noto Serif JP", "Yu Mincho", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height * 0.54)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  textures.set(key, texture)
  return texture
}

function stripeTexture(a: string, b: string) {
  const key = `stripe${a}${b}`
  const cached = textures.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  for (let stripe = 0; stripe < 8; stripe++) {
    ctx.fillStyle = stripe % 2 ? b : a
    ctx.fillRect(stripe * 16, 0, 16, 32)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  textures.set(key, texture)
  return texture
}

/** 앞(+z)이 길 쪽인 가게 한 채. 부품은 종류별로 한 번만 합쳐 같은 종류가 공유한다. */
export function Shop({
  kind,
  glow = false,
  shadow = true,
}: {
  kind: ShopKind
  /** 점광원을 켠다. 많은 가게가 한꺼번에 켜지 않도록 꼭 필요한 곳에만 쓴다. */
  glow?: boolean
  shadow?: boolean
}) {
  const wood = useSurface('wood')
  const roof = useSurface('roof')
  const style = STYLES[kind]
  const parts = useMemo(() => build(kind), [kind])
  const noren = norenTexture(
    style.text,
    style.cloth,
    norenPanels(kind).panelWidth - 0.06,
  )
  const stripes = style.stripes
    ? stripeTexture(style.stripes[0], style.stripes[1])
    : null
  const ridge = 0.2 + POST_HEIGHT + 0.75

  return (
    <group>
      <mesh geometry={parts.timber} castShadow={shadow} receiveShadow>
        <meshStandardMaterial {...wood} vertexColors roughness={0.92} />
      </mesh>
      <mesh geometry={parts.goods} castShadow={shadow}>
        <meshStandardMaterial vertexColors roughness={0.6} side={DoubleSide} />
      </mesh>
      {parts.glow && (
        <mesh geometry={parts.glow}>
          <meshStandardMaterial
            color="#ffd9a0"
            emissive="#ff9a44"
            emissiveIntensity={0.98}
          />
        </mesh>
      )}
      <mesh geometry={parts.noren}>
        <meshStandardMaterial
          map={noren}
          side={DoubleSide}
          roughness={1}
          emissiveMap={noren}
          emissive="#ffffff"
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh geometry={parts.lanterns}>
        <meshStandardMaterial
          color="#e86a3c"
          emissive="#ff7a38"
          emissiveIntensity={1.35}
          roughness={0.85}
        />
      </mesh>

      {style.roof === 'gable' &&
        parts.roofSlab &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={parts.roofSlab!}
            position={[
              0,
              ridge - (REACH / 2) * Math.tan(PITCH) + 0.06,
              (side * REACH) / 2,
            ]}
            rotation-x={side * PITCH}
            castShadow={shadow}
            receiveShadow
          >
            <meshStandardMaterial
              {...roof}
              color={kind === 'okonomiyaki' ? '#7a5e5a' : '#9c9c98'}
              roughness={0.95}
            />
            <SnowCap source={parts.roofSlab!} thickness={0.14} />
          </mesh>
        ))}
      {style.roof === 'shed' && parts.roofSlab && (
        <mesh
          geometry={parts.roofSlab}
          position={[0, 3.55, 0.1]}
          rotation-x={0.22}
          castShadow={shadow}
        >
          <meshStandardMaterial {...roof} color="#b9a79a" roughness={0.95} />
          <SnowCap source={parts.roofSlab} thickness={0.12} />
        </mesh>
      )}
      {style.roof === 'tent' &&
        stripes &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            position={[0, 3.45, (side * (DEPTH / 2 + 0.7)) / 2]}
            rotation-x={-side * 0.52}
            castShadow={shadow}
          >
            <planeGeometry args={[style.width + 0.6, DEPTH / 2 + 1.2]} />
            <meshStandardMaterial
              map={stripes}
              side={DoubleSide}
              roughness={1}
              emissiveMap={stripes}
              color="#e9d5b6"
              emissive="#ffc68e"
              emissiveIntensity={0.045}
            />
          </mesh>
        ))}
      {glow && (
        <pointLight
          position={[0, 2.25, DEPTH / 2 + 0.72]}
          color="#ffb060"
          intensity={19}
          distance={8}
        />
      )}
    </group>
  )
}

/** 입구 계단 앞 길 양쪽에 마주 선 가게(side −1은 왼쪽). */
const STALLS: { side: -1 | 1; z: number; kind: ShopKind }[] = [
  { side: -1, z: STAIRS.bottomZ + 7.6, kind: 'izakaya' },
  { side: -1, z: STAIRS.bottomZ + 1.9, kind: 'dango' },
  { side: -1, z: STAIRS.bottomZ - 3.8, kind: 'takoyaki' },
  { side: 1, z: STAIRS.bottomZ + 7.2, kind: 'fruit' },
  { side: 1, z: STAIRS.bottomZ + 1.5, kind: 'izakaya' },
  { side: 1, z: STAIRS.bottomZ - 4.2, kind: 'okonomiyaki' },
]
const STALL_X = 9.4

export function StreetStalls() {
  return (
    <group>
      {STALLS.map(({ side, z, kind }, index) => (
        <group
          key={index}
          position={[side * STALL_X, 0, z]}
          rotation-y={(-side * Math.PI) / 2}
        >
          <Shop kind={kind} glow={index % 3 === 0} />
        </group>
      ))}
    </group>
  )
}
