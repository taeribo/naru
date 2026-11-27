import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Path,
  RepeatWrapping,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { InstancedMesh, MeshPhysicalMaterial } from 'three'
import { Architecture } from './EntranceArchitecture'
import { SnowCap } from './SnowCap'
import { SteamPlume } from './SteamPlume'
import { projectSurfaceUvs, useSurface } from './surfaces'

/** 탕 안쪽 반지름(가로, 세로). 로컬 좌표는 탕 한가운데가 원점이다. */
export const BATH = { a: 8.4, b: 4.7, curb: 0.95, water: 0.5 }

function random(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** 자연석으로 둘러싼 듯 살짝 일그러진 타원 윤곽. */
function outline(a: number, b: number, count = 56) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2
    const wobble =
      1 +
      0.07 * Math.sin(3 * angle + 0.8) +
      0.05 * Math.sin(5 * angle + 2.1) +
      0.03 * Math.sin(2 * angle)
    return new Vector2(
      Math.cos(angle) * a * wobble,
      Math.sin(angle) * b * wobble,
    )
  })
}

/** 잔물결 법선 맵: 이어 붙여도 티가 나지 않는 사인파 합성. */
function createRippleNormal() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const tau = Math.PI * 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * tau
      const v = (y / size) * tau
      const dx =
        Math.cos(u * 2 + v) * 2 + Math.cos(u * 3 - v * 2) * 3 + Math.cos(u) * 1
      const dy =
        Math.cos(u * 2 + v) * 1 -
        Math.cos(u * 3 - v * 2) * 2 +
        Math.cos(v * 3) * 2
      const length = Math.hypot(dx * 0.05, dy * 0.05, 1)
      const index = (y * size + x) * 4
      image.data[index] = ((-dx * 0.05) / length) * 127 + 128
      image.data[index + 1] = ((-dy * 0.05) / length) * 127 + 128
      image.data[index + 2] = (1 / length) * 127 + 128
      image.data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(1 / 2.6, 1 / 2.6)
  return texture
}

