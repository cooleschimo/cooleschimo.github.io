import { useEffect, useState } from 'react'

const cache = new Map<string, Promise<string>>()

/** Fetches an SVG file from /public and returns its markup so its paths can be animated in place. */
export function useInlineSvg(url: string): string | null {
  const [svg, setSvg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!cache.has(url)) cache.set(url, fetch(url).then((r) => (r.ok ? r.text() : '')))
    cache.get(url)!.then((t) => { if (alive) setSvg(t) })
    return () => { alive = false }
  }, [url])
  return svg
}
