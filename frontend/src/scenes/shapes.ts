import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { CatmullRomCurve3 } from 'three'

/** 곡선을 따라 굵기가 변하는 관(나무 줄기, 용의 몸 등). */
export function taperedTube(
  curve: CatmullRomCurve3,
  startRadius: number,
  endRadius: number,
  radial: number,
  flare = 0,
  segments = 14,
) {
  const points = curve.getSpacedPoints(segments)
  const frames = curve.computeFrenetFrames(segments, false)
  const length = curve.getLength()
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments
    const radius =
      startRadius + (endRadius - startRadius) * t + flare * Math.pow(1 - t, 5)
    for (let column = 0; column <= radial; column += 1) {
      const angle = (column / radial) * Math.PI * 2
      const normal = frames.normals[row]
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[row], Math.sin(angle))
      const point = points[row].clone().addScaledVector(normal, radius)
      positions.push(point.x, point.y, point.z)
      normals.push(normal.x, normal.y, normal.z)
      uvs.push(column / radial, t * length * 0.55)
    }
  }
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < radial; column += 1) {
      const a = row * (radial + 1) + column
      const b = a + radial + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

/** 처마 끝이 살짝 들린 기와지붕. */
export function roofGeometry(
  halfX: number,
  halfZ: number,
  height: number,
  lift: number,
) {
  const segments = 14
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= segments; i += 1) {
    for (let j = 0; j <= segments; j += 1) {
      const u = (i / segments) * 2 - 1
      const v = (j / segments) * 2 - 1
      const edge = Math.max(Math.abs(u), Math.abs(v))
      const y =
        height * Math.pow(1 - edge, 1.5) +
        lift * Math.abs(u) * Math.abs(v) * edge * edge
      positions.push(u * halfX, y, v * halfZ)
      uvs.push((u * 0.5 + 0.5) * 3, (v * 0.5 + 0.5) * 3)
    }
  }
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * (segments + 1) + j
      const b = a + segments + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
