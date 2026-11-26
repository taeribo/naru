import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferGeometry, CatmullRomCurve3, Vector3 } from 'three'
import type { Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { taperedTube } from './shapes'

const SIZE = 0.5

function buildDragon() {
  // 머리가 +x 쪽. 구불구불한 몸 곡선(머리 → 꼬리).
  const body = new CatmullRomCurve3(
    Array.from({ length: 16 }, (_, index) => {
      const t = index / 15
      return new Vector3(
        6 - t * 12,
        Math.sin(t * Math.PI * 3.2) * 1.0,
        Math.cos(t * Math.PI * 2.2) * 0.45,
      )
    }),
  )
  const head = body.getPointAt(0)
  const whiskers = [-1, 1].map(
    (side) =>
      new CatmullRomCurve3([
        head.clone().add(new Vector3(0.7, -0.05, side * 0.1)),
        head.clone().add(new Vector3(1.4, 0.5, side * 0.6)),
        head.clone().add(new Vector3(0.6, 1.2, side * 1.3)),
        head.clone().add(new Vector3(-1.6, 0.9, side * 1.8)),
        head.clone().add(new Vector3(-3.4, 1.7, side * 1.2)),
      ]),
  )
  const whiskerGeometry = mergeGeometries(
    whiskers.map((curve) => taperedTube(curve, 0.03, 0.006, 4, 0, 24)),
  )
  const manes: { position: Vector3; size: number }[] = []
  for (let index = 0; index < 22; index += 1) {
    const t = 0.03 + index * 0.026
    manes.push({
      position: body.getPointAt(t).add(new Vector3(0, 0.3, 0)),
      size: 0.75 - index * 0.022,
    })
  }
  return {
    bodyGeometry: taperedTube(body, 0.34, 0.04, 8, 0, 60),
    whiskerGeometry: whiskerGeometry as BufferGeometry,
    head,
    manes,
    rider: body.getPointAt(0.13),
  }
}

/**
 * 하늘 높이 아주 작게 날아가는 흰 용(하쿠)과 등에 탄 소녀.
 * 일부러 작게 만들어서 찾아봐야 보이는 숨은 디테일로 둔다.
 */
export function Dragon() {
  const dragon = useMemo(buildDragon, [])
  const group = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    const angle = clock.elapsedTime * 0.04
    group.current.position.set(
      6 + Math.cos(angle) * 44,
      44 + Math.sin(angle * 2) * 3,
      -112 + Math.sin(angle) * 22,
    )
    // 몸의 +x 축이 진행 방향을 향하도록 회전
    group.current.rotation.y = Math.atan2(-Math.cos(angle), -Math.sin(angle))
  })

  return (
    <group ref={group} scale={SIZE}>
      <mesh geometry={dragon.bodyGeometry}>
        <meshStandardMaterial
          color="#f6f3ff"
          emissive="#bdb4ff"
          emissiveIntensity={1.1}
          roughness={0.7}
        />
      </mesh>
      <mesh
        position={dragon.head.clone().add(new Vector3(0.5, 0.1, 0))}
        scale={[0.95, 0.4, 0.34]}
      >
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial
          color="#f6f3ff"
          emissive="#bdb4ff"
          emissiveIntensity={1.1}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={dragon.head
            .clone()
            .add(new Vector3(-0.15, 0.4, side * 0.2))}
          rotation-z={1.9}
        >
          <coneGeometry args={[0.07, 0.8, 5]} />
          <meshStandardMaterial color="#f0d9a0" />
        </mesh>
      ))}
      <mesh geometry={dragon.whiskerGeometry}>
        <meshStandardMaterial
          color="#fff3e2"
          emissive="#ffe9cc"
          emissiveIntensity={1.1}
        />
      </mesh>
      {dragon.manes.map(({ position, size }, index) => (
        <mesh
          key={index}
          position={position}
          rotation-z={Math.PI / 2 + 0.5}
          scale={size}
        >
          <coneGeometry args={[0.2, 0.9, 5]} />
          <meshStandardMaterial
            color="#58c995"
            emissive="#2f9a6a"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
      {/* 등에 탄 아주 작은 소녀 */}
      <group position={dragon.rider.clone().add(new Vector3(0, 0.45, 0))}>
        <mesh position-y={0.15}>
          <capsuleGeometry args={[0.1, 0.22, 4, 8]} />
          <meshStandardMaterial
            color="#d7efe0"
            emissive="#9fd6b8"
            emissiveIntensity={0.4}
          />
        </mesh>
        <mesh position-y={0.43}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color="#f2d4bd" />
        </mesh>
        <mesh position={[-0.04, 0.5, 0]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color="#4a2e22" />
        </mesh>
      </group>
    </group>
  )
}