/** 돌 테두리, 바위, 우윳빛 온천수. */
function Pool() {
  const stone = useSurface('stone')
  const { curb, rocks, ground, waterGeometry, ripples } = useMemo(() => {
    const inner = outline(BATH.a, BATH.b)
    const outer = outline(BATH.a + BATH.curb, BATH.b + BATH.curb)
    const shape = new Shape(outer)
    shape.holes.push(new Path(inner))
    const extruded = new ExtrudeGeometry(shape, {
      depth: 0.62,
      bevelEnabled: false,
      curveSegments: 1,
    })
    extruded.rotateX(-Math.PI / 2)
    projectSurfaceUvs(extruded)
    const water = new ShapeGeometry(
      new Shape(outline(BATH.a + 0.05, BATH.b + 0.05)),
    )
    water.rotateX(-Math.PI / 2)
    const floor = new ShapeGeometry(
      new Shape(outline(BATH.a + 0.05, BATH.b + 0.05)),
    )
    floor.rotateX(-Math.PI / 2)
    const rand = random(31)
    const rim = outline(
      BATH.a + BATH.curb + 0.15,
      BATH.b + BATH.curb + 0.15,
      34,
    )
    const stones = rim.map((point) => ({
      x: point.x,
      z: -point.y,
      size: 0.55 + rand() * 0.55,
      yaw: rand() * 6,
      lean: 0.7 + rand() * 0.5,
    }))
    return {
      curb: extruded,
      rocks: stones,
      ground: floor,
      waterGeometry: water,
      ripples: createRippleNormal(),
    }
  }, [])
  const water = useRef<MeshPhysicalMaterial>(null)
  const rockMesh = useRef<InstancedMesh>(null)
  const snowMesh = useRef<InstancedMesh>(null)

  useFrame(({ clock }) => {
    if (!water.current?.normalMap) return
    water.current.normalMap.offset.set(
      clock.elapsedTime * 0.012,
      clock.elapsedTime * 0.008,
    )
  })

  const matrices = useMemo(() => {
    const up = new Vector3(0, 1, 0)
    const make = (
      x: number,
      y: number,
      z: number,
      yaw: number,
      sx: number,
      sy: number,
      sz: number,
    ) =>
      new Matrix4().compose(
        new Vector3(x, y, z),
        new Quaternion().setFromAxisAngle(up, yaw),
        new Vector3(sx, sy, sz),
      )
    return {
      rockMatrices: rocks.map(({ x, z, size, yaw, lean }) =>
        make(x, 0.32, z, yaw, size * 1.2, size * 0.62 * lean, size),
      ),
      snowMatrices: rocks.map(({ x, z, size, yaw, lean }) =>
        make(
          x,
          0.32 + size * 0.5 * lean,
          z,
          yaw,
          size,
          size * 0.22,
          size * 0.82,
        ),
      ),
    }
  }, [rocks])

  return (
    <group>
      <mesh geometry={ground} position-y={0.06}>
        <meshStandardMaterial color="#16444f" roughness={0.6} />
      </mesh>
      <mesh geometry={waterGeometry} position-y={BATH.water}>
        <meshPhysicalMaterial
          ref={water}
          color="#3fa2b4"
          emissive="#1f7d8c"
          emissiveIntensity={0.55}
          transparent
          opacity={0.92}
          roughness={0.28}
          envMapIntensity={0.45}
          normalMap={ripples}
          normalScale={new Vector2(0.9, 0.9)}
        />
      </mesh>
      <mesh geometry={curb} castShadow receiveShadow>
        <meshStandardMaterial {...stone} color="#9a949c" roughness={1} />
        <SnowCap source={curb} thickness={0.1} />
      </mesh>
      <instancedMesh
        ref={rockMesh}
        args={[undefined, undefined, rocks.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
        onUpdate={(mesh) => {
          matrices.rockMatrices.forEach((m, index) =>
            mesh.setMatrixAt(index, m),
          )
          mesh.instanceMatrix.needsUpdate = true
        }}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial {...stone} color="#8b858f" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={snowMesh}
        args={[undefined, undefined, rocks.length]}
        frustumCulled={false}
        onUpdate={(mesh) => {
          matrices.snowMatrices.forEach((m, index) =>
            mesh.setMatrixAt(index, m),
          )
          mesh.instanceMatrix.needsUpdate = true
        }}
      >
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial color="#e8ecf2" roughness={1} />
      </instancedMesh>
    </group>
  )
}

/** 물 위에 뜬 나무통(오케). 안에 수건, 술상 등이 들어간다. */
function Oke({
  contents,
  scale = 1,
}: {
  contents?: 'towels' | 'empty'
  scale?: number
}) {
  const wood = useSurface('wood')
  return (
    <group scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.62, 0.5, 0.46, 28, 1, true]} />
        <meshStandardMaterial
          {...wood}
          color="#efc58d"
          roughness={0.9}
          side={DoubleSide}
        />
      </mesh>
      <mesh position-y={-0.2} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.5, 24]} />
        <meshStandardMaterial {...wood} color="#a97a4c" />
      </mesh>
      {[0.13, -0.13].map((y) => (
        <mesh key={y} position-y={y} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.575 - y * 0.25, 0.017, 6, 28]} />
          <meshStandardMaterial
            color="#3a2c22"
            roughness={0.6}
            metalness={0.3}
          />
        </mesh>
      ))}
      {contents === 'towels' && (
        <group position-y={-0.1}>
          {[0, 1, 2].map((layer) => (
            <mesh
              key={layer}
              position={[0.02 * layer, 0.06 + layer * 0.115, 0]}
              rotation-y={0.2 + layer * 0.55}
              castShadow
            >
              <boxGeometry args={[0.5, 0.1, 0.3]} />
              <meshStandardMaterial
                color={layer === 1 ? '#e9d6b4' : '#f2ecde'}
                roughness={1}
              />
            </mesh>
          ))}
          <mesh position={[0.18, 0.4, 0.05]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.07, 0.07, 0.36, 12]} />
            <meshStandardMaterial color="#e0efe9" roughness={1} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/** 물 위에 떠 있는 술상: 붉은 칠 쟁반에 도쿠리와 잔. */
function SakeTray() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.78, 0.05, 0.46]} />
        <meshStandardMaterial color="#6f1f1a" roughness={0.35} />
      </mesh>
      <mesh position={[-0.2, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.085, 0.2, 12]} />
        <meshStandardMaterial color="#ece7dd" roughness={0.3} />
      </mesh>
      <mesh position={[-0.2, 0.27, 0]}>
        <cylinderGeometry args={[0.028, 0.045, 0.08, 10]} />
        <meshStandardMaterial color="#ece7dd" roughness={0.3} />
      </mesh>
      {[0.12, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.065, x === 0.12 ? 0.07 : -0.06]}>
          <cylinderGeometry args={[0.05, 0.035, 0.05, 12]} />
          <meshStandardMaterial color="#e6e1d6" roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** 천천히 떠다니는 물건들. 탕 안쪽에서만 맴돈다. */
