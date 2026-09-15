import type { GameSettings } from '../utils/storage'
import { DEFAULT_SETTINGS } from '../utils/storage'

export type ScreenId = 'title' | 'howto' | 'settings' | 'hud' | 'pause' | 'levelclear' | 'end'

export interface UICallbacks {
  onStart: () => void
  onResume: () => void
  onRestart: () => void
  onTitle: () => void
  onSettingsChange: (s: GameSettings) => void
  onHowTo: () => void
  onSettings: () => void
  onBackTitle: () => void
  onNextLevel: () => void
}

export interface HudData {
  mass: string
  score: string
  level: string
  levelName: string
  progress: number
  target: string
}

export class UIManager {
  private root: HTMLElement
  private screens: Record<string, HTMLElement> = {}
  private cbs: UICallbacks
  private settings: GameSettings = { ...DEFAULT_SETTINGS }
  private bannerEl: HTMLElement | null = null

  constructor(container: HTMLElement, cbs: UICallbacks) {
    this.cbs = cbs
    this.root = document.createElement('div')
    this.root.id = 'ui-root'
    container.appendChild(this.root)
    this.build()
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="screen" data-screen="title">
        <div class="panel title-panel">
          <div class="logo-glow"></div>
          <h1 class="game-title">黑洞吞噬</h1>
          <p class="subtitle">控制黑洞 · 吞噬宇宙 · 成长为超级巨物</p>
          <p class="highscore">最高分：<span id="hs-value">0</span></p>
          <div class="btn-col">
            <button class="btn primary" data-action="start">开始游戏</button>
            <button class="btn" data-action="howto">操作说明</button>
            <button class="btn" data-action="settings">设置</button>
          </div>
        </div>
      </div>

      <div class="screen hidden" data-screen="howto">
        <div class="panel">
          <h2>操作说明</h2>
          <ul class="howto-list">
            <li><kbd>W A S D</kbd> / <kbd>方向键</kbd> — 移动黑洞</li>
            <li><kbd>鼠标拖拽</kbd> / 指针锁定 — 辅助转向</li>
            <li><kbd>P</kbd> / <kbd>Esc</kbd> — 暂停 / 退出指针锁定</li>
            <li>靠近质量更小的天体即可吸引，进入事件视界后吞噬</li>
            <li>质量越大，能吞噬的物体越大；达到目标质量通关</li>
            <li>小心更大的敌对黑洞——被吞掉即失败</li>
          </ul>
          <button class="btn" data-action="back">返回</button>
        </div>
      </div>

      <div class="screen hidden" data-screen="settings">
        <div class="panel">
          <h2>设置</h2>
          <label class="slider-label">主音量
            <input type="range" id="set-master" min="0" max="1" step="0.05" />
          </label>
          <label class="slider-label">音效音量
            <input type="range" id="set-sfx" min="0" max="1" step="0.05" />
          </label>
          <label class="slider-label">鼠标灵敏度
            <input type="range" id="set-sens" min="0.3" max="2.5" step="0.1" />
          </label>
          <label class="check-label">
            <input type="checkbox" id="set-plock" /> 启用指针锁定（点击画布）
          </label>
          <button class="btn" data-action="back">返回</button>
        </div>
      </div>

      <div class="screen hud-screen hidden" data-screen="hud">
        <div class="hud-top">
          <div class="hud-card">
            <span class="label">质量</span>
            <span id="hud-mass">0</span>
          </div>
          <div class="hud-card">
            <span class="label">分数</span>
            <span id="hud-score">0</span>
          </div>
          <div class="hud-card">
            <span class="label">关卡</span>
            <span id="hud-level">1</span>
          </div>
        </div>
        <div class="hud-bottom">
          <div class="progress-wrap">
            <div class="progress-label"><span id="hud-levelname">—</span> · 目标 <span id="hud-target">—</span></div>
            <div class="progress-bar"><div id="hud-progress" class="progress-fill"></div></div>
          </div>
          <button class="btn small" data-action="pause">暂停</button>
        </div>
        <div id="level-banner" class="level-banner hidden"></div>
      </div>

      <div class="screen hidden" data-screen="pause">
        <div class="panel">
          <h2>已暂停</h2>
          <div class="btn-col">
            <button class="btn primary" data-action="resume">继续</button>
            <button class="btn" data-action="settings-pause">设置</button>
            <button class="btn" data-action="title">返回标题</button>
          </div>
        </div>
      </div>

      <div class="screen hidden" data-screen="levelclear">
        <div class="panel">
          <h2>关卡通过！</h2>
          <p id="lc-text"></p>
          <p>当前分数：<span id="lc-score">0</span></p>
          <button class="btn primary" data-action="next">下一关</button>
        </div>
      </div>

      <div class="screen hidden" data-screen="end">
        <div class="panel">
          <h2 id="end-title">游戏结束</h2>
          <p id="end-msg"></p>
          <p>本局分数：<strong id="end-score">0</strong></p>
          <p>最高分：<strong id="end-hs">0</strong></p>
          <p>最终质量：<strong id="end-mass">0</strong></p>
          <div class="btn-col">
            <button class="btn primary" data-action="restart">再来一局</button>
            <button class="btn" data-action="title">返回标题</button>
          </div>
        </div>
      </div>
    `

    this.root.querySelectorAll('.screen').forEach((el) => {
      const id = (el as HTMLElement).dataset.screen!
      this.screens[id] = el as HTMLElement
    })

    this.root.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null
      if (!t) return
      const action = t.dataset.action!
      switch (action) {
        case 'start':
          this.cbs.onStart()
          break
        case 'howto':
          this.cbs.onHowTo()
          break
        case 'settings':
          this.cbs.onSettings()
          break
        case 'settings-pause':
          this.showScreen('settings')
          break
        case 'back':
          this.cbs.onBackTitle()
          break
        case 'pause':
          // Game listens to P/Esc; also allow button via custom event
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }))
          setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyP' })), 50)
          break
        case 'resume':
          this.cbs.onResume()
          break
        case 'restart':
          this.cbs.onRestart()
          break
        case 'title':
          this.cbs.onTitle()
          break
        case 'next':
          this.cbs.onNextLevel()
          break
      }
    })

    const bind = (id: string, key: keyof GameSettings, isCheck = false) => {
      const el = this.root.querySelector('#' + id) as HTMLInputElement
      el.addEventListener('input', () => {
        if (isCheck) (this.settings as unknown as Record<string, unknown>)[key] = el.checked
        else (this.settings as unknown as Record<string, unknown>)[key] = parseFloat(el.value)
        this.cbs.onSettingsChange({ ...this.settings })
      })
    }
    bind('set-master', 'masterVolume')
    bind('set-sfx', 'sfxVolume')
    bind('set-sens', 'sensitivity')
    bind('set-plock', 'pointerLock', true)

    this.bannerEl = this.root.querySelector('#level-banner')
  }

  showScreen(id: ScreenId): void {
    // Map end screens
    const map: Record<string, string> = {
      title: 'title',
      howto: 'howto',
      settings: 'settings',
      hud: 'hud',
      pause: 'pause',
      levelclear: 'levelclear',
      end: 'end',
      victory: 'end',
      defeat: 'end',
    }
    const sid = map[id] ?? id
    for (const [k, el] of Object.entries(this.screens)) {
      el.classList.toggle('hidden', k !== sid)
    }
  }

  setSettings(s: GameSettings): void {
    this.settings = { ...s }
    ;(this.root.querySelector('#set-master') as HTMLInputElement).value = String(s.masterVolume)
    ;(this.root.querySelector('#set-sfx') as HTMLInputElement).value = String(s.sfxVolume)
    ;(this.root.querySelector('#set-sens') as HTMLInputElement).value = String(s.sensitivity)
    ;(this.root.querySelector('#set-plock') as HTMLInputElement).checked = s.pointerLock
  }

  updateHighScore(score: number): void {
    const el = this.root.querySelector('#hs-value')
    if (el) el.textContent = Math.floor(score).toLocaleString('zh-CN')
  }

  updateHud(data: HudData): void {
    const set = (id: string, v: string) => {
      const el = this.root.querySelector(id)
      if (el) el.textContent = v
    }
    set('#hud-mass', data.mass)
    set('#hud-score', data.score)
    set('#hud-level', data.level)
    set('#hud-levelname', data.levelName)
    set('#hud-target', data.target)
    const bar = this.root.querySelector('#hud-progress') as HTMLElement | null
    if (bar) bar.style.width = `${(data.progress * 100).toFixed(1)}%`
  }

  showLevelBanner(name: string, id: number): void {
    if (!this.bannerEl) return
    this.bannerEl.textContent = `第 ${id} 关 · ${name}`
    this.bannerEl.classList.remove('hidden')
    this.bannerEl.classList.add('show')
    setTimeout(() => {
      this.bannerEl?.classList.remove('show')
      this.bannerEl?.classList.add('hidden')
    }, 2200)
  }

  showLevelClear(current: string, next: string, score: string): void {
    this.showScreen('levelclear')
    const t = this.root.querySelector('#lc-text')
    if (t) t.textContent = `「${current}」完成！下一关：${next}`
    const s = this.root.querySelector('#lc-score')
    if (s) s.textContent = score
  }

  showEnd(won: boolean, score: string, high: string, mass: string): void {
    this.showScreen('end')
    const title = this.root.querySelector('#end-title')
    const msg = this.root.querySelector('#end-msg')
    if (title) title.textContent = won ? '宇宙主宰！' : '被更大的黑洞吞噬…'
    if (msg) msg.textContent = won ? '你已成为超级黑洞，通关全部关卡。' : '质量不及对手，事件视界将你吞没。'
    const set = (id: string, v: string) => {
      const el = this.root.querySelector(id)
      if (el) el.textContent = v
    }
    set('#end-score', score)
    set('#end-hs', high)
    set('#end-mass', mass)
  }
}
