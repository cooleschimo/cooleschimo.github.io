import { useEffect } from 'react'
import { startLenis } from './lib/lenis'
import { WatercolorDefs } from './primitives/Watercolor'
import { PaperGrain } from './primitives/PaperGrain'

export function App() {
  useEffect(() => {
    startLenis()
  }, [])
  return (
    <>
      <WatercolorDefs />
      <main id="top">
        {/* sections land here after the §3 decisions */}
      </main>
      <PaperGrain />
    </>
  )
}
