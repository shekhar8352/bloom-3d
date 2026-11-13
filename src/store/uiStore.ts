import { create } from 'zustand'

interface Toast {
  id: number
  message: string
}

interface UiState {
  playgroundOpen: boolean
  timeOverride: number | null
  dragging: boolean
  hoveredId: string | null
  bounce: number
  sceneReady: boolean
  toast: Toast | null
  togglePlayground: () => void
  setPlayground: (open: boolean) => void
  setTimeOverride: (hour: number | null) => void
  setDragging: (dragging: boolean) => void
  setHovered: (id: string | null) => void
  nudge: () => void
  setSceneReady: (ready: boolean) => void
  showToast: (message: string) => void
  clearToast: () => void
}

export const useUi = create<UiState>((set, get) => ({
  playgroundOpen: false,
  timeOverride: null,
  dragging: false,
  hoveredId: null,
  bounce: 0,
  sceneReady: false,
  toast: null,
  togglePlayground: () => set({ playgroundOpen: !get().playgroundOpen }),
  setPlayground: (playgroundOpen) => set({ playgroundOpen }),
  setTimeOverride: (timeOverride) => set({ timeOverride }),
  setDragging: (dragging) => set({ dragging }),
  setHovered: (hoveredId) => set({ hoveredId }),
  nudge: () => set({ bounce: get().bounce + 1 }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  showToast: (message) => {
    const id = Date.now()
    set({ toast: { id, message } })
    window.setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 2800)
  },
  clearToast: () => set({ toast: null }),
}))
