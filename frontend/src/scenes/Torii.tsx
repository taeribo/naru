import { useEffect, useMemo } from 'react'
import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three'
import { SnowCap } from './SnowCap'
import { LANDING_HEIGHT, TORII_Z } from './terrain'
import { projectSurfaceUvs, useSurface } from './surfaces'

const PILLAR_X = 4.23
const ROPE = new CatmullRomCurve3([
  new Vector3(-PILLAR_X, 6.13, 0.57),
  new Vector3(-2.26, 5.44, 0.75),
  new Vector3(0, 5.27, 0.85),
  new Vector3(2.26, 5.44, 0.75),
  new Vector3(PILLAR_X, 6.13, 0.57),
])

const SHIDE = new Shape()
SHIDE.moveTo(-0.13, 0)
SHIDE.lineTo(0.12, 0)
SHIDE.lineTo(-0.01, -0.22)
SHIDE.lineTo(0.16, -0.36)
SHIDE.lineTo(-0.11, -0.7)
SHIDE.lineTo(-0.22, -0.55)
SHIDE.lineTo(-0.07, -0.39)
SHIDE.lineTo(-0.24, -0.24)
SHIDE.closePath()

function beam(halfWidth: number, height: number, lift: number, depth: number) {
  const shape = new Shape()
  shape.moveTo(-halfWidth, lift + 0.09)
  shape.bezierCurveTo(-halfWidth * 0.74, 0.01, -2.5, 0, 0, 0)
  shape.bezierCurveTo(2.5, 0, halfWidth * 0.74, 0.01, halfWidth, lift + 0.09)
  shape.lineTo(halfWidth + 0.16, height + lift)
  shape.bezierCurveTo(halfWidth * 0.76, height + 0.04, 2.5, height, 0, height)
  shape.bezierCurveTo(
    -2.5,
    height,
    -halfWidth * 0.76,
    height + 0.04,
    -halfWidth - 0.16,
    height + lift,
  )
  shape.closePath()
  return projectSurfaceUvs(
    new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.038,
      bevelThickness: 0.034,
      bevelSegments: 2,
      curveSegments: 14,
    }).translate(0, 0, -depth / 2),
  )
}

function braidGeometry(strand: number) {
  const count = 104
  const phase = (strand * Math.PI * 2) / 3
  const frames = ROPE.computeFrenetFrames(count, false)
  const points = ROPE.getSpacedPoints(count)
  const wrapped = points.map((point, index) => {
    const angle = (index / count) * Math.PI * 42 + phase
    return point
      .addScaledVector(frames.normals[index], Math.cos(angle) * 0.087)
      .addScaledVector(frames.binormals[index], Math.sin(angle) * 0.087)
  })
  return new TubeGeometry(new CatmullRomCurve3(wrapped), 188, 0.073, 5, false)
}

const PLAQUE_TITLE = '새 해'
const PLAQUE_FONT = '400 286px "Nanum Brush Script"'

