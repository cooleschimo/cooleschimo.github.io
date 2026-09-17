import { useSyncExternalStore } from 'react'

export type Mode = 'day' | 'night'

export const PAPER: Record<Mode, string> = { day: '#f6f1e7', night: '#172233' }

export function getMode(): Mode {
  return document.documentElement.dataset.mode === 'night' ? 'night' : 'day'
}

export function setMode(mode: Mode) {
  document.documentElement.dataset.mode = mode
  try { localStorage.setItem('mode', mode) } catch { /* private mode */ }
  window.dispatchEvent(new Event('modechange'))
}

function subscribe(cb: () => void) {
  window.addEventListener('modechange', cb)
  return () => window.removeEventListener('modechange', cb)
}

export function useMode(): Mode {
  return useSyncExternalStore(subscribe, getMode, () => 'day')
}
