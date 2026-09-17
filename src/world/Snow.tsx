import { useEffect, useRef } from 'react'
import { seededRandom } from '../lib/seed'
import { prefersReducedMotion } from '../lib/motion-prefs'

type Flake = { x: number; y: number; r: number; vy: number; vx: number; w: number; p: number }

/**
 * 2D-canvas snow. Slow drift with a little parallax by size. Capped on mobile,
 * paused when off-screen or the tab is hidden, static under reduced motion.
 */
export function Snow({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = prefersReducedMotion()
    const mobile = window.innerWidth < 720
    const count = mobile ? 90 : 220
    const rand = seededRandom(11)
    let w = 0, h = 0, dpr = 1
    let flakes: Flake[] = []
    let raf = 0
    let visible = true
    let hidden = document.hidden

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      flakes = Array.from({ length: count }, () => {
        const r = 0.8 + rand() * 2.4
        return { x: rand() * w, y: rand() * h, r, vy: 8 + r * 9, vx: 0, w: rand() * Math.PI * 2, p: 0.4 + rand() * 0.5 }
      })
      if (reduced) drawFrame(0)
    }

    const drawFrame = (dt: number) => {
      ctx.clearRect(0, 0, w, h)
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#2f3b4a'
      ctx.fillStyle = ink
      for (const f of flakes) {
        f.w += dt * 0.9
        f.x += (Math.sin(f.w) * 6 + 3) * dt
        f.y += f.vy * dt
        if (f.y > h + 4) { f.y = -4; f.x = rand() * w }
        if (f.x > w + 4) f.x = -4
        ctx.globalAlpha = 0.25 * f.p
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      if (visible && !hidden) drawFrame(dt)
      raf = requestAnimationFrame(loop)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    const onVis = () => { hidden = document.hidden; last = performance.now() }
    document.addEventListener('visibilitychange', onVis)
    if (!reduced) raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none block h-full w-full ${className}`} />
}
