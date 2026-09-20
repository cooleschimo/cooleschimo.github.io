import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { getMode, type Mode } from '../lib/mode'
import { Piece, paper, type Bone, type PieceControl, type Pose } from './Piece'

/**
 * Outside: snow that is really made of letters. Deep white snow, piled in mounds and drifts, whose surface
 * is tens of thousands of letter glyphs lying along the slopes; the snow and the letters share one shading
 * (white, blue in the shadow, a subsurface glow at the rim, and glitter that moves as the camera moves), so
 * the letters read as the texture of the snow rather than confetti on it. The letters are particles: the
 * cursor pushes them, the fox wading through kicks them up, and letters fall from the sky and land. The
 * painted pieces (igloo, Chimin, fox) stand in the same light and fog and sink into the snow.
 */
type Props = { onEnter: () => void; onAbout: () => void }

const G = 80            // field size
const PHONE = typeof window !== 'undefined' && window.innerWidth < 760
const N = PHONE ? 70000 : 180000   // letters at rest on the field (fewer on a phone)
const NF = PHONE ? 900 : 2400      // letters falling from the sky: all the snowfall is letters
const R = 5.6           // igloo footprint radius
const CHARS = 'AaBbCcdDeEfFgGhHiJjkKLMmnNoOPpqrRsStTuvVwWxyzZ'

type Look = { white: string; shadow: string; light: string; sky: string; mid: string; horizon: string; band: string; bandI: number; sun: string; sunDir: [number, number, number]; sparkle: number; aurora: number; glow: number; stars: number }
const LOOKS: Record<Mode, Look> = {
  day: { white: '#f6f4f0', shadow: '#adbae6', light: '#fff1d4', sky: '#8fa8e6', mid: '#c9d5f4', horizon: '#e8e3f1', band: '#f6e2ea', bandI: 0.35, sun: '#fff0d0', sunDir: [-0.35, 0.42, -0.84], sparkle: 1.0, aurora: 0, glow: 0.25, stars: 0 },
  evening: { white: '#f9e8da', shadow: '#c0a9cf', light: '#ffb27a', sky: '#5d5aa8', mid: '#e39ab0', horizon: '#ffd3a6', band: '#ff8a4e', bandI: 1.0, sun: '#ffb070', sunDir: [-0.55, 0.12, -0.82], sparkle: 0.8, aurora: 0, glow: 0.6, stars: 0.2 },
  night: { white: '#7383cb', shadow: '#2a336f', light: '#b9c6ff', sky: '#070b24', mid: '#141c45', horizon: '#2a376e', band: '#25407e', bandI: 0.4, sun: '#c9d4ff', sunDir: [0.4, 0.55, -0.73], sparkle: 1.9, aurora: 1, glow: 1, stars: 1 },
}

// ------------------------------------------------------------------ the ground: mounds, drifts, and a hollow where Chimin lies
const CHIMIN: [number, number] = [-6.0, 6.2]
const KEEP_CHIMIN = 3.7   // the fox never comes closer to her than this
// Chimin's picture (lying in the snow from above, 1086×1259): pivots and limb tips in picture uv, origin bottom left
const CHIMIN_ASPECT = 1259 / 1086
// Chimin's own drawing (1086×1259): the beanie and hair, the arms out to the mittens, the legs to the boots
const CHIMIN_BONES: Bone[] = [
  { pivot: [0.5, 0.78], tip: [0.52, 0.96], radius: 0.17, blend: 0.05 },    // head (with the hair and the beanie)
  { pivot: [0.38, 0.75], tip: [0.07, 0.83], radius: 0.1 },                // left arm, out to the mitten
  { pivot: [0.63, 0.75], tip: [0.94, 0.83], radius: 0.1 },                // right arm
  { pivot: [0.45, 0.50], tip: [0.15, 0.08], radius: 0.13, blend: 0.08 },  // left leg, down to the boot
  { pivot: [0.56, 0.50], tip: [0.86, 0.08], radius: 0.13, blend: 0.08 },  // right leg
]
// her body in the snow (uv, bone or -1 for the torso, radius): pressed in all the time, and swept by the angel
const CHIMIN_BODY: [number, number, number, number][] = [
  [0.5, 0.88, 0, 0.42], [0.62, 0.85, 0, 0.3], [0.5, 0.67, -1, 0.5], [0.5, 0.57, -1, 0.5], [0.43, 0.61, -1, 0.4], [0.57, 0.61, -1, 0.4], [0.5, 0.48, -1, 0.42],
  [0.3, 0.77, 1, 0.3], [0.19, 0.8, 1, 0.3], [0.08, 0.83, 1, 0.34], [0.7, 0.77, 2, 0.3], [0.81, 0.8, 2, 0.3], [0.92, 0.83, 2, 0.34],
  [0.38, 0.4, 3, 0.3], [0.28, 0.28, 3, 0.3], [0.16, 0.12, 3, 0.36], [0.62, 0.4, 4, 0.3], [0.72, 0.28, 4, 0.3], [0.86, 0.12, 4, 0.36],
]
// the fox's picture (side view walking right, 1505×995)
// Chimin's fox, walking (1400×826): head, tail, and the four legs the picture shows
const FOX_BONES: Bone[] = [
  { pivot: [0.8, 0.62], tip: [0.94, 0.82], radius: 0.14 },     // head
  { pivot: [0.36, 0.5], tip: [0.08, 0.44], radius: 0.2, blend: 0.08 },  // tail
  { pivot: [0.86, 0.38], tip: [0.89, 0.02], radius: 0.06 },    // front near leg
  { pivot: [0.72, 0.38], tip: [0.72, 0.02], radius: 0.05 },    // front far leg
  { pivot: [0.56, 0.38], tip: [0.55, 0.02], radius: 0.06 },    // back near leg
  { pivot: [0.40, 0.38], tip: [0.38, 0.02], radius: 0.05 },    // back far leg
]
type FoxView = 'side' | 'leap' | 'sit'
const MOUNDS: [number, number, number, number][] = [ // x, z, radius, height
  [0, 0, 9.5, 2.2], [-12, -6, 7, 2.1], [13, -9, 8, 2.4], [-10, 10, 5, 0.9], [11, 7, 5.5, 1.3], [-22, 2, 8, 1.9], [22, 4, 7, 1.7], [3, -18, 12, 3.2], [-3, 17, 6, 1.0], [0, 26, 10, 2.2],
  [-17, 5, 3.6, 2.9], [18, -1, 4.2, 2.6], [-6, -11, 3.4, 1.9], [9, 15, 3.2, 1.5], [-15, 15, 5, -0.9], [16, 12, 4.5, -0.7], [22, 14, 6, 2.4], [-24, -12, 9, 2.8], [26, -10, 8, 2.6],
  [CHIMIN[0], CHIMIN[1], 3.1, -0.65],
  [0, 2.8, 4.2, 0.55],   // the drift against the igloo's front
]
// value noise, so the small drifts between the mounds never repeat
function hash2(x: number, z: number) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s) }
function noise2(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z); let fx = x - ix, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz)
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1)
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz
}
function H(x: number, z: number) {
  let y = 0
  for (const [mx, mz, r, h] of MOUNDS) { const d2 = ((x - mx) * (x - mx) + (z - mz) * (z - mz)) / (r * r); y += h * Math.exp(-d2 * 1.6) }
  y += (noise2(x * 0.12 + 3.1, z * 0.12) - 0.5) * 2.0 + (noise2(x * 0.3 + 5.5, z * 0.3 + 1.7) - 0.5) * 0.8 + (noise2(x * 0.55, z * 0.55 + 7.3) - 0.5) * 0.3 + (noise2(x * 1.7 + 1.3, z * 1.7) - 0.5) * 0.1
  return y
}
function normalAt(x: number, z: number, out: THREE.Vector3) {
  const e = 0.15
  out.set(H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)).normalize(); return out
}

function moundGeometryRect(x0: number, x1: number, z0: number, z1: number, seg = 90) {
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2)
  const p = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)))
  geo.computeVertexNormals(); return geo
}
function moundGeometry() {
  const seg = 180; const geo = new THREE.PlaneGeometry(G, G, seg, seg); geo.rotateX(-Math.PI / 2)
  const p = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)))
  geo.computeVertexNormals(); return geo
}

// ------------------------------------------------------------------ the trail: where the snow has been pressed down
// A pressure map over the near field (paw prints, the wading furrow, the snow angel, the cursor). The ground and the
// letters on it sink where it is high; it fades back as snow falls.
const TW = 512, TH = 384, TX0 = -32, TX1 = 32, TZ0 = -26, TZ1 = 22
/** the snow's surface offset: 0 untouched, up to 2 where it is pressed or dug down, down to −1 where it is heaped up; stored as (v + 1) · 85 */
type Trail = { data: Float32Array; bytes: Uint8Array; tex: THREE.DataTexture }
function makeTrail(): Trail {
  const bytes = new Uint8Array(TW * TH).fill(85); const tex = new THREE.DataTexture(bytes, TW, TH, THREE.RedFormat, THREE.UnsignedByteType)
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true
  return { data: new Float32Array(TW * TH), bytes, tex }
}
/** press a soft disc into the snow, to at least this depth (a footprint: pressing twice does not go deeper) */
function stamp(t: Trail, x: number, z: number, r: number, depth: number) {
  const sx = TW / (TX1 - TX0), sz = TH / (TZ1 - TZ0); const cx = (x - TX0) * sx, cz = (z - TZ0) * sz; const rx = r * sx, rz = r * sz
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(TW - 1, Math.ceil(cx + rx)), z0 = Math.max(0, Math.floor(cz - rz)), z1 = Math.min(TH - 1, Math.ceil(cz + rz))
  for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
    const dx = (ix - cx) / rx, dz = (iz - cz) / rz; const d2 = dx * dx + dz * dz; if (d2 > 1) continue
    const v = depth * (1 - d2) * (1 - d2); const i = iz * TW + ix; if (v > t.data[i]) t.data[i] = v
  }
}
/** move snow: a positive amount digs the disc deeper each time, a negative one heaps snow up on it; the surface is held between −1 and 2 */
function heap(t: Trail, x: number, z: number, r: number, amount: number) {
  const sx = TW / (TX1 - TX0), sz = TH / (TZ1 - TZ0); const cx = (x - TX0) * sx, cz = (z - TZ0) * sz; const rx = r * sx, rz = r * sz
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(TW - 1, Math.ceil(cx + rx)), z0 = Math.max(0, Math.floor(cz - rz)), z1 = Math.min(TH - 1, Math.ceil(cz + rz))
  for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
    const dx = (ix - cx) / rx, dz = (iz - cz) / rz; const d2 = dx * dx + dz * dz; if (d2 > 1) continue
    const i = iz * TW + ix; t.data[i] = Math.max(-1, Math.min(2, t.data[i] + amount * (1 - d2) * (1 - d2)))
  }
}
function trailAt(t: Trail, x: number, z: number) {
  const ix = Math.round((x - TX0) * TW / (TX1 - TX0)), iz = Math.round((z - TZ0) * TH / (TZ1 - TZ0))
  if (ix < 0 || iz < 0 || ix >= TW || iz >= TH) return 0; return t.data[iz * TW + ix]
}
/** the snow settles: prints, holes and heaps all fade toward level ground, then upload */
function settleTrail(t: Trail, dt: number, tau = 70) {
  const k = Math.exp(-dt / tau); const d = t.data, b = t.bytes
  for (let i = 0; i < d.length; i++) { const v = d[i] * k; d[i] = Math.abs(v) < 0.004 ? 0 : v; b[i] = (v + 1) * 85 }
  t.tex.needsUpdate = true
}

