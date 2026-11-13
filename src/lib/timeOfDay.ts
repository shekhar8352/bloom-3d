import { Color, Vector3 } from 'three'
import { lerp, smoothstep } from './rng'

export type PhaseName = 'Dawn' | 'Day' | 'Golden hour' | 'Night'

export interface Palette {
  zenith: Color
  horizon: Color
  sun: Color
  ambient: Color
  fog: Color
  hemiSky: Color
  hemiGround: Color
  hill: Color
  hillFar: Color
  mountain: Color
  sunIntensity: number
  ambientIntensity: number
  hemiIntensity: number
  fillIntensity: number
  sunDir: Vector3
  lightDir: Vector3
  star: number
  firefly: number
  mist: number
  cloud: number
  glow: number
  fogNear: number
  fogFar: number
  phase: PhaseName
}

interface Frame {
  h: number
  zenith: string
  horizon: string
  sun: string
  ambient: string
  fog: string
  hemiSky: string
  hemiGround: string
  hill: string
  hillFar: string
  mountain: string
  sunIntensity: number
  ambientIntensity: number
  hemiIntensity: number
  sunElev: number
  sunAz: number
  star: number
  firefly: number
  mist: number
  cloud: number
  glow: number
}

const frames: Frame[] = [
  {
    h: 0,
    zenith: '#141c36',
    horizon: '#31456e',
    sun: '#d5def2',
    ambient: '#9aabc4',
    fog: '#1a2744',
    hemiSky: '#31456e',
    hemiGround: '#243028',
    hill: '#2c4638',
    hillFar: '#24344c',
    mountain: '#3a4660',
    sunIntensity: 0.55,
    ambientIntensity: 0.48,
    hemiIntensity: 0.62,
    sunElev: -0.62,
    sunAz: 3.14,
    star: 1,
    firefly: 1,
    mist: 0.15,
    cloud: 0,
    glow: 0.05,
  },
  {
    h: 4.6,
    zenith: '#12182c',
    horizon: '#3a3558',
    sun: '#c9b4d4',
    ambient: '#7d7394',
    fog: '#241c32',
    hemiSky: '#3a3558',
    hemiGround: '#1a1618',
    hill: '#243028',
    hillFar: '#3a3048',
    mountain: '#3a3854',
    sunIntensity: 0.16,
    ambientIntensity: 0.24,
    hemiIntensity: 0.38,
    sunElev: -0.28,
    sunAz: 3.55,
    star: 0.7,
    firefly: 0.45,
    mist: 0.4,
    cloud: 0.05,
    glow: 0.15,
  },
  {
    h: 5.4,
    zenith: '#3d4f86',
    horizon: '#f3a48a',
    sun: '#ffd0a8',
    ambient: '#e7b8a4',
    fog: '#e7b09a',
    hemiSky: '#f0b39a',
    hemiGround: '#6a5348',
    hill: '#5c6848',
    hillFar: '#e0b09a',
    mountain: '#c49890',
    sunIntensity: 0.7,
    ambientIntensity: 0.38,
    hemiIntensity: 0.55,
    sunElev: 0.05,
    sunAz: 3.75,
    star: 0.05,
    firefly: 0,
    mist: 1,
    cloud: 0.28,
    glow: 0.85,
  },
  {
    h: 6.6,
    zenith: '#6a8ec8',
    horizon: '#ffc4a0',
    sun: '#ffe0c2',
    ambient: '#f0d2c0',
    fog: '#f2d2bc',
    hemiSky: '#ffd0b4',
    hemiGround: '#8a7464',
    hill: '#6d8050',
    hillFar: '#e8c4aa',
    mountain: '#d4b0a4',
    sunIntensity: 1.15,
    ambientIntensity: 0.42,
    hemiIntensity: 0.6,
    sunElev: 0.22,
    sunAz: 3.55,
    star: 0,
    firefly: 0,
    mist: 0.55,
    cloud: 0.45,
    glow: 0.7,
  },
  {
    h: 8.5,
    zenith: '#4f8fe0',
    horizon: '#d5ecff',
    sun: '#fff4e0',
    ambient: '#e7eef6',
    fog: '#d5e6f4',
    hemiSky: '#c5def8',
    hemiGround: '#8a9078',
    hill: '#6f8f4e',
    hillFar: '#9eb0c4',
    mountain: '#8ea4bc',
    sunIntensity: 1.55,
    ambientIntensity: 0.45,
    hemiIntensity: 0.62,
    sunElev: 0.62,
    sunAz: 3.35,
    star: 0,
    firefly: 0,
    mist: 0.08,
    cloud: 0.9,
    glow: 0.35,
  },
  {
    h: 12.5,
    zenith: '#3d7ed6',
    horizon: '#e7f4ff',
    sun: '#fffaf0',
    ambient: '#f4f7fb',
    fog: '#e4eef6',
    hemiSky: '#d7ebff',
    hemiGround: '#9aa080',
    hill: '#78a056',
    hillFar: '#a9bdd0',
    mountain: '#93adc4',
    sunIntensity: 1.7,
    ambientIntensity: 0.48,
    hemiIntensity: 0.66,
    sunElev: 1.12,
    sunAz: 3.14,
    star: 0,
    firefly: 0,
    mist: 0,
    cloud: 0.75,
    glow: 0.22,
  },
  {
    h: 16.2,
    zenith: '#4d86d0',
    horizon: '#ffe0c4',
    sun: '#ffe2c0',
    ambient: '#f6e6d6',
    fog: '#f0ddc8',
    hemiSky: '#ffd8b8',
    hemiGround: '#8a8068',
    hill: '#7a8a48',
    hillFar: '#d2b498',
    mountain: '#c4a890',
    sunIntensity: 1.35,
    ambientIntensity: 0.44,
    hemiIntensity: 0.58,
    sunElev: 0.48,
    sunAz: 2.8,
    star: 0,
    firefly: 0,
    mist: 0,
    cloud: 0.55,
    glow: 0.5,
  },
  {
    h: 17.6,
    zenith: '#3a4e86',
    horizon: '#ff8a3d',
    sun: '#ffb06a',
    ambient: '#f0c09a',
    fog: '#f0a070',
    hemiSky: '#ffb07a',
    hemiGround: '#6a5040',
    hill: '#6a7040',
    hillFar: '#c48a62',
    mountain: '#b07868',
    sunIntensity: 1.15,
    ambientIntensity: 0.4,
    hemiIntensity: 0.52,
    sunElev: 0.16,
    sunAz: 2.45,
    star: 0,
    firefly: 0,
    mist: 0.05,
    cloud: 0.35,
    glow: 0.95,
  },
  {
    h: 18.6,
    zenith: '#2a2458',
    horizon: '#ff6a3a',
    sun: '#ff8858',
    ambient: '#e09880',
    fog: '#c45a48',
    hemiSky: '#e08060',
    hemiGround: '#3a2828',
    hill: '#4a4830',
    hillFar: '#a06058',
    mountain: '#6a4860',
    sunIntensity: 0.75,
    ambientIntensity: 0.32,
    hemiIntensity: 0.42,
    sunElev: 0.02,
    sunAz: 2.15,
    star: 0.15,
    firefly: 0.15,
    mist: 0.2,
    cloud: 0.18,
    glow: 1,
  },
  {
    h: 19.6,
    zenith: '#14182e',
    horizon: '#3a3a68',
    sun: '#c8c4e8',
    ambient: '#8a88a8',
    fog: '#2a2848',
    hemiSky: '#3a3a64',
    hemiGround: '#16141c',
    hill: '#24302a',
    hillFar: '#2a3050',
    mountain: '#323858',
    sunIntensity: 0.28,
    ambientIntensity: 0.26,
    hemiIntensity: 0.36,
    sunElev: -0.22,
    sunAz: 2.5,
    star: 0.65,
    firefly: 0.7,
    mist: 0.25,
    cloud: 0.04,
    glow: 0.25,
  },
  {
    h: 22,
    zenith: '#141c36',
    horizon: '#31456e',
    sun: '#d5def2',
    ambient: '#9aabc4',
    fog: '#1a2744',
    hemiSky: '#31456e',
    hemiGround: '#243028',
    hill: '#2c4638',
    hillFar: '#24344c',
    mountain: '#3a4660',
    sunIntensity: 0.55,
    ambientIntensity: 0.48,
    hemiIntensity: 0.62,
    sunElev: -0.55,
    sunAz: 2.9,
    star: 1,
    firefly: 1,
    mist: 0.12,
    cloud: 0,
    glow: 0.05,
  },
  {
    h: 24,
    zenith: '#141c36',
    horizon: '#31456e',
    sun: '#d5def2',
    ambient: '#9aabc4',
    fog: '#1a2744',
    hemiSky: '#31456e',
    hemiGround: '#243028',
    hill: '#2c4638',
    hillFar: '#24344c',
    mountain: '#3a4660',
    sunIntensity: 0.55,
    ambientIntensity: 0.48,
    hemiIntensity: 0.62,
    sunElev: -0.62,
    sunAz: 3.14,
    star: 1,
    firefly: 1,
    mist: 0.15,
    cloud: 0,
    glow: 0.05,
  },
]

