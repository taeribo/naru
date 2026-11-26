import { useMemo } from 'react'
import { BoxGeometry } from 'three'
import { projectSurfaceUvs, useSurface } from './surfaces'
import { LANDING_END_Z, LANDING_HEIGHT, STAIRS, STAIRS_TOP_Z } from './terrain'

const STONE = '#b4a89a'
const WIDTH = STAIRS.halfWidth * 2

/** 낮고 넓은 돌계단: 올라가면 착지대(붉은 도리이), 반대편으로 내려오면 광장. */
export function Stairs() {
  const stone = useSurface('stone')
  const { rise, run, upSteps, downSteps, bottomZ, landingDepth } = STAIRS
  const surfaces = useMemo(
    () => ({
      up: Array.from({ length: upSteps }, (_, index) =>
        projectSurfaceUvs(new BoxGeometry(WIDTH, rise * (index + 1), run)),
      ),
      landing: projectSurfaceUvs(
        new BoxGeometry(WIDTH, LANDING_HEIGHT, landingDepth),
      ),
      down: Array.from({ length: downSteps }, (_, index) =>
        projectSurfaceUvs(
          new BoxGeometry(WIDTH, rise * (upSteps - index - 1), run),
        ),
      ),
    }),
    [downSteps, landingDepth, rise, run, upSteps],
  )
  return (
    <group>
      {Array.from({ length: upSteps }, (_, index) => (
        <mesh
          key={`up${index}`}
          geometry={surfaces.up[index]}
          receiveShadow
          castShadow
          position={[
            0,
            (rise * (index + 1)) / 2,
            bottomZ - (index + 0.5) * run,
          ]}
        >
          <meshStandardMaterial {...stone} color={STONE} roughness={1} />
        </mesh>
      ))}
      <mesh
        geometry={surfaces.landing}
        receiveShadow
        position={[0, LANDING_HEIGHT / 2, (STAIRS_TOP_Z + LANDING_END_Z) / 2]}
      >
        <meshStandardMaterial {...stone} color="#b9ad9e" roughness={1} />
      </mesh>
      {Array.from({ length: downSteps }, (_, index) => {
        const height = rise * (upSteps - index - 1)
        return (
          <mesh
            key={`down${index}`}
            geometry={surfaces.down[index]}
            receiveShadow
            position={[0, height / 2, LANDING_END_Z - (index + 0.5) * run]}
          >
            <meshStandardMaterial {...stone} color={STONE} roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}
