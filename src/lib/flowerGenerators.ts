import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  TubeGeometry,
  Vector3,
} from 'three'
import type { FlowerType } from '../types'
import { mulberry32 } from './rng'

type Profile = 'pointed' | 'round' | 'narrow' | 'oval'

class Builder {
  positions: number[] = []
  normals: number[] = []
  tips: number[] = []
  parts: number[] = []
  shades: number[] = []
  flares: number[] = []
  indices: number[] = []

  add(p: Vector3, tip: number, part: number, shade: number, flare: Vector3) {
    const i = this.positions.length / 3
    this.positions.push(p.x, p.y, p.z)
    this.normals.push(0, 0, 1)
    this.tips.push(tip)
    this.parts.push(part)
    this.shades.push(shade)
    this.flares.push(flare.x, flare.y, flare.z)
    return i
  }

  face(a: number, b: number, c: number) {
    const ax = this.positions[a * 3]
    const ay = this.positions[a * 3 + 1]
    const az = this.positions[a * 3 + 2]
    const bx = this.positions[b * 3]
    const by = this.positions[b * 3 + 1]
    const bz = this.positions[b * 3 + 2]
    const cx = this.positions[c * 3]
    const cy = this.positions[c * 3 + 1]
    const cz = this.positions[c * 3 + 2]
    const abx = bx - ax
    const aby = by - ay
    const abz = bz - az
    const acx = cx - ax
    const acy = cy - ay
    const acz = cz - az
    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx
    this.indices.push(a, b, c)
    this.normals[a * 3] += nx
    this.normals[a * 3 + 1] += ny
    this.normals[a * 3 + 2] += nz
    this.normals[b * 3] += nx
    this.normals[b * 3 + 1] += ny
    this.normals[b * 3 + 2] += nz
    this.normals[c * 3] += nx
    this.normals[c * 3 + 1] += ny
    this.normals[c * 3 + 2] += nz
  }

  toGeometry(name: string) {
    for (let i = 0; i < this.normals.length; i += 3) {
      const x = this.normals[i]
      const y = this.normals[i + 1]
      const z = this.normals[i + 2]
      const len = Math.hypot(x, y, z) || 1
      this.normals[i] = x / len
      this.normals[i + 1] = y / len
      this.normals[i + 2] = z / len
    }
    const g = new BufferGeometry()
    g.name = name
    g.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    g.setAttribute('normal', new Float32BufferAttribute(this.normals, 3))
    g.setAttribute('aTip', new Float32BufferAttribute(this.tips, 1))
    g.setAttribute('aPart', new Float32BufferAttribute(this.parts, 1))
    g.setAttribute('aShade', new Float32BufferAttribute(this.shades, 1))
    g.setAttribute('aFlare', new Float32BufferAttribute(this.flares, 3))
    g.setIndex(this.indices)
    g.computeBoundingSphere()
    return g
  }
}

function envelope(v: number, profile: Profile) {
  const s = Math.sin(Math.PI * v)
  if (profile === 'pointed') {
    const tip = v > 0.78 ? (1 - v) / 0.22 : 1
    return Math.pow(s, 0.72) * tip
  }
  if (profile === 'narrow') return Math.pow(s, 0.95) * 0.9
  if (profile === 'oval') return Math.pow(s, 0.42)
  return Math.pow(Math.sin(Math.PI * Math.pow(v, 0.9)), 0.52)
}

const radial = new Vector3()
const up = new Vector3(0, 1, 0)
const along = new Vector3()
const side = new Vector3()
const facing = new Vector3()
const base = new Vector3()
const point = new Vector3()
const flare = new Vector3()

interface Petal {
  angle: number
  radius: number
  yBase: number
  length: number
  width: number
  open: number
  curl: number
  cup: number
  twist: number
  ruffle: number
  ruffleFreq: number
  profile: Profile
  part?: number
  shade?: number
  segU?: number
  segV?: number
}

