import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  SphereGeometry,
} from 'three'
import { useTimeOfDay } from '../../hooks/useTimeOfDay'
import { fillPalette } from '../../lib/timeOfDay'
import { createHillMaterial, hillHeight, useHillGeometry } from './Sky'

const TREES: Array<[number, number, number]> = [
  [-2.8, -4.6, 1.35],
  [3.1, -4.9, 1.2],
  [-5.2, -6.4, 1.7],
  [5.6, -6.1, 1.55],
  [-1.2, -8.2, 2.1],
  [1.8, -8.8, 2.3],
  [7.2, -7.4, 1.4],
  [-7.4, -7.8, 1.5],
]

const MOUNTAINS: Array<[number, number, number]> = [
  [-6.5, -11, 4.2],
  [0.6, -13, 5.2],
  [7.2, -11.5, 3.8],
]

const CLOUDS: Array<[number, number, number, number]> = [
  [-6, 7.5, -12, 1.4],
  [-1.5, 8.2, -16, 1.8],
  [5, 7.2, -13, 1.3],
  [8.5, 8.6, -18, 1.6],
  [-9, 6.8, -18, 1.2],
]

function useCloudTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const spots = [
      [78, 70, 48],
      [120, 62, 58],
      [164, 74, 42],
      [108, 80, 34],
    ]
    spots.forEach(([x, y, radius]) => {
      const gradient = ctx.createRadialGradient(x, y, 8, x, y, radius)
      gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    })
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])
}

export function Scenery() {
  const hour = useTimeOfDay()
  const hourRef = useRef(hour)
  hourRef.current = hour
  const hillGeometry = useHillGeometry()
  const hillMaterial = useMemo(() => createHillMaterial(), [])
  const cloudTexture = useCloudTexture()
  const trunks = useRef<InstancedMesh>(null)
  const crowns = useRef<InstancedMesh>(null)
  const peaks = useRef<InstancedMesh>(null)
  const clouds = useRef<Group>(null)
  const treeMaterial = useMemo(() => new MeshStandardMaterial({ color: '#355c38', roughness: 0.85 }), [])
  const crownMaterial = useMemo(() => new MeshStandardMaterial({ color: '#4d7344', roughness: 0.8 }), [])
  const mountainMaterial = useMemo(() => new MeshStandardMaterial({ color: '#8ea4bc', roughness: 0.95 }), [])
  const stoneMaterial = useMemo(() => new MeshStandardMaterial({ color: '#d7cdc2', roughness: 0.9 }), [])
  const trunkGeometry = useMemo(() => new CylinderGeometry(0.07, 0.09, 0.55, 6), [])
  const crownGeometry = useMemo(() => new SphereGeometry(0.46, 10, 8), [])
  const peakGeometry = useMemo(() => new ConeGeometry(1.5, 1, 10), [])

  useLayoutEffect(() => {
    const dummy = new Object3D()
    TREES.forEach((tree, index) => {
      const y = hillHeight(tree[0], tree[1])
      dummy.position.set(tree[0], y + 0.2, tree[1])
      dummy.scale.set(1, tree[2], 1)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      trunks.current?.setMatrixAt(index, dummy.matrix)
      dummy.position.set(tree[0], y + 0.55 * tree[2], tree[1])
      dummy.scale.set(tree[2], tree[2], tree[2])
      dummy.updateMatrix()
      crowns.current?.setMatrixAt(index, dummy.matrix)
    })
    MOUNTAINS.forEach((peak, index) => {
      const y = hillHeight(peak[0], peak[1])
      dummy.position.set(peak[0], y + peak[2] * 0.35, peak[1])
      dummy.scale.set(peak[2], peak[2], peak[2])
      dummy.updateMatrix()
      peaks.current?.setMatrixAt(index, dummy.matrix)
    })
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true
    if (peaks.current) peaks.current.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(({ clock }) => {
    const palette = fillPalette(hourRef.current)
    hillMaterial.uniforms.uNear.value.copy(palette.hill)
    hillMaterial.uniforms.uFar.value.copy(palette.hillFar)
    hillMaterial.uniforms.uLightColor.value.copy(palette.sun)
    hillMaterial.uniforms.uAmbient.value.copy(palette.ambient)
    hillMaterial.uniforms.uFog.value.copy(palette.fog)
    hillMaterial.uniforms.uFogNear.value = palette.fogNear
    hillMaterial.uniforms.uFogFar.value = palette.fogFar
    treeMaterial.color.copy(palette.hill).multiplyScalar(0.55)
    crownMaterial.color.copy(palette.hill).multiplyScalar(0.62)
    mountainMaterial.color.copy(palette.mountain)
    stoneMaterial.color.copy(palette.hemiGround).lerp(new Color('#e6dbd2'), 0.72)
    if (clouds.current) {
      clouds.current.visible = palette.cloud > 0.04
      clouds.current.children.forEach((cloud, index) => {
        const mesh = cloud as Group
        const base = CLOUDS[index]
        if (!base) return
        mesh.position.x = base[0] + Math.sin(clock.elapsedTime * 0.05 + index) * 0.6
        const material = (mesh.children[0] as { material?: MeshStandardMaterial }).material
        if (material && 'opacity' in material) material.opacity = palette.cloud * 0.85
      })
    }
  })

  return (
    <group>
      <mesh geometry={hillGeometry} material={hillMaterial} receiveShadow />
      <mesh position={[0, 0.09, 0]} receiveShadow material={stoneMaterial}>
        <cylinderGeometry args={[1.15, 1.24, 0.18, 40]} />
      </mesh>
      <instancedMesh ref={trunks} args={[trunkGeometry, treeMaterial, TREES.length]} />
      <instancedMesh ref={crowns} args={[crownGeometry, crownMaterial, TREES.length]} />
      <instancedMesh ref={peaks} args={[peakGeometry, mountainMaterial, MOUNTAINS.length]} />
      <group ref={clouds}>
        {CLOUDS.map((cloud, index) => (
          <group key={index} position={[cloud[0], cloud[1], cloud[2]]} scale={cloud[3]}>
            <mesh raycast={() => null}>
              <planeGeometry args={[3.2, 1.6]} />
              <meshBasicMaterial map={cloudTexture} transparent depthWrite={false} opacity={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
