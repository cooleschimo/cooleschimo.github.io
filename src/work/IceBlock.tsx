import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import rough from 'roughjs'
import { hashSeed, seededTilt } from '../lib/seed'
import { isCoarsePointer, useReducedMotion } from '../lib/motion-prefs'
import { RoughBox } from '../primitives/RoughBox'
import { RoughFocusRing } from '../primitives/RoughFocusRing'
import { SketchWobble } from '../primitives/SketchWobble'
import { InkReveal } from './InkReveal'

export type Project = {
  slug: string; title: string; summary: string; tags: string[]; image: string
  links: { label: string; href: string }[]; mode: 'day' | 'night'
}

/**
 * One project as a block of ice. Rest: linework and an ice wash. Hover: the project image
 * bleeds in around the pointer. Focus: full reveal. Tap: first tap reveals, second opens.
 * Click on a mouse: opens. Open = the block grows and shows summary, tags and links in place.
 */
export function IceBlock({ project, index = 0 }: { project: Project; index?: number }) {
  const [focused, setFocused] = useState(false)
  const [tapped, setTapped] = useState(false)
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const coarse = isCoarsePointer()
  const tilt = seededTilt(project.slug, 2.5)
  const sketch = useRef<SVGSVGElement>(null)

  // Placeholder "sketch" of the project: a rough doodle in the ice. Replaced by supplied linework later.
  useEffect(() => {
    const svg = sketch.current
    if (!svg) return
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    const rc = rough.svg(svg)
    const o = { seed: hashSeed(project.slug + ':sketch'), roughness: 1.5, stroke: 'var(--ink)', strokeWidth: 1.6 }
    svg.appendChild(rc.ellipse(200, 120, 220, 150, { ...o, fill: 'var(--ice)', fillStyle: 'hachure', hachureGap: 7, fillWeight: 0.7 }))
    svg.appendChild(rc.curve([[200, 50], [180, 90], [210, 130], [190, 185]], { ...o, strokeWidth: 1.2 }))
    svg.appendChild(rc.curve([[120, 100], [150, 110], [150, 150], [120, 160]], { ...o, strokeWidth: 1.2 }))
    svg.appendChild(rc.curve([[280, 100], [250, 110], [250, 150], [280, 160]], { ...o, strokeWidth: 1.2 }))
  }, [project.slug])

  const revealed = focused || tapped || open
  const onActivate = () => {
    if (coarse && !tapped && !open) { setTapped(true); return }
    setOpen((o) => !o)
  }

  return (
    <motion.article className="ice-block" style={{ rotate: tilt, zIndex: open ? 3 : 1 }}
      layout={!reduced} transition={{ type: 'spring', bounce: 0.28, duration: 0.55 }}
      whileHover={reduced ? undefined : { y: -3, rotate: tilt + 0.8 }}
      onPointerLeave={() => { if (!open) setTapped(false) }}
      data-index={index}>
      <RoughBox seed={project.slug} strokeWidth={1.8} stroke="var(--ink)" fill="var(--ice)" fillStyle="hachure" className="ice-block__frame">
        <div className="ice-block__wash" aria-hidden="true" />
        <InkReveal src={project.image} alt={`${project.title} — screenshot`} revealed={revealed} hoverable={!coarse} className="ice-block__reveal" overlay={(
          <button type="button" className="ice-block__hit" onClick={onActivate} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          aria-expanded={open} aria-controls={`${project.slug}-detail`}
          aria-label={open ? `close ${project.title}` : coarse && !tapped ? `melt the ice to see ${project.title}` : `open ${project.title}`}>
            <RoughFocusRing seed={project.slug + ':focus'} />
          </button>
        )}>
          <SketchWobble strength={2} fps={6} className="ice-block__sketchwrap">
            <svg ref={sketch} viewBox="0 0 400 240" className="ice-block__sketch" aria-hidden="true" focusable="false" />
          </SketchWobble>
          <h3 className="hand hand-3 ice-block__title">{project.title}</h3>
        </InkReveal>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="detail" id={`${project.slug}-detail`} className="ice-block__detail"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}>
              <p className="serif-2 prose-col">{project.summary}</p>
              <ul className="ice-block__tags" aria-label="stack">
                {project.tags.map((t) => <li key={t} className="mono">{t}</li>)}
              </ul>
              <p className="ice-block__links">
                {project.links.map((l) => (
                  <a key={l.href} href={l.href} className="hand hand-4 link-note" target="_blank" rel="noreferrer">
                    <RoughFocusRing seed={project.slug + l.label} />{l.label} ↗
                  </a>
                ))}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </RoughBox>
      {coarse && !open && (
        <p className="mono ice-block__hint" aria-hidden="true">{tapped ? 'tap again to open' : 'tap to melt'}</p>
      )}
    </motion.article>
  )
}
