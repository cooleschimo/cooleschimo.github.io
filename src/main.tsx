import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/paper.css'
import { App } from './App'

// Register Chimin's own handwriting only when the file exists (see vite.config.ts); the
// CSS stack already lists 'chimin-hand' first, so nothing else changes when it arrives.
if (__HAS_HAND_FONT__ && 'FontFace' in window) {
  const face = new FontFace('chimin-hand', "url('/fonts/chimin-hand.woff2') format('woff2')", { display: 'swap' })
  face.load().then((f) => document.fonts.add(f)).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
