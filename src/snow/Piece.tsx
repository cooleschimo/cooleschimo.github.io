import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
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
  /** write depth, so snow and other solid things in front can hide it */
  solid?: boolean
  quaternion?: THREE.Quaternion
  /** how much of the picture's height (0–1) blends into the snow colour at the bottom */
  sink?: number
  /** the snow colour the sunk part takes */
  snow?: THREE.Color
  /** take the scene's fog */
  fog?: boolean
}

/** A painted picture standing on a plane. Arrives as ink and fills with watercolour; can dissolve into pigment. */
export function Piece({ url, width, position, rotation = [0, 0, 0], delay = 0, flip = false, opacity = 1, tint, onHover, onClick, control, renderOrder, solid = false, quaternion, sink = 0, snow, fog = false }: PieceProps) {
  const tex = useTexture(url); tex.colorSpace = THREE.SRGBColorSpace
  const scene = useThree(s => s.scene)
  const mat = useMemo(() => {
    const m = makePaintMaterial(tex)
    // a solid piece writes depth and draws nothing half-transparent, so its edge has no pale rim
    if (solid) { m.depthWrite = true; m.transparent = false; m.uniforms.uCut.value = 0.5 }
    return m
  }, [tex, solid])
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
    const u = mat.uniforms
    u.uTime.value += dt; u.uFlip.value = flip ? 1 : 0; u.uOpacity.value = opacity; u.uSink.value = sink
    if (tint) (u.uTint.value as THREE.Color).lerp(tint, Math.min(1, dt * 3))
    if (snow) (u.uSnow.value as THREE.Color).copy(snow)
    const f = scene.fog as THREE.Fog | null
    if (fog && f) { u.fogColor.value.copy(f.color); u.fogNear.value = f.near; u.fogFar.value = f.far }
  })
  return (
    <mesh position={position} rotation={rotation} quaternion={quaternion} material={mat} renderOrder={renderOrder}
      onPointerOver={onHover ? (e) => { e.stopPropagation(); onHover(true) } : undefined} onPointerOut={onHover ? () => onHover(false) : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}>
      <planeGeometry args={[width, width * aspect]} />
    </mesh>
  )
}
