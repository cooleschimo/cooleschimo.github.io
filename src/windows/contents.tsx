import projects from '../../content/projects.json'

const ESSAYS = [
  ['whitman', 'On Whitman'], ['hume', 'Hume'], ['induction', 'Induction'], ['smith', 'Smith'], ['august', 'August'],
  ['catullus', 'Catullus'], ['howardsend', "Howards End"], ['lostfound', 'Lost & Found'], ['salesman', 'Salesman'], ['selflove', 'Self-love'],
]
const PLACES = ['Budapest', 'Cinque Terre', 'Split', 'Mostar', 'Dubrovnik', 'Malta', 'Mallorca', 'Venice', 'Verona', 'Lake Garda', 'Como', 'Slovenia', 'Singapore', 'Chicago']
const PHOTOS = [
  ['/art/_placeholder/photos/venice.jpg', 'Venice'], ['/art/_placeholder/photos/chicago.jpg', 'Chicago'],
  ['/art/_placeholder/photos/singapore.jpg', 'Singapore'], ['/art/_placeholder/photos/dubrovnik.jpg', 'Dubrovnik'], ['/art/_placeholder/photos/venice2.jpg', 'Venice'],
]

export function AboutContent() {
  return (
    <div className="win-about">
      <p className="win-about__lead">I build machine-learning tools for medicine and markets, shoot on an old Ricoh GR IIIx, and paint the places I travel to. <span className="muted">(placeholder copy)</span></p>
      <ul className="win-list">
        <li><a href="https://github.com/cooleschimo" target="_blank" rel="noreferrer">GitHub ↗</a></li>
        <li><a href="https://instagram.com/chi.minutiae" target="_blank" rel="noreferrer">Instagram ↗</a></li>
        <li><a href="mailto:chimin.liu777@gmail.com">Email ↗</a></li>
      </ul>
    </div>
  )
}

export function WorkContent() {
  return (
    <ul className="win-projects">
      {(projects as { slug: string; title: string; summary: string; tags: string[]; links: { label: string; href: string }[]; draft?: boolean }[]).map((p) => (
        <li key={p.slug} className="win-project">
          <div className="win-project__head"><h3 className="display win-project__title">{p.title}</h3><span className="label muted">{p.draft ? 'draft · ' : ''}{p.tags.join(' · ')}</span></div>
          <p className="text-2 muted">{p.summary}</p>
          {p.links.length > 0 && <p className="win-project__links text-3">{p.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>}
        </li>
      ))}
    </ul>
  )
}

export function PhotosContent() {
  return (
    <div>
      <p className="label muted" style={{ marginTop: 0 }}>Stand-in photographs (CC0) until Chimin's own · Ricoh GR IIIx · Canon</p>
      <div className="win-photos">
        {PHOTOS.map(([src, cap]) => <figure key={src}><img src={src} alt={cap} loading="lazy" /><figcaption className="label muted">{cap}</figcaption></figure>)}
      </div>
    </div>
  )
}

export function WritingContent() {
  return (
    <ul className="win-list win-list--essays">
      {ESSAYS.map(([slug, title]) => <li key={slug}><a href={`/essays/${slug}.html`}>{title} <span className="muted">→</span></a></li>)}
    </ul>
  )
}

export function TravelContent() {
  return (
    <div>
      <p className="text-2 muted" style={{ marginTop: 0 }}>Sketches and notes from the road. Pages are being painted; the list is the plan.</p>
      <ul className="win-places label">{PLACES.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  )
}
