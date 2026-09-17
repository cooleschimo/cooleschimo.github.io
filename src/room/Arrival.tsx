import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { Art } from './useArt'

/**
 * The arrival: above the igloo in the snow with the name, the camera tilts down to the door and
 * pushes through it; then the room assembles behind. Plays once per session; click to skip.
 */
export function Arrival({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const scene = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'above' | 'descending'>('above')
  const done = useRef(false)

  const finish = () => { if (done.current) return; done.current = true; onDone() }

  useEffect(() => {
    if (prefersReducedMotion()) { const t = setTimeout(finish, 600); return () => clearTimeout(t) }
    const tl = gsap.timeline({ delay: 0.6, onComplete: finish })
    tl.call(() => setPhase('descending'))
      // tilt the exterior from a top-down view toward the front, and drift down to the door
      .to(scene.current, { rotateX: 0, y: -260, scale: 1.25, duration: 1.7, ease: 'power2.inOut' })
      .to('.arrival__name', { opacity: 0, y: -40, duration: 0.6, ease: 'power2.in' }, '<0.2')
      // push through the door
      .to(scene.current, { scale: 5.5, y: -1500, duration: 1.4, ease: 'power3.in' }, '-=0.15')
      .to('.arrival__dark', { opacity: 1, duration: 0.5 }, '-=0.5')
      .to(root.current, { opacity: 0, duration: 0.5 })
    return () => { tl.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={root} className={`arrival arrival--${phase}`} onClick={finish} role="presentation">
      <div className="arrival__stage">
        <div ref={scene} className="arrival__scene">
          <Art src="/art/room/exterior.webp" className="arrival__img" placeholder={<div className="arrival__block"><i className="arrival__dome" /><i className="arrival__door" /></div>} />
        </div>
      </div>
      <h1 className="arrival__name display">Chimin</h1>
      <p className="arrival__hint label">click to skip</p>
      <div className="arrival__dark" aria-hidden="true" />
    </div>
  )
}
