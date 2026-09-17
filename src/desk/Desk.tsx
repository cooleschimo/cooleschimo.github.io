import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import items from '../../content/desk.json'
import type { DeskItem, WindowId } from './types'
import { DeskObject } from './DeskObject'
import { ObjectArt } from './objects'
import { WindowManager, type OpenWindow } from '../windows/WindowManager'

const DESK_W = 1440

/** The desk: a fixed world scaled to the viewport, objects dealt in from the centre, each draggable, some open a window. */
export function Desk() {
  const list = items as DeskItem[]
  const world = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hot, setHot] = useState<string | null>(null)
  const [zs, setZs] = useState<Record<string, number>>({})
  const zTop = useRef(10)
  const [open, setOpen] = useState<OpenWindow[]>([])
  const wTop = useRef(100)
  const [tidy, setTidy] = useState(false)

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 32) / DESK_W, (window.innerHeight - 120) / 820))
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit)
  }, [])

  // Deal the deck: everything starts in a pile under the name and flies to its place.
  useEffect(() => {
    const w = world.current
    if (!w || prefersReducedMotion()) return
    const els = w.querySelectorAll<HTMLElement>('.desk-object:not([data-id="name"])')
    const tl = gsap.timeline({ delay: 0.15 })
    tl.from(els, {
      x: (_i, el) => -(parseFloat((el as HTMLElement).dataset.x ?? '0')) * 0.9,
      y: (_i, el) => -(parseFloat((el as HTMLElement).dataset.y ?? '0')) * 0.9 - 40,
      scale: 0.7, opacity: 0, rotate: '+=12',
      duration: 1.1, ease: 'expo.out', stagger: 0.045, clearProps: 'x,y,scale,opacity',
    })
    return () => { tl.kill() }
  }, [])

  const raise = useCallback((id: string) => setZs((z) => ({ ...z, [id]: ++zTop.current })), [])
  const openWin = useCallback((id: WindowId) => setOpen((o) => o.some((w) => w.id === id) ? o.map((w) => w.id === id ? { ...w, z: ++wTop.current } : w) : [...o, { id, z: ++wTop.current }]), [])
  const closeWin = useCallback((id: WindowId) => setOpen((o) => o.filter((w) => w.id !== id)), [])
  const raiseWin = useCallback((id: WindowId) => setOpen((o) => o.map((w) => w.id === id ? { ...w, z: ++wTop.current } : w)), [])

  // Tidy mode: a neat grid instead of the scatter (Jackie Hu's broom).
  const placed = useMemo((): (DeskItem & { s?: number })[] => {
    if (!tidy) return list
    const movable = list.filter((i) => i.kind !== 'name')
    const cols = 6, cw = 235, rh = 235
    return list.map((i) => {
      if (i.kind === 'name') return { ...i, y: -330, s: 1 }
      const idx = movable.indexOf(i); const c = idx % cols, r = Math.floor(idx / cols)
      return { ...i, x: (c - (cols - 1) / 2) * cw, y: -100 + r * rh, r: 0, s: Math.min(1, 200 / i.w) }
    })
  }, [tidy, list])

  useEffect(() => {
    const w = world.current
    if (!w) return
    placed.forEach((i) => {
      const el = w.querySelector<HTMLElement>(`.desk-object[data-id="${i.id}"]`)
      if (!el) return
      gsap.to(el, { left: `calc(50% + ${i.x}px)`, top: `calc(50% + ${i.y}px)`, rotate: i.r, scale: i.s ?? 1, duration: prefersReducedMotion() ? 0 : 0.7, ease: 'power3.inOut', overwrite: 'auto' })
    })
  }, [placed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen((o) => o.slice(0, -1)) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="desk" style={{ cursor: hot ? 'pointer' : undefined }}>
      <div ref={world} className="desk__world" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {list.map((item) => (
          <DeskObject key={item.id} item={item} hot={hot === item.id} setHot={(h) => setHot(h ? item.id : (hot === item.id ? null : hot))}
            z={zs[item.id] ?? (item.kind === 'name' ? 5 : 1)} raise={() => raise(item.id)}
            onOpen={item.opens ? () => openWin(item.opens!) : undefined}>
            <span data-x={item.x} data-y={item.y} hidden />
            <ObjectArt item={item} />
          </DeskObject>
        ))}
      </div>
      <div className="desk__modes" role="group" aria-label="Desk layout">
        <button type="button" className={`desk__mode ${!tidy ? 'is-on' : ''}`} onClick={() => setTidy(false)} aria-pressed={!tidy} title="As I left it">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 17l3-9 4 6 3-4 4 7" /></svg><span className="label">Messy</span>
        </button>
        <button type="button" className={`desk__mode ${tidy ? 'is-on' : ''}`} onClick={() => setTidy(true)} aria-pressed={tidy} title="Tidy up">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg><span className="label">Tidy</span>
        </button>
      </div>
      <WindowManager open={open} close={closeWin} raise={raiseWin} />
    </div>
  )
}
