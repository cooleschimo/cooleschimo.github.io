import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import items from '../../content/desk.json'
import type { DeskItem, WindowId } from './types'
import { ObjectArt } from './objects'
import { AboutContent, PhotosContent, TravelContent, WorkContent, WritingContent } from '../windows/contents'

const TITLES: Record<WindowId, string> = { about: 'About', work: 'Work', photos: 'Photos', writing: 'Writing', travel: 'Travel' }
const BODIES: Record<WindowId, () => React.JSX.Element> = { about: AboutContent, work: WorkContent, photos: PhotosContent, writing: WritingContent, travel: TravelContent }

/** Phones: the same objects as a scrollable grid; a tap opens a full-height sheet. */
export function MobileDesk() {
  const list = (items as DeskItem[]).filter((i) => i.kind !== 'name')
  const [sheet, setSheet] = useState<WindowId | null>(null)
  const Body = sheet ? BODIES[sheet] : null
  return (
    <div className="mdesk">
      <div className="mdesk__name"><ObjectArt item={{ id: 'name', kind: 'name', x: 0, y: 0, r: 0, w: 0 }} /></div>
      <div className="mdesk__grid">
        {list.map((item) => (
          <button key={item.id} type="button" className="mdesk__tile" onClick={() => item.opens && setSheet(item.opens)} disabled={!item.opens} style={{ rotate: `${item.r / 2}deg` }}>
            <ObjectArt item={item} />
            {item.label && <span className="label mdesk__label">{item.label}</span>}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {sheet && Body && (
          <motion.section key={sheet} className="sheet" role="dialog" aria-label={TITLES[sheet]}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', bounce: 0.1, duration: 0.45 }}>
            <header className="win__bar"><button type="button" className="win__close" onClick={() => setSheet(null)} aria-label="Close" /><span className="win__title label">{TITLES[sheet]}</span></header>
            <div className="win__body"><Body /></div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
