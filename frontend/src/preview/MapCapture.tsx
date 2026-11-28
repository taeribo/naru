import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Castle } from '../scenes/Castle'
import { CherryTree } from '../scenes/CherryTree'
import { CourtyardLandmarks } from '../scenes/CourtyardLandmarks'
import { EntranceArchitecture } from '../scenes/EntranceArchitecture'
import { FestivalRim } from '../scenes/FestivalRim'
import { Forecourt } from '../scenes/Forecourt'
import { Fuji } from '../scenes/Fuji'
import { GardenTerrain } from '../scenes/GardenTerrain'
import { Hills } from '../scenes/Hills'
import { Japan } from '../scenes/Japan'
import { FlowerBed, Ground, Village } from '../scenes/Landmarks'
import { OnsenApproach } from '../scenes/OnsenApproach'
import { OnsenTamago } from '../scenes/OnsenTamago'
import { Sky } from '../scenes/Sky'
import { StreetStalls } from '../scenes/StreetStalls'
import {
  CHERRY_POSITION,
  STAIRS,
  STAIRS_END_Z,
  WORLD_BOUNDS,
} from '../scenes/terrain'
import { DoubleSide, MeshBasicMaterial, OrthographicCamera } from 'three'
import type { Material, Object3D } from 'three'
import { preloadSurfaces } from '../scenes/surfaces'
import { Zones } from '../scenes/Zones'

/**
 * 개발용: 지도에 넣을 장소 사진을 찍는 화면. ?place=fortune 처럼 장소를 고르면
 * 그 장소를 비추는 고정 카메라로 광장을 그린다. 게임에는 연결하지 않는다.
 */
const VIEWS: Record<
  string,
  { from: [number, number, number]; at: [number, number, number] }
> = {
  entrance: { from: [0, 3.4, 53], at: [0, 3, 32] },
  stalls: { from: [-1.5, 3.6, 41], at: [-9.4, 2, 33] },
  torii: { from: [0, 3.4, 40], at: [0, 4.4, 26] },
  cherry: { from: [6, 6.5, 25], at: [-7.8, 4.6, 2.5] },
  fortune: { from: [-19.5, 4.2, 15.5], at: [-24, 1.8, 5] },
  wish: { from: [-33.6, 3.2, -10], at: [-31, 1.6, -17] },
  bell: { from: [28, 4.6, 16.5], at: [24, 2.4, 6] },
  onsen: { from: [28, 8, 0], at: [36, 2, -20] },
  egg: { from: [-6, 4.6, -21.5], at: [-3, 1.8, -31] },
  sanctuary: { from: [18.4, 6, -12], at: [18.4, 4, -31] },
}

/** 촬영한 사진을 받아 저장하는 로컬 개발용 주소. */
const SAVE_URL = 'http://localhost:5181/'
const params = new URLSearchParams(location.search)
const only = params.get('only')
const PLACES = only ? only.split(',') : Object.keys(VIEWS)

/**
 * ?overview: 광장 전체를 비스듬히 내려다보는 지도용 큰 사진.
 * 사진과 함께 카메라 투영 행렬을 저장해, 지도에서 게임 좌표를 사진 위 위치로 바꿀 수 있게 한다.
 */
const OVERVIEW = params.has('overview')
const OVERVIEW_SIZE = { width: 1400, height: 1150 }
const OVERVIEW_VIEW = { from: [0, 112, 78] as const, at: [0, 0, 5] as const }

/**
 * ?walkable: 걸을 수 있는 곳 지도(public/map/walkable.png). 흰 칸이 막힌 곳이다.
 * 두 가지를 합친다.
 * 1) 위에서 내려다보며 사람 몸높이 띠(0.5~1.7m)에 걸리는 면이 있으면 막힘(매대, 바위, 난간).
 * 2) 몸 한가운데(1m)에서 위를 올려다볼 때 가장 가까운 면이 뒷면이면 물체 속이라 막힘(건물, 기둥).
 * 계단 구역은 계단 자체가 막히지 않도록 계단 위 높이에서 같은 검사를 한다.
 * 한 칸은 0.125m로 찍고, 게임에서 0.25m 칸으로 묶어 쓴다.
 */