const FLOATERS: {
  kind: 'towels' | 'empty' | 'sake'
  rx: number
  rz: number
  speed: number
  phase: number
  scale?: number
}[] = [
  { kind: 'towels', rx: 4.8, rz: 2.3, speed: 0.07, phase: 0.4, scale: 1.25 },
  { kind: 'towels', rx: 3.2, rz: 1.6, speed: -0.05, phase: 2.6, scale: 1.1 },
  { kind: 'empty', rx: 5.6, rz: 2.8, speed: 0.045, phase: 4.1, scale: 1 },
  { kind: 'sake', rx: 4.2, rz: 2.0, speed: -0.06, phase: 1.5 },
]

function Floaters() {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    group.current?.children.forEach((child, index) => {
      const { rx, rz, speed, phase } = FLOATERS[index]
      const angle = phase + time * speed
      child.position.set(
        Math.cos(angle) * rx,
        BATH.water + 0.07 + Math.sin(time * 1.3 + phase * 3) * 0.012,
        Math.sin(angle) * rz,
      )
      child.rotation.y = phase + time * speed * 0.8
      child.rotation.z = Math.sin(time * 0.9 + phase) * 0.025
    })
  })
  return (
    <group ref={group}>
      {FLOATERS.map((item, index) => (
        <group key={index}>
          {item.kind === 'sake' ? (
            <SakeTray />
          ) : (
            <Oke contents={item.kind} scale={item.scale} />
          )}
        </group>
      ))}
    </group>
  )
}

/** 대나무를 엮은 사방 울타리(요쓰메가키) 한 구간. */
function BambooFence({
  from,
  to,
}: {
  from: [number, number]
  to: [number, number]
}) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)
  const yaw = Math.atan2(-dz, dx)
  const count = Math.max(2, Math.round(length / 0.5))
  return (
    <group position={[from[0], 0, from[1]]} rotation-y={yaw}>
      <instancedMesh
        args={[undefined, undefined, count + 1]}
        castShadow
        frustumCulled={false}
        onUpdate={(mesh) => {
          const matrix = new Matrix4()
          for (let index = 0; index <= count; index++) {
            matrix.makeTranslation((index / count) * length, 1.15, 0)
            mesh.setMatrixAt(index, matrix)
          }
          mesh.instanceMatrix.needsUpdate = true
        }}
      >
        <cylinderGeometry args={[0.06, 0.068, 2.3, 7]} />
        <meshStandardMaterial color="#a8b36f" roughness={0.6} />
      </instancedMesh>
      {[0.45, 1.2, 1.9].map((y) => (
        <mesh
          key={y}
          position={[length / 2, y, 0.08]}
          rotation-z={Math.PI / 2}
          castShadow
        >
          <cylinderGeometry args={[0.045, 0.045, length + 0.1, 6]} />
          <meshStandardMaterial color="#8f9a58" roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[length / 2, 2.35, 0]}>
        <boxGeometry args={[length + 0.2, 0.07, 0.14]} />
        <meshStandardMaterial color="#e8ecf2" roughness={1} />
      </mesh>
    </group>
  )
}

/** 시시오도시: 물이 차면 기울어 대나무 소리를 내는 장치. */
function ShishiOdoshi() {
  const arm = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!arm.current) return
    const phase = (clock.elapsedTime % 5) / 5
    // 천천히 차오르다(기울기 감소) 순식간에 뒤집히는 움직임.
    arm.current.rotation.z =
      phase < 0.82 ? 0.12 - phase * 0.1 : -0.1 + ((phase - 0.82) / 0.18) * 0.62
  })
  return (
    <group>
      {[-0.34, 0.34].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]} castShadow>
          <boxGeometry args={[0.12, 1.1, 0.12]} />
          <meshStandardMaterial color="#4f3a2a" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.86, 0.09, 0.1]} />
        <meshStandardMaterial color="#4f3a2a" roughness={0.95} />
      </mesh>
      <group ref={arm} position={[0, 0.82, 0]}>
        <mesh
          rotation-z={Math.PI / 2 - 0.15}
          position={[0.12, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.07, 0.075, 0.66, 10]} />
          <meshStandardMaterial color="#b5bd77" roughness={0.55} />
        </mesh>
      </group>
      <mesh position={[0.34, 1.3, 0]} rotation-z={-0.9}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#9aa660" roughness={0.6} />
      </mesh>
      <mesh position={[0.62, 0.95, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.55, 5]} />
        <meshBasicMaterial color="#cfe9f2" transparent opacity={0.65} />
      </mesh>
    </group>
  )
}

