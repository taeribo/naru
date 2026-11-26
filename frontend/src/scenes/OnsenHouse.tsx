import { useMemo } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three'
import type { BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SnowCap } from './SnowCap'
import { SteamPlume } from './SteamPlume'
import { roofGeometry } from './shapes'
import { projectSurfaceUvs, useSurface } from './surfaces'

const PLASTER = '#eee5d1'

/** 장지(障子)창: 따뜻하게 비치는 한지에 나무 살. 모든 창이 같은 그림을 쓴다. */
let shojiTexture: CanvasTexture | null = null
function getShoji() {
  if (shojiTexture) return shojiTexture
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 160
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, 160)
  gradient.addColorStop(0, '#ffc77a')
  gradient.addColorStop(1, '#ffe2a8')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 160)
  ctx.strokeStyle = '#3a2619'
  ctx.lineWidth = 5
  ctx.strokeRect(2, 2, 124, 156)
  ctx.lineWidth = 3
  for (let column = 1; column < 3; column++) {
    ctx.beginPath()
    ctx.moveTo((128 / 3) * column, 0)
    ctx.lineTo((128 / 3) * column, 160)
    ctx.stroke()
  }
  for (let row = 1; row < 4; row++) {
    ctx.beginPath()
    ctx.moveTo(0, (160 / 4) * row)
    ctx.lineTo(128, (160 / 4) * row)
    ctx.stroke()
  }
  shojiTexture = new CanvasTexture(canvas)
  shojiTexture.colorSpace = SRGBColorSpace
  shojiTexture.anisotropy = 4
  return shojiTexture
}

/** 입구 노렌: 남색 천에 '湯'. 세 폭으로 갈라진 모양을 그린다. */
let norenTexture: CanvasTexture | null = null
function getNoren() {
  if (norenTexture) return norenTexture
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 160
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#212c57'
  ctx.fillRect(0, 0, 384, 160)
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  for (let y = 0; y < 160; y += 5) ctx.fillRect(0, y, 384, 1)
  ctx.fillStyle = '#0b0f26'
  ;[128, 256].forEach((x) => ctx.fillRect(x - 2, 40, 4, 120))
  ctx.fillStyle = '#f2e8d2'
  ctx.fillRect(0, 0, 384, 12)
  ctx.font = 'bold 104px "Noto Serif JP", "Yu Mincho", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('湯', 192, 86)
  norenTexture = new CanvasTexture(canvas)
  norenTexture.colorSpace = SRGBColorSpace
  norenTexture.anisotropy = 4
  return norenTexture
}

function box(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
) {
  const geometry = new BoxGeometry(width, height, depth)
  geometry.translate(x, y, z)
  return geometry
}

/** 앞면(+z)에 붙는 장지 창 한 장. */
function pane(width: number, height: number, x: number, y: number, z: number) {
  const geometry = new PlaneGeometry(width, height)
  geometry.translate(x, y, z)
  return geometry
}

