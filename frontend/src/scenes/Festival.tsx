import { useMemo } from 'react'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Matrix4,
  Vector3,
} from 'three'
import { getGlowTexture } from './textures'

const STRINGS = [
  { y: 8, z: -14.5, sag: 1.6 },
  { y: 9.5, z: -17.3, sag: 2 },
]
const HALF_WIDTH = 22
const BULBS_PER_STRING = 15
const BULB_COLORS = ['#ff4a35', '#ff7a2c', '#ffd9a0']

function bulbPosition(string: (typeof STRINGS)[number], index: number) {
  const t = index / (BULBS_PER_STRING - 1)
  return new Vector3(
    -HALF_WIDTH + t * HALF_WIDTH * 2,
    string.y - string.sag * 4 * t * (1 - t),
    string.z,
  )
}

/** 축제 분위기: 장대 사이에 걸린 붉은 초롱 줄. */
export function LanternStrings() {
  const halo = useMemo(getGlowTexture, [])
  const bulbs = useMemo(
    () =>
      STRINGS.flatMap((string) =>
        Array.from({ length: BULBS_PER_STRING }, (_, index) =>
          bulbPosition(string, index),
        ),
      ),
    [],
  )
  const ropes = useMemo(
    () =>
      STRINGS.map(
        (string) =>
          new CatmullRomCurve3(
            Array.from({ length: BULBS_PER_STRING }, (_, index) =>
              bulbPosition(string, index).add(new Vector3(0, 0.38, 0)),
            ),
          ),
      ),
    [],
  )

  return (
    <group>
      {STRINGS.flatMap((string) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${string.z}-${side}`}
            position={[side * HALF_WIDTH, string.y / 2 + 0.6, string.z]}
          >
            <cylinderGeometry args={[0.14, 0.2, string.y + 1.2, 6]} />
            <meshStandardMaterial color="#4a2a1c" roughness={1} />
          </mesh>
        )),
      )}
      {ropes.map((curve, index) => (
        <mesh key={index}>
          <tubeGeometry args={[curve, 40, 0.025, 4]} />
          <meshStandardMaterial color="#2a1a12" />
        </mesh>
      ))}
      <instancedMesh
        args={[undefined, undefined, bulbs.length]}
        frustumCulled={false}
        ref={(mesh) => {
          if (!mesh) return
          const matrix = new Matrix4()
          const color = new Color()
          bulbs.forEach((position, index) => {
            matrix.makeScale(0.34, 0.44, 0.34).setPosition(position)
            mesh.setMatrixAt(index, matrix)
            mesh.setColorAt(
              index,
              color.set(BULB_COLORS[index % BULB_COLORS.length]),
            )
          })
          mesh.instanceMatrix.needsUpdate = true
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        }}
      >
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {bulbs.map((position, index) => (
        <sprite key={index} position={position} scale={[1.5, 1.5, 1]}>
          <spriteMaterial
            map={halo}
            color={BULB_COLORS[index % BULB_COLORS.length]}
            opacity={0.5}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  )
}
