import { useEffect } from 'react'
import { Room } from './room/Room'
import { ModeToggle } from './shell/ModeToggle'
import { getMode, modeByClock, nextMode, setMode } from './lib/mode'

export function App() {
  useEffect(() => {
    // First visit: the time of day where the visitor is. After that, whatever they chose.
    let saved: string | null = null
    try { saved = localStorage.getItem('mode') } catch { /* private mode */ }
    if (saved === 'day' || saved === 'evening' || saved === 'night') setMode(saved); else setMode(modeByClock())
    const on = () => setMode(nextMode(getMode()))
    document.addEventListener('toggle-mode', on); return () => document.removeEventListener('toggle-mode', on)
  }, [])
  return (
    <>
      <div className="corner corner--tr"><ModeToggle /></div>
      <main><Room /></main>
    </>
  )
}
