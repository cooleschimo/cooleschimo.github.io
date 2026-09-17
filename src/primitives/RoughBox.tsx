import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import rough from 'roughjs'
import { hashSeed } from '../lib/seed'

type Props = {
  /** Stable key for the seed so the wobble never re-jitters. */
  seed: string
  children?: ReactNode
  className?: string
  style?: CSSProperties
  stroke?: string
  strokeWidth?: number
  roughness?: number
  bowing?: number
  fill?: string
  fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed' | 'zigzag-line'
  /** Rounded "paper" corners drawn as a wobbly closed path instead of a rect. */
  inset?: number
  as?: 'div' | 'section' | 'article' | 'figure' | 'button' | 'li'
  redrawKey?: unknown
}

/**
 * A hand-drawn frame around its children. The outline is a rough.js path in an
 * absolutely-positioned SVG that follows the element's size via ResizeObserver.
 */
export function RoughBox({
  seed, children, className = '', style, stroke = 'var(--ink)',
  strokeWidth, roughness = 1.4, bowing = 1.2, fill, fillStyle = 'hachure',
  inset = 2, as: Tag = 'div', redrawKey,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const svg = svgRef.current
    if (!el || !svg) return
    const draw = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (!w || !h) return
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      while (svg.firstChild) svg.removeChild(svg.firstChild)
      const rc = rough.svg(svg)
      const sw = strokeWidth ?? (Number(getComputedStyle(document.documentElement).getPropertyValue("--stroke-medium")) || 1.6)
      const node = rc.rectangle(inset, inset, w - inset * 2, h - inset * 2, {
        seed: hashSeed(seed), roughness, bowing, stroke, strokeWidth: sw,
        fill, fillStyle, fillWeight: sw * 0.5, hachureGap: sw * 4,
      })
      svg.appendChild(node)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [seed, stroke, strokeWidth, roughness, bowing, fill, fillStyle, inset, redrawKey])

  return (
    <Tag ref={ref as never} className={`relative ${className}`} style={style}>
      <svg ref={svgRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible" />
      <div className="relative">{children}</div>
    </Tag>
  )
}
