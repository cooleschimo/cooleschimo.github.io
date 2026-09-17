import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Art } from './useArt'
import { ART } from './art'

const STEMS = [
  { n: 1, h: 92, c: '#b98a7a' }, { n: 2, h: 118, c: '#9aa88c' }, { n: 3, h: 74, c: '#d1b27a' },
  { n: 4, h: 104, c: '#8f9fb0' }, { n: 5, h: 86, c: '#c9968a' }, { n: 6, h: 128, c: '#a7a06f' },
]
const KEY = 'vase'

/** Six stems lie on the table; click one to put it in the vase, click it in the vase to take it out. */
export function Vase() {
  const [inVase, setInVase] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[2,5]') } catch { return [2, 5] } })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(inVase)) } catch { /* ignore */ } }, [inVase])
  const toggle = (n: number) => setInVase((v) => v.includes(n) ? v.filter((x) => x !== n) : [...v, n])
  return (
    <div className="vase" aria-label="Vase. Click a stem on the table to put it in, click a stem in the vase to take it out.">
      <div className="vase__stems" aria-hidden="false">
        <AnimatePresence>
          {inVase.map((n, i) => { const s = STEMS[n - 1]; return (
            <motion.button key={n} type="button" className="stem stem--in" title="Take out" onClick={() => toggle(n)}
              style={{ left: 30 + i * 12 - inVase.length * 5, height: s.h, ['--c' as string]: s.c, rotate: (i - inVase.length / 2) * 7 }}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}>
              <Art src={ART.flower(n)} placeholder={<span className="stem__block" />} />
            </motion.button>
          ) })}
        </AnimatePresence>
      </div>
      <Art src={ART.vase} placeholder={<div className="vase__body block block--3" />} />
      <div className="vase__tray" role="group" aria-label="Stems on the table">
        {STEMS.filter((s) => !inVase.includes(s.n)).map((s, i) => (
          <button key={s.n} type="button" className="stem stem--out" title="Put in the vase" onClick={() => toggle(s.n)} style={{ left: i * 30, ['--c' as string]: s.c, height: s.h * 0.5 }}>
            <Art src={ART.flower(s.n)} placeholder={<span className="stem__block" />} />
          </button>
        ))}
      </div>
    </div>
  )
}