const WALKABLE = params.has('walkable')
const CELL = 0.125
const GRID = {
  width: (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / CELL,
  height: (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / CELL,
}
const CENTER_Z = (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2

function hidden(object: Object3D) {
  if ('isPoints' in object || 'isSprite' in object || 'isLine' in object)
    return true
  const material = (object as Object3D & { material?: Material | Material[] })
    .material
  const list = Array.isArray(material) ? material : material ? [material] : []
  return list.some((item) => item.transparent || !item.visible)
}

/** 앞면은 검정, 뒷면은 흰색으로 칠한다. */
function facingMaterial(backOnly: boolean) {
  const material = new MeshBasicMaterial({ side: DoubleSide })
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      /}\s*$/,
      backOnly
        ? 'gl_FragColor = gl_FrontFacing ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(1.0);\n}'
        : 'gl_FragColor = vec4(1.0);\n}',
    )
  }
  material.customProgramCacheKey = () => (backOnly ? 'facing' : 'solid')
  return material
}

function WalkablePhotographer() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const frames = useRef(0)
  useFrame(() => {
    if (frames.current < 0) return
    frames.current += 1
    if (frames.current < 120) return
    frames.current = -1
    const halfDepth = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / 2
    const camera = new OrthographicCamera(
      WORLD_BOUNDS.minX,
      WORLD_BOUNDS.maxX,
      halfDepth,
      -halfDepth,
      0,
      1,
    )
    scene.traverse((object) => {
      if (hidden(object)) object.visible = false
    })
    scene.background = null
    scene.fog = null
    gl.setClearColor('#000000', 1)
    const solid = facingMaterial(false)
    const facing = facingMaterial(true)

    const result = document.createElement('canvas')
    result.width = GRID.width
    result.height = GRID.height
    const out = result.getContext('2d')!
    out.globalCompositeOperation = 'lighten'

    /** 한 번 찍어 결과에 겹친다(흰 칸끼리 합집합). 올려다볼 때는 위아래가 뒤집혀 다시 뒤집는다. */
    function pass(
      from: number,
      depth: number,
      lookingUp: boolean,
      clip?: { left: number; top: number; width: number; height: number },
    ) {
      scene.overrideMaterial = lookingUp ? facing : solid
      camera.up.set(0, 0, lookingUp ? 1 : -1)
      camera.position.set(0, from, CENTER_Z)
      camera.lookAt(0, lookingUp ? from + 1 : from - 1, CENTER_Z)
      camera.near = 0
      camera.far = depth
      camera.updateProjectionMatrix()
      gl.render(scene, camera)
      out.save()
      if (clip) {
        out.beginPath()
        out.rect(clip.left, clip.top, clip.width, clip.height)
        out.clip()
      }
      if (lookingUp) {
        out.translate(0, GRID.height)
        out.scale(1, -1)
      }
      out.drawImage(gl.domElement, 0, 0)
      out.restore()
    }

    const stairs = {
      left: (-STAIRS.halfWidth - WORLD_BOUNDS.minX) / CELL,
      top: (STAIRS_END_Z - WORLD_BOUNDS.minZ) / CELL,
      width: (STAIRS.halfWidth * 2) / CELL,
      height: (STAIRS.bottomZ - STAIRS_END_Z) / CELL,
    }
    // 지면 기준
    pass(1.7, 1.2, false)
    pass(1.0, 2.5, true)
    // 계단 구역은 지면 기준 결과를 지우고 계단 위 기준으로 다시 찍는다.
    out.globalCompositeOperation = 'source-over'
    out.fillStyle = '#000000'
    out.fillRect(stairs.left, stairs.top, stairs.width, stairs.height)
    out.globalCompositeOperation = 'lighten'
    pass(2.9, 1.5, false, stairs)
    pass(2.2, 1.5, true, stairs)

    void fetch(SAVE_URL + 'walkable', {
      method: 'POST',
      body: result.toDataURL('image/png'),
    }).then(() => {
      document.title = '촬영 완료'
    })
  })
  return null
}

