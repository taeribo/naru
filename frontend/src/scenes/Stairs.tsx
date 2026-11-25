import { LANDING_END_Z, LANDING_HEIGHT, STAIRS, STAIRS_TOP_Z } from './terrain'

const STONE = '#9b93aa'
const WIDTH = STAIRS.halfWidth * 2

/** 낮고 넓은 돌계단: 올라가면 착지대(붉은 도리이), 반대편으로 내려오면 광장. */
export function Stairs() {
  const { rise, run, upSteps, downSteps, bottomZ, landingDepth } = STAIRS
  return (
    <group>
      {Array.from({ length: upSteps }, (_, index) => (
        <mesh
          key={`up${index}`}
          position={[
            0,
            (rise * (index + 1)) / 2,
            bottomZ - (index + 0.5) * run,
          ]}
        >
          <boxGeometry args={[WIDTH, rise * (index + 1), run]} />
          <meshStandardMaterial color={STONE} roughness={0.95} />
        </mesh>
      ))}
      <mesh
        position={[0, LANDING_HEIGHT / 2, (STAIRS_TOP_Z + LANDING_END_Z) / 2]}
      >
        <boxGeometry args={[WIDTH, LANDING_HEIGHT, landingDepth]} />
        <meshStandardMaterial color="#a69eb4" roughness={0.95} />
      </mesh>
      {Array.from({ length: downSteps }, (_, index) => {
        const height = rise * (upSteps - index - 1)
        return (
          <mesh
            key={`down${index}`}
            position={[0, height / 2, LANDING_END_Z - (index + 0.5) * run]}
          >
            <boxGeometry args={[WIDTH, height, run]} />
            <meshStandardMaterial color={STONE} roughness={0.95} />
          </mesh>
        )
      })}
    </group>
  )
}
