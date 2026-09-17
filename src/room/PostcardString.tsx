import places from '../../content/places.json'
import { Art } from './useArt'
import { ART } from './art'

/** Positions along a string that sags between two pegs. x from 140 to 1300 in world units. */
export function stringPoint(i: number, n: number) {
  const t = (i + 0.5) / n
  const x = 140 + t * 1160
  const y = 150 + Math.sin(t * Math.PI) * 70 // sag
  return { x, y, tilt: (t - 0.5) * -16 }
}

/** Fourteen postcards clipped to a string across the room. Hover tilts a card toward you; click pulls it down. */
export function PostcardString({ onPick, active }: { onPick: (slug: string, i: number) => void; active: string | null }) {
  const n = places.length
  const pts = places.map((_, i) => stringPoint(i, n))
  const d = `M 100 150 Q 720 ${150 + 2 * 70} 1340 150`
  return (
    <div className="pstring" aria-label="Postcards on a string">
      <svg className="pstring__line" viewBox="0 0 1440 300" aria-hidden="true"><path d={d} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" /></svg>
      {places.map((p, i) => (
        <button key={p.slug} type="button" className={`pcard ${active === p.slug ? 'is-active' : ''}`} style={{ left: pts[i].x, top: pts[i].y, ['--tilt' as string]: `${pts[i].tilt}deg`, ['--delay' as string]: `${(i * 0.37) % 2}s` }}
          onClick={() => onPick(p.slug, i)} aria-label={`Postcard from ${p.name}. Open`}>
          <i className="pcard__peg" aria-hidden="true" />
          <span className="pcard__face">
            <Art src={ART.postcardFront(p.slug)} alt="" placeholder={<span className="pcard__block" />} />
            <span className="pcard__name label">{p.name}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
