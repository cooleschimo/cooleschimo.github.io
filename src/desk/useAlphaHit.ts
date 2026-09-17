import { useCallback, useEffect, useRef } from 'react'

/**
 * Pixel-accurate hover for a cut-out PNG: only the opaque part of the image is "hot".
 * Draws the image once into an offscreen canvas and samples alpha at the pointer.
 */
export function useAlphaHit(src?: string) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const ready = useRef(false)

  useEffect(() => {
    if (!src) return
    ready.current = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      const scale = Math.min(1, 256 / Math.max(img.width, img.height))
      c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale))
      c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height)
      canvas.current = c; ready.current = true
    }
    img.src = src
  }, [src])

  /** `u`,`v` in 0..1 image space. Returns true when the pixel is opaque enough (or the image is not a cut-out). */
  return useCallback((u: number, v: number) => {
    if (!src) return true
    const c = canvas.current
    if (!c || !ready.current) return true
    if (u < 0 || v < 0 || u > 1 || v > 1) return false
    const a = c.getContext('2d', { willReadFrequently: true })!.getImageData(Math.min(c.width - 1, Math.floor(u * c.width)), Math.min(c.height - 1, Math.floor(v * c.height)), 1, 1).data[3]
    return a > 24
  }, [src])
}
