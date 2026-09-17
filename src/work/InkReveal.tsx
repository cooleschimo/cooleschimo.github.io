import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from '../lib/motion-prefs'

type Props = {
  src: string
  alt: string
  /** Full reveal regardless of pointer (keyboard focus, tap-to-reveal). */
  revealed?: boolean
  /** Whether pointer hover should paint. Off on coarse pointers. */
  hoverable?: boolean
  /** The ink layer that stays on top. */
  children?: ReactNode
  /** Interactive layer above the ink (the hit target), so pointer events bubble through this component. */
  overlay?: ReactNode
  className?: string
}

const BLOTS = 6

/**
 * The site's signature: linework over an ice wash; hover paints the image in under a
 * mask of wobbly watercolour blots that follow the pointer and recede when it leaves.
 * Reduced motion: a plain crossfade.
 */
export function InkReveal({ src, alt, revealed = false, hoverable = true, children, overlay, className = '' }: Props) {
  const id = useId().replace(/:/g, '')
  const reduced = useReducedMotion()
  const host = useRef<HTMLDivElement>(null)
  const circles = useRef<(SVGCircleElement | null)[]>([])
  const [size, setSize] = useState({ w: 400, h: 300 })
  const state = useRef({ tx: 0, ty: 0, pts: Array.from({ length: BLOTS }, () => ({ x: 0, y: 0 })), r: 0, active: false, full: false })

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth || 400, h: el.clientHeight || 300 }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Blots chase the pointer with a little lag each; radius tweens in and out.
  useEffect(() => {
    if (reduced) return
    const s = state.current
    const tick = () => {
      if (!s.active && s.r < 0.5) return
      const p = s.pts
      p[0].x += (s.tx - p[0].x) * 0.28
      p[0].y += (s.ty - p[0].y) * 0.28
      for (let i = 1; i < BLOTS; i++) {
        p[i].x += (p[i - 1].x - p[i].x) * 0.32
        p[i].y += (p[i - 1].y - p[i].y) * 0.32
      }
      circles.current.forEach((c, i) => {
        if (!c) return
        const k = 1 - i / (BLOTS + 1)
        c.setAttribute('cx', p[i].x.toFixed(1))
        c.setAttribute('cy', p[i].y.toFixed(1))
        c.setAttribute('r', (s.r * (s.full ? 1 : k)).toFixed(1))
      })
    }
    gsap.ticker.add(tick)
    return () => { gsap.ticker.remove(tick) }
  }, [reduced])

  const baseRadius = () => Math.max(size.w, size.h) * 0.3
  const fullRadius = () => Math.hypot(size.w, size.h) * 0.75

  const paintTo = (r: number, ease: string, duration: number) => {
    gsap.killTweensOf(state.current)
    gsap.to(state.current, { r, duration, ease })
  }

  // Controlled full reveal (focus / tap).
  useEffect(() => {
    const s = state.current
    if (reduced) return
    if (revealed) {
      s.full = true; s.active = true
      s.tx = size.w / 2; s.ty = size.h / 2
      if (!s.r) s.pts.forEach((p) => { p.x = s.tx; p.y = s.ty })
      paintTo(fullRadius(), 'power2.out', 0.9)
    } else {
      s.full = false
      if (!s.active) paintTo(0, 'power2.in', 0.7)
      else paintTo(baseRadius(), 'power2.out', 0.4)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, reduced, size.w, size.h])

  const local = (e: React.PointerEvent) => {
    const r = host.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onEnter = (e: React.PointerEvent) => {
    if (!hoverable || reduced || e.pointerType !== 'mouse') return
    const s = state.current
    const { x, y } = local(e)
    s.tx = x; s.ty = y
    if (s.r < 0.5) s.pts.forEach((p) => { p.x = x; p.y = y })
    s.active = true
    if (!s.full) paintTo(baseRadius(), 'back.out(1.4)', 0.55)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!hoverable || reduced || e.pointerType !== 'mouse') return
    const { x, y } = local(e)
    state.current.tx = x; state.current.ty = y
  }
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const s = state.current
    s.active = false
    if (!s.full) paintTo(0, 'power2.in', 1.2)
  }

  const showFlat = reduced && revealed
  return (
    <div ref={host} className={`ink-reveal ${className}`} onPointerEnter={onEnter} onPointerMove={onMove} onPointerLeave={onLeave}>
      <svg className="ink-reveal__paint" viewBox={`0 0 ${size.w} ${size.h}`} width={size.w} height={size.h} aria-hidden="true" focusable="false">
        <defs>
          <mask id={`ink-mask-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
            <g fill="#fff" filter="url(#wc-edge)">
              {Array.from({ length: BLOTS }, (_, i) => (
                <circle key={i} ref={(el) => { circles.current[i] = el }} cx="0" cy="0" r="0" />
              ))}
            </g>
          </mask>
        </defs>
        <image href={src} width={size.w} height={size.h} preserveAspectRatio="xMidYMid slice"
          mask={reduced ? undefined : `url(#ink-mask-${id})`}
          style={reduced ? { opacity: showFlat ? 1 : 0, transition: 'opacity 400ms ease' } : undefined} />
        <title>{alt}</title>
      </svg>
      <div className="ink-reveal__ink">{children}</div>
      {overlay}
    </div>
  )
}
