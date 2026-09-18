import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '../lib/motion-prefs'

/** A cream card that rises over the dimmed room. Escape closes; focus moves in and back out. */
export function Sheet({ title, onClose, children, wide = false, dock }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; dock?: 'right' }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, a, [tabindex]')?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus() }
  }, [onClose])
  return (
    <motion.div className={`sheet-scrim ${dock ? `sheet-scrim--${dock}` : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={onClose}>
      <motion.section ref={ref} className={`sheet ${wide ? 'sheet--wide' : ''} ${dock ? `sheet--dock-${dock}` : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        initial={reduced ? { opacity: 0 } : dock ? { opacity: 0, x: 60 } : { opacity: 0, y: 24 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={reduced ? { opacity: 0 } : dock ? { opacity: 0, x: 40 } : { opacity: 0, y: 16 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
        <header className="sheet__bar"><button type="button" className="sheet__close" onClick={onClose} aria-label={`Close ${title}`} /><span className="label">{title}</span></header>
        <div className="sheet__body">{children}</div>
      </motion.section>
    </motion.div>
  )
}
