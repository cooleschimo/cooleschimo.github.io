import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Sheet } from '../sheets/Sheet'
import { Postcard } from '../sheets/Postcard'
import { About, Photos, Writing } from '../sheets/contents'
import places from '../../content/places.json'

type Open = { kind: 'about' } | { kind: 'photos' } | { kind: 'writing' } | { kind: 'place'; slug: string; i: number } | null

const Outside = lazy(() => import('../snow/Letters').then(m => ({ default: m.Letters })))
const Inside = lazy(() => import('../snow/Inside').then(m => ({ default: m.Inside })))

/**
 * The site: outside (the letter snowfield with the igloo) until you go in; inside, the paper-diorama room
 * with one table of things to touch. Sheets open over either. Both scenes are lazy three.js chunks.
 */
export function Room() {
  const [open, setOpen] = useState<Open>(null)
  const [arrived, setArrived] = useState<boolean>(() => { try { return sessionStorage.getItem('arrived') === '1' } catch { return false } })
  const [shut, setShut] = useState(false)
  const [nextPlace, setNextPlace] = useState(0)
  useEffect(() => { if (arrived) { try { sessionStorage.setItem('arrived', '1') } catch { /* ignore */ } } }, [arrived])

  const close = useCallback(() => setOpen(null), [])
  const pick = places.find((p) => open?.kind === 'place' && p.slug === open.slug)
  const opened = open?.kind === 'photos' ? 'camera' : open?.kind === 'writing' ? 'notebook' : open?.kind === 'place' ? 'postcards' : null

  return (
    <div className={`room ${open ? 'room--dim' : ''} ${arrived ? '' : 'room--arriving'} ${shut ? 'room--shut' : ''}`}>
      {!arrived && (
        <Suspense fallback={<div className="snow" aria-hidden="true" />}>
          <Outside onEnter={() => setArrived(true)} onAbout={() => setOpen({ kind: 'about' })} />
        </Suspense>
      )}
      {arrived && (
        <Suspense fallback={null}>
          <Inside opened={opened} shut={shut} onShutter={() => setShut(v => !v)} onOpen={(thing) => {
            if (thing === 'camera') setOpen({ kind: 'photos' })
            else if (thing === 'notebook') setOpen({ kind: 'writing' })
            else { const i = nextPlace % places.length; setNextPlace(i + 1); setOpen({ kind: 'place', slug: places[i].slug, i }) }
          }} />
        </Suspense>
      )}

      <button type="button" className="name label" onClick={() => setOpen({ kind: 'about' })}>Chimin Liu<span className="muted"> · engineer, photographer, painter</span></button>
      {arrived && <button type="button" className="outside label" onClick={() => { try { sessionStorage.removeItem('arrived') } catch { /* ignore */ } setOpen(null); setArrived(false) }}>outside ↗</button>}

      <AnimatePresence>
        {pick && open?.kind === 'place' && (
          <motion.div key={pick.slug} className="pulled" role="dialog" aria-modal="true" aria-label={`Postcard from ${pick.name}`}
            initial={{ opacity: 0, scale: 0.3, x: 260, y: 120, rotate: -6 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }} exit={{ opacity: 0, scale: 0.4, x: 260, y: 120 }}
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
