import { useEffect } from 'react'
import { startLenis } from './lib/lenis'
import { WatercolorDefs } from './primitives/Watercolor'
import { PaperGrain } from './primitives/PaperGrain'
import { SkyBand } from './shell/SkyBand'
import { ModeToggle } from './shell/ModeToggle'
import { MiniMap } from './shell/MiniMap'
import { Hero } from './sections/Hero'
import { Work } from './sections/Work'

export function App() {
  useEffect(() => { startLenis() }, [])
  return (
    <>
      <WatercolorDefs />
      <SkyBand />
      <ModeToggle />
      <main className="page">
        <Hero />
        <Work />
      </main>
      <MiniMap />
      <PaperGrain />
    </>
  )
}
