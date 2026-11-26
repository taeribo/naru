import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, DoubleSide, Shape, ShapeGeometry, Vector2 } from 'three'
import type { Group } from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { POND, ZONES } from './terrain'
import { getGravelTexture, getSlabTexture } from './textures'

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function roundedRect(width: number, depth: number, radius: number) {
  const x = width / 2
  const y = depth / 2
  const shape = new Shape()
  shape.moveTo(-x + radius, -y)
  shape.lineTo(x - radius, -y)
  shape.quadraticCurveTo(x, -y, x, -y + radius)
  shape.lineTo(x, y - radius)
  shape.quadraticCurveTo(x, y, x - radius, y)
  shape.lineTo(-x + radius, y)
  shape.quadraticCurveTo(-x, y, -x, y - radius)
  shape.lineTo(-x, -y + radius)
  shape.quadraticCurveTo(-x, -y, -x + radius, -y)
  return shape
}

// 건물 사이로 난 돌길(구상도의 회색 길). 중심 x, z와 가로·세로 길이.
const PATHS: [number, number, number, number][] = [
  [0, -1.25, 3, 36.5], // 연못 ↔ 입장 계단 중앙길
  [0, -10, 26, 3], // 윗줄 건물로 가는 길
  [0, 8, 26, 3], // 아랫줄 건물로 가는 길
  [0, 32, 14, 5], // 스폰 광장(계단 아래)
]

/** 어두운 자갈 바닥 위에 돌길과 연못. 반질거리지 않는 무광 바닥. */
export function Plaza() {
  const gravel = useMemo(() => {
    const texture = getGravelTexture().clone()
    texture.repeat.set(75, 60)
    texture.needsUpdate = true
    return texture
  }, [])
  const slab = useMemo(getSlabTexture, [])
  const pathTextures = useMemo(
    () =>
      PATHS.map(([, , width, depth]) => {
        const texture = slab.clone()
        texture.repeat.set(width / 4, depth / 4)
        texture.needsUpdate = true
        return texture
      }),
    [slab],
  )
  const discTexture = useMemo(() => {
    const texture = slab.clone()
    texture.repeat.set(3.3, 3.3)
    texture.needsUpdate = true
    return texture
  }, [slab])
  const pondGeometry = useMemo(
    () =>
      new ShapeGeometry(roundedRect(POND.width, POND.depth, POND.radius), 24),
    [],
  )
  const water = useMemo(() => {
    const reflector = new Reflector(pondGeometry, {
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x4a5a9a,
      clipBias: 0.003,
    })
    reflector.rotation.x = -Math.PI / 2
    reflector.position.set(POND.cx, 0.03, POND.cz)
    return reflector
  }, [pondGeometry])

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -20]}>
        <planeGeometry args={[300, 240]} />
        <meshStandardMaterial map={gravel} roughness={1} color="#cfc4e0" />
      </mesh>
      {PATHS.map(([x, z, width, depth], index) => (
        <mesh key={index} rotation-x={-Math.PI / 2} position={[x, 0.02, z]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial map={pathTextures[index]} roughness={0.95} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
        <circleGeometry args={[6.6, 48]} />
        <meshStandardMaterial map={discTexture} roughness={0.95} />
      </mesh>
      {Object.values(ZONES).map(([x, z]) => (
        <mesh
          key={`${x}${z}`}
          rotation-x={-Math.PI / 2}
          position={[x, 0.022, z]}
        >
          <circleGeometry args={[3.4, 40]} />
          <meshStandardMaterial map={discTexture} roughness={0.95} />
        </mesh>
      ))}
      <primitive object={water} />
    </>
  )
}

const KOI = Array.from({ length: 9 }, (_, index) => ({
  phase: index * 1.3,
  speed: 0.1 + (index % 3) * 0.05,
  rx: 6 + (index % 4) * 4.5,
  rz: 2 + (index % 3) * 0.9,
}))

const KOI_STYLES = [
  { color: '#fff4ea', patch: '#e8442c' },
  { color: '#ff7a2c', patch: '#fff4ea' },
  { color: '#e8a020', patch: '#ffffff' },
]

/** 비단잉어: 타원 몸통, 흔들리는 꼬리, 등·가슴지느러미, 눈, 등 무늬. 머리가 +x 쪽. */
function KoiFish({ color, patch }: { color: string; patch: string }) {
  return (
    <group scale={1.3}>
      <mesh scale={[0.5, 0.15, 0.2]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      <group position={[-0.45, 0, 0]}>
        <mesh
          position={[-0.2, 0, 0]}
          rotation-z={-Math.PI / 2}
          scale={[0.15, 1, 1]}
        >
          <coneGeometry args={[0.24, 0.42, 3]} />
          <meshStandardMaterial
            color={color}
            roughness={0.5}
            side={DoubleSide}
          />
        </mesh>
      </group>
      <mesh position={[0.05, 0.16, 0]} rotation-z={0.5} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.09, 0.22, 4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0.22, -0.05, side * 0.19]}
          rotation-y={side * 0.6}
          scale={[0.12, 0.02, 0.06]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0.4, 0.06, side * 0.09]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
      ))}
      <mesh position={[0.08, 0.14, 0]} scale={[0.2, 0.05, 0.13]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={patch} roughness={0.6} />
      </mesh>
      <mesh position={[-0.2, 0.12, 0.04]} scale={[0.14, 0.04, 0.1]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={patch} roughness={0.6} />
      </mesh>
    </group>
  )
}

