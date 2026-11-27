import { useMemo } from 'react'
import { BufferAttribute, Color, LatheGeometry, Vector2 } from 'three'

const HEIGHT = 52
const BASE_RADIUS = 105

function createFujiGeometry() {
  // 부드럽게 오목한 후지산 단면(아래는 넓고 위는 가파르게 좁아진다).
  const profile = Array.from({ length: 36 }, (_, index) => {
    const t = index / 35
    return new Vector2(9 + (BASE_RADIUS - 9) * Math.pow(1 - t, 1.3), t * HEIGHT)
  })
  const geometry = new LatheGeometry(profile, 64)
  const positions = geometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  const rock = new Color('#555c78')
  const foot = new Color('#505972')
  const snow = new Color('#b9bdcd')
  const color = new Color()
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const angle = Math.atan2(z, x)
    const t = y / HEIGHT
    const ridge =
      (Math.sin(angle * 9) + Math.sin(angle * 23 + t * 3) * 0.39) *
      1.9 *
      Math.sin(Math.PI * t)
    positions.setXYZ(
      index,
      x + Math.cos(angle) * ridge,
      y,
      z + Math.sin(angle) * ridge,
    )
    // 설선: 각도에 따라 들쭉날쭉하게 내려온다.
    const snowLine =
      0.6 + 0.05 * Math.sin(angle * 7) + 0.03 * Math.sin(angle * 17 + 1)
    color.copy(foot).lerp(rock, Math.min(1, t * 2.2))
    if (t > snowLine) color.lerp(snow, Math.min(1, (t - snowLine) * 12))
    // 왼쪽 위에서 빛이 오는 것처럼 한쪽 면을 살짝 어둡게.
    color.multiplyScalar(
      0.88 + 0.1 * Math.cos(angle - 2.4) + 0.035 * Math.sin(angle * 11 + t * 5),
    )
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  return geometry
}

/** 멀리 보이는 후지산: 설선과 은은하게 흐려지는 산자락. */
export function Fuji() {
  const geometry = useMemo(createFujiGeometry, [])

  return (
    <group position={[173, -2, -430]} scale={[1.32, 1.72, 1.32]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors fog={false} />
      </mesh>
    </group>
  )
}
