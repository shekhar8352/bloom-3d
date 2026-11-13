import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { BouquetData, BowStyle, FlowerType, Greenery, Stem, Vessel, WrapStyle } from '../types'
import { FLOWER_SWATCHES, FLOWER_TYPES, MAX_STEMS, RIBBON_COLORS, WRAP_COLORS } from '../types'
import { BLOOM_SCALE, domeSlot } from '../lib/arrange'
import { createDefaultBouquet } from '../lib/defaultBouquet'
import { decodeBouquet } from '../lib/serialize'
import { clamp, uid } from '../lib/rng'
import { useUi } from './uiStore'

const BOWS: BowStyle[] = ['classic', 'simple', 'none']
const WRAPS: WrapStyle[] = ['kraft', 'tissue', 'newsprint', 'none']

export interface BouquetState extends BouquetData {
  selectedId: string | null
  past: BouquetData[]
  future: BouquetData[]
  gesture: boolean
  select: (id: string | null) => void
  beginGesture: () => void
  endGesture: () => void
  patchStem: (id: string, patch: Partial<Stem>, mode?: 'live' | 'record') => void
  addFlower: (type: FlowerType) => void
  removeFlower: (id: string) => void
  removeLastOfType: (type: FlowerType) => void
  setGreenery: (key: keyof Greenery, value: boolean) => void
  setWrap: (patch: Partial<BouquetData['wrap']>) => void
  setRibbon: (patch: Partial<BouquetData['ribbon']>) => void
  setVessel: (vessel: Vessel) => void
  randomize: () => void
  reset: () => void
  undo: () => void
  redo: () => void
  replaceAll: (data: BouquetData) => void
}

function snapshot(state: BouquetData): BouquetData {
  return {
    stems: state.stems.map((stem) => ({ ...stem })),
    greenery: { ...state.greenery },
    wrap: { ...state.wrap },
    ribbon: { ...state.ribbon },
    vessel: state.vessel,
  }
}

function isStem(value: unknown): value is Stem {
  if (!value || typeof value !== 'object') return false
  const stem = value as Stem
  return (
    typeof stem.id === 'string' &&
    FLOWER_TYPES.includes(stem.type) &&
    typeof stem.color === 'string' &&
    [stem.x, stem.z, stem.yaw, stem.tilt, stem.scale, stem.height, stem.seed].every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

function sanitize(value: unknown): (BouquetData & { selectedId: string | null }) | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<BouquetData> & { selectedId?: string | null }
  if (!Array.isArray(data.stems)) return null
  const stems = data.stems.filter(isStem).slice(0, MAX_STEMS)
  const greenery = data.greenery
  const wrap = data.wrap
  const ribbon = data.ribbon
  if (!greenery || !wrap || !ribbon) return null
  if (!WRAPS.includes(wrap.style) || !BOWS.includes(ribbon.style)) return null
  if (typeof wrap.color !== 'string' || typeof ribbon.color !== 'string') return null
  const vessel: Vessel = data.vessel === 'vase' ? 'vase' : 'tied'
  const selectedId = typeof data.selectedId === 'string' && stems.some((stem) => stem.id === data.selectedId) ? data.selectedId : null
  return {
    stems,
    greenery: {
      eucalyptus: Boolean(greenery.eucalyptus),
      fern: Boolean(greenery.fern),
      babysBreath: Boolean(greenery.babysBreath),
    },
    wrap: { style: wrap.style, color: wrap.color },
    ribbon: { color: ribbon.color, style: ribbon.style },
    vessel,
    selectedId,
  }
}

function applyHash() {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return
  const data = decodeBouquet(raw)
  if (!data || data.stems.length > MAX_STEMS) {
    useUi.getState().showToast('That bouquet link could not be read')
    return
  }
  useBouquet.setState({
    ...data,
    past: [],
    future: [],
    gesture: false,
    selectedId: null,
  })
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

const memory = new Map<string, string>()

const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return memory.get(name) ?? null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      memory.set(name, value)
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name)
    } catch {
      memory.delete(name)
    }
  },
}

function randomBouquet(): BouquetData {
  const count = 12 + Math.floor(Math.random() * 6)
  const wraps: WrapStyle[] = ['kraft', 'tissue', 'newsprint']
  const bows: BowStyle[] = ['classic', 'simple']
  const stems: Stem[] = Array.from({ length: count }, (_, i) => {
    const type = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)]
    const colors = FLOWER_SWATCHES[type]
    const slot = domeSlot(i, count)
    return {
      id: uid(),
      type,
      color: colors[Math.floor(Math.random() * colors.length)],
      ...slot,
      yaw: slot.yaw + (Math.random() - 0.5) * 0.4,
      tilt: slot.tilt + (Math.random() - 0.5) * 0.06,
      scale: BLOOM_SCALE[type] * (0.94 + Math.random() * 0.12),
      height: slot.height + (Math.random() - 0.5) * 0.06,
      seed: Math.random() * 800 + 1,
    }
  })
  return {
    stems,
    greenery: {
      eucalyptus: Math.random() > 0.2,
      fern: Math.random() > 0.35,
      babysBreath: Math.random() > 0.35,
    },
    wrap: {
      style: wraps[Math.floor(Math.random() * wraps.length)],
      color: WRAP_COLORS[Math.floor(Math.random() * WRAP_COLORS.length)],
    },
    ribbon: {
      color: RIBBON_COLORS[Math.floor(Math.random() * RIBBON_COLORS.length)],
      style: bows[Math.floor(Math.random() * bows.length)],
    },
    vessel: Math.random() > 0.75 ? 'vase' : 'tied',
  }
}

