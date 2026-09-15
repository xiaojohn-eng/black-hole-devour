import * as THREE from 'three'
import { BlackHole } from './entities/BlackHole'
import {
  type BodyData,
  type BodyType,
  createBodyMesh,
  massForType,
  radiusFromMass,
  scoreForBody,
  disposeObject3D,
} from './entities/CelestialBody'
import { ParticleSystem } from './entities/ParticleSystem'
import { Starfield, createNebulae } from './entities/Starfield'
import { InputSystem } from './systems/InputSystem'
import { AudioEngine } from '../audio/AudioEngine'
import { UIManager, type ScreenId } from '../ui/UIManager'
import {
  type GameSettings,
  loadSettings,
  saveSettings,
  loadHighScore,
  saveHighScore,
} from '../utils/storage'
import { LEVELS, getLevel, type LevelConfig } from '../utils/levels'
import { clamp, randInAnnulus, formatMass, formatScore } from '../utils/math'

type Phase = 'title' | 'playing' | 'paused' | 'levelclear' | 'victory' | 'defeat'

export class Game {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private input: InputSystem
  private audio: AudioEngine
  private ui: UIManager
  private settings: GameSettings

  private player!: BlackHole
  private bodies: BodyData[] = []
  private particles!: ParticleSystem
  private starfield!: Starfield
  private nebulae!: THREE.Group

  private phase: Phase = 'title'
  private levelId = 1
  private level!: LevelConfig
  private score = 0
  private highScore = 0
  private spawnAcc = 0
  private time = 0
  private shake = 0
  private fovPunch = 0
  private baseFov = 55
  private yaw = 0
  private attractPulseT = 0
  private pauseLatch = false
  private animId = 0
  private running = false

  private tmpV = new THREE.Vector3()
  private tmpV2 = new THREE.Vector3()

