import { useSyncExternalStore } from 'react'

/** Three times of day. Day: natural pastel light. Evening: sunset through the window. Night: aurora and lamps. */
export type Mode = 'day' | 'evening' | 'night'
export const MODES: Mode[] = ['day', 'evening', 'night']

export const PAPER: Record<Mode, string> = { day: '#f6f1e7', evening: '#f2e4d8', night: '#172233' }

export function getMode(): Mode {
  const m = document.documentElement.dataset.mode
  return m === 'night' || m === 'evening' ? m : 'day'
}

/** The time of day where the visitor is, when they have not chosen one. */
export function modeByClock(d = new Date()): Mode {
  const h = d.getHours()
  return h >= 7 && h < 16 ? 'day' : h >= 16 && h < 20 ? 'evening' : 'night'
}

export function setMode(mode: Mode) {
  document.documentElement.dataset.mode = mode
  try { localStorage.setItem('mode', mode) } catch { /* private mode */ }
  window.dispatchEvent(new Event('modechange'))
}

export function nextMode(m: Mode = getMode()): Mode { return MODES[(MODES.indexOf(m) + 1) % MODES.length] }

function subscribe(cb: () => void) {
  window.addEventListener('modechange', cb)
  return () => window.removeEventListener('modechange', cb)
}

export function useMode(): Mode {
  return useSyncExternalStore(subscribe, getMode, () => 'day')
}
