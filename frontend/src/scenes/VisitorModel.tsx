import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three'
import type { Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** 기모노(여) 또는 하오리·하카마(남) 차림. */
export type VisitorLook =
  | {
      outfit: 'kimono'
      robe: string
      pattern: string
      obi: string
      cord: string
      hair: string
      flower: string
    }
  | {
      outfit: 'hakama'
      haori: string
      hakama: string
      stripe: string
      hair: string
    }

const KIMONO_LOOKS = [
  {
    robe: '#c93a5a',
    pattern: '#ffd6e0',
    obi: '#3a1f2a',
    cord: '#6fd3d6',
    flower: '#e64d68',
  },
  {
    robe: '#3e6fb8',
    pattern: '#d9ecff',
    obi: '#f1d38a',
    cord: '#c93a5a',
    flower: '#ffb3c6',
  },
  {
    robe: '#8a4fb3',
    pattern: '#f3dcff',
    obi: '#2c2238',
    cord: '#f1d38a',
    flower: '#ff8fb0',
  },
  {
    robe: '#e07a3a',
    pattern: '#fff0d6',
    obi: '#5a2a1c',
    cord: '#9fd6a8',
    flower: '#d6304c',
  },
] as const
const HAKAMA_LOOKS = [
  { haori: '#1d1b23', hakama: '#8f8a80', stripe: '#6f6a62' },
  { haori: '#273452', hakama: '#6b6f7a', stripe: '#545864' },
  { haori: '#3b4637', hakama: '#9a8468', stripe: '#7c6a52' },
] as const
const HAIR = ['#1b1a22', '#3a2620', '#4a2c1f'] as const

const SKIN = '#f6d6bd'
const TABI = '#f7f3ec'
const ZORI = '#d8c3a0'
const HEAD_Y = 1.05
const HEAD_R = 0.25

function hash(text: string) {
  let value = 2166136261
  for (const char of text) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/** 같은 방문자는 언제나 같은 차림이 되도록 아이디로 정한다. */
export function lookFor(id: string): VisitorLook {
  const seed = hash(id)
  const hair = HAIR[(seed >>> 4) % HAIR.length]
  if (seed % 2 === 0) {
    return {
      outfit: 'kimono',
      hair,
      ...KIMONO_LOOKS[(seed >>> 8) % KIMONO_LOOKS.length],
    }
  }
  return {
    outfit: 'hakama',
    hair,
    ...HAKAMA_LOOKS[(seed >>> 8) % HAKAMA_LOOKS.length],
  }
}

/*
 * 그리기 횟수를 줄이려고 캐릭터 한 명을 몸통·다리 둘·팔 둘, 다섯 덩어리로 굽는다.
 * 색은 꼭짓점 색으로 칠하고, 무늬 천만 텍스처 왼쪽 3/4(무늬 영역)을 쓴다.
 * 나머지 부위는 텍스처 오른쪽의 흰 영역을 찍어 꼭짓점 색이 그대로 보인다.
 */
const PATTERN_U = 0.75
const PLAIN_UV = [0.9, 0.5] as const

type Vec3 = [number, number, number]
type Piece = {
  geometry: BufferGeometry
  /** null이면 무늬 천. */
  color: string | null
  position?: Vec3
  rotation?: Vec3
  scale?: Vec3 | number
}

function bake(pieces: Piece[]) {
  const parts = pieces.map(
    ({
      geometry,
      color,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      scale = 1,
    }) => {
      const scaled: Vec3 =
        typeof scale === 'number' ? [scale, scale, scale] : scale
      geometry.applyMatrix4(
        new Matrix4().compose(
          new Vector3(...position),
          new Quaternion().setFromEuler(new Euler(...rotation)),
          new Vector3(...scaled),
        ),
      )
      const count = geometry.getAttribute('position').count
      const tint = new Color(color ?? '#ffffff')
      const colors = new Float32Array(count * 3)
      const uv = geometry.getAttribute('uv')
      for (let index = 0; index < count; index += 1) {
        colors.set([tint.r, tint.g, tint.b], index * 3)
        if (color === null) uv.setX(index, uv.getX(index) * PATTERN_U)
        else uv.setXY(index, PLAIN_UV[0], PLAIN_UV[1])
      }
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
      return geometry
    },
  )
  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  return merged
}

function clothTexture(look: VisitorLook) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, 256, 256)
    const width = 256 * PATTERN_U
    context.save()
    context.beginPath()
    context.rect(0, 0, width, 256)
    context.clip()
    if (look.outfit === 'kimono') {
      context.fillStyle = look.robe
      context.fillRect(0, 0, width, 256)
      const spots = [
        [22, 30],
        [110, 18],
        [170, 70],
        [60, 95],
        [140, 150],
        [20, 170],
        [95, 215],
        [178, 230],
      ]
      // 원래 무늬 한 장을 가로 3칸·세로 2칸으로 줄여 깔아 꽃을 잘게 만든다.
      const tileX = width / 3
      for (let column = 0; column < 3; column += 1) {
        for (let row = 0; row < 2; row += 1) {
          for (const [x, y] of spots) {
            const cx = column * tileX + (x / width) * tileX
            const cy = row * 128 + y / 2
            context.fillStyle = look.pattern
            for (let petal = 0; petal < 5; petal += 1) {
              const angle = (petal / 5) * Math.PI * 2
              context.beginPath()
              context.arc(
                cx + Math.cos(angle) * 3.4,
                cy + Math.sin(angle) * 3.4,
                2.8,
                0,
                Math.PI * 2,
              )
              context.fill()
            }
            context.fillStyle = '#f2c94c'
            context.beginPath()
            context.arc(cx, cy, 1.3, 0, Math.PI * 2)
            context.fill()
          }
        }
      }
    } else {
      context.fillStyle = look.hakama
      context.fillRect(0, 0, width, 256)
      context.fillStyle = look.stripe
      for (let x = 0; x < width; x += 12) context.fillRect(x, 0, 4, 256)
    }
    context.restore()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const sphere = (radius: number, width = 12, height = 10) =>
  new SphereGeometry(radius, width, height)
const cylinder = (top: number, bottom: number, height: number, sides = 14) =>
  new CylinderGeometry(top, bottom, height, sides)
const box = (x: number, y: number, z: number) => new BoxGeometry(x, y, z)

function face(blush: boolean): Piece[] {
  const pieces: Piece[] = [-1, 1].map((side) => ({
    geometry: sphere(0.03, 8, 6),
    color: '#1b1418',
    position: [side * 0.085, HEAD_Y - 0.01, -0.232],
    scale: [1, 1.25, 0.45],
  }))
  if (blush) {
    for (const side of [-1, 1]) {
      pieces.push({
        geometry: sphere(0.036, 8, 6),
        color: '#f4a9ae',
        position: [side * 0.14, HEAD_Y - 0.075, -0.193],
        rotation: [0, side * 0.62, 0],
        scale: [1, 0.6, 0.3],
      })
    }
  }
  pieces.push({
    geometry: new TorusGeometry(0.028, 0.0065, 5, 10, Math.PI),
    color: '#8a3a3a',
    position: [0, HEAD_Y - 0.095, -0.229],
    rotation: [0, 0, Math.PI],
  })
  return pieces
}

function head(hair: string, long: boolean): Piece[] {
  return [
    { geometry: sphere(HEAD_R, 22, 16), color: SKIN, position: [0, HEAD_Y, 0] },
    {
      geometry: new SphereGeometry(
        HEAD_R,
        22,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.36,
      ),
      color: hair,
      position: [0, HEAD_Y, 0],
      scale: 1.05,
    },
    {
      geometry: new SphereGeometry(
        HEAD_R,
        22,
        12,
        0,
        Math.PI,
        0,
        Math.PI * (long ? 0.8 : 0.62),
      ),
      color: hair,
      position: [0, HEAD_Y, 0],
      scale: 1.06,
    },
    ...[-1, 1].map(
      (side): Piece => ({
        geometry: box(0.06, long ? 0.26 : 0.15, 0.12),
        color: hair,
        position: [side * 0.235, HEAD_Y - (long ? 0.06 : 0.02), -0.05],
        rotation: [0, 0, side * 0.12],
      }),
    ),
  ]
}

function collar(inner: string): Piece[] {
  return [-1, 1].map((side) => ({
    geometry: box(0.04, 0.2, 0.02),
    color: inner,
    position: [side * 0.035, 0.7, -0.152],
    rotation: [0.18, 0, -side * 0.55],
  }))
}

/** 버선과 조리. drop만큼 아래(골반 관절 기준)로 내려 둔다. */
function leg(drop: number, extra: Piece[]): Piece[] {
  return [
    {
      geometry: cylinder(0.045, 0.05, 0.09, 10),
      color: TABI,
      position: [0, 0.045 - drop, 0],
    },
    {
      geometry: box(0.085, 0.024, 0.16),
      color: ZORI,
      position: [0, 0.012 - drop, -0.025],
    },
    ...extra.map((piece) => {
      const [x, y, z] = piece.position ?? [0, 0, 0]
      return { ...piece, position: [x, y - drop, z] as Vec3 }
    }),
  ]
}

/**
 * 어깨에서 늘어진 원기둥 팔. 원점은 어깨 관절.
 * 소매는 끝으로 갈수록 살짝 넓어지고, 소맷부리에서 손목과 손이 나온다.
 */
function arm(side: number, sleeve: string | null, flare: number): Piece[] {
  const tilt = side * 0.16
  const length = 0.3
  const along = (distance: number): Vec3 => [
    Math.sin(tilt) * distance,
    -Math.cos(tilt) * distance,
    0,
  ]
  return [
    { geometry: sphere(0.068, 12, 10), color: sleeve },
    {
      geometry: cylinder(0.064, flare, length),
      color: sleeve,
      position: along(length / 2),
      rotation: [0, 0, tilt],
    },
    {
      geometry: cylinder(0.034, 0.036, 0.08, 10),
      color: SKIN,
      position: along(length + 0.01),
      rotation: [0, 0, tilt],
    },
    {
      geometry: sphere(0.046, 12, 10),
      color: SKIN,
      position: along(length + 0.06),
    },
  ]
}

type Parts = {
  body: Piece[]
  leg: Piece[]
  arms: [Piece[], Piece[]]
  hip: number
  shoulder: [number, number]
  legSpread: number
}

function kimonoParts(look: Extract<VisitorLook, { outfit: 'kimono' }>): Parts {
  const body: Piece[] = [
    {
      geometry: cylinder(0.15, 0.215, 0.62, 18),
      color: null,
      position: [0, 0.46, 0],
    },
    {
      geometry: sphere(0.165, 16, 10),
      color: look.robe,
      position: [0, 0.765, 0],
      scale: [1, 0.45, 0.9],
    },
    ...collar('#fbf6ee'),
    {
      geometry: cylinder(0.168, 0.176, 0.14, 18),
      color: look.obi,
      position: [0, 0.565, 0],
    },
    {
      geometry: cylinder(0.181, 0.181, 0.02, 18),
      color: look.cord,
      position: [0, 0.565, 0],
    },
    {
      geometry: sphere(0.024, 8, 6),
      color: look.cord,
      position: [0, 0.565, -0.18],
      scale: [1.4, 1, 0.7],
    },
    // 등 뒤 오타이코 매듭
    {
      geometry: box(0.24, 0.17, 0.07),
      color: look.obi,
      position: [0, 0.6, 0.2],
    },
    ...head(look.hair, true),
    {
      geometry: sphere(0.115, 14, 10),
      color: look.hair,
      position: [0, HEAD_Y + 0.25, 0.06],
    },
    {
      geometry: cylinder(0.011, 0.011, 0.36, 6),
      color: '#e9b44c',
      position: [0.02, HEAD_Y + 0.28, 0.06],
      rotation: [0, 0, -1.05],
    },
    ...face(true),
  ]
  for (const [x, y, z] of [
    [-0.09, HEAD_Y + 0.27, -0.03],
    [-0.15, HEAD_Y + 0.2, -0.02],
  ]) {
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal / 5) * Math.PI * 2
      body.push({
        geometry: sphere(0.022, 6, 5),
        color: look.flower,
        position: [x + Math.cos(angle) * 0.03, y + Math.sin(angle) * 0.03, z],
      })
    }
    body.push({
      geometry: sphere(0.016, 6, 5),
      color: '#f2c94c',
      position: [x, y, z],
    })
  }
  const hip = 0.2
  return {
    body,
    leg: leg(hip, [
      {
        geometry: cylinder(0.042, 0.045, 0.12, 10),
        color: TABI,
        position: [0, 0.14, 0],
      },
    ]),
    arms: [arm(-1, null, 0.085), arm(1, null, 0.085)],
    hip,
    shoulder: [0.165, 0.76],
    legSpread: 0.065,
  }
}

