import { useEffect, useRef, useState } from 'react'
import places from '../../content/places.json'
import { Art, useArt } from '../room/useArt'
import { ART } from '../room/art'
import { hashSeed, seededRandom } from '../lib/seed'

type Piece = { n: number; x: number; y: number; r: number; w: number; kind: 'paper' | 'washi' | 'stamp' | 'caption' | 'mark' }
const KINDS: Piece['kind'][] = ['paper', 'paper', 'paper', 'washi', 'washi', 'stamp', 'caption', 'mark']
const CARD = { w: 640, h: 420 }

/** Chimin's default arrangement for a place: seeded, so it is the same every visit until Chimin authors one. */
function defaultPieces(slug: string): Piece[] {
  const rand = seededRandom(hashSeed(slug))
  return KINDS.map((kind, i) => ({
    n: i + 1, kind,
    w: kind === 'paper' ? 150 + rand() * 90 : kind === 'washi' ? 120 + rand() * 60 : kind === 'stamp' ? 74 : kind === 'caption' ? 140 : 40,
    x: 40 + rand() * (CARD.w - 260), y: 30 + rand() * (CARD.h - 180), r: (rand() - 0.5) * 24,
  }))
}

/** The postcard: front is the place's collage; back is the collage canvas the visitor can rearrange. */
export function Postcard({ slug, bare = false }: { slug: string; bare?: boolean }) {
  const place = places.find((p) => p.slug === slug)!
  const key = `postcard:${slug}`
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [pieces, setPieces] = useState<Piece[]>(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : defaultPieces(slug) } catch { return defaultPieces(slug) } })
  const [top, setTop] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const hasFront = useArt(ART.postcardFront(slug))
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(pieces)) } catch { /* ignore */ } }, [pieces, key])

  const clamp = (x: number, y: number) => ({ x: Math.max(-20, Math.min(CARD.w - 30, x)), y: Math.max(-20, Math.min(CARD.h - 30, y)) })
  const moveTo = (n: number, x: number, y: number) => setPieces((ps) => ps.map((p) => p.n === n ? { ...p, ...clamp(x, y) } : p))
  const update = (n: number, dx: number, dy: number) => setPieces((ps) => ps.map((p) => p.n === n ? { ...p, x: Math.max(-20, Math.min(CARD.w - 30, p.x + dx)), y: Math.max(-20, Math.min(CARD.h - 30, p.y + dy)) } : p))

  return (
    <div className="postcard-wrap">
      <div className="postcard-head">
        <h2 className="display postcard-title">{place.name}<span className="muted label" style={{ marginLeft: 12 }}>{place.country}</span></h2>
        <div className="postcard-actions">
          <button type="button" className="btn" onClick={() => setSide((s) => s === 'front' ? 'back' : 'front')}>{side === 'front' ? 'Turn over' : 'Turn back'}</button>
          {side === 'back' && <button type="button" className="btn btn--quiet" onClick={() => setPieces(defaultPieces(slug))}>Reset to Chimin's</button>}
        </div>
      </div>
      <div className={`postcard postcard--${side}`}>
        <div className="postcard__face postcard__front" aria-hidden={side !== 'front'}>
          {hasFront ? <img src={ART.postcardFront(slug)} alt={`${place.name}, as a paper collage`} /> : (
            <div className="postcard__blockout"><span className="label muted">collage of {place.name}<br />(art slot: places/{slug}/postcard-front.png)</span></div>
          )}
        </div>
        <div ref={card} className="postcard__face postcard__back" aria-hidden={side !== 'back'}>
          {!bare && <><div className="postcard__lines" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="postcard__stampbox" aria-hidden="true" />
          <div className="postcard__divider" aria-hidden="true" /></>}
          <p className="postcard__hint label muted">{bare ? 'paste the stamps, sketches and stickers where you like · kept in this browser' : 'drag the pieces · your arrangement is kept in this browser'}</p>
          {pieces.map((p) => (
            <div key={p.n} className={`piece piece--${p.kind} ${dragging === p.n ? 'is-dragging' : ''}`}
              style={{ left: p.x, top: p.y, width: p.w, transform: `rotate(${p.r}deg)`, zIndex: top === p.n ? 20 : p.n }}
              tabIndex={0} role="img" aria-label={`${p.kind} piece ${p.n}. Drag, or move with the arrow keys`}
              onPointerDown={(e) => {
                const el = e.currentTarget; el.setPointerCapture(e.pointerId)
                const rect = card.current!.getBoundingClientRect(); const s = rect.width / CARD.w
                const start = { x: e.clientX, y: e.clientY, px: p.x, py: p.y }
                setTop(p.n); setDragging(p.n)
                const move = (ev: PointerEvent) => { moveTo(p.n, start.px + (ev.clientX - start.x) / s, start.py + (ev.clientY - start.y) / s) }
                const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); setDragging(null) }
                el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
              }}
              onKeyDown={(e) => { const s = e.shiftKey ? 10 : 2; if (e.key === 'ArrowLeft') update(p.n, -s, 0); if (e.key === 'ArrowRight') update(p.n, s, 0); if (e.key === 'ArrowUp') update(p.n, 0, -s); if (e.key === 'ArrowDown') update(p.n, 0, s) }}>
              <Art src={ART.piece(slug, p.n)} placeholder={<span className="piece__block">{p.kind === 'caption' ? <span className="label">{place.name.toLowerCase()} · a note</span> : p.kind === 'stamp' ? <span className="label">stamp</span> : null}</span>} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
