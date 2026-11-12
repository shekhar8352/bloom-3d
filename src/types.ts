export type FlowerType =
  | 'rose'
  | 'tulip'
  | 'sunflower'
  | 'daisy'
  | 'lily'
  | 'lavender'
  | 'peony'

export type WrapStyle = 'kraft' | 'tissue' | 'newsprint' | 'none'
export type BowStyle = 'classic' | 'simple' | 'none'
export type Vessel = 'tied' | 'vase'

export interface Stem {
  id: string
  type: FlowerType
  color: string
  x: number
  z: number
  yaw: number
  tilt: number
  scale: number
  height: number
  seed: number
}

export interface Greenery {
  eucalyptus: boolean
  fern: boolean
  babysBreath: boolean
}

export interface BouquetData {
  stems: Stem[]
  greenery: Greenery
  wrap: { style: WrapStyle; color: string }
  ribbon: { color: string; style: BowStyle }
  vessel: Vessel
}

export const FLOWER_TYPES: FlowerType[] = [
  'rose',
  'tulip',
  'sunflower',
  'daisy',
  'lily',
  'lavender',
  'peony',
]

export const FLOWER_NAMES: Record<FlowerType, string> = {
  rose: 'Rose',
  tulip: 'Tulip',
  sunflower: 'Sunflower',
  daisy: 'Daisy',
  lily: 'Lily',
  lavender: 'Lavender',
  peony: 'Peony',
}

export const FLOWER_SWATCHES: Record<FlowerType, string[]> = {
  rose: ['#9d2340', '#d4527a', '#f0c3cb', '#6b1d2a', '#f7e6ea'],
  tulip: ['#e24b4b', '#f2c14d', '#f4f0ea', '#6b2d5b', '#f4a261'],
  sunflower: ['#f0c31a', '#e6a817', '#f6e7a4'],
  daisy: ['#fffaf4', '#f7e7a1', '#f4c2c2', '#e7d5ff'],
  lily: ['#fff6ee', '#f6d5e3', '#f7c948', '#e8a87c'],
  lavender: ['#8a78b8', '#6e5c96', '#c4b7e0', '#5c4d82'],
  peony: ['#e7a0b4', '#f3c3d0', '#d4527a', '#f7e6ec', '#8e3a4a'],
}

export const WRAP_COLORS = [
  '#e7d3c1',
  '#f6efe6',
  '#f3d5d8',
  '#d9e2dc',
  '#e6d8f0',
  '#f0e2c4',
  '#c45b5b',
  '#2c3338',
]

export const RIBBON_COLORS = [
  '#7c2438',
  '#c45b6a',
  '#f3e6ea',
  '#d4a017',
  '#2f5d50',
  '#1e2a4a',
  '#f7f4ef',
  '#6e4b7a',
]

export const COLOR_SWATCHES = [
  '#9d2340',
  '#d4527a',
  '#e7a0b4',
  '#f3c3d0',
  '#fff6ee',
  '#f0c31a',
  '#e6a817',
  '#e24b4b',
  '#f2c14d',
  '#8a78b8',
  '#6e5c96',
  '#f6d5e3',
  '#fffaf4',
  '#2f6b4f',
  '#f4f0ea',
  '#1f4d8f',
]

export const MAX_STEMS = 40

export function leafCount(type: FlowerType): number {
  switch (type) {
    case 'rose':
      return 3
    case 'peony':
    case 'sunflower':
    case 'lily':
      return 2
    case 'tulip':
    case 'daisy':
      return 1
    default:
      return 0
  }
}
