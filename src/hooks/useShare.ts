import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three'

type CaptureFn = () => Promise<Blob>

let captureImpl: CaptureFn | null = null

export function registerCapture(fn: CaptureFn | null) {
  captureImpl = fn
}

export function captureCanvas() {
  if (!captureImpl) return Promise.reject(new Error('The scene is not ready'))
  return captureImpl()
}

function paintWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const pad = Math.round(width * 0.032)
  const size = Math.max(18, Math.round(width * 0.026))
  ctx.save()
  ctx.font = `560 ${size}px Fraunces, Georgia, serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.shadowColor = 'rgba(20, 12, 10, 0.45)'
  ctx.shadowBlur = size * 0.55
  ctx.fillStyle = 'rgba(255, 250, 246, 0.94)'
  ctx.fillText('Made with Bloom', width - pad, height - pad)
  ctx.restore()
}

export function renderBouquetStill(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
  const canvas = gl.domElement
  const width = Math.max(2, Math.round(canvas.clientWidth * 2))
  const height = Math.max(2, Math.round(canvas.clientHeight * 2))
  const prevRatio = gl.getPixelRatio()
  const prevSize = gl.getSize(new Vector2())
  const prevAspect = camera.aspect
  gl.setPixelRatio(1)
  gl.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  gl.render(scene, camera)

  const copy = document.createElement('canvas')
  copy.width = width
  copy.height = height
  const ctx = copy.getContext('2d')
  if (!ctx) throw new Error('Could not start the image export')
  ctx.drawImage(canvas, 0, 0)
  paintWatermark(ctx, width, height)

  gl.setPixelRatio(prevRatio)
  gl.setSize(prevSize.x, prevSize.y, false)
  camera.aspect = prevAspect
  camera.updateProjectionMatrix()
  gl.render(scene, camera)

  return new Promise<Blob>((resolve, reject) => {
    copy.toBlob((blob) => {
      if (!blob) reject(new Error('Could not create the image'))
      else resolve(blob)
    }, 'image/png')
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function canShareFile(file: File) {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}