/** 탕 옆 벗어둔 곳: 낮은 벤치, 수건, 물통. */
function Datsuijo() {
  const wood = useSurface('wood')
  return (
    <group>
      <mesh position-y={0.42} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.1, 0.8]} />
        <meshStandardMaterial {...wood} color="#9b7248" roughness={0.95} />
      </mesh>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.1, 0.4, 0.7]} />
          <meshStandardMaterial {...wood} color="#7a5638" />
        </mesh>
      ))}
      {[-0.7, -0.05, 0.6].map((x, index) => (
        <mesh key={x} position={[x, 0.52, 0]} rotation-y={index * 0.3}>
          <boxGeometry args={[0.55, 0.1, 0.34]} />
          <meshStandardMaterial
            color={['#f2ecde', '#d9e4ea', '#efe0c4'][index]}
            roughness={1}
          />
        </mesh>
      ))}
      <group position={[1.7, 0.2, 0.4]}>
        <Oke contents="empty" scale={0.62} />
      </group>
      <group position={[-1.7, 0.2, 0.2]} rotation-y={1}>
        <Oke contents="empty" scale={0.62} />
      </group>
    </group>
  )
}

/** 눈이 덮인 둔덕. */
function SnowBanks({ spots }: { spots: [number, number, number, number][] }) {
  return (
    <>
      {spots.map(([x, z, size, flat], index) => (
        <mesh key={index} position={[x, 0, z]} scale={[size * 1.5, flat, size]}>
          <sphereGeometry args={[1, 14, 8]} />
          <meshStandardMaterial color="#e6eaf1" roughness={1} />
        </mesh>
      ))}
    </>
  )
}

/** 노천탕(로텐부로): 탕, 떠다니는 나무통·술상·유자, 대나무 울타리, 석등, 김. */
export function OnsenBath() {
  const deck = useSurface('wood')
  const deckGeometry = useMemo(
    () => projectSurfaceUvs(new BoxGeometry(27, 0.3, 3.4)),
    [],
  )
  return (
    <group>
      <Pool />
      <Floaters />

      {/* 건물 쪽 나무 데크 */}
      <mesh
        geometry={deckGeometry}
        position={[4, 0.15, -9.6]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial {...deck} color="#8d6a48" roughness={0.95} />
        <SnowCap source={deckGeometry} thickness={0.06} />
      </mesh>

      {/* 대나무 울타리: 남쪽과 동쪽 */}
      <BambooFence from={[-9.5, 8.2]} to={[12.8, 8.2]} />
      <BambooFence from={[12.8, 8.2]} to={[12.8, -6.8]} />
      <group position={[9.4, 0, 6.6]} rotation-y={-0.4}>
        <ShishiOdoshi />
      </group>

      {/* 석등 */}
      <Architecture
        model="stone-lantern"
        position={[-9.6, 0, 6.2]}
        scale={0.95}
      />
      <Architecture
        model="stone-lantern"
        position={[10.6, 0, -6.4]}
        scale={0.95}
        yaw={2.4}
      />
      <Architecture
        model="stone-lantern"
        position={[-9.8, 0, -6.5]}
        scale={0.9}
        yaw={0.6}
      />

      {/* 탈의 쉼터 */}
      <group position={[-12.2, 0, 1.4]} rotation-y={Math.PI / 2}>
        <Datsuijo />
      </group>

      <SnowBanks
        spots={[
          [-11, 7.6, 1.6, 0.42],
          [3, 9.4, 2.4, 0.5],
          [13.6, 9.3, 2.1, 0.45],
          [14.8, 1.2, 1.8, 0.5],
          [14.6, -7.6, 1.9, 0.45],
          [-12.8, -6.9, 1.5, 0.4],
          [-14.6, 5.5, 1.4, 0.35],
        ]}
      />

      {/* 탕 위로 피어오르는 김 */}
      <SteamPlume
        position={[0, 0.55, 0]}
        radius={7.4}
        height={4.8}
        count={120}
        size={2.6}
        opacity={0.4}
        seed={3}
      />
      <SteamPlume
        position={[0.5, 0.55, 0.5]}
        radius={3.4}
        height={6.2}
        count={40}
        size={2.2}
        opacity={0.4}
        speed={0.07}
        seed={9}
      />

      <pointLight
        position={[-9.6, 2.2, 6.2]}
        color="#ffb766"
        intensity={13}
        distance={9}
      />
      <pointLight
        position={[10.6, 2.2, -6.4]}
        color="#ffb766"
        intensity={12}
        distance={9}
      />
      <pointLight
        position={[0, 1.6, -3.2]}
        color="#7fd0d0"
        intensity={8}
        distance={9}
      />
    </group>
  )
}
