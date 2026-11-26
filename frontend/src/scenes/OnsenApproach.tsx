import { useMemo } from 'react'
import {
  BoxGeometry,
  CatmullRomCurve3,
  DoubleSide,
  LatheGeometry,
  PlaneGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Architecture } from './EntranceArchitecture'
import { SnowCap } from './SnowCap'
import { SteamPlume } from './SteamPlume'
import { roofGeometry } from './shapes'
import { projectSurfaceUvs, useSurface } from './surfaces'
import { ZONES } from './terrain'
import { getEmaTexture } from './textures'

const PATH_Z = ZONES.rest[1]
/** 지붕을 얹은 향로(조코로): 청동 향로와 석재 받침, 피어오르는 연기. */
function Jokoro({ position }: { position: [number, number, number] }) {
  const stone = useSurface('stone')
  const tile = useSurface('roof')
  const bowl = useMemo(
    () =>
      new LatheGeometry(
        [
          new Vector2(0, 0),
          new Vector2(0.34, 0.02),
          new Vector2(0.58, 0.2),
          new Vector2(0.56, 0.48),
          new Vector2(0.66, 0.56),
          new Vector2(0.6, 0.6),
          new Vector2(0.48, 0.52),
          new Vector2(0, 0.5),
        ],
        20,
      ),
    [],
  )
  const roof = useMemo(() => roofGeometry(1.45, 1.45, 0.5, 0.25), [])
  return (
    <group position={position}>
      <mesh position-y={0.17} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.34, 1.9]} />
        <meshStandardMaterial {...stone} color="#9a949c" />
      </mesh>
      <mesh geometry={bowl} position-y={0.38} castShadow>
        <meshStandardMaterial
          color="#4a3b2a"
          metalness={0.65}
          roughness={0.5}
        />
      </mesh>
      {[-0.82, 0.82].flatMap((x) =>
        [-0.82, 0.82].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.55, z]} castShadow>
            <cylinderGeometry args={[0.045, 0.05, 2.4, 6]} />
            <meshStandardMaterial
              color="#2b2724"
              metalness={0.5}
              roughness={0.6}
            />
          </mesh>
        )),
      )}
      <mesh geometry={roof} position-y={2.72} castShadow>
        <meshStandardMaterial {...tile} color="#4d505e" side={DoubleSide} />
        <SnowCap source={roof} thickness={0.1} />
      </mesh>
      <SteamPlume
        position={[0, 0.95, 0]}
        radius={0.25}
        height={2.4}
        count={14}
        size={0.7}
        opacity={0.26}
        speed={0.06}
        color={[0.72, 0.72, 0.76]}
        seed={4}
      />
    </group>
  )
}

/** 에마 걸이: 소원 글이 적힌 나무 패가 줄지어 걸린 목조 틀. */
function EmaHanger({
  position,
  yaw = 0,
}: {
  position: [number, number, number]
  yaw?: number
}) {
  const wood = useSurface('wood')
  const ema = getEmaTexture()
  const plaques = useMemo(() => {
    const items = [1.95, 1.5, 1.05].flatMap((y, row) =>
      Array.from({ length: 7 }, (_, column) => {
        const plane = new PlaneGeometry(0.34, 0.34)
        plane.rotateY(((column * 7 + row) % 3) * 0.05 - 0.05)
        plane.translate(-1.2 + column * 0.4, y - 0.18, 0.12)
        return plane
      }),
    )
    return mergeGeometries(items)
  }, [])
  const frame = useMemo(() => {
    const parts = [
      new BoxGeometry(0.16, 2.5, 0.16).translate(-1.7, 1.25, 0),
      new BoxGeometry(0.16, 2.5, 0.16).translate(1.7, 1.25, 0),
      new BoxGeometry(3.7, 0.18, 0.3).translate(0, 2.4, 0),
      ...[1.95, 1.5, 1.05].map((y) =>
        new BoxGeometry(3.4, 0.07, 0.07).translate(0, y, 0.1),
      ),
    ]
    return projectSurfaceUvs(mergeGeometries(parts))
  }, [])
  const roof = useMemo(
    () => projectSurfaceUvs(new BoxGeometry(4.3, 0.1, 1.5)),
    [],
  )
  return (
    <group position={position} rotation-y={yaw}>
      <mesh geometry={frame} castShadow>
        <meshStandardMaterial {...wood} color="#7b2e22" roughness={0.8} />
      </mesh>
      <mesh geometry={plaques}>
        <meshStandardMaterial
          map={ema}
          alphaTest={0.5}
          side={DoubleSide}
          roughness={0.85}
        />
      </mesh>
      <mesh
        geometry={roof}
        position={[0, 2.62, 0.1]}
        rotation-x={0.18}
        castShadow
      >
        <meshStandardMaterial {...wood} color="#4a3426" />
        <SnowCap source={roof} thickness={0.1} />
      </mesh>
    </group>
  )
}

/** 시메나와: 굵은 기둥 두 개 사이를 건너는 금줄과 종이 오리(시데). 길 입구를 표시한다. */
function Shimenawa({ x }: { x: number }) {
  const wood = useSurface('wood')
  const half = 2.7
  const rope = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, 3.05, -half),
      new Vector3(0, 2.7, -half / 2),
      new Vector3(0, 2.55, 0),
      new Vector3(0, 2.7, half / 2),
      new Vector3(0, 3.05, half),
    ])
    return new TubeGeometry(curve, 24, 0.1, 6, false)
  }, [])
  const shide = useMemo(
    () =>
      mergeGeometries(
        [-1.6, -0.55, 0.55, 1.6].map((z) => {
          const sheet = new PlaneGeometry(0.2, 0.62)
          sheet.rotateY(Math.PI / 2)
          sheet.translate(0, 2.2, z)
          return sheet
        }),
      ),
    [],
  )
  return (
    <group position={[x, 0, PATH_Z]}>
      {[-half, half].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position-y={1.7} castShadow>
            <cylinderGeometry args={[0.2, 0.26, 3.4, 10]} />
            <meshStandardMaterial {...wood} color="#8a4a30" roughness={0.9} />
          </mesh>
          <mesh position-y={0.22}>
            <cylinderGeometry args={[0.36, 0.42, 0.44, 10]} />
            <meshStandardMaterial color="#6f6a72" roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh geometry={rope} castShadow>
        <meshStandardMaterial color="#d6bd85" roughness={1} />
      </mesh>
      <mesh geometry={shide}>
        <meshStandardMaterial
          color="#f4f1ea"
          emissive="#ffffff"
          emissiveIntensity={0.25}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

/** 온천 참배길: 시메나와, 향로, 석등, 에마 걸이만 두고 길은 열어 온천 건물이 보이게 한다. */
export function OnsenApproach() {
  return (
    <group>
      <Shimenawa x={7.2} />
      <Jokoro position={[15.4, 0, PATH_Z]} />
      {[
        [13.1, -2.2],
        [13.1, 2.2],
        [17.8, -2.2],
        [17.8, 2.2],
      ].map(([x, dz]) => (
        <Architecture
          key={`${x}${dz}`}
          model="stone-lantern"
          position={[x, 0, PATH_Z + dz]}
          scale={0.9}
          yaw={dz > 0 ? Math.PI : 0}
        />
      ))}
      <EmaHanger position={[24.4, 0, PATH_Z - 5.2]} />
    </group>
  )
}
