import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { isCoarsePointer, prefersReducedMotion } from '../lib/motion-prefs'
import { Art } from './useArt'
import { ART } from './art'

type Zone = { x: number; y: number; w: number; h: number }

/**
 * The fox sleeps by the fridge. When the cursor enters its zone the cursor becomes a fish and
 * the fox wakes and follows with a lag; it sits when the cursor leaves. Off on touch / reduced motion.
 */
export function Fox({ zone, home }: { zone: Zone; home: { x: number; y: number } }) {
  const el = useRef<HTMLDivElement>(null)
  const fish = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'asleep' | 'awake'>('asleep')
  const pos = useRef({ x: home.x, y: home.y, tx: home.x, ty: home.y, flip: 1 })

  useEffect(() => {
    if (isCoarsePointer() || prefersReducedMotion()) return
    const world = el.current?.closest<HTMLElement>('.room__world')
    if (!world) return
    let inside = false
    const toWorld = (e: PointerEvent) => { const r = world.getBoundingClientRect(); const s = r.width / 1440; return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s } }
    const onMove = (e: PointerEvent) => {
      const p = toWorld(e)
      const inZone = p.x > zone.x && p.x < zone.x + zone.w && p.y > zone.y && p.y < zone.y + zone.h
      if (inZone !== inside) { inside = inZone; setState(inZone ? 'awake' : 'asleep'); world.classList.toggle('room__world--fish', inZone) }
      if (inZone) {
        pos.current.tx = Math.max(zone.x + 40, Math.min(zone.x + zone.w - 40, p.x))
        pos.current.ty = Math.max(zone.y + 30, Math.min(zone.y + zone.h - 30, p.y))
        if (fish.current) fish.current.style.transform = `translate(${p.x}px, ${p.y}px)`
      } else { pos.current.tx = home.x; pos.current.ty = home.y }
    }
    const tick = () => {
      const s = pos.current; const f = el.current; if (!f) return
      const dx = s.tx - s.x
      s.x += dx * 0.05; s.y += (s.ty - s.y) * 0.05
      if (Math.abs(dx) > 2) s.flip = dx > 0 ? 1 : -1
      f.style.transform = `translate(${s.x}px, ${s.y}px) scaleX(${s.flip})`
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    gsap.ticker.add(tick)
    return () => { window.removeEventListener('pointermove', onMove); gsap.ticker.remove(tick); world.classList.remove('room__world--fish') }
  }, [zone.x, zone.y, zone.w, zone.h, home.x, home.y])

  return (
    <>
      <div ref={el} className={`fox fox--${state}`} style={{ transform: `translate(${home.x}px, ${home.y}px)` }} role="img" aria-label="An arctic fox, asleep by the fridge">
        <Art src={state === 'asleep' ? ART.foxAsleep : ART.foxSitting} placeholder={
          <div className="fox__block">
            <div className="fox__body" /><div className="fox__head"><i className="fox__ear fox__ear--l" /><i className="fox__ear fox__ear--r" /></div><div className="fox__tail" />
          </div>
        } />
      </div>
      <div ref={fish} className="fish" aria-hidden="true"><svg width="26" height="14" viewBox="0 0 26 14"><path d="M1 7c4-5 10-6 16-2l8-4v12l-8-4c-6 4-12 3-16-2z" fill="#2a2622" opacity=".85" /></svg></div>
    </>
  )
}
