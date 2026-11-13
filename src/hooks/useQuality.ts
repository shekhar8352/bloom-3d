import { useMemo } from 'react'
import { detectQuality } from '../lib/quality'

export function useQuality() {
  return useMemo(() => detectQuality(), [])
}
