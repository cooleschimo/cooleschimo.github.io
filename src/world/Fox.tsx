import { useEffect, useRef, useState } from 'react'
import { useInlineSvg } from '../lib/inline-svg'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { SketchWobble } from '../primitives/SketchWobble'

const ART = { idle: '/art/_placeholder/fox-idle.svg', peek: '/art/_placeholder/fox-peek.svg' }

/**
 * The arctic fox. Two-pose sprite swap: peeks when the pointer comes near, and turns its
 * head a little toward it. Only its ink is hoverable (SVG paints, not the box).
 * Hover bleeds a little colour into it. M6 replaces this with Rive.
 */
export function Fox({ className = '' }: { className?: string }) {
  const idle = useInlineSvg(ART.idle)
  const peek = useInlineSvg(ART.peek)
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [tilt, setTilt] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dx = e.clientX - cx, dy = e.clientY - cy
        const d = Math.hypot(dx, dy)
        setNear(d < 320)
        setTilt(Math.max(-7, Math.min(7, dx / 40)))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])

  const markup = (near ? peek : idle) ?? idle
  return (
    <div ref={ref} className={`fox ${near ? 'fox--peek' : ''} ${className}`} role="img"
      aria-label="an arctic fox peeking over a snowdrift, watching you">
      <SketchWobble strength={2} fps={6} className="fox__wobble">
        <div className="fox__art" style={{ transform: `rotate(${tilt}deg)` }}
          dangerouslySetInnerHTML={{ __html: markup ?? '' }} />
      </SketchWobble>
      <div className="fox__blush" aria-hidden="true" />
    </div>
  )
}