// ------------------------------------------------------------------ one shading for snow and letters
const SNOW_GLSL = `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.1; a *= 0.5; } return v; }
  // white in the light, blue in the shadow, a subsurface glow where the surface turns away
  vec3 snowShade(vec3 n, vec3 V, vec3 L, vec3 white, vec3 shadow, vec3 light, float depth){
    float wrap = dot(n, L) * 0.5 + 0.5;
    float tone = smoothstep(0.3, 1.0, wrap); tone = mix(tone, floor(tone * 4.0 + 0.5) / 4.0, 0.45);
    vec3 col = mix(shadow, white, tone);
    col = mix(col, shadow, clamp(depth, 0.0, 1.0) * 0.45);
    float fres = pow(1.0 - max(0.0, dot(n, V)), 3.0);
    col += light * fres * 0.12;
    col += light * pow(max(0.0, dot(n, L)), 10.0) * 0.1;
    return col; }
  // glitter: tiny facets in a grid, each with its own tilt, that flash when the reflection meets the eye
  float glitter(vec3 w, vec3 n, vec3 V, vec3 L, float time){
    vec2 cell = floor(w.xz * 26.0 + w.y * 7.0);
    float h = hash(cell);
    vec3 nj = normalize(n + (vec3(hash(cell + 1.7), hash(cell + 3.1), hash(cell + 5.3)) - 0.5) * 1.3);
    float g = pow(max(0.0, dot(reflect(-L, nj), V)), 40.0);
    float tw = 0.55 + 0.45 * sin(time * 2.4 + h * 60.0);
    return g * step(0.5, h) * tw * 2.0; }
  // handmade paper: long soft fibres, tiny dark speckles
  float fibre(vec2 p){ return fbm(vec2(p.x * 1.0, p.y * 6.0)) * 0.5 + fbm(vec2(p.x * 7.0, p.y * 1.2) + 3.7) * 0.5; }
  float speck(vec2 p){ vec2 c = floor(p); vec2 f = fract(p) - 0.5; float h = hash(c); vec2 pt = (vec2(hash(c + 1.3), hash(c + 2.7)) - 0.5) * 0.8; return step(0.94, h) * smoothstep(0.12, 0.03, length(f - pt)); }
  vec3 paperize(vec3 col, vec2 p, float amount){ col *= 1.0 + (fibre(p * 3.0) - 0.5) * 0.16 * amount; col = mix(col, col * 0.6, speck(p * 22.0) * 0.55 * amount); return col; }
  // the trail: pressed-down snow
  float trailAt(vec2 xz){ vec2 uv = (xz - uTrailBox.xy) * uTrailBox.zw; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0; return texture2D(uTrail, uv).r * 3.0 - 1.0; }
  // the tilt of the ground where a print has pressed it: the surface normal of y = H - trail*depth
  vec3 trailTilt(vec2 xz, float depth){ float e = 0.12;
    float tx = trailAt(xz + vec2(e, 0.0)) - trailAt(xz - vec2(e, 0.0)); float tz = trailAt(xz + vec2(0.0, e)) - trailAt(xz - vec2(0.0, e));
    return vec3(tx, 0.0, tz) * (depth / (2.0 * e)); }
  // the doorway's light on the snow: warm, falling off with distance, on the surfaces that face it
  vec3 doorLight(vec3 w, vec3 n){ vec3 to = uDoor - w; float d = length(to); float f = smoothstep(9.0, 0.6, d) * (0.35 + 0.65 * max(0.0, dot(n, to / max(d, 1e-3)))); return uDoorCol * f * f * uDoorGlow; }
  // the aurora, as a wash on the ground
  vec3 auroraOn(vec3 w, float time){
    vec2 p = w.xz * 0.25; float b = pow(0.5 + 0.5 * sin(p.x * 1.4 + p.y * 0.8 + time * 0.3 + sin(p.y * 1.2 - time * 0.2) * 2.0), 3.0);
    vec3 ac = mix(vec3(0.35, 0.9, 0.65), vec3(0.6, 0.45, 0.9), 0.5 + 0.5 * sin(p.x * 0.8 - time * 0.17)); return ac * b * 0.2; }
`
const snowUniforms = () => ({
  uLightDir: { value: new THREE.Vector3(-0.35, 0.42, -0.84).normalize() }, uWhite: { value: new THREE.Color('#fcfcff') }, uShadow: { value: new THREE.Color('#b4c1ee') }, uLight: { value: new THREE.Color('#fff4dc') },
  uAurora: { value: 0 }, uTime: { value: 0 }, uSparkle: { value: 1 }, fogColor: { value: new THREE.Color('#f3ecf3') }, fogNear: { value: 24 }, fogFar: { value: 72 },
  uCursor: { value: new THREE.Vector3() }, uCursorOn: { value: 0 }, uDoor: { value: new THREE.Vector3(0, 1.2, 4.2) }, uDoorGlow: { value: 0 }, uDoorCol: { value: new THREE.Color('#ffc27c') },
  uTrail: { value: null as THREE.Texture | null }, uTrailBox: { value: new THREE.Vector4(TX0, TZ0, 1 / (TX1 - TX0), 1 / (TZ1 - TZ0)) }, uTrailDepth: { value: 0.5 }, uDebug: { value: 0 }, uAlpha: { value: 0.66 },
})

function snowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: snowUniforms(),
    vertexShader: `varying vec3 vW; varying vec3 vN; varying float vFog; varying float vTrail; uniform sampler2D uTrail; uniform vec4 uTrailBox; uniform float uTrailDepth;
      float trailAt(vec2 xz){ vec2 uv = (xz - uTrailBox.xy) * uTrailBox.zw; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0; return texture2D(uTrail, uv).r * 3.0 - 1.0; }
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); float tr = trailAt(w.xz); w.y -= tr * uTrailDepth; vTrail = tr; vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vec4 mv = viewMatrix * w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uLightDir, uWhite, uShadow, uLight, fogColor, uCursor; uniform float fogNear, fogFar, uAurora, uTime, uSparkle, uCursorOn, uTrailDepth, uDebug, uAlpha, uDoorGlow;
      uniform sampler2D uTrail; uniform vec4 uTrailBox; uniform vec3 uDoor, uDoorCol;
      varying vec3 vW; varying vec3 vN; varying float vFog; varying float vTrail;
      ${SNOW_GLSL}
      void main(){
        vec3 V = normalize(cameraPosition - vW); vec3 n = normalize(vN);
        float cdist = distance(vW.xz, uCursor.xz); float ring = smoothstep(4.2, 0.4, cdist) * uCursorOn;
        float ripple = ring * (0.5 + 0.5 * sin(cdist * 2.6 - uTime * 3.2));
        // a soft grain and a gentle pile pattern, so the surface between the letters is not flat paint
        float grain = fbm(vW.xz * 2.3) - 0.5; n = normalize(n + vec3(grain * 0.25, 0.0, (fbm(vW.zx * 2.9) - 0.5) * 0.25));
        n = normalize(n + trailTilt(vW.xz, uTrailDepth));
        float depth = smoothstep(1.2, -0.6, vW.y);
        vec3 col = snowShade(n, V, uLightDir, uWhite, uShadow, uLight, depth);
        col *= 0.96 + 0.08 * fbm(vW.xz * 9.0);
        col = paperize(col, vW.xz, 1.0);
        if (uDebug > 0.5) { gl_FragColor = vec4(vTrail, trailAt(vW.xz), 0.3, 1.0); return; }
        // the prints: the trough is in shadow, its near wall darker, its far wall catches the light
        { float s = 0.16; float edge = trailAt(vW.xz - uLightDir.xz * s) - trailAt(vW.xz + uLightDir.xz * s);
          col = mix(col, uShadow, clamp(vTrail * 0.85 + max(0.0, edge) * 1.5, 0.0, 0.88));
          col += uLight * clamp(-edge * 2.0, 0.0, 1.0) * 0.4; col += uLight * clamp(-vTrail, 0.0, 1.0) * 0.12; }
        col += uLight * ring * 0.08 + uLight * ripple * 0.08;
        col += doorLight(vW, n);
        col += uLight * glitter(vW, n, V, uLightDir, uTime) * uSparkle * 0.4 * (1.0 + ring * 2.5);
        if (uAurora > 0.001) col += auroraOn(vW, uTime) * uAurora;
        float f = smoothstep(fogNear, fogFar, vFog); col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, uAlpha); }`,
    transparent: true,
  })
}