/** 벽 앞에 붙는 목조 뼈대(기둥·보)와 난간, 장지창을 모은 형상. */
function buildFrame() {
  const frame: BufferGeometry[] = []
  const rails: BufferGeometry[] = []
  const panes: BufferGeometry[] = []

  // 본관 아래층·위층: 기둥, 보, 창
  const body = { half: 6, front: 4 }
  ;[
    { y0: 1.0, y1: 4.3, spacing: 1.5, paneY: 2.75, paneH: 1.9 },
    { y0: 4.3, y1: 7.5, spacing: 1.3, paneY: 6.05, paneH: 1.7 },
  ].forEach(({ y0, y1, spacing, paneY, paneH }, floor) => {
    const count = Math.round((body.half * 2) / spacing)
    for (let index = 0; index <= count; index++) {
      const x = -body.half + (index / count) * body.half * 2
      frame.push(box(0.2, y1 - y0, 0.24, x, (y0 + y1) / 2, body.front + 0.06))
      if (index < count) {
        const center = x + body.half / count
        // 가운데 입구 구간은 창 대신 큰 문이 있다.
        if (floor === 0 && Math.abs(center) < 2.4) continue
        panes.push(
          pane(spacing - 0.38, paneH, center, paneY, body.front + 0.03),
        )
      }
    }
    ;[y0 + 0.1, y1 - 0.12, (y0 + y1) / 2 + 0.95].forEach((y) =>
      frame.push(box(body.half * 2 + 0.5, 0.2, 0.28, 0, y, body.front + 0.08)),
    )
  })
  // 입구 큰 문
  panes.push(pane(3.6, 2.7, 0, 2.4, body.front + 0.04))
  // 옆면 기둥(좌우 끝 모서리)
  ;[-1, 1].forEach((side) =>
    frame.push(box(0.26, 6.6, 8.2, side * (body.half + 0.04), 4.3, 0)),
  )

  // 2층 발코니와 난간
  frame.push(box(12.8, 0.16, 1.5, 0, 4.25, body.front + 0.75))
  for (let x = -6.2; x <= 6.21; x += 0.62) {
    rails.push(box(0.09, 0.95, 0.09, x, 4.8, body.front + 1.38))
  }
  ;[5.12, 4.8, 4.5].forEach((y) =>
    rails.push(box(12.6, 0.07, 0.1, 0, y, body.front + 1.38)),
  )
  // 발코니를 받치는 보
  for (let x = -6; x <= 6; x += 1.5) {
    frame.push(box(0.16, 0.16, 1.4, x, 3.95, body.front + 0.7))
  }

  // 날개채(좌우): 기둥과 창
  ;[-1, 1].forEach((side) => {
    for (let index = 0; index <= 4; index++) {
      const x = side * (6.2 + index * 1.8)
      frame.push(box(0.18, 3.0, 0.22, x, 2.5, 3.56))
      if (index < 4) {
        panes.push(pane(1.35, 1.65, x + side * 0.9, 2.55, 3.53))
      }
    }
    frame.push(box(7.8, 0.18, 0.26, side * 10.1, 1.1, 3.6))
    frame.push(box(7.8, 0.18, 0.26, side * 10.1, 3.88, 3.6))
  })

  // 지붕 위 작은 누각 창
  panes.push(pane(1.7, 1.5, 0, 10.3, 1.72))

  // 입구 현관 기둥과 보
  ;[-3.3, 3.3].forEach((x) => frame.push(box(0.3, 3.0, 0.3, x, 2.05, 8.4)))
  frame.push(box(7.2, 0.26, 0.34, 0, 3.45, 8.4))

  const frameGeometry = projectSurfaceUvs(mergeGeometries(frame))
  const railGeometry = mergeGeometries(rails)
  const paneGeometry = mergeGeometries(panes)
  return { frameGeometry, railGeometry, paneGeometry }
}

