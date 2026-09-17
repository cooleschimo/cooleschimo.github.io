import { AnimatePresence } from 'motion/react'
import type { WindowId } from '../desk/types'
import { WindowFrame } from './WindowFrame'
import { AboutContent, PhotosContent, TravelContent, WorkContent, WritingContent } from './contents'

const TITLES: Record<WindowId, string> = { about: 'About', work: 'Work', photos: 'Photos', writing: 'Writing', travel: 'Travel' }
const BODIES: Record<WindowId, () => React.JSX.Element> = { about: AboutContent, work: WorkContent, photos: PhotosContent, writing: WritingContent, travel: TravelContent }

export type OpenWindow = { id: WindowId; z: number }

export function WindowManager({ open, close, raise }: { open: OpenWindow[]; close: (id: WindowId) => void; raise: (id: WindowId) => void }) {
  return (
    <AnimatePresence>
      {open.map((w, i) => {
        const Body = BODIES[w.id]
        return (
          <WindowFrame key={w.id} title={TITLES[w.id]} onClose={() => close(w.id)} z={w.z} raise={() => raise(w.id)} index={i}>
            <Body />
          </WindowFrame>
        )
      })}
    </AnimatePresence>
  )
}
