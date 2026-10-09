import { isBgmEnabled } from './bgm'
import { playTapSfx } from './sfx'

/* Two tiny touches on every tap, wired once from main.tsx:
 *  - a few ★ sparkles scatter from the spot the finger touched (0.45s, pure CSS, in a
 *    layer outside FitToViewport so they're never scaled or clipped);
 *  - ordinary buttons go "ぽん" (only while 🎵 is on — the same switch silences both).
 *    Answer choices and anything that already plays its own sound are skipped. */

const SPARKLE_COLORS = ['#ff7eb6', '#ffd166', '#7bdff2', '#b388ff']
const SILENT_SELECTOR = '.choice-button, [data-no-tap-sound], canvas'

let layer: HTMLDivElement | null = null

function sparkle(x: number, y: number): void {
  if (!layer) {
    layer = document.createElement('div')
    layer.className = 'tap-sparkle-layer'
    layer.setAttribute('aria-hidden', 'true')
    document.body.appendChild(layer)
  }
  for (let i = 0; i < 4; i++) {
    const el = document.createElement('span')
    el.className = 'tap-sparkle'
    el.textContent = '★'
    const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.8
    const dist = 18 + Math.random() * 14
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.color = SPARKLE_COLORS[i % SPARKLE_COLORS.length]
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
    el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`)
    el.addEventListener('animationend', () => el.remove(), { once: true })
    layer.appendChild(el)
  }
}

export function initTapEffects(): void {
  if (typeof window === 'undefined') return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  window.addEventListener(
    'pointerdown',
    (e) => {
      // Not while drawing on a trace/handwriting canvas — sparkles would cover the stroke.
      const target = e.target as Element | null
      if (target?.closest('canvas')) return
      if (!reduceMotion?.matches) sparkle(e.clientX, e.clientY)
    },
    { capture: true, passive: true },
  )
  window.addEventListener(
    'click',
    (e) => {
      const button = (e.target as Element | null)?.closest('button')
      if (!button || button.disabled || button.closest(SILENT_SELECTOR)) return
      if (isBgmEnabled()) playTapSfx()
    },
    { capture: true },
  )
}
