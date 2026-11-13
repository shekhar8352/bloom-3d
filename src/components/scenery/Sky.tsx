import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import { fillPalette } from '../../lib/timeOfDay'
import { sharedUniforms } from '../petalMaterial'
import { useTimeOfDay } from '../../hooks/useTimeOfDay'

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const skyFragment = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform float uStar;
  uniform float uGlow;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float height = clamp(dir.y, 0.0, 1.0);
    vec3 color = mix(uZenith, uHorizon, pow(1.0 - height, 2.2));
    vec3 sunDir = normalize(uSunDir);
    float sunFacing = max(dot(dir, sunDir), 0.0);
    color += uSunColor * pow(sunFacing, 7.0) * uGlow * 0.8;
    color += vec3(1.0, 0.97, 0.92) * pow(sunFacing, 1400.0) * smoothstep(-0.05, 0.08, sunDir.y);
    float moonFacing = max(dot(dir, normalize(uMoonDir)), 0.0);
    float moon = smoothstep(0.9935, 0.9986, moonFacing);
    float moonGlow = pow(moonFacing, 22.0) * uStar;
    color += vec3(0.72, 0.8, 1.0) * moonGlow * 0.7;
    color = mix(color, vec3(0.97, 0.98, 1.0), moon * smoothstep(0.05, 0.35, uStar));
    float stars = step(0.984, hash(floor(dir * 120.0)));
    float bright = step(0.996, hash(floor(dir * 70.0)));
    float skyMask = smoothstep(0.02, 0.22, dir.y);
    color += vec3(0.9, 0.94, 1.0) * (stars * 0.7 + bright * 1.6) * uStar * skyMask;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function Sky() {
  const hour = useTimeOfDay()
  const hourRef = useRef(hour)
  hourRef.current = hour
  const moonDir = useMemo(() => new Vector3(), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uZenith: { value: new Color('#3d7ed6') },
          uHorizon: { value: new Color('#e7f4ff') },
          uSunColor: { value: new Color('#fff4e0') },
          uSunDir: { value: new Vector3(0.2, 0.6, 0.4) },
          uMoonDir: { value: new Vector3(-0.2, 0.5, -0.4) },
          uStar: { value: 0 },
          uGlow: { value: 0.3 },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
      }),
    [],
  )

  useFrame(() => {
    const palette = fillPalette(hourRef.current)
    material.uniforms.uZenith.value.copy(palette.zenith)
    material.uniforms.uHorizon.value.copy(palette.horizon)
    material.uniforms.uSunColor.value.copy(palette.sun)
    material.uniforms.uSunDir.value.copy(palette.sunDir)
    moonDir.set(-0.2, 0.46, -0.86).normalize()
    material.uniforms.uMoonDir.value.copy(moonDir)
    material.uniforms.uStar.value = palette.star
    material.uniforms.uGlow.value = palette.glow
  })

  return (
    <mesh frustumCulled={false} raycast={() => null} material={material}>
      <sphereGeometry args={[48, 32, 24]} />
    </mesh>
  )
}

export function hillHeight(x: number, z: number) {
  const distance = Math.hypot(x, z)
  const keep = distance < 1.35 ? 0 : Math.min(1, (distance - 1.35) / 2.1)
  const wave = Math.sin(x * 0.16) * 0.5 + Math.cos(z * 0.13 + 0.7) * 0.38 + Math.sin((x - z) * 0.07) * 0.22
  const ridge = Math.exp(-((z + 15) ** 2) / 48) * (0.9 + Math.sin(x * 0.15) * 0.55)
  return (wave + ridge) * keep
}

const hillVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const hillFragment = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorld;
  uniform vec3 uNear;
  uniform vec3 uFar;
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uAmbient;
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  void main() {
    vec3 normal = normalize(vNormalW);
    float wrap = clamp(dot(normal, normalize(uLightDir)) * 0.5 + 0.5, 0.0, 1.0);
    float dist = length(vWorld.xz);
    vec3 albedo = mix(uNear, uFar, smoothstep(4.0, 18.0, dist));
    vec3 color = albedo * (uAmbient * 0.65 + uLightColor * wrap);
    float fogMix = smoothstep(uFogNear, uFogFar, distance(cameraPosition, vWorld));
    color = mix(color, uFog, fogMix);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function useHillGeometry() {
  return useMemo(() => {
    const geometry = new PlaneGeometry(48, 48, 56, 56)
    geometry.rotateX(-Math.PI / 2)
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i += 1) {
      position.setY(i, hillHeight(position.getX(i), position.getZ(i)))
    }
    geometry.computeVertexNormals()
    return geometry
  }, [])
}

export function createHillMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uNear: { value: new Color('#6f8f4e') },
      uFar: { value: new Color('#9eb0c4') },
      uLightDir: { value: sharedUniforms.uLightDir.value },
      uLightColor: { value: new Color('#fff4e0') },
      uAmbient: { value: new Color('#e7eef6') },
      uFog: { value: new Color('#d5e6f4') },
      uFogNear: { value: 9 },
      uFogFar: { value: 28 },
    },
    vertexShader: hillVertex,
    fragmentShader: hillFragment,
  })
}