function hakamaParts(look: Extract<VisitorLook, { outfit: 'hakama' }>): Parts {
  const body: Piece[] = [
    {
      geometry: cylinder(0.17, 0.2, 0.14, 18),
      color: null,
      position: [0, 0.47, 0],
    },
    {
      geometry: cylinder(0.158, 0.18, 0.34, 18),
      color: look.haori,
      position: [0, 0.63, 0],
    },
    {
      geometry: sphere(0.17, 16, 10),
      color: look.haori,
      position: [0, 0.775, 0],
      scale: [1, 0.45, 0.9],
    },
    ...collar('#cfcac4'),
    // 가문 문양
    ...[-1, 1].map(
      (side): Piece => ({
        geometry: cylinder(0.022, 0.022, 0.006, 12),
        color: '#f3efe6',
        position: [side * 0.085, 0.73, -0.152],
        rotation: [Math.PI / 2 - 0.12, 0, 0],
      }),
    ),
    // 하오리 끈
    {
      geometry: sphere(0.03, 10, 8),
      color: '#f3efe6',
      position: [0, 0.6, -0.185],
    },
    ...head(look.hair, false),
    ...face(false),
  ]
  const hip = 0.5
  return {
    body,
    leg: leg(hip, [
      {
        geometry: cylinder(0.095, 0.135, 0.42, 14),
        color: null,
        position: [0, 0.3, 0],
      },
    ]),
    arms: [arm(-1, look.haori, 0.078), arm(1, look.haori, 0.078)],
    hip,
    shoulder: [0.17, 0.77],
    legSpread: 0.085,
  }
}

