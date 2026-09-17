import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion-prefs'

/** Very sparse, slow snow over the desk. Small, faint, never in the way. Off under reduced motion. */
export function Snow() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c || prefersReducedMotion()) return
    const ctx = c.getContext('2d')!
    let w = 0, h = 0, raf = 0, hidden = document.hidden
    type F = { x: number; y: number; r: number; v: number; p: number; o: number }
    let flakes: F[] = []
    const seed = () => { w = c.width = innerWidth; h = c.height = innerHeight; flakes = Array.from({ length: Math.round(w / 34) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 1.6, v: 10 + Math.random() * 14, p: Math.random() * 6.28, o: 0.25 + Math.random() * 0.35 })) }
    seed()
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05); last = t
      if (!hidden) {
        ctx.clearRect(0, 0, w, h)
        const night = document.documentElement.dataset.mode === 'night'
        ctx.fillStyle = night ? '#e8e2d6' : '#8b857c'
        for (const f of flakes) {
          f.p += dt * 0.7; f.x += Math.sin(f.p) * 8 * dt; f.y += f.v * dt
          if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w }
          ctx.globalAlpha = f.o * (night ? 0.9 : 0.5); ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onVis = () => { hidden = document.hidden; last = performance.now() }
    addEventListener('resize', seed); document.addEventListener('visibilitychange', onVis)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', seed); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return <canvas ref={ref} className="snow" aria-hidden="true" />
}