const painted = frames.map((frame) => ({
  ...frame,
  zenith: new Color(frame.zenith),
  horizon: new Color(frame.horizon),
  sun: new Color(frame.sun),
  ambient: new Color(frame.ambient),
  fog: new Color(frame.fog),
  hemiSky: new Color(frame.hemiSky),
  hemiGround: new Color(frame.hemiGround),
  hill: new Color(frame.hill),
  hillFar: new Color(frame.hillFar),
  mountain: new Color(frame.mountain),
}))

const scratch: Palette = {
  zenith: new Color(),
  horizon: new Color(),
  sun: new Color(),
  ambient: new Color(),
  fog: new Color(),
  hemiSky: new Color(),
  hemiGround: new Color(),
  hill: new Color(),
  hillFar: new Color(),
  mountain: new Color(),
  sunIntensity: 1,
  ambientIntensity: 0.4,
  hemiIntensity: 0.5,
  fillIntensity: 0.3,
  sunDir: new Vector3(),
  lightDir: new Vector3(),
  star: 0,
  firefly: 0,
  mist: 0,
  cloud: 0,
  glow: 0,
  fogNear: 8,
  fogFar: 28,
  phase: 'Day',
}

function mixColor(out: Color, a: Color, b: Color, t: number) {
  return out.copy(a).lerp(b, t)
}