const initial = createDefaultBouquet()

export const useBouquet = create<BouquetState>()(
  persist(
    (set, get) => ({
      ...initial,
      selectedId: null,
      past: [],
      future: [],
      gesture: false,
      select: (selectedId) => set({ selectedId }),
      beginGesture: () => {
        const state = get()
        if (state.gesture) return
        set({
          gesture: true,
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
        })
      },
      endGesture: () => set({ gesture: false }),
      patchStem: (id, patch, mode = 'live') => {
        const state = get()
        const history = mode === 'record' && !state.gesture ? { past: [...state.past, snapshot(state)].slice(-40), future: [] } : {}
        const nextPatch = { ...patch }
        if (nextPatch.scale !== undefined) nextPatch.scale = clamp(nextPatch.scale, 0.65, 1.45)
        if (nextPatch.height !== undefined) nextPatch.height = clamp(nextPatch.height, 0.7, 1.7)
        if (nextPatch.tilt !== undefined) nextPatch.tilt = clamp(nextPatch.tilt, -0.15, 0.7)
        set({
          ...history,
          stems: state.stems.map((stem) => (stem.id === id ? { ...stem, ...nextPatch } : stem)),
        })
      },
      addFlower: (type) => {
        const state = get()
        if (state.stems.length >= MAX_STEMS) {
          useUi.getState().showToast('A bouquet holds 40 flowers')
          return
        }
        const slot = domeSlot(state.stems.length, state.stems.length + 1)
        const stem: Stem = {
          id: uid(),
          type,
          color: FLOWER_SWATCHES[type][0],
          ...slot,
          scale: BLOOM_SCALE[type],
          seed: Math.random() * 1000 + 1,
        }
        set({
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          stems: [...state.stems, stem],
          selectedId: stem.id,
        })
      },
      removeFlower: (id) => {
        const state = get()
        set({
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          stems: state.stems.filter((stem) => stem.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })
      },
      removeLastOfType: (type) => {
        const state = get()
        const index = [...state.stems].reverse().findIndex((stem) => stem.type === type)
        if (index < 0) return
        const id = [...state.stems].reverse()[index].id
        get().removeFlower(id)
      },
      setGreenery: (key, value) => {
        const state = get()
        set({
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          greenery: { ...state.greenery, [key]: value },
        })
      },
      setWrap: (patch) => {
        const state = get()
        set({
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          wrap: { ...state.wrap, ...patch },
        })
      },
      setRibbon: (patch) => {
        const state = get()
        set({
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          ribbon: { ...state.ribbon, ...patch },
        })
      },
      setVessel: (vessel) => {
        const state = get()
        set({
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          vessel,
        })
      },
      randomize: () => {
        const state = get()
        set({
          ...randomBouquet(),
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          selectedId: null,
        })
      },
      reset: () => {
        const state = get()
        set({
          ...createDefaultBouquet(),
          past: [...state.past, snapshot(state)].slice(-40),
          future: [],
          gesture: false,
          selectedId: null,
        })
      },
      undo: () => {
        const state = get()
        const prev = state.past[state.past.length - 1]
        if (!prev) return
        const selectedId = state.selectedId && prev.stems.some((stem) => stem.id === state.selectedId) ? state.selectedId : null
        set({
          ...snapshot(prev),
          past: state.past.slice(0, -1),
          future: [snapshot(state), ...state.future].slice(0, 40),
          gesture: false,
          selectedId,
        })
      },
      redo: () => {
        const state = get()
        const next = state.future[0]
        if (!next) return
        const selectedId = state.selectedId && next.stems.some((stem) => stem.id === state.selectedId) ? state.selectedId : null
        set({
          ...snapshot(next),
          past: [...state.past, snapshot(state)].slice(-40),
          future: state.future.slice(1),
          gesture: false,
          selectedId,
        })
      },
      replaceAll: (data) =>
        set({
          ...data,
          past: [],
          future: [],
          gesture: false,
          selectedId: null,
        }),
    }),
    {
      name: 'bloom-bouquet-v6',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        stems: state.stems,
        greenery: state.greenery,
        wrap: state.wrap,
        ribbon: state.ribbon,
        vessel: state.vessel,
        selectedId: state.selectedId,
      }),
      merge: (persisted, current) => {
        const next = sanitize(persisted)
        if (!next) return current
        return { ...current, ...next, past: [], future: [], gesture: false }
      },
      onRehydrateStorage: () => () => {
        applyHash()
      },
    },
  ),
)
