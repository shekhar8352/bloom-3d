import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three'
import type { Quality } from '../../lib/quality'
import { fillPalette } from '../../lib/timeOfDay'
import { useTimeOfDay } from '../../hooks/useTimeOfDay'
import { sharedUniforms } from '../petalMaterial'

const vertexShader = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  varying float vPhase;
  void main() {
    vPhase = aPhase;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (1.0 / max(0.25, -view.z));
    gl_Position = projectionMatrix * view;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uBlink;
  uniform float uAmount;
  varying float vPhase;
  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float dist = dot(point, point);
    if (dist > 0.25) discard;
    float alpha = smoothstep(0.25, 0.04, dist);
    float blink = mix(1.0, smoothstep(0.15, 1.0, sin(uTime * 2.6 + vPhase) * 0.5 + 0.5), uBlink);
    gl_FragColor = vec4(uColor, alpha * blink * uAmount);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function makeField(count: number, radius: number, height: number, lift: number) {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * radius
    positions[i * 3] = Math.cos(angle) * distance
    positions[i * 3 + 1] = lift + Math.random() * height
    positions[i * 3 + 2] = Math.sin(angle) * distance
    phases[i] = Math.random() * Math.PI * 2
  }
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  return geometry
}

function makeMaterial(color: string, size: number, blink: number) {
  return new ShaderMaterial({
    uniforms: {
      uTime: sharedUniforms.uTime,
      uColor: { value: new Color(color) },
      uSize: { value: size },
      uBlink: { value: blink },
      uAmount: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  })
}

export function Particles({ quality }: { quality: Quality }) {
  const hour = useTimeOfDay()
  const hourRef = useRef(hour)
  hourRef.current = hour
  const pollenCount = quality === 'high' ? 42 : 14
  const fireflyCount = quality === 'high' ? 16 : 6
  const pollenGeometry = useMemo(() => makeField(pollenCount, 0.7, 1.3, 0.35), [pollenCount])
  const fireflyGeometry = useMemo(() => makeField(fireflyCount, 1.6, 1.1, 0.4), [fireflyCount])
  const pollenMaterial = useMemo(() => makeMaterial('#f0d48a', 10, 0), [])
  const fireflyMaterial = useMemo(() => makeMaterial('#dff58a', 18, 1), [])
  const pollen = useRef<Points>(null)
  const fireflies = useRef<Points>(null)

  useFrame((_, delta) => {
    const palette = fillPalette(hourRef.current)
    const motion = sharedUniforms.uMotion.value > 0.5
    pollenMaterial.uniforms.uAmount.value = 0.75
    fireflyMaterial.uniforms.uAmount.value = palette.firefly
    if (fireflies.current) fireflies.current.visible = palette.firefly > 0.04
    if (!motion) return
    const step = Math.min(delta, 0.05)
    drift(pollen.current, step * 0.12, 0.3, 1.7)
    drift(fireflies.current, step * 0.18, 0.35, 1.6)
  })

  return (
    <group>
      <points ref={pollen} geometry={pollenGeometry} material={pollenMaterial} raycast={() => null} />
      <points ref={fireflies} geometry={fireflyGeometry} material={fireflyMaterial} raycast={() => null} />
    </group>
  )
}

function drift(points: Points | null, amount: number, min: number, max: number) {
  if (!points) return
  const position = points.geometry.getAttribute('position')
  for (let i = 0; i < position.count; i += 1) {
    let y = position.getY(i) + amount
    if (y > max) y = min
    position.setY(i, y)
    position.setX(i, position.getX(i) + Math.sin(y * 3 + i) * amount * 0.15)
  }
  position.needsUpdate = true
}
