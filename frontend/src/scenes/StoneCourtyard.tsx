import { CircleGeometry, PlaneGeometry, Vector2 } from 'three'
import type { MeshStandardMaterial } from 'three'
import { useSurface } from './surfaces'
import { useMemo } from 'react'
import {
  CHERRY_POSITION,
  COURTYARD,
  STAIRS,
  STAIRS_END_Z,
  WORLD_BOUNDS,
  ZONES,
} from './terrain'

const shadePaving: MeshStandardMaterial['onBeforeCompile'] = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      '#include <common>\nvarying vec2 vStonePosition;',
    )
    .replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvStonePosition = position.xy;',
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      '#include <common>\nvarying vec2 vStonePosition;',
    )
    .replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      vec2 stonePoint = vStonePosition;
      float broad = sin(dot(stonePoint, vec2(0.37, 0.19)))
        * sin(dot(stonePoint, vec2(0.15, -0.51)));
      float detail = sin(dot(stonePoint, vec2(1.11, 0.43)))
        * sin(dot(stonePoint, vec2(-0.56, 1.19)));
      diffuseColor.rgb *= 1.0 + broad * 0.105 + detail * 0.038;
      vec2 edge = vec2(${(width / 2).toFixed(2)}, ${(depth / 2).toFixed(2)}) - abs(stonePoint);
      float fade = min(edge.x, edge.y) + broad * 1.5 + detail * 0.65;
      diffuseColor.a *= smoothstep(0.0, 5.0, fade);
    `,
    )
}

// 건물 사이로 난 돌길(구상도의 회색 길). 중심 x, z와 가로·세로 길이.
const SOUTH_PATH_START = STAIRS.bottomZ
const { minZ, maxZ } = WORLD_BOUNDS
const { width, depth, centerX, centerZ } = COURTYARD
const AXIS_WIDTH = 5.6
const BRANCH_WIDTH = 3.25
// 온천은 광장 밖 담장 구역에 있어 광장 길과 마당 석판에서 제외한다.
const PLAZA_ZONES = [ZONES.fortune, ZONES.wish, ZONES.bell]
const PATHS: [number, number, number, number][] = [
  [0, (minZ + 1 + STAIRS_END_Z) / 2, AXIS_WIDTH, STAIRS_END_Z - minZ - 1],
  ...PLAZA_ZONES.map(([x, z]): [number, number, number, number] => [
    (x + (Math.sign(x) * AXIS_WIDTH) / 2) / 2,
    z,
    Math.abs(x) - AXIS_WIDTH / 2,
    BRANCH_WIDTH,
  ]),
  [0, 32, 14, 5],
  [0, (SOUTH_PATH_START + maxZ) / 2, AXIS_WIDTH, maxZ - SOUTH_PATH_START],
]

/** 어두운 자갈 바닥 위에 돌길과 광장. */
export function Plaza() {
  const stone = useSurface('stone')
  const relief = useMemo(() => new Vector2(0.46, 0.46), [])
  const fullPaving = useMemo(() => {
    const surface = new PlaneGeometry(width, depth)
    const uv = surface.attributes.uv
    for (let index = 0; index < uv.count; index++) {
      uv.setXY(
        index,
        (uv.getX(index) * width) / 3.4,
        (uv.getY(index) * depth) / 3.4,
      )
    }
    return surface
  }, [])
  const walks = useMemo(
    () =>
      PATHS.map(([x, z, pathWidth, pathDepth]) => {
        const geometry = new PlaneGeometry(pathWidth, pathDepth)
        const uv = geometry.attributes.uv
        for (let index = 0; index < uv.count; index++) {
          uv.setXY(
            index,
            (x + (uv.getX(index) - 0.5) * pathWidth) / 3.4,
            (-z + (uv.getY(index) - 0.5) * pathDepth) / 3.4,
          )
        }
        return geometry
      }),
    [],
  )
  const courts = useMemo(
    () =>
      [8.3, 4.35].map((radius) => {
        const geometry = new CircleGeometry(radius, 48)
        const uv = geometry.attributes.uv
        for (let index = 0; index < uv.count; index++) {
          uv.setXY(
            index,
            (uv.getX(index) * radius) / 1.7,
            (uv.getY(index) * radius) / 1.7,
          )
        }
        return geometry
      }),
    [],
  )
  return (
    <>
      <mesh
        receiveShadow
        geometry={fullPaving}
        rotation-x={-Math.PI / 2}
        position={[centerX, 0.028, centerZ]}
      >
        <meshStandardMaterial
          {...stone}
          normalScale={relief}
          roughness={0.89}
          color="#b6aea7"
          onBeforeCompile={shadePaving}
          transparent
          alphaTest={0.06}
        />
      </mesh>
      {PATHS.map(([x, z], index) => (
        <mesh
          key={index}
          receiveShadow
          geometry={walks[index]}
          rotation-x={-Math.PI / 2}
          position={[x, 0.047, z]}
        >
          <meshStandardMaterial
            {...stone}
            normalScale={relief}
            roughness={0.89}
            color="#e7d6bc"
          />
        </mesh>
      ))}
      <mesh
        geometry={courts[0]}
        rotation-x={-Math.PI / 2}
        position={[CHERRY_POSITION[0], 0.052, CHERRY_POSITION[2]]}
      >
        <meshStandardMaterial
          {...stone}
          normalScale={relief}
          roughness={0.89}
          color="#d1cbd3"
        />
      </mesh>
      {PLAZA_ZONES.map(([x, z]) => (
        <mesh
          key={`${x}:${z}`}
          geometry={courts[1]}
          rotation-x={-Math.PI / 2}
          position={[x, 0.05, z]}
        >
          <meshStandardMaterial
            {...stone}
            normalScale={relief}
            roughness={0.89}
            color="#cbcad2"
          />
        </mesh>
      ))}
    </>
  )
}
