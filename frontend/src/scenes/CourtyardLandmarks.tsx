import { SnowCap } from './SnowCap'
import { pineSnow, propSnow, roofSnow, snowProgramKey } from './snow'
import { useMemo } from 'react'
import { BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ContactShade } from './ContactShade'
import { createShrubGeometry } from './shrubGeometry'
import { roofGeometry } from './shapes'
import { useSurface } from './surfaces'
import { getFacadeGlowTexture, getFacadeTexture } from './textures'
import { STAIRS, WORLD_BOUNDS, ZONES } from './terrain'

export const SANCTUARY_Z = WORLD_BOUNDS.minZ - 9

const GARDEN_GROUPS = [
  [-8.6, STAIRS.bottomZ + 6.6],
  [8.6, STAIRS.bottomZ + 6.6],
  [-10.1, 20.8],
  [10.8, 19.5],
  [ZONES.fortune[0] - 4.2, ZONES.fortune[1] + 3.2],
  [ZONES.rest[0] + 4.2, ZONES.rest[1] + 3.0],
] as const

function buildGarden() {
  const stone = GARDEN_GROUPS.flatMap(([x, z]) => [
    new CylinderGeometry(1.72, 1.92, 0.38, 9).translate(x, 0.19, z),
    new BoxGeometry(0.41, 0.5, 0.41).translate(x - 0.57, 0.55, z + 0.62),
    new ConeGeometry(0.43, 0.21, 4)
      .rotateY(Math.PI / 4)
      .translate(x - 0.57, 1.14, z + 0.62),
  ])
  const shrub = createShrubGeometry()
  const plants = GARDEN_GROUPS.flatMap(([x, z]) => [
    shrub
      .clone()
      .scale(0.94, 0.54, 0.86)
      .translate(x + 0.61, 0.48, z + 0.15),
    shrub
      .clone()
      .scale(0.85, 0.48, 0.67)
      .translate(x - 0.57, 0.52, z - 0.4),
  ])
  shrub.dispose()
  const paper = GARDEN_GROUPS.map(([x, z]) =>
    new BoxGeometry(0.41, 0.3, 0.41).translate(x - 0.57, 0.93, z + 0.62),
  )
  const layers = {
    stone: mergeGeometries(stone),
    plants: mergeGeometries(plants),
    paper: mergeGeometries(paper),
  }
  for (const geometry of [...stone, ...plants, ...paper]) geometry.dispose()
  return layers
}

export function CourtyardLandmarks() {
  const wood = useSurface('wood')
  const stone = useSurface('stone')
  const tile = useSurface('roof')
  const roof = useMemo(() => roofGeometry(8.8, 5.2, 2.9, 0.7), [])
  const upperRoof = useMemo(() => roofGeometry(5.0, 3.15, 2.0, 0.36), [])
  const porch = useMemo(() => roofGeometry(4.3, 3.3, 1.8, 0.5), [])
  const facade = useMemo(getFacadeTexture, [])
  const facadeGlow = useMemo(getFacadeGlowTexture, [])
  const garden = useMemo(buildGarden, [])

  return (
    <>
      <group position={[0, 0, SANCTUARY_Z]} scale={[1.41, 1.73, 1.2]}>
        <ContactShade width={23} depth={12} />
        <mesh position-y={0.63}>
          <boxGeometry args={[16, 1.24, 8.8]} />
          <meshStandardMaterial {...stone} color="#a49aa4" roughness={1} />
        </mesh>
        <mesh position={[0, 3.2, -0.65]}>
          <boxGeometry args={[13.8, 4.04, 6.2]} />
          <meshStandardMaterial {...wood} color="#a57a66" roughness={1} />
        </mesh>
        {[-5.1, -2.55, 0, 2.55, 5.1].map((x) => (
          <mesh key={x} position={[x, 3.17, 2.49]}>
            <planeGeometry args={[x === 0 ? 2.6 : 2.15, 2.55]} />
            <meshStandardMaterial
              map={facade}
              emissiveMap={facadeGlow}
              emissive="#ffd397"
              emissiveIntensity={1.25}
              roughness={0.88}
            />
          </mesh>
        ))}
        {[-6.65, -2.3, 2.3, 6.65].map((x) => (
          <mesh key={x} position={[x, 3.17, 3.77]}>
            <cylinderGeometry args={[0.19, 0.24, 3.86, 8]} />
            <meshStandardMaterial
              normalMap={wood.normalMap}
              roughnessMap={wood.roughnessMap}
              color="#a3503b"
              roughness={1}
            />
          </mesh>
        ))}
        <mesh geometry={roof} position-y={5.25}>
          <meshStandardMaterial
            onBeforeCompile={roofSnow}
            customProgramCacheKey={snowProgramKey}
            {...tile}
            color="#8e929c"
            roughness={1}
            side={DoubleSide}
          />
          <SnowCap source={roof} />
        </mesh>
        <mesh position={[0, 7.85, -0.4]}>
          <boxGeometry args={[7.15, 1.55, 4.3]} />
          <meshStandardMaterial
            map={facade}
            emissiveMap={facadeGlow}
            emissive="#ffd397"
            emissiveIntensity={0.76}
            roughness={1}
          />
        </mesh>
        <mesh geometry={upperRoof} position={[0, 8.63, -0.4]}>
          <meshStandardMaterial
            onBeforeCompile={roofSnow}
            customProgramCacheKey={snowProgramKey}
            {...tile}
            color="#8e929c"
            roughness={1}
            side={DoubleSide}
          />
          <SnowCap source={upperRoof} />
        </mesh>
        <mesh geometry={porch} position={[0, 4.63, 3.62]}>
          <meshStandardMaterial
            onBeforeCompile={roofSnow}
            customProgramCacheKey={snowProgramKey}
            {...tile}
            color="#8e929c"
            roughness={1}
            side={DoubleSide}
          />
          <SnowCap source={porch} />
        </mesh>
        {[0, 1, 2, 3, 4].map((step) => {
          const rise = (5 - step) * 0.24
          return (
            <mesh key={step} position={[0, rise / 2, 4.68 + step * 0.56]}>
              <boxGeometry args={[6, rise, 0.57]} />
              <meshStandardMaterial {...stone} color="#b2a9ae" roughness={1} />
            </mesh>
          )
        })}
      </group>
      {GARDEN_GROUPS.map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <ContactShade width={5} depth={4.1} />
        </group>
      ))}
      <mesh geometry={garden.stone}>
        <meshStandardMaterial
          {...stone}
          color="#aa9c8f"
          roughness={1}
          onBeforeCompile={propSnow}
          customProgramCacheKey={snowProgramKey}
        />
      </mesh>
      <mesh geometry={garden.plants}>
        <meshStandardMaterial
          vertexColors
          side={DoubleSide}
          roughness={0.87}
          onBeforeCompile={pineSnow}
          customProgramCacheKey={snowProgramKey}
        />
      </mesh>
      <mesh geometry={garden.paper}>
        <meshStandardMaterial
          color="#ffe2b0"
          emissive="#efaa58"
          emissiveIntensity={0.65}
        />
      </mesh>
    </>
  )
}
