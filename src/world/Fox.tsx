import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { useInlineSvg } from '../lib/inline-svg'
import { prefersReducedMotion } from '../lib/motion-prefs'

/** One thin line drawing of the fox, drawn in stroke by stroke on load. Replaced by Chimin's art via the same file path. */
export function Fox({ className = '' }: { className?: string }) {
  const svg = useInlineSvg('/art/_placeholder/fox.svg')
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el || !svg) return
    const paths = el.querySelectorAll('path')
    if (!paths.length || prefersReducedMotion()) return
    const tl = gsap.timeline({ delay: 0.25 })
    tl.from(paths, { drawSVG: '0%', duration: 0.5, ease: 'power1.inOut', stagger: 0.08 })
    return () => { tl.kill() }
  }, [svg])

  return (
    <div ref={host} className={`fox ${className}`} role="img" aria-label="A line drawing of a sitting arctic fox"
      dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
  )
}
