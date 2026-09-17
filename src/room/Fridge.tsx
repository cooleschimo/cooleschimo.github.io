import places from '../../content/places.json'
import { Art } from './useArt'
import { ART } from './art'

/** The fridge. The magnets on its door are the places; each opens that place's postcard. */
export function Fridge({ onPlace }: { onPlace: (slug: string) => void }) {
  return (
    <div className="fridge">
      <div className="fridge__body">
        <Art src={ART.fridgeClosed} placeholder={<div className="fridge__block block block--1"><i className="fridge__handle" /></div>} />
      </div>
      <ul className="fridge__magnets" aria-label="Places I have been">
        {places.map((p) => (
          <li key={p.slug}>
            <button type="button" className="magnet" onClick={() => onPlace(p.slug)} aria-label={`${p.name}, ${p.country}. Open postcard`}>
              <Art src={ART.magnet(p.slug)} placeholder={<span className="magnet__block" />} />
              <span className="magnet__name label">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
