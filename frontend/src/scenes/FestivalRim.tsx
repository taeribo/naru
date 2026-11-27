import { useMemo } from 'react'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import type { InstancedMesh } from 'three'
import { Architecture } from './EntranceArchitecture'
import { RIM_SEPARATORS, RIM_SHOPS, RIM_STRINGS } from './festivalLayout'
import { Nobori } from './Japan'
import { Shop } from './StreetStalls'

const UP = new Vector3(0, 1, 0)

/** 가게 앞 처마를 따라 건 황금빛 초롱 줄: 줄은 한 번에, 초롱은 밝기별로 두 덩어리로 그린다. */
function LanternStrings() {
  const { rope, bright, dim } = useMemo(() => {
    const positions: number[] = []
    const brightPoints: Vector3[] = []
    const dimPoints: Vector3[] = []
    RIM_STRINGS.forEach(({ points }, shopIndex) => {
      const target = RIM_SHOPS[shopIndex].glow ? brightPoints : dimPoints
      points.forEach((point, index) => {
        if (index > 0) {
          const previous = points[index - 1]
          positions.push(...previous, ...point)
        }
        if (index > 0 && index < points.length - 1) {
          target.push(new Vector3(point[0], point[1] - 0.2, point[2]))
        }
      })
    })
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return { rope: geometry, bright: brightPoints, dim: dimPoints }
  }, [])

  const place = (points: Vector3[]) => (mesh: InstancedMesh) => {
    const matrix = new Matrix4()
    points.forEach((point, index) => {
      matrix.compose(
        point,
        new Quaternion().setFromAxisAngle(UP, 0),
        new Vector3(0.13, 0.17, 0.13),
      )
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  return (
    <group>
      <lineSegments geometry={rope}>
        <lineBasicMaterial color="#2a1c14" />
      </lineSegments>
      {[
        { points: bright, intensity: 2.4 },
        { points: dim, intensity: 1.15 },
      ].map(({ points, intensity }) => (
        <instancedMesh
          key={intensity}
          args={[undefined, undefined, points.length]}
          frustumCulled={false}
          onUpdate={place(points)}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial
            color="#ffd27a"
            emissive="#ffb347"
            emissiveIntensity={intensity}
            roughness={0.8}
          />
        </instancedMesh>
      ))}
    </group>
  )
}

/** 군집 사이를 끊는 조경: 석등, 눈 덮인 바위, (소나무는 숲 배치가 그린다), 붉은 노보리. */
function Separators() {
  return (
    <group>
      {RIM_SEPARATORS.map(({ x, z, yaw, type, nobori }, index) => {
        const inward: [number, number] = [Math.sin(yaw), Math.cos(yaw)]
        return (
          <group key={index}>
            {type === 'lantern' && (
              <>
                <Architecture
                  model="stone-lantern"
                  position={[x, 0, z]}
                  scale={1.05}
                  yaw={yaw}
                />
                <Architecture
                  model="mossy-boulders"
                  position={[x - inward[1] * 1.6, 0, z + inward[0] * 1.6]}
                  scale={0.55}
                  yaw={index}
                />
              </>
            )}
            {type === 'rock' && (
              <Architecture
                model="mossy-boulders"
                position={[x, 0, z]}
                scale={0.78}
                yaw={index * 1.7}
              />
            )}
            {nobori && (
              <Nobori
                position={[x + inward[0] * 1.5, 0, z + inward[1] * 1.5]}
                yaw={yaw}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

/** 맵 테두리의 신사 축제 노점 거리: 북·동·서 변을 군집으로 두르고 중앙은 열어 둔다. */
export function FestivalRim() {
  // 점광원은 군집을 대표하는 몇 곳에만 둔다. 나머지 가게는 창과 초롱의 발광으로 표현한다.
  const lights = useMemo(
    () =>
      RIM_SHOPS.filter((shop) => shop.glow)
        .filter((_, index) => index % 4 === 0)
        .slice(0, 5),
    [],
  )
  return (
    <group>
      {RIM_SHOPS.map(({ x, z, yaw, kind }, index) => (
        <group key={index} position={[x, 0, z]} rotation-y={yaw}>
          <Shop kind={kind} shadow={false} />
        </group>
      ))}
      <LanternStrings />
      <Separators />
      {lights.map(({ x, z, yaw }, index) => (
        <pointLight
          key={index}
          position={[x + Math.sin(yaw) * 2.2, 2.4, z + Math.cos(yaw) * 2.2]}
          color="#ffb060"
          intensity={16}
          distance={12}
        />
      ))}
    </group>
  )
}
