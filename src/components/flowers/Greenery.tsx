import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D, SphereGeometry } from 'three'
import type { Greenery as GreeneryFlags } from '../../types'
import { getLeafGeometry } from '../../lib/flowerGenerators'
import { getBreathMaterial, getLeafMaterial } from '../materials'

const leafGeometry = getLeafGeometry()
const leafMaterial = getLeafMaterial()
const breathMaterial = getBreathMaterial()
const breathGeometry = new SphereGeometry(0.014, 6, 5)
const dummy = new Object3D()
const tint = new Color()

interface Item {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  color: string
}

function eucalyptusItems(): Item[] {
  const items: Item[] = []
  for (let branch = 0; branch < 6; branch += 1) {
    const angle = -0.9 + (branch / 5) * 1.8
    for (let i = 0; i < 5; i += 1) {
      const t = i / 4
      const radius = 0.12 + t * 0.22
      items.push({
        position: [Math.sin(angle) * radius, 0.22 + t * 0.42, Math.cos(angle) * radius * 0.85],
        rotation: [0.9, angle, 0.4],
        scale: 0.85 + t * 0.25,
        color: i % 2 === 0 ? '#6ea254' : '#87b86a',
      })
    }
  }
  return items
}

function fernItems(): Item[] {
  const items: Item[] = []
  for (let frond = 0; frond < 4; frond += 1) {
    const angle = -0.7 + (frond / 3) * 1.4
    for (let i = 0; i < 6; i += 1) {
      const t = i / 5
      const side = i % 2 === 0 ? 1 : -1
      const radius = 0.1 + t * 0.32
      items.push({
        position: [Math.sin(angle) * radius + side * t * 0.05, 0.16 + t * 0.36, Math.cos(angle) * radius],
        rotation: [1.05, angle + side * 0.4, side * 0.3],
        scale: 0.7 + t * 0.4,
        color: '#7dae5c',
      })
    }
  }
  return items
}

function breathItems(): Item[] {
  const items: Item[] = []
  for (let i = 0; i < 48; i += 1) {
    const radius = 0.1 + (i % 6) * 0.028
    const angle = i * 2.399963
    items.push({
      position: [Math.cos(angle) * radius, 0.42 + (i % 5) * 0.1, Math.sin(angle) * radius * 0.8],
      rotation: [0, angle, 0],
      scale: 0.55 + (i % 3) * 0.15,
      color: '#fffdf8',
    })
  }
  return items
}

function Field({ items, kind }: { items: Item[]; kind: 'leaf' | 'breath' }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((item, index) => {
      dummy.position.set(item.position[0], item.position[1], item.position[2])
      dummy.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2])
      dummy.scale.setScalar(item.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      mesh.setColorAt(index, tint.set(item.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])

  return (
    <instancedMesh
      ref={ref}
      args={[kind === 'leaf' ? leafGeometry : breathGeometry, kind === 'leaf' ? leafMaterial : breathMaterial, items.length]}
    />
  )
}

export function Greenery({ flags, origin }: { flags: GreeneryFlags; origin: number }) {
  const eucalyptus = useMemo(eucalyptusItems, [])
  const ferns = useMemo(fernItems, [])
  const breath = useMemo(breathItems, [])
  if (!flags.eucalyptus && !flags.fern && !flags.babysBreath) return null
  return (
    <group position={[0, origin, 0]} userData={{ passThrough: true }}>
      {flags.eucalyptus && <Field items={eucalyptus} kind="leaf" />}
      {flags.fern && <Field items={ferns} kind="leaf" />}
      {flags.babysBreath && <Field items={breath} kind="breath" />}
    </group>
  )
}
