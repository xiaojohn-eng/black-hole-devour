import * as THREE from 'three'

interface Particle {
  life: number
  maxLife: number
  velocity: THREE.Vector3
  active: boolean
}

const MAX = 400

export class ParticleSystem {
  readonly points: THREE.Points
  private positions: Float32Array
  private colors: Float32Array
  private particles: Particle[] = []
  private geo: THREE.BufferGeometry

  constructor() {
    this.positions = new Float32Array(MAX * 3)
    this.colors = new Float32Array(MAX * 3)
    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(this.geo, mat)
    this.points.frustumCulled = false

    for (let i = 0; i < MAX; i++) {
      this.particles.push({
        life: 0,
        maxLife: 1,
        velocity: new THREE.Vector3(),
        active: false,
      })
      this.positions[i * 3 + 1] = -9999
    }
  }

  emit(
    origin: THREE.Vector3,
    count: number,
    color: THREE.Color,
    speed = 4,
    life = 0.6,
  ): void {
    let spawned = 0
    for (let i = 0; i < MAX && spawned < count; i++) {
      const p = this.particles[i]!
      if (p.active) continue
      p.active = true
      p.life = life * (0.6 + Math.random() * 0.4)
      p.maxLife = p.life
      p.velocity.set(
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed,
      )
      this.positions[i * 3] = origin.x + (Math.random() - 0.5) * 0.5
      this.positions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.5
      this.positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.5
      const jitter = 0.7 + Math.random() * 0.3
      this.colors[i * 3] = color.r * jitter
      this.colors[i * 3 + 1] = color.g * jitter
      this.colors[i * 3 + 2] = color.b * jitter
      spawned++
    }
    this.geo.attributes.position!.needsUpdate = true
    this.geo.attributes.color!.needsUpdate = true
  }

  /** Spiral inward toward target (swallow effect) */
  emitSpiral(origin: THREE.Vector3, target: THREE.Vector3, count: number, color: THREE.Color): void {
    let spawned = 0
    const dir = new THREE.Vector3().subVectors(target, origin)
    for (let i = 0; i < MAX && spawned < count; i++) {
      const p = this.particles[i]!
      if (p.active) continue
      p.active = true
      p.life = 0.4 + Math.random() * 0.35
      p.maxLife = p.life
      const tangent = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar((Math.random() - 0.5) * 6)
      p.velocity.copy(dir).normalize().multiplyScalar(8 + Math.random() * 6).add(tangent)
      this.positions[i * 3] = origin.x
      this.positions[i * 3 + 1] = origin.y
      this.positions[i * 3 + 2] = origin.z
      this.colors[i * 3] = color.r
      this.colors[i * 3 + 1] = color.g
      this.colors[i * 3 + 2] = color.b
      spawned++
    }
    this.geo.attributes.position!.needsUpdate = true
    this.geo.attributes.color!.needsUpdate = true
  }

  update(dt: number): void {
    let dirty = false
    for (let i = 0; i < MAX; i++) {
      const p = this.particles[i]!
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        this.positions[i * 3 + 1] = -9999
        dirty = true
        continue
      }
      this.positions[i * 3]! += p.velocity.x * dt
      this.positions[i * 3 + 1]! += p.velocity.y * dt
      this.positions[i * 3 + 2]! += p.velocity.z * dt
      p.velocity.multiplyScalar(0.96)
      dirty = true
    }
    if (dirty) this.geo.attributes.position!.needsUpdate = true
  }

  dispose(): void {
    this.geo.dispose()
    ;(this.points.material as THREE.Material).dispose()
  }
}
