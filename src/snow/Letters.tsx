import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
const N = typeof window !== 'undefined' && window.innerWidth < 760 ? 48000 : 96000  // letters at rest on the field (fewer on a phone)
const NF = 600          // letters falling from the sky
const R = 5.6           // igloo footprint radius
const CHARS = 'AaBbCcdDeEfFgGhHiJjkKLMmnNoOPpqrRsStTuvVwWxyzZ'

type Look = { white: string; shadow: string; light: string; sky: string; mid: string; horizon: string; sun: string; sunDir: [number, number, number]; sparkle: number; aurora: number; glow: number; stars: number }
const LOOKS: Record<Mode, Look> = {
  day: { white: '#f4f5fc', shadow: '#a7b6ea', light: '#fff1d4', sky: '#93aae6', mid: '#c9d5f4', horizon: '#e8e3f1', sun: '#fff0d0', sunDir: [-0.35, 0.42, -0.84], sparkle: 1.0, aurora: 0, glow: 0, stars: 0 },
  evening: { white: '#f7e4d4', shadow: '#bda6cb', light: '#ffb27a', sky: '#6f66b4', mid: '#dc93a8', horizon: '#ffd6ad', sun: '#ffb070', sunDir: [-0.55, 0.14, -0.82], sparkle: 0.8, aurora: 0, glow: 0.45, stars: 0.2 },
  night: { white: '#7181c9', shadow: '#2b3470', light: '#b9c6ff', sky: '#080d28', mid: '#171f4a', horizon: '#2d3b72', sun: '#c9d4ff', sunDir: [0.4, 0.55, -0.73], sparkle: 1.9, aurora: 1, glow: 1, stars: 1 },
}

// ------------------------------------------------------------------ the ground: mounds, drifts, and a hollow where Chimin lies
const CHIMIN: [number, number] = [-6.0, 6.2]
const KEEP_CHIMIN = 3.7   // the fox never comes closer to her than this
// Chimin's picture (a snow angel from above, 1086×1432): pivots and regions in picture uv, origin bottom left
const CHIMIN_ASPECT = 1432 / 1086
const CHIMIN_BONES: Bone[] = [
  { pivot: [0.5, 0.70], region: [0.5, 0.80, 0.17, 0.13] },     // head
  { pivot: [0.38, 0.70], region: [0.20, 0.72, 0.22, 0.13] },   // left arm
  { pivot: [0.62, 0.70], region: [0.80, 0.72, 0.22, 0.13] },   // right arm
  { pivot: [0.42, 0.42], region: [0.27, 0.27, 0.20, 0.22] },   // left leg
  { pivot: [0.58, 0.42], region: [0.73, 0.27, 0.20, 0.22] },   // right leg
]
const CHIMIN_TIPS: [number, number, number][] = [[0.08, 0.73, 1], [0.92, 0.73, 2], [0.16, 0.16, 3], [0.84, 0.16, 4]] // mittens and boots: uv and their bone
// the fox's picture (side view walking right, 1505×995)
const FOX_BONES: Bone[] = [
  { pivot: [0.76, 0.58], region: [0.87, 0.72, 0.15, 0.20] },   // head
  { pivot: [0.42, 0.52], region: [0.22, 0.38, 0.24, 0.30] },   // tail
  { pivot: [0.74, 0.42], region: [0.74, 0.18, 0.13, 0.20] },   // front legs
  { pivot: [0.50, 0.42], region: [0.50, 0.18, 0.13, 0.20] },   // back legs
]
const MOUNDS: [number, number, number, number][] = [ // x, z, radius, height
  [0, 0, 9.5, 2.2], [-12, -6, 7, 1.6], [13, -9, 8, 1.9], [-10, 10, 5, 0.9], [11, 7, 5.5, 1.1], [-22, 2, 8, 1.4], [22, 4, 7, 1.2], [3, -18, 12, 2.4], [-3, 17, 6, 0.8], [0, 26, 10, 1.6],
  [CHIMIN[0], CHIMIN[1], 3.1, -0.65],
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
  y += (noise2(x * 0.18 + 3.1, z * 0.18) - 0.5) * 0.9 + (noise2(x * 0.55, z * 0.55 + 7.3) - 0.5) * 0.3 + (noise2(x * 1.7 + 1.3, z * 1.7) - 0.5) * 0.1
  return y
}
function normalAt(x: number, z: number, out: THREE.Vector3) {
  const e = 0.15
  out.set(H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)).normalize(); return out
}

