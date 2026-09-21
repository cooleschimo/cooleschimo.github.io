import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { BONES, makePaintMaterial } from './paint'

/** Public art, resolved against the build base so the site works from a subfolder. */
export const B = import.meta.env.BASE_URL.replace(/\/$/, '')
export const paper = (name: string) => `${B}/art/paper/${name}.webp`

/**
 * A picture, loaded for React suspense: fetched (so a failure has a status to report), tried four times with a pause
 * between, decoded, then a texture. The plain image loader gave up on the first dropped request with no reason.
 */
type ArtEntry = { status: 'pending' | 'done' | 'error'; promise: Promise<void>; tex?: THREE.Texture; error?: Error }
const artCache = new Map<string, ArtEntry>()
async function loadArt(url: string): Promise<THREE.Texture> {
  let last: unknown
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const blob = await r.blob(); const img = new Image(); img.src = URL.createObjectURL(blob); await img.decode()
      const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; return tex
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 500 * (i + 1))) }
  }
  throw new Error(`could not load ${url} after 4 tries: ${last instanceof Error ? last.message : String(last)}`)
}
export function useArt(url: string): THREE.Texture {
  let e = artCache.get(url)
  if (!e) { const entry: ArtEntry = { status: 'pending', promise: Promise.resolve() }; entry.promise = loadArt(url).then((t) => { entry.tex = t; entry.status = 'done' }, (err) => { entry.error = err; entry.status = 'error' }); artCache.set(url, entry); e = entry }
  if (e.status === 'pending') throw e.promise
  if (e.status === 'error') throw e.error
  return e.tex!
}

export type PieceControl = { reveal: (to: number, d?: number) => void; dissolve: (to: number, d?: number) => void; fade: (to: number, d?: number) => void; mat: THREE.ShaderMaterial }

/**
 * A limb of the picture that turns about a pivot: a capsule from the pivot out through the tip and on past it, of the
 * given radius (as a fraction of the picture's width), fading in at the joint over `blend`. All in picture uv (0–1,
 * origin bottom left).
 */
export type Bone = { pivot: [number, number]; tip: [number, number]; radius: number; blend?: number }

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
  /** relief: how far (world units) the picture's inflated form pushes out toward the viewer, and how strongly it is shaded (0–1) */
  puff?: number
  relief?: number
  /** the scene's shadow colour, for the relief's turn */
  shadow?: THREE.Color
  /** two lamps in the world: position + strength, and colour */
  lampA?: THREE.Vector4; lampACol?: THREE.Color; lampB?: THREE.Vector4; lampBCol?: THREE.Color
}

/**
 * A height map inflated from the picture's silhouette: distance to the nearest transparent pixel, with a square-root
 * profile so forms round off like a cushion and thin parts (an arm, a leg, a tail) stay lower than the body.
 */
const heightCache = new WeakMap<HTMLImageElement, THREE.DataTexture>()
function heightMap(img: HTMLImageElement): THREE.DataTexture {
  const hit = heightCache.get(img); if (hit) return hit
  const W = 384, Hh = Math.max(8, Math.round((W * img.height) / img.width))
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d')!
  g.drawImage(img, 0, 0, W, Hh); const d = g.getImageData(0, 0, W, Hh).data
  const INF = 1e9; const dist = new Float32Array(W * Hh)
  for (let i = 0; i < W * Hh; i++) dist[i] = d[i * 4 + 3] > 128 ? INF : 0
  // chamfer distance transform, two passes
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (dist[i] === 0) continue
    let v = (x === 0 || y === 0) ? 1 : INF
    if (x > 0) v = Math.min(v, dist[i - 1] + 1); if (y > 0) v = Math.min(v, dist[i - W] + 1)
    if (x > 0 && y > 0) v = Math.min(v, dist[i - W - 1] + 1.41); if (x < W - 1 && y > 0) v = Math.min(v, dist[i - W + 1] + 1.41)
    dist[i] = Math.min(dist[i], v) }
  for (let y = Hh - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (dist[i] === 0) continue
    let v = (x === W - 1 || y === Hh - 1) ? 1 : dist[i]
    if (x < W - 1) v = Math.min(v, dist[i + 1] + 1); if (y < Hh - 1) v = Math.min(v, dist[i + W] + 1)
    if (x < W - 1 && y < Hh - 1) v = Math.min(v, dist[i + W + 1] + 1.41); if (x > 0 && y < Hh - 1) v = Math.min(v, dist[i + W - 1] + 1.41)
    dist[i] = Math.min(dist[i], v) }
  const scale = 0.32 * Math.min(W, Hh)
  const h = new Float32Array(W * Hh); for (let i = 0; i < h.length; i++) h[i] = Math.sqrt(Math.min(1, dist[i] / scale))
  // a little blur so the shading is soft
  const out = new Uint8Array(W * Hh)
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= Hh) continue; s += h[yy * W + xx]; n++ }
    out[y * W + x] = Math.round((s / n) * 255) }
  const t = new THREE.DataTexture(out, W, Hh, THREE.RedFormat, THREE.UnsignedByteType); t.flipY = true; t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true
  heightCache.set(img, t); return t
}

