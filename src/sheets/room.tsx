import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import projects from '../../content/projects.json'
import design from '../../content/design.json'
import places from '../../content/places.json'
import { ART } from '../room/art'
import { ESSAYS } from '../lib/essays'
import { Sheet } from './Sheet'
import { Postcard } from './Postcard'

const B = import.meta.env.BASE_URL.replace(/\/$/, '')
type Project = { slug: string; title: string; summary: string; tags: string[]; links: { label: string; href: string }[]; draft?: boolean }

/** The laptop's screen: every technical project. */
export function Projects({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Projects" onClose={onClose} wide>
      <ul className="projects">
        {(projects as Project[]).map((p) => (
          <li key={p.slug}><div className="projects__head"><span className="display" style={{ fontSize: 22 }}>{p.title}</span><span className="label muted">{p.draft ? 'draft · ' : ''}{p.tags.join(' · ')}</span></div>
            <p className="muted text-2">{p.summary}</p>
            {p.links.length > 0 && <p className="text-3 links">{p.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>}</li>
        ))}
      </ul>
    </Sheet>
  )
}

/** A pin's design project, in a panel docked to the right while the pin hangs large on the left. */
export function DesignPanel({ n, onClose }: { n: number; onClose: () => void }) {
  const d = (design as { n: number; title: string; summary: string; tags: string[]; links: { label: string; href: string }[] }[]).find((x) => x.n === n) || design[0]
  return (
    <Sheet title="Creative design" onClose={onClose} dock="right">
      <div className="prose">
        <img className="pin-panel__pin" src={`${B}/art/paper/pin-${n}.webp`} alt="" />
        <h2 className="display" style={{ fontSize: 30, margin: '10px 0 6px' }}>{d.title}</h2>
        <p className="label muted">{d.tags.join(' · ')}</p>
        <p>{d.summary}</p>
        {d.links.length > 0 && <p className="text-3 links">{d.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>}
        <p className="label muted" style={{ marginTop: 28 }}>the other pins on the bag are the other projects</p>
      </div>
    </Sheet>
  )
}

/** An essay as a magazine you can flip through: the cover, then the text in spreads; a page turns when you click its half. */
export function Magazine({ slug, onClose }: { slug: string; onClose: () => void }) {
  const essay = ESSAYS.find((e) => e.slug === slug) || ESSAYS[0]
  const [pages, setPages] = useState<string[][] | null>(null)
  const [leaf, setLeaf] = useState(0)
  useEffect(() => {
    let live = true
    fetch(`${B}/essays/${essay.slug}.html`).then((r) => r.text()).then((html) => {
      if (!live) return
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const paras = Array.from(doc.querySelectorAll('p')).map((p) => p.textContent?.trim() || '').filter((t) => t.length > 0)
      // ~640 characters a page
      const out: string[][] = []; let cur: string[] = []; let n = 0
      for (const p of paras) { if (n + p.length > 640 && cur.length) { out.push(cur); cur = []; n = 0 } cur.push(p); n += p.length }
      if (cur.length) out.push(cur); setPages(out.length ? out : [['(this essay has no text yet)']])
    }).catch(() => { if (live) setPages([['(could not load the essay)']]) })
    return () => { live = false }
  }, [essay.slug])
  // leaves: the cover (front) with page 1 on its back, then pairs of pages
  const leaves = useMemo(() => {
    if (!pages) return []
    const L: { front: string[] | 'cover'; back: string[] }[] = [{ front: 'cover', back: pages[0] || [] }]
    for (let i = 1; i < pages.length; i += 2) L.push({ front: pages[i], back: pages[i + 1] || [] })
    return L
  }, [pages])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setLeaf((l) => Math.min(leaves.length, l + 1)); if (e.key === 'ArrowLeft') setLeaf((l) => Math.max(0, l - 1)) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [leaves.length])
  return (
    <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="book-wrap" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${essay.title}, as a magazine`}>
        <div className="book-head"><span className="label">{essay.title}</span><span className="label muted">{leaf === 0 ? 'click the cover to open' : `spread ${leaf} of ${leaves.length}`} · <a href={`${B}/essays/${essay.slug}.html`} target="_blank" rel="noreferrer">read it in full ↗</a></span><button type="button" className="sheet__close" onClick={onClose} aria-label="Close" /></div>
        <div className={`book ${leaf > 0 ? 'is-open' : ''}`} style={{ perspective: 2200 }}>
          {leaves.map((l, i) => (
            <div key={i} className={`book__leaf ${i < leaf ? 'is-turned' : ''}`} style={{ zIndex: i < leaf ? i : leaves.length - i }}
              onClick={() => setLeaf(i < leaf ? i : i + 1)}>
              <div className="book__face book__front">{l.front === 'cover' ? <img src={`${B}/art/paper/magazine-${essay.slug}.webp`} alt="" /> : l.front.map((p, k) => <p key={k}>{p}</p>)}</div>
              <div className="book__face book__back">{l.back.map((p, k) => <p key={k}>{p}</p>)}{i === leaves.length - 1 && <p className="label muted">the end · <a href={`${B}/essays/${essay.slug}.html`} target="_blank" rel="noreferrer">read it in full ↗</a></p>}</div>
            </div>
          ))}
          {!pages && <p className="label muted book__loading">opening…</p>}
        </div>
      </div>
    </motion.div>
  )
}

/** The postcards spread out into every place; tap one and it turns, zooms, and its empty back takes your stamps and stickers. */
export function PlacesSpread({ onClose }: { onClose: () => void }) {
  const [pick, setPick] = useState<string | null>(null)
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (pick) setPick(null); else onClose() } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [pick, onClose])
  return (
    <motion.div className="sheet-scrim spread-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => (pick ? setPick(null) : onClose())}>
      <AnimatePresence mode="wait">
        {!pick ? (
          <motion.div key="grid" className="spread" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Postcards from every place">
            <div className="spread__head"><span className="label">postcards · every place</span><button type="button" className="sheet__close" onClick={onClose} aria-label="Close" /></div>
            <div className="spread__grid">
              {places.map((p, i) => (
                <motion.button key={p.slug} type="button" className="spread__card" onClick={() => setPick(p.slug)}
                  initial={{ opacity: 0, x: 0, y: 260, scale: 0.4, rotate: -12 + (i % 5) * 6 }} animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: (i % 3 - 1) * 2.5 }} exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.7, delay: i * 0.035 }}>
                  <img src={ART.postcardFront(p.slug)} alt="" /><span className="label">{p.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={pick} className="pulled" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            initial={{ opacity: 0, scale: 0.5, rotateY: -90 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: 'spring', bounce: 0.15, duration: 0.7 }}>
            <button type="button" className="pulled__close" onClick={() => setPick(null)} aria-label="Back to all the postcards" />
            <Postcard slug={pick} bare />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