/** 붉은 등롱 한 줄: 처마 밑에 나란히. */
function LanternRow({ points }: { points: [number, number, number][] }) {
  return (
    <instancedMesh
      args={[undefined, undefined, points.length]}
      frustumCulled={false}
      onUpdate={(mesh) => {
        const matrix = new Matrix4()
        points.forEach(([x, y, z], index) => {
          matrix.compose(
            new Vector3(x, y, z),
            new Quaternion(),
            new Vector3(0.24, 0.31, 0.24),
          )
          mesh.setMatrixAt(index, matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
      }}
    >
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial
        color="#e86a3c"
        emissive="#ff7a38"
        emissiveIntensity={1.4}
        roughness={0.85}
      />
    </instancedMesh>
  )
}

/** 도고 온천풍 3층 목조 온천 여관: 흰 회벽, 짙은 목재 뼈대, 검은 기와 지붕, 녹청색 날개채. */
export function OnsenHouse() {
  const wood = useSurface('wood')
  const tile = useSurface('roof')
  const stone = useSurface('stone')
  const noren = getNoren()
  const shoji = getShoji()
  const { frameGeometry, railGeometry, paneGeometry } = useMemo(buildFrame, [])
  const mainRoof = useMemo(() => roofGeometry(7.5, 5.3, 2.4, 0.6), [])
  const cupolaRoof = useMemo(() => roofGeometry(2.6, 2.6, 1.2, 0.3), [])
  const wingRoof = useMemo(() => roofGeometry(5.1, 4.5, 1.4, 0.4), [])
  const porchRoof = useMemo(() => roofGeometry(3.9, 2.5, 0.6, 0.3), [])

  const wingLanterns = useMemo(
    () =>
      [-1, 1].flatMap((side) =>
        Array.from({ length: 5 }, (_, index): [number, number, number] => [
          side * (7.3 + index * 1.5),
          3.55,
          4.4,
        ]),
      ),
    [],
  )
  const balconyLanterns = useMemo(
    () =>
      [-6, -5.1, -4.2, 4.2, 5.1, 6].map((x): [number, number, number] => [
        x,
        3.85,
        5.6,
      ]),
    [],
  )

  return (
    <group>
      {/* 기단(이시가키) */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[28.4, 1.0, 10.4]} />
        <meshStandardMaterial {...stone} color="#8f8a93" roughness={1} />
      </mesh>

      {/* 회벽 몸체 */}
      <mesh position={[0, 4.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 6.5, 8]} />
        <meshStandardMaterial color={PLASTER} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 10.1, 2.5, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[7.8, 3.0, 7.0]} />
          <meshStandardMaterial color="#e9dfc9" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 10.3, 0]} castShadow>
        <boxGeometry args={[3.4, 2.6, 3.4]} />
        <meshStandardMaterial color={PLASTER} roughness={1} />
      </mesh>

      {/* 목조 뼈대 · 창 · 난간 */}
      <mesh geometry={frameGeometry} castShadow>
        <meshStandardMaterial {...wood} color="#4a3426" roughness={0.92} />
      </mesh>
      <mesh geometry={railGeometry} castShadow>
        <meshStandardMaterial color="#7b2e22" roughness={0.7} />
      </mesh>
      <mesh geometry={paneGeometry}>
        <meshStandardMaterial
          map={shoji}
          emissiveMap={shoji}
          emissive="#ffffff"
          emissiveIntensity={1.15}
          roughness={0.9}
        />
      </mesh>

      {/* 지붕: 본관(검은 기와), 누각, 날개채(녹청색), 현관 */}
      <mesh geometry={mainRoof} position={[0, 7.5, 0]} castShadow>
        <meshStandardMaterial {...tile} color="#5b5e6c" roughness={0.9} />
        <SnowCap source={mainRoof} thickness={0.2} />
      </mesh>
      <mesh geometry={cupolaRoof} position={[0, 11.6, 0]} castShadow>
        <meshStandardMaterial {...tile} color="#4d505e" roughness={0.9} />
        <SnowCap source={cupolaRoof} thickness={0.15} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={wingRoof}
          position={[side * 10.1, 4.0, 0]}
          castShadow
        >
          <meshStandardMaterial {...tile} color="#6fa591" roughness={0.85} />
          <SnowCap source={wingRoof} thickness={0.17} />
        </mesh>
      ))}
      <mesh geometry={porchRoof} position={[0, 3.5, 6.6]} castShadow>
        <meshStandardMaterial {...tile} color="#5b5e6c" roughness={0.9} />
        <SnowCap source={porchRoof} thickness={0.16} />
      </mesh>
      {/* 용마루 장식 */}
      <mesh position={[0, 12.95, 0]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#d6b04a" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* 현관: 노렌 편액 큰 등롱 */}
      <mesh position={[0, 3.35, 4.2]}>
        <planeGeometry args={[4.2, 1.6]} />
        <meshStandardMaterial
          map={noren}
          emissiveMap={noren}
          emissive="#ffffff"
          emissiveIntensity={0.22}
          roughness={1}
        />
      </mesh>
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 2.95, 6.4]} scale={[0.4, 0.55, 0.4]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial
            color="#f0cf96"
            emissive="#ff9f48"
            emissiveIntensity={1.5}
            roughness={0.8}
          />
        </mesh>
      ))}
      {/* 현관 앞 디딤돌 */}
      <mesh position={[0, 0.55, 7.2]} receiveShadow>
        <boxGeometry args={[5.4, 0.2, 2.4]} />
        <meshStandardMaterial {...stone} color="#9a949c" />
      </mesh>

      <LanternRow points={wingLanterns} />
      <LanternRow points={balconyLanterns} />

      {/* 굴뚝과 온천 김 */}
      <mesh position={[-9.4, 5.0, -2.2]} castShadow>
        <boxGeometry args={[1.1, 8.0, 1.1]} />
        <meshStandardMaterial {...stone} color="#6b5a55" roughness={1} />
      </mesh>
      <SteamPlume
        position={[-9.4, 9.1, -2.2]}
        radius={0.5}
        height={6}
        count={26}
        size={1.9}
        opacity={0.3}
        speed={0.07}
        seed={21}
      />
      {/* 지붕과 처마 위로 새는 김 */}
      <SteamPlume
        position={[5, 4.3, 0.5]}
        radius={2}
        height={3.6}
        count={20}
        size={1.4}
        opacity={0.2}
        speed={0.05}
        seed={13}
      />

      <pointLight
        position={[0, 3.4, 7.4]}
        color="#ffb766"
        intensity={24}
        distance={13}
      />
      <pointLight
        position={[-9, 3.2, 6.2]}
        color="#ffb766"
        intensity={14}
        distance={9}
      />
      <pointLight
        position={[9, 3.2, 6.2]}
        color="#ffb766"
        intensity={14}
        distance={9}
      />
    </group>
  )
}
