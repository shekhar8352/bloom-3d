import { useMemo } from 'react'
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three'
import type { Quality } from '../lib/quality'
import { useBouquet } from '../store/bouquetStore'
import { useUi } from '../store/uiStore'
import { FlowerView } from './flowers/FlowerView'
import { Greenery } from './flowers/Greenery'
import { Wrapping } from './flowers/Wrapping'

function useBlobShadow() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62)
    gradient.addColorStop(0, 'rgba(40, 24, 16, 0.45)')
    gradient.addColorStop(1, 'rgba(40, 24, 16, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    return material
  }, [])
}

export function Bouquet({ quality }: { quality: Quality }) {
  const stems = useBouquet((state) => state.stems)
  const greenery = useBouquet((state) => state.greenery)
  const wrap = useBouquet((state) => state.wrap)
  const ribbon = useBouquet((state) => state.ribbon)
  const vessel = useBouquet((state) => state.vessel)
  const selectedId = useBouquet((state) => state.selectedId)
  const hoveredId = useUi((state) => state.hoveredId)
  const dragging = useUi((state) => state.dragging)
  const shadow = useBlobShadow()
  const spread = stems.reduce((max, stem) => Math.max(max, Math.hypot(stem.x, stem.z)), 0.12)
  const origin = vessel === 'vase' ? 0.9 : 0.2
  const lengthScale = vessel === 'vase' ? 0.68 : 1

  return (
    <group>
      {shadow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.165, 0]} material={shadow}>
          <planeGeometry args={[1.35 + spread, 1.35 + spread]} />
        </mesh>
      )}
      <Wrapping wrap={wrap} ribbon={ribbon} vessel={vessel} spread={spread} />
      <Greenery flags={greenery} origin={vessel === 'vase' ? 0.72 : 0.08} />
      {stems.map((stem) => (
        <FlowerView
          key={stem.id}
          stem={stem}
          selected={stem.id === selectedId}
          hovered={stem.id === hoveredId && !dragging}
          origin={origin}
          length={stem.height * lengthScale}
          quality={quality}
        />
      ))}
      {selectedId && stems.some((stem) => stem.id === selectedId) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            stems.find((stem) => stem.id === selectedId)?.x ?? 0,
            0.17,
            stems.find((stem) => stem.id === selectedId)?.z ?? 0,
          ]}
        >
          <ringGeometry args={[0.045, 0.062, 28]} />
          <meshBasicMaterial color="#fff8f2" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  )
}
