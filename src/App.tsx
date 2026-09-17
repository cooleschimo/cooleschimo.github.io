import { useEffect } from 'react'
import { startLenis } from './lib/lenis'
import { TopBar } from './shell/TopBar'
import { Hero } from './sections/Hero'
import { Work } from './sections/Work'
import { Footer } from './sections/Footer'

export function App() {
  useEffect(() => { startLenis() }, [])
  return (
    <>
      <TopBar />
      <main className="page">
        <Hero />
        <Work />
      </main>
      <Footer />
    </>
  )
}
