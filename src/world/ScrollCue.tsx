import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { scrollToSection } from '../lib/lenis'

/** A doodled arrow that wobbles at ~6fps and nudges downwards. Click scrolls to the work section. */
export function ScrollCue({ target = '#work' }: { target?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const paths = el.querySelectorAll<SVGPathElement>('path')
    const wobble = gsap.timeline({ repeat: -1, repeatDelay: 0.9 })
    paths.forEach((p, i) => {
      const alt = p.dataset.alt
      if (!alt) return
      const orig = p.getAttribute('d')!
      wobble.set(p, { attr: { d: alt } }, i * 0.02).set(p, { attr: { d: orig } }, 0.16 + i * 0.02)
    })
    const nudge = gsap.to(el, { y: 6, duration: 0.9, ease: 'back.inOut(2)', yoyo: true, repeat: -1 })
    return () => { wobble.kill(); nudge.kill() }
  }, [])
  return (
    <button type="button" onClick={() => scrollToSection(target)} aria-label="scroll down to the work"
      className="hand hand-4 inline-flex flex-col items-center gap-1 text-ink-soft">
      <span>scroll</span>
      <svg ref={ref} width="34" height="46" viewBox="0 0 34 46" fill="none" aria-hidden="true">
        <path d="M17 3 C16 12, 18 22, 16.5 34" data-alt="M17.5 3 C16 13, 17.5 21, 17 34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 27 C10 31, 13 36, 16.5 40 C20 36, 24 31, 27 26" data-alt="M7.5 27.5 C11 31, 14 35, 16.5 39.5 C20 35, 23 31.5, 27 26.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
