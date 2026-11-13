import { Color } from 'three'
import type { FlowerType } from '../types'

const hsl = { h: 0, s: 0, l: 0 }

export function petalColors(hex: string) {
  const tip = new Color(hex)
  const base = tip.clone()
  base.getHSL(hsl)
  if (hsl.s < 0.14) {
    base.set('#f0c2c6')
    base.lerp(tip, 0.42)
  } else {
    hsl.l = Math.max(0.12, hsl.l * 0.58)
    hsl.s = Math.min(1, hsl.s * 1.04)
    base.setHSL(hsl.h, hsl.s, hsl.l)
  }
  tip.getHSL(hsl)
  hsl.l = Math.min(0.9, hsl.l + 0.05)
  tip.setHSL(hsl.h, hsl.s, hsl.l)
  return { base, tip }
}

export function centerColor(type: FlowerType, hex: string) {
  if (type === 'sunflower') return new Color('#5c3414')
  if (type === 'daisy') return new Color('#e6b423')
  if (type === 'lily') return new Color('#d8a24a')
  const c = new Color(hex)
  c.getHSL(hsl)
  hsl.l = Math.max(0.1, hsl.l * 0.42)
  hsl.s = Math.min(1, hsl.s * 0.9)
  return c.setHSL(hsl.h, hsl.s, hsl.l)
}