function OverviewPhotographer() {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const frames = useRef(0)
  useFrame(() => {
    if (frames.current < 0) return
    camera.position.set(...OVERVIEW_VIEW.from)
    camera.lookAt(...OVERVIEW_VIEW.at)
    camera.updateMatrixWorld()
    frames.current += 1
    if (frames.current < 150) return
    frames.current = -1
    const image = gl.domElement.toDataURL('image/jpeg', 0.88)
    const projection = camera.projectionMatrix
      .clone()
      .multiply(camera.matrixWorldInverse)
    const meta = JSON.stringify({
      ...OVERVIEW_SIZE,
      matrix: projection.elements,
    })
    void Promise.all([
      fetch(SAVE_URL + 'overview', { method: 'POST', body: image }),
      fetch(SAVE_URL + 'overview-json', { method: 'POST', body: meta }),
    ]).then(() => {
      document.title = '촬영 완료'
    })
  })
  return null
}

/** 장소마다 카메라를 옮기고, 텍스처가 다 그려질 시간을 둔 뒤 한 장씩 찍어 보낸다. */
function Photographer() {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const state = useRef({ index: 0, frames: 0, busy: false })
  useFrame(() => {
    const step = state.current
    if (step.busy || step.index >= PLACES.length) return
    const name = PLACES[step.index]
    const view = VIEWS[name]
    camera.position.set(...view.from)
    camera.lookAt(...view.at)
    step.frames += 1
    if (step.frames < 90) return
    step.busy = true
    const image = gl.domElement.toDataURL('image/jpeg', 0.86)
    void fetch(SAVE_URL + name, { method: 'POST', body: image }).finally(() => {
      step.index += 1
      step.frames = 0
      step.busy = false
      document.title = `촬영 ${step.index}/${PLACES.length}`
    })
  })
  return null
}

preloadSurfaces()

createRoot(document.getElementById('root')!).render(
  <Canvas
    camera={{ fov: OVERVIEW ? 40 : 50, near: 0.1, far: 800 }}
    dpr={1}
    shadows={OVERVIEW}
    gl={{ preserveDrawingBuffer: true }}
    style={WALKABLE ? GRID : OVERVIEW ? OVERVIEW_SIZE : undefined}
  >
    {WALKABLE ? (
      <WalkablePhotographer />
    ) : OVERVIEW ? (
      <OverviewPhotographer />
    ) : (
      <Photographer />
    )}
    <Suspense fallback={null}>
      {!OVERVIEW && <fog attach="fog" args={['#ada3ad', 45, 258]} />}
      <hemisphereLight
        color={OVERVIEW ? '#fff1dc' : '#dde4ff'}
        groundColor="#a7896e"
        intensity={OVERVIEW ? 1.9 : 0.76}
      />
      <directionalLight
        position={[30, 18, -38]}
        intensity={OVERVIEW ? 2.6 : 1.66}
        color="#ffc28b"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-normalBias={0.055}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[-9, 10, 26]}
        color="#ffd4b5"
        intensity={0.36}
      />
      <Sky />
      <GardenTerrain />
      <EntranceArchitecture />
      <StreetStalls />
      <OnsenApproach />
      <OnsenTamago
        visitor={undefined}
        onMove={() => {}}
        snack={null}
        onSnack={() => {}}
      />
      <Forecourt />
      <FestivalRim />
      <Ground />
      <CourtyardLandmarks />
      <Village />
      <Fuji />
      <Hills />
      <Castle />
      <Japan />
      <Zones onSelect={() => {}} visitor={undefined} />
      <group position={CHERRY_POSITION}>
        <FlowerBed />
        <group scale={1.76}>
          <CherryTree />
        </group>
      </group>
    </Suspense>
  </Canvas>,
)