  constructor(container: HTMLElement) {
    this.settings = loadSettings()
    this.highScore = loadHighScore()

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x03050c)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.1, 800)
    this.camera.position.set(0, 28, 42)

    this.input = new InputSystem(this.renderer.domElement, this.settings)
    this.audio = new AudioEngine(this.settings)
    this.ui = new UIManager(container, {
      onStart: () => void this.startGame(),
      onResume: () => this.resume(),
      onRestart: () => void this.startGame(1),
      onTitle: () => this.toTitle(),
      onSettingsChange: (s) => this.applySettings(s),
      onHowTo: () => this.ui.showScreen('howto'),
      onSettings: () => this.ui.showScreen('settings'),
      onBackTitle: () => {
        if (this.phase === 'paused') this.ui.showScreen('pause')
        else this.ui.showScreen('title')
      },
      onNextLevel: () => void this.nextLevel(),
    })

    this.ui.updateHighScore(this.highScore)
    this.ui.setSettings(this.settings)
    this.buildWorldDecor()
    this.ui.showScreen('title')

    window.addEventListener('resize', this.onResize)
    this.running = true
    this.loop()
  }

  private buildWorldDecor(): void {
    this.starfield = new Starfield(2800, 450)
    this.scene.add(this.starfield.points)
    this.nebulae = createNebulae(10)
    this.scene.add(this.nebulae)

    const amb = new THREE.AmbientLight(0x334466, 0.55)
    this.scene.add(amb)
    const dir = new THREE.DirectionalLight(0x8899bb, 0.4)
    dir.position.set(20, 40, 10)
    this.scene.add(dir)

    this.particles = new ParticleSystem()
    this.scene.add(this.particles.points)
  }

  private applySettings(s: GameSettings): void {
    this.settings = s
    saveSettings(s)
    this.audio.applySettings(s)
    this.input.updateSettings(s)
    this.input.setPointerLockDesired(s.pointerLock && this.phase === 'playing')
  }

  private async startGame(fromLevel = 1): Promise<void> {
    await this.audio.ensure()
    this.audio.playUIClick()
    this.audio.startAmbience()

    this.clearBodies()
    if (this.player) {
      this.scene.remove(this.player.group)
      this.player.dispose()
    }

    this.levelId = fromLevel
    this.level = getLevel(this.levelId)
    this.score = fromLevel === 1 ? 0 : this.score
    this.shake = 0
    this.fovPunch = 0
    this.yaw = 0
    this.spawnAcc = 0
    this.pauseLatch = false

    this.player = new BlackHole(this.level.startMass, true)
    this.player.position.set(0, 0, 0)
    this.scene.add(this.player.group)

    // Seed bodies
    const seedCount = Math.min(this.level.maxBodies, 28 + this.levelId * 8)
    for (let i = 0; i < seedCount; i++) this.spawnBody()

    // Seed rivals
    for (let i = 0; i < this.level.rivalCount; i++) this.spawnRival()

    this.phase = 'playing'
    this.input.setPointerLockDesired(this.settings.pointerLock)
    this.ui.showScreen('hud')
    this.ui.showLevelBanner(this.level.name, this.levelId)
    this.updateHud()
  }

  private async nextLevel(): Promise<void> {
    if (this.levelId >= LEVELS.length) {
      this.phase = 'victory'
      this.finishRun(true)
      return
    }
    await this.startGame(this.levelId + 1)
  }

  private toTitle(): void {
    this.phase = 'title'
    this.input.setPointerLockDesired(false)
    this.audio.stopAmbience()
    this.clearBodies()
    if (this.player) {
      this.scene.remove(this.player.group)
      this.player.dispose()
      this.player = undefined as unknown as BlackHole
    }
    this.ui.showScreen('title')
    this.ui.updateHighScore(loadHighScore())
  }

  private resume(): void {
    if (this.phase !== 'paused') return
    this.phase = 'playing'
    this.input.setPointerLockDesired(this.settings.pointerLock)
    this.ui.showScreen('hud')
    this.audio.playUIClick()
  }

  private pause(): void {
    if (this.phase !== 'playing') return
    this.phase = 'paused'
    this.input.setPointerLockDesired(false)
    this.ui.showScreen('pause')
    this.audio.playUIClick()
  }

  private pickType(): BodyType {
    const w = this.level.spawnWeights
    const total = w.asteroid + w.star + w.planet + w.rival
    let r = Math.random() * total
    if ((r -= w.asteroid) < 0) return 'asteroid'
    if ((r -= w.star) < 0) return 'star'
    if ((r -= w.planet) < 0) return 'planet'
    return 'rival'
  }

  private spawnBody(forced?: BodyType): void {
    if (this.bodies.length >= this.level.maxBodies) return
    const type = forced ?? this.pickType()
    if (type === 'rival') {
      this.spawnRival()
      return
    }

    const mass = massForType(type, this.player.mass, this.level.massScale.min, this.level.massScale.max)
    // Cap oversized so early game is fair
    const capped = Math.min(mass, this.player.mass * (type === 'planet' ? 2.5 : 1.6))
    const radius = radiusFromMass(type, capped)
    const mesh = createBodyMesh(type, radius)
    randInAnnulus(this.level.worldRadius * 0.35, this.level.worldRadius * 0.95, mesh.position)
    mesh.position.add(this.player.position)

    const body: BodyData = {
      type,
      mass: capped,
      radius,
      alive: true,
      beingPulled: false,
      swallowProgress: 0,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 1.5,
      ),
      mesh,
      rivalBH: null,
    }
    this.scene.add(mesh)
    this.bodies.push(body)
  }

  private spawnRival(): void {
    if (this.bodies.filter((b) => b.type === 'rival' && b.alive).length >= this.level.rivalCount + 1) return
    const mass = massForType('rival', this.player.mass, 0.7, this.level.massScale.max * 0.9)
    // Keep at least one threat slightly larger occasionally
    const finalMass = Math.random() > 0.55 ? mass * 1.15 : mass * 0.85
    const bh = new BlackHole(finalMass, false)
    randInAnnulus(this.level.worldRadius * 0.45, this.level.worldRadius * 0.9, bh.position)
    bh.position.add(this.player.position)
    this.scene.add(bh.group)

    const body: BodyData = {
      type: 'rival',
      mass: finalMass,
      radius: bh.radius,
      alive: true,
      beingPulled: false,
      swallowProgress: 0,
      velocity: new THREE.Vector3(),
      mesh: bh.group,
      rivalBH: bh,
    }
    this.bodies.push(body)
  }

  private clearBodies(): void {
    for (const b of this.bodies) {
      this.scene.remove(b.mesh)
      if (b.rivalBH) b.rivalBH.dispose()
      else disposeObject3D(b.mesh)
    }
    this.bodies = []
  }

  private updateHud(): void {
    if (!this.player) return
    this.ui.updateHud({
      mass: formatMass(this.player.mass),
      score: formatScore(this.score),
      level: `${this.levelId} / ${LEVELS.length}`,
      levelName: this.level.name,
      progress: clamp(this.player.mass / this.level.targetMass, 0, 1),
      target: formatMass(this.level.targetMass),
    })
  }

  private finishRun(won: boolean): void {
    this.input.setPointerLockDesired(false)
    saveHighScore(this.score)
    this.highScore = loadHighScore()
    if (won) {
      this.audio.playWin()
      this.phase = 'victory'
      this.ui.showEnd(true, formatScore(this.score), formatScore(this.highScore), formatMass(this.player.mass))
    } else {
      this.audio.playLose()
      this.phase = 'defeat'
      this.ui.showEnd(false, formatScore(this.score), formatScore(this.highScore), formatMass(this.player.mass))
    }
  }

  private onLevelClear(): void {
    this.audio.playLevelUp()
    if (this.levelId >= LEVELS.length) {
      this.finishRun(true)
      return
    }
    this.phase = 'levelclear'
    this.input.setPointerLockDesired(false)
    const next = getLevel(this.levelId + 1)
    this.ui.showLevelClear(this.level.name, next.name, formatScore(this.score))
  }

  private loop = (): void => {
    if (!this.running) return
    this.animId = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.time += dt

    // Pause toggle
    const pauseDown = this.input.isPausePressed()
    if (pauseDown && !this.pauseLatch) {
      this.pauseLatch = true
      if (this.phase === 'playing') this.pause()
      else if (this.phase === 'paused') this.resume()
    }
    if (!pauseDown) this.pauseLatch = false

    if (this.phase === 'playing') {
      this.updatePlaying(dt)
    } else {
      // Idle camera drift on title
      if (this.phase === 'title') {
        this.camera.position.set(Math.sin(this.time * 0.15) * 30, 25, 45 + Math.cos(this.time * 0.1) * 5)
        this.camera.lookAt(0, 0, 0)
      }
    }

    this.starfield.update(this.time, this.player?.position ?? new THREE.Vector3())
    this.particles.update(dt)
    this.renderer.render(this.scene, this.camera)
  }

  private updatePlaying(dt: number): void {
    // --- Player movement ---
    const move = this.input.getMoveVector()
    const { dx } = this.input.consumeMouseDelta()
    this.yaw -= dx

    // Face movement relative to camera yaw
    const speed = 14 + Math.pow(this.player.mass, 0.25) * 1.2
    const cos = Math.cos(this.yaw)
    const sin = Math.sin(this.yaw)
    const wx = move.x * cos - move.z * sin
    const wz = move.x * sin + move.z * cos

    this.player.velocity.x = THREE.MathUtils.lerp(this.player.velocity.x, wx * speed, 1 - Math.pow(0.02, dt))
    this.player.velocity.z = THREE.MathUtils.lerp(this.player.velocity.z, wz * speed, 1 - Math.pow(0.02, dt))
    this.player.velocity.y = THREE.MathUtils.lerp(this.player.velocity.y, 0, 0.1)
    this.player.position.addScaledVector(this.player.velocity, dt)

    // Soft world bound
    const bound = this.level.worldRadius
    this.player.position.x = clamp(this.player.position.x, -bound, bound)
    this.player.position.z = clamp(this.player.position.z, -bound, bound)

    this.player.update(dt, this.time)

    // --- Spawn ---
    this.spawnAcc += dt * this.level.spawnRate
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1
      this.spawnBody()
    }

    // --- Bodies physics ---
    this.attractPulseT -= dt
    const pPos = this.player.position
    const pMass = this.player.mass
    const pRadius = this.player.radius
    const attractR = this.player.attractRadius

    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i]!
      if (!b.alive) {
        this.removeBodyAt(i)
        continue
      }

      if (b.type === 'rival' && b.rivalBH) {
        this.updateRival(b, dt)
      }

      const bPos = b.mesh.position
      const dist = bPos.distanceTo(pPos)

      // Player attracts smaller bodies
      if (b.mass < pMass && dist < attractR) {
        b.beingPulled = true
        const pull = (1 - dist / attractR) * (8 + pMass * 0.04)
        this.tmpV.subVectors(pPos, bPos).normalize().multiplyScalar(pull * dt)
        b.velocity.add(this.tmpV)
        // Spiral swirl
        this.tmpV2.set(-(bPos.z - pPos.z), 0, bPos.x - pPos.x).normalize().multiplyScalar(pull * 0.35 * dt)
        b.velocity.add(this.tmpV2)

        if (this.attractPulseT <= 0 && Math.random() > 0.92) {
          this.attractPulseT = 0.15
          this.audio.playAttractPulse()
          this.particles.emitSpiral(bPos, pPos, 2, new THREE.Color(0xffaa66))
        }
      } else {
        b.beingPulled = false
      }

      // Swallow check
      if (b.mass < pMass && dist < pRadius * 1.15 + b.radius * 0.3) {
        this.swallow(b, 'player')
        continue
      }

      // Rival swallows player?
      if (b.type === 'rival' && b.rivalBH && b.mass > pMass) {
        const rDist = dist
        if (rDist < b.rivalBH.radius * 1.2 + pRadius * 0.3) {
          this.finishRun(false)
          return
        }
        // Rival attracts player slightly if larger
        if (rDist < b.rivalBH.attractRadius) {
          const pull = (1 - rDist / b.rivalBH.attractRadius) * 4 * dt
          this.tmpV.subVectors(bPos, pPos).normalize().multiplyScalar(pull)
          this.player.velocity.add(this.tmpV)
        }
      }

      // Integrate
      b.mesh.position.addScaledVector(b.velocity, dt)
      b.velocity.multiplyScalar(0.992)
      if (b.type !== 'rival') {
        b.mesh.rotation.x += dt * 0.4
        b.mesh.rotation.y += dt * 0.6
      }

      // Cull far
      if (dist > this.level.worldRadius * 1.6) {
        b.alive = false
      }
    }

    // Camera follow
    this.updateCamera(dt)

    // Level clear
    if (this.player.mass >= this.level.targetMass) {
      this.onLevelClear()
      return
    }

    this.updateHud()
  }

  private updateRival(b: BodyData, dt: number): void {
    const bh = b.rivalBH!
    bh.update(dt, this.time)
    b.radius = bh.radius
    b.mass = bh.mass

    // Seek nearby smaller bodies or wander toward player slowly
    let nearest: BodyData | null = null
    let nearestD = Infinity
    for (const o of this.bodies) {
      if (o === b || !o.alive || o.mass >= b.mass) continue
      const d = o.mesh.position.distanceTo(bh.position)
      if (d < nearestD && d < 50) {
        nearestD = d
        nearest = o
      }
    }

    if (nearest) {
      this.tmpV.subVectors(nearest.mesh.position, bh.position).normalize()
      bh.velocity.lerp(this.tmpV.multiplyScalar(6 + Math.pow(b.mass, 0.2)), 0.02)
    } else {
      this.tmpV.subVectors(this.player.position, bh.position).normalize()
      bh.velocity.lerp(this.tmpV.multiplyScalar(3.5), 0.01)
    }
    bh.position.addScaledVector(bh.velocity, dt)

    // Rival attracts & swallows
    for (const o of this.bodies) {
      if (o === b || !o.alive || o.mass >= b.mass) continue
      const d = o.mesh.position.distanceTo(bh.position)
      if (d < bh.attractRadius) {
        this.tmpV.subVectors(bh.position, o.mesh.position).normalize().multiplyScalar((1 - d / bh.attractRadius) * 6 * dt)
        o.velocity.add(this.tmpV)
      }
      if (d < bh.radius * 1.1 + o.radius * 0.3) {
        bh.addMass(o.mass * 0.85)
        b.mass = bh.mass
        o.alive = false
        this.particles.emit(o.mesh.position, 12, new THREE.Color(0xaa66ff), 5, 0.5)
      }
    }
  }

  private swallow(b: BodyData, _by: 'player'): void {
    b.alive = false
    const gained = b.mass * 0.9
    this.player.addMass(gained)
    const pts = scoreForBody(b.type, b.mass)
    this.score += pts

    const size = b.mass > this.player.mass * 0.4 ? 'large' : b.mass > this.player.mass * 0.15 ? 'medium' : 'small'
    this.audio.playDevour(size)
    this.particles.emit(b.mesh.position.clone(), size === 'large' ? 40 : size === 'medium' ? 22 : 10, new THREE.Color(0xffcc88), 8, 0.7)
    this.particles.emitSpiral(b.mesh.position, this.player.position, 15, new THREE.Color(0xff6622))

    if (size === 'large') {
      this.shake = 0.55
      this.fovPunch = 8
    } else if (size === 'medium') {
      this.shake = 0.25
      this.fovPunch = 4
    }
  }

  private removeBodyAt(i: number): void {
    const b = this.bodies[i]!
    this.scene.remove(b.mesh)
    if (b.rivalBH) b.rivalBH.dispose()
    else disposeObject3D(b.mesh)
    this.bodies.splice(i, 1)
  }

  private updateCamera(dt: number): void {
    const r = this.player.radius
    const dist = 22 + r * 4.5
    const height = 14 + r * 2.2

    const cos = Math.cos(this.yaw)
    const sin = Math.sin(this.yaw)
    const ideal = this.tmpV.set(
      this.player.position.x + sin * dist,
      this.player.position.y + height,
      this.player.position.z + cos * dist,
    )

    this.camera.position.lerp(ideal, 1 - Math.pow(0.08, dt))

    // Shake
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 2
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 2
      this.shake = Math.max(0, this.shake - dt * 1.5)
    }

    this.tmpV2.copy(this.player.position)
    this.camera.lookAt(this.tmpV2)

    // FOV punch
    if (this.fovPunch > 0) {
      this.camera.fov = this.baseFov + this.fovPunch
      this.fovPunch = Math.max(0, this.fovPunch - dt * 18)
    } else {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFov, 0.1)
    }
    this.camera.updateProjectionMatrix()
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  dispose(): void {
    this.running = false
    cancelAnimationFrame(this.animId)
    window.removeEventListener('resize', this.onResize)
    this.input.dispose()
    this.audio.stopAmbience()
    this.clearBodies()
    this.starfield.dispose()
    this.particles.dispose()
    this.renderer.dispose()
  }
}

// re-export for UI typing convenience
export type { ScreenId }
