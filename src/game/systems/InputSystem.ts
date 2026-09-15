import type { GameSettings } from '../../utils/storage'

export class InputSystem {
  readonly keys = new Set<string>()
  mouseDX = 0
  mouseDY = 0
  private pointerLocked = false
  private canvas: HTMLElement
  private settings: GameSettings
  private wantPointerLock = false

  constructor(canvas: HTMLElement, settings: GameSettings) {
    this.canvas = canvas
    this.settings = settings

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('click', this.onClick)
  }

  updateSettings(settings: GameSettings): void {
    this.settings = settings
  }

  setPointerLockDesired(want: boolean): void {
    this.wantPointerLock = want
    if (!want && document.pointerLockElement === this.canvas) {
      document.exitPointerLock()
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code)
    if (e.code === 'Escape' && this.pointerLocked) {
      document.exitPointerLock()
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (this.pointerLocked || e.buttons === 1) {
      const s = this.settings.sensitivity
      this.mouseDX += e.movementX * s * 0.002
      this.mouseDY += e.movementY * s * 0.002
    }
  }

  private onClick = (): void => {
    if (this.wantPointerLock && this.settings.pointerLock && !this.pointerLocked) {
      this.canvas.requestPointerLock()
    }
  }

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    const dx = this.mouseDX
    const dy = this.mouseDY
    this.mouseDX = 0
    this.mouseDY = 0
    return { dx, dy }
  }

  getMoveVector(): { x: number; z: number } {
    let x = 0
    let z = 0
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1
    const len = Math.hypot(x, z)
    if (len > 0) {
      x /= len
      z /= len
    }
    return { x, z }
  }

  isPausePressed(): boolean {
    return this.keys.has('KeyP') || this.keys.has('Escape')
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('click', this.onClick)
    if (document.pointerLockElement === this.canvas) document.exitPointerLock()
  }
}
