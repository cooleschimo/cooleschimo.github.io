import { gsap } from '../lib/gsap'

/**
 * The 2.5D camera. Layers carry data-depth in 0..1 (0 = back wall, 1 = nearest).
 * The camera is a point of interest (poi, world units relative to the room centre) and a zoom.
 * Each layer scales by its own zoom (near layers more) about the poi, plus pointer parallax.
 * The visitor drives it: wheel / pinch to zoom at a point, drag to pan, double-click to jump in.
 * Opening something dollies to it and afterwards returns to the visitor's own view.
 */
export type Cam = { x: number; y: number; zoom: number }
export const ZOOM_MIN = 1, ZOOM_MAX = 2.6

export function createCamera(world: HTMLElement, viewport: HTMLElement, reduced: boolean, onChange?: (c: Cam) => void) {
  const layers = Array.from(world.querySelectorAll<HTMLElement>('[data-depth]'))
  const cam: Cam = { x: 0, y: 0, zoom: 1 }
  const shown: Cam = { x: 0, y: 0, zoom: 1 } // eased toward cam
  const par = { x: 0, y: 0, tx: 0, ty: 0 }
  const PARALLAX = reduced ? 0 : 56
  let saved: Cam | null = null
  let worldScale = 1

  const zoomAt = (d: number, z: number) => 1 + (z - 1) * (0.55 + d * 0.45)
  const clamp = (c: Cam) => {
    c.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.zoom))
    const lim = { x: 720 * (1 - 1 / c.zoom), y: 450 * (1 - 1 / c.zoom) }
    c.x = Math.max(-lim.x, Math.min(lim.x, c.x)); c.y = Math.max(-lim.y, Math.min(lim.y, c.y))
    return c
  }
  const apply = () => {
    for (const l of layers) {
      const d = parseFloat(l.dataset.depth || '0')
      const z = zoomAt(d, shown.zoom)
      const p = (0.12 + d * 0.88) / shown.zoom
      const tx = -shown.x * (z - 1) - par.x * PARALLAX * p
      const ty = -shown.y * (z - 1) - par.y * PARALLAX * 0.6 * p
      l.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${z.toFixed(4)})`
    }
  }
  const tick = () => {
    par.x += (par.tx - par.x) * 0.07; par.y += (par.ty - par.y) * 0.07
    shown.x += (cam.x - shown.x) * 0.16; shown.y += (cam.y - shown.y) * 0.16; shown.zoom += (cam.zoom - shown.zoom) * 0.16
    apply()
  }
  const onMove = (e: PointerEvent) => { if (!dragging) { par.tx = (e.clientX / innerWidth - 0.5) * 2; par.ty = (e.clientY / innerHeight - 0.5) * 2 } }

  /** Screen point → world point relative to the room centre, on the nearest layer's scale. */
  const toWorld = (sx: number, sy: number) => {
    const r = world.getBoundingClientRect(); worldScale = r.width / 1440
    return { x: (sx - (r.left + r.width / 2)) / worldScale, y: (sy - (r.top + r.height / 2)) / worldScale }
  }
  /** Zoom by a factor keeping the world point under the screen point fixed (on the objects layer). */
  const zoomAtScreen = (sx: number, sy: number, factor: number) => {
    const p = toWorld(sx, sy)
    const z0 = zoomAt(0.7, cam.zoom), z1 = zoomAt(0.7, Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * factor)))
    if (z1 === z0) return
    // screen position of p now: s = p*z0 - poi*(z0-1); keep s fixed for z1
    const s = { x: p.x * z0 - cam.x * (z0 - 1), y: p.y * z0 - cam.y * (z0 - 1) }
    const poi = { x: (p.x * z1 - s.x) / (z1 - 1 || 1e-6), y: (p.y * z1 - s.y) / (z1 - 1 || 1e-6) }
    cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * factor))
    if (cam.zoom > 1.0001) { cam.x = poi.x; cam.y = poi.y } else { cam.x = 0; cam.y = 0 }
    clamp(cam); onChange?.(cam)
  }

  // wheel = zoom
  const onWheel = (e: WheelEvent) => { e.preventDefault(); const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)); zoomAtScreen(e.clientX, e.clientY, f) }
  // drag = pan (only when zoomed, only on the room itself, not on buttons)
  let dragging = false, last = { x: 0, y: 0 }
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchDist = 0
  const onDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); return }
    if ((e.target as HTMLElement).closest('button, a, [role="dialog"]')) return
    if (cam.zoom <= 1.0001 && e.pointerType !== 'touch') return
    dragging = true; last = { x: e.clientX, y: e.clientY }; viewport.classList.add('is-panning'); viewport.setPointerCapture?.(e.pointerId)
  }
  const onDrag = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDist > 0) zoomAtScreen((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinchDist)
      pinchDist = d; return
    }
    if (!dragging) return
    const z = zoomAt(0.7, cam.zoom)
    cam.x -= (e.clientX - last.x) / worldScale / (z - 1 || 1); cam.y -= (e.clientY - last.y) / worldScale / (z - 1 || 1)
    last = { x: e.clientX, y: e.clientY }; clamp(cam); onChange?.(cam)
  }
  const onUp = (e: PointerEvent) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchDist = 0; if (dragging) { dragging = false; viewport.classList.remove('is-panning') } }
  const onDbl = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('button, a, [role="dialog"]')) return; if (cam.zoom > 1.8) reset(); else zoomAtScreen(e.clientX, e.clientY, 2.0 / cam.zoom) }
  const onKey = (e: KeyboardEvent) => { if (e.target !== document.body) return; if (e.key === '+' || e.key === '=') zoomAtScreen(innerWidth / 2, innerHeight / 2, 1.25); if (e.key === '-') zoomAtScreen(innerWidth / 2, innerHeight / 2, 0.8); if (e.key === '0') reset() }

  const reset = () => gsap.to(cam, { x: 0, y: 0, zoom: 1, duration: reduced ? 0 : 0.7, ease: 'power3.inOut', overwrite: 'auto', onUpdate: () => onChange?.(cam) })

  viewport.addEventListener('wheel', onWheel, { passive: false })
  viewport.addEventListener('pointerdown', onDown)
  addEventListener('pointermove', onDrag, { passive: true })
  addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp)
  viewport.addEventListener('dblclick', onDbl)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('keydown', onKey)
  gsap.ticker.add(tick)

  return {
    cam,
    /** Dolly toward a world point (relative to centre) at a zoom; remembers the visitor's view. */
    dolly(x: number, y: number, zoom: number, duration = 0.9) {
      if (!saved) saved = { ...cam }
      const t = clamp({ x, y, zoom })
      return gsap.to(cam, { ...t, duration: reduced ? 0 : duration, ease: 'power3.inOut', overwrite: 'auto', onUpdate: () => onChange?.(cam) })
    },
    /** Return to the view the visitor had before the dolly. */
    back(duration = 0.8) {
      const t = saved ?? { x: 0, y: 0, zoom: 1 }; saved = null
      return gsap.to(cam, { ...t, duration: reduced ? 0 : duration, ease: 'power3.inOut', overwrite: 'auto', onUpdate: () => onChange?.(cam) })
    },
    reset,
    destroy() {
      viewport.removeEventListener('wheel', onWheel); viewport.removeEventListener('pointerdown', onDown); removeEventListener('pointermove', onDrag)
      removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); viewport.removeEventListener('dblclick', onDbl)
      removeEventListener('pointermove', onMove); removeEventListener('keydown', onKey); gsap.ticker.remove(tick)
    },
  }
}
