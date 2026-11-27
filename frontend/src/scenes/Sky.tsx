import { Environment, useEnvironment } from '@react-three/drei'
import { useMemo } from 'react'
import { BackSide } from 'three'

const SKY_FILE = '/textures/sky/evening-road-01-1k.hdr'
const SKY_YAW = 2.04
const SKY_BEARING: [number, number, number] = [0, SKY_YAW, 0]
const SKY_BRIGHTNESS = 0.35
const ENVIRONMENT_INTENSITY = 0.38

const VERTEX = `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    gl_Position = clip.xyww;
  }
`

const FRAGMENT = `
  #include <common>
  uniform sampler2D uPanorama;
  uniform float uYaw;
  uniform float uBrightness;
  varying vec3 vDirection;

  void main() {
    vec3 ray = normalize(vDirection);
    float s = sin(uYaw);
    float c = cos(uYaw);
    vec3 rotated = vec3(c * ray.x - s * ray.z, ray.y, s * ray.x + c * ray.z);
    vec3 photo = texture2D(uPanorama, equirectUv(rotated)).rgb;
    float luminance = dot(photo, vec3(0.2126, 0.7152, 0.0722));
    float twilight = 1.0 - smoothstep(0.04, 0.53, ray.y);
    float cloud = smoothstep(0.72, 4.0, luminance);
    vec3 balance = mix(vec3(0.48, 0.70, 1.38), vec3(1.13, 0.57, 0.73), twilight);
    vec3 sunDirection = normalize(vec3(0.52, 0.077, -0.85));
    float sunAlignment = max(dot(ray, sunDirection), 0.0);
    float skyGlow = pow(sunAlignment, 12.0) * (1.0 - smoothstep(0.06, 0.48, ray.y));
    float sunHalo = pow(sunAlignment, 270.0);
    float sunDisc = smoothstep(0.99989, 0.99996, sunAlignment);
    vec3 color = photo * balance / (0.73 + luminance * 0.59);
    color += vec3(0.46, 0.084, 0.074) * cloud * twilight;
    color += vec3(0.32, 0.123, 0.025) * skyGlow;
    color += vec3(0.82, 0.29, 0.047) * sunHalo;
    color += vec3(0.72, 0.55, 0.33) * sunDisc;
    color *= mix(0.36, 1.0, smoothstep(-0.22, 0.025, ray.y));
    gl_FragColor = vec4(color * uBrightness, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function Sky() {
  const panorama = useEnvironment({ files: SKY_FILE })
  const uniforms = useMemo(
    () => ({
      uPanorama: { value: panorama },
      uYaw: { value: SKY_YAW },
      uBrightness: { value: SKY_BRIGHTNESS },
    }),
    [panorama],
  )

  return (
    <>
      <Environment
        map={panorama}
        environmentIntensity={ENVIRONMENT_INTENSITY}
        environmentRotation={SKY_BEARING}
      />
      <mesh renderOrder={-10} frustumCulled={false} name="photographic-sky">
        <sphereGeometry args={[1, 32, 20]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
