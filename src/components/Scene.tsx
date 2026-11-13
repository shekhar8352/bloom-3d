import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  SRGBColorSpace,
} from 'three'
import { useMediaQuery, usePageHidden, useReducedMotion } from '../hooks/useTimeOfDay'
import { useQuality } from '../hooks/useQuality'
import { registerCapture, renderBouquetStill } from '../hooks/useShare'
import { useBouquet } from '../store/bouquetStore'
import { useUi } from '../store/uiStore'
import { Bouquet } from './Bouquet'
import { Interaction } from './Interaction'
import { Lighting } from './Lighting'
import { Particles } from './scenery/Particles'
import { Scenery } from './scenery/Scenery'
import { Sky } from './scenery/Sky'

function ReadyProbe() {
  const ready = useRef(false)
  useFrame(() => {
    if (ready.current) return
    ready.current = true
    useUi.getState().setSceneReady(true)
  })
  return null
}

function CaptureBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    registerCapture(() => {
      if (!(camera instanceof PerspectiveCamera)) return Promise.reject(new Error('The camera is not ready'))
      return renderBouquetStill(gl, scene, camera)
    })
    return () => registerCapture(null)
  }, [camera, gl, scene])
  return null
}

function CameraRig() {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const bucket = size.width / Math.max(size.height, 1) < 0.82 ? 'portrait' : 'landscape'
  useEffect(() => {
    const portrait = bucket === 'portrait'
    camera.position.set(portrait ? 0.2 : 0.42, portrait ? 2.55 : 2.2, portrait ? 4.15 : 3.15)
    if (camera instanceof PerspectiveCamera) {
      camera.fov = portrait ? 38 : 32
      camera.near = 0.1
      camera.far = 90
      camera.updateProjectionMatrix()
    }
    camera.lookAt(0, 1.08, 0)
  }, [bucket, camera])
  return null
}

function Controls() {
  const reduce = useReducedMotion()
  const dragging = useUi((state) => state.dragging)
  const [orbiting, setOrbiting] = useState(false)
  return (
    <OrbitControls
      makeDefault
      enabled={!dragging}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate={!reduce && !dragging && !orbiting}
      autoRotateSpeed={0.55}
      minDistance={2.15}
      maxDistance={6.4}
      minPolarAngle={0.45}
      maxPolarAngle={1.22}
      target={[0, 1.08, 0]}
      onStart={() => setOrbiting(true)}
      onEnd={() => setOrbiting(false)}
    />
  )
}

export function Scene() {
  const quality = useQuality()
  const hidden = usePageHidden()
  const reduce = useReducedMotion()
  const narrow = useMediaQuery('(max-width: 760px)')
  const frameloop = hidden ? 'never' : reduce ? 'demand' : 'always'

  return (
    <Canvas
      className="h-full w-full touch-none"
      aria-label="3D flower bouquet"
      dpr={quality === 'low' ? [1, 1.15] : [1, narrow ? 1.5 : 2]}
      shadows={quality === 'high'}
      frameloop={frameloop}
      camera={{ position: [0.42, 2.2, 3.15], fov: 32, near: 0.1, far: 90 }}
      gl={{
        antialias: quality === 'high',
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
      }}
      onPointerMissed={() => useBouquet.getState().select(null)}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
        gl.outputColorSpace = SRGBColorSpace
        gl.shadowMap.type = PCFSoftShadowMap
        gl.setClearColor('#c9b6a4')
      }}
    >
      <CameraRig />
      <Controls />
      <Lighting quality={quality} />
      <Sky />
      <Scenery />
      <Bouquet quality={quality} />
      <Particles quality={quality} />
      <Interaction />
      <ReadyProbe />
      <CaptureBridge />
      {quality === 'high' && (
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <Bloom intensity={0.22} luminanceThreshold={0.92} luminanceSmoothing={0.28} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.38} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