function moundGeometry() {
  const seg = 180; const geo = new THREE.PlaneGeometry(G, G, seg, seg); geo.rotateX(-Math.PI / 2)
  const p = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)))
  geo.computeVertexNormals(); return geo
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
    vec3 col = mix(shadow, white, smoothstep(0.3, 1.0, wrap));
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
  // the aurora, as a wash on the ground
  vec3 auroraOn(vec3 w, float time){
    vec2 p = w.xz * 0.25; float b = pow(0.5 + 0.5 * sin(p.x * 1.4 + p.y * 0.8 + time * 0.3 + sin(p.y * 1.2 - time * 0.2) * 2.0), 3.0);
    vec3 ac = mix(vec3(0.35, 0.9, 0.65), vec3(0.6, 0.45, 0.9), 0.5 + 0.5 * sin(p.x * 0.8 - time * 0.17)); return ac * b * 0.35; }
`
const snowUniforms = () => ({
  uLightDir: { value: new THREE.Vector3(-0.35, 0.42, -0.84).normalize() }, uWhite: { value: new THREE.Color('#fcfcff') }, uShadow: { value: new THREE.Color('#b4c1ee') }, uLight: { value: new THREE.Color('#fff4dc') },
  uAurora: { value: 0 }, uTime: { value: 0 }, uSparkle: { value: 1 }, fogColor: { value: new THREE.Color('#f3ecf3') }, fogNear: { value: 24 }, fogFar: { value: 72 },
  uCursor: { value: new THREE.Vector3() }, uCursorOn: { value: 0 },
})

function snowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: snowUniforms(),
    vertexShader: `varying vec3 vW; varying vec3 vN; varying float vFog;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vec4 mv = viewMatrix * w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uLightDir, uWhite, uShadow, uLight, fogColor, uCursor; uniform float fogNear, fogFar, uAurora, uTime, uSparkle, uCursorOn;
      varying vec3 vW; varying vec3 vN; varying float vFog;
      ${SNOW_GLSL}
      void main(){
        vec3 V = normalize(cameraPosition - vW); vec3 n = normalize(vN);
        float ring = smoothstep(2.6, 0.3, distance(vW.xz, uCursor.xz)) * uCursorOn;
        // a soft grain and a gentle pile pattern, so the surface between the letters is not flat paint
        float grain = fbm(vW.xz * 2.3) - 0.5; n = normalize(n + vec3(grain * 0.25, 0.0, (fbm(vW.zx * 2.9) - 0.5) * 0.25));
        float depth = smoothstep(1.2, -0.6, vW.y);
        vec3 col = snowShade(n, V, uLightDir, uWhite, uShadow, uLight, depth);
        col *= 0.96 + 0.08 * fbm(vW.xz * 9.0);
        col += uLight * ring * 0.1;
        col += uLight * glitter(vW, n, V, uLightDir, uTime) * uSparkle * (1.0 + ring * 2.5);
        if (uAurora > 0.001) col += auroraOn(vW, uTime) * uAurora;
        float f = smoothstep(fogNear, fogFar, vFog); col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, 1.0); }`,
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
      attribute float aGlyph; attribute vec3 aColor; attribute float aSeed; uniform vec3 uCursor; uniform float uCursorOn, uTime;
      varying vec2 vUv; varying vec3 vColor; varying vec3 vN; varying vec3 vW; varying float vFog; varying float vSeed; varying float vRing;
      void main(){
        float col = mod(aGlyph, 8.0), row = floor(aGlyph / 8.0); vUv = (uv + vec2(col, row)) / 8.0; vColor = aColor; vSeed = aSeed;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        // under the cursor the letters stir: they lift a little and shimmer
        vRing = smoothstep(2.6, 0.3, distance(w.xz, uCursor.xz)) * uCursorOn;
        w.y += vRing * 0.16 * (0.5 + 0.5 * sin(uTime * 5.0 + aSeed * 40.0));
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0));
        vec4 mv = viewMatrix * w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform vec3 uLightDir, uWhite, uShadow, uLight, fogColor; uniform float fogNear, fogFar, uAurora, uTime, uSparkle;
      varying vec2 vUv; varying vec3 vColor; varying vec3 vN; varying vec3 vW; varying float vFog; varying float vSeed; varying float vRing;
      ${SNOW_GLSL}
      void main(){
        float a = texture2D(uAtlas, vUv).a; if (a < 0.38) discard;
        vec3 V = normalize(cameraPosition - vW); vec3 n = normalize(vN); if (dot(n, V) < 0.0) n = -n;
        float depth = smoothstep(1.2, -0.6, vW.y);
        vec3 col = snowShade(n, V, uLightDir, uWhite, uShadow, uLight, depth) * vColor;
        // a grain over the stroke, and a soft blue edge, so the snow reads as letters when you look
        col *= 0.92 + 0.16 * fbm(vW.xz * 38.0 + vSeed * 9.0);
        float edge = 1.0 - smoothstep(0.38, 0.8, a); col = mix(col, uShadow, edge * 0.32);
        // each letter is a facet: some catch the light hard as the camera moves
        vec3 Rf = reflect(-uLightDir, n); float glint = pow(max(0.0, dot(Rf, V)), 24.0 + vSeed * 40.0);
        col += uLight * glint * (0.3 + vSeed * 1.0) * uSparkle * (1.0 + vRing * 1.5);
        col += uLight * glitter(vW, n, V, uLightDir, uTime) * uSparkle * (0.5 + vRing * 1.5);
        col += uLight * vRing * 0.1;
        if (uAurora > 0.001) col += auroraOn(vW, uTime) * uAurora;
        float f = smoothstep(fogNear, fogFar, vFog); col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, 1.0); }`,
    side: THREE.DoubleSide,
  })
}

