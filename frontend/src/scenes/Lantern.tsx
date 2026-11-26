import { useMemo } from 'react'
import { AdditiveBlending, DoubleSide } from 'three'
import { getGlowTexture, getPaperTexture } from './textures'

const BAMBOO = '#8a5a2a'

/** 사각 천등(일본 소원등): 네모 기둥 한지, 대나무 틀, 앞면의 願. */
export function Lantern({
  scale = 1,
  glow = 1,
}: {
  scale?: number
  glow?: number
}) {
  const paper = useMemo(getPaperTexture, [])
  const halo = useMemo(getGlowTexture, [])

  return (
    <group scale={scale}>
      <mesh rotation-y={Math.PI / 4}>
        <cylinderGeometry args={[0.44, 0.36, 1.05, 4, 1, true]} />
        <meshStandardMaterial
          map={paper}
          emissiveMap={paper}
          emissive="#ff9a45"
          emissiveIntensity={0.95}
          roughness={0.9}
          side={DoubleSide}
        />
      </mesh>
      <mesh position-y={0.6} rotation-y={Math.PI / 4}>
        <cylinderGeometry args={[0.2, 0.44, 0.16, 4]} />
        <meshStandardMaterial
          map={paper}
          emissiveMap={paper}
          emissive="#ff9a45"
          emissiveIntensity={0.95}
          roughness={0.9}
        />
      </mesh>
      <mesh position-y={-0.52} rotation-y={Math.PI / 4}>
        <cylinderGeometry args={[0.37, 0.37, 0.035, 4, 1, true]} />
        <meshStandardMaterial color="#b97a3a" side={DoubleSide} />
      </mesh>
      {[0, Math.PI / 2].map((angle) => (
        <mesh key={angle} position-y={-0.52} rotation-y={angle}>
          <boxGeometry args={[0.52, 0.02, 0.02]} />
          <meshStandardMaterial color={BAMBOO} />
        </mesh>
      ))}
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 0.285, 0, z * 0.285]}>
            <boxGeometry args={[0.025, 1.05, 0.025]} />
            <meshStandardMaterial color={BAMBOO} />
          </mesh>
        )),
      )}
      <mesh position-y={-0.38} scale={[0.07, 0.13, 0.07]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#ffe08a" toneMapped={false} />
      </mesh>
      <sprite position-y={-0.3} scale={[0.9, 0.9, 1]}>
        <spriteMaterial
          map={halo}
          color="#ffd27a"
          opacity={0.9}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          fog={false}
        />
      </sprite>
      <sprite scale={[2.6 * glow, 2.6 * glow, 1]}>
        <spriteMaterial
          map={halo}
          color="#ff9a3c"
          opacity={0.55}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          fog={false}
        />
      </sprite>
    </group>
  )
}
