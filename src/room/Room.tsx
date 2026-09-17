import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { useMode } from '../lib/mode'
import { Art } from './useArt'
import { ART } from './art'
import { RoomObject, Block } from './RoomObject'
import { Vase } from './Vase'
import { Fox } from './Fox'
import { PostcardString, stringPoint } from './PostcardString'
import { createCamera } from './camera'
import { Sheet } from '../sheets/Sheet'
import { Postcard } from '../sheets/Postcard'
import { About, Photos, Writing } from '../sheets/contents'
import places from '../../content/places.json'

type Open = { kind: 'about' } | { kind: 'photos' } | { kind: 'writing' } | { kind: 'place'; slug: string; i: number } | null

/** The igloo room: a 2.5D camera over four layers, a postcard string, six things to touch. Grey blockout until the art exists. */
export function Room() {
  const mode = useMode()
  const world = useRef<HTMLDivElement>(null)
  const camera = useRef<ReturnType<typeof createCamera> | null>(null)
  const [scale, setScale] = useState(1)
  const [open, setOpen] = useState<Open>(null)

  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / 1440, innerHeight / 900))
    fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    const w = world.current
    if (!w) return
    const reduced = prefersReducedMotion()
    camera.current = createCamera(w, reduced)
    if (!reduced) gsap.from(w.querySelectorAll('[data-depth]'), { opacity: 0, duration: 0.9, ease: 'power2.out', stagger: 0.08, clearProps: 'opacity' })
    return () => camera.current?.destroy()
  }, [])

  const close = useCallback(() => { setOpen(null); camera.current?.reset() }, [])
  // Dolly toward a world point (relative to the room centre), then open.
  const goTo = useCallback((x: number, y: number, zoom: number, next: Open) => {
    const tl = camera.current?.dolly(x - 720, y - 450, zoom)
    if (tl && !prefersReducedMotion()) tl.then(() => setOpen(next)); else setOpen(next)
  }, [])

  const night = mode === 'night'
  const pick = places.find((p) => open?.kind === 'place' && p.slug === open.slug)
  const pickPt = open?.kind === 'place' ? stringPoint(open.i, places.length) : null

  return (
    <div className={`room ${open ? 'room--dim' : ''}`}>
      <div ref={world} className="room__world" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* depth 0: ice wall and window */}
        <div className="layer layer--wall" data-depth="0">
          <Art src={ART.wall} className="layer__img" placeholder={
            <div className="wall-block">
              {Array.from({ length: 8 }, (_, r) => <div key={r} className="wall-row" style={{ marginLeft: r % 2 ? 46 : 0 }}>{Array.from({ length: 18 }, (_, c) => <i key={c} className="wall-brick" />)}</div>)}
            </div>
          } />
          <button type="button" className="window" onClick={() => document.dispatchEvent(new CustomEvent('toggle-mode'))} aria-label={night ? 'Window: night. Switch to day' : 'Window: day. Switch to night'}>
            <Art src={night ? ART.skyNight : ART.skyDay} className="window__sky" placeholder={<span className={`window__block ${night ? 'is-night' : ''}`}><i className="window__aurora" /></span>} />
            <span className="ro__label label" aria-hidden="true">{night ? 'Night' : 'Day'}</span>
          </button>
        </div>
        {/* depth 0.25: the postcard string, hanging in front of the wall */}
        <div className="layer layer--string" data-depth="0.25">
          <PostcardString active={open?.kind === 'place' ? open.slug : null} onPick={(slug, i) => { const pt = stringPoint(i, places.length); goTo(pt.x, pt.y + 60, 1.6, { kind: 'place', slug, i }) }} />
        </div>
        {/* depth 0.45: floor and rug */}
        <div className="layer layer--floor" data-depth="0.45">
          <Art src={ART.floor} className="layer__img" placeholder={<><div className="floor-block" /><div className="rug-block" /></>} />
        </div>
        {/* depth 0.7: furniture and objects */}
        <div className="layer layer--objects" data-depth="0.7">
          <div className="obj obj--fridge" aria-hidden="true"><Art src={ART.fridgeClosed} placeholder={<div className="fridge__block block block--1"><i className="fridge__handle" /><i className="fridge__magnet" style={{ left: 30, top: 60 }} /><i className="fridge__magnet" style={{ left: 90, top: 110, background: 'var(--accent)' }} /></div>} /></div>
          <div className="obj obj--table"><Art src={ART.table} placeholder={<Block w={520} h={26} tone={3} className="table-top" />} /><div className="table-legs" aria-hidden="true"><i /><i /></div></div>
          <RoomObject id="camera" label="Photographs" x={520} y={548} w={110} h={64} onOpen={() => goTo(575, 580, 1.35, { kind: 'photos' })}>
            <Art src={ART.camera} placeholder={<Block w={110} h={64} tone={4} r={8}><i className="camera-lens" /></Block>} />
          </RoomObject>
          <div className="obj obj--candle" aria-hidden="true"><Art src={ART.candle} placeholder={<><i className="candle-body" /><i className={`candle-flame ${night ? 'is-lit' : ''}`} /></>} /></div>
          <div className="obj obj--vase"><Vase /></div>
          <Fox zone={{ x: 120, y: 560, w: 520, h: 300 }} home={{ x: 330, y: 700 }} />
        </div>
        {/* depth 1: nearest things and the entrance arc */}
        <div className="layer layer--near" data-depth="1">
          <RoomObject id="notebook" label="Writing" x={640} y={730} w={150} h={110} onOpen={() => goTo(715, 785, 1.3, { kind: 'writing' })} className="ro--notebook">
            <Art src={ART.notebook} placeholder={<Block w={150} h={110} tone={2} r={4} style={{ rotate: '-8deg' }}><i className="notebook-band" /></Block>} />
          </RoomObject>
          <div className="entrance" aria-hidden="true"><Art src={ART.entrance} className="layer__img" placeholder={<div className="entrance-block" />} /></div>
        </div>
      </div>

      <button type="button" className="name label" onClick={() => goTo(720, 450, 1.15, { kind: 'about' })}>Chimin Liu<span className="muted"> · engineer, photographer, painter</span></button>
      <p className="blockout-note label">grey blockout · art slots per docs/ART-BRIEF.md · move the mouse for depth</p>

      {/* The pulled-down postcard lives in the scene, in front of everything. */}
      <AnimatePresence>
        {pick && pickPt && open?.kind === 'place' && (
          <motion.div key={pick.slug} className="pulled" role="dialog" aria-modal="true" aria-label={`Postcard from ${pick.name}`}
            initial={{ opacity: 0, scale: 0.28, x: (pickPt.x - 720) * scale, y: (pickPt.y - 450) * scale, rotate: pickPt.tilt }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }} exit={{ opacity: 0, scale: 0.4, x: (pickPt.x - 720) * scale, y: (pickPt.y - 450) * scale }}
            transition={{ type: 'spring', bounce: 0.12, duration: 0.7 }}>
            <button type="button" className="pulled__close" onClick={close} aria-label="Put the postcard back" />
            <Postcard slug={pick.slug} />
          </motion.div>
        )}
        {open?.kind === 'about' && <Sheet key="about" title="About" onClose={close}><About /></Sheet>}
        {open?.kind === 'photos' && <Sheet key="photos" title="Photographs" onClose={close}><Photos /></Sheet>}
        {open?.kind === 'writing' && <Sheet key="writing" title="Writing" onClose={close}><Writing /></Sheet>}
      </AnimatePresence>
      {open?.kind === 'place' && <button type="button" className="scrim-btn" onClick={close} aria-label="Put the postcard back" />}
    </div>
  )
}
