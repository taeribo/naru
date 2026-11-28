import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { StrictMode, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Group } from 'three'
import { VisitorModel } from '../scenes/VisitorModel'
import type { VisitorLook, VisitorPose } from '../scenes/VisitorModel'

const POSES: { pose: VisitorPose; label: string }[] = [
  { pose: 'stand', label: '서기·걷기' },
  { pose: 'ladle', label: '국자로 넣기' },
  { pose: 'eat', label: '앉아서 먹기' },
  { pose: 'sit', label: '앉기' },
]

/** 미리보기 전용: 새 캐릭터 차림 비교 화면. 게임에는 연결하지 않는다. */
const LOOKS: { name: string; look: VisitorLook }[] = [
  {
    name: '기모노 · 홍매',
    look: {
      outfit: 'kimono',
      robe: '#c93a5a',
      pattern: '#ffd6e0',
      obi: '#3a1f2a',
      cord: '#6fd3d6',
      hair: '#4a2c1f',
      flower: '#e64d68',
    },
  },
  {
    name: '하카마 · 먹색',
    look: {
      outfit: 'hakama',
      haori: '#1d1b23',
      hakama: '#8f8a80',
      stripe: '#6f6a62',
      hair: '#1b1a22',
    },
  },
  {
    name: '기모노 · 쪽빛',
    look: {
      outfit: 'kimono',
      robe: '#3e6fb8',
      pattern: '#d9ecff',
      obi: '#f1d38a',
      cord: '#c93a5a',
      hair: '#1b1a22',
      flower: '#ffb3c6',
    },
  },
  {
    name: '하카마 · 남색',
    look: {
      outfit: 'hakama',
      haori: '#273452',
      hakama: '#6b6f7a',
      stripe: '#545864',
      hair: '#3a2620',
    },
  },
  {
    name: '기모노 · 등꽃',
    look: {
      outfit: 'kimono',
      robe: '#8a4fb3',
      pattern: '#f3dcff',
      obi: '#2c2238',
      cord: '#f1d38a',
      hair: '#3a2620',
      flower: '#ff8fb0',
    },
  },
]

function OldVisitor() {
  return (
    <group>
      <mesh position-y={0.48}>
        <cylinderGeometry args={[0.21, 0.31, 0.67, 8]} />
        <meshStandardMaterial color="#74b6aa" />
      </mesh>
      <mesh position-y={0.99}>
        <sphereGeometry args={[0.2, 9, 7]} />
        <meshStandardMaterial color="#efd2bc" />
      </mesh>
      <mesh position-y={1.04} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.215, 9, 7]} />
        <meshStandardMaterial color="#1c1822" />
      </mesh>
      <mesh position={[0, 1.26, -0.06]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color="#1c1822" />
      </mesh>
      <mesh position-y={0.52}>
        <cylinderGeometry args={[0.285, 0.285, 0.16, 8]} />
        <meshStandardMaterial color="#c8302a" />
      </mesh>
    </group>
  )
}

function Turntable({
  spin,
  children,
  x,
}: {
  spin: boolean
  children: ReactNode
  x: number
}) {
  const group = useRef<Group>(null)
  useFrame((_state, delta) => {
    if (group.current && spin) group.current.rotation.y += delta * 0.6
  })
  // 얼굴이 -Z 방향이라 카메라 쪽(+Z)을 보도록 반 바퀴 돌려 둔다.
  return (
    <group position-x={x}>
      <group ref={group} rotation-y={Math.PI}>
        {children}
      </group>
    </group>
  )
}

function Preview() {
  const [walking, setWalking] = useState(true)
  const [spin, setSpin] = useState(false)
  const [poseIndex, setPoseIndex] = useState(0)
  const [bathing, setBathing] = useState(false)
  const [round, setRound] = useState(0)
  const pose = POSES[poseIndex].pose
  // 국자 동작은 한 번 하고 끝나므로 3.5초마다 처음부터 다시 보여 준다.
  useEffect(() => {
    if (pose !== 'ladle') return
    const timer = window.setInterval(() => setRound((value) => value + 1), 3500)
    return () => window.clearInterval(timer)
  }, [pose])
  const motion = useRef(1)
  motion.current = walking ? 1 : 0
  const spacing = 0.95
  const start = -((LOOKS.length - 1) * spacing) / 2

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#c9b2cf' }}>
      <Canvas
        camera={{ position: [0, 1.35, 6.2], fov: 42 }}
        shadows
        dpr={[1, 2]}
      >
        <color attach="background" args={['#cdb5d2']} />
        <fog attach="fog" args={['#cdb5d2', 10, 24]} />
        <hemisphereLight color="#e4e2ff" groundColor="#a7896e" intensity={1} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.8}
          color="#ffd2a6"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight
          position={[-4, 3, -3]}
          intensity={0.5}
          color="#b9c4ff"
        />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[9, 48]} />
          <meshStandardMaterial color="#8d8280" roughness={0.9} />
        </mesh>
        <Turntable spin={spin} x={start - spacing * 1.15}>
          <OldVisitor />
        </Turntable>
        {LOOKS.map(({ name, look }, index) => (
          <Turntable key={name} spin={spin} x={start + index * spacing}>
            <VisitorModel
              key={`${pose}-${round}`}
              look={look}
              motion={motion}
              pose={pose}
              bathing={bathing}
            />
          </Turntable>
        ))}
        <OrbitControls target={[0, 0.7, 0]} enablePan={false} />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          padding: 6,
          borderRadius: 999,
          background: '#2a1646dd',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {[
          {
            label: walking ? '걷기 멈춤' : '걷기',
            on: () => setWalking(!walking),
          },
          { label: spin ? '회전 멈춤' : '돌려 보기', on: () => setSpin(!spin) },
          {
            label: bathing ? '평상복 보기' : '온천 차림 보기',
            on: () => setBathing(!bathing),
          },
          {
            label: `자세: ${POSES[poseIndex].label}`,
            on: () => setPoseIndex((poseIndex + 1) % POSES.length),
          },
        ].map(({ label, on }) => (
          <button
            key={label}
            type="button"
            onClick={on}
            style={{
              border: '1px solid #e6c08a',
              borderRadius: 999,
              padding: '8px 16px',
              background: '#3a2160',
              color: '#ffe6b8',
              font: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p
        style={{
          position: 'absolute',
          bottom: 14,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: 'center',
          color: '#2a1646',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
        }}
      >
        맨 왼쪽은 지금 캐릭터 · 나머지는 새 캐릭터 시안 (드래그로 둘러보기, 휠로
        확대)
      </p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
