import { useMemo } from 'react'
import { getGlowTexture } from './textures'

export function ContactShade({
  width,
  depth,
  height = 0.055,
  opacity = 0.43,
}: {
  width: number
  depth: number
  height?: number
  opacity?: number
}) {
  const falloff = useMemo(getGlowTexture, [])
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={height}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        map={falloff}
        color="#141321"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  )
}