/** 온천 수건(흰 무명). */
const TOWEL = '#f4f1ea'
const TOWEL_FOLD = '#e4ddd0'

/** 머리 위에 접어 올린 물수건. 끝에 쪽빛 줄무늬. */
function headTowel(): Piece[] {
  return [
    {
      geometry: box(0.3, 0.05, 0.17),
      color: TOWEL,
      position: [0, HEAD_Y + 0.265, -0.05],
      rotation: [0.12, 0.18, 0.07],
    },
    {
      geometry: box(0.26, 0.03, 0.15),
      color: TOWEL_FOLD,
      position: [0.01, HEAD_Y + 0.295, -0.05],
      rotation: [0.12, 0.18, 0.07],
    },
    {
      geometry: box(0.04, 0.052, 0.172),
      color: '#6f93c0',
      position: [0.11, HEAD_Y + 0.279, -0.028],
      rotation: [0.12, 0.18, 0.07],
    },
  ]
}

/** 맨다리와 맨발. 원점은 골반 관절. */
function bareLeg(drop: number): Piece[] {
  return [
    {
      geometry: cylinder(0.052, 0.046, drop, 10),
      color: SKIN,
      position: [0, -drop / 2, 0],
    },
    {
      geometry: box(0.075, 0.04, 0.13),
      color: SKIN,
      position: [0, 0.02 - drop, -0.025],
    },
  ]
}

