import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './motion-prefs'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

/** One Lenis instance at the app root, ticked by gsap so ScrollTrigger and Lenis share a clock. */
export function startLenis(): Lenis {
  if (lenis) return lenis
  const reduced = prefersReducedMotion()
  lenis = new Lenis({
    lerp: reduced ? 1 : 0.09,
    smoothWheel: !reduced,
    syncTouch: false,
    autoRaf: false,
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function getLenis(): Lenis | null {
  return lenis
}

export function scrollToSection(target: string | HTMLElement, offset = 0) {
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 })
  else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView()
}
