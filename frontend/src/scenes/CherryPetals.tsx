import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import {
  DoubleSide,
  InstancedBufferAttribute,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import { getPetalTexture } from './textures'

const PETAL_COUNT = 3000
const FALL_HEIGHT = 16

/**
 * 꽃잎 3000장의 위치·회전을 매 프레임 CPU에서 다시 계산하던 것을
 * 그래픽카드(정점 셰이더)에서 시간만 받아 계산하도록 옮겼다. 움직임 공식은 같다.
 */
function petalGeometry() {
  const geometry = new PlaneGeometry(1, 1.4)
  const origin = new Float32Array(PETAL_COUNT * 2)
  const petal = new Float32Array(PETAL_COUNT * 4)
  for (let index = 0; index < PETAL_COUNT; index += 1) {
    const angle = index * 2.39996
    const radius = 1 + (index % 41) * 0.32
    origin.set([Math.cos(angle) * radius, Math.sin(angle) * radius], index * 2)
    petal.set(
      [
        index * 0.329,
        0.6 + (index % 7) * 0.1,
        0.05 + (index % 5) * 0.014,
        1.2 + (index % 6) * 0.45,
      ],
      index * 4,
    )
  }
  geometry.setAttribute('aOrigin', new InstancedBufferAttribute(origin, 2))
  geometry.setAttribute('aPetal', new InstancedBufferAttribute(petal, 4))
  return geometry
}

const time = { value: 0 }

function petalMaterial() {
  const material = new MeshBasicMaterial({
    map: getPetalTexture(),
    alphaTest: 0.35,
    side: DoubleSide,
    toneMapped: false,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec2 aOrigin;
attribute vec4 aPetal; // phase, speed, size, spin
uniform float uTime;
mat3 petalRotation(vec3 a) {
  float cx = cos(a.x), sx = sin(a.x);
  float cy = cos(a.y), sy = sin(a.y);
  float cz = cos(a.z), sz = sin(a.z);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
  mat3 ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 rz = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
  return rx * ry * rz;
}`,
      )
      .replace(
        '#include <begin_vertex>',
        `float phase = aPetal.x;
float fall = mod(phase * 3.0 + uTime * aPetal.y, ${FALL_HEIGHT.toFixed(1)});
vec3 spinAngles = vec3(
  uTime * aPetal.w + phase,
  uTime * aPetal.w * 0.7,
  phase + uTime * 0.4
);
vec3 transformed = petalRotation(spinAngles) * (position * aPetal.z) + vec3(
  aOrigin.x + sin(uTime * 0.6 + phase) * 1.1 + fall * 0.22,
  ${FALL_HEIGHT.toFixed(1)} - fall,
  aOrigin.y + cos(uTime * 0.45 + phase) * 0.8
);`,
      )
  }
  material.customProgramCacheKey = () => 'cherry-petals'
  return material
}

export function CherryPetals() {
  const geometry = useMemo(petalGeometry, [])
  const material = useMemo(petalMaterial, [])

  useFrame(({ clock }) => {
    time.value = clock.elapsedTime
  })

  return (
    <instancedMesh
      args={[geometry, material, PETAL_COUNT]}
      frustumCulled={false}
    />
  )
}
