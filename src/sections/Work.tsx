import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { ProjectCard, type Project } from '../work/ProjectCard'
import projects from '../../content/projects.json'

export function Work() {
  const grid = useRef<HTMLDivElement>(null)
  const list = projects as Project[]

  useEffect(() => {
    const g = grid.current
    if (!g || prefersReducedMotion()) return
    const cards = g.querySelectorAll<HTMLElement>('.card')
    const st = ScrollTrigger.create({
      trigger: g, start: 'top 85%', once: true,
      onEnter: () => { gsap.from(cards, { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, clearProps: 'all' }) },
    })
    return () => { st.kill() }
  }, [])

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="wrap">
        <div className="section__head">
          <h2 id="work-title" className="display display-2">Work</h2>
          <p className="label muted">{String(list.length).padStart(2, '0')} projects</p>
        </div>
        <div ref={grid} className="grid">
          {list.map((p) => <ProjectCard key={p.slug} project={p} />)}
        </div>
      </div>
    </section>
  )
}
