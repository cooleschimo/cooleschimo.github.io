import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'

type Props = { children: ReactNode; strength?: number; fps?: number; className?: string; style?: CSSProperties }

/**
 * The "wobble" verb: a boiling feTurbulence/feDisplacementMap filter whose seed is
 * re-rolled at ~8fps while the element is on screen. Frozen under reduced motion.
 * Use on linework and handwriting only, never on paragraphs.
 */
export function SketchWobble({ children, strength = 3, fps = 8, className = '', style }: Props) {
  const id = useId().replace(/:/g, '')
  const ref = useRef<HTMLDivElement>(null)
  const turb = useRef<SVGFETurbulenceElement>(null)
  const disp = useRef<SVGFEDisplacementMapElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    let visible = false
    let acc = 0
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(el)
    const tick = (_t: number, dt: number) => {
      if (!visible || document.hidden) return
      acc += dt
      if (acc < 1000 / fps) return
      acc = 0
      turb.current?.setAttribute('seed', String(Math.floor(Math.random() * 1000)))
      disp.current?.setAttribute('scale', (strength * (0.8 + Math.random() * 0.4)).toFixed(2))
    }
    gsap.ticker.add(tick)
    return () => { gsap.ticker.remove(tick); io.disconnect() }
  }, [fps, strength])

  return (
    <div ref={ref} className={className} style={{ ...style, filter: `url(#wobble-${id})` }}>
      <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }} focusable="false">
        <filter id={`wobble-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.02" numOctaves="1" seed="1" result="n" />
          <feDisplacementMap ref={disp} in="SourceGraphic" in2="n" scale={strength} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {children}
    </div>
  )
}
