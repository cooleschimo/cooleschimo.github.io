import { useEffect, useState } from 'react'
import projects from '../../content/projects.json'
import { Art } from '../room/useArt'
import { ART } from '../room/art'

const ESSAYS = [
  ['whitman', 'On Whitman'], ['hume', 'Hume'], ['induction', 'Induction'], ['smith', 'Smith'], ['august', 'August'],
  ['catullus', 'Catullus'], ['howardsend', 'Howards End'], ['lostfound', 'Lost & Found'], ['salesman', 'Salesman'], ['selflove', 'Self-love'],
]
const STICKERS = ['★', '♥', '✿', '❄', 'good', 'read', '☕', '☾']
const PHOTOS = [
  ['/art/_placeholder/photos/venice.jpg', 'Venice'], ['/art/_placeholder/photos/chicago.jpg', 'Chicago'],
  ['/art/_placeholder/photos/singapore.jpg', 'Singapore'], ['/art/_placeholder/photos/dubrovnik.jpg', 'Dubrovnik'], ['/art/_placeholder/photos/venice2.jpg', 'Venice'],
]

export function About() {
  return (
    <div className="prose">
      <p>I build machine-learning tools for medicine and markets, shoot on an old Ricoh GR IIIx, and paint the places I travel to. <span className="muted">(placeholder copy)</span></p>
      <ul className="linklist">
        <li><a href="https://github.com/cooleschimo" target="_blank" rel="noreferrer">GitHub ↗</a></li>
        <li><a href="https://instagram.com/chi.minutiae" target="_blank" rel="noreferrer">Instagram ↗</a></li>
        <li><a href="mailto:chimin.liu777@gmail.com">Email ↗</a></li>
      </ul>
      <h3 className="display" style={{ fontSize: 22, margin: '28px 0 10px' }}>Work</h3>
      <ul className="projects">
        {(projects as { slug: string; title: string; summary: string; tags: string[]; links: { label: string; href: string }[]; draft?: boolean }[]).map((p) => (
          <li key={p.slug}><div className="projects__head"><span className="display" style={{ fontSize: 20 }}>{p.title}</span><span className="label muted">{p.draft ? 'draft · ' : ''}{p.tags.join(' · ')}</span></div>
            <p className="muted text-2">{p.summary}</p>
            {p.links.length > 0 && <p className="text-3 links">{p.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>}</li>
        ))}
      </ul>
    </div>
  )
}

export function Photos() {
  return (
    <div>
      <p className="label muted" style={{ marginTop: 0 }}>Stand-in photographs (CC0) until Chimin's own · each will show its collage first, the photo on hover</p>
      <div className="contact">
        {PHOTOS.map(([src, cap]) => <figure key={src}><img src={src} alt={cap} loading="lazy" /><figcaption className="label muted">{cap}</figcaption></figure>)}
      </div>
    </div>
  )
}

/** Essays with a sticker slot each. Readers pick a sticker from the tray; it stays in their browser. */
export function Writing() {
  const key = 'stickers'
  const [given, setGiven] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } })
  const [picked, setPicked] = useState<number | null>(null)
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(given)) } catch { /* ignore */ } }, [given])
  return (
    <div>
      <div className="tray" role="group" aria-label="Pick a sticker, then click an essay to give it">
        {STICKERS.map((s, i) => (
          <button key={s} type="button" className={`sticker ${picked === i ? 'is-picked' : ''}`} onClick={() => setPicked(picked === i ? null : i)} aria-pressed={picked === i} aria-label={`Sticker ${s}`}>
            <Art src={ART.sticker(i + 1)} placeholder={<span className="sticker__block">{s}</span>} />
          </button>
        ))}
        <span className="label muted tray__hint">{picked === null ? 'pick a sticker to give' : 'now click an essay'}</span>
      </div>
      <ul className="essays">
        {ESSAYS.map(([slug, title]) => (
          <li key={slug} className="essay">
            <a href={`${import.meta.env.BASE_URL}essays/${slug}.html`} className="essay__link display" onClick={(e) => { if (picked !== null) { e.preventDefault(); setGiven((g) => ({ ...g, [slug]: picked })); setPicked(null) } }}>{title}</a>
            <span className="essay__slot" aria-label={given[slug] !== undefined ? `Sticker given: ${STICKERS[given[slug]]}` : 'No sticker yet'}>
              {given[slug] !== undefined && <Art src={ART.sticker(given[slug] + 1)} placeholder={<span className="sticker__block sticker__block--sm">{STICKERS[given[slug]]}</span>} />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
