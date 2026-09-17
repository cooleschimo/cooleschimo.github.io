import { useRef, type ReactNode } from 'react'
import { motion, useDragControls } from 'motion/react'
import { useReducedMotion } from '../lib/motion-prefs'

type Props = { title: string; children: ReactNode; onClose: () => void; z: number; raise: () => void; index: number }

/** A small draggable window on the desk: title bar with a close dot, scrollable body. */
export function WindowFrame({ title, children, onClose, z, raise, index }: Props) {
  const reduced = useReducedMotion()
  const controls = useDragControls()
  const constraints = useRef<HTMLElement | null>(typeof document !== 'undefined' ? document.body : null)
  const offset = 28 * index
  return (
    <motion.section
      className="win" style={{ zIndex: z, left: `calc(50% + ${-260 + offset}px)`, top: `calc(50% + ${-220 + offset}px)` }}
      role="dialog" aria-label={title}
      drag dragControls={controls} dragListener={false} dragMomentum={false} dragElastic={0} dragConstraints={constraints}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.42 }}
      onPointerDown={raise}
    >
      <header className="win__bar" onPointerDown={(e) => { controls.start(e); raise() }}>
        <button type="button" className="win__close" onClick={onClose} aria-label={`Close ${title}`} onPointerDown={(e) => e.stopPropagation()} />
        <span className="win__title label">{title}</span>
      </header>
      <div className="win__body">{children}</div>
    </motion.section>
  )
}
