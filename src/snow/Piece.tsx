import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { BONES, makePaintMaterial } from './paint'

/** Public art, resolved against the build base so the site works from a subfolder. */
export const B = import.meta.env.BASE_URL.replace(/\/$/, '')
export const paper = (name: string) => `${B}/art/paper/${name}.webp`

export type PieceControl = { reveal: (to: number, d?: number) => void; dissolve: (to: number, d?: number) => void; mat: THREE.ShaderMaterial }

/** A region of the picture that turns about a pivot. All in picture uv (0–1, origin bottom left). */
export type Bone = { pivot: [number, number]; region: [number, number, number, number] }

/** Per-frame animation state for a puppet, written by the scene and read here without re-rendering. */
export type Pose = { angles: number[]; breath: number; blink: number }

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
  /** the light colour, for the glisten */
  light?: THREE.Color
  /** take the scene's fog */
  fog?: boolean
  /** 0–1: how much the picture gives up its own contrast to the snow colour (more in its shadows) */
  frost?: number
  /** strength of the dry speckle over the picture */
  grain?: number
  /** the bright parts sparkle like the snow */
  glisten?: number
  /** puppet: bones (at most BONES) and the pose that drives them each frame */
  bones?: Bone[]
  pose?: React.MutableRefObject<Pose>
  /** an eye that can blink: centre and radii in picture uv */
  eye?: [number, number, number, number]
}

/** A painted picture standing on a plane. Arrives as ink and fills with watercolour; can dissolve into pigment; can be a puppet. */
export function Piece({ url, width, position, rotation = [0, 0, 0], delay = 0, flip = false, opacity = 1, tint, onHover, onClick, control, renderOrder, solid = false, quaternion, sink = 0, snow, light, fog = false, frost = 0, grain = 0, glisten = 0, bones, pose, eye }: PieceProps) {
  const tex = useTexture(url); tex.colorSpace = THREE.SRGBColorSpace
  const scene = useThree(s => s.scene)
  const img = tex.image as HTMLImageElement
  const aspect = img.height / img.width
  const mat = useMemo(() => {
    const m = makePaintMaterial(tex)
    // a solid piece writes depth and draws nothing half-transparent, so its edge has no pale rim
    if (solid) { m.depthWrite = true; m.transparent = false; m.uniforms.uCut.value = 0.5 }
    return m
  }, [tex, solid])
  useEffect(() => {
    const u = mat.uniforms; u.uSize.value.set(width, width * aspect)
    if (bones) bones.slice(0, BONES).forEach((b, i) => { u.uPivot.value[i].set(b.pivot[0], b.pivot[1]); u.uRegion.value[i].set(b.region[0], b.region[1], b.region[2], b.region[3]) })
    if (eye) u.uEye.value.set(eye[0], eye[1], eye[2], eye[3])
  }, [mat, width, aspect, bones, eye])
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
    u.uTime.value += dt; u.uFlip.value = flip ? 1 : 0; u.uOpacity.value = opacity; u.uSink.value = sink; u.uFrost.value = frost; u.uGrain.value = grain; u.uGlisten.value = glisten
    if (tint) (u.uTint.value as THREE.Color).lerp(tint, Math.min(1, dt * 3))
    if (snow) (u.uSnow.value as THREE.Color).copy(snow)
    if (light) (u.uLight.value as THREE.Color).copy(light)
    const f = scene.fog as THREE.Fog | null
    if (fog && f) { u.fogColor.value.copy(f.color); u.fogNear.value = f.near; u.fogFar.value = f.far }
    if (pose) { const p = pose.current; const ang = u.uAngle.value as Float32Array; for (let i = 0; i < BONES; i++) ang[i] = p.angles[i] || 0; u.uBreath.value = p.breath; u.uBlink.value = p.blink }
  })
  const seg = bones ? 48 : 1
  return (
    <mesh position={position} rotation={rotation} quaternion={quaternion} material={mat} renderOrder={renderOrder}
      onPointerOver={onHover ? (e) => { e.stopPropagation(); onHover(true) } : undefined} onPointerOut={onHover ? () => onHover(false) : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}>
      <planeGeometry args={[width, width * aspect, seg, seg]} />
    </mesh>
  )
}
