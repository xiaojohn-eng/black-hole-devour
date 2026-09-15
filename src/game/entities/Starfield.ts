import * as THREE from 'three'
import { starfieldVertex, starfieldFragment } from '../shaders/starfield'

export class Starfield {
  readonly points: THREE.Points
  private mat: THREE.ShaderMaterial

  constructor(count = 2500, radius = 400) {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = radius * (0.55 + Math.random() * 0.45)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = 0.6 + Math.random() * 2.2
      phases[i] = Math.random()
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    this.mat = new THREE.ShaderMaterial({
      vertexShader: starfieldVertex,
      fragmentShader: starfieldFragment,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(geo, this.mat)
  }

  update(time: number, follow: THREE.Vector3): void {
    this.mat.uniforms.uTime!.value = time
    this.points.position.copy(follow)
  }

  dispose(): void {
    this.points.geometry.dispose()
    this.mat.dispose()
  }
}

/** Soft nebula billboards */
export function createNebulae(count = 8): THREE.Group {
  const group = new THREE.Group()
  const colors = [0x2244aa, 0x662288, 0x226655, 0x884422, 0x334466]

  for (let i = 0; i < count; i++) {
    const size = 40 + Math.random() * 80
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
    const c = new THREE.Color(colors[i % colors.length]!)
    grd.addColorStop(0, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},0.45)`)
    grd.addColorStop(0.4, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},0.12)`)
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55,
      transparent: true,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(size, size, 1)
    const ang = Math.random() * Math.PI * 2
    const r = 60 + Math.random() * 180
    sprite.position.set(Math.cos(ang) * r, (Math.random() - 0.5) * 40, Math.sin(ang) * r)
    group.add(sprite)
  }
  return group
}
