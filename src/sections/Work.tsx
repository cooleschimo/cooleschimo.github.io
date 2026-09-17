import { useEffect, useRef } from 'react'
import { annotate } from 'rough-notation'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { seededRandom, hashSeed } from '../lib/seed'
import { IceBlock, type Project } from '../work/IceBlock'
import projects from '../../content/projects.json'

/**
 * The work igloo. A seeded scatter of ice blocks (one in M1) that deal in from above
 * with a 60ms stagger the first time the section is seen.
 */
export function Work() {
  const heading = useRef<HTMLHeadingElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const list = projects as Project[]

  useEffect(() => {
    const h = heading.current
    const f = field.current
    if (!h || !f) return
    const a = annotate(h, { type: 'underline', color: 'var(--rust)', strokeWidth: 2, padding: 4, animationDuration: 700, iterations: 2 })
    const reduced = prefersReducedMotion()
    const blocks = f.querySelectorAll<HTMLElement>('.ice-block')
    const st = ScrollTrigger.create({
      trigger: f, start: 'top 80%', once: true,
      onEnter: () => {
        a.show()
        if (reduced) return
        gsap.from(blocks, { y: -120, opacity: 0, rotation: (i) => -8 + i * 5, duration: 0.9, ease: 'back.out(1.3)', stagger: 0.06, clearProps: 'opacity,transform' })
      },
    })
    return () => { st.kill(); a.remove() }
  }, [])

  // Seeded scatter positions: offsets and sizes per block, stable between visits.
  const rand = seededRandom(hashSeed('work-scatter'))
  const placed = list.map((p) => ({ p, dx: (rand() - 0.5) * 14, dy: (rand() - 0.5) * 10, scale: 0.94 + rand() * 0.12 }))

  return (
    <section id="work" className="work" aria-labelledby="work-title">
      <div className="work__inner">
        <h2 id="work-title" ref={heading} className="hand hand-2 work__title">work</h2>
        <p className="serif-1 work__lede prose-col">things i built. hover a block to melt the ice; tap it on a phone.</p>
        <div ref={field} className="work__field">
          {placed.map(({ p, dx, dy, scale }, i) => (
            <div key={p.slug} className="work__slot" style={{ translate: `${dx}% ${dy}%`, scale: String(scale) }}>
              <IceBlock project={p} index={i} />
            </div>
          ))}
          <p className="hand hand-4 work__note" aria-label="more projects are on the way">
            more blocks still freezing →<br /><span className="serif-2" style={{ color: 'var(--ink-soft)' }}>bias detection, patent classifier, prediction markets</span>
          </p>
        </div>
      </div>
    </section>
  )
}