// ------------------------------------------------------------------ the glyph atlas
/** 64 handwritten glyphs on one canvas, each with a grainy edge and a speckled body, so a letter is a splat of snow, not print. */
function drawAtlas(c: HTMLCanvasElement) {
  const S = c.width, cells = 8, cs = S / cells; const g = c.getContext('2d')!
  g.clearRect(0, 0, S, S); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let i = 0; i < cells * cells; i++) {
    const ch = CHARS[i % CHARS.length]; const x = (i % cells) * cs + cs / 2, y = Math.floor(i / cells) * cs + cs / 2
    g.font = `${i % 2 === 0 ? '700' : '600'} ${cs * 0.92}px Caveat, 'Segoe Script', 'Bradley Hand', cursive`
    g.fillText(ch, x, y + cs * 0.06)
  }
  // grain: the alpha is roughened by noise, most at the edge, so the stroke breaks up like a dry brush
  const img = g.getImageData(0, 0, S, S), d = img.data
  const noise = new Float32Array(S * S); for (let i = 0; i < noise.length; i++) noise[i] = Math.random()
  const blur = (v: Float32Array) => { const o = new Float32Array(v.length); for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) { const i = y * S + x; o[i] = (v[i] * 4 + v[i - 1] + v[i + 1] + v[i - S] + v[i + S]) / 8 } return o }
  const soft = blur(blur(noise))
  for (let i = 0; i < S * S; i++) {
    const a = d[i * 4 + 3]; if (a === 0) continue
    const n = (soft[i] - 0.5) * 2 // −1…1, smooth
    const body = 0.82 + 0.18 * (noise[i] * 0.5 + soft[i] * 0.5) // speckle inside the stroke
    d[i * 4 + 3] = Math.max(0, Math.min(255, a * body + n * 150 * (1 - a / 255)))
  }
  g.putImageData(img, 0, 0)
}
function glyphAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = 1024
  drawAtlas(c)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter
  // the handwriting may not be in yet on the first draw: redraw when it lands
  if ('fonts' in document) document.fonts.load('700 100px Caveat').then(() => { drawAtlas(c); t.needsUpdate = true }).catch(() => {})
  return t
}

function letterMaterial(atlas: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { ...snowUniforms(), uAtlas: { value: atlas } },
    vertexShader: `
      attribute float aGlyph; attribute vec3 aColor; attribute float aSeed; uniform vec3 uCursor; uniform float uCursorOn, uTime, uTrailDepth; uniform sampler2D uTrail; uniform vec4 uTrailBox;
      varying vec2 vUv; varying vec3 vColor; varying vec3 vN; varying vec3 vW; varying float vFog; varying float vSeed; varying float vRing; varying float vTrail;
      float trailAt(vec2 xz){ vec2 uv = (xz - uTrailBox.xy) * uTrailBox.zw; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0; return texture2D(uTrail, uv).r * 3.0 - 1.0; }
      void main(){
        float col = mod(aGlyph, 8.0), row = floor(aGlyph / 8.0); vUv = (uv + vec2(col, row)) / 8.0; vColor = aColor; vSeed = aSeed;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        // under the cursor the letters stir: they lift a little and shimmer
        float cd = distance(w.xz, uCursor.xz); vRing = smoothstep(4.2, 0.4, cd) * uCursorOn;
        // a ripple runs out from the cursor through the letters, and they lift and shiver on it
        w.y += vRing * (0.14 * (0.5 + 0.5 * sin(cd * 2.6 - uTime * 3.2 + aSeed * 3.0)) + 0.1 * (0.5 + 0.5 * sin(uTime * 5.0 + aSeed * 40.0)));
        // pressed down where something has been: the letters sink with the ground
        float tr = trailAt(w.xz); w.y -= tr * uTrailDepth; vTrail = tr;
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0));
        vec4 mv = viewMatrix * w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform vec3 uLightDir, uWhite, uShadow, uLight, fogColor, uDoor, uDoorCol; uniform float fogNear, fogFar, uAurora, uTime, uSparkle, uTrailDepth, uDoorGlow;
      uniform sampler2D uTrail; uniform vec4 uTrailBox;
      varying vec2 vUv; varying vec3 vColor; varying vec3 vN; varying vec3 vW; varying float vFog; varying float vSeed; varying float vRing; varying float vTrail;
      ${SNOW_GLSL}
      void main(){
        float a = texture2D(uAtlas, vUv).a; if (a < 0.38) discard;
        vec3 V = normalize(cameraPosition - vW); vec3 n = normalize(vN); if (dot(n, V) < 0.0) n = -n;
        if (abs(vTrail) > 0.001) n = normalize(n + trailTilt(vW.xz, uTrailDepth));
        float depth = smoothstep(1.2, -0.6, vW.y);
        vec3 col = snowShade(n, V, uLightDir, uWhite, uShadow, uLight, depth) * vColor;
        // each letter is cut paper: fibre across the stroke, a speckle, a lighter cut rim, and a soft blue edge outside it
        col *= 0.92 + 0.16 * fbm(vW.xz * 38.0 + vSeed * 9.0);
        col = paperize(col, vUv * 60.0 + vSeed * 7.0, 0.8);
        float edge = 1.0 - smoothstep(0.38, 0.8, a); float rim = smoothstep(0.38, 0.55, a) * (1.0 - smoothstep(0.55, 0.75, a));
        col = mix(col, uShadow, edge * 0.26); col = mix(col, uWhite, rim * 0.35);
        // falling snow: fresh, bright, unshadowed
        if (vColor.r > 1.1) col = mix(col, uWhite * 1.05 + uLight * 0.12, 0.85);
        col = mix(col, uShadow, clamp(vTrail * 0.75, 0.0, 0.8));
        // each letter is a facet: some catch the light hard as the camera moves
        vec3 Rf = reflect(-uLightDir, n); float glint = pow(max(0.0, dot(Rf, V)), 24.0 + vSeed * 40.0);
        float tw = 0.55 + 0.45 * sin(uTime * (1.5 + vSeed * 4.0) + vSeed * 60.0);   // and they twinkle: the glisten of the snow is the letters
        col += uLight * glint * (0.5 + vSeed * 1.6) * tw * uSparkle * (1.0 + vRing * 1.5);
        col += uLight * glitter(vW, n, V, uLightDir, uTime) * uSparkle * (0.5 + vRing * 1.5);
        col += uLight * vRing * 0.1;
        col += doorLight(vW, n) * 0.9;
        if (uAurora > 0.001) col += auroraOn(vW, uTime) * uAurora;
        float f = smoothstep(fogNear, fogFar, vFog); col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, 1.0); }`,
    side: THREE.DoubleSide,
  })
}

// ------------------------------------------------------------------ the letters as particles
type Field = {
  mesh: THREE.InstancedMesh; pos: Float32Array; quat: Float32Array; scl: Float32Array; vel: Float32Array; ang: Float32Array
  flying: Uint8Array; falling: Uint8Array; list: number[]
  /** the surface map the letters carry snow across: a kicked letter takes some with it, a landing one leaves it */
  trail?: Trail
}
// mostly white; a few cooler letters give the snow its blue shadows
const PALETTE = [[1, 1, 1], [1, 1, 1], [0.97, 0.97, 1], [0.93, 0.95, 1.0], [0.88, 0.91, 1.0], [0.96, 0.92, 0.98]]
const _g = new THREE.Vector3()
/** hold a point outside a circle */
function keepOut(p: THREE.Vector3, cx: number, cz: number, r: number) { const dx = p.x - cx, dz = p.z - cz; const d = Math.hypot(dx, dz); if (d < r) { const k = r / Math.max(d, 1e-3); p.x = cx + dx * k; p.z = cz + dz * k } }
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _n = new THREE.Vector3(), _up = new THREE.Vector3(0, 0, 1), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler()

function restOrientation(x: number, z: number, out: THREE.Quaternion) {
  // lie along the slope: the letter's face (+z) points along the surface normal, then a random yaw, then a little random tilt so the heap looks strewn
  normalAt(x, z, _n); out.setFromUnitVectors(_up, _n)
  _q2.setFromAxisAngle(_n, Math.random() * Math.PI * 2); out.premultiply(_q2)
  _e.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, 0); _q2.setFromEuler(_e); out.multiply(_q2)
  return out
}

function spawnSky(pos: Float32Array, vel: Float32Array, b: number) {
  pos[b] = (Math.random() - 0.5) * 60; pos[b + 2] = -30 + Math.random() * 48; pos[b + 1] = 7 + Math.random() * 14; vel[b + 1] = -0.45 - Math.random() * 0.7
}

function buildField(atlas: THREE.Texture, n = N, nf = NF, zMin = -32, zMax = 22, xHalf = 36): Field {
  const total = n + nf
  const geo = new THREE.PlaneGeometry(1, 1)
  const glyph = new Float32Array(total), color = new Float32Array(total * 3), seed = new Float32Array(total)
  const pos = new Float32Array(total * 3), quat = new Float32Array(total * 4), scl = new Float32Array(total)
  const vel = new Float32Array(total * 3), ang = new Float32Array(total * 3), flying = new Uint8Array(total), falling = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    glyph[i] = Math.floor(Math.random() * 64); seed[i] = Math.random()
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)]
    color[i * 3] = c[0]; color[i * 3 + 1] = c[1]; color[i * 3 + 2] = c[2]
    scl[i] = 0.17 + Math.random() * Math.random() * 0.6
    if (i < n) {
      // the letters lie where the camera looks, denser toward it,
      // in layers: half on the surface, a quarter just under it, a quarter deeper, seen through the translucent snow
      const x = (Math.random() - 0.5) * 2 * xHalf, z = zMin + (zMax - zMin) * Math.pow(Math.random(), 0.7); const layer = i % 8
      const under = layer === 4 || layer === 5, deep = layer >= 6
      pos[i * 3] = x; pos[i * 3 + 2] = z; pos[i * 3 + 1] = H(x, z) + (deep ? -0.12 - Math.random() * 0.5 : under ? -0.05 : 0.01 + Math.random() * 0.06)
      if (under) { color[i * 3] *= 0.86; color[i * 3 + 1] *= 0.88; color[i * 3 + 2] *= 0.97 }
      if (deep) { color[i * 3] *= 0.72; color[i * 3 + 1] *= 0.76; color[i * 3 + 2] *= 0.92; scl[i] *= 0.9 }
      restOrientation(x, z, _q); quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
    } else {
      falling[i] = 1; flying[i] = 1; spawnSky(pos, vel, i * 3); pos[i * 3 + 1] = Math.random() * 20; scl[i] *= 0.65
      color[i * 3] = color[i * 3 + 1] = color[i * 3 + 2] = 1.2  // falling snow is the brightest white; the shader reads the flag
      ang[i * 3] = (Math.random() - 0.5) * 2; ang[i * 3 + 1] = (Math.random() - 0.5) * 2; ang[i * 3 + 2] = (Math.random() - 0.5) * 2
      _q.setFromEuler(_e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)); quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
    }
  }
  geo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyph, 1)); geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
  const mesh = new THREE.InstancedMesh(geo, letterMaterial(atlas), total); mesh.frustumCulled = false
  for (let i = 0; i < total; i++) { _p.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); _q.set(quat[i * 4], quat[i * 4 + 1], quat[i * 4 + 2], quat[i * 4 + 3]); _s.setScalar(scl[i]); _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m) }
  mesh.instanceMatrix.needsUpdate = true
  const list: number[] = []; for (let i = n; i < total; i++) list.push(i)
  return { mesh, pos, quat, scl, vel, ang, flying, falling, list }
}

