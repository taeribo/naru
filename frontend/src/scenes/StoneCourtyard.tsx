import { useMemo } from 'react'
import { ZONES } from './terrain'
import { getGravelTexture, getSlabTexture } from './textures'

// 건물 사이로 난 돌길(구상도의 회색 길). 중심 x, z와 가로·세로 길이.
const PATHS: [number, number, number, number][] = [
  [0, -1.25, 3, 36.5], // 북쪽 정원 ↔ 입장 계단 중앙길
  [0, -10, 26, 3], // 윗줄 건물로 가는 길
  [0, 8, 26, 3], // 아랫줄 건물로 가는 길
  [0, 32, 14, 5], // 스폰 광장(계단 아래)
]

/** 어두운 자갈 바닥 위에 돌길과 광장. */
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
    </>
  )
}
