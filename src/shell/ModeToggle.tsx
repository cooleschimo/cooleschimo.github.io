import { useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { getMode, setMode, useMode, PAPER, type Mode } from '../lib/mode'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { RoughFocusRing } from '../primitives/RoughFocusRing'

/**
 * The sun is the day/night toggle. Click it: it arcs below the horizon on a motion path
 * while the moon rises on the mirrored path, and a watercolour wash of the new paper
 * colour sweeps out from the sun across the page.
 */
export function ModeToggle() {
  const mode = useMode()
  const [busy, setBusy] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const sun = useRef<SVGGElement>(null)
  const moon = useRef<SVGGElement>(null)
  const downPath = useRef<SVGPathElement>(null)
  const upPath = useRef<SVGPathElement>(null)

  const switchTo = (next: Mode) => {
    const root = document.documentElement
    const rect = btn.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth - 80
    const cy = rect ? rect.top + rect.height / 2 : 80
    const wash = document.createElement('div')
    wash.className = 'mode-wash'
    wash.style.background = PAPER[next]
    wash.style.clipPath = `circle(0px at ${cx}px ${cy}px)`
    document.body.appendChild(wash)
    const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) * 1.05
    root.classList.add('no-transition')
    gsap.timeline({
      onComplete: () => {
        wash.remove()
        requestAnimationFrame(() => root.classList.remove('no-transition'))
        setBusy(false)
      },
    })
      .to(wash, { clipPath: `circle(${radius}px at ${cx}px ${cy}px)`, duration: 0.9, ease: 'power2.inOut' })
      .call(() => setMode(next))
      .to(wash, { opacity: 0, duration: 0.25 })
  }

  const onClick = () => {
    if (busy) return
    const next: Mode = getMode() === 'day' ? 'night' : 'day'
    if (prefersReducedMotion() || !sun.current || !moon.current) { setMode(next); return }
    setBusy(true)
    const leaving = next === 'night' ? sun.current : moon.current
    const arriving = next === 'night' ? moon.current : sun.current
    gsap.timeline()
      .set(arriving, { opacity: 1 }, 0)
      .to(leaving, { motionPath: { path: downPath.current!, align: downPath.current!, alignOrigin: [0.5, 0.5] }, duration: 0.9, ease: 'power2.in' }, 0)
      .to(arriving, { motionPath: { path: upPath.current!, align: upPath.current!, alignOrigin: [0.5, 0.5] }, duration: 0.9, ease: 'power2.out' }, 0.15)
      // by now data-mode has switched (see switchTo), so the CSS hides `leaving` and shows `arriving`
      .set([leaving, arriving], { clearProps: 'transform,opacity' })
    switchTo(next)
  }

  const isDay = mode === 'day'
  return (
    <button ref={btn} type="button" className="mode-toggle" onClick={onClick}
      aria-label={isDay ? 'switch to night' : 'switch to day'} aria-pressed={!isDay} title={isDay ? 'night?' : 'day?'}>
      <RoughFocusRing seed="mode-toggle" />
      <svg viewBox="-70 -70 140 200" width="140" height="200" aria-hidden="true" className="mode-toggle__svg" focusable="false">
        {/* the arc the sun sets along and the moon rises along; hidden */}
        <path ref={downPath} d="M0 0 C 20 40, 30 90, -10 130" fill="none" stroke="none" />
        <path ref={upPath} d="M-10 130 C -50 90, -40 40, 0 0" fill="none" stroke="none" />
        <g ref={sun} className="mode-toggle__sun">
          <circle r="22" fill="var(--sun)" filter="url(#wc-edge)" opacity="0.9" />
          <circle r="20" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeDasharray="3 2.2" />
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2 + 0.3
            return <line key={i} x1={Math.cos(a) * 27} y1={Math.sin(a) * 27} x2={Math.cos(a) * (34 + (i % 3) * 3)} y2={Math.sin(a) * (34 + (i % 3) * 3)} stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
          })}
        </g>
        <g ref={moon} className="mode-toggle__moon">
          <path d="M-6 -22 A 22 22 0 1 0 14 14 A 17 17 0 1 1 -6 -22 Z" fill="var(--sun)" filter="url(#wc-edge)" opacity="0.95" />
          <path d="M-6 -22 A 22 22 0 1 0 14 14 A 17 17 0 1 1 -6 -22 Z" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="-12" cy="2" r="2.2" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
          <circle cx="-4" cy="12" r="1.4" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
        </g>
      </svg>
    </button>
  )
}