function PlaqueLettering() {
  const lettering = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 320
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return { canvas, texture }
  }, [])

  useEffect(() => {
    const { canvas, texture } = lettering
    const context = canvas.getContext('2d')
    if (!context) return
    let active = true
    function paint(useBrush: boolean) {
      if (!active || !context) return
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.font = useBrush ? PLAQUE_FONT : 'bold 228px serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.lineJoin = 'round'
      context.strokeStyle = '#6d4121'
      context.lineWidth = 5
      context.strokeText(PLAQUE_TITLE, 256, 166, 454)
      const gold = context.createLinearGradient(0, 48, 0, 264)
      gold.addColorStop(0, '#fff1bb')
      gold.addColorStop(0.52, '#f3cd82')
      gold.addColorStop(1, '#b68443')
      context.fillStyle = gold
      context.fillText(PLAQUE_TITLE, 256, 166, 454)
      texture.needsUpdate = true
    }
    paint(false)
    void document.fonts.load(PLAQUE_FONT, PLAQUE_TITLE).then(
      () => paint(true),
      () => undefined,
    )
    return () => {
      active = false
      texture.dispose()
    }
  }, [lettering])

  return (
    <mesh position-z={0.135}>
      <planeGeometry args={[0.88, 0.55]} />
      <meshBasicMaterial
        map={lettering.texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export function Torii() {
  const wood = useSurface('wood')
  const crown = useMemo(() => beam(6.22, 0.31, 0.52, 1.28), [])
  const upperBeam = useMemo(() => beam(5.8, 0.74, 0.35, 1.07), [])
  const braid = useMemo(() => [0, 1, 2].map(braidGeometry), [])

  return (
    <group position={[0, LANDING_HEIGHT, TORII_Z]}>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position-x={side * PILLAR_X}
          rotation-z={side * 0.036}
        >
          <mesh position-y={3.65} castShadow receiveShadow>
            <cylinderGeometry args={[0.49, 0.64, 7.3, 24]} />
            <meshStandardMaterial
              normalMap={wood.normalMap}
              roughnessMap={wood.roughnessMap}
              color="#ca673f"
              roughness={0.78}
            />
          </mesh>
          <mesh position-y={0.5} castShadow receiveShadow>
            <cylinderGeometry args={[0.64, 0.71, 1, 24]} />
            <meshStandardMaterial
              color="#39302d"
              roughness={0.61}
              metalness={0.36}
            />
          </mesh>
          {[0.96, 6.65].map((y) => (
            <mesh key={y} position-y={y} rotation-x={Math.PI / 2}>
              <torusGeometry args={[y < 1 ? 0.642 : 0.505, 0.057, 6, 24]} />
              <meshStandardMaterial
                color={y < 1 ? '#9c7956' : '#7e3428'}
                metalness={0.36}
                roughness={0.57}
              />
            </mesh>
          ))}
          <mesh position={[0, 6.0, 0.51]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.21, 0.21, 0.09, 16]} />
            <meshStandardMaterial
              color="#b28651"
              metalness={0.48}
              roughness={0.42}
            />
          </mesh>
        </group>
      ))}
      <mesh position-y={6.15} castShadow receiveShadow>
        <boxGeometry args={[10.66, 0.43, 0.64]} />
        <meshStandardMaterial
          normalMap={wood.normalMap}
          roughnessMap={wood.roughnessMap}
          color="#ae5233"
          roughness={0.86}
        />
      </mesh>
      <mesh geometry={upperBeam} position-y={7.1} castShadow receiveShadow>
        <meshStandardMaterial
          normalMap={wood.normalMap}
          roughnessMap={wood.roughnessMap}
          color="#bd603b"
          roughness={0.81}
        />
      </mesh>
      <mesh geometry={crown} position-y={7.85} castShadow receiveShadow>
        <meshStandardMaterial
          normalMap={wood.normalMap}
          roughnessMap={wood.roughnessMap}
          color="#34313a"
          roughness={0.87}
        />
        <SnowCap source={crown} thickness={0.12} />
      </mesh>
      <group position={[0, 6.96, 0.65]}>
        <mesh>
          <boxGeometry args={[1.08, 1.35, 0.18]} />
          <meshStandardMaterial
            color="#aa7d47"
            roughness={0.48}
            metalness={0.42}
          />
        </mesh>
        <mesh position-z={0.1}>
          <boxGeometry args={[0.93, 1.2, 0.035]} />
          <meshStandardMaterial {...wood} color="#49302a" roughness={0.79} />
        </mesh>
        <PlaqueLettering />
      </group>
      {braid.map((geometry, index) => (
        <mesh key={geometry.uuid} geometry={geometry} castShadow>
          <meshStandardMaterial
            color={['#b18a54', '#c6a271', '#a47c4b'][index]}
            roughness={0.94}
          />
        </mesh>
      ))}
      {[0.22, 0.37, 0.64, 0.79].map((offset, index) => (
        <mesh
          key={offset}
          position={ROPE.getPointAt(offset)}
          rotation-y={(index - 1.5) * 0.19}
        >
          <shapeGeometry args={[SHIDE]} />
          <meshStandardMaterial
            color="#fff2d8"
            side={DoubleSide}
            roughness={0.96}
          />
        </mesh>
      ))}
    </group>
  )
}
