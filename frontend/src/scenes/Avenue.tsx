import { useMemo } from 'react'
import { PlaneGeometry, Vector2 } from 'three'
import { AVENUE } from './terrain'
import { useSurface } from './surfaces'

const TILE = 3.4

/** 광장 북쪽 틈에서 서쪽 성 앞까지 이어지는 돌 참배길. */
export function Avenue() {
  const stone = useSurface('stone')
  const relief = useMemo(() => new Vector2(0.46, 0.46), [])
  const strips = useMemo(
    () =>
      AVENUE.map(([x0, x1, z0, z1]) => {
        const width = x1 - x0
        const depth = z1 - z0
        const geometry = new PlaneGeometry(width, depth)
        const uv = geometry.attributes.uv
        for (let index = 0; index < uv.count; index++) {
          uv.setXY(
            index,
            (x0 + uv.getX(index) * width) / TILE,
            (-z1 + uv.getY(index) * depth) / TILE,
          )
        }
        return { geometry, x: (x0 + x1) / 2, z: (z0 + z1) / 2 }
      }),
    [],
  )
  return (
    <>
      {strips.map(({ geometry, x, z }, index) => (
        <mesh
          key={index}
          receiveShadow
          geometry={geometry}
          rotation-x={-Math.PI / 2}
          position={[x, 0.03, z]}
        >
          <meshStandardMaterial
            {...stone}
            normalScale={relief}
            roughness={0.89}
            color="#a9a199"
          />
        </mesh>
      ))}
    </>
  )
}
