import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MeshStandardMaterial,
  Vector3,
} from 'three'

type SnowShader = MeshStandardMaterial['onBeforeCompile']

// Snow stays attached to the scene, including when the camera or an instanced tree turns.
function snowMask(coverage: number, slope: number): SnowShader {
  return (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSnowPosition;\nvarying vec3 vSnowNormal;',
      )
      .replace(
        '#include <defaultnormal_vertex>',
        `
        #include <defaultnormal_vertex>
        vSnowNormal = inverseTransformDirection(transformedNormal, viewMatrix);
      `,
      )
      .replace(
        '#include <project_vertex>',
        `
        #include <project_vertex>
        vec4 snowPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          snowPosition = instanceMatrix * snowPosition;
        #endif
        vSnowPosition = (modelMatrix * snowPosition).xyz;
      `,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vSnowPosition;
        varying vec3 vSnowNormal;

        float snowNoise(vec3 p) {
          float soft = sin(dot(p, vec3(0.83, 0.57, 1.24)));
          float fine = sin(dot(p, vec3(-1.69, 0.41, 0.67)) + soft);
          return 0.5 + soft * 0.31 + fine * 0.19;
        }
      `,
      )
      .replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float snowSlope = max(0.0, normalize(vSnowNormal).y);
        float snowCover = snowNoise(vSnowPosition * 1.65) * 0.77
          + snowNoise(vSnowPosition * 5.3) * 0.23;
        float snowLayer = smoothstep(${slope.toFixed(2)}, ${(slope + 0.33).toFixed(2)}, snowSlope)
          * smoothstep(${(0.67 - coverage).toFixed(2)}, ${(0.84 - coverage).toFixed(2)}, snowCover);
        vec3 snowTint = mix(vec3(0.65, 0.71, 0.78), vec3(0.91, 0.9, 0.84),
          snowNoise(vSnowPosition * 23.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, snowTint, snowLayer);
      `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.96, snowLayer);
      `,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `
        #include <normal_fragment_maps>
        float snowGrain = snowNoise(vSnowPosition * 37.0);
        normal = normalize(normal + vec3(dFdx(snowGrain), dFdy(snowGrain), 0.0) * snowLayer * 0.09);
      `,
      )
  }
}

export const roofSnow = snowMask(0.44, 0.22)
export const pineSnow = snowMask(0.35, 0.36)
export const blossomSnow = snowMask(0.1, 0.58)
export const barkSnow = snowMask(0.16, 0.49)
export const propSnow = snowMask(0.29, 0.46)

export const snowMaterial = new MeshStandardMaterial({
  color: '#e0e0da',
  roughness: 0.97,
  metalness: 0,
  side: DoubleSide,
})

// Shader sources with the same function text but different thresholds need distinct programs.
export function snowProgramKey(this: MeshStandardMaterial) {
  if (this.onBeforeCompile === roofSnow) return 'roof-snow'
  if (this.onBeforeCompile === pineSnow) return 'pine-snow'
  if (this.onBeforeCompile === blossomSnow) return 'blossom-snow'
  if (this.onBeforeCompile === barkSnow) return 'bark-snow'
  return 'prop-snow'
}
snowMaterial.onBeforeCompile = roofSnow
snowMaterial.customProgramCacheKey = snowProgramKey

/** Build a thin cap and rounded-down edges from the original upward-facing triangles. */
export function createSnowCap(
  geometry: BufferGeometry,
  thickness: number,
  minimumHeight = -Infinity,
  minimumSlope = 0.29,
) {
  const source = geometry.attributes.position
  const indices = geometry.index
  const positions: number[] = []
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const cross = new Vector3()
  const edge = new Vector3()
  const size = indices?.count ?? source.count

  function triangle(first: Vector3, second: Vector3, third: Vector3) {
    positions.push(
      first.x,
      first.y,
      first.z,
      second.x,
      second.y,
      second.z,
      third.x,
      third.y,
      third.z,
    )
  }

  function raised(point: Vector3) {
    const variation =
      0.51 +
      0.32 * Math.sin(point.x * 1.5 + point.z * 2.7) +
      0.14 * Math.cos(point.z * 6.2 - point.x * 2.2)
    return point.clone().add(new Vector3(0, thickness * variation, 0))
  }

  for (let index = 0; index < size; index += 3) {
    a.fromBufferAttribute(source, indices ? indices.getX(index) : index)
    b.fromBufferAttribute(source, indices ? indices.getX(index + 1) : index + 1)
    c.fromBufferAttribute(source, indices ? indices.getX(index + 2) : index + 2)
    const averageHeight = (a.y + b.y + c.y) / 3
    const inclination = cross
      .subVectors(b, a)
      .cross(edge.subVectors(c, a))
      .normalize().y
    const patch =
      Math.sin((a.x + b.x + c.x) * 1.13) * Math.cos((a.z + b.z + c.z) * 1.87)
    if (
      inclination < minimumSlope ||
      averageHeight < minimumHeight ||
      patch < -0.71
    )
      continue
    const top = [raised(a), raised(b), raised(c)]
    triangle(top[0], top[1], top[2])
    const base = [a, b, c]
    for (let corner = 0; corner < 3; corner++) {
      const next = (corner + 1) % 3
      triangle(base[corner], base[next], top[corner])
      triangle(top[corner], base[next], top[next])
    }
  }
  const cap = new BufferGeometry()
  cap.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(positions), 3),
  )
  cap.computeVertexNormals()
  return cap
}