// ------------------------------------------------------------------ sparkles on the surface, and snow dust in the air
function makeSparkles(count = 1500) {
  const pos = new Float32Array(count * 3), phase = new Float32Array(count), speed = new Float32Array(count), size = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 60, z = -30 + Math.random() * 50
    pos[i * 3] = x; pos[i * 3 + 1] = H(x, z) + 0.1; pos[i * 3 + 2] = z
    phase[i] = Math.random() * Math.PI * 2; speed[i] = 0.6 + Math.random() * 2.4; size[i] = 0.1 + Math.random() * Math.random() * 0.45
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uGain: { value: 1 }, uColor: { value: new THREE.Color('#ffffff') } },
    vertexShader: `attribute float aPhase, aSpeed, aSize; uniform float uTime, uPixel, uGain; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float tw = pow(0.5+0.5*sin(uTime*aSpeed+aPhase), 6.0); vA = tw*uGain;
      gl_PointSize = aSize * uPixel * (300.0 / -mv.z) * (0.6+0.8*tw); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; uniform vec3 uColor; void main(){ vec2 p = gl_PointCoord-0.5; float d = length(p);
      float core = smoothstep(0.5, 0.08, d); float star = max(0.0, 1.0-abs(p.x)*9.0)*max(0.0,1.0-abs(p.y)*40.0) + max(0.0, 1.0-abs(p.y)*9.0)*max(0.0,1.0-abs(p.x)*40.0);
      float a = (core + star*0.7) * vA; gl_FragColor = vec4(uColor, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  return new THREE.Points(geo, mat)
}

function makeDust(count = 420) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count)
  for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = -6 + Math.random() * 28; seed[i] = Math.random() }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uColor: { value: new THREE.Color('#ffffff') }, uGain: { value: 1 } },
    vertexShader: `attribute float aSeed; uniform float uTime, uPixel; varying float vA;
      void main(){ vec3 p = position; float t = uTime * (0.25 + aSeed * 0.35);
        p.y = mod(p.y - t, 14.0); p.x += sin(t * 0.7 + aSeed * 20.0) * 0.8; p.z += cos(t * 0.5 + aSeed * 13.0) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = 0.18 + 0.35 * aSeed;
        gl_PointSize = (0.12 + aSeed * 0.22) * uPixel * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; uniform vec3 uColor; uniform float uGain; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA * uGain; gl_FragColor = vec4(uColor, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  return new THREE.Points(geo, mat)
}

// ------------------------------------------------------------------ the letters as particles
type Field = {
  mesh: THREE.InstancedMesh; pos: Float32Array; quat: Float32Array; scl: Float32Array; vel: Float32Array; ang: Float32Array
  flying: Uint8Array; falling: Uint8Array; list: number[]
}
// mostly white; a few cooler letters give the snow its blue shadows
const PALETTE = [[1, 1, 1], [1, 1, 1], [0.97, 0.97, 1], [0.93, 0.95, 1.0], [0.88, 0.91, 1.0], [0.96, 0.92, 0.98]]
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

function buildField(atlas: THREE.Texture): Field {
  const total = N + NF
  const geo = new THREE.PlaneGeometry(1, 1)
  const glyph = new Float32Array(total), color = new Float32Array(total * 3), seed = new Float32Array(total)
  const pos = new Float32Array(total * 3), quat = new Float32Array(total * 4), scl = new Float32Array(total)
  const vel = new Float32Array(total * 3), ang = new Float32Array(total * 3), flying = new Uint8Array(total), falling = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    glyph[i] = Math.floor(Math.random() * 64); seed[i] = Math.random()
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)]
    color[i * 3] = c[0]; color[i * 3 + 1] = c[1]; color[i * 3 + 2] = c[2]
    scl[i] = 0.17 + Math.random() * Math.random() * 0.6
    if (i < N) {
      // the letters lie where the camera looks, denser toward it
      const x = (Math.random() - 0.5) * 72, z = -32 + 54 * Math.pow(Math.random(), 0.7); const under = i % 3 === 0
      pos[i * 3] = x; pos[i * 3 + 2] = z; pos[i * 3 + 1] = H(x, z) + (under ? -0.05 : 0.01 + Math.random() * 0.06)
      if (under) { color[i * 3] *= 0.86; color[i * 3 + 1] *= 0.88; color[i * 3 + 2] *= 0.97 }
      restOrientation(x, z, _q); quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
    } else {
      falling[i] = 1; flying[i] = 1; spawnSky(pos, vel, i * 3); pos[i * 3 + 1] = Math.random() * 20; scl[i] *= 0.65
      ang[i * 3] = (Math.random() - 0.5) * 2; ang[i * 3 + 1] = (Math.random() - 0.5) * 2; ang[i * 3 + 2] = (Math.random() - 0.5) * 2
      _q.setFromEuler(_e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)); quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
    }
  }
  geo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyph, 1)); geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
  const mesh = new THREE.InstancedMesh(geo, letterMaterial(atlas), total); mesh.frustumCulled = false
  for (let i = 0; i < total; i++) { _p.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); _q.set(quat[i * 4], quat[i * 4 + 1], quat[i * 4 + 2], quat[i * 4 + 3]); _s.setScalar(scl[i]); _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m) }
  mesh.instanceMatrix.needsUpdate = true
  const list: number[] = []; for (let i = N; i < total; i++) list.push(i)
  return { mesh, pos, quat, scl, vel, ang, flying, falling, list }
}

