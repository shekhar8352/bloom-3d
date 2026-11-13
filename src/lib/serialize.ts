import type { BouquetData, BowStyle, FlowerType, Stem, Vessel, WrapStyle } from '../types'
import { FLOWER_TYPES } from '../types'
import { uid } from './rng'

const TYPES = FLOWER_TYPES
const WRAPS: WrapStyle[] = ['kraft', 'tissue', 'newsprint', 'none']
const BOWS: BowStyle[] = ['classic', 'simple', 'none']

function round(n: number, p = 3) {
  const m = 10 ** p
  return Math.round(n * m) / m
}

function isHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

export function encodeBouquet(data: BouquetData) {
  const compact = {
    v: 1,
    s: data.stems.map((stem) => [
      TYPES.indexOf(stem.type),
      stem.color,
      round(stem.x),
      round(stem.z),
      round(stem.yaw, 2),
      round(stem.tilt, 2),
      round(stem.scale, 2),
      round(stem.height, 2),
      round(stem.seed, 2),
    ]),
    g: [data.greenery.eucalyptus ? 1 : 0, data.greenery.fern ? 1 : 0, data.greenery.babysBreath ? 1 : 0],
    w: [WRAPS.indexOf(data.wrap.style), data.wrap.color],
    r: [data.ribbon.color, BOWS.indexOf(data.ribbon.style)],
    e: data.vessel === 'vase' ? 1 : 0,
  }
  const json = JSON.stringify(compact)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeBouquet(raw: string): BouquetData | null {
  try {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const data = JSON.parse(json) as {
      v?: number
      s?: unknown[]
      g?: unknown[]
      w?: unknown[]
      r?: unknown[]
      e?: number
    }
    if (data.v !== 1 || !Array.isArray(data.s) || !Array.isArray(data.g) || !Array.isArray(data.w) || !Array.isArray(data.r)) {
      return null
    }
    const stems: Stem[] = []
    for (const row of data.s) {
      if (!Array.isArray(row) || row.length < 9) return null
      const type = TYPES[Number(row[0])]
      if (!type || !isHex(row[1])) return null
      const stem: Stem = {
        id: uid(),
        type: type as FlowerType,
        color: row[1],
        x: Number(row[2]),
        z: Number(row[3]),
        yaw: Number(row[4]),
        tilt: Number(row[5]),
        scale: Number(row[6]),
        height: Number(row[7]),
        seed: Number(row[8]),
      }
      if (![stem.x, stem.z, stem.yaw, stem.tilt, stem.scale, stem.height, stem.seed].every(Number.isFinite)) return null
      stems.push(stem)
    }
    const wrapStyle = WRAPS[Number(data.w[0])]
    const bowStyle = BOWS[Number(data.r[1])]
    if (!wrapStyle || !bowStyle || !isHex(data.w[1]) || !isHex(data.r[0])) return null
    const vessel: Vessel = data.e === 1 ? 'vase' : 'tied'
    return {
      stems,
      greenery: {
        eucalyptus: data.g[0] === 1,
        fern: data.g[1] === 1,
        babysBreath: data.g[2] === 1,
      },
      wrap: { style: wrapStyle, color: data.w[1] },
      ribbon: { color: data.r[0], style: bowStyle },
      vessel,
    }
  } catch {
    return null
  }
}
