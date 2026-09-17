import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import rough from 'roughjs'
import { hashSeed } from '../lib/seed'
import { scrollToSection } from '../lib/lenis'
import { useReducedMotion } from '../lib/motion-prefs'
import { RoughFocusRing } from '../primitives/RoughFocusRing'

const LANDMARKS = [
  { id: 'top', label: 'home', x: 46, y: 92 },
  { id: 'work', label: 'work', x: 128, y: 58 },
]

/**
 * A folded map corner, bottom-right. Hover, focus or tap unfolds it into a doodled map
 * with one landmark per section. M1 stub: two landmarks.
 */
export function MiniMap() {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const mapSvg = useRef<SVGSVGElement>(null)
  const cornerSvg = useRef<SVGSVGElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = cornerSvg.current
    if (!svg) return
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    const rc = rough.svg(svg)
    svg.appendChild(rc.polygon([[4, 60], [60, 60], [60, 4]], { seed: hashSeed('corner'), roughness: 1.6, stroke: 'var(--ink)', strokeWidth: 1.6, fill: 'var(--blush)', fillStyle: 'hachure', hachureGap: 5, fillWeight: 0.8 }))
    svg.appendChild(rc.line(12, 54, 54, 12, { seed: hashSeed('fold'), roughness: 1.2, stroke: 'var(--ink-soft)', strokeWidth: 0.9 }))
  }, [])

  useEffect(() => {
    if (!open) return
    const svg = mapSvg.current
    if (!svg) return
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    const rc = rough.svg(svg)
    svg.appendChild(rc.rectangle(4, 4, 172, 122, { seed: hashSeed('map'), roughness: 1.5, bowing: 1.4, stroke: 'var(--ink)', strokeWidth: 1.6, fill: 'var(--paper)', fillStyle: 'solid' }))
    svg.appendChild(rc.curve([[14, 110], [60, 96], [96, 80], [150, 40]], { seed: hashSeed('route'), roughness: 1.3, stroke: 'var(--ink-soft)', strokeWidth: 0.9, strokeLineDash: [3, 4] }))
    LANDMARKS.forEach((l) => {
      svg.appendChild(rc.path(`M${l.x - 9} ${l.y + 4} a 9 9 0 0 1 18 0 z`, { seed: hashSeed(l.id), roughness: 1.4, stroke: 'var(--ink)', strokeWidth: 1.4, fill: 'var(--ice)', fillStyle: 'hachure', hachureGap: 3, fillWeight: 0.7 }))
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  return (
    <div ref={wrap} className="mini-map" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <AnimatePresence>
        {open && (
          <motion.nav key="map" className="mini-map__map" aria-label="map of this page"
            initial={reduced ? { opacity: 0 } : { opacity: 0, rotate: -14, scale: 0.55 }}
            animate={{ opacity: 1, rotate: -2, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, rotate: -14, scale: 0.55 }}
            transition={reduced ? { duration: 0.2 } : { type: 'spring', bounce: 0.35, duration: 0.5 }}>
            <svg ref={mapSvg} viewBox="0 0 180 130" width="180" height="130" aria-hidden="true" className="mini-map__paper" />
            {LANDMARKS.map((l) => (
              <button key={l.id} type="button" className="mini-map__pin hand" style={{ left: l.x, top: l.y }}
                onClick={() => { scrollToSection(`#${l.id}`); setOpen(false) }}>
                <RoughFocusRing seed={`pin-${l.id}`} />
                {l.label}
              </button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
      <button type="button" className="mini-map__corner" aria-label="unfold the map" aria-expanded={open}
        onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)}>
        <RoughFocusRing seed="map-corner" />
        <svg ref={cornerSvg} viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" />
      </button>
    </div>
  )
}
