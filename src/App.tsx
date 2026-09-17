import { useEffect } from 'react'
import { Room } from './room/Room'
import { ModeToggle } from './shell/ModeToggle'
import { getMode, setMode } from './lib/mode'

export function App() {
  useEffect(() => {
    const on = () => setMode(getMode() === 'day' ? 'night' : 'day')
    document.addEventListener('toggle-mode', on); return () => document.removeEventListener('toggle-mode', on)
  }, [])
  return (
    <>
      <div className="corner corner--tr"><ModeToggle /></div>
      <main><Room /></main>
    </>
  )
}
