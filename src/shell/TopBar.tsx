import { useEffect, useRef } from 'react'
import { annotate } from 'rough-notation'

type RoughAnnotation = ReturnType<typeof annotate>
import { scrollToSection } from '../lib/lenis'
import { ModeToggle } from './ModeToggle'

const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#writing', label: 'Writing' },
  { href: '#photos', label: 'Photos' },
  { href: '#travel', label: 'Travel' },
]

/** Minimal fixed bar: name, section links, the day/night toggle. Hover draws a single scribbled underline. */
export function TopBar() {
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = nav.current
    if (!el) return
    const notes = new Map<HTMLAnchorElement, RoughAnnotation>()
    const anchors = el.querySelectorAll<HTMLAnchorElement>('a')
    anchors.forEach((a) => {
      const n = annotate(a, { type: 'underline', color: 'var(--accent)', strokeWidth: 1.4, padding: [0, 0, 1, 0], animationDuration: 320, iterations: 1 })
      notes.set(a, n)
      a.addEventListener('mouseenter', () => n.show())
      a.addEventListener('mouseleave', () => n.hide())
      a.addEventListener('focus', () => n.show())
      a.addEventListener('blur', () => n.hide())
    })
    return () => notes.forEach((n) => n.remove())
  }, [])

  return (
    <header className="topbar">
      <div className="wrap topbar__inner">
        <a href="#top" className="topbar__name" onClick={(e) => { e.preventDefault(); scrollToSection('#top') }}>Chimin Liu</a>
        <nav ref={nav} className="topbar__nav" aria-label="sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => { const t = document.querySelector(l.href); if (t) { e.preventDefault(); scrollToSection(l.href, -24) } }}>{l.label}</a>
          ))}
        </nav>
        <div className="topbar__right"><ModeToggle /></div>
      </div>
    </header>
  )
}
