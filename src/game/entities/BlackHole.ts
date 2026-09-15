import * as THREE from 'three'
import { accretionDiskVertex, accretionDiskFragment } from '../shaders/accretionDisk'
import { massToRadius, massToAttractRadius } from '../../utils/math'

export class BlackHole {
  readonly group = new THREE.Group()
  mass: number
  velocity = new THREE.Vector3()
  isPlayer: boolean
  alive = true

  private horizon: THREE.Mesh
  private disk: THREE.Mesh
  private glow: THREE.Mesh
  private ringLight: THREE.PointLight
  private diskMat: THREE.ShaderMaterial
  private targetScale = 1
  private pulse = 0

  constructor(mass: number, isPlayer = false) {
    this.mass = mass
    this.isPlayer = isPlayer

    const r = this.radius

    // Event horizon
    const horizonGeo = new THREE.SphereGeometry(1, 48, 48)
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    this.horizon = new THREE.Mesh(horizonGeo, horizonMat)
    this.horizon.scale.setScalar(r)
    this.group.add(this.horizon)

    // Photon ring / lensing rim
    const rimGeo = new THREE.SphereGeometry(1.08, 48, 32)
    const rimMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? 0xffaa66 : 0xaa66ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const rim = new THREE.Mesh(rimGeo, rimMat)
    rim.scale.setScalar(r)
    this.group.add(rim)

    // Accretion disk
    this.diskMat = new THREE.ShaderMaterial({
      vertexShader: accretionDiskVertex,
      fragmentShader: accretionDiskFragment,
      uniforms: {
        uTime: { value: 0 },
        uColorHot: { value: new THREE.Color(isPlayer ? 0xffe0a0 : 0xd0a0ff) },
        uColorCool: { value: new THREE.Color(isPlayer ? 0xff6020 : 0x8040ff) },
        uIntensity: { value: 1.2 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const diskGeo = new THREE.RingGeometry(0.35, 1.0, 64, 4)
    this.disk = new THREE.Mesh(diskGeo, this.diskMat)
    this.disk.rotation.x = -Math.PI * 0.42
    this.disk.scale.setScalar(r * 2.8)
    this.group.add(this.disk)

    // Soft glow plane
    const glowGeo = new THREE.CircleGeometry(1.4, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? 0xff8844 : 0x9966ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.glow = new THREE.Mesh(glowGeo, glowMat)
    this.glow.rotation.x = -Math.PI * 0.42
    this.glow.scale.setScalar(r * 2.8)
    this.group.add(this.glow)

    this.ringLight = new THREE.PointLight(isPlayer ? 0xff9944 : 0xaa66ff, 2.5, r * 20)
    this.group.add(this.ringLight)

    this.targetScale = r
  }

  get radius(): number {
    return massToRadius(this.mass)
  }

  get attractRadius(): number {
    return massToAttractRadius(this.mass)
  }

  get position(): THREE.Vector3 {
    return this.group.position
  }

  setMass(mass: number): void {
    this.mass = mass
    this.targetScale = this.radius
  }

  addMass(amount: number): void {
    this.mass += amount
    this.targetScale = this.radius
    this.pulse = 1
  }

  update(dt: number, time: number): void {
    this.diskMat.uniforms.uTime!.value = time

    const cur = this.horizon.scale.x
    const next = THREE.MathUtils.lerp(cur, this.targetScale, 1 - Math.pow(0.001, dt))
    this.horizon.scale.setScalar(next)
    this.disk.scale.setScalar(next * 2.8 * (1 + this.pulse * 0.15))
    this.glow.scale.setScalar(next * 2.8 * (1 + this.pulse * 0.2))
    this.ringLight.distance = next * 22
    this.ringLight.intensity = 2.2 + this.pulse * 3

    // Second child is rim
    const rim = this.group.children[1]
    if (rim) rim.scale.setScalar(next)

    this.disk.rotation.z += dt * 0.35
    this.pulse = Math.max(0, this.pulse - dt * 2.5)

    // Slight bob for rivals
    if (!this.isPlayer) {
      this.group.position.y = Math.sin(time * 0.7 + this.mass) * 0.3
    }
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const m = obj.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
  }
}