const GRAIN = 0.05   // how much surface one moving letter carries
/** Kick the letters around a point: they leap up and away and tumble; `px,pz` pushes them along with whatever moved. */
function kick(f: Field, x: number, z: number, radius: number, strength: number, maxCount: number, px = 0, pz = 0) {
  let n = 0; const r2 = radius * radius
  // sample a window of indices rather than every letter, so one kick costs the same each frame
  const start = Math.floor(Math.random() * N)
  for (let k = 0; k < 9000 && n < maxCount; k++) {
    const i = (start + k * 11) % N; if (f.flying[i]) continue
    const dx = f.pos[i * 3] - x, dz = f.pos[i * 3 + 2] - z; const d2 = dx * dx + dz * dz; if (d2 > r2) continue
    const d = Math.sqrt(d2) + 1e-3; const s = strength * (1 - d / radius) * (0.6 + Math.random() * 0.8)
    f.vel[i * 3] = (dx / d) * s * 0.9 + (Math.random() - 0.5) * 0.6 + px * (0.6 + Math.random() * 0.8); f.vel[i * 3 + 1] = s * (0.9 + Math.random() * 0.7); f.vel[i * 3 + 2] = (dz / d) * s * 0.9 + (Math.random() - 0.5) * 0.6 + pz * (0.6 + Math.random() * 0.8)
    f.ang[i * 3] = (Math.random() - 0.5) * 14; f.ang[i * 3 + 1] = (Math.random() - 0.5) * 14; f.ang[i * 3 + 2] = (Math.random() - 0.5) * 14
    f.flying[i] = 1; f.list.push(i); n++
    if (f.trail) heap(f.trail, f.pos[i * 3], f.pos[i * 3 + 2], 0.45, GRAIN)   // the snow it was part of goes with it
  }
}

function stepField(f: Field, dt: number) {
  const keep: number[] = []
  for (const i of f.list) {
    const b = i * 3
    if (f.falling[i]) { f.vel[b] = Math.sin(f.pos[b + 1] * 1.3 + i) * 0.35; f.vel[b + 2] = Math.cos(f.pos[b + 1] * 0.9 + i * 0.3) * 0.35 }
    else f.vel[b + 1] -= 11 * dt
    f.pos[b] += f.vel[b] * dt; f.pos[b + 1] += f.vel[b + 1] * dt; f.pos[b + 2] += f.vel[b + 2] * dt
    const ground = H(f.pos[b], f.pos[b + 2]) + 0.02
    _q.set(f.quat[i * 4], f.quat[i * 4 + 1], f.quat[i * 4 + 2], f.quat[i * 4 + 3])
    if (f.pos[b + 1] <= ground && f.vel[b + 1] <= 0) {
      if (f.falling[i]) { if (f.trail) heap(f.trail, f.pos[b], f.pos[b + 2], 0.4, -GRAIN * 0.3); spawnSky(f.pos, f.vel, b); keep.push(i) } // landed from the sky, a little more snow here: start again up high
      else { // settle on the slope, and the snow it carried lands with it: a heap, or a hole filling back
        if (f.trail) heap(f.trail, f.pos[b], f.pos[b + 2], 0.45, -GRAIN)
        f.pos[b + 1] = ground + Math.random() * 0.04; f.vel[b] = f.vel[b + 1] = f.vel[b + 2] = 0; f.flying[i] = 0
        restOrientation(f.pos[b], f.pos[b + 2], _q)
      }
    } else {
      _e.set(f.ang[b] * dt, f.ang[b + 1] * dt, f.ang[b + 2] * dt); _q2.setFromEuler(_e); _q.multiply(_q2); keep.push(i)
    }
    f.quat[i * 4] = _q.x; f.quat[i * 4 + 1] = _q.y; f.quat[i * 4 + 2] = _q.z; f.quat[i * 4 + 3] = _q.w
    _p.set(f.pos[b], f.pos[b + 1], f.pos[b + 2]); _s.setScalar(f.scl[i]); _m.compose(_p, _q, _s); f.mesh.setMatrixAt(i, _m)
  }
  f.mesh.instanceMatrix.clearUpdateRanges()
  for (const i of f.list) f.mesh.instanceMatrix.addUpdateRange(i * 16, 16)
  f.list = keep; f.mesh.instanceMatrix.needsUpdate = true
}

