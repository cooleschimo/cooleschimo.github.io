import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { makePaintMaterial } from './paint'

/** Public art, resolved against the build base so the site works from a subfolder. */
export const B = import.meta.env.BASE_URL.replace(/\/$/, '')
export const paper = (name: string) => `${B}/art/paper/${name}.webp`

export type PieceControl = { reveal: (to: number, d?: number) => void; dissolve: (to: number, d?: number) => void; mat: THREE.ShaderMaterial }

export type PieceProps = {
  url: string; width: number; position: [number, number, number]; rotation?: [number, number, number]
  delay?: number; flip?: boolean; opacity?: number; tint?: THREE.Color
  onHover?: (h: boolean) => void; onClick?: () => void
  control?: React.MutableRefObject<PieceControl | null>
  renderOrder?: number
}

/** A flat painted picture on a plane. Arrives as ink and fills with watercolour; can dissolve into pigment. */
export function Piece({ url, width, position, rotation = [0, 0, 0], delay = 0, flip = false, opacity = 1, tint, onHover, onClick, control, renderOrder }: PieceProps) {
  const tex = useTexture(url); tex.colorSpace = THREE.SRGBColorSpace
  const mat = useMemo(() => makePaintMaterial(tex), [tex])
  const img = tex.image as HTMLImageElement
  const aspect = img.height / img.width
  useEffect(() => {
    mat.uniforms.uReveal.value = 0
    const tw = gsap.to(mat.uniforms.uReveal, { value: 1, duration: prefersReducedMotion() ? 0.3 : 1.8, delay, ease: 'power2.out' })
    if (control) control.current = {
      mat,
      reveal: (to, d = 1.6) => { gsap.killTweensOf(mat.uniforms.uReveal); gsap.to(mat.uniforms.uReveal, { value: to, duration: d, ease: 'power2.out' }) },
      dissolve: (to, d = 1.4) => { gsap.killTweensOf(mat.uniforms.uDissolve); gsap.to(mat.uniforms.uDissolve, { value: to, duration: d, ease: 'power2.in' }) },
    }
    return () => { tw.kill() }
  }, [mat, delay, control])
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt; mat.uniforms.uFlip.value = flip ? 1 : 0; mat.uniforms.uOpacity.value = opacity
    if (tint) (mat.uniforms.uTint.value as THREE.Color).lerp(tint, Math.min(1, dt * 3))
  })
  return (
    <mesh position={position} rotation={rotation} material={mat} renderOrder={renderOrder}
      onPointerOver={onHover ? (e) => { e.stopPropagation(); onHover(true) } : undefined} onPointerOut={onHover ? () => onHover(false) : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}>
      <planeGeometry args={[width, width * aspect]} />
    </mesh>
  )
}
