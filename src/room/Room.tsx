import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Sheet } from '../sheets/Sheet'
import { About, Photos } from '../sheets/contents'
import { DesignPanel, Magazine, PlacesSpread, Projects } from '../sheets/room'

type Open = { kind: 'about' } | { kind: 'photos' } | { kind: 'projects' } | { kind: 'design'; n: number } | { kind: 'essay'; slug: string } | { kind: 'places' } | null

const Outside = lazy(() => import('../snow/Letters').then(m => ({ default: m.Letters })))
const Inside = lazy(() => import('../snow/Inside').then(m => ({ default: m.Inside })))

/**
 * The site: outside (the letter snowfield with the igloo) until you go in; inside, the room walked in three stops.
 * What you touch in the room opens over it: the laptop's projects, a pin's design project in a panel on the right,
 * an essay as a magazine, the postcards spread into every place, the camera's photographs, the paints (about).
 */
export function Room() {
  const [open, setOpen] = useState<Open>(null)
  const [arrived, setArrived] = useState<boolean>(() => { try { return sessionStorage.getItem('arrived') === '1' } catch { return false } })
  const [shut, setShut] = useState(false)
  useEffect(() => { if (arrived) { try { sessionStorage.setItem('arrived', '1') } catch { /* ignore */ } } }, [arrived])

  const close = useCallback(() => setOpen(null), [])
  const opened = open?.kind === 'photos' ? 'camera' : open?.kind === 'projects' ? 'laptop' : open?.kind === 'design' ? `pin:${open.n}` : open?.kind === 'essay' ? `magazine:${open.slug}` : open?.kind === 'places' ? 'postcards' : open?.kind === 'about' ? 'paints' : null
  const onOpen = (thing: string) => {
    if (thing === 'camera') setOpen({ kind: 'photos' })
    else if (thing === 'laptop') setOpen({ kind: 'projects' })
    else if (thing.startsWith('pin:')) setOpen({ kind: 'design', n: Number(thing.slice(4)) })
    else if (thing.startsWith('magazine:')) setOpen({ kind: 'essay', slug: thing.slice(9) })
    else if (thing === 'postcards') setOpen({ kind: 'places' })
    else if (thing === 'paints') setOpen({ kind: 'about' })
  }

  return (
    <div className={`room ${open ? 'room--dim' : ''} ${arrived ? '' : 'room--arriving'} ${shut ? 'room--shut' : ''}`}>
      {!arrived && (
        <Suspense fallback={<div className="snow" aria-hidden="true" />}>
          <Outside onEnter={() => setArrived(true)} onAbout={() => setOpen({ kind: 'about' })} />
        </Suspense>
      )}
      {arrived && (
        <Suspense fallback={null}>
          <Inside opened={opened} shut={shut} onShutter={() => setShut(v => !v)} onOpen={onOpen} />
        </Suspense>
      )}

      <button type="button" className="name label" onClick={() => setOpen({ kind: 'about' })}>Chimin Liu<span className="muted"> · engineer, photographer, painter</span></button>
      {arrived && <button type="button" className="outside label" onClick={() => { try { sessionStorage.removeItem('arrived') } catch { /* ignore */ } setOpen(null); setArrived(false) }}>outside ↗</button>}

      <AnimatePresence>
        {open?.kind === 'about' && <Sheet key="about" title="About" onClose={close}><About /></Sheet>}
        {open?.kind === 'photos' && <Sheet key="photos" title="Photographs" onClose={close}><Photos /></Sheet>}
        {open?.kind === 'projects' && <Projects key="projects" onClose={close} />}
        {open?.kind === 'design' && <DesignPanel key={`design${open.n}`} n={open.n} onClose={close} />}
        {open?.kind === 'essay' && <Magazine key={`essay${open.slug}`} slug={open.slug} onClose={close} />}
        {open?.kind === 'places' && <PlacesSpread key="places" onClose={close} />}
      </AnimatePresence>
    </div>
  )
}
