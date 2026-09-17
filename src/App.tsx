import { useEffect, useState } from 'react'
import { Desk } from './desk/Desk'
import { MobileDesk } from './desk/MobileDesk'
import { ModeToggle } from './shell/ModeToggle'

export function App() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1024px)')
    const on = () => setMobile(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on)
  }, [])
  return (
    <>
      <div className="corner corner--tl label">Chimin Liu</div>
      <div className="corner corner--tr"><ModeToggle /></div>
      <main>{mobile ? <MobileDesk /> : <Desk />}</main>
    </>
  )
}
