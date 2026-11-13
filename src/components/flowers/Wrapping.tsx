import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import { getPaperGeometry, getRibbonTail, getVaseGeometry } from '../../lib/flowerGenerators'
import type { BouquetData } from '../../types'
import { useUi } from '../../store/uiStore'

const paperGeometry = getPaperGeometry()
const vaseGeometry = getVaseGeometry()
const tailGeometry = getRibbonTail()
const textureCache = new Map<string, CanvasTexture>()

function paperTexture(style: BouquetData['wrap']['style'], color: string) {
  const key = `${style}:${color}`
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw wrapping paper')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 256, 256)
  if (style === 'kraft') {
    for (let i = 0; i < 1600; i += 1) {
      ctx.fillStyle = `rgba(90, 58, 32, ${Math.random() * 0.18})`
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 1)
    }
  } else if (style === 'tissue') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    for (let i = 0; i < 7; i += 1) {
      ctx.beginPath()
      ctx.arc(40 + Math.random() * 180, 40 + Math.random() * 180, 36, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (style === 'newsprint') {
    ctx.fillStyle = '#ece8e1'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = 'rgba(40, 36, 32, 0.38)'
    ctx.lineWidth = 1
    for (let y = 10; y < 256; y += 8) {
      ctx.beginPath()
      ctx.moveTo(8, y)
      ctx.lineTo(248, y)
      ctx.stroke()
    }
    ctx.fillStyle = color
    ctx.globalAlpha = 0.16
    ctx.fillRect(0, 0, 256, 256)
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  textureCache.set(key, texture)
  return texture
}

export function Wrapping({
  wrap,
  ribbon,
  vessel,
  spread,
}: {
  wrap: BouquetData['wrap']
  ribbon: BouquetData['ribbon']
  vessel: BouquetData['vessel']
  spread: number
}) {
  const group = useRef<Group>(null)
  const bounce = useUi((state) => state.bounce)
  const seen = useRef(bounce)
  const scale = useRef(1)
  const velocity = useRef(0)
  const ribbonMaterial = useMemo(() => new MeshStandardMaterial({ roughness: 0.4, metalness: 0.05 }), [])
  const paperMaterial = useMemo(
    () => new MeshStandardMaterial({ roughness: 0.86, metalness: 0, side: DoubleSide }),
    [],
  )
  const vaseMaterial = useMemo(() => new MeshStandardMaterial({ roughness: 0.32, metalness: 0.04 }), [])

  useEffect(() => {
    ribbonMaterial.color.set(ribbon.color)
    ribbonMaterial.emissive.set(ribbon.color)
    ribbonMaterial.emissiveIntensity = 0.12
  }, [ribbon.color, ribbonMaterial])

  useEffect(() => {
    if (wrap.style === 'none') return
    paperMaterial.map = paperTexture(wrap.style, wrap.color)
    paperMaterial.color.set('#ffffff')
    paperMaterial.emissive.set(wrap.color)
    paperMaterial.emissiveIntensity = 0.18
    paperMaterial.needsUpdate = true
  }, [paperMaterial, wrap.color, wrap.style])

  useEffect(() => {
    vaseMaterial.color.copy(new Color(wrap.color).lerp(new Color('#f7f2eb'), 0.62))
  }, [vaseMaterial, wrap.color])

  useEffect(() => () => {
    ribbonMaterial.dispose()
    paperMaterial.dispose()
    vaseMaterial.dispose()
  }, [paperMaterial, ribbonMaterial, vaseMaterial])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    if (bounce !== seen.current) {
      seen.current = bounce
      velocity.current = 2.4
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scale.current = 1
      velocity.current = 0
    } else {
      velocity.current += (1 - scale.current) * 16 * dt
      velocity.current *= Math.exp(-6 * dt)
      scale.current += velocity.current * dt
    }
    const width = vessel === 'vase' ? 1 : 1.16 + spread * 0.6
    group.current?.scale.set(width * scale.current, scale.current, width * scale.current)
  })

  const showWrap = vessel === 'tied' && wrap.style !== 'none'
  const showRibbon = vessel === 'tied' && ribbon.style !== 'none'

  return (
    <group
      ref={group}
      position={[0, 0.02, 0]}
      userData={{ bouquetPart: 'wrap' }}
      onClick={(event) => {
        event.stopPropagation()
        useUi.getState().nudge()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      {vessel === 'vase' && <mesh geometry={vaseGeometry} material={vaseMaterial} castShadow receiveShadow />}
      {showWrap && <mesh geometry={paperGeometry} material={paperMaterial} castShadow receiveShadow />}
      {showRibbon && (
        <group>
          <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={ribbonMaterial}>
            <torusGeometry args={[0.24, 0.016, 8, 28]} />
          </mesh>
          {ribbon.style === 'classic' && (
            <group position={[0, 0.7, 0.34]}>
              <mesh position={[-0.07, 0.03, 0]} rotation={[0.3, 0.35, 1.05]} material={ribbonMaterial}>
                <torusGeometry args={[0.075, 0.016, 8, 18, Math.PI * 1.45]} />
              </mesh>
              <mesh position={[0.07, 0.03, 0]} rotation={[0.3, -0.35, -1.05]} material={ribbonMaterial}>
                <torusGeometry args={[0.075, 0.016, 8, 18, Math.PI * 1.45]} />
              </mesh>
              <mesh material={ribbonMaterial}>
                <sphereGeometry args={[0.026, 12, 12]} />
              </mesh>
              <mesh geometry={tailGeometry} material={ribbonMaterial} position={[-0.03, -0.04, 0.03]} />
              <mesh geometry={tailGeometry} material={ribbonMaterial} position={[0.03, -0.04, 0.03]} rotation={[0, 0.15, 0]} />
            </group>
          )}
          {ribbon.style === 'simple' && (
            <mesh position={[0, 0.34, 0.18]} material={ribbonMaterial}>
              <sphereGeometry args={[0.022, 10, 10]} />
            </mesh>
          )}
        </group>
      )}
    </group>
  )
}
