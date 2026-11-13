export type Quality = 'high' | 'low'

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

export function detectQuality(): Quality {
  if (typeof navigator === 'undefined') return 'high'
  const nav = navigator as NavigatorWithMemory
  const cores = nav.hardwareConcurrency ?? 8
  const memory = nav.deviceMemory ?? 8
  if (nav.connection?.saveData) return 'low'
  if (cores <= 2 || memory <= 2) return 'low'
  return 'high'
}