/** 온천 차림(여): 어깨를 드러낸 전신 수건 가운, 맨발, 머리 물수건. */
function kimonoBathParts(
  look: Extract<VisitorLook, { outfit: 'kimono' }>,
): Parts {
  const body: Piece[] = [
    {
      geometry: cylinder(0.155, 0.2, 0.5, 18),
      color: TOWEL,
      position: [0, 0.47, 0],
    },
    {
      geometry: cylinder(0.162, 0.162, 0.05, 18),
      color: TOWEL_FOLD,
      position: [0, 0.705, 0],
    },
    {
      geometry: box(0.06, 0.09, 0.02),
      color: TOWEL_FOLD,
      position: [0.08, 0.665, -0.163],
      rotation: [0, 0, 0.2],
    },
    {
      geometry: cylinder(0.148, 0.155, 0.06, 18),
      color: SKIN,
      position: [0, 0.74, 0],
    },
    {
      geometry: sphere(0.165, 16, 10),
      color: SKIN,
      position: [0, 0.765, 0],
      scale: [1, 0.45, 0.9],
    },
    ...head(look.hair, true),
    {
      geometry: sphere(0.115, 14, 10),
      color: look.hair,
      position: [0, HEAD_Y + 0.2, 0.12],
    },
    ...face(true),
    ...headTowel(),
  ]
  const hip = 0.2
  return {
    body,
    leg: bareLeg(hip),
    arms: [arm(-1, SKIN, 0.062), arm(1, SKIN, 0.062)],
    hip,
    shoulder: [0.165, 0.76],
    legSpread: 0.065,
  }
}

