import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import { Sheet } from '../sheets/Sheet'
import { About, Photos } from '../sheets/contents'
import { DesignPanel, Magazine, PlacesSpread, Projects } from '../sheets/room'

type Open = { kind: 'about' } | { kind: 'photos' } | { kind: 'projects' } | { kind: 'design'; n: number } | { kind: 'essay'; slug: string } | { kind: 'places' } | null

/** if a scene throws, say what it said instead of showing nothing */
class SceneBoundary extends Component<{ children: ReactNode }, { msg: string | null }> {
  state = { msg: null as string | null }
  static getDerivedStateFromError(e: unknown) { return { msg: e instanceof Error ? `${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}` : String(e) } }
  componentDidCatch(e: unknown) { console.error(e) }
  render() { return this.state.msg ? <pre className="label" style={{ position: 'fixed', top: 8, left: 8, zIndex: 99, whiteSpace: 'pre-wrap', maxWidth: '70vw', background: 'rgba(255,255,255,0.85)', padding: '6px 8px', borderRadius: 6 }}>something broke: {this.state.msg}</pre> : this.props.children }
}

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
          <SceneBoundary><Outside onEnter={() => setArrived(true)} onAbout={() => setOpen({ kind: 'about' })} /></SceneBoundary>
        </Suspense>
      )}
      {arrived && (
        <Suspense fallback={null}>
          <SceneBoundary><Inside opened={opened} shut={shut} onShutter={() => setShut(v => !v)} onOpen={onOpen} /></SceneBoundary>
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
