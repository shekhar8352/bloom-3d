import { useEffect, useState } from 'react'
import { canShareFile, captureCanvas, downloadBlob } from '../hooks/useShare'
import { useTimeOfDay } from '../hooks/useTimeOfDay'
import { fillPalette, formatHour } from '../lib/timeOfDay'
import { useBouquet } from '../store/bouquetStore'
import { useUi } from '../store/uiStore'
import { FLOWER_NAMES } from '../types'

const primary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-clay px-4 text-[15px] font-medium text-white transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-50'
const quiet =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/75 px-4 text-[15px] font-medium text-ink transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay'
const glass = 'border border-white/70 bg-[rgba(255,248,242,0.9)] shadow-[0_10px_40px_rgba(70,36,24,0.12)] backdrop-blur-xl'

export function Chrome() {
  const open = useUi((state) => state.playgroundOpen)
  const hour = useTimeOfDay()
  const palette = fillPalette(hour)
  const stems = useBouquet((state) => state.stems)
  const selectedId = useBouquet((state) => state.selectedId)
  const selected = stems.find((stem) => stem.id === selectedId)
  const [hint, setHint] = useState(() => {
    try {
      return sessionStorage.getItem('bloom-hint') !== 'off'
    } catch {
      return true
    }
  })
  const [timeOpen, setTimeOpen] = useState(() => {
    try {
      return localStorage.getItem('bloom-time-slider') !== 'off'
    } catch {
      return true
    }
  })
  const toggleTime = () => {
    setTimeOpen((current) => {
      const next = !current
      try {
        localStorage.setItem('bloom-time-slider', next ? 'on' : 'off')
      } catch {
        /* ignore private mode */
      }
      return next
    })
  }

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', `#${fillPalette(hour).fog.getHexString()}`)
  }, [hour])

  useEffect(() => {
    if (!hint) return
    const dismiss = () => {
      try {
        sessionStorage.setItem('bloom-hint', 'off')
      } catch {
        /* ignore private mode */
      }
      setHint(false)
    }
    window.addEventListener('pointerdown', dismiss, { once: true })
    return () => window.removeEventListener('pointerdown', dismiss)
  }, [hint])

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <div className={`pointer-events-auto rounded-3xl px-4 py-2.5 ${glass}`}>
          <p className="font-serif text-[1.65rem] leading-none text-ink">Bloom</p>
          <p className="mt-1 text-xs tracking-wide text-ink/70">
            {palette.phase} · {formatHour(hour)}
          </p>
        </div>
        <ShareButton />
      </header>

      <div className="sr-only" aria-live="polite">
        {selected ? `${FLOWER_NAMES[selected.type]} selected` : 'No flower selected'}
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${open ? 'md:right-[408px]' : ''}`}
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
          {hint && !open && (
            <p className={`pointer-events-none mx-auto rounded-full px-4 py-2 text-sm text-ink/80 ${glass}`}>
              Drag to look around. Tap a flower.
            </p>
          )}
          {!open &&
            (timeOpen ? (
              <TimeControls onHide={toggleTime} />
            ) : (
              <button
                type="button"
                className={`pointer-events-auto self-end ${quiet}`}
                onClick={toggleTime}
                aria-expanded={false}
              >
                Show time
              </button>
            ))}
          <button type="button" className={`pointer-events-auto ${primary}`} onClick={() => useUi.getState().togglePlayground()}>
            {open ? 'Close builder' : 'Create your own'}
          </button>
        </div>
      </div>
      <Toast />
    </>
  )
}

function TimeControls({ onHide }: { onHide: () => void }) {
  const hour = useTimeOfDay()
  const override = useUi((state) => state.timeOverride)
  const setOverride = useUi((state) => state.setTimeOverride)
  const phase = fillPalette(hour).phase
  return (
    <div className={`pointer-events-auto rounded-3xl px-4 py-3 ${glass}`}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
        <label htmlFor="time-preview" className="font-medium text-ink">
          {phase}
          <span className="ml-2 font-normal text-ink/60">{formatHour(hour)}</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`${quiet} min-w-11 px-3`}
            onClick={() => setOverride(null)}
            disabled={override === null}
          >
            Now
          </button>
          <button type="button" className={`${quiet} min-w-11 px-3`} onClick={onHide} aria-expanded={true} aria-controls="time-preview">
            Hide
          </button>
        </div>
      </div>
      <input
        id="time-preview"
        type="range"
        min={0}
        max={24}
        step={0.01}
        value={hour}
        aria-label="Preview the time of day"
        aria-valuetext={`${phase}, ${formatHour(hour)}`}
        className="bloom-range w-full"
        onChange={(event) => setOverride(Number(event.target.value))}
      />
    </div>
  )
}

function ShareButton() {
  const showToast = useUi((state) => state.showToast)
  const [busy, setBusy] = useState(false)

  const onShare = async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await captureCanvas()
      const file = new File([blob], 'bloom.png', { type: 'image/png' })
      if (canShareFile(file)) {
        await navigator.share({ files: [file], title: 'Bloom', text: 'Made with Bloom' })
        showToast('Shared your bouquet')
        return
      }
      downloadBlob(blob, 'bloom.png')
      let copied = false
      try {
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          copied = true
        }
      } catch {
        copied = false
      }
      showToast(copied ? 'Saved and copied the image' : 'Saved the image')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      showToast('Could not share the image')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className={`pointer-events-auto ${primary} min-w-11`} onClick={onShare} disabled={busy} aria-busy={busy}>
      {busy ? 'Sharing…' : 'Share'}
    </button>
  )
}

function Toast() {
  const toast = useUi((state) => state.toast)
  if (!toast) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-40 flex justify-center px-4" role="status" aria-live="polite">
      <p className={`rounded-full px-4 py-2 text-sm text-ink ${glass}`}>{toast.message}</p>
    </div>
  )
}

export { glass, primary, quiet }