/** Kick the letters around a point: they leap up and away and tumble. */
function kick(f: Field, x: number, z: number, radius: number, strength: number, maxCount: number) {
  let n = 0; const r2 = radius * radius
  // sample a window of indices rather than every letter, so one kick costs the same each frame
  const start = Math.floor(Math.random() * N)
  for (let k = 0; k < 9000 && n < maxCount; k++) {
    const i = (start + k * 11) % N; if (f.flying[i]) continue
    const dx = f.pos[i * 3] - x, dz = f.pos[i * 3 + 2] - z; const d2 = dx * dx + dz * dz; if (d2 > r2) continue
    const d = Math.sqrt(d2) + 1e-3; const s = strength * (1 - d / radius) * (0.6 + Math.random() * 0.8)
    f.vel[i * 3] = (dx / d) * s * 0.9 + (Math.random() - 0.5) * 0.6; f.vel[i * 3 + 1] = s * (0.9 + Math.random() * 0.7); f.vel[i * 3 + 2] = (dz / d) * s * 0.9 + (Math.random() - 0.5) * 0.6
    f.ang[i * 3] = (Math.random() - 0.5) * 14; f.ang[i * 3 + 1] = (Math.random() - 0.5) * 14; f.ang[i * 3 + 2] = (Math.random() - 0.5) * 14
    f.flying[i] = 1; f.list.push(i); n++
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
      if (f.falling[i]) { spawnSky(f.pos, f.vel, b); keep.push(i) } // landed from the sky: start again up high
      else { // settle on the slope
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

// ------------------------------------------------------------------ the sky
function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color('#9db2ea') }, uMid: { value: new THREE.Color('#d3dcf6') }, uBot: { value: new THREE.Color('#f3ecf3') }, uSun: { value: new THREE.Color('#fff0d0') }, uSunDir: { value: new THREE.Vector3(-0.35, 0.42, -0.84) },
      uAurora: { value: 0 }, uStars: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop, uMid, uBot, uSun, uSunDir; uniform float uAurora, uStars, uTime; varying vec3 vP;
      ${SNOW_GLSL}
      void main(){
        float h = clamp(vP.y, 0.0, 1.0);
        vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.22, h)); c = mix(c, uTop, smoothstep(0.18, 0.75, h));
        // a haze of soft cloud low over the horizon
        float cl = fbm(vec2(atan(vP.x, vP.z) * 3.0, vP.y * 9.0) + uTime * 0.01);
        c = mix(c, uBot, smoothstep(0.35, 0.0, h) * cl * 0.5);
        // the sun (or the moon): a wide soft glow and a bright heart
        float s = max(0.0, dot(vP, normalize(uSunDir)));
        c += uSun * (pow(s, 6.0) * 0.28 + pow(s, 60.0) * 0.5 + pow(s, 400.0) * 0.8);
        if (uAurora > 0.001) { float a = atan(vP.x, vP.z); float band = sin(a*5.0 + uTime*0.25 + sin(a*2.0+uTime*0.1)*1.5);
          float y = smoothstep(0.05, 0.25, vP.y) * (1.0 - smoothstep(0.35, 0.7, vP.y)); float curtain = pow(0.5+0.5*band, 3.0) * y;
          vec3 ac = mix(vec3(0.45, 0.95, 0.7), vec3(0.65, 0.5, 0.95), 0.5+0.5*sin(a*3.0 - uTime*0.15)); c += ac * curtain * 0.55 * uAurora; }
        if (uStars > 0.001) { float star = step(0.9985, hash(floor(vP.xz*400.0))) * smoothstep(0.1,0.4,vP.y); c += star * 0.8 * uStars; }
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false,
  })
}

