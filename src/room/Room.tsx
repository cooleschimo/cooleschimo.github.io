import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
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
import { createCamera, ZOOM_MAX } from './camera'
import { Sheet } from '../sheets/Sheet'
import { Postcard } from '../sheets/Postcard'
import { About, Photos, Writing } from '../sheets/contents'
import places from '../../content/places.json'

type Open = { kind: 'about' } | { kind: 'photos' } | { kind: 'writing' } | { kind: 'place'; slug: string; i: number } | null

const Snowfield = lazy(() => import('../snow/Diorama').then(m => ({ default: m.Diorama })))

/** The igloo room: a 2.5D camera over four layers, a postcard string, six things to touch. Generated collage stand-ins fill every art slot until Chimin's art replaces them by name. */
export function Room() {
  const mode = useMode()
  const world = useRef<HTMLDivElement>(null)
  const roomEl = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const camera = useRef<ReturnType<typeof createCamera> | null>(null)
  const [scale, setScale] = useState(1)
  const [open, setOpen] = useState<Open>(null)
  const [arrived, setArrived] = useState<boolean>(() => { try { return sessionStorage.getItem('arrived') === '1' } catch { return false } })

  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / 1440, innerHeight / 900))
    fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    const w = world.current
    if (!w) return
    const reduced = prefersReducedMotion()
    camera.current = createCamera(w, roomEl.current!, reduced, (c) => setZoom(Math.round(c.zoom * 100) / 100))
    return () => camera.current?.destroy()
  }, [])

  // The room assembles: everything starts clumped near the centre and settles into place (Jess Paik's deal-in, as an arrival).
  useEffect(() => {
    const w = world.current
    if (!w || !arrived) return
    try { sessionStorage.setItem('arrived', '1') } catch { /* ignore */ }
    if (prefersReducedMotion()) return
    const things = w.querySelectorAll<HTMLElement>('.obj, .ro, .fox, .pcard')
    const r = w.getBoundingClientRect(); const s = r.width / 1440
    gsap.from(things, {
      x: (_i, el) => { const b = (el as HTMLElement).getBoundingClientRect(); return (r.left + r.width / 2 - (b.left + b.width / 2)) / s * 0.85 },
      y: (_i, el) => { const b = (el as HTMLElement).getBoundingClientRect(); return (r.top + r.height / 2 - (b.top + b.height / 2)) / s * 0.85 },
      scale: 0.6, opacity: 0, rotation: () => gsap.utils.random(-25, 25),
      duration: 1.2, ease: 'expo.out', stagger: { each: 0.035, from: 'random' }, clearProps: 'x,y,scale,opacity,rotation',
    })
    gsap.from(w.querySelectorAll('.layer--wall, .layer--floor, .layer--near > .entrance'), { opacity: 0, duration: 1.0, ease: 'power2.out', stagger: 0.1, clearProps: 'opacity' })
  }, [arrived])

  const close = useCallback(() => { setOpen(null); camera.current?.back() }, [])
  // Dolly toward a world point (relative to the room centre), then open.
  const goTo = useCallback((x: number, y: number, zoom: number, next: Open) => {
    const tl = camera.current?.dolly(x - 720, y - 450, zoom)
    if (tl && !prefersReducedMotion()) tl.then(() => setOpen(next)); else setOpen(next)
  }, [])

  const night = mode === 'night'
  const [shut, setShut] = useState(false)
  const sky = mode === 'night' ? ART.skyNight : mode === 'evening' ? ART.skyEvening : ART.skyDay
  const pick = places.find((p) => open?.kind === 'place' && p.slug === open.slug)
  const pickPt = open?.kind === 'place' ? stringPoint(open.i, places.length) : null

  return (
    <div ref={roomEl} className={`room ${open ? 'room--dim' : ''} ${zoom > 1.01 ? 'room--zoomed' : ''} ${arrived ? '' : 'room--arriving'} ${shut ? 'room--shut' : ''}`}>
      {!arrived && (
        <Suspense fallback={<div className="snow" aria-hidden="true" />}>
          <Snowfield onEnter={() => setArrived(true)} onAbout={() => setOpen({ kind: 'about' })} />
        </Suspense>
      )}
      <div ref={world} className="room__world" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="light" aria-hidden="true">
          <i className="light__tint" /><i className="light__wash" />
          <svg className="light__beam" viewBox="0 0 840 700" preserveAspectRatio="none">
            <defs>
              <filter id="beam-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="26" /></filter>
              <linearGradient id="beam-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--beam-a)' }} /><stop offset="0.5" style={{ stopColor: 'var(--beam-b)' }} /><stop offset="1" style={{ stopColor: 'var(--beam-b)', stopOpacity: 0 }} /></linearGradient>
            </defs>
            <polygon points="330,0 510,0 840,700 0,700" fill="url(#beam-fill)" filter="url(#beam-soft)" />
          </svg>
          <i className="light__pool" /><i className="light__lamp" />
        </div>
        {/* depth 0: ice wall and window */}
        <div className="layer layer--wall" data-depth="0">
          <Art src={ART.wall} className="layer__img" placeholder={
            <div className="wall-block">
              {Array.from({ length: 8 }, (_, r) => <div key={r} className="wall-row" style={{ marginLeft: r % 2 ? 46 : 0 }}>{Array.from({ length: 18 }, (_, c) => <i key={c} className="wall-brick" />)}</div>)}
            </div>
          } />
          <button type="button" className={`window ${shut ? 'is-shut' : ''}`} onClick={() => setShut(v => !v)} aria-pressed={shut} aria-label={shut ? 'Window, shut. Open it' : 'Window, open. Shut it'}>
            <Art src={sky} className="window__sky" placeholder={<span className={`window__block ${night ? 'is-night' : ''}`}><i className="window__aurora" /></span>} />
            <i className="window__shutter" />
            <span className="ro__label label" aria-hidden="true">{shut ? 'Open the window' : 'Shut the window'}</span>
          </button>
        </div>
        {/* depth 0.25: the postcard string, hanging in front of the wall */}
        <div className="layer layer--string" data-depth="0.25">
          <PostcardString active={open?.kind === 'place' ? open.slug : null} onPick={(slug, i) => { const pt = stringPoint(i, places.length); goTo(pt.x, pt.y + 60, Math.min(ZOOM_MAX, 1.6), { kind: 'place', slug, i }) }} />
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
      <p className="blockout-note label">stand-in art · painted by tools/render.py, collaged by tools/collage.py · slots per docs/ART-BRIEF.md</p>
      <button type="button" className="outside label" onClick={() => { try { sessionStorage.removeItem('arrived') } catch { /* ignore */ } setOpen(null); setArrived(false) }}>outside ↗</button>
      <div className="camctl" role="group" aria-label="Camera">
        <span className="label muted camctl__hint">{zoom > 1.01 ? 'drag to pan · double-click to reset' : 'scroll or pinch to zoom · double-click to jump in'}</span>
        <button type="button" className="camctl__btn" onClick={() => camera.current?.reset()} disabled={zoom <= 1.01} aria-label="Reset the view">{zoom > 1.01 ? `${zoom.toFixed(1)}× · reset` : '1.0×'}</button>
      </div>

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
