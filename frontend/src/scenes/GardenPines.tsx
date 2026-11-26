import { barkSnow, pineSnow, snowProgramKey } from './snow'
import { useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Matrix4,
  Vector3,
} from 'three'
import type { InstancedMesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { taperedTube } from './shapes'

export type PinePlacement = [position: [number, number, number], scale: number]

const VARIANTS = [
  { lean: 0.85, height: 5.3, width: 1.06, tiers: 5 },
  { lean: -0.7, height: 4.65, width: 1.28, tiers: 4 },
  { lean: 0.39, height: 6.2, width: 0.92, tiers: 6 },
  { lean: -1.05, height: 4.85, width: 1.14, tiers: 5 },
  { lean: 0.58, height: 5.7, width: 1.16, tiers: 6 },
]

function makePine(index: number) {
  const { lean, height, width, tiers } = VARIANTS[index]
  const trunk = new CatmullRomCurve3([
    new Vector3(),
    new Vector3(lean * -0.24, height * 0.32, 0.13),
    new Vector3(lean * 0.48, height * 0.69, -0.12),
    new Vector3(lean, height, 0.19),
  ])
  const limbs = [taperedTube(trunk, 0.25, 0.052, 12)]
  const needles: number[] = []
  const colors: number[] = []
  const shades = ['#344739', '#425443', '#53634d'].map(
    (shade) => new Color(shade),
  )

  for (let tier = 0; tier < tiers; tier++) {
    const fraction = 0.32 + (tier / (tiers - 1)) * 0.64
    for (let side = 0; side < 2; side++) {
      const angle = tier * 2.38 + side * 2.55 + index * 1.13
      const reach = width * (2.45 - tier * 0.24) * (side ? 0.74 : 1)
      const origin = trunk.getPointAt(fraction)
      const end = origin
        .clone()
        .add(
          new Vector3(Math.cos(angle) * reach, 0.32, Math.sin(angle) * reach),
        )
      const branch = new CatmullRomCurve3([
        origin,
        origin
          .clone()
          .lerp(end, 0.5)
          .add(new Vector3(0, -0.21, 0)),
        end,
      ])
      limbs.push(taperedTube(branch, 0.105 - tier * 0.008, 0.021, 5))

      for (let tuft = 0; tuft < 15; tuft++) {
        const spread = Math.sin(tuft * 2.4 + angle)
        const center = branch.getPointAt(0.43 + (tuft / 14) * 0.57)
        center.x += Math.sin(angle) * spread * 0.57
        center.z -= Math.cos(angle) * spread * 0.57
        center.y += 0.16 + Math.cos(tuft * 2.1) * 0.16
        for (let needle = 0; needle < 6; needle++) {
          const bearing = angle + needle * 1.05 + tuft * 0.47
          const radius =
            (0.42 + 0.31 * Math.sin(tuft * 1.5 + needle) ** 2) * width
          const x = Math.cos(bearing) * radius
          const z = Math.sin(bearing) * radius
          const { x: cx, y, z: cz } = center
          needles.push(
            cx - z * 0.22,
            y,
            cz + x * 0.22,
            cx + z * 0.22,
            y + 0.13,
            cz - x * 0.22,
            cx + x,
            y + Math.sin(needle * 1.7) * 0.29,
            cz + z,
          )
          const color = shades[(tier + tuft + needle) % shades.length]
          for (let vertex = 0; vertex < 3; vertex++)
            colors.push(color.r, color.g, color.b)
        }
      }
    }
  }

  const wood = mergeGeometries(limbs)
  for (const limb of limbs) limb.dispose()
  const foliage = new BufferGeometry()
  foliage.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(needles), 3),
  )
  foliage.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(colors), 3),
  )
  foliage.computeVertexNormals()
  return { wood, foliage }
}

function place(
  mesh: InstancedMesh | null,
  items: PinePlacement[],
  variant: number,
) {
  if (!mesh) return
  const matrix = new Matrix4()
  const size = new Vector3()
  items.forEach(([position, scale], index) => {
    matrix
      .makeRotationY(index * 2.4 + variant * 1.17)
      .scale(size.set(scale * (0.94 + (index % 3) * 0.07), scale, scale))
      .setPosition(...position)
    mesh.setMatrixAt(index, matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingSphere()
}

export function GardenPines({ placements }: { placements: PinePlacement[] }) {
  const batches = useMemo(
    () =>
      VARIANTS.map((_, variant) => ({
        ...makePine(variant),
        items: placements.filter(
          (_, index) => index % VARIANTS.length === variant,
        ),
      })),
    [placements],
  )

  return batches.map(({ wood, foliage, items }, variant) =>
    items.length ? (
      <group key={variant}>
        <instancedMesh
          args={[wood, undefined, items.length]}
          ref={(mesh) => place(mesh, items, variant)}
        >
          <meshStandardMaterial
            color="#59493e"
            roughness={1}
            onBeforeCompile={barkSnow}
            customProgramCacheKey={snowProgramKey}
          />
        </instancedMesh>
        <instancedMesh
          args={[foliage, undefined, items.length]}
          ref={(mesh) => place(mesh, items, variant)}
        >
          <meshStandardMaterial
            vertexColors
            side={DoubleSide}
            roughness={1}
            onBeforeCompile={pineSnow}
            customProgramCacheKey={snowProgramKey}
          />
        </instancedMesh>
      </group>
    ) : null,
  )
}