/** A painted picture standing on a plane. Arrives as ink and fills with watercolour; can dissolve into pigment; can be a puppet. */
export function Piece({ url, width, position, rotation = [0, 0, 0], delay = 0, flip = false, opacity = 1, tint, onHover, onClick, control, renderOrder, solid = false, quaternion, sink = 0, snow, light, fog = false, frost = 0, grain = 0, glisten = 0, bones, pose, eye, puff = 0, relief = 0, shadow, lampA, lampACol, lampB, lampBCol }: PieceProps) {
  const tex = useArt(url)
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
    if (bones) bones.slice(0, BONES).forEach((b, i) => { u.uPivot.value[i].set(b.pivot[0], b.pivot[1]); u.uRegion.value[i].set(b.tip[0], b.tip[1], b.radius, b.blend ?? 0.06) })
    if (eye) u.uEye.value.set(eye[0], eye[1], eye[2], eye[3])
    if (puff > 0 || relief > 0) u.uHeight.value = heightMap(img)
  }, [mat, width, aspect, bones, eye, puff, relief, img])
  useEffect(() => {
    mat.uniforms.uReveal.value = 0
    const tw = gsap.to(mat.uniforms.uReveal, { value: 1, duration: prefersReducedMotion() ? 0.3 : 1.8, delay, ease: 'power2.out' })
    if (control) control.current = {
      mat,
      reveal: (to, d = 1.6) => { gsap.killTweensOf(mat.uniforms.uReveal); gsap.to(mat.uniforms.uReveal, { value: to, duration: d, ease: 'power2.out' }) },
      dissolve: (to, d = 1.4) => { gsap.killTweensOf(mat.uniforms.uDissolve); gsap.to(mat.uniforms.uDissolve, { value: to, duration: d, ease: 'power2.in' }) },
      fade: (to, d = 0.4) => { gsap.killTweensOf(mat.uniforms.uOpacity); gsap.to(mat.uniforms.uOpacity, { value: to, duration: d, ease: 'sine.inOut' }) },
    }
    mat.uniforms.uOpacity.value = opacity
    return () => { tw.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mat, delay, control])
  useFrame((_, dt) => {
    const u = mat.uniforms
    u.uTime.value += dt; u.uFlip.value = flip ? 1 : 0; if (!control) u.uOpacity.value = opacity; u.uSink.value = sink; u.uFrost.value = frost; u.uGrain.value = grain; u.uGlisten.value = glisten; u.uPuff.value = puff; u.uRelief.value = relief
    if (shadow) (u.uShadowCol.value as THREE.Color).copy(shadow)
    if (lampA) u.uLampA.value.copy(lampA); if (lampACol) u.uLampACol.value.copy(lampACol); if (lampB) u.uLampB.value.copy(lampB); if (lampBCol) u.uLampBCol.value.copy(lampBCol)
    if (tint) (u.uTint.value as THREE.Color).lerp(tint, Math.min(1, dt * 3))
    if (snow) (u.uSnow.value as THREE.Color).copy(snow)
    if (light) (u.uLight.value as THREE.Color).copy(light)
    const f = scene.fog as THREE.Fog | null
    if (fog && f) { u.fogColor.value.copy(f.color); u.fogNear.value = f.near; u.fogFar.value = f.far }
    if (pose) { const p = pose.current; const ang = u.uAngle.value as Float32Array; for (let i = 0; i < BONES; i++) ang[i] = p.angles[i] || 0; u.uBreath.value = p.breath; u.uBlink.value = p.blink }
  })
  const seg = bones || puff > 0 ? 48 : 1
  return (
    <mesh position={position} rotation={rotation} quaternion={quaternion} material={mat} renderOrder={renderOrder}
      onPointerOver={onHover ? (e) => { e.stopPropagation(); onHover(true) } : undefined} onPointerOut={onHover ? () => onHover(false) : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}>
      <planeGeometry args={[width, width * aspect, seg, seg]} />
    </mesh>
  )
}