function addPetal(b: Builder, petal: Petal) {
  const segU = petal.segU ?? 8
  const segV = petal.segV ?? 12
  const part = petal.part ?? 0
  const shade = petal.shade ?? 1
  radial.set(Math.cos(petal.angle), 0, Math.sin(petal.angle))
  along.set(0, Math.cos(petal.open), 0).addScaledVector(radial, Math.sin(petal.open))
  if (along.lengthSq() < 1e-6) along.set(0, 1, 0)
  along.normalize()
  side.crossVectors(along, up)
  if (side.lengthSq() < 1e-5) side.set(1, 0, 0)
  side.normalize().applyAxisAngle(along, petal.twist)
  facing.crossVectors(side, along).normalize()
  base.copy(radial).multiplyScalar(petal.radius)
  base.y += petal.yBase

  const grid: number[] = []
  const stride = segU + 1
  for (let iv = 0; iv <= segV; iv += 1) {
    const v = iv / segV
    const env = envelope(v, petal.profile)
    for (let iu = 0; iu <= segU; iu += 1) {
      const s = iu / segU - 0.5
      point.copy(base)
      point.addScaledVector(along, v * petal.length)
      point.addScaledVector(side, s * petal.width * env)
      point.addScaledVector(facing, -petal.curl * v * v * petal.length * 0.5)
      point.addScaledVector(facing, petal.cup * s * s * 4 * petal.width * 0.28)
      if (petal.ruffle > 0) {
        point.addScaledVector(
          facing,
          Math.sin(s * Math.PI * 2 * petal.ruffleFreq + v * 5.5) * petal.ruffle * v,
        )
      }
      flare.copy(radial).multiplyScalar(v * petal.length * 0.7)
      flare.y += v * petal.length * 0.12
      grid.push(b.add(point, v, part, shade, flare))
    }
  }
  for (let iv = 0; iv < segV; iv += 1) {
    for (let iu = 0; iu < segU; iu += 1) {
      const i00 = grid[iv * stride + iu]
      const i10 = grid[iv * stride + iu + 1]
      const i01 = grid[(iv + 1) * stride + iu]
      const i11 = grid[(iv + 1) * stride + iu + 1]
      b.face(i00, i01, i10)
      b.face(i10, i01, i11)
    }
  }
}

function addDisc(b: Builder, radius: number, y: number, part: number, bumps: boolean) {
  const segs = bumps ? 28 : 20
  const center = b.add(new Vector3(0, y, 0), 0.15, part, 1, new Vector3())
  const ring: number[] = []
  for (let s = 0; s < segs; s += 1) {
    const angle = (s / segs) * Math.PI * 2
    const bump = bumps ? Math.sin(s * 3.1) * 0.006 : 0
    ring.push(b.add(new Vector3(Math.cos(angle) * radius, y + bump, Math.sin(angle) * radius), 0.85, part, 1, new Vector3()))
  }
  for (let s = 0; s < segs; s += 1) b.face(center, ring[s], ring[(s + 1) % segs])
}

function addSphere(b: Builder, center: Vector3, radius: number, part: number, tip: number) {
  const lat = 4
  const lon = 6
  const ids: number[] = []
  for (let i = 0; i <= lat; i += 1) {
    const v = i / lat
    const phi = v * Math.PI
    for (let j = 0; j < lon; j += 1) {
      const theta = (j / lon) * Math.PI * 2
      const p = new Vector3(
        center.x + Math.sin(phi) * Math.cos(theta) * radius,
        center.y + Math.cos(phi) * radius,
        center.z + Math.sin(phi) * Math.sin(theta) * radius,
      )
      ids.push(b.add(p, tip, part, 1, new Vector3()))
    }
  }
  for (let i = 0; i < lat; i += 1) {
    for (let j = 0; j < lon; j += 1) {
      const a = ids[i * lon + j]
      const b0 = ids[i * lon + ((j + 1) % lon)]
      const c = ids[(i + 1) * lon + j]
      const d = ids[(i + 1) * lon + ((j + 1) % lon)]
      b.face(a, c, b0)
      b.face(b0, c, d)
    }
  }
}

