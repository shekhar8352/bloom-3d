# Bloom

A mobile-first 3D bouquet you can orbit, edit, and share. Every petal, stem, hill, and sky color is generated in the browser. There are no model or texture files.

## Setup

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`).

```bash
npm run build    # tsc -b && vite build
npm run preview  # serve dist/
```

Requires Node 18+.

## What you see

On load, a 16-stem hand-tied bouquet (rose, tulip, sunflower, daisy, lily, lavender, peony, plus eucalyptus, ferns, and baby's breath) sits on a stone ledge and turns slowly. The sky, fog, and sun follow your local clock and blend between dawn, day, golden hour, and night. The time slider overrides the clock until you press **Now**.

Drag to orbit, pinch or scroll to zoom, and tap a flower to name it. **Create your own** opens the builder (a bottom sheet on small screens, a side drawer from `md` up). Edits autosave to `localStorage` under `bloom-bouquet-v6`. **Share** renders the canvas at 2×, stamps “Made with Bloom”, then opens the native share sheet when `navigator.canShare({ files })` is available. Otherwise it downloads `bloom.png` and copies the image to the clipboard when the browser allows it.

## Architecture

```
src/
  App.tsx                         chrome, loader, lazy playground, keyboard shortcuts
  components/Scene.tsx            Canvas, camera, controls, postprocessing
  components/Bouquet.tsx          stems, greenery, wrap or vase
  components/flowers/             one flower view, greenery, wrapping
  components/scenery/             sky shader, hills, trees, particles
  components/petalMaterial.ts     shared petal shader (gradient, translucency)
  components/playground/          builder UI (React.lazy)
  hooks/useTimeOfDay.ts           clock, reduced motion, hover capability
  hooks/useShare.ts               still render, watermark, download
  store/bouquetStore.ts           bouquet, undo stack, persist, URL hash
  store/uiStore.ts                builder, time override, toast
  lib/flowerGenerators.ts         parametric petals, cached geometries
  lib/timeOfDay.ts                keyframes and smooth palette blend
  lib/serialize.ts                compact base64url bouquet
  lib/defaultBouquet.ts           the opening arrangement
```

State lives in Zustand. The scene reads it directly, so slider and builder changes show up on the next frame. Flower geometry is cached by `type:seed` and is not disposed, so undo can restore an earlier seed. Stems are tubes. Leaves, trees, and baby's breath use `InstancedMesh`. Petals of one flower are merged into a single mesh because each petal has its own curl.

Lighting is analytic (hemisphere, a directional sun or moon, a warm fill, ambient). It is not an HDRI, so the key light can follow the clock. Tone mapping is ACES. On a low-end device (`saveData`, two or fewer cores, or `deviceMemory` ≤ 2) the app drops antialiasing, shadows, and bloom, and caps the pixel ratio near 1.15. Otherwise the pixel ratio is capped at 2 (1.5 on narrow screens).

The render loop runs continuously while motion is allowed. `prefers-reduced-motion` switches it to `demand` and turns off auto-rotate and sway. A hidden tab sets `frameloop` to `never`.

## Add a flower type

1. Add the id to the `FlowerType` union and to `FLOWER_TYPES` in `src/types.ts`. `FLOWER_TYPES` is what the builder, the serializer, and the default palette read, so order matters for existing share links: append the new id at the end.
2. Give it a label in `FLOWER_NAMES`, a few hex colors in `FLOWER_SWATCHES`, and a leaf count in `leafCount`.
3. In `src/lib/flowerGenerators.ts`, write `buildYourFlower(seed: number)` with a `Builder`. `addPetal` takes a length, width, `open` (0 is closed, about 1.2 is flat), `curl`, `cup`, and a `profile` of `pointed`, `round`, `narrow`, or `oval`. `addDisc` and `addSphere` cover centers. `part` is `0` petal, `1` center, `2` stamen, `3` leaf. Register the function on the `builders` record. `getFlowerGeometry` caches the result.
4. Optional: add one entry to the `LOOK` list in `src/lib/defaultBouquet.ts` if it should appear in the opening bouquet. Bump the persist `name` in `bouquetStore.ts` if you need existing browsers to drop a saved bouquet and load the new default.

The petal shader in `src/components/petalMaterial.ts` already shades anything those builders emit. No component changes are required for a new type.

## Assumptions

- Time of day uses the browser's local timezone. The slider stores an hour override until **Now**. Colors, fog, and the sun angle are smoothstep blends between keyframes, not hard cuts.
- A `#` hash is applied once on load, then removed with `history.replaceState`, so later edits persist in `localStorage` instead of fighting the URL. **Copy link** writes a fresh hash. An unreadable hash shows a toast and leaves the saved bouquet alone.
- Undo and redo are session-only (40 steps). Refresh restores the bouquet, not the history.
- A vase hides the paper and the ribbon. The wrap color tints the glass.
- The bouquet holds at most 40 flowers.
- Hover highlight runs only for fine pointers (`hover: hover` and `pointer: fine`). Touch and mouse share pointer events.
- `prefers-reduced-motion` disables auto-rotate, wind sway, and the UI springs.
- Share captures the WebGL canvas only. DOM chrome is already outside the canvas. The still is one frame without the bloom pass. Cancelling the native share sheet is silent.
- Auto-rotate pauses while you orbit or drag a flower. Dragging starts after the pointer moves about 5px, and the flower stays inside a radius of 0.42 on the bouquet plane.
- Flowers are stylized paper-craft geometry, not photogrammetry. The camera looks down from the front so petal faces read; orbit polar angle is limited so you cannot swing to a horizon view.
- Fonts are Fraunces and Outfit from Google Fonts, with Georgia and system sans fallbacks. There is no backend.
