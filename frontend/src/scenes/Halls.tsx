import { propSnow, roofSnow, snowProgramKey } from './snow'
import { useSurface } from './surfaces'
import { useMemo } from 'react'
import {
  DoubleSide,
  Euler,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
} from 'three'
import { bellParts } from './BellRing'
import { roofGeometry } from './shapes'
import { getEmaTexture, getSignTexture } from './textures'

const WOOD = '#6b3d1c'
const RED = '#c2382a'
const GOLD = '#e8b84a'

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** 오미쿠지 상자: 팔각 나무통 윗구멍에 막대가 꽂혀 있다. */
export function OmikujiBox() {
  const sign = useMemo(getSignTexture, [])
  return (
    <group>
      <mesh position-y={0.45}>
        <boxGeometry args={[1.5, 0.12, 1.1]} />
        <meshStandardMaterial color="#4a2d3b" roughness={0.8} />
      </mesh>
      {[-0.6, 0.6].flatMap((x) =>
        [-0.4, 0.4].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.22, z]}>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
            <meshStandardMaterial color="#4a2d3b" />
          </mesh>
        )),
      )}
      <mesh position-y={1.0}>
        <cylinderGeometry args={[0.34, 0.4, 0.9, 8]} />
        <meshStandardMaterial color="#9a5a30" roughness={0.7} />
      </mesh>
      <mesh position-y={1.47}>
        <cylinderGeometry args={[0.38, 0.34, 0.06, 8]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position-y={1.505} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#1a1010" />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.04, 1.75, Math.sin(angle) * 0.04]}
            rotation={[Math.sin(angle) * 0.12, 0, -Math.cos(angle) * 0.12]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.5, 4]} />
            <meshStandardMaterial color="#f1d08e" />
          </mesh>
        )
      })}
      <mesh position-y={0.82} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.41, 0.022, 6, 24]} />
        <meshStandardMaterial color={RED} />
      </mesh>
      <mesh position={[0, 1.0, 0.395]}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** 오미쿠지 묶는 곳: 줄에 점괘 종이를 접어 묶어 둔다. */
export function OmikujiRack() {
  return (
    <group>
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]}>
          <boxGeometry args={[0.13, 2.2, 0.13]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
      <mesh position-y={2.2}>
        <boxGeometry args={[2.9, 0.12, 0.2]} />
        <meshStandardMaterial
          color={WOOD}
          onBeforeCompile={propSnow}
          customProgramCacheKey={snowProgramKey}
        />
      </mesh>
      {[1.8, 1.45, 1.1].map((y) => (
        <mesh key={y} position-y={y} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.016, 0.016, 2.5, 4]} />
          <meshStandardMaterial color="#d9c28a" />
        </mesh>
      ))}
      <instancedMesh
        args={[undefined, undefined, 54]}
        frustumCulled={false}
        ref={(mesh) => {
          if (!mesh) return
          const random = createRandom(3)
          const matrix = new Matrix4()
          const quaternion = new Quaternion()
          const position = new Vector3()
          const scale = new Vector3(1, 1, 1)
          let index = 0
          for (const y of [1.8, 1.45, 1.1]) {
            for (let paper = 0; paper < 18; paper += 1) {
              position.set(-1.15 + paper * 0.135, y - 0.17, 0.02)
              quaternion.setFromEuler(new Euler(0, 0, (random() - 0.5) * 0.2))
              mesh.setMatrixAt(
                index,
                matrix.compose(position, quaternion, scale),
              )
              index += 1
            }
          }
          mesh.instanceMatrix.needsUpdate = true
        }}
      >
        <boxGeometry args={[0.07, 0.32, 0.012]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.35}
        />
      </instancedMesh>
    </group>
  )
}

/** 소원패(에마): 나무 걸이에 소원을 적은 나무패가 줄줄이 걸려 있다. */
export function EmaRack() {
  const timber = useSurface('wood')
  const ema = useMemo(getEmaTexture, [])
  const roofSurface = useSurface('roof')
  const roof = useMemo(() => roofGeometry(2.7, 1.1, 0.7, 0.3), [])
  return (
    <group position-z={-0.6}>
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]}>
          <boxGeometry args={[0.16, 2.5, 0.16]} />
          <meshStandardMaterial {...timber} color={RED} />
        </mesh>
      ))}
      <mesh geometry={roof} position-y={2.45}>
        <meshStandardMaterial
          onBeforeCompile={roofSnow}
          customProgramCacheKey={snowProgramKey}
          {...roofSurface}
          color="#9599a1"
          roughness={0.8}
          side={DoubleSide}
        />
      </mesh>
      {[2.05, 1.6, 1.15].map((y) => (
        <mesh key={y} position-y={y}>
          <boxGeometry args={[4.3, 0.07, 0.07]} />
          <meshStandardMaterial {...timber} color={WOOD} />
        </mesh>
      ))}
      <instancedMesh
        args={[undefined, undefined, 30]}
        frustumCulled={false}
        ref={(mesh) => {
          if (!mesh) return
          const random = createRandom(11)
          const matrix = new Matrix4()
          const quaternion = new Quaternion()
          const position = new Vector3()
          const scale = new Vector3(1, 1, 1)
          let index = 0
          for (const y of [2.05, 1.6, 1.15]) {
            for (let plaque = 0; plaque < 10; plaque += 1) {
              position.set(-1.9 + plaque * 0.42, y - 0.3, 0.05)
              quaternion.setFromEuler(new Euler(0, (random() - 0.5) * 0.5, 0))
              mesh.setMatrixAt(
                index,
                matrix.compose(position, quaternion, scale),
              )
              index += 1
            }
          }
          mesh.instanceMatrix.needsUpdate = true
        }}
      >
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial map={ema} alphaTest={0.5} side={DoubleSide} />
      </instancedMesh>
    </group>
  )
}