/** 연못 가장자리 바위, 연잎과 연꽃, 헤엄치는 비단잉어. */
export function PondDecor() {
  const koi = useRef<Group>(null)
  const lilies = useMemo(() => {
    const random = createRandom(5)
    return Array.from({ length: 22 }, () => ({
      x: POND.cx + (random() - 0.5) * 2 * (POND.width / 2 - 3),
      z: POND.cz + (random() - 0.5) * 2 * (POND.depth / 2 - 1.2),
      size: 0.4 + random() * 0.3,
      flower: random() < 0.4,
    }))
  }, [])
  const rocks = useMemo(() => {
    const outline = roundedRect(
      POND.width,
      POND.depth,
      POND.radius,
    ).getSpacedPoints(90)
    const ix = POND.width / 2 - POND.radius
    const iy = POND.depth / 2 - POND.radius
    const random = createRandom(77)
    return (
      outline
        .map((point) => {
          const q = new Vector2(
            point.x - Math.max(-ix, Math.min(ix, point.x)),
            point.y - Math.max(-iy, Math.min(iy, point.y)),
          )
          const normal = q.lengthSq() > 0 ? q.normalize() : new Vector2(0, 1)
          return {
            x: POND.cx + point.x + normal.x * 0.5,
            z: POND.cz - (point.y + normal.y * 0.5),
            size: 0.45 + random() * 0.5,
            yaw: random() * 3,
            tone: 0.3 + random() * 0.12,
          }
        })
        // 가운데 길이 연못에 닿는 자리(앞쪽 가운데)는 비워 둔다.
        .filter((rock) => !(Math.abs(rock.x) < 2.6 && rock.z > POND.cz + 3))
    )
  }, [])
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    koi.current?.children.forEach((fish, index) => {
      const { phase, speed, rx, rz } = KOI[index]
      const angle = phase + time * speed
      fish.position.set(
        POND.cx + Math.cos(angle) * rx,
        0.07,
        POND.cz + Math.sin(angle * 1.3) * rz,
      )
      const vx = -Math.sin(angle) * rx
      const vz = 1.3 * Math.cos(angle * 1.3) * rz
      fish.rotation.y = Math.atan2(-vz, vx)
      // 꼬리를 좌우로 흔든다(첫 자식이 물고기 모델, 그 두 번째 자식이 꼬리).
      const tail = fish.children[0]?.children[1]
      if (tail) tail.rotation.y = Math.sin(time * 6 + phase * 5) * 0.5
    })
  })

  return (
    <group>
      {rocks.map(({ x, z, size, yaw, tone }, index) => (
        <mesh
          key={index}
          position={[x, 0.14, z]}
          rotation-y={yaw}
          scale={[size * 1.2, size * 0.6, size]}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={new Color().setHSL(0.72, 0.08, tone)}
            roughness={0.9}
          />
        </mesh>
      ))}
      {lilies.map(({ x, z, size, flower }, index) => (
        <group key={index} position={[x, 0.06, z]}>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[size, 18, 0.4, 5.5]} />
            <meshStandardMaterial color="#3f8f5a" side={DoubleSide} />
          </mesh>
          {flower && (
            <mesh position-y={0.15}>
              <coneGeometry args={[0.2, 0.3, 8]} />
              <meshStandardMaterial
                color="#ff9fcb"
                emissive="#ff5fa0"
                emissiveIntensity={0.4}
              />
            </mesh>
          )}
        </group>
      ))}
      <group ref={koi}>
        {KOI.map((_, index) => (
          <group key={index}>
            <KoiFish {...KOI_STYLES[index % KOI_STYLES.length]} />
          </group>
        ))}
      </group>
    </group>
  )
}