function dir(out: Vector3, elev: number, az: number) {
  return out.set(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az)).normalize()
}

export function phaseName(hour: number): PhaseName {
  const t = ((hour % 24) + 24) % 24
  if (t >= 5 && t < 7) return 'Dawn'
  if (t >= 7 && t < 17) return 'Day'
  if (t >= 17 && t < 19) return 'Golden hour'
  return 'Night'
}

export function formatHour(hour: number) {
  const h24 = ((hour % 24) + 24) % 24
  const h = Math.floor(h24)
  const m = Math.floor((h24 - h) * 60)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`
}

export function fillPalette(hour: number, out: Palette = scratch): Palette {
  const t = ((hour % 24) + 24) % 24
  let i = 0
  while (i < painted.length - 2 && painted[i + 1].h <= t) i += 1
  const a = painted[i]
  const b = painted[i + 1]
  const u = smoothstep(0, 1, (t - a.h) / Math.max(0.0001, b.h - a.h))

  mixColor(out.zenith, a.zenith, b.zenith, u)
  mixColor(out.horizon, a.horizon, b.horizon, u)
  mixColor(out.sun, a.sun, b.sun, u)
  mixColor(out.ambient, a.ambient, b.ambient, u)
  mixColor(out.fog, a.fog, b.fog, u)
  mixColor(out.hemiSky, a.hemiSky, b.hemiSky, u)
  mixColor(out.hemiGround, a.hemiGround, b.hemiGround, u)
  mixColor(out.hill, a.hill, b.hill, u)
  mixColor(out.hillFar, a.hillFar, b.hillFar, u)
  mixColor(out.mountain, a.mountain, b.mountain, u)

  out.sunIntensity = lerp(a.sunIntensity, b.sunIntensity, u)
  out.ambientIntensity = lerp(a.ambientIntensity, b.ambientIntensity, u)
  out.hemiIntensity = lerp(a.hemiIntensity, b.hemiIntensity, u)
  out.star = lerp(a.star, b.star, u)
  out.firefly = lerp(a.firefly, b.firefly, u)
  out.mist = lerp(a.mist, b.mist, u)
  out.cloud = lerp(a.cloud, b.cloud, u)
  out.glow = lerp(a.glow, b.glow, u)

  const elev = lerp(a.sunElev, b.sunElev, u)
  const az = lerp(a.sunAz, b.sunAz, u)
  dir(out.sunDir, elev, az)

  const night = smoothstep(0.12, -0.08, elev)
  const lightElev = lerp(Math.max(elev, 0.18), 0.62, night)
  const lightAz = az + Math.PI * night
  dir(out.lightDir, lightElev, lightAz)

  out.fillIntensity = lerp(0.22, 0.72, night)
  out.fogNear = lerp(9, 4.5, out.mist)
  out.fogFar = lerp(30, 18, out.mist)
  out.phase = phaseName(t)
  out.sunIntensity = lerp(out.sunIntensity, 0.22, night)
  return out
}

export function hourFromDate(date: Date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
}