/** 종 울리기: 지붕 아래 매달린 범종과 당목(치는 통나무). */
export function BellHall() {
  const timber = useSurface('wood')
  const roofSurface = useSurface('roof')
  const roof = useMemo(() => roofGeometry(3.1, 3.1, 1.3, 0.6), [])
  const bell = useMemo(
    () =>
      new LatheGeometry(
        [
          [0.12, 1.0],
          [0.3, 0.96],
          [0.36, 0.7],
          [0.42, 0.28],
          [0.5, 0.0],
          [0.46, -0.04],
        ].map(([x, y]) => new Vector2(x, y)),
        24,
      ),
    [],
  )
  return (
    <group>
      <mesh position-y={0.15}>
        <boxGeometry args={[4.6, 0.3, 4.6]} />
        <meshStandardMaterial color="#8d869c" roughness={1} />
      </mesh>
      {[-1.9, 1.9].flatMap((x) =>
        [-1.9, 1.9].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.8, z]}>
            <boxGeometry args={[0.22, 3, 0.22]} />
            <meshStandardMaterial {...timber} color={RED} />
          </mesh>
        )),
      )}
      <mesh position-y={3.35}>
        <boxGeometry args={[4.4, 0.2, 0.3]} />
        <meshStandardMaterial color="#1a1416" />
      </mesh>
      <mesh geometry={roof} position-y={3.25}>
        <meshStandardMaterial
          onBeforeCompile={roofSnow}
          customProgramCacheKey={snowProgramKey}
          {...roofSurface}
          color="#9599a1"
          roughness={0.8}
          side={DoubleSide}
        />
      </mesh>
      <mesh position-y={3.1}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      {/* 범종은 윗고리를 축으로 흔들릴 수 있게 꼭대기(3.0m)에 매단다. */}
      <group
        position-y={3.0}
        ref={(node) => {
          bellParts.bell = node
        }}
      >
        {/* 제야의 종처럼 크게: 높이 약 1.55, 아래 지름 약 1.55(구역 배율 전). */}
        <mesh geometry={bell} position-y={-1.85} scale={1.55}>
          <meshStandardMaterial
            color="#6a5a3a"
            metalness={0.6}
            roughness={0.4}
            side={DoubleSide}
          />
        </mesh>
      </group>
      {/* 당목(종 치는 통나무)과 매단 밧줄: 밧줄 위쪽을 축으로 앞뒤로 흔들린다. */}
      <group
        position={[0, 3.0, 1.65]}
        ref={(node) => {
          bellParts.striker = node
        }}
      >
        {[-0.35, 0.35].map((x) => (
          <mesh key={x} position={[x, -0.7, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 1.4, 4]} />
            <meshStandardMaterial color="#d9c28a" />
          </mesh>
        ))}
        <mesh position-y={-1.45} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.13, 0.13, 1.7, 10]} />
          <meshStandardMaterial {...timber} color="#8a5a2a" roughness={1} />
        </mesh>
        {/* 당목 뒤끝에 늘어진 당김 줄: 방문자가 이 줄을 잡아 당겼다 놓는다. */}
        <mesh position={[0, -1.83, 0.8]}>
          <cylinderGeometry args={[0.022, 0.022, 0.65, 6]} />
          <meshStandardMaterial color="#c9483a" roughness={1} />
        </mesh>
      </group>
    </group>
  )
}

/** 휴식 공간: 다다미 마루와 벤치, 붉은 와가사(우산). */
export function RestHall() {
  const timber = useSurface('wood')
  return (
    <group>
      <mesh position-y={0.2}>
        <boxGeometry args={[4.4, 0.3, 3.4]} />
        <meshStandardMaterial {...timber} color="#ac8053" roughness={1} />
      </mesh>
      <mesh position-y={0.37}>
        <boxGeometry args={[3.6, 0.06, 2.6]} />
        <meshStandardMaterial color="#c9b27a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.2, 0.07, 2.6]} />
        <meshStandardMaterial color="#8a2a28" roughness={1} />
      </mesh>
      <group position={[0, 0, -1.2]}>
        <mesh position-y={0.85}>
          <boxGeometry args={[3.2, 0.12, 0.6]} />
          <meshStandardMaterial {...timber} color="#96704f" roughness={1} />
        </mesh>
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 0.6, 0]}>
            <boxGeometry args={[0.12, 0.5, 0.5]} />
            <meshStandardMaterial color="#6b3d1c" />
          </mesh>
        ))}
      </group>
      <mesh position={[-1.5, 1.8, 0.3]}>
        <cylinderGeometry args={[0.05, 0.05, 3.2, 8]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      <mesh position={[-1.5, 3.2, 0.3]}>
        <coneGeometry args={[1.8, 0.6, 28]} />
        <meshStandardMaterial
          onBeforeCompile={roofSnow}
          customProgramCacheKey={snowProgramKey}
          color="#c8302a"
          roughness={0.7}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[-1.5, 3.21, 0.3]}>
        <coneGeometry args={[1.2, 0.4, 28]} />
        <meshStandardMaterial
          onBeforeCompile={roofSnow}
          customProgramCacheKey={snowProgramKey}
          color="#f4efe6"
          roughness={0.8}
          side={DoubleSide}
        />
      </mesh>
      {[0.3, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.97, -1.2]}>
          <cylinderGeometry args={[0.1, 0.07, 0.12, 12]} />
          <meshStandardMaterial color="#f4efe6" />
        </mesh>
      ))}
    </group>
  )
}
