import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { isCoarsePointer, useReducedMotion } from '../lib/motion-prefs'
import { InkReveal } from './InkReveal'

export type Project = {
  slug: string; title: string; summary: string; tags: string[]; image: string
  links: { label: string; href: string }[]; mode: 'day' | 'night'; draft?: boolean
}

/** A project. Hover: colour floods the image. Click / Enter: details expand under it. On touch the first tap reveals, the second opens. */
export function ProjectCard({ project }: { project: Project }) {
  const [focused, setFocused] = useState(false)
  const [tapped, setTapped] = useState(false)
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const coarse = isCoarsePointer()
  const revealed = focused || tapped || open
  const id = `${project.slug}-detail`

  const activate = () => {
    if (coarse && !tapped && !open) { setTapped(true); return }
    setOpen((o) => !o)
  }

  return (
    <motion.article className="card" layout={!reduced} transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}>
      <div className="card__media">
        {/* The hit button is passed INTO the reveal so hover events reach it; as a sibling on top they would not. */}
        <InkReveal src={project.image} alt={`${project.title} preview`} revealed={revealed} hoverable={!coarse} overlay={
          <button type="button" className="card__hit" onClick={activate} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onPointerLeave={() => { if (!open) setTapped(false) }}
            aria-expanded={open} aria-controls={id} aria-label={open ? `Close ${project.title}` : `Open ${project.title}`} />
        } />
      </div>
      <div className="card__body">
        <div>
          <h3 className="display display-3 card__title">{project.title}<span className="arrow" aria-hidden="true">↗</span></h3>
          <p className="text-2 card__summary">{project.summary}</p>
        </div>
        <ul className="label card__tags" aria-label="Stack">
          {project.draft && <li className="card__draft">draft</li>}
          {project.tags.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="d" id={id} className="card__detail"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
            <div className="card__detail-inner">
              {project.links.length > 0 ? (
                <p className="text-3 card__links">
                  {project.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
                </p>
              ) : (
                <p className="text-3 muted">Write-up in progress.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