/** 온천 차림(남): 맨 상체에 허리 수건만 두르고 맨발, 머리 물수건. */
function hakamaBathParts(
  look: Extract<VisitorLook, { outfit: 'hakama' }>,
): Parts {
  const body: Piece[] = [
    {
      geometry: cylinder(0.158, 0.17, 0.36, 18),
      color: SKIN,
      position: [0, 0.62, 0],
    },
    {
      geometry: sphere(0.17, 16, 10),
      color: SKIN,
      position: [0, 0.775, 0],
      scale: [1, 0.45, 0.9],
    },
    {
      geometry: cylinder(0.18, 0.205, 0.24, 18),
      color: TOWEL,
      position: [0, 0.4, 0],
    },
    {
      geometry: box(0.1, 0.22, 0.02),
      color: TOWEL_FOLD,
      position: [0.1, 0.4, -0.2],
      rotation: [0, 0, 0.08],
    },
    ...head(look.hair, false),
    ...face(false),
    ...headTowel(),
  ]
  const hip = 0.5
  return {
    body,
    leg: bareLeg(hip),
    arms: [arm(-1, SKIN, 0.064), arm(1, SKIN, 0.064)],
    hip,
    shoulder: [0.17, 0.77],
    legSpread: 0.085,
  }
}

type Baked = {
  material: MeshStandardMaterial
  body: BufferGeometry
  leg: BufferGeometry
  arms: [BufferGeometry, BufferGeometry]
  hip: number
  shoulder: [number, number]
  legSpread: number
}

const bakedLooks = new Map<string, Baked>()

/** 같은 차림끼리는 구운 도형과 재질을 함께 쓴다. */
function bakedLook(look: VisitorLook, bathing = false): Baked {
  const key = JSON.stringify(look) + (bathing ? ':bath' : '')
  const existing = bakedLooks.get(key)
  if (existing) return existing
  const parts =
    look.outfit === 'kimono'
      ? bathing
        ? kimonoBathParts(look)
        : kimonoParts(look)
      : bathing
        ? hakamaBathParts(look)
        : hakamaParts(look)
  const result: Baked = {
    material: new MeshStandardMaterial({
      map: clothTexture(look),
      vertexColors: true,
      roughness: 0.72,
      side: DoubleSide,
    }),
    body: bake(parts.body),
    leg: bake(parts.leg),
    arms: [bake(parts.arms[0]), bake(parts.arms[1])],
    hip: parts.hip,
    shoulder: parts.shoulder,
    legSpread: parts.legSpread,
  }
  bakedLooks.set(key, result)
  return result
}

/** 서 있기(걷기 포함), 의자에 앉기, 앉아서 무언가 먹기, 긴 국자로 달걀 넣기. */
export type VisitorPose = 'stand' | 'sit' | 'eat' | 'ladle' | 'hang' | 'ring'

/** 종 치는 동작 길이(초): 줄을 잡고 → 뒤로 당겼다가 → 앞으로 밀어 치고 → 놓는다. */
export const RING_SECONDS = 3
/** 당목이 종에 닿는 순간(초). */
export const RING_HIT = 1.55

