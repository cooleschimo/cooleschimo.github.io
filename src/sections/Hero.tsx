import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { Fox } from '../world/Fox'

/* Copy below is placeholder written by Claude; Chimin rewrites it. Keep the structure: eyebrow, statement with one italic accent word, two-line lede, one meta row. */
export function Hero() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const items = el.querySelectorAll('[data-rise]')
    const tl = gsap.from(items, { y: 14, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, clearProps: 'all' })
    return () => { tl.kill() }
  }, [])

  return (
    <section id="top" ref={root} className="hero" aria-labelledby="hero-statement">
      <div className="wrap hero__grid">
        <div>
          <p className="label hero__eyebrow" data-rise>Chimin Liu — engineer, photographer, sometime painter</p>
          <h1 id="hero-statement" className="display display-1 hero__statement" data-rise>
            Small tools, cold places, and the <em>photographs</em> in between.
          </h1>
          <p className="text-1 hero__lede measure" data-rise>
            I build machine-learning tools for medicine and markets, shoot on an old Ricoh, and paint the places I travel to.
            This site is where those three things live together.
          </p>
          <div className="hero__meta label" data-rise>
            <span>Ricoh GR IIIx · Canon</span>
            <a href="https://github.com/cooleschimo" target="_blank" rel="noreferrer">github / cooleschimo</a>
          </div>
        </div>
        <Fox className="hero__fox" />
      </div>
    </section>
  )
}
