import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Object3D, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { clamp } from '../lib/rng'
import { useBouquet } from '../store/bouquetStore'
import { useUi } from '../store/uiStore'

const RAY_LIMIT = 0.42

export function Interaction() {
  const gl = useThree((state) => state.gl)
  const get = useThree((state) => state.get)
  const raycaster = useMemo(() => new Raycaster(), [])
  const pointer = useMemo(() => new Vector2(), [])
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -0.45), [])
  const hitPoint = useMemo(() => new Vector3(), [])

  useEffect(() => {
    const element = gl.domElement
    let pending: {
      id?: string
      prop?: boolean
      pointerId: number
      x: number
      y: number
      moved: boolean
    } | null = null

    const ndc = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
    }

    const classify = (object: Object3D) => {
      let current: Object3D | null = object
      while (current) {
        if (current.userData.passThrough) return 'pass' as const
        if (typeof current.userData.flowerId === 'string') return { flowerId: current.userData.flowerId as string }
        if (typeof current.userData.bouquetPart === 'string') return { bouquetPart: current.userData.bouquetPart as string }
        current = current.parent
      }
      return null
    }

    const pick = (event: PointerEvent) => {
      const { camera, scene } = get()
      ndc(event)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const hit of hits) {
        if (!hit.object.visible) continue
        const info = classify(hit.object)
        if (info === 'pass' || info === null) continue
        return info
      }
      return null
    }

    const controlsOf = () => get().controls as { enabled?: boolean } | undefined

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return
      const playground = useUi.getState().playgroundOpen
      if (!playground) return
      const info = pick(event)
      if (!info) return
      const controls = controlsOf()
      if (controls) controls.enabled = false
      useUi.getState().setDragging(true)
      pending = {
        id: 'flowerId' in info ? info.flowerId : undefined,
        prop: 'bouquetPart' in info,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      }
      element.setPointerCapture(event.pointerId)
    }

    const onMove = (event: PointerEvent) => {
      if (!pending || event.pointerId !== pending.pointerId || !pending.id) return
      const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y)
      if (!pending.moved && distance < 5) return
      if (!pending.moved) {
        pending.moved = true
        useBouquet.getState().beginGesture()
      }
      const { camera } = get()
      ndc(event)
      raycaster.setFromCamera(pointer, camera)
      if (!raycaster.ray.intersectPlane(plane, hitPoint)) return
      const length = Math.hypot(hitPoint.x, hitPoint.z) || 1
      const scale = length > RAY_LIMIT ? RAY_LIMIT / length : 1
      useBouquet.getState().patchStem(pending.id, {
        x: clamp(hitPoint.x * scale, -RAY_LIMIT, RAY_LIMIT),
        z: clamp(hitPoint.z * scale, -RAY_LIMIT, RAY_LIMIT),
      })
    }

    const onUp = (event: PointerEvent) => {
      if (!pending || event.pointerId !== pending.pointerId) return
      const current = pending
      pending = null
      useUi.getState().setDragging(false)
      useBouquet.getState().endGesture()
      const controls = controlsOf()
      if (controls) controls.enabled = true
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
      if (!current.moved && current.id) useBouquet.getState().select(current.id)
    }

    element.addEventListener('pointerdown', onDown, true)
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerup', onUp)
    element.addEventListener('pointercancel', onUp)
    return () => {
      element.removeEventListener('pointerdown', onDown, true)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerup', onUp)
      element.removeEventListener('pointercancel', onUp)
    }
  }, [get, gl, hitPoint, plane, pointer, raycaster])

  return null
}