function buildRose(seed: number) {
  const rng = mulberry32(seed)
  const b = new Builder()
  const layers = [
    { count: 6, open: 0.32, length: 0.085, width: 0.07, radius: 0.012, curl: 0.22, cup: 0.55 },
    { count: 7, open: 0.62, length: 0.13, width: 0.095, radius: 0.035, curl: 0.4, cup: 0.28 },
    { count: 8, open: 0.92, length: 0.175, width: 0.12, radius: 0.06, curl: 0.62, cup: 0.1 },
  ]
  layers.forEach((layer, layerIndex) => {
    for (let i = 0; i < layer.count; i += 1) {
      addPetal(b, {
        angle: (i / layer.count) * Math.PI * 2 + layerIndex * 0.4 + (rng() - 0.5) * 0.12,
        radius: layer.radius,
        yBase: (2 - layerIndex) * 0.012,
        length: layer.length * (0.94 + rng() * 0.1),
        width: layer.width * (0.94 + rng() * 0.1),
        open: layer.open + (rng() - 0.5) * 0.06,
        curl: layer.curl,
        cup: layer.cup,
        twist: (rng() - 0.5) * 0.28,
        ruffle: 0.004 + layerIndex * 0.003,
        ruffleFreq: 2,
        profile: 'round',
        shade: 0.9 + rng() * 0.14,
      })
    }
  })
  return b.toGeometry('rose')
}

function buildTulip(seed: number) {
  const rng = mulberry32(seed)
  const b = new Builder()
  for (let i = 0; i < 6; i += 1) {
    const inner = i % 2 === 0
    addPetal(b, {
      angle: (i / 6) * Math.PI * 2,
      radius: 0.015,
      yBase: inner ? 0 : 0.01,
      length: 0.3 + rng() * 0.02,
      width: inner ? 0.12 : 0.105,
      open: inner ? 0.42 : 0.58,
      curl: 0.16 + rng() * 0.06,
      cup: 0.28,
      twist: (rng() - 0.5) * 0.06,
      ruffle: 0,
      ruffleFreq: 1,
      profile: 'pointed',
      shade: 0.94 + rng() * 0.08,
      segV: 14,
    })
  }
  return b.toGeometry('tulip')
}

function buildSunflower(seed: number) {
  const rng = mulberry32(seed)
  const b = new Builder()
  addDisc(b, 0.09, 0.012, 1, true)
  for (let layer = 0; layer < 2; layer += 1) {
    const count = 14
    for (let i = 0; i < count; i += 1) {
      addPetal(b, {
        angle: (i / count) * Math.PI * 2 + layer * 0.22 + (rng() - 0.5) * 0.05,
        radius: 0.08,
        yBase: 0.01,
        length: 0.16 + rng() * 0.02 - layer * 0.02,
        width: 0.048,
        open: 0.98 + layer * 0.08,
        curl: 0.28,
        cup: 0.04,
        twist: (rng() - 0.5) * 0.12,
        ruffle: 0,
        ruffleFreq: 1,
        profile: 'oval',
        shade: 0.94 + rng() * 0.1,
      })
    }
  }
  return b.toGeometry('sunflower')
}

function buildDaisy(seed: number) {
  const rng = mulberry32(seed)
  const b = new Builder()
  addDisc(b, 0.042, 0.01, 1, false)
  const count = 14
  for (let i = 0; i < count; i += 1) {
    addPetal(b, {
      angle: (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.05,
      radius: 0.038,
      yBase: 0.008,
      length: 0.15 + rng() * 0.02,
      width: 0.038,
      open: 1.02,
      curl: 0.18,
      cup: 0.02,
      twist: (rng() - 0.5) * 0.16,
      ruffle: 0,
      ruffleFreq: 1,
      profile: 'oval',
      shade: 0.96 + rng() * 0.06,
    })
  }
  return b.toGeometry('daisy')
}

function buildLily(seed: number) {
  const rng = mulberry32(seed)
  const b = new Builder()
  for (let i = 0; i < 6; i += 1) {
    const inner = i % 2 === 0
    addPetal(b, {
      angle: (i / 6) * Math.PI * 2,
      radius: 0.02,
      yBase: 0,
      length: 0.22 + rng() * 0.015,
      width: inner ? 0.092 : 0.078,
      open: inner ? 0.5 : 0.66,
      curl: 0.9 + rng() * 0.08,
      cup: 0.1,
      twist: (rng() - 0.5) * 0.08,
      ruffle: 0.004,
      ruffleFreq: 1,
      profile: 'pointed',
      shade: 0.95 + rng() * 0.08,
      segV: 14,
    })
  }
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.2
    const origin = new Vector3(Math.cos(angle) * 0.015, 0.03, Math.sin(angle) * 0.015)
    const tip = origin.clone().add(new Vector3(Math.cos(angle) * 0.03, 0.14, Math.sin(angle) * 0.03))
    for (let s = 0; s < 4; s += 1) {
      addSphere(b, origin.clone().lerp(tip, s / 3), s === 3 ? 0.014 : 0.006, 2, s / 3)
    }
  }
  return b.toGeometry('lily')
}

