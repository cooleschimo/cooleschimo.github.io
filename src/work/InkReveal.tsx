import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from '../lib/motion-prefs'

type Props = {
  src: string; alt: string; revealed?: boolean; hoverable?: boolean
  /** The interactive layer (hit button) rendered on top, INSIDE this element, so pointer events bubble to the reveal. */
  overlay?: ReactNode
}

/**
 * Ink to colour: the image rests desaturated; on hover, colour floods out from the pointer
 * under a crisp circular mask and recedes to where the pointer left. Focus and tap reveal
 * everything. Reduced motion: a crossfade.
 */
export function InkReveal({ src, alt, revealed = false, hoverable = true, overlay }: Props) {
  const id = useId().replace(/:/g, '')
  const reduced = useReducedMotion()
  const host = useRef<HTMLDivElement>(null)
  const circle = useRef<SVGCircleElement>(null)
  const [size, setSize] = useState({ w: 800, h: 500 })
  const s = useRef({ x: 0, y: 0, tx: 0, ty: 0, r: 0, active: false })

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 500 }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reduced) return
    const tick = () => {
      const st = s.current
      const c = circle.current
      if (!c) return
      st.x += (st.tx - st.x) * 0.22
      st.y += (st.ty - st.y) * 0.22
      c.setAttribute('cx', st.x.toFixed(1)); c.setAttribute('cy', st.y.toFixed(1)); c.setAttribute('r', st.r.toFixed(1))
    }
    gsap.ticker.add(tick)
    return () => { gsap.ticker.remove(tick) }
  }, [reduced])

  const full = () => Math.hypot(size.w, size.h)
  const to = (r: number, duration: number, ease: string) => { gsap.killTweensOf(s.current); gsap.to(s.current, { r, duration, ease }) }

  useEffect(() => {
    if (reduced) return
    const st = s.current
    if (revealed) {
      if (!st.active) { st.x = st.tx = size.w / 2; st.y = st.ty = size.h / 2 }
      to(full(), 0.7, 'power3.out')
    } else if (!st.active) {
      to(0, 0.5, 'power2.in')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, reduced, size.w, size.h])

  const local = (e: React.PointerEvent) => { const r = host.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const onEnter = (e: React.PointerEvent) => {
    if (!hoverable || reduced || e.pointerType !== 'mouse') return
    const st = s.current; const p = local(e)
    st.x = st.tx = p.x; st.y = st.ty = p.y; st.active = true
    to(full(), 0.9, 'power3.out')
  }
  const onMove = (e: React.PointerEvent) => {
    if (!hoverable || reduced || e.pointerType !== 'mouse') return
    const p = local(e); s.current.tx = p.x; s.current.ty = p.y
  }
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const st = s.current; st.active = false
    if (!revealed) to(0, 0.55, 'power2.in')
  }

  return (
    <div ref={host} className="ink-reveal" onPointerEnter={onEnter} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="ink-reveal__rest" aria-hidden="true"><img src={src} alt="" loading="lazy" /></div>
      <svg className="ink-reveal__paint" viewBox={`0 0 ${size.w} ${size.h}`} width={size.w} height={size.h} aria-hidden="true" focusable="false"
        style={reduced ? { opacity: revealed ? 1 : 0, transition: 'opacity 350ms ease' } : undefined}>
        <defs>
          <mask id={`m-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
            <circle ref={circle} cx="0" cy="0" r={reduced ? full() : 0} fill="#fff" />
          </mask>
        </defs>
        <image href={src} width={size.w} height={size.h} preserveAspectRatio="xMidYMid slice" mask={`url(#m-${id})`} />
        <title>{alt}</title>
      </svg>
      {overlay}
    </div>
  )
}
