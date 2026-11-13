import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { AmbientLight, DirectionalLight, Fog, HemisphereLight } from 'three'
import { useReducedMotion, useTimeOfDay } from '../hooks/useTimeOfDay'
import type { Quality } from '../lib/quality'
import { fillPalette } from '../lib/timeOfDay'
import { sharedUniforms } from './petalMaterial'

export function Lighting({ quality }: { quality: Quality }) {
  const hour = useTimeOfDay()
  const reduce = useReducedMotion()
  const hourRef = useRef(hour)
  const reduceRef = useRef(reduce)
  hourRef.current = hour
  reduceRef.current = reduce
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const fill = useRef<DirectionalLight>(null)
  const ambient = useRef<AmbientLight>(null)
  const scene = useThree((state) => state.scene)

  useFrame(({ clock }) => {
    const palette = fillPalette(hourRef.current)
    sharedUniforms.uTime.value = clock.elapsedTime
    sharedUniforms.uMotion.value = reduceRef.current ? 0 : 1
    sharedUniforms.uLightDir.value.copy(palette.lightDir)
    sharedUniforms.uLightColor.value.copy(palette.sun)
    sharedUniforms.uAmbient.value.copy(palette.ambient)
    sharedUniforms.uFill.value = palette.fillIntensity
    if (sun.current) {
      sun.current.position.copy(palette.lightDir).multiplyScalar(8)
      sun.current.intensity = palette.sunIntensity
      sun.current.color.copy(palette.sun)
    }
    if (hemi.current) {
      hemi.current.color.copy(palette.hemiSky)
      hemi.current.groundColor.copy(palette.hemiGround)
      hemi.current.intensity = palette.hemiIntensity
    }
    if (fill.current) {
      const night = palette.star
      fill.current.intensity = 0.28 + night * 0.85
      fill.current.color.set(night > 0.45 ? '#e7eeff' : '#fff4e4')
      fill.current.position.set(0.8, 2.6, 2.2)
    }
    if (ambient.current) {
      ambient.current.intensity = palette.ambientIntensity * 0.35
      ambient.current.color.copy(palette.ambient)
    }
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(palette.fog)
      scene.fog.near = palette.fogNear
      scene.fog.far = palette.fogFar
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#d7ebff', '#8a9078', 0.6]} />
      <ambientLight ref={ambient} intensity={0.2} />
      <directionalLight
        ref={sun}
        castShadow={quality === 'high'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-bias={-0.0006}
      />
      <directionalLight ref={fill} position={[1.6, 2.4, 3.4]} intensity={0.3} />
      <fog attach="fog" args={['#d5e6f4', 9, 30]} />
    </>
  )
}
