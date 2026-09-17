import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { useInlineSvg } from '../lib/inline-svg'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { SketchWobble } from '../primitives/SketchWobble'
import { Fox } from '../world/Fox'
import { ScrollCue } from '../world/ScrollCue'

const NAME_SVG = '/art/_placeholder/name-signature.svg'

export function Hero() {
  const nameSvg = useInlineSvg(NAME_SVG)
  const nameRef = useRef<HTMLDivElement>(null)
  const blotRef = useRef<HTMLDivElement>(null)

  // The name draws itself stroke by stroke, then colour bleeds in behind it.
  useEffect(() => {
    const host = nameRef.current
    if (!host || !nameSvg) return
    const paths = host.querySelectorAll('path')
    if (!paths.length) return
    if (prefersReducedMotion()) {
      gsap.set(blotRef.current, { opacity: 1 })
      return
    }
    const tl = gsap.timeline()
    tl.from(paths, { drawSVG: '0%', duration: 0.42, ease: 'power1.inOut', stagger: 0.09 })
      .fromTo(blotRef.current, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.6)' }, '-=0.1')
    return () => { tl.kill() }
  }, [nameSvg])

  return (
    <section id="top" className="hero" aria-labelledby="hero-name">
      <div className="hero__inner">
        <h1 id="hero-name" className="hero__name">
          <span className="sr-only">chimin</span>
          <div ref={blotRef} className="hero__blot" aria-hidden="true" />
          <SketchWobble strength={2.5}>
            <div ref={nameRef} className="hero__signature" aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: nameSvg ?? '' }} />
          </SketchWobble>
        </h1>
        <p className="hand hand-3 hero__intro">
          i make small tools, take photos with an old ricoh, and paint the places i wander to.
        </p>
        <p className="serif-2 hero__note">this is my sketchbook. it lives in the arctic for no good reason.</p>
      </div>
      <Fox className="hero__fox" />
      <div className="hero__cue"><ScrollCue target="#work" /></div>
      {/* the snow ground: paper from the horizon down, so the page covers the fixed sky as you scroll */}
      <div className="hero__ground" aria-hidden="true">
        <svg className="hero__horizon" viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">
          <path d="M0 70 C 180 30, 300 110, 520 72 S 900 20, 1120 66 S 1360 100, 1440 60 L1440 121 L0 121 Z" fill="var(--paper)" filter="url(#wc-wash)" />
          <path d="M0 70 C 180 30, 300 110, 520 72 S 900 20, 1120 66 S 1360 100, 1440 60" fill="none" stroke="var(--ink)" strokeWidth="1.4" opacity="0.7" />
        </svg>
        <svg className="hero__drift" viewBox="0 0 1440 60" preserveAspectRatio="none" focusable="false">
          <path d="M0 40 C 260 10, 520 55, 760 30 S 1200 10, 1440 38" fill="none" stroke="var(--ink-soft)" strokeWidth="1.1" opacity="0.8" />
        </svg>
      </div>
    </section>
  )
}
