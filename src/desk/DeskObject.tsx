import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import type { DeskItem } from './types'
import { useAlphaHit } from './useAlphaHit'
import { useReducedMotion } from '../lib/motion-prefs'

type Props = { item: DeskItem; children: ReactNode; onOpen?: () => void; hot: boolean; setHot: (h: boolean) => void; z: number; raise: () => void }

/**
 * One draggable thing on the desk. Only its opaque pixels are hot (cursor, lift).
 * A press shorter than 400ms that moved less than 10px opens the item; otherwise it was a drag.
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
    const a = (-item.r * Math.PI) / 180
    const dx = e.clientX - cx, dy = e.clientY - cy
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a)
    // un-rotated box size: bounding rect of a rotated box is bigger, so derive from offsetWidth/Height
    const w = el.offsetWidth, h = el.offsetHeight
    return { u: lx / w + 0.5, v: ly / h + 0.5 }
  }

  return (
    <motion.div
      className={`desk-object ${hot ? 'is-hot' : ''} ${dragging ? 'is-dragging' : ''} ${item.opens ? 'can-open' : ''}`}
      data-id={item.id}
      style={{ left: `calc(50% + ${item.x}px)`, top: `calc(50% + ${item.y}px)`, width: item.w, zIndex: z, rotate: item.r }}
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
      <div ref={inner} className="desk-object__inner">{children}</div>
      {item.label && <span className="desk-object__label label">{item.label}</span>}
    </motion.div>
  )
}
