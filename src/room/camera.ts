import { gsap } from '../lib/gsap'

/**
 * The 2.5D camera. Layers carry data-depth in 0..1 (0 = back wall, 1 = nearest).
 * Pointer parallax and dolly zoom are both applied per layer, scaled by depth, so near
 * things slide and grow more than far things. Everything is driven from one ticker.
 */
export type Cam = { x: number; y: number; zoom: number; px: number; py: number }

export function createCamera(world: HTMLElement, reduced: boolean) {
  const layers = Array.from(world.querySelectorAll<HTMLElement>('[data-depth]'))
  const cam: Cam = { x: 0, y: 0, zoom: 1, px: 0, py: 0 }
  const target = { px: 0, py: 0 }
  const PARALLAX = reduced ? 0 : 56 // px at depth 1

  const apply = () => {
    for (const l of layers) {
      const d = parseFloat(l.dataset.depth || '0')
      const par = 0.12 + d * 0.88
      const z = 1 + (cam.zoom - 1) * (0.55 + d * 0.45)
      const tx = -cam.px * PARALLAX * par - cam.x * z * (0.7 + d * 0.3)
      const ty = -cam.py * PARALLAX * 0.6 * par - cam.y * z * (0.7 + d * 0.3)
      l.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${z.toFixed(4)})`
    }
  }
  const tick = () => {
    cam.px += (target.px - cam.px) * 0.07
    cam.py += (target.py - cam.py) * 0.07
    apply()
  }
  const onMove = (e: PointerEvent) => { target.px = (e.clientX / innerWidth - 0.5) * 2; target.py = (e.clientY / innerHeight - 0.5) * 2 }
  addEventListener('pointermove', onMove, { passive: true })
  gsap.ticker.add(tick)

  return {
    cam,
    /** Move toward a world point (relative to centre) and zoom. */
    dolly(x: number, y: number, zoom: number, duration = 0.9) {
      return gsap.to(cam, { x: x * (zoom - 1), y: y * (zoom - 1), zoom, duration: reduced ? 0 : duration, ease: 'power3.inOut', overwrite: 'auto' })
    },
    reset(duration = 0.8) { return gsap.to(cam, { x: 0, y: 0, zoom: 1, duration: reduced ? 0 : duration, ease: 'power3.inOut', overwrite: 'auto' }) },
    destroy() { removeEventListener('pointermove', onMove); gsap.ticker.remove(tick) },
  }
}