function buildLavender(seed: number) {
  const rng = mulberry32(seed)
  const b = new Builder()
  const clusters = 12
  for (let i = 0; i < clusters; i += 1) {
    const v = i / (clusters - 1)
    const y = v * 0.42
    const spread = 0.02 + Math.sin(v * Math.PI) * 0.028
    const n = 5
    for (let k = 0; k < n; k += 1) {
      const a = (k / n) * Math.PI * 2 + i * 0.7
      addPetal(b, {
        angle: a,
        radius: spread * 0.3,
        yBase: y,
        length: 0.045 + rng() * 0.01,
        width: 0.02,
        open: 0.7,
        curl: 0.4,
        cup: 0.2,
        twist: (rng() - 0.5) * 0.4,
        ruffle: 0,
        ruffleFreq: 1,
        profile: 'oval',
        shade: 0.9 + rng() * 0.15,
        segU: 3,
        segV: 4,
      })
    }
  }
  for (let i = 0; i < 6; i += 1) {
    const y = (i / 6) * 0.28
    const a = i * 1.7
    addPetal(b, {
      angle: a,
      radius: 0.01,
      yBase: y,
      length: 0.07,
      width: 0.018,
      open: 1.15,
      curl: 0.2,
      cup: 0,
      twist: 0.4,
      ruffle: 0,
      ruffleFreq: 1,
      profile: 'narrow',
      part: 3,
      shade: 1,
      segU: 2,
      segV: 3,
    })
  }
  return b.toGeometry('lavender')
}

function buildPeony(seed: number) {
  const rng = mulberry32(seed)
  const b = new Builder()
  const count = 22
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1)
    addPetal(b, {
      angle: i * 2.399963 + (rng() - 0.5) * 0.3,
      radius: 0.012 + t * 0.1,
      yBase: (1 - t) * 0.02,
      length: 0.1 + t * 0.12 + rng() * 0.015,
      width: 0.09 + t * 0.05,
      open: 0.38 + t * 0.7,
      curl: 0.25 + t * 0.45 + rng() * 0.15,
      cup: 0.22 * (1 - t),
      twist: (rng() - 0.5) * 0.7,
      ruffle: 0.01 + rng() * 0.012,
      ruffleFreq: 3,
      profile: 'oval',
      shade: 0.88 + rng() * 0.18,
    })
  }
  return b.toGeometry('peony')
}

const builders: Record<FlowerType, (seed: number) => BufferGeometry> = {
  rose: buildRose,
  tulip: buildTulip,
  sunflower: buildSunflower,
  daisy: buildDaisy,
  lily: buildLily,
  lavender: buildLavender,
  peony: buildPeony,
}

const geoCache = new Map<string, BufferGeometry>()

export function getFlowerGeometry(type: FlowerType, seed: number) {
  const key = `${type}:${seed.toFixed(3)}`
  let geo = geoCache.get(key)
  if (!geo) {
    geo = builders[type](seed)
    geoCache.set(key, geo)
  }
  return geo
}

let leafGeo: BufferGeometry | null = null

export function getLeafGeometry() {
  if (leafGeo) return leafGeo
  const b = new Builder()
  addPetal(b, {
    angle: 0,
    radius: 0,
    yBase: 0,
    length: 0.18,
    width: 0.075,
    open: Math.PI / 2,
    curl: 0.25,
    cup: 0.08,
    twist: 0.2,
    ruffle: 0,
    ruffleFreq: 1,
    profile: 'pointed',
    part: 3,
  })
  leafGeo = b.toGeometry('leaf')
  return leafGeo
}