// ------------------------------------------------------------------ the scene
type Cur = { white: THREE.Color; shadow: THREE.Color; light: THREE.Color; sky: THREE.Color; mid: THREE.Color; horizon: THREE.Color; sun: THREE.Color; sunDir: THREE.Vector3; sparkle: number; aurora: number; glow: number; stars: number }
const newCur = (): Cur => ({ white: new THREE.Color(), shadow: new THREE.Color(), light: new THREE.Color(), sky: new THREE.Color(), mid: new THREE.Color(), horizon: new THREE.Color(), sun: new THREE.Color(), sunDir: new THREE.Vector3(), sparkle: 1, aurora: 0, glow: 0, stars: 0 })
const setLook = (d: Cur, L: Look) => { d.white.set(L.white); d.shadow.set(L.shadow); d.light.set(L.light); d.sky.set(L.sky); d.mid.set(L.mid); d.horizon.set(L.horizon); d.sun.set(L.sun); d.sunDir.set(...L.sunDir).normalize(); d.sparkle = L.sparkle; d.aurora = L.aurora; d.glow = L.glow; d.stars = L.stars }

type SceneProps = Props & { setHover: (h: 'igloo' | 'chimin' | null) => void; enterRef: React.MutableRefObject<() => void>; darkRef: React.RefObject<HTMLDivElement | null> }
function Scene({ onEnter, onAbout, setHover, enterRef, darkRef }: SceneProps) {
  const { camera, gl, scene } = useThree()
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const atlas = useMemo(() => glyphAtlas(), [])
  const field = useMemo(() => buildField(atlas), [atlas])
  const mound = useMemo(() => moundGeometry(), [])
  const moundMat = useMemo(() => snowMaterial(), [])
  const sparkles = useMemo(() => makeSparkles(), [])
  const dust = useMemo(() => makeDust(), [])
  const skyMat = useMemo(() => skyMaterial(), [])

  const home = useMemo(() => new THREE.Vector3(0, 8.2, 23), [])
  const look = useMemo(() => new THREE.Vector3(0, 2.0, 0), [])
  const par = useRef({ x: 0, y: 0 }); const entering = useRef(false)

  // pointer on the ground (against the mound mesh, so the cursor really touches the snow)
  const cursor = useRef(new THREE.Vector3()); const hasCursor = useRef(false); const lastCursor = useRef(new THREE.Vector3())
  const ray = useMemo(() => new THREE.Raycaster(), []); const moundRef = useRef<THREE.Mesh>(null)
  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      par.current = { x: ndc.x, y: ndc.y }; ray.setFromCamera(ndc, camera)
      const hit = moundRef.current ? ray.intersectObject(moundRef.current, false)[0] : undefined
      if (hit) { cursor.current.copy(hit.point); hasCursor.current = true } else hasCursor.current = false
    }
    const onLeave = () => { hasCursor.current = false }
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave)
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave) }
  }, [gl, camera, ray])

  // the fox
  const fox = useRef<THREE.Group>(null)
  const f = useRef({ x: 9, z: 8, target: new THREE.Vector3(9, 0, 8), gait: 0, idle: 0, flip: false, moving: false, leaving: false, nextBlink: 2, blinkT: 9 })
  const [foxFlip, setFoxFlip] = useState(false)
  const foxPose = useRef<Pose>({ angles: [0, 0, 0, 0, 0, 0], breath: 0, blink: 0 })
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
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const glowTex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c) }, [])
  useEffect(() => { glowMat.map = glowTex; glowMat.needsUpdate = true }, [glowMat, glowTex])

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
  const chiminQuat = useMemo(() => { const q = new THREE.Quaternion(); normalAt(chiminPos.x, chiminPos.z, _n); const toCam = new THREE.Vector3(0.12, 0.45, 1).normalize(); const nn = _n.clone().add(toCam.multiplyScalar(0.5)).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn); _q2.setFromAxisAngle(nn, 0.2); q.premultiply(_q2); return q }, [chiminPos])
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
      const x = (Math.random() - 0.5) * 12.5, z = 1.0 + Math.random() * Math.random() * 3.2; const lift = Math.max(0, 0.9 - Math.abs(x) / 7 - (z - 1.0) * 0.4)
      field.pos[i * 3] = x; field.pos[i * 3 + 2] = z; field.pos[i * 3 + 1] = H(x, z) + 0.03 + Math.random() * lift
      restOrientation(x, z, _q); field.quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
      _p.set(x, field.pos[i * 3 + 1], z); _s.setScalar(field.scl[i]); _m.compose(_p, _q, _s); field.mesh.setMatrixAt(i, _m); moved++
    }
    field.mesh.instanceMatrix.needsUpdate = true
  }, [field, chiminPos])

  const dbg = useRef({ noRig: false })
  useEffect(() => { (window as unknown as { __snow?: unknown }).__snow = { f: f.current, chiminPose: chiminPose.current, foxPose: foxPose.current, angel: angel.current, dbg: dbg.current, cursor: cursor.current, gsap } }, [])
  const t0 = useRef(0)
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); t0.current += d; const k = Math.min(1, d * 2.2)
    for (const key of ['white', 'shadow', 'light', 'sky', 'mid', 'horizon', 'sun'] as const) cur[key].lerp(tgt[key], k)
    cur.sunDir.lerp(tgt.sunDir, k).normalize()
    cur.sparkle += (tgt.sparkle - cur.sparkle) * k; cur.aurora += (tgt.aurora - cur.aurora) * k; cur.glow += (tgt.glow - cur.glow) * k; cur.stars += (tgt.stars - cur.stars) * k
    for (const m of [moundMat, field.mesh.material as THREE.ShaderMaterial]) {
      const u = m.uniforms; u.uWhite.value.copy(cur.white); u.uShadow.value.copy(cur.shadow); u.uLight.value.copy(cur.light); u.uLightDir.value.copy(cur.sunDir)
      u.uAurora.value = cur.aurora; u.uTime.value = reduced ? 0.3 : t0.current; u.uSparkle.value = cur.sparkle; u.fogColor.value.copy(cur.horizon)
      u.uCursor.value.copy(cursor.current); u.uCursorOn.value += ((hasCursor.current && !entering.current && !reduced ? 1 : 0) - u.uCursorOn.value) * Math.min(1, d * 4)
    }
    ;(scene.background as THREE.Color).copy(cur.horizon); (scene.fog as THREE.Fog).color.copy(cur.horizon)
    const su = skyMat.uniforms; su.uTop.value.copy(cur.sky); su.uMid.value.copy(cur.mid); su.uBot.value.copy(cur.horizon); su.uSun.value.copy(cur.sun); su.uSunDir.value.copy(cur.sunDir)
    su.uAurora.value = cur.aurora; su.uStars.value = cur.stars; su.uTime.value = t0.current
    const sm = sparkles.material as THREE.ShaderMaterial; sm.uniforms.uTime.value = reduced ? 0.3 : t0.current; sm.uniforms.uGain.value = cur.sparkle; sm.uniforms.uPixel.value = gl.getPixelRatio(); sm.uniforms.uColor.value.copy(cur.light).lerp(cur.white, 0.5)
    const dm = dust.material as THREE.ShaderMaterial; dm.uniforms.uTime.value = reduced ? 0 : t0.current; dm.uniforms.uPixel.value = gl.getPixelRatio(); dm.uniforms.uColor.value.copy(cur.white).multiplyScalar(0.8); dm.uniforms.uGain.value = 0.5 + cur.sparkle * 0.3
    glowMat.opacity = cur.glow * 0.8
    // the painted pieces take the day's light: white by day, warm by evening, blue by night
    pieceTint.copy(cur.white).lerp(cur.light, 0.25)

    // the cursor shifts the snow
    if (hasCursor.current && !entering.current && !reduced) {
      const moved = lastCursor.current.distanceTo(cursor.current); lastCursor.current.copy(cursor.current)
      if (moved > 0.02) kick(field, cursor.current.x, cursor.current.z, 1.4, Math.min(5, 1.8 + moved * 3), 40)
    }
    // the fox wades toward the cursor, kicking letters as it goes
    const F = f.current
    if (F.leaving) F.target.set(10, 0, 12)
    else if (hasCursor.current) {
      F.target.copy(cursor.current); const dd = Math.hypot(F.target.x, F.target.z); const keep = R + 1.4; if (dd < keep) { F.target.x *= keep / Math.max(dd, 1e-3); F.target.z *= keep / Math.max(dd, 1e-3) }
      // never onto Chimin: the target stays outside her hollow
      const cx = F.target.x - CHIMIN[0], cz = F.target.z - CHIMIN[1]; const cd = Math.hypot(cx, cz); if (cd < KEEP_CHIMIN) { F.target.x = CHIMIN[0] + cx * KEEP_CHIMIN / Math.max(cd, 1e-3); F.target.z = CHIMIN[1] + cz * KEEP_CHIMIN / Math.max(cd, 1e-3) }
    }
    const dx = F.target.x - F.x, dz = F.target.z - F.z; const dist = Math.hypot(dx, dz); F.moving = dist > 0.6
    if (F.moving) {
      const speed = Math.min(6, 2 + dist * 1.1); const step = Math.min(dist, speed * d)
      let nx = F.x + (dx / dist) * step, nz = F.z + (dz / dist) * step; const nd = Math.hypot(nx, nz); const keep = R + 1.0
      if (nd < keep) { const ang = Math.atan2(nx, nz) + (dx * nz - dz * nx > 0 ? -1 : 1) * 0.08; nx = Math.sin(ang) * keep; nz = Math.cos(ang) * keep }
      // and it walks round Chimin, never over her
      { const cx = nx - CHIMIN[0], cz = nz - CHIMIN[1]; const cd = Math.hypot(cx, cz); if (cd < KEEP_CHIMIN) { const ang = Math.atan2(cx, cz) + (dx * cz - dz * cx > 0 ? -1 : 1) * 0.1; nx = CHIMIN[0] + Math.sin(ang) * KEEP_CHIMIN; nz = CHIMIN[1] + Math.cos(ang) * KEEP_CHIMIN } }
      F.x = nx; F.z = nz; F.gait += d * 9; F.idle = 0
      const flip = dx < 0; if (flip !== F.flip) { F.flip = flip; setFoxFlip(flip) }
      if (!reduced) kick(field, F.x - (dx / dist) * 0.4, F.z - (dz / dist) * 0.4, 1.2, 3.4 + speed * 0.3, 30)
    } else F.idle += d
    if (fox.current) {
      const bob = F.moving ? Math.abs(Math.sin(F.gait)) * 0.1 : 0
      fox.current.position.set(F.x, H(F.x, F.z) + 0.02 + bob, F.z)  // sunk to the belly: its legs are in the snow
      fox.current.rotation.z = F.moving ? Math.sin(F.gait) * 0.05 : 0
      fox.current.rotation.y = Math.atan2(camera.position.x - F.x, camera.position.z - F.z)
    }
    // the fox is alive: its head nods, its tail swings, its legs stride when it walks, it breathes and blinks
    { const t = t0.current, P = foxPose.current, g = F.gait, mv = F.moving ? 1 : 0
      P.angles[0] = 0.05 * Math.sin(t * 1.7) + 0.07 * Math.sin(g) * mv                                  // head
      P.angles[1] = 0.16 * Math.sin(t * 2.1) + 0.22 * Math.sin(g * 0.5) * mv                            // tail
      P.angles[2] = 0.03 * Math.sin(t * 1.1) + 0.32 * Math.sin(g) * mv                                  // front legs
      P.angles[3] = -0.03 * Math.sin(t * 1.1 + 1.0) - 0.32 * Math.sin(g) * mv                           // back legs
      P.breath = 0.008 * Math.sin(t * 2.0)
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
      // her mittens and boots sweep through the snow: kick the letters where they pass
      if (A.on > 0.3 && Math.abs(Math.cos(A.phase)) > 0.4 && chiminGrp.current) {
        for (const [u, v, bone] of CHIMIN_TIPS) {
          const b = CHIMIN_BONES[bone]; const W = 4.2, Hh = 4.2 * CHIMIN_ASPECT
          let x = (u - 0.5) * W, y = (v - 0.5) * Hh; const px = (b.pivot[0] - 0.5) * W, py = (b.pivot[1] - 0.5) * Hh; const a = P.angles[bone]
          const qx = x - px, qy = y - py; x = px + qx * Math.cos(a) - qy * Math.sin(a); y = py + qx * Math.sin(a) + qy * Math.cos(a)
          _p.set(x, y, 0); chiminGrp.current.localToWorld(_p); kick(field, _p.x, _p.z, 0.8, 2.4, 5)
        }
      } }
    if (!reduced) stepField(field, d)

    if (!entering.current && !reduced) { camera.position.x += (home.x + par.current.x * 2.2 - camera.position.x) * 0.04; camera.position.y += (home.y - par.current.y * 0.9 - camera.position.y) * 0.04 }
    camera.lookAt(look)
  })
  useEffect(() => { camera.position.copy(home); camera.lookAt(look) }, [camera, home, look])

  const iglooY = H(0, 0)
  const camCtl = useRef<PieceControl | null>(null)
  const piece = { tint: pieceTint, snow: cur.white, light: cur.light, fog: true, frost: 0.2, grain: 0.35 }
  return (
    <>
      <color attach="background" args={['#e8e3f1']} />
      <fog attach="fog" args={['#e8e3f1', 24, 72]} />
      <mesh material={skyMat} renderOrder={-1}><sphereGeometry args={[150, 32, 16]} /></mesh>
      {/* the snow: the piled ground, the letters on it, the sparkles on it, the dust in the air */}
      <mesh ref={moundRef} geometry={mound} material={moundMat} />
      <primitive object={field.mesh} />
      <primitive object={sparkles} />
      <primitive object={dust} />
      {/* the igloo, set into the middle mound, its base in the snow */}
      <Piece url={paper('igloo-back')} width={12.4} position={[0, iglooY + 2.6, -2.6]} rotation={[-0.06, 0, 0]} delay={0.2} glisten={1} solid sink={0.1} {...piece} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <Piece url={paper('igloo-front')} width={11.6} position={[0, iglooY + 2.2, 1.2]} rotation={[-0.05, 0, 0]} delay={0.5} glisten={1} solid sink={0.12} {...piece} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <Piece url={paper('igloo-arch')} width={4.6} position={[0, H(0, 3.9) + 1.2, 3.9]} rotation={[-0.04, 0, 0]} delay={0.8} glisten={1} solid sink={0.14} {...piece} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <mesh position={[0, H(0, 6.4) + 0.08, 6.4]} rotation={[-Math.PI / 2, 0, 0]} material={glowMat}><planeGeometry args={[9, 7]} /></mesh>
      {/* Chimin, lying in the snow */}
      <group ref={chiminGrp} position={[chiminPos.x, H(chiminPos.x, chiminPos.z) + 0.5, chiminPos.z]} quaternion={chiminQuat}>
        <Piece url={paper('chimin')} width={4.2} position={[0, 0, 0]} delay={1.1} solid {...piece} glisten={0.5} bones={CHIMIN_BONES} pose={chiminPose} onHover={h => { setHover(h ? 'chimin' : null); setChiminHover(h) }} onClick={onAbout} />
      </group>
      {/* the fox, wading */}
      <group ref={fox}>
        <Piece url={paper('fox-side')} width={3.2} position={[0, 0.5, 0]} delay={1.4} flip={foxFlip} solid sink={0.2} {...piece} glisten={0.4} bones={FOX_BONES} pose={foxPose} eye={[0.905, 0.705, 0.02, 0.018]} control={camCtl} />
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
  return (
    <div className={`snow ${entering ? 'snow--entering' : ''} ${hover ? `snow--hover-${hover}` : ''}`}>
      <div className="snow__canvas">
        <Canvas dpr={[1, 1.5]} camera={{ fov: 36, near: 0.1, far: 400, position: [0, 8.2, 23] }} gl={{ antialias: true, powerPreference: 'high-performance' }} onPointerDown={() => { if (hover === 'igloo') enter() }}>
          <Suspense fallback={null}>
            <Scene onEnter={onEnter} onAbout={onAbout} setHover={setHover} enterRef={enterRef} darkRef={darkRef} />
          </Suspense>
        </Canvas>
      </div>
      <h1 className="snow__name display">Chimin</h1>
      <p className="snow__hint label">{hover === 'chimin' ? 'that’s me · making a snow angel · click for about' : hover === 'igloo' ? 'go inside' : 'the snow is made of letters · the fox follows your cursor · click the igloo to go inside'}</p>
      <button type="button" className="snow__go label" onClick={enter}>go inside →</button>
      <div ref={darkRef} className="snow__dark" aria-hidden="true" />
    </div>
  )
}
