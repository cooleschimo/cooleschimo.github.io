import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { useMode } from '../lib/mode'
import { Art } from './useArt'
import { ART } from './art'
import { RoomObject, Block } from './RoomObject'
import { Fridge } from './Fridge'
import { Vase } from './Vase'
import { Fox } from './Fox'
import { Sheet } from '../sheets/Sheet'
import { Postcard } from '../sheets/Postcard'
import { About, Photos, Writing } from '../sheets/contents'

type Open = { kind: 'about' } | { kind: 'photos' } | { kind: 'writing' } | { kind: 'place'; slug: string } | null

/** The igloo room: four parallax layers, six things to touch, sheets over the top. Grey blockout until the art exists. */
export function Room() {
  const mode = useMode()
  const world = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [open, setOpen] = useState<Open>(null)
  const close = useCallback(() => setOpen(null), [])

  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / 1440, innerHeight / 900))
    fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit)
  }, [])

  // Pointer parallax: back layers move least. None under reduced motion.
  useEffect(() => {
    const w = world.current
    if (!w || prefersReducedMotion()) return
    const layers = w.querySelectorAll<HTMLElement>('[data-depth]')
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => { target.x = (e.clientX / innerWidth - 0.5) * 2; target.y = (e.clientY / innerHeight - 0.5) * 2 }
    const tick = () => { cur.x += (target.x - cur.x) * 0.06; cur.y += (target.y - cur.y) * 0.06; layers.forEach((l) => { const d = parseFloat(l.dataset.depth || '0'); l.style.transform = `translate(${(-cur.x * d).toFixed(2)}px, ${(-cur.y * d * 0.6).toFixed(2)}px)` }) }
    addEventListener('pointermove', onMove, { passive: true }); gsap.ticker.add(tick)
    gsap.from(layers, { y: 10, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, clearProps: 'opacity' })
    return () => { removeEventListener('pointermove', onMove); gsap.ticker.remove(tick) }
  }, [])

  const night = mode === 'night'
  return (
    <div className={`room ${open ? 'room--dim' : ''}`}>
      <div ref={world} className="room__world" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* L0: ice wall and window */}
        <div className="layer layer--wall" data-depth="6">
          <Art src={ART.wall} className="layer__img" placeholder={
            <div className="wall-block">
              {Array.from({ length: 7 }, (_, r) => <div key={r} className="wall-row" style={{ marginLeft: r % 2 ? 46 : 0 }}>{Array.from({ length: 16 }, (_, c) => <i key={c} className="wall-brick" />)}</div>)}
            </div>
          } />
          <button type="button" className="window" onClick={() => document.dispatchEvent(new CustomEvent('toggle-mode'))} aria-label={night ? 'Window: night. Switch to day' : 'Window: day. Switch to night'}>
            <Art src={night ? ART.skyNight : ART.skyDay} className="window__sky" placeholder={<span className={`window__block ${night ? 'is-night' : ''}`}><i className="window__aurora" /></span>} />
            <span className="ro__label label" aria-hidden="true">{night ? 'Night' : 'Day'}</span>
          </button>
        </div>
        {/* L1: floor and rug */}
        <div className="layer layer--floor" data-depth="10">
          <Art src={ART.floor} className="layer__img" placeholder={<><div className="floor-block" /><div className="rug-block" /></>} />
        </div>
        {/* L2: objects */}
        <div className="layer layer--objects" data-depth="14">
          <div className="obj obj--fridge"><Fridge onPlace={(slug) => setOpen({ kind: 'place', slug })} /></div>
          <div className="obj obj--table"><Art src={ART.table} placeholder={<Block w={520} h={26} tone={3} className="table-top" />} /><div className="table-legs" aria-hidden="true"><i /><i /></div></div>
          <RoomObject id="camera" label="Photographs" x={520} y={548} w={110} h={64} onOpen={() => setOpen({ kind: 'photos' })}>
            <Art src={ART.camera} placeholder={<Block w={110} h={64} tone={4} r={8}><i className="camera-lens" /></Block>} />
          </RoomObject>
          <div className="obj obj--candle" aria-hidden="true"><Art src={ART.candle} placeholder={<><i className="candle-body" /><i className={`candle-flame ${night ? 'is-lit' : ''}`} /></>} /></div>
          <div className="obj obj--vase"><Vase /></div>
          <RoomObject id="notebook" label="Writing" x={640} y={730} w={150} h={110} onOpen={() => setOpen({ kind: 'writing' })} className="ro--notebook">
            <Art src={ART.notebook} placeholder={<Block w={150} h={110} tone={2} r={4} style={{ rotate: '-8deg' }}><i className="notebook-band" /></Block>} />
          </RoomObject>
          <Fox zone={{ x: 120, y: 560, w: 520, h: 300 }} home={{ x: 330, y: 700 }} />
        </div>
        {/* L3: entrance arc */}
        <div className="layer layer--entrance" data-depth="22" aria-hidden="true"><Art src={ART.entrance} className="layer__img" placeholder={<div className="entrance-block" />} /></div>
      </div>
      <button type="button" className="name label" onClick={() => setOpen({ kind: 'about' })}>Chimin Liu<span className="muted"> · engineer, photographer, painter</span></button>
      <p className="blockout-note label" aria-live="polite">grey blockout · art slots per docs/ART-BRIEF.md</p>
      <AnimatePresence>
        {open?.kind === 'about' && <Sheet key="about" title="About" onClose={close}><About /></Sheet>}
        {open?.kind === 'photos' && <Sheet key="photos" title="Photographs" onClose={close}><Photos /></Sheet>}
        {open?.kind === 'writing' && <Sheet key="writing" title="Writing" onClose={close}><Writing /></Sheet>}
        {open?.kind === 'place' && <Sheet key={open.slug} title="Postcard" onClose={close} wide><Postcard slug={open.slug} /></Sheet>}
      </AnimatePresence>
    </div>
  )
}