const stemCache = new Map<string, TubeGeometry>()

export function getStemGeometry(height: number, seed: number, thin = false) {
  const key = `${height.toFixed(3)}:${seed.toFixed(2)}:${thin ? 1 : 0}`
  let geo = stemCache.get(key)
  if (!geo) {
    const bend = ((Math.abs(seed) % 1) - 0.5) * 0.06
    const bend2 = (((Math.abs(seed) * 1.7) % 1) - 0.5) * 0.05
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(bend, height * 0.5, bend2),
      new Vector3(0, height, 0),
    ])
    geo = new TubeGeometry(curve, 6, thin ? 0.006 : 0.009, 6, false)
    stemCache.set(key, geo)
  }
  return geo
}

let paperGeo: BufferGeometry | null = null

export function getPaperGeometry() {
  if (paperGeo) return paperGeo
  const b = new Builder()
  const segY = 10
  const segA = 28
  for (let iy = 0; iy <= segY; iy += 1) {
    const v = iy / segY
    const y = v * 0.78
    const flare = 0.1 + v * 0.28 + Math.sin(v * Math.PI) * 0.03
    for (let ia = 0; ia <= segA; ia += 1) {
      const u = ia / segA
      const a = u * Math.PI * 2
      const crinkle = Math.sin(a * 6 + v * 9) * 0.012 * (0.4 + v)
      const lip = Math.sin(a * 5) * 0.025 * v
      const r = flare + crinkle
      const p = new Vector3(Math.cos(a) * r, y + lip, Math.sin(a) * r)
      b.add(p, v, 0, 1, new Vector3())
    }
  }
  const stride = segA + 1
  for (let iy = 0; iy < segY; iy += 1) {
    for (let ia = 0; ia < segA; ia += 1) {
      const i00 = iy * stride + ia
      const i10 = i00 + 1
      const i01 = i00 + stride
      const i11 = i01 + 1
      b.face(i00, i01, i10)
      b.face(i10, i01, i11)
    }
  }
  paperGeo = b.toGeometry('paper')
  return paperGeo
}

let vaseGeo: BufferGeometry | null = null

export function getVaseGeometry() {
  if (vaseGeo) return vaseGeo
  const b = new Builder()
  const profile = [
    [0, 0.1],
    [0.04, 0.13],
    [0.16, 0.145],
    [0.38, 0.11],
    [0.62, 0.125],
    [0.84, 0.17],
    [0.98, 0.155],
  ]
  const segA = 24
  for (let iy = 0; iy < profile.length; iy += 1) {
    const [y, radius] = profile[iy]
    for (let ia = 0; ia <= segA; ia += 1) {
      const a = (ia / segA) * Math.PI * 2
      b.add(new Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius), iy / profile.length, 0, 1, new Vector3())
    }
  }
  const stride = segA + 1
  for (let iy = 0; iy < profile.length - 1; iy += 1) {
    for (let ia = 0; ia < segA; ia += 1) {
      const i00 = iy * stride + ia
      const i10 = i00 + 1
      const i01 = i00 + stride
      const i11 = i01 + 1
      b.face(i00, i10, i01)
      b.face(i10, i11, i01)
    }
  }
  vaseGeo = b.toGeometry('vase')
  return vaseGeo
}

let ribbonTail: BufferGeometry | null = null

export function getRibbonTail() {
  if (ribbonTail) return ribbonTail
  const b = new Builder()
  const seg = 8
  for (let i = 0; i <= seg; i += 1) {
    const v = i / seg
    const y = -v * 0.28
    const z = Math.sin(v * 1.4) * 0.04
    const w = 0.028 * (1 - v * 0.35)
    b.add(new Vector3(-w, y, z), v, 0, 1, new Vector3())
    b.add(new Vector3(w, y, z + 0.004), v, 0, 1, new Vector3())
  }
  for (let i = 0; i < seg; i += 1) {
    const a = i * 2
    b.face(a, a + 2, a + 1)
    b.face(a + 1, a + 2, a + 3)
  }
  ribbonTail = b.toGeometry('ribbon-tail')
  return ribbonTail
}
