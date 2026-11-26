import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import type { BufferGeometry } from 'three'
import {
  BufferAttribute,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

const SURFACES = ['stone', 'wood', 'bark', 'roof'] as const
type Surface = (typeof SURFACES)[number]
const FILES = Object.fromEntries(
  SURFACES.map((surface) => [
    surface,
    ['base', 'normal', 'roughness'].map(
      (channel) => `/textures/courtyard/${surface}-${channel}.jpg`,
    ),
  ]),
) as Record<Surface, string[]>

export function preloadSurfaces() {
  for (const surface of SURFACES) useTexture.preload(FILES[surface])
}

export function useSurface(surface: Surface) {
  const [map, normalMap, roughnessMap] = useTexture(FILES[surface])
  return useMemo(() => {
    map.colorSpace = SRGBColorSpace
    normalMap.colorSpace = roughnessMap.colorSpace = NoColorSpace
    for (const texture of [map, normalMap, roughnessMap]) {
      texture.wrapS = texture.wrapT = RepeatWrapping
      texture.anisotropy = 4
      texture.needsUpdate = true
    }
    return { map, normalMap, roughnessMap }
  }, [map, normalMap, roughnessMap])
}

export function projectSurfaceUvs(geometry: BufferGeometry) {
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const uv = new Float32Array(position.count * 2)
  for (let index = 0; index < position.count; index++) {
    const x = Math.abs(normal.getX(index))
    const y = Math.abs(normal.getY(index))
    const z = Math.abs(normal.getZ(index))
    uv[index * 2] =
      (x > y && x > z ? position.getZ(index) : position.getX(index)) / 1.8
    uv[index * 2 + 1] =
      (y >= x && y >= z ? position.getZ(index) : position.getY(index)) / 1.8
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  return geometry
}
