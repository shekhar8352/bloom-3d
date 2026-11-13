import type { FlowerType } from '../types'

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/** Keeps the widest blooms from swallowing the flower beside them. */
export const BLOOM_SCALE: Record<FlowerType, number> = {
  rose: 0.96,
  tulip: 0.94,
  sunflower: 0.9,
  daisy: 0.94,
  lily: 0.9,
  lavender: 1,
  peony: 0.88,
}

/**
 * Hand-tied dome. Heads sit in the mouth of the wrap: close enough to be
 * one bouquet, with a little lean so neighboring petals don't share a center.
 */
export function domeSlot(index: number, count: number) {
  const safe = Math.max(count, 1)
  const u = safe === 1 ? 0 : Math.sqrt((index + 0.15) / safe)
  const angle = index * GOLDEN
  const radius = u * 0.04
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    yaw: angle * 0.35,
    tilt: 0.08 + u * 0.42,
    height: 0.8 - u * 0.08,
  }
}
