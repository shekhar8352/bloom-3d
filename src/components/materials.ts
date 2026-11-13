import { useMemo } from 'react'
import { DoubleSide, MeshStandardMaterial } from 'three'

let stemMat: MeshStandardMaterial | null = null
let leafMat: MeshStandardMaterial | null = null
let breathMat: MeshStandardMaterial | null = null

export function getStemMaterial() {
  if (!stemMat) {
    stemMat = new MeshStandardMaterial({
      color: '#4e7a45',
      roughness: 0.62,
      emissive: '#1d4024',
      emissiveIntensity: 0.45,
    })
  }
  return stemMat
}

export function getLeafMaterial() {
  if (!leafMat) {
    leafMat = new MeshStandardMaterial({
      color: '#5d8a46',
      roughness: 0.58,
      side: DoubleSide,
      emissive: '#214828',
      emissiveIntensity: 0.4,
    })
  }
  return leafMat
}

export function getBreathMaterial() {
  if (!breathMat) {
    breathMat = new MeshStandardMaterial({
      color: '#fffaf4',
      roughness: 0.45,
      emissive: '#fff6ea',
      emissiveIntensity: 0.35,
    })
  }
  return breathMat
}

export function useSharedMaterials() {
  return useMemo(
    () => ({
      stem: getStemMaterial(),
      leaf: getLeafMaterial(),
      breath: getBreathMaterial(),
    }),
    [],
  )
}