const smoothStep = (t: number) => {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/** 종 치는 동안 두 팔의 각도와 몸 기울기(앞으로 +). */
function ringMotion(time: number) {
  const reach = smoothStep(time / 0.5)
  const pull =
    smoothStep((time - 0.5) / 0.8) * (1 - smoothStep((time - 1.3) / 0.25))
  const thrust =
    smoothStep((time - 1.3) / 0.25) * (1 - smoothStep((time - 1.8) / 0.5))
  const release = smoothStep((time - 2.2) / 0.7)
  const arms =
    (0.15 + 1.85 * reach + 0.25 * thrust - 0.25 * pull) * (1 - release) +
    0.15 * release
  return { arms, lean: -0.14 * pull + 0.12 * thrust }
}

/** 소원패를 걸이에 거는 동작 길이(초). */
export const HANG_SECONDS = 2.4
/** 소원패가 손에서 걸이로 옮겨 가는 순간(초). */
export const HANG_RELEASE = 1.3

/** 시간에 따른 소원패 든 팔의 각도: 들어 올려 걸이에 걸고 내린다. */
function hangAngle(time: number) {
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const rise = smooth(Math.min(1, time / 0.7))
  const fall = smooth(Math.min(1, Math.max(0, (time - 1.6) / 0.8)))
  return 0.15 + 2.15 * rise * (1 - fall)
}

const PLAQUE_GEOMETRY = new BoxGeometry(0.17, 0.15, 0.02)
const PLAQUE_MATERIAL = new MeshStandardMaterial({
  color: '#d9b27a',
  roughness: 1,
})

/** 국자로 달걀을 떠서 우물에 넣는 동작 길이(초). */
export const LADLE_SECONDS = 2.8
/** 국자 끝이 물에 잠기는 순간(초). 이때 달걀이 국자에서 우물로 옮겨 간다. */
const LADLE_DIP = 1.9

/** 시간에 따른 국자 든 팔의 각도: 들어 올려 우물 위로 → 살짝 흔들다 물에 담그기 → 내려놓기. */
function ladleAngle(time: number) {
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const span = (from: number, to: number, start: number, end: number) =>
    from +
    (to - from) *
      smooth(Math.min(1, Math.max(0, (time - start) / (end - start))))
  if (time < 0.6) return span(0.3, 2.55, 0, 0.6)
  if (time < 1.3) return 2.55 + Math.sin((time - 0.6) * 14) * 0.04
  if (time < 2.3) return span(2.55, 2.3, 1.3, LADLE_DIP)
  return span(2.3, 0.3, 2.3, LADLE_SECONDS)
}

const LADLE_LENGTH = 1.75
const LADLE_HANDLE = new CylinderGeometry(0.016, 0.016, LADLE_LENGTH, 6)
const LADLE_CUP = new SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI / 2)
/** 나무 국자: 반사 없이 무광으로. */
const LADLE_MATERIAL = new MeshStandardMaterial({
  color: '#a8743f',
  metalness: 0,
  roughness: 1,
  side: DoubleSide,
})

const EGG_GEOMETRY = new SphereGeometry(0.05, 10, 8).scale(1, 1.25, 1)
const EGG_MATERIAL = new MeshStandardMaterial({
  color: '#f3ecdc',
  roughness: 0.5,
})

/**
 * 머리·팔·다리·옷을 갖춘 이등신 방문자. 앞(얼굴)은 -Z 방향.
 * motion.current(0~1)에 따라 팔다리를 흔들며 걷는다. 한 명당 그리기 5번.
 * pose가 sit이면 엉덩이가 원점에 오도록 내려앉고, eat이면 손에 든 달걀을 입으로 가져간다.
 */
