import * as THREE from 'three'
import { randRange } from '../../utils/math'

export type BodyType = 'asteroid' | 'star' | 'planet' | 'rival'

export interface BodyData {
  type: BodyType
  mass: number
  radius: number
  alive: boolean
  beingPulled: boolean
  swallowProgress: number
  velocity: THREE.Vector3
  mesh: THREE.Object3D
  /** Rival black hole controller if type === rival */
  rivalBH: import('./BlackHole').BlackHole | null
}

const ASTEROID_COLORS = [0x8a7a6a, 0x6b6055, 0x9a8b7c, 0x5c5348]
const STAR_COLORS = [0xffeebb, 0xffcc88, 0xaaccff, 0xff8866, 0xffffff]
const PLANET_COLORS = [0x4488cc, 0xcc6644, 0x66aa77, 0xccaa44, 0x8866aa]

function makeAsteroid(radius: number): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(radius, 1)
  // Distort vertices
  const pos = geo.attributes.position!
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = 0.75 + Math.random() * 0.5
    pos.setXYZ(i, x * n, y * n, z * n)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({
    color: ASTEROID_COLORS[(Math.random() * ASTEROID_COLORS.length) | 0]!,
    roughness: 0.92,
    metalness: 0.15,
    flatShading: true,
  })
  return new THREE.Mesh(geo, mat)
}

function makeStar(radius: number): THREE.Group {
  const g = new THREE.Group()
  const color = STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0]!
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshBasicMaterial({ color }),
  )
  g.add(core)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.45, 16, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  g.add(glow)
  const light = new THREE.PointLight(color, 1.2, radius * 25)
  g.add(light)
  return g
}

function makePlanet(radius: number): THREE.Group {
  const g = new THREE.Group()
  const base = PLANET_COLORS[(Math.random() * PLANET_COLORS.length) | 0]!
  const geo = new THREE.SphereGeometry(radius, 32, 32)
  // Simple latitude banding via vertex colors
  const colors = new Float32Array(geo.attributes.position!.count * 3)
  const c1 = new THREE.Color(base)
  const c2 = new THREE.Color(base).offsetHSL(0.05, 0.1, 0.15)
  for (let i = 0; i < geo.attributes.position!.count; i++) {
    const y = geo.attributes.position!.getY(i) / radius
    const t = 0.5 + 0.5 * Math.sin(y * 8 + Math.random())
    const c = c1.clone().lerp(c2, t)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0.1,
  })
  g.add(new THREE.Mesh(geo, mat))

  if (Math.random() > 0.55) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.4, radius * 2.1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xccbbaa,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    ring.rotation.x = Math.PI * 0.45
    g.add(ring)
  }
  return g
}

export function createBodyMesh(type: BodyType, radius: number): THREE.Object3D {
  switch (type) {
    case 'asteroid':
      return makeAsteroid(radius)
    case 'star':
      return makeStar(radius)
    case 'planet':
      return makePlanet(radius)
    default:
      return makeAsteroid(radius)
  }
}

export function massForType(type: BodyType, playerMass: number, minS: number, maxS: number): number {
  const scale = randRange(minS, maxS)
  switch (type) {
    case 'asteroid':
      return Math.max(0.5, playerMass * scale * 0.35)
    case 'star':
      return Math.max(2, playerMass * scale * 0.7)
    case 'planet':
      return Math.max(5, playerMass * scale * 1.1)
    case 'rival':
      return Math.max(8, playerMass * scale * 1.15)
    default:
      return playerMass * 0.3
  }
}

export function radiusFromMass(type: BodyType, mass: number): number {
  if (type === 'rival') return Math.max(0.4, Math.pow(mass, 0.4) * 0.5)
  if (type === 'star') return Math.max(0.4, Math.pow(mass, 0.33) * 0.45)
  if (type === 'planet') return Math.max(0.5, Math.pow(mass, 0.35) * 0.5)
  return Math.max(0.25, Math.pow(mass, 0.35) * 0.35)
}

export function scoreForBody(type: BodyType, mass: number): number {
  const mult = type === 'asteroid' ? 1 : type === 'star' ? 2.5 : type === 'planet' ? 5 : 12
  return mass * mult
}

export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      const m = child.material
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else (m as THREE.Material).dispose()
    }
  })
}
