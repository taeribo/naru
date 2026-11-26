import { useMemo } from 'react'
import type { BufferGeometry } from 'three'
import { createSnowCap, snowMaterial } from './snow'

export function SnowCap({
  source,
  thickness = 0.19,
}: {
  source: BufferGeometry
  thickness?: number
}) {
  const geometry = useMemo(
    () => createSnowCap(source, thickness),
    [source, thickness],
  )

  return <mesh geometry={geometry} material={snowMaterial} receiveShadow />
}