export function VisitorModel({
  look,
  motion,
  pose = 'stand',
  bathing = false,
}: {
  look: VisitorLook
  motion?: RefObject<number>
  pose?: VisitorPose
  /** 온천 안: 목욕 차림(여 전신 수건 가운, 남 허리 수건)과 머리 물수건. */
  bathing?: boolean
}) {
  const model = bakedLook(look, bathing)
  const legs = useRef<(Group | null)[]>([])
  const arms = useRef<(Group | null)[]>([])
  const body = useRef<Group>(null)
  const root = useRef<Group>(null)
  const phase = useRef(0)
  const settle = useRef(0)
  const bite = useRef(0)
  const ladleTime = useRef(0)
  const hangTime = useRef(0)
  const ringTime = useRef(0)
  const [holdingPlaque, setHoldingPlaque] = useState(true)
  const [holdingEgg, setHoldingEgg] = useState(true)

  useFrame((_state, delta) => {
    const speed = pose === 'stand' ? Math.min(1, motion?.current ?? 0) : 0
    const seated = pose === 'sit' || pose === 'eat' ? 1 : 0
    const ease = Math.min(1, delta * 8)
    settle.current += (seated - settle.current) * ease
    if (Math.abs(seated - settle.current) < 0.001) settle.current = seated
    const sit = settle.current
    if (speed === 0 && phase.current === 0 && sit === 0 && pose === 'stand')
      return
    phase.current = speed === 0 ? 0 : phase.current + delta * 9 * speed
    bite.current = pose === 'eat' ? bite.current + delta : 0
    ladleTime.current = pose === 'ladle' ? ladleTime.current + delta : 0
    hangTime.current = pose === 'hang' ? hangTime.current + delta : 0
    ringTime.current = pose === 'ring' ? ringTime.current + delta : 0
    const ring = ringMotion(ringTime.current)
    const released = hangTime.current >= HANG_RELEASE
    if (pose === 'hang' && released === holdingPlaque)
      setHoldingPlaque(!released)
    if (pose !== 'hang' && !holdingPlaque) setHoldingPlaque(true)
    const dipped = ladleTime.current >= LADLE_DIP
    if (pose === 'ladle' && dipped === holdingEgg) setHoldingEgg(!dipped)
    if (pose !== 'ladle' && !holdingEgg) setHoldingEgg(true)
    const swing = Math.sin(phase.current) * speed
    // 앉으면 다리를 앞으로 내밀고, 손은 무릎 위에 모은다.
    legs.current.forEach((limb, index) => {
      if (limb)
        limb.rotation.x =
          swing * 0.55 * (index === 0 ? 1 : -1) * (1 - sit) + 1.3 * sit
    })
    // 먹을 때는 한쪽 팔을 입가로 올렸다 내렸다 한다.
    const chew = pose === 'eat' ? 2.35 + Math.sin(bite.current * 3) * 0.18 : 0
    arms.current.forEach((limb, index) => {
      if (!limb) return
      const walking = swing * 0.5 * (index === 0 ? -1 : 1) * (1 - sit)
      if (pose === 'ring') {
        limb.rotation.x = ring.arms
        return
      }
      if (pose === 'hang') {
        limb.rotation.x = index === 1 ? hangAngle(hangTime.current) : 0.15
        return
      }
      if (pose === 'ladle') {
        limb.rotation.x = index === 1 ? ladleAngle(ladleTime.current) : 0.15
        return
      }
      const seatedArm = index === 1 && pose === 'eat' ? chew : 0.45
      limb.rotation.x = walking + seatedArm * sit
    })
    if (body.current)
      body.current.position.y =
        Math.abs(Math.cos(phase.current)) * 0.03 * speed +
        (pose === 'hang'
          ? Math.sin(Math.min(1, hangTime.current / 2.4) * Math.PI) * 0.06
          : 0)
    if (root.current) {
      root.current.position.y = -model.hip * sit
      root.current.rotation.x = pose === 'ring' ? -ring.lean : 0
    }
  })

  return (
    <group ref={root}>
      {[-1, 1].map((side, index) => (
        <group
          key={side}
          position={[side * model.legSpread, model.hip, 0]}
          ref={(node) => {
            legs.current[index] = node
          }}
        >
          <mesh geometry={model.leg} material={model.material} />
        </group>
      ))}
      <group ref={body}>
        <mesh geometry={model.body} material={model.material} />
        {[-1, 1].map((side, index) => (
          <group
            key={side}
            position={[side * model.shoulder[0], model.shoulder[1], 0]}
            ref={(node) => {
              arms.current[index] = node
            }}
          >
            <mesh geometry={model.arms[index]} material={model.material} />
            {index === 1 && pose === 'ladle' && (
              <group position-y={-0.36}>
                <mesh
                  geometry={LADLE_HANDLE}
                  material={LADLE_MATERIAL}
                  position-y={-LADLE_LENGTH / 2}
                />
                <mesh
                  geometry={LADLE_CUP}
                  material={LADLE_MATERIAL}
                  position={[0, -LADLE_LENGTH, 0.02]}
                  rotation-x={-Math.PI / 2}
                />
                {holdingEgg && (
                  <mesh
                    geometry={EGG_GEOMETRY}
                    material={EGG_MATERIAL}
                    position={[0, -LADLE_LENGTH, -0.03]}
                    rotation-x={Math.PI / 2}
                  />
                )}
              </group>
            )}
            {index === 1 && pose === 'hang' && holdingPlaque && (
              <mesh
                geometry={PLAQUE_GEOMETRY}
                material={PLAQUE_MATERIAL}
                position={[0, -0.43, -0.04]}
              />
            )}
            {index === 1 && pose === 'eat' && (
              <mesh
                geometry={EGG_GEOMETRY}
                material={EGG_MATERIAL}
                position={[0, -0.41, -0.04]}
              />
            )}
          </group>
        ))}
      </group>
    </group>
  )
}
