import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'motion/react'
import type { DeskItem } from './types'
import { useAlphaHit } from './useAlphaHit'
import { useReducedMotion } from '../lib/motion-prefs'

type Props = { item: DeskItem; children: ReactNode; onOpen?: () => void; hot: boolean; setHot: (h: boolean) => void; z: number; raise: () => void }

/**
 * One draggable thing on the desk. The motion.div is a zero-size anchor at the object's centre
 * (motion owns its transform for drag/hover); the inner box centres and rotates itself in CSS
 * via --r / --s, which GSAP tweens for Tidy. Only opaque pixels are hot. A press shorter than
 * 400ms that moved less than 10px opens the item; anything else was a drag.
 */
export function DeskObject({ item, children, onOpen, hot, setHot, z, raise }: Props) {
  const reduced = useReducedMotion()
  const hitTest = useAlphaHit(item.kind === 'image' || item.kind === 'sticker' ? item.src : undefined)
  const inner = useRef<HTMLDivElement>(null)
  const press = useRef<{ t: number; x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const localUV = (e: React.PointerEvent) => {
    const el = inner.current
    if (!el) return { u: 0.5, v: 0.5 }
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const deg = parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0
    const s = parseFloat(getComputedStyle(el).getPropertyValue('--s')) || 1
    const a = (-deg * Math.PI) / 180
    const dx = e.clientX - cx, dy = e.clientY - cy
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a)
    const worldScale = worldScaleOf(el)
    return { u: lx / (el.offsetWidth * s * worldScale) + 0.5, v: ly / (el.offsetHeight * s * worldScale) + 0.5 }
  }

  return (
    <motion.div
      className={`desk-object ${hot ? 'is-hot' : ''} ${dragging ? 'is-dragging' : ''} ${item.opens ? 'can-open' : ''}`}
      data-id={item.id}
      style={{ left: `calc(50% + ${item.x}px)`, top: `calc(50% + ${item.y}px)`, zIndex: z }}
      drag dragMomentum={false} dragElastic={0}
      onDragStart={() => { setDragging(true); raise() }}
      onDragEnd={() => setDragging(false)}
      whileHover={reduced ? undefined : { scale: 1.03 }}
      whileDrag={{ scale: 1.05 }}
      transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
      onPointerMove={(e) => { const { u, v } = localUV(e); setHot(hitTest(u, v)) }}
      onPointerLeave={() => setHot(false)}
      onPointerDown={(e) => { const { u, v } = localUV(e); if (!hitTest(u, v)) return; press.current = { t: performance.now(), x: e.clientX, y: e.clientY }; raise() }}
      onPointerUp={(e) => {
        const p = press.current; press.current = null
        if (!p || !onOpen) return
        if (performance.now() - p.t < 400 && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 10) onOpen()
      }}
    >
      <div ref={inner} className="desk-object__inner" style={{ width: item.w, '--r': `${item.r}deg`, '--s': 1 } as CSSProperties}>
        {children}
        {item.label && <span className="desk-object__label label">{item.label}</span>}
      </div>
    </motion.div>
  )
}

/** The desk world is scaled to fit the viewport; read that scale from the nearest .desk__world. */
function worldScaleOf(el: HTMLElement): number {
  const world = el.closest<HTMLElement>('.desk__world')
  if (!world) return 1
  const m = getComputedStyle(world).transform
  const match = /matrix\(([^,]+),/.exec(m)
  return match ? parseFloat(match[1]) || 1 : 1
}
