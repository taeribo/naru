import { useMemo } from 'react'
import { BoxGeometry } from 'three'
import { Architecture } from './EntranceArchitecture'
import { SnowCap } from './SnowCap'
import { projectSurfaceUvs, useSurface } from './surfaces'
import { FRONT_WALL_Z } from './terrain'

const GATE_HALF = 3.4

/** 스폰 뒤쪽의 낮은 돌담: 가운데는 열어 두고 석등 한 쌍으로 마당의 끝을 표시한다. */
export function Forecourt() {
  const stone = useSurface('stone')
  const segments = useMemo(
    () =>
      [-1, 1].map((side) => {
        const length = 30
        const geometry = projectSurfaceUvs(new BoxGeometry(length, 1.0, 0.8))
        return {
          geometry,
          x: side * (GATE_HALF + length / 2 + 0.4),
        }
      }),
    [],
  )
  return (
    <group>
      {segments.map(({ geometry, x }) => (
        <mesh
          key={x}
          geometry={geometry}
          position={[x, 0.5, FRONT_WALL_Z]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial {...stone} color="#8f8a93" roughness={1} />
          <SnowCap source={geometry} thickness={0.12} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <Architecture
          key={side}
          model="stone-lantern"
          position={[side * GATE_HALF, 0, FRONT_WALL_Z]}
          scale={1.05}
          yaw={side > 0 ? 0.4 : -0.4}
        />
      ))}
    </group>
  )
}
