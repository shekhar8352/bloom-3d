import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useMediaQuery, useReducedMotion } from '../../hooks/useTimeOfDay'
import { encodeBouquet } from '../../lib/serialize'
import { useBouquet } from '../../store/bouquetStore'
import { useUi } from '../../store/uiStore'
import {
  COLOR_SWATCHES,
  FLOWER_NAMES,
  FLOWER_SWATCHES,
  FLOWER_TYPES,
  MAX_STEMS,
  RIBBON_COLORS,
  WRAP_COLORS,
  type BowStyle,
  type FlowerType,
  type Greenery,
  type WrapStyle,
} from '../../types'
import { glass, quiet } from '../Chrome'

const chip =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-ink/10 bg-white/70 px-3 text-sm text-ink transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-40'

export default function Playground() {
  const open = useUi((state) => state.playgroundOpen)
  const mobile = useMediaQuery('(max-width: 767px)')
  const reduce = useReducedMotion()

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-label="Bouquet builder"
          className={`fixed z-20 flex flex-col overflow-hidden ${glass} max-md:inset-x-3 max-md:bottom-[5.25rem] max-md:max-h-[calc(100%-7.5rem)] max-md:rounded-3xl md:bottom-4 md:right-4 md:top-4 md:w-[380px] md:rounded-[28px]`}
          initial={reduce ? false : mobile ? { y: 36, opacity: 0 } : { x: 24, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : mobile ? { y: 24, opacity: 0 } : { x: 24, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 34 }}
        >
          <Builder />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function Builder() {
  const closeRef = useRef<HTMLButtonElement>(null)
  const stems = useBouquet((state) => state.stems)
  const selectedId = useBouquet((state) => state.selectedId)
  const selected = useBouquet((state) => state.stems.find((stem) => stem.id === state.selectedId) ?? null)
  const greenery = useBouquet((state) => state.greenery)
  const wrap = useBouquet((state) => state.wrap)
  const ribbon = useBouquet((state) => state.ribbon)
  const vessel = useBouquet((state) => state.vessel)
  const past = useBouquet((state) => state.past.length)
  const future = useBouquet((state) => state.future.length)
  const showToast = useUi((state) => state.showToast)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') useUi.getState().setPlayground(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const copyLink = async () => {
    const state = useBouquet.getState()
    const hash = encodeBouquet({
      stems: state.stems,
      greenery: state.greenery,
      wrap: state.wrap,
      ribbon: state.ribbon,
      vessel: state.vessel,
    })
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${hash}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied')
    } catch {
      showToast('Could not copy the link')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
        <div>
          <h2 className="font-serif text-2xl leading-none">Your bouquet</h2>
          <p className="mt-1 text-xs text-ink/60">
            {stems.length} of {MAX_STEMS} flowers
          </p>
        </div>
        <button ref={closeRef} type="button" className={`${quiet} px-3`} onClick={() => useUi.getState().setPlayground(false)}>
          Close
        </button>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-ink/10 px-4 py-3">
        <button type="button" className={chip} onClick={() => useBouquet.getState().undo()} disabled={past === 0}>
          Undo
        </button>
        <button type="button" className={chip} onClick={() => useBouquet.getState().redo()} disabled={future === 0}>
          Redo
        </button>
        <button type="button" className={chip} onClick={() => useBouquet.getState().randomize()}>
          Randomize
        </button>
        <button type="button" className={chip} onClick={() => useBouquet.getState().reset()}>
          Reset
        </button>
        <button type="button" className={chip} onClick={copyLink}>
          Copy link
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
        <section>
          <h3 className="mb-2 text-sm font-medium">Add a flower</h3>
          <div className="grid grid-cols-2 gap-2">
            {FLOWER_TYPES.map((type) => (
              <FlowerAdd key={type} type={type} count={stems.filter((stem) => stem.type === type).length} />
            ))}
          </div>
        </section>

        {selected && (
          <section aria-label="Selected flower">
            <h3 className="mb-2 text-sm font-medium">{FLOWER_NAMES[selected.type]}</h3>
            <Swatches
              colors={[...FLOWER_SWATCHES[selected.type], ...COLOR_SWATCHES]}
              value={selected.color}
              label="Flower color"
              onChange={(color) => useBouquet.getState().patchStem(selected.id, { color }, 'record')}
            />
            <label className="mt-3 flex items-center gap-3 text-sm">
              Custom
              <input
                type="color"
                value={toColorInput(selected.color)}
                aria-label="Custom flower color"
                className="h-11 w-14 cursor-pointer rounded-lg border border-ink/10 bg-white"
                onPointerDown={() => useBouquet.getState().beginGesture()}
                onKeyDown={() => useBouquet.getState().beginGesture()}
                onChange={(event) => useBouquet.getState().patchStem(selected.id, { color: event.target.value })}
                onPointerUp={() => useBouquet.getState().endGesture()}
                onKeyUp={() => useBouquet.getState().endGesture()}
                onBlur={() => useBouquet.getState().endGesture()}
              />
            </label>
            <Slider
              label="Size"
              min={0.7}
              max={1.4}
              step={0.01}
              value={selected.scale}
              onChange={(scale) => useBouquet.getState().patchStem(selected.id, { scale })}
            />
            <Slider
              label="Height"
              min={0.75}
              max={1.6}
              step={0.01}
              value={selected.height}
              onChange={(height) => useBouquet.getState().patchStem(selected.id, { height })}
            />
            <Slider
              label="Tilt"
              min={0}
              max={0.6}
              step={0.01}
              value={selected.tilt}
              onChange={(tilt) => useBouquet.getState().patchStem(selected.id, { tilt })}
            />
            <button type="button" className={`${chip} mt-3`} onClick={() => useBouquet.getState().removeFlower(selected.id)}>
              Delete flower
            </button>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-medium">In this bouquet</h3>
          {stems.length === 0 && <p className="text-sm text-ink/60">Add a flower to begin.</p>}
          <ul className="space-y-2">
            {stems.map((stem, index) => (
              <li key={stem.id} className="flex gap-2">
                <button
                  type="button"
                  className={`${chip} flex-1 justify-start`}
                  aria-pressed={stem.id === selectedId}
                  onClick={() => useBouquet.getState().select(stem.id)}
                >
                  <span className="mr-2 h-3 w-3 rounded-full" style={{ background: stem.color }} />
                  {FLOWER_NAMES[stem.type]} {index + 1}
                </button>
                <button
                  type="button"
                  className={`${chip} px-3`}
                  aria-label={`Delete ${FLOWER_NAMES[stem.type]} ${index + 1}`}
                  onClick={() => useBouquet.getState().removeFlower(stem.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium">Greenery</h3>
          <div className="flex flex-wrap gap-2">
            <Toggle label="Eucalyptus" pressed={greenery.eucalyptus} onClick={() => toggleGreen('eucalyptus')} />
            <Toggle label="Ferns" pressed={greenery.fern} onClick={() => toggleGreen('fern')} />
            <Toggle label="Baby's breath" pressed={greenery.babysBreath} onClick={() => toggleGreen('babysBreath')} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium">Arrangement</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Vase or hand-tied">
            <Toggle label="Hand-tied" pressed={vessel === 'tied'} onClick={() => useBouquet.getState().setVessel('tied')} />
            <Toggle label="Vase" pressed={vessel === 'vase'} onClick={() => useBouquet.getState().setVessel('vase')} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium">{vessel === 'vase' ? 'Vase' : 'Wrapping'}</h3>
          {vessel === 'vase' && <p className="mb-2 text-xs text-ink/60">Paper and ribbon stay hidden in the vase.</p>}
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Wrapping style">
            {(['tissue', 'kraft', 'newsprint', 'none'] as WrapStyle[]).map((style) => (
              <Toggle
                key={style}
                label={style === 'none' ? 'No paper' : style[0].toUpperCase() + style.slice(1)}
                pressed={wrap.style === style}
                onClick={() => useBouquet.getState().setWrap({ style })}
              />
            ))}
          </div>
          <Swatches
            colors={WRAP_COLORS}
            value={wrap.color}
            label={vessel === 'vase' ? 'Vase color' : 'Paper color'}
            onChange={(color) => useBouquet.getState().setWrap({ color })}
          />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium">Ribbon</h3>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Bow style">
            {(['classic', 'simple', 'none'] as BowStyle[]).map((style) => (
              <Toggle
                key={style}
                label={style === 'none' ? 'No ribbon' : style[0].toUpperCase() + style.slice(1)}
                pressed={ribbon.style === style}
                onClick={() => useBouquet.getState().setRibbon({ style })}
              />
            ))}
          </div>
          <Swatches
            colors={RIBBON_COLORS}
            value={ribbon.color}
            label="Ribbon color"
            onChange={(color) => useBouquet.getState().setRibbon({ color })}
          />
        </section>
      </div>
    </>
  )
}

function toggleGreen(key: keyof Greenery) {
  const current = useBouquet.getState().greenery[key]
  useBouquet.getState().setGreenery(key, !current)
}

function FlowerAdd({ type, count }: { type: FlowerType; count: number }) {
  return (
    <div className="flex gap-1">
      <button type="button" className={`${chip} flex-1 justify-start`} onClick={() => useBouquet.getState().addFlower(type)}>
        <span className="mr-2 h-3 w-3 rounded-full" style={{ background: FLOWER_SWATCHES[type][0] }} />
        {FLOWER_NAMES[type]}
        <span className="ml-auto text-ink/50">{count}</span>
      </button>
      <button
        type="button"
        className={`${chip} w-11 px-0`}
        aria-label={`Remove a ${FLOWER_NAMES[type]}`}
        disabled={count === 0}
        onClick={() => useBouquet.getState().removeLastOfType(type)}
      >
        −
      </button>
    </div>
  )
}

function Toggle({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${chip} ${pressed ? 'border-clay bg-clay text-white' : ''}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function Swatches({
  colors,
  value,
  label,
  onChange,
}: {
  colors: string[]
  value: string
  label: string
  onChange: (color: string) => void
}) {
  const unique = [...new Set(colors.map((color) => color.toLowerCase()))]
  return (
    <div>
      <p className="mb-2 text-sm text-ink/70" id={`${label}-swatches`}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${label}-swatches`}>
        {unique.map((color) => (
          <button
            key={color}
            type="button"
            className={`h-11 w-11 rounded-full border-2 ${value.toLowerCase() === color ? 'border-ink' : 'border-white'}`}
            style={{ background: color }}
            aria-label={color}
            aria-pressed={value.toLowerCase() === color}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="mt-3 block text-sm">
      <span className="mb-1 flex justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-ink/60">{value.toFixed(2)}</span>
      </span>
      <input
        className="bloom-range w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onPointerDown={() => useBouquet.getState().beginGesture()}
        onKeyDown={() => useBouquet.getState().beginGesture()}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={() => useBouquet.getState().endGesture()}
        onKeyUp={() => useBouquet.getState().endGesture()}
        onBlur={() => useBouquet.getState().endGesture()}
      />
    </label>
  )
}

function toColorInput(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#d4527a'
}
