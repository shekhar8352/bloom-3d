import { Color, DoubleSide, ShaderMaterial, Vector3 } from 'three'

export const sharedUniforms = {
  uTime: { value: 0 },
  uMotion: { value: 1 },
  uLightDir: { value: new Vector3(0.45, 0.82, 0.32).normalize() },
  uLightColor: { value: new Color('#fff2d8') },
  uAmbient: { value: new Color('#d5e2ee') },
  uFill: { value: 0.28 },
}

const vertexShader = /* glsl */ `
  attribute float aTip;
  attribute float aPart;
  attribute float aShade;
  attribute vec3 aFlare;
  uniform float uTime;
  uniform float uMotion;
  uniform float uOpen;
  varying float vTip;
  varying float vPart;
  varying float vShade;
  varying vec3 vNormalW;
  varying vec3 vWorld;

  void main() {
    vTip = aTip;
    vPart = aPart;
    vShade = aShade;
    vec3 transformed = position + aFlare * uOpen;
    float flutter = sin(uTime * 1.7 + position.x * 5.0 + position.z * 4.0 + aTip * 3.0);
    transformed.x += flutter * 0.012 * aTip * uMotion * (0.35 + uOpen);
    transformed.z += cos(uTime * 1.25 + position.y * 4.0) * 0.01 * aTip * uMotion;
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uCenter;
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uAmbient;
  uniform float uFill;
  uniform float uHighlight;
  varying float vTip;
  varying float vPart;
  varying float vShade;
  varying vec3 vNormalW;
  varying vec3 vWorld;

  void main() {
    vec3 normal = normalize(vNormalW);
    if (!gl_FrontFacing) normal = -normal;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    vec3 lightDir = normalize(uLightDir);
    float ndl = dot(normal, lightDir);
    float wrap = clamp(ndl * 0.55 + 0.45, 0.0, 1.0);
    float back = clamp(-ndl, 0.0, 1.0);
    vec3 albedo = mix(uBase, uTip, smoothstep(0.05, 0.95, vTip));
    if (vPart > 2.5) {
      albedo = mix(vec3(0.13, 0.28, 0.12), vec3(0.45, 0.62, 0.26), vTip);
    } else if (vPart > 1.5) {
      albedo = mix(vec3(0.55, 0.42, 0.12), vec3(0.95, 0.78, 0.22), vTip);
    } else if (vPart > 0.5) {
      albedo = mix(uCenter * 0.72, uCenter, 0.35 + 0.65 * vTip);
    }
    float vein = sin((vTip * 18.0) + vShade * 6.0);
    albedo *= 1.0 - smoothstep(0.82, 1.0, abs(vein)) * 0.07 * step(vPart, 0.5);
    albedo *= mix(0.94, 1.05, vShade);
    vec3 color = albedo * (uAmbient * (0.42 + uFill) + uLightColor * wrap);
    color += albedo * uLightColor * back * 0.28 * (0.35 + 0.65 * vTip);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4);
    color += fresnel * uLightColor * 0.16 * (0.45 + 0.55 * vTip);
    vec3 halfDir = normalize(lightDir + viewDir);
    color += uLightColor * pow(max(dot(normal, halfDir), 0.0), 42.0) * 0.1;
    color += vec3(1.0, 0.96, 0.9) * uHighlight * 0.14;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createPetalMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: sharedUniforms.uTime,
      uMotion: sharedUniforms.uMotion,
      uLightDir: sharedUniforms.uLightDir,
      uLightColor: sharedUniforms.uLightColor,
      uAmbient: sharedUniforms.uAmbient,
      uFill: sharedUniforms.uFill,
      uBase: { value: new Color('#6b1020') },
      uTip: { value: new Color('#e23b4a') },
      uCenter: { value: new Color('#c4a15a') },
      uOpen: { value: 0 },
      uHighlight: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
  })
}
