import { useEffect, useState } from 'react'

const known = new Map<string, boolean>()
const pending = new Map<string, Promise<boolean>>()

/** True once the image at `src` is known to exist (HEAD-free: an Image load probe, cached). */
export function useArt(src?: string): boolean {
  const [ok, setOk] = useState(() => (src ? known.get(src) ?? false : false))
  useEffect(() => {
    if (!src) return
    if (known.has(src)) { setOk(known.get(src)!); return }
    if (!pending.has(src)) {
      pending.set(src, new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src }))
    }
    let alive = true
    pending.get(src)!.then((v) => { known.set(src, v); if (alive) setOk(v) })
    return () => { alive = false }
  }, [src])
  return ok
}

/** Renders the art if it exists, else the blockout placeholder. */
export function Art({ src, alt = '', className = '', placeholder }: { src: string; alt?: string; className?: string; placeholder: React.ReactNode }) {
  const ok = useArt(src)
  return ok ? <img src={src} alt={alt} className={className} draggable={false} /> : <>{placeholder}</>
}
