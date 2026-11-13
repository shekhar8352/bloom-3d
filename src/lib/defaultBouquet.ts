import { BLOOM_SCALE, domeSlot } from './arrange'
import type { BouquetData, FlowerType, Stem } from '../types'

const LOOK: Array<[FlowerType, string]> = [
  ['peony', '#e7a0b4'],
  ['rose', '#9d2340'],
  ['lily', '#fff6ee'],
  ['sunflower', '#f0c31a'],
  ['tulip', '#e24b4b'],
  ['rose', '#d4527a'],
  ['daisy', '#fffaf4'],
  ['lavender', '#8a78b8'],
  ['peony', '#f3c3d0'],
  ['tulip', '#f2c14d'],
  ['lily', '#f6d5e3'],
  ['daisy', '#fffaf4'],
  ['sunflower', '#e6a817'],
  ['lavender', '#6e5c96'],
  ['rose', '#f0c3cb'],
  ['tulip', '#f7f3ee'],
]

export function createDefaultBouquet(): BouquetData {
  const stems: Stem[] = LOOK.map(([type, color], i) => {
    const slot = domeSlot(i, LOOK.length)
    return {
      id: `stem-${i + 1}`,
      type,
      color,
      ...slot,
      scale: BLOOM_SCALE[type] * (0.96 + (i % 4) * 0.025),
      height: slot.height + ((i % 3) - 1) * 0.025,
      seed: 1.7 + i * 9.13,
    }
  })
  return {
    stems,
    greenery: { eucalyptus: true, fern: true, babysBreath: true },
    wrap: { style: 'tissue', color: '#f4e4d8' },
    ribbon: { color: '#7c2438', style: 'classic' },
    vessel: 'tied',
  }
}

export const DEFAULT_BOUQUET = createDefaultBouquet()