// ------------------------------------------------------------------ the doorway
const ARCH_W = 4.6, ARCH_ASPECT = 1081 / 1336
/** The dark opening painted in the arch picture, as a soft mask (1 inside the door), so light can be laid over it. */
const doorCache = new WeakMap<HTMLImageElement, THREE.DataTexture>()
function doorMask(img: HTMLImageElement): THREE.DataTexture {
  const hit = doorCache.get(img); if (hit) return hit
  const W = 256, Hh = Math.max(8, Math.round((W * img.height) / img.width))
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d')!
  g.drawImage(img, 0, 0, W, Hh); const d = g.getImageData(0, 0, W, Hh).data
  const m = new Float32Array(W * Hh)
  for (let i = 0; i < W * Hh; i++) m[i] = d[i * 4 + 3] > 128 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 300 ? 1 : 0
  const out = new Uint8Array(W * Hh)
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= Hh) continue; s += m[yy * W + xx]; n++ }
    out[y * W + x] = Math.round((s / n) * 255) }
  const t = new THREE.DataTexture(out, W, Hh, THREE.RedFormat, THREE.UnsignedByteType); t.flipY = true; t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true
  doorCache.set(img, t); return t
}
/** Light in the doorway: a lamp low inside, its light moving on the inner walls, flickering, with glints. Drawn over the painted opening. */
function doorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uMask: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uGlow: { value: 0 }, uSill: { value: -99 }, uCol: { value: new THREE.Color('#d8752c') }, uColHi: { value: new THREE.Color('#ffe4ae') } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uMask; uniform float uTime, uGlow, uSill; uniform vec3 uCol, uColHi; varying vec2 vUv; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.1; a *= 0.5; } return v; }
      void main(){
        float m = texture2D(uMask, vUv).r; if (m < 0.03 || vW.y < uSill) discard;
        // the door's own space: 0 at the sill, 1 at the crown; x across it
        float y = clamp((vUv.y - 0.12) / 0.5, 0.0, 1.0); float x = (vUv.x - 0.5) / 0.13;
        // a lamp low inside: brightest just above the sill in the middle, deep amber up in the crown
        float lamp = exp(-(x * x * 0.35 + (y - 0.18) * (y - 0.18) * 2.4));
        // light moving over the inner walls, and glints where the ice inside catches it
        float sh = fbm(vec2(vUv.x * 6.0, vUv.y * 4.0 - uTime * 0.18)); float sh2 = fbm(vec2(vUv.x * 11.0 + 3.0, vUv.y * 7.0 - uTime * 0.35));
        float glint = pow(vnoise(vec2(vUv.x * 30.0, vUv.y * 24.0 - uTime * 0.6)), 10.0);
        vec3 col = mix(uCol * 0.55, uColHi, lamp * 0.85 + 0.15 * sh);
        col *= 0.7 + 0.55 * sh2; col += uColHi * glint * 0.9 * (0.5 + lamp);
        col *= uGlow;
        float a = m * mix(0.98, 0.72, y);   // the crown keeps a little of the dark inside
        gl_FragColor = vec4(col, a); }`,
    transparent: true, depthWrite: false, depthTest: false,
  })
}
function DoorFill({ mat, y }: { mat: THREE.ShaderMaterial; y: number }) {
  const tex = useTexture(paper('igloo-arch'))
  useEffect(() => { mat.uniforms.uMask.value = doorMask(tex.image as HTMLImageElement) }, [tex, mat])
  return <mesh position={[0, y, 3.95]} rotation={[-0.04, 0, 0]} material={mat} renderOrder={1}><planeGeometry args={[ARCH_W, ARCH_W * ARCH_ASPECT]} /></mesh>
}

// ------------------------------------------------------------------ the sky
function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color('#9db2ea') }, uMid: { value: new THREE.Color('#d3dcf6') }, uBot: { value: new THREE.Color('#f3ecf3') }, uSun: { value: new THREE.Color('#fff0d0') }, uSunDir: { value: new THREE.Vector3(-0.35, 0.42, -0.84) },
      uAurora: { value: 0 }, uStars: { value: 0 }, uTime: { value: 0 }, uBand: { value: new THREE.Color('#f6e2ea') }, uBandI: { value: 0.35 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop, uMid, uBot, uSun, uSunDir, uBand, uDoor, uDoorCol; uniform float uAurora, uStars, uTime, uBandI, uDoorGlow; varying vec3 vP; uniform sampler2D uTrail; uniform vec4 uTrailBox;
      ${SNOW_GLSL}
      void main(){
        float h = clamp(vP.y, 0.0, 1.0);
        vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.22, h)); c = mix(c, uTop, smoothstep(0.18, 0.75, h));
        // the sunset: a warm belt just above the horizon, strongest toward the sun, that the snow then reflects
        float toSun = 0.5 + 0.5 * dot(normalize(vec2(vP.x, vP.z) + 1e-4), normalize(uSunDir.xz + 1e-4));
        c = mix(c, uBand, smoothstep(0.34, 0.0, h) * (0.3 + 0.7 * toSun * toSun) * uBandI);
        // a haze of soft cloud low over the horizon
        float cl = fbm(vec2(atan(vP.x, vP.z) * 3.0, vP.y * 9.0) + uTime * 0.01);
        c = mix(c, uBot, smoothstep(0.35, 0.0, h) * cl * 0.5);
        // the sun (or the moon): a wide soft glow and a bright heart
        float s = max(0.0, dot(vP, normalize(uSunDir)));
        c += uSun * (pow(s, 6.0) * 0.28 + pow(s, 60.0) * 0.5 + pow(s, 400.0) * 0.8);
        if (uAurora > 0.001) { float a = atan(vP.x, vP.z); float band = sin(a*5.0 + uTime*0.25 + sin(a*2.0+uTime*0.1)*1.5);
          float y = smoothstep(0.05, 0.25, vP.y) * (1.0 - smoothstep(0.35, 0.7, vP.y)); float curtain = pow(0.5+0.5*band, 3.0) * y;
          float rays = 0.7 + 0.3 * pow(0.5 + 0.5 * sin(a * 48.0 + uTime * 0.6 + band * 3.0), 3.0);
          vec3 ac = mix(vec3(0.45, 0.95, 0.7), vec3(0.65, 0.5, 0.95), 0.5+0.5*sin(a*3.0 - uTime*0.15)); c += ac * curtain * rays * 1.1 * uAurora; }
        if (uStars > 0.001) { float star = step(0.9985, hash(floor(vP.xz*400.0))) * smoothstep(0.1,0.4,vP.y); c += star * 0.8 * uStars; }
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false,
  })
}

// ------------------------------------------------------------------ the scene
type Cur = { white: THREE.Color; shadow: THREE.Color; light: THREE.Color; sky: THREE.Color; mid: THREE.Color; horizon: THREE.Color; band: THREE.Color; bandI: number; sun: THREE.Color; sunDir: THREE.Vector3; sparkle: number; aurora: number; glow: number; stars: number }
const newCur = (): Cur => ({ white: new THREE.Color(), shadow: new THREE.Color(), light: new THREE.Color(), sky: new THREE.Color(), mid: new THREE.Color(), horizon: new THREE.Color(), band: new THREE.Color(), bandI: 0, sun: new THREE.Color(), sunDir: new THREE.Vector3(), sparkle: 1, aurora: 0, glow: 0, stars: 0 })
const setLook = (d: Cur, L: Look) => { d.white.set(L.white); d.shadow.set(L.shadow); d.light.set(L.light); d.sky.set(L.sky); d.mid.set(L.mid); d.horizon.set(L.horizon); d.band.set(L.band); d.bandI = L.bandI; d.sun.set(L.sun); d.sunDir.set(...L.sunDir).normalize(); d.sparkle = L.sparkle; d.aurora = L.aurora; d.glow = L.glow; d.stars = L.stars }

type SceneProps = Props & { setHover: (h: 'igloo' | 'chimin' | null) => void; enterRef: React.MutableRefObject<() => void>; darkRef: React.RefObject<HTMLDivElement | null> }
function Scene({ onEnter, onAbout, setHover: setHoverProp, enterRef, darkRef }: SceneProps) {
  const { camera, gl, scene } = useThree()
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const atlas = useMemo(() => glyphAtlas(), [])
  const field = useMemo(() => buildField(atlas), [atlas])
  const mound = useMemo(() => moundGeometry(), [])
  const moundMat = useMemo(() => snowMaterial(), [])
  const trail = useMemo(() => makeTrail(), []); field.trail = trail
  const skyMat = useMemo(() => skyMaterial(), [])

  const home = useMemo(() => new THREE.Vector3(0, 8.2, 23), [])
  const look = useMemo(() => new THREE.Vector3(0, 3.0, 0), [])
  const par = useRef({ x: 0, y: 0 }); const entering = useRef(false)

  // pointer on the ground (against the mound mesh, so the cursor really touches the snow)
  const cursor = useRef(new THREE.Vector3()); const hasCursor = useRef(false); const lastCursor = useRef(new THREE.Vector3()); const stir = useRef(0)
  const dig = useRef(0); const pressing = useRef(false); const hoverRef = useRef<'igloo' | 'chimin' | null>(null)
  const setHover = (h: 'igloo' | 'chimin' | null) => { hoverRef.current = h; setHoverProp(h) }
  const ray = useMemo(() => new THREE.Raycaster(), []); const moundRef = useRef<THREE.Mesh>(null)
  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      par.current = { x: ndc.x, y: ndc.y }; ray.setFromCamera(ndc, camera)
      const hit = moundRef.current ? ray.intersectObject(moundRef.current, false)[0] : undefined
      if (hit) { cursor.current.copy(hit.point); hasCursor.current = true } else hasCursor.current = false
    }
    const onLeave = () => { hasCursor.current = false; pressing.current = false }
    const onDown = (e: PointerEvent) => { if (e.button === 0 && hoverRef.current !== 'igloo') pressing.current = true }
    const onUp = () => { pressing.current = false }
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave); el.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp)
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp) }
  }, [gl, camera, ray])

  // the fox
  const fox = useRef<THREE.Group>(null)
  const f = useRef({ x: 9, z: 8, goal: new THREE.Vector3(9, 0, 8), speed: 0, heading: -Math.PI / 2, yaw: 0, gait: 0, idle: 0, flip: true, moving: false, leaving: false, nextBlink: 2, blinkT: 9, stepPh: 0, sitting: false, sitInit: false, leapInit: false, leap: 0, leapT: 0, leapFrom: new THREE.Vector3(), leapTo: new THREE.Vector3(), lift: 0 })
  const [foxFlip, setFoxFlip] = useState(false)
  const foxPose = useRef<Pose>({ angles: [0, 0, 0, 0, 0, 0], breath: 0, blink: 0 })
  // its pictures: one for each way of being seen; the one that fits cross-dissolves in
  const views = useMemo(() => ({ side: { current: null as PieceControl | null }, leap: { current: null as PieceControl | null }, sit: { current: null as PieceControl | null } }), [])
  const viewState = useRef<{ cur: FoxView; want: FoxView; since: number; at: number; init: boolean }>({ cur: 'side', want: 'side', since: 0, at: 0, init: false })
  // Chimin's rig: head, both arms, both legs (picture uv); the snow angel and her idling drive it
  const chiminPose = useRef<Pose>({ angles: [0, 0, 0, 0, 0, 0], breath: 0, blink: 0 })
  const angel = useRef({ on: 0, phase: 0 }); const chiminGrp = useRef<THREE.Group>(null)
  const [chiminHover, setChiminHover] = useState(false)

  // time of day
  const cur = useMemo(newCur, []); const tgt = useMemo(newCur, [])
  useEffect(() => {
    setLook(cur, LOOKS[getMode()]); setLook(tgt, LOOKS[getMode()])
    const on = () => setLook(tgt, LOOKS[getMode()]); window.addEventListener('modechange', on); return () => window.removeEventListener('modechange', on)
  }, [cur, tgt])
  const pieceTint = useMemo(() => new THREE.Color('#ffffff'), [])
  const glowTex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c) }, [])
  const doorMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffc27c', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const doorRef = useRef<THREE.Mesh>(null); const doorFill = useMemo(doorMaterial, [])
  useEffect(() => { doorMat.map = glowTex; doorMat.needsUpdate = true }, [doorMat, glowTex])

  // entering the igloo
  const timelines = useRef<gsap.core.Timeline[]>([])
  useEffect(() => {
    enterRef.current = () => {
      if (entering.current) return
      entering.current = true; f.current.leaving = true
      if (reduced) { gsap.to(darkRef.current, { opacity: 1, duration: 0.4, onComplete: onEnter }); return }
      const tl = gsap.timeline({ onComplete: onEnter })
      tl.to(camera.position, { x: 0, y: 3.6, z: 14, duration: 1.7, ease: 'power2.inOut' })
        .to(look, { x: 0, y: 2.4, z: 4.2, duration: 1.7, ease: 'power2.inOut' }, '<')
        .to(camera.position, { x: 0, y: 2.6, z: 4.4, duration: 1.2, ease: 'power3.in' }, '-=0.1')
        .to(look, { x: 0, y: 2.2, z: -2, duration: 1.2, ease: 'power3.in' }, '<')
        .to(darkRef.current, { opacity: 1, duration: 0.55 }, '-=0.5')
      timelines.current.push(tl)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') enterRef.current() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); timelines.current.forEach(t => t.kill()) }
  }, [camera, look, onEnter, enterRef, darkRef, reduced])

  // Chimin lies in the hollow on the left: nearly flat, tipped a little toward the camera, with the rim of the hollow heaped over her feet
  const chiminPos = useMemo(() => new THREE.Vector3(CHIMIN[0], 0, CHIMIN[1]), [])
  const chiminQuat = useMemo(() => { const q = new THREE.Quaternion(); normalAt(chiminPos.x, chiminPos.z, _n); const toCam = new THREE.Vector3(0.12, 0.45, 1).normalize(); const nn = _n.clone().add(toCam.multiplyScalar(0.42)).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn); _q2.setFromAxisAngle(nn, 0.2); q.premultiply(_q2); return q }, [chiminPos])
  useEffect(() => {
    // heap: move a few hundred rest letters onto the rim of the hollow, a little above the ground
    let moved = 0
    for (let i = 0; i < N && moved < 520; i += 3) {
      const t = Math.random() * Math.PI * 2; const rr = 2.2 + Math.random() * 1.1; const ex = Math.cos(t) * rr * 1.05, ez = Math.sin(t) * rr * 0.95
      const x = chiminPos.x + ex, z = chiminPos.z + ez
      field.pos[i * 3] = x; field.pos[i * 3 + 2] = z; field.pos[i * 3 + 1] = H(x, z) + 0.08 + Math.random() * 0.12
      restOrientation(x, z, _q); field.quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
      _p.set(x, field.pos[i * 3 + 1], z); _s.setScalar(field.scl[i]); _m.compose(_p, _q, _s); field.mesh.setMatrixAt(i, _m); moved++
    }
    // and a drift heaped against the igloo's front, where the plates meet the snow
    for (let i = 1; i < N && moved < 1400; i += 3) {
      const x = (Math.random() - 0.5) * 12.5, z = 1.0 + Math.random() * Math.random() * 3.2
      field.pos[i * 3] = x; field.pos[i * 3 + 2] = z; field.pos[i * 3 + 1] = H(x, z) + 0.02 + Math.random() * 0.08
      restOrientation(x, z, _q); field.quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
      _p.set(x, field.pos[i * 3 + 1], z); _s.setScalar(field.scl[i]); _m.compose(_p, _q, _s); field.mesh.setMatrixAt(i, _m); moved++
    }
    field.mesh.instanceMatrix.needsUpdate = true
  }, [field, chiminPos])

  const dbg = useRef({ noRig: false })
  const t0 = useRef(0)
  useEffect(() => { (window as unknown as { __snow?: unknown }).__snow = { f: f.current, chiminPose: chiminPose.current, foxPose: foxPose.current, angel: angel.current, dbg: dbg.current, cursor: cursor.current, gsap, trail, moundMat, letterMat: field.mesh.material, field, gl, views, viewState: viewState.current, clock: () => t0.current, stamp: (x: number, z: number, r: number, depth: number) => stamp(trail, x, z, r, depth), dig, pressing } }, [])
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); t0.current += d; const k = Math.min(1, d * 2.2)
    for (const key of ['white', 'shadow', 'light', 'sky', 'mid', 'horizon', 'band', 'sun'] as const) cur[key].lerp(tgt[key], k)
    cur.bandI += (tgt.bandI - cur.bandI) * k
    cur.sunDir.lerp(tgt.sunDir, k).normalize()
    cur.sparkle += (tgt.sparkle - cur.sparkle) * k; cur.aurora += (tgt.aurora - cur.aurora) * k; cur.glow += (tgt.glow - cur.glow) * k; cur.stars += (tgt.stars - cur.stars) * k
    // the lamp inside the igloo flickers: a slow breath with quicker unevenness over it
    const tt = t0.current; const flick = reduced ? 0.9 : 0.82 + 0.1 * Math.sin(tt * 1.6) + 0.05 * Math.sin(tt * 5.3 + 1.0) + 0.035 * Math.sin(tt * 9.1 + 2.0) + 0.025 * Math.sin(tt * 14.7 + 0.5)
    for (const m of [moundMat, field.mesh.material as THREE.ShaderMaterial]) {
      const u = m.uniforms; u.uWhite.value.copy(cur.white).lerp(cur.mid, 0.16); u.uShadow.value.copy(cur.shadow).lerp(cur.sky, 0.12); u.uLight.value.copy(cur.light); u.uLightDir.value.copy(cur.sunDir)
      u.uAurora.value = cur.aurora; u.uTime.value = reduced ? 0.3 : t0.current; u.uSparkle.value = cur.sparkle; u.fogColor.value.copy(cur.horizon)
      u.uTrail.value = trail.tex; u.uDoorGlow.value = (0.2 + cur.glow * 0.8) * flick; u.uDoor.value.set(0, H(0, 3.9) + 1.0, 4.2); u.uCursor.value.copy(cursor.current); u.uCursorOn.value += ((hasCursor.current && !entering.current && !reduced ? 1 : 0) - u.uCursorOn.value) * Math.min(1, d * 4)
    }
    ;(scene.background as THREE.Color).copy(cur.horizon); (scene.fog as THREE.Fog).color.copy(cur.horizon)
    const su = skyMat.uniforms; su.uTop.value.copy(cur.sky); su.uMid.value.copy(cur.mid); su.uBot.value.copy(cur.horizon); su.uSun.value.copy(cur.sun); su.uSunDir.value.copy(cur.sunDir)
    su.uAurora.value = cur.aurora; su.uStars.value = cur.stars; su.uTime.value = t0.current; su.uBand.value.copy(cur.band); su.uBandI.value = cur.bandI
    // the doorway glows to say come in, and its light flickers like a lamp inside; the pool on the snow in front follows it
    doorMat.opacity = (0.28 + cur.glow * 0.5) * flick
    doorFill.uniforms.uTime.value = reduced ? 0.3 : t0.current; doorFill.uniforms.uGlow.value = (0.45 + cur.glow * 0.65) * flick; doorFill.uniforms.uSill.value = H(0, 4.4) - 0.05
    if (doorRef.current) doorRef.current.quaternion.copy(camera.quaternion)
    // the painted pieces take the day's light: white by day, warm by evening, blue by night
    pieceTint.copy(cur.white).lerp(cur.light, 0.25)

    // the cursor shifts the snow
    if (hasCursor.current && !entering.current && !reduced) {
      const c = cursor.current; const moved = lastCursor.current.distanceTo(c)
      const press = pressing.current
      if (moved > 0.02) {
        // a wide wake: the snow flies up and away with the cursor, more of it the faster it goes, and a furrow is ploughed behind;
        // pressed, the cursor drags a trench and throws the snow out of it
        const mx = (c.x - lastCursor.current.x) / moved, mz = (c.z - lastCursor.current.z) / moved; const sp = Math.min(6, moved / Math.max(d, 1e-3) * 0.12)
        kick(field, c.x, c.z, 2.6, Math.min(9, 2.6 + sp * 1.1) + (press ? 2.5 : 0), Math.round(70 + sp * 16) + (press ? 40 : 0), mx * sp * 1.4, mz * sp * 1.4)
        kick(field, c.x + mx * 1.2, c.z + mz * 1.2, 1.5, 2.6 + sp * 0.6, 36, mx * sp, mz * sp)   // the bow wave, ahead
        // each pass takes more snow out (it adds up: a track worn deeper the more you go over it)
        const rate = press ? 4.5 : 1.7
        heap(trail, c.x, c.z, press ? 1.5 : 1.25, rate * d); heap(trail, c.x - mx * 0.6, c.z - mz * 0.6, 1.0, rate * 0.6 * d)
        dig.current = press ? Math.max(dig.current, 1.2) : 0.4; stir.current = 0
      } else {
        // held still, the cursor digs: the hole deepens the longer it stays (fast when pressed), and the snow it lifts flies out and lands around
        dig.current = Math.min(press ? 2.0 : 1.3, dig.current + d * (press ? 1.6 : 0.35))
        heap(trail, c.x, c.z, 1.1 + dig.current * 0.35, (press ? 1.6 : 0.35) * d)
        stir.current += d; if (stir.current > (press ? 0.06 : 0.12)) { stir.current = 0
          const dg = dig.current
          const a = Math.random() * Math.PI * 2, rr = Math.random() * 1.2
          kick(field, c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, 1.0 + dg * 0.4, (press ? 5 : 1.6) + dg * 1.6, press ? 26 : 5 + Math.round(dg * 4)) }
      }
      lastCursor.current.copy(c)
    }
    // the fox goes straight to the cursor, held outside the igloo and Chimin, and stops when it gets there
    const F = f.current
    if (F.leaving) F.goal.set(10, 0, 12)
    else if (hasCursor.current) {
      _g.copy(cursor.current); keepOut(_g, 0, 0, R + 1.4); keepOut(_g, CHIMIN[0], CHIMIN[1], KEEP_CHIMIN)
      if (_g.distanceTo(F.goal) > 0.45) F.goal.copy(_g)   // re-aim only when the cursor has really moved
    }
    const dx = F.goal.x - F.x, dz = F.goal.z - F.z; const dist = Math.hypot(dx, dz)
    if (F.leap > 0) {
      // mid-leap: an arc from one side of Chimin to the other, legs tucked, nothing pressed into the snow
      // a crouch first (nothing moves, the body gathers), then the spring: the arc runs over the rest of the time
      F.leapT = Math.min(1, F.leapT + d / F.leap); const t = F.leapT; const a = Math.max(0, (t - 0.16) / 0.84)
      const e = a < 0.5 ? 2 * a * a : 1 - 2 * (1 - a) * (1 - a)
      F.x = F.leapFrom.x + (F.leapTo.x - F.leapFrom.x) * e; F.z = F.leapFrom.z + (F.leapTo.z - F.leapFrom.z) * e; F.lift = 4 * a * (1 - a) * 1.8
      F.moving = true; F.idle = 0; F.speed = 4
      if (t >= 1) { F.leap = 0; F.lift = 0; if (!reduced) { stamp(trail, F.x, F.z, 0.7, 0.9); kick(field, F.x, F.z, 1.8, 5, 50) } }
    } else {
    const want = dist > 0.3 ? Math.min(4.0, 1.0 + dist * 0.8) : 0
    F.speed += (want - F.speed) * Math.min(1, d * (want > F.speed ? 3.5 : 7))
    F.moving = F.speed > 0.08 && dist > 0.02
    if (F.moving) {
      const step = Math.min(dist, F.speed * d); const hx = dx / dist, hz = dz / dist
      // if the straight way crosses Chimin's hollow, leap over her from its near edge to its far edge
      const cx = CHIMIN[0] - F.x, cz = CHIMIN[1] - F.z; const along = cx * hx + cz * hz; const perp = Math.abs(cx * hz - cz * hx); const cd = Math.hypot(cx, cz)
      if (along > 0 && along < dist && perp < KEEP_CHIMIN - 0.2 && cd < KEEP_CHIMIN + 0.7 && !reduced) {
        const half = Math.sqrt(Math.max(0, KEEP_CHIMIN * KEEP_CHIMIN - perp * perp)); const exit = along + half + 0.5
        F.leapFrom.set(F.x, 0, F.z); F.leapTo.set(F.x + hx * exit, 0, F.z + hz * exit); F.leap = Math.max(0.9, exit / 4.5); F.leapT = 0
        kick(field, F.x, F.z, 1.2, 3.5, 30)
      } else {
        _g.set(F.x + hx * step, 0, F.z + hz * step)
        // round the igloo: if the step lands inside its circle, walk along the circle toward the goal instead
        const nd = Math.hypot(_g.x, _g.z); if (nd < R + 1.0) { const a0 = Math.atan2(F.x, F.z), ag = Math.atan2(F.goal.x, F.goal.z); let da = ag - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); const a1 = a0 + Math.sign(da || 1) * step / (R + 1.0); _g.set(Math.sin(a1) * (R + 1.0), 0, Math.cos(a1) * (R + 1.0)) }
        keepOut(_g, CHIMIN[0], CHIMIN[1], KEEP_CHIMIN)
        F.x = _g.x; F.z = _g.z
      }
      F.gait += d * (3 + F.speed * 1.3); F.idle = 0
      // its heading turns smoothly; its picture flips only when it is clearly going the other way
      const want_h = Math.atan2(hx, hz); let dh = want_h - F.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); F.heading += dh * Math.min(1, d * 5)
      const billF = Math.atan2(camera.position.x - F.x, camera.position.z - F.z); const lateral = hx * Math.cos(billF) - hz * Math.sin(billF)   // + = moving toward the camera's right
      const vs = viewState.current.cur; const flip = vs === 'leap' ? F.flip : lateral < -0.25 ? true : lateral > 0.25 ? false : F.flip
      if (flip !== F.flip) { F.flip = flip; setFoxFlip(flip) }
      // the fox wades a furrow, and each stride leaves a paw print: front and back paws, left and right in turn
      if (!reduced && F.leap === 0) {
        stamp(trail, F.x, F.z, 0.55, 0.32)
        const ph = Math.floor(F.gait / Math.PI); if (ph !== F.stepPh) { F.stepPh = ph; const fwd = ph % 2 === 0 ? 0.42 : -0.42, side = (ph % 4 < 2 ? 1 : -1) * 0.15
          stamp(trail, F.x + hx * fwd - hz * side, F.z + hz * fwd + hx * side, 0.27, 0.85) }
        kick(field, F.x - hx * 0.4, F.z - hz * 0.4, 1.2, 2.4 + F.speed * 0.5, Math.round(10 + F.speed * 4))
      }
    } else F.idle += d
    }
    // after a while it sits down    } else F.idle += d
    // after a while it sits down; when it is called again it gets up (the pictures cross-dissolve)
    F.sitting = F.idle > 3.5 && !F.leaving && !reduced
    if (fox.current) {
      const bob = F.moving ? Math.abs(Math.sin(F.gait)) * (0.06 + 0.1 * Math.max(0, Math.min(1, (F.speed - 2.3) / 1.7))) * Math.min(1, F.speed / 2) : 0
      fox.current.position.set(F.x, H(F.x, F.z) + 0.02 + bob + F.lift - trailAt(trail, F.x, F.z) * 0.3 * (1 - Math.min(1, F.lift)), F.z)  // sunk to the belly: its legs are in the snow; lifted mid-leap
      const la = F.leap > 0 ? Math.max(0, (F.leapT - 0.16) / 0.84) : 0
      fox.current.rotation.z = F.leap > 0 ? (F.flip ? 1 : -1) * (0.4 - 0.8 * la) : F.moving ? Math.sin(F.gait) * 0.05 : 0   // nose up on the way up, level at the top, down on the way down
      // its picture turns with its heading, up to a three-quarter view, so it can come toward you and go away
      const bill = Math.atan2(camera.position.x - F.x, camera.position.z - F.z)
      // which picture: coming toward you → the front view, going away → the back view, otherwise the side (walking,
      // galloping when fast, stretched mid-leap), and the sleeping one when it has waited; each switch waits a beat
      const rel = Math.abs(Math.atan2(Math.sin(F.heading - bill), Math.cos(F.heading - bill)))   // 0 = straight at the camera, π = away
      const V = viewState.current; const inView = (k: FoxView) => V.cur === k
      // each view is entered at one threshold and left at a wider one, so it never chatters at the edge
      // one drawing, turning: the side view is the fox; the leap picture only while it is in the air, the sleeping
      // one only once it has stopped and lain down (the front, back and gallop pictures stay loaded but unused, so the
      // fox is always the same animal on screen)
      let want: FoxView
      if (F.sitting) want = 'sit'
      else if (F.leap > 0 && la > 0.02) want = 'leap'
      else want = 'side'
      void rel; void inView
      if (want !== V.want) { V.want = want; V.since = t0.current }
      if (!V.init && views.side.current) { for (const k of Object.keys(views) as FoxView[]) if (k !== 'side' && views[k].current) views[k].current!.mat.uniforms.uOpacity.value = 0; V.init = true; V.at = t0.current }
      const dwell = t0.current - V.at, held = t0.current - V.since
      const urgent = want === 'leap' || V.cur === 'leap'
      if (V.want !== V.cur && (urgent || (held > 0.3 && dwell > 0.8)) && views[V.want].current && views[V.cur].current) {
        const dur = urgent ? 0.18 : V.want === 'sit' || V.cur === 'sit' ? 0.9 : 0.45
        views[V.cur].current!.fade(0, dur); views[V.want].current!.fade(1, dur); V.cur = V.want; V.at = t0.current
      }
      // the side pictures turn up to a three-quarter view toward the side you see them from; the front and back face you
      const side1 = F.heading + Math.PI / 2, side2 = F.heading - Math.PI / 2
      const d1 = Math.atan2(Math.sin(side1 - bill), Math.cos(side1 - bill)), d2 = Math.atan2(Math.sin(side2 - bill), Math.cos(side2 - bill))
      const turn = Math.max(-0.7, Math.min(0.7, Math.abs(d1) < Math.abs(d2) ? d1 : d2))   // toward its heading, up to a three-quarter view
      const wantYaw = bill + turn; let dy = wantYaw - F.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); F.yaw += dy * Math.min(1, d * 4)
      fox.current.rotation.y = F.yaw
    }
    // the fox is alive: its head nods, its tail swings, its legs stride when it walks, it breathes and blinks
    { const t = t0.current, P = foxPose.current, g = F.gait, mv = F.moving ? 1 : 0
      P.angles[0] = 0.05 * Math.sin(t * 1.7) + 0.07 * Math.sin(g) * mv                                  // head
      P.angles[1] = 0.16 * Math.sin(t * 2.1) + 0.22 * Math.sin(g * 0.5) * mv                            // tail
      const st = Math.min(1, F.speed / 2.5)                                                            // the stride eases in with its speed
      const gallop = Math.max(0, Math.min(1, (F.speed - 2.4) / 1.3))                                   // a trot at a walk, a gallop when it runs
      const A = (0.42 + 0.22 * gallop) * mv * st
      // trot: diagonal pairs swing together; gallop: the front pair together, the back pair together, a little behind
      const trotN = Math.sin(g), trotF = -Math.sin(g); const galF = Math.sin(g), galB = -Math.sin(g - 1.1)
      const idle = 0.03 * Math.sin(t * 1.1)
      let fn = idle + A * (trotN * (1 - gallop) + galF * gallop), ff = idle + A * (trotF * (1 - gallop) + galF * gallop)
      let bn = -idle + A * (trotF * (1 - gallop) + galB * gallop), bf = -idle + A * (trotN * (1 - gallop) + galB * gallop)
      if (F.leap > 0) {
        // the leap in three: the crouch (legs gathered under), the spring (back legs drive back, front legs fold),
        // the flight (all four stretched), the landing (front legs reach down, back legs tuck under)
        const lt = F.leapT
        const ph = lt < 0.16 ? 0 : lt < 0.4 ? 1 : lt < 0.72 ? 2 : 3
        const k = lt < 0.16 ? lt / 0.16 : lt < 0.4 ? (lt - 0.16) / 0.24 : lt < 0.72 ? (lt - 0.4) / 0.32 : (lt - 0.72) / 0.28
        const F1 = [0.15, -0.45, 0.95, 0.35][ph], F0 = [0, 0.15, -0.45, 0.95][ph]; const B1 = [0.15, -0.95, -0.85, -0.1][ph], B0 = [0, 0.15, -0.95, -0.85][ph]
        const fv = F0 + (F1 - F0) * k, bv = B0 + (B1 - B0) * k
        fn = fv; ff = fv * 0.92; bn = bv; bf = bv * 0.92
        P.breath = ph === 0 ? -0.06 * k : ph === 1 ? -0.06 + 0.09 * k : ph === 2 ? 0.03 : 0.03 - 0.03 * k
        P.angles[1] = 0.16 * Math.sin(t * 2.1) + (ph <= 1 ? 0.25 : ph === 2 ? 0.45 : 0.2)
      }
      P.angles[2] = fn; P.angles[3] = ff; P.angles[4] = bn; P.angles[5] = bf
      if (F.leap === 0) P.breath = 0.008 * Math.sin(t * 2.0)
      if (t > F.nextBlink) { F.blinkT = 0; F.nextBlink = t + 2.5 + Math.random() * 4 }
      F.blinkT += d; P.blink = F.blinkT < 0.16 ? Math.sin((F.blinkT / 0.16) * Math.PI) : 0
      if (reduced || dbg.current.noRig) { P.angles.fill(0); P.breath = 0 } }
    // Chimin is alive too: she breathes, her head turns a little; hovered, she makes a snow angel and pushes the letters
    { const t = t0.current, P = chiminPose.current, A = angel.current
      A.on += ((chiminHover && !reduced ? 1 : 0) - A.on) * Math.min(1, d * 2.5); A.phase += d * 3.4 * A.on
      const sw = Math.sin(A.phase) * A.on
      P.angles[0] = 0.04 * Math.sin(t * 0.7) + 0.06 * sw                                                // head
      P.angles[1] = -0.03 * Math.sin(t * 0.9) - 0.5 * sw                                                // left arm (up together)
      P.angles[2] = 0.03 * Math.sin(t * 0.9 + 0.5) + 0.5 * sw                                           // right arm
      P.angles[3] = 0.02 * Math.sin(t * 0.8 + 1.0) + 0.28 * sw                                          // left leg (out together)
      P.angles[4] = -0.02 * Math.sin(t * 0.8 + 1.5) - 0.28 * sw                                         // right leg
      P.breath = 0.006 * Math.sin(t * 1.3)
      if (reduced || dbg.current.noRig) { P.angles.fill(0); P.breath = 0 }
      // she is pressed into the snow: her whole body leaves its bed, and when she makes the angel her arms and legs
      // sweep it wider with every stroke (the mittens and boots throw the letters up)
      if (chiminGrp.current && !reduced) {
        const W = 4.2, Hh = 4.2 * CHIMIN_ASPECT; const sweep = Math.abs(Math.cos(A.phase)) * A.on
        for (const [u, v, bone, r] of CHIMIN_BODY) {
          let x = (u - 0.5) * W, y = (v - 0.5) * Hh
          if (bone >= 0) { const b = CHIMIN_BONES[bone]; const px = (b.pivot[0] - 0.5) * W, py = (b.pivot[1] - 0.5) * Hh; const a = P.angles[bone]
            const qx = x - px, qy = y - py; x = px + qx * Math.cos(a) - qy * Math.sin(a); y = py + qx * Math.sin(a) + qy * Math.cos(a) }
          _p.set(x, y, 0); chiminGrp.current.localToWorld(_p)
          const limb = bone > 0; const tip = limb && (u < 0.1 || u > 0.9 || v < 0.2)
          stamp(trail, _p.x, _p.z, r + (limb ? 0.12 * A.on : 0), limb ? 0.55 + 0.35 * A.on : 0.6)
          if (tip && sweep > 0.3) kick(field, _p.x, _p.z, 0.9, 3.0 * sweep, 6)
        }
      } }
    if (!reduced) { stepField(field, d); settleTrail(trail, d) }

    if (!entering.current && !reduced) { camera.position.x += (home.x + par.current.x * 2.2 - camera.position.x) * 0.04; camera.position.y += (home.y - par.current.y * 0.9 - camera.position.y) * 0.04 }
    camera.lookAt(look)
  })
  useEffect(() => { camera.position.copy(home); camera.lookAt(look) }, [camera, home, look])

  const iglooY = H(0, 0)
  const piece = { tint: pieceTint, snow: cur.white, light: cur.light, shadow: cur.shadow, fog: true, frost: 0.16, grain: 0.3 }
  return (
    <>
      <color attach="background" args={['#e8e3f1']} />
      <fog attach="fog" args={['#e8e3f1', 24, 72]} />
      <mesh material={skyMat} renderOrder={-1}><sphereGeometry args={[150, 32, 16]} /></mesh>
      {/* the snow: the piled ground and the letters on it; the snow in the air is letters too */}
      <mesh ref={moundRef} geometry={mound} material={moundMat} />
      <primitive object={field.mesh} />
      {/* the igloo, set into the middle mound, its base in the snow */}
      <Piece url={paper('igloo-back')} width={12.4} position={[0, iglooY + 2.6, -2.6]} rotation={[-0.06, 0, 0]} delay={0.2} glisten={1} puff={0.5} relief={0.7} solid sink={0.1} {...piece} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <Piece url={paper('igloo-front')} width={11.6} position={[0, iglooY + 2.2, 1.2]} rotation={[-0.05, 0, 0]} delay={0.5} glisten={1} puff={0.5} relief={0.7} solid sink={0.12} {...piece} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <Piece url={paper('igloo-arch')} width={4.6} position={[0, H(0, 3.9) + 1.2, 3.9]} rotation={[-0.04, 0, 0]} delay={0.8} glisten={1} puff={0.3} relief={0.7} solid sink={0.14} {...piece} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <DoorFill mat={doorFill} y={H(0, 3.9) + 1.2} />
      <mesh ref={doorRef} position={[0, H(0, 3.9) + 0.8, 4.12]} material={doorMat}><planeGeometry args={[2.0, 2.2]} /></mesh>
      {/* Chimin, lying in the snow */}
      <group ref={chiminGrp} position={[chiminPos.x, H(chiminPos.x, chiminPos.z) + 0.68, chiminPos.z]} quaternion={chiminQuat}>
        <Piece url={paper('chimin')} width={4.2} position={[0, 0, 0]} delay={1.1} solid {...piece} glisten={0.35} puff={0.28} relief={1} bones={CHIMIN_BONES} pose={chiminPose} onHover={h => { setHover(h ? 'chimin' : null); setChiminHover(h) }} onClick={onAbout} />
      </group>
      {/* the fox, wading */}
      <group ref={fox}>
        <Piece url={paper('fox-side')} width={3.2} position={[0, 0.5, 0]} delay={1.4} flip={foxFlip} sink={0.2} {...piece} glisten={0.4} puff={0.25} relief={1} bones={FOX_BONES} pose={foxPose} eye={[0.9, 0.72, 0.02, 0.018]} control={views.side} />
        <Piece url={paper('fox-leap')} width={3.5} position={[0, 0.62, 0.02]} delay={0} opacity={0} flip={foxFlip} {...piece} glisten={0.4} puff={0.25} relief={1} control={views.leap} />
        <Piece url={paper('fox-sit')} width={2.3} position={[0, 0.62, 0.05]} delay={0} opacity={0} flip={foxFlip} sink={0.25} {...piece} glisten={0.4} puff={0.25} relief={1} control={views.sit} />
      </group>
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.96} luminanceSmoothing={0.08} intensity={0.55} mipmapBlur />
        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.15} darkness={0.3} />
      </EffectComposer>
    </>
  )
}

export function Letters({ onEnter, onAbout }: Props) {
  const [hover, setHover] = useState<'igloo' | 'chimin' | null>(null)
  const [entering, setEntering] = useState(false)
  const enterRef = useRef<() => void>(() => {})
  const darkRef = useRef<HTMLDivElement>(null)
  const enter = () => { setEntering(true); enterRef.current() }
  // scrolling forward walks in
  const scrolled = useRef(0)
  const onWheel = (e: React.WheelEvent) => { scrolled.current = Math.max(0, scrolled.current + e.deltaY); if (scrolled.current > 260) enter() }
  return (
    <div className={`snow ${entering ? 'snow--entering' : ''} ${hover ? `snow--hover-${hover}` : ''}`} onWheel={onWheel}>
      <div className="snow__canvas">
        <Canvas dpr={[1, 1.5]} camera={{ fov: 36, near: 0.1, far: 400, position: [0, 8.2, 23] }} gl={{ antialias: true, powerPreference: 'high-performance' }} onPointerDown={() => { if (hover === 'igloo') enter() }}>
          <Suspense fallback={null}>
            <Scene onEnter={onEnter} onAbout={onAbout} setHover={setHover} enterRef={enterRef} darkRef={darkRef} />
          </Suspense>
        </Canvas>
      </div>
      <h1 className="snow__name display">Chimin</h1>
      <p className="snow__hint label">{hover === 'chimin' ? 'that’s me · making a snow angel · click for about' : hover === 'igloo' ? 'go inside' : 'the snow is made of letters · the fox follows your cursor · scroll, or click the igloo, to go in'}</p>
      <button type="button" className="snow__go label" onClick={enter}>go inside →</button>
      <div ref={darkRef} className="snow__dark" aria-hidden="true" />
    </div>
  )
}


// ------------------------------------------------------------------ the view through the igloo's window
/**
 * A small far field of the same letter snow, under the same sky, for the room to look out on: everything from the
 * window's sill to the horizon. It eases the time of day on its own; `cur` is the room's reference for the light.
 */
export type SnowView = { group: THREE.Group; cur: Cur; tick: (dt: number, reduced: boolean) => void }
export function makeSnowView(): SnowView {
  const group = new THREE.Group()
  const atlas = glyphAtlas(); const field = buildField(atlas, 22000, 160, -60, -9.5, 34)
  const mound = new THREE.Mesh(moundGeometryRect(-40, 40, -70, -8.5), snowMaterial()); (mound.material as THREE.ShaderMaterial).uniforms.uAlpha.value = 1
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), skyMaterial()); sky.renderOrder = -1
  const flat = makeTrail(); flat.tex.needsUpdate = true   // an untouched surface, so the shaders read level ground
  for (const m of [mound.material as THREE.ShaderMaterial, field.mesh.material as THREE.ShaderMaterial]) m.uniforms.uTrail.value = flat.tex
  group.add(sky, mound, field.mesh)
  const cur = newCur(), tgt = newCur(); setLook(cur, LOOKS[getMode()]); setLook(tgt, LOOKS[getMode()])
  window.addEventListener('modechange', () => setLook(tgt, LOOKS[getMode()]))
  const dummy = new THREE.Vector3(); let t0 = 0
  const tick = (dt: number, reduced: boolean) => {
    const d = Math.min(dt, 0.05); t0 += d; const k = Math.min(1, d * 2.2)
    for (const key of ['white', 'shadow', 'light', 'sky', 'mid', 'horizon', 'band', 'sun'] as const) cur[key].lerp(tgt[key], k)
    cur.bandI += (tgt.bandI - cur.bandI) * k; cur.sunDir.lerp(tgt.sunDir, k).normalize()
    cur.sparkle += (tgt.sparkle - cur.sparkle) * k; cur.aurora += (tgt.aurora - cur.aurora) * k; cur.glow += (tgt.glow - cur.glow) * k; cur.stars += (tgt.stars - cur.stars) * k
    for (const m of [mound.material as THREE.ShaderMaterial, field.mesh.material as THREE.ShaderMaterial]) {
      const u = m.uniforms; u.uWhite.value.copy(cur.white).lerp(cur.mid, 0.16); u.uShadow.value.copy(cur.shadow).lerp(cur.sky, 0.12); u.uLight.value.copy(cur.light); u.uLightDir.value.copy(cur.sunDir)
      u.uAurora.value = cur.aurora; u.uTime.value = reduced ? 0.3 : t0; u.uSparkle.value = cur.sparkle; u.fogColor.value.copy(cur.horizon); u.uCursor.value.copy(dummy); u.uCursorOn.value = 0; u.uDoorGlow.value = 0
    }
    const su = (sky.material as THREE.ShaderMaterial).uniforms; su.uTop.value.copy(cur.sky); su.uMid.value.copy(cur.mid); su.uBot.value.copy(cur.horizon); su.uSun.value.copy(cur.sun); su.uSunDir.value.copy(cur.sunDir)
    su.uAurora.value = cur.aurora; su.uStars.value = cur.stars; su.uTime.value = t0; su.uBand.value.copy(cur.band); su.uBandI.value = cur.bandI
    if (!reduced) stepField(field, d)
  }
  return { group, cur, tick }
}
