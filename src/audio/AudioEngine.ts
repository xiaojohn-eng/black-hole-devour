import type { GameSettings } from '../utils/storage'

/** Procedural WebAudio SFX — no external assets */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfx: GainNode | null = null
  private settings: GameSettings
  private ambienceNodes: AudioNode[] = []
  private ambiencePlaying = false

  constructor(settings: GameSettings) {
    this.settings = settings
  }

  async ensure(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return
    }
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.sfx = this.ctx.createGain()
    this.sfx.connect(this.master)
    this.master.connect(this.ctx.destination)
    this.applySettings(this.settings)
  }

  applySettings(settings: GameSettings): void {
    this.settings = settings
    if (!this.master || !this.sfx) return
    this.master.gain.value = settings.masterVolume
    this.sfx.gain.value = settings.sfxVolume
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0
  }

  playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.15,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.sfx) return
    const t = this.now()
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration)
    }
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(g)
    g.connect(this.sfx)
    osc.start(t)
    osc.stop(t + duration + 0.05)
  }

  playNoise(duration: number, gain = 0.08, bandFreq = 400): void {
    if (!this.ctx || !this.sfx) return
    const t = this.now()
    const bufferSize = Math.floor(this.ctx.sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = bandFreq
    filter.Q.value = 0.8
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.sfx)
    src.start(t)
    src.stop(t + duration)
  }

  playDevour(size: 'small' | 'medium' | 'large'): void {
    if (size === 'small') {
      this.playTone(220, 0.18, 'triangle', 0.1, 80)
      this.playNoise(0.12, 0.04, 600)
    } else if (size === 'medium') {
      this.playTone(160, 0.35, 'sawtooth', 0.12, 50)
      this.playTone(90, 0.4, 'sine', 0.1, 40)
      this.playNoise(0.25, 0.08, 300)
    } else {
      this.playTone(80, 0.7, 'sawtooth', 0.18, 30)
      this.playTone(55, 0.9, 'sine', 0.14, 25)
      this.playNoise(0.5, 0.14, 180)
    }
  }

  playAttractPulse(): void {
    this.playTone(90 + Math.random() * 40, 0.08, 'sine', 0.03)
  }

  playUIClick(): void {
    this.playTone(660, 0.06, 'square', 0.05)
    this.playTone(880, 0.08, 'square', 0.03)
  }

  playWin(): void {
    const notes = [523, 659, 784, 1046]
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.35, 'triangle', 0.1), i * 120)
    })
  }

  playLose(): void {
    this.playTone(200, 0.6, 'sawtooth', 0.12, 40)
    this.playTone(150, 0.8, 'sine', 0.1, 30)
    this.playNoise(0.7, 0.1, 120)
  }

  playLevelUp(): void {
    ;[440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'triangle', 0.09), i * 90)
    })
  }

  startAmbience(): void {
    if (!this.ctx || !this.sfx || this.ambiencePlaying) return
    this.ambiencePlaying = true
    const t = this.now()

    // Low drone
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 42
    g.gain.value = 0.025
    osc.connect(g)
    g.connect(this.sfx)
    osc.start(t)
    this.ambienceNodes.push(osc, g)

    // Soft noise bed
    const bufferSize = this.ctx.sampleRate * 2
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 200
    const ng = this.ctx.createGain()
    ng.gain.value = 0.02
    src.connect(filter)
    filter.connect(ng)
    ng.connect(this.sfx)
    src.start(t)
    this.ambienceNodes.push(src, filter, ng)
  }

  stopAmbience(): void {
    for (const n of this.ambienceNodes) {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          ;(n as OscillatorNode).stop()
        }
        n.disconnect()
      } catch {
        /* ignore */
      }
    }
    this.ambienceNodes = []
    this.ambiencePlaying = false
  }
}
