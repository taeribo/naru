import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'

const LEAF_COLORS = ['#5e713b', '#71854c', '#82904f', '#3d532f', '#9a9958']
const STEM_COLOR = new Color('#635341')

export function createShrubGeometry() {
  const vertices: number[] = []
  const colors: number[] = []
  const foliage = LEAF_COLORS.map((color) => new Color(color))
  let state = 1249
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }

  function triangle(a: Vector3, b: Vector3, c: Vector3, color: Color) {
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
    for (let vertex = 0; vertex < 3; vertex++)
      colors.push(color.r, color.g, color.b)
  }

  const base = new Vector3(0, -0.76, 0)
  for (let branch = 0; branch < 14; branch++) {
    const angle = branch * 2.39996
    const radius = 0.28 + random() * 0.56
    const tip = new Vector3(
      Math.cos(angle) * radius,
      0.66 - radius * 0.69 + random() * 0.23,
      Math.sin(angle) * radius,
    )
    const stem = new Vector3(
      Math.sin(angle) * 0.036,
      0,
      -Math.cos(angle) * 0.036,
    )
    const stemTip = tip.clone().lerp(base, 0.12)
    triangle(
      base.clone().add(stem),
      base.clone().sub(stem),
      stemTip,
      STEM_COLOR,
    )
    triangle(
      base.clone().add(new Vector3(-stem.z, 0, stem.x)),
      base.clone().sub(new Vector3(-stem.z, 0, stem.x)),
      stemTip,
      STEM_COLOR,
    )

    for (let leafIndex = 0; leafIndex < 38; leafIndex++) {
      const fraction = 0.4 + random() * 0.6
      const leafAngle = leafIndex * 2.39996 + angle
      const center = base.clone().lerp(tip, fraction)
      center.x += Math.cos(leafAngle) * random() * 0.24
      center.z += Math.sin(leafAngle) * random() * 0.24
      center.y += (random() - 0.5) * 0.28
      const length = 0.105 + random() * 0.14
      const front = new Vector3(
        Math.cos(leafAngle) * length,
        (random() - 0.41) * length,
        Math.sin(leafAngle) * length,
      )
      const side = new Vector3(
        -front.z,
        (random() - 0.5) * length,
        front.x,
      ).multiplyScalar(0.42)
      const start = center.clone().addScaledVector(front, -0.42)
      const end = center.clone().add(front)
      const left = center.clone().add(side)
      const right = center.clone().sub(side)
      const ridge = center.clone().add(new Vector3(0, length * 0.22, 0))
      const color = foliage[Math.floor(random() * foliage.length)]
      const shade = color.clone().multiplyScalar(0.83)
      triangle(start, left, ridge, color)
      triangle(left, end, ridge, color)
      triangle(end, right, ridge, shade)
      triangle(right, start, ridge, shade)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(vertices), 3),
  )
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(colors), 3),
  )
  geometry.computeVertexNormals()
  return geometry
}
