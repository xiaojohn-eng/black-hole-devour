import * as THREE from 'three'

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randOnSphere(radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  out.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  )
  return out
}

export function randInAnnulus(
  minR: number,
  maxR: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const r = Math.sqrt(randRange(minR * minR, maxR * maxR))
  const angle = Math.random() * Math.PI * 2
  const y = randRange(-r * 0.15, r * 0.15)
  out.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
  return out
}

/** Schwarzschild radius proxy from mass */
export function massToRadius(mass: number): number {
  return Math.max(0.35, Math.pow(mass, 0.4) * 0.55)
}

export function massToAttractRadius(mass: number): number {
  return massToRadius(mass) * 6.5
}

export function formatMass(mass: number): string {
  if (mass >= 1e6) return (mass / 1e6).toFixed(2) + ' M☉'
  if (mass >= 1e3) return (mass / 1e3).toFixed(2) + ' k☉'
  return mass.toFixed(1) + ' ☉'
}

export function formatScore(score: number): string {
  return Math.floor(score).toLocaleString('zh-CN')
}
