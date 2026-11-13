import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Group, InstancedMesh, Object3D } from 'three'
import type { Quality } from '../../lib/quality'
import { centerColor, petalColors } from '../../lib/colors'
import { getFlowerGeometry, getLeafGeometry, getStemGeometry } from '../../lib/flowerGenerators'
import type { Stem } from '../../types'
import { FLOWER_NAMES, leafCount } from '../../types'
import { useBouquet } from '../../store/bouquetStore'
import { useUi } from '../../store/uiStore'
import { createPetalMaterial, sharedUniforms } from '../petalMaterial'
import { getLeafMaterial, getStemMaterial } from '../materials'

const leafGeometry = getLeafGeometry()
const leafMaterial = getLeafMaterial()
const stemMaterial = getStemMaterial()
const dummy = new Object3D()
const tint = new Color()

interface FlowerViewProps {
  stem: Stem
  selected: boolean
  hovered: boolean
  origin: number
  length: number
  quality: Quality
}

function FlowerViewComponent({ stem, selected, hovered, origin, length, quality }: FlowerViewProps) {
  const group = useRef<Group>(null)
  const sway = useRef<Group>(null)
  const head = useRef<Group>(null)
  const leaves = useRef<InstancedMesh>(null)
  const pop = useRef(1)
  const open = useRef(0)
  const highlight = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const material = useMemo(() => createPetalMaterial(), [])
  const geometry = useMemo(() => getFlowerGeometry(stem.type, stem.seed), [stem.type, stem.seed])
  const stemGeometry = useMemo(
    () => getStemGeometry(length, stem.seed, stem.type === 'lavender' || stem.type === 'daisy'),
    [length, stem.seed, stem.type],
  )
  const count = leafCount(stem.type)
  const lean = Math.atan2(stem.z, stem.x)
  const gathered = Math.hypot(stem.x, stem.z) < 0.012

  useLayoutEffect(() => {
    const { base, tip } = petalColors(stem.color)
    material.uniforms.uBase.value.copy(base)
    material.uniforms.uTip.value.copy(tip)
    material.uniforms.uCenter.value.copy(centerColor(stem.type, stem.color))
  }, [material, stem.color, stem.type])

  useLayoutEffect(() => {
    const mesh = leaves.current
    if (!mesh || count === 0) return
    for (let i = 0; i < count; i += 1) {
      const y = length * (0.32 + i * 0.12)
      const angle = stem.seed + i * 2.15
      dummy.position.set(Math.cos(angle) * 0.02, y, Math.sin(angle) * 0.02)
      dummy.rotation.set(0.5, -angle, 1.05)
        dummy.scale.setScalar(0.62 + (i % 2) * 0.12)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      tint.set(i % 2 === 0 ? '#6d9a52' : '#87b56a')
      mesh.setColorAt(i, tint)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [count, length, stem.seed])

  useLayoutEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const motion = sharedUniforms.uMotion.value > 0.5
    const targetPop = selected ? 1.08 : hovered && motion ? 1.035 : 1
    const targetOpen = selected ? 1 : 0
    const targetLight = selected || hovered ? 1 : 0
    if (!motion) {
      pop.current = targetPop
      open.current = targetOpen
      highlight.current = targetLight
      if (sway.current) {
        sway.current.rotation.x = 0
        sway.current.rotation.z = 0
      }
    } else {
      const k = 1 - Math.exp(-6 * dt)
      pop.current += (targetPop - pop.current) * k
      open.current += (targetOpen - open.current) * k
      highlight.current += (targetLight - highlight.current) * k
      const time = sharedUniforms.uTime.value
      if (sway.current) {
        sway.current.rotation.z = Math.sin(time * 0.9 + stem.seed) * 0.032
        sway.current.rotation.x = Math.cos(time * 0.72 + stem.seed * 1.4) * 0.024
      }
      if (Math.abs(targetPop - pop.current) > 0.002 || Math.abs(targetOpen - open.current) > 0.002) invalidate()
    }
    if (head.current) head.current.scale.setScalar(pop.current * stem.scale)
    material.uniforms.uOpen.value = open.current
    material.uniforms.uHighlight.value = highlight.current
  })

  return (
    <group
      ref={group}
      position={[stem.x, origin, stem.z]}
      userData={{ flowerId: stem.id }}
      onClick={(event) => {
        event.stopPropagation()
        if (!useUi.getState().playgroundOpen) useBouquet.getState().select(stem.id)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          useUi.getState().setHovered(stem.id)
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={() => {
        if (useUi.getState().hoveredId === stem.id) useUi.getState().setHovered(null)
        document.body.style.cursor = ''
      }}
    >
      <group rotation={[0, gathered ? 0 : -lean, 0]}>
        <group rotation={[0, 0, gathered ? 0 : -stem.tilt]}>
          <group rotation={[0, stem.yaw, 0]}>
            <group ref={sway}>
              <mesh geometry={stemGeometry} material={stemMaterial} castShadow={quality === 'high'} />
              {count > 0 && (
                <instancedMesh
                  ref={leaves}
                  args={[leafGeometry, leafMaterial, count]}
                  castShadow={quality === 'high'}
                />
              )}
              <group ref={head} position={[0, length, 0]}>
                <mesh geometry={geometry} material={material} castShadow={quality === 'high'} />
                {selected && (
                  <Html position={[0, 0.16, 0]} center distanceFactor={14} zIndexRange={[20, 0]} wrapperClass="bloom-label">
                    <div className="rounded-full bg-white/95 px-2.5 py-1 font-serif text-xs text-ink shadow-md">
                      {FLOWER_NAMES[stem.type]}
                    </div>
                  </Html>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

export const FlowerView = memo(FlowerViewComponent)
