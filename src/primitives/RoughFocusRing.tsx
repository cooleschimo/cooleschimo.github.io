import { useLayoutEffect, useRef } from 'react'
import rough from 'roughjs'
import { hashSeed } from '../lib/seed'

/**
 * Drawn focus ring. Render inside any `relative` focusable element; it shows
 * only while the parent has :focus-visible (see paper.css).
 */
export function RoughFocusRing({ seed }: { seed: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    const svg = svgRef.current
    const el = svg?.parentElement
    if (!svg || !el) return
    const draw = () => {
      const w = el.offsetWidth + 12
      const h = el.offsetHeight + 12
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      while (svg.firstChild) svg.removeChild(svg.firstChild)
      const rc = rough.svg(svg)
      svg.appendChild(rc.rectangle(2, 2, w - 4, h - 4, {
        seed: hashSeed(seed + ':focus'), roughness: 1.8, bowing: 1.5,
        stroke: 'var(--rust)', strokeWidth: 2.2,
      }))
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [seed])
  return (
    <svg ref={svgRef} aria-hidden="true" className="rough-focus pointer-events-none absolute overflow-visible"
      style={{ left: -6, top: -6, opacity: 0 }} />
  )
}
