const HIGH_SCORE_KEY = 'bhd_high_score'
const SETTINGS_KEY = 'bhd_settings'

export interface GameSettings {
  masterVolume: number
  sfxVolume: number
  sensitivity: number
  pointerLock: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  sensitivity: 1.0,
  pointerLock: false,
}

export function loadHighScore(): number {
  try {
    const v = localStorage.getItem(HIGH_SCORE_KEY)
    return v ? Math.max(0, Number(v) || 0) : 0
  } catch {
    return 0
  }
}

export function saveHighScore(score: number): void {
  try {
    const prev = loadHighScore()
    if (score > prev) localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)))
  } catch {
    /* ignore */
  }
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<GameSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}
