import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { getMode, type Mode } from '../lib/mode'
import { Piece, paper, type PieceControl } from './Piece'

/**
 * Outside: snow that is really made of letters. A heightfield of mounds and drifts, strewn with tens of
 * thousands of letter glyphs lying along the slopes, each catching the light on its own facet. The letters
 * are particles: the cursor pushes them, the fox wading through kicks them up and they tumble back down,
 * and letters fall from the sky and land. Chimin and the fox sink into the snow and are hidden by it where
 * it rises in front of them. The igloo (Chimin's paper plates) sits in a mound in the middle.
 */
type Props = { onEnter: () => void; onAbout: () => void }

const G = 80            // field size
const N = 82000         // letters at rest on the field
const NF = 400          // letters falling from the sky
const R = 5.6           // igloo footprint radius
const CHARS = 'AaBbCcdDeEfFgGhHiJjkKLMmnNoOPpqrRsStTuvVwWxyzZ'

const LOOKS: Record<Mode, { snow: string; light: string; ambient: string; sky: string; horizon: string; sparkle: number; aurora: number; glow: number }> = {
  day: { snow: '#9aa7e6', light: '#fff6e6', ambient: '#ffffff', sky: '#a9b7ea', horizon: '#e6e7fb', sparkle: 1.0, aurora: 0, glow: 0 },
  evening: { snow: '#b59ac8', light: '#ffb884', ambient: '#f4d9cc', sky: '#7c6db0', horizon: '#ffc9a2', sparkle: 0.8, aurora: 0, glow: 0.4 },
  night: { snow: '#3f4a8e', light: '#a8b6ff', ambient: '#6c78c8', sky: '#0d1330', horizon: '#232f62', sparkle: 1.8, aurora: 1, glow: 1 },
}

// ------------------------------------------------------------------ the ground: mounds and drifts
const MOUNDS: [number, number, number, number][] = [ // x, z, radius, height
  [0, 0, 9.5, 2.2], [-12, -6, 7, 1.6], [13, -9, 8, 1.9], [-9, 8, 5, 0.9], [11, 7, 5.5, 1.1], [-22, 2, 8, 1.4], [22, 4, 7, 1.2], [3, -18, 12, 2.4], [-4, 16, 6, 0.8], [0, 26, 10, 1.6],
]
function H(x: number, z: number) {
  let y = 0
  for (const [mx, mz, r, h] of MOUNDS) { const d2 = ((x - mx) * (x - mx) + (z - mz) * (z - mz)) / (r * r); y += h * Math.exp(-d2 * 1.6) }
  y += 0.18 * Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.55) + 0.1 * Math.sin(x * 1.9 + z * 1.3) + 0.06 * Math.sin(x * 4.1) * Math.sin(z * 3.7)
  return y
}
function normalAt(x: number, z: number, out: THREE.Vector3) {
  const e = 0.15
  out.set(H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)).normalize(); return out
}

function moundGeometry() {
  const seg = 160; const geo = new THREE.PlaneGeometry(G, G, seg, seg); geo.rotateX(-Math.PI / 2)
  const p = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)))
  geo.computeVertexNormals(); return geo
}

// ------------------------------------------------------------------ the glyph atlas
function glyphAtlas() {
  const S = 1024, cells = 8, cs = S / cells
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!
  g.clearRect(0, 0, S, S); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let i = 0; i < cells * cells; i++) {
    const ch = CHARS[i % CHARS.length]; const x = (i % cells) * cs + cs / 2, y = Math.floor(i / cells) * cs + cs / 2
    g.font = `${i % 3 === 0 ? '600' : '500'} ${cs * 0.78}px Geist, ui-sans-serif, system-ui, sans-serif`
    g.fillText(ch, x, y + cs * 0.04)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

function letterMaterial(atlas: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { uAtlas: { value: atlas }, uLightDir: { value: new THREE.Vector3(-0.45, 0.8, 0.5).normalize() }, uLight: { value: new THREE.Color('#fff6e6') }, uAmbient: { value: new THREE.Color('#ffffff') }, uAurora: { value: 0 }, uTime: { value: 0 },
      fogColor: { value: new THREE.Color('#e6e7fb') }, fogNear: { value: 26 }, fogFar: { value: 70 } },
    vertexShader: `
      attribute float aGlyph; attribute vec3 aColor;
      varying vec2 vUv; varying vec3 vColor; varying vec3 vN; varying vec3 vW; varying float vFog;
      void main(){
        float col = mod(aGlyph, 8.0), row = floor(aGlyph / 8.0); vUv = (uv + vec2(col, row)) / 8.0; vColor = aColor;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0));
        vec4 mv = viewMatrix * w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform vec3 uLightDir, uLight, uAmbient, fogColor; uniform float fogNear, fogFar, uAurora, uTime;
      varying vec2 vUv; varying vec3 vColor; varying vec3 vN; varying vec3 vW; varying float vFog;
      void main(){
        float a = texture2D(uAtlas, vUv).a; if (a < 0.5) discard;
        vec3 V = normalize(cameraPosition - vW); vec3 n = vN; if (dot(n, V) < 0.0) n = -n;
        float lam = 0.5 + 0.5 * max(0.0, dot(n, uLightDir));
        vec3 col = vColor * mix(uAmbient, uLight, 0.35) * lam;
        // a facet glint: the letters catch the light as the camera moves
        vec3 Rf = reflect(-uLightDir, n); float glint = pow(max(0.0, dot(Rf, V)), 30.0);
        col += vec3(1.0) * glint * 0.7;
        if (uAurora > 0.001) { vec2 p = vW.xz * 0.25; float b = pow(0.5 + 0.5 * sin(p.x * 1.4 + p.y * 0.8 + uTime * 0.3 + sin(p.y * 1.2 - uTime * 0.2) * 2.0), 3.0);
          vec3 ac = mix(vec3(0.35, 0.9, 0.65), vec3(0.6, 0.45, 0.9), 0.5 + 0.5 * sin(p.x * 0.8 - uTime * 0.17)); col += ac * b * 0.35 * uAurora; }
        float f = smoothstep(fogNear, fogFar, vFog); col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, 1.0); }`,
    side: THREE.DoubleSide,
  })
}

// ------------------------------------------------------------------ sparkles on the surface
function makeSparkles(count = 900) {
  const pos = new Float32Array(count * 3), phase = new Float32Array(count), speed = new Float32Array(count), size = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * G, z = (Math.random() - 0.5) * G
    pos[i * 3] = x; pos[i * 3 + 1] = H(x, z) + 0.12; pos[i * 3 + 2] = z
    phase[i] = Math.random() * Math.PI * 2; speed[i] = 0.6 + Math.random() * 2.4; size[i] = 0.3 + Math.random() * Math.random() * 1.1
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uGain: { value: 1 } },
    vertexShader: `attribute float aPhase, aSpeed, aSize; uniform float uTime, uPixel, uGain; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float tw = pow(0.5+0.5*sin(uTime*aSpeed+aPhase), 6.0); vA = tw*uGain;
      gl_PointSize = aSize * uPixel * (300.0 / -mv.z) * (0.6+0.8*tw); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord-0.5; float d = length(p);
      float core = smoothstep(0.5, 0.08, d); float star = max(0.0, 1.0-abs(p.x)*9.0)*max(0.0,1.0-abs(p.y)*40.0) + max(0.0, 1.0-abs(p.y)*9.0)*max(0.0,1.0-abs(p.x)*40.0);
      float a = (core + star*0.7) * vA; gl_FragColor = vec4(1.0, 0.99, 1.0, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  return new THREE.Points(geo, mat)
}

// ------------------------------------------------------------------ the letters as particles
type Field = {
  mesh: THREE.InstancedMesh; pos: Float32Array; quat: Float32Array; scl: Float32Array; vel: Float32Array; ang: Float32Array
  flying: Uint8Array; falling: Uint8Array; list: number[]
}
const PALETTE = [[1, 1, 1], [0.93, 0.8, 0.94], [0.82, 0.85, 0.98], [0.52, 0.58, 0.88], [0.7, 0.75, 0.95], [0.86, 0.9, 1.0]]
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _n = new THREE.Vector3(), _up = new THREE.Vector3(0, 0, 1), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler()

function restOrientation(x: number, z: number, out: THREE.Quaternion) {
  // lie along the slope: the letter's face (+z) points along the surface normal, then a random yaw, then a little random tilt so the heap looks strewn
  normalAt(x, z, _n); out.setFromUnitVectors(_up, _n)
  _q2.setFromAxisAngle(_n, Math.random() * Math.PI * 2); out.premultiply(_q2)
  _e.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, 0); _q2.setFromEuler(_e); out.multiply(_q2)
  return out
}

function buildField(atlas: THREE.Texture): Field {
  const total = N + NF
  const geo = new THREE.PlaneGeometry(1, 1)
  const glyph = new Float32Array(total), color = new Float32Array(total * 3)
  const pos = new Float32Array(total * 3), quat = new Float32Array(total * 4), scl = new Float32Array(total)
  const vel = new Float32Array(total * 3), ang = new Float32Array(total * 3), flying = new Uint8Array(total), falling = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    glyph[i] = Math.floor(Math.random() * 64)
    const r = Math.random(); const c = PALETTE[r < 0.14 ? 0 : r < 0.24 ? 1 : r < 0.42 ? 2 : r < 0.62 ? 3 : r < 0.84 ? 4 : 5]
    color[i * 3] = c[0]; color[i * 3 + 1] = c[1]; color[i * 3 + 2] = c[2]
    scl[i] = 0.2 + Math.random() * Math.random() * 0.5
    if (i < N) {
      // denser near the camera and around the igloo, sparser far away
      const x = (Math.random() - 0.5) * G, z = (Math.random() - 0.5) * G; const under = i % 3 === 0
      pos[i * 3] = x; pos[i * 3 + 2] = z; pos[i * 3 + 1] = H(x, z) + (under ? -0.06 : 0.01 + Math.random() * 0.06)
      if (under) { color[i * 3] *= 0.8; color[i * 3 + 1] *= 0.82; color[i * 3 + 2] *= 0.95 }
      restOrientation(x, z, _q); quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
    } else {
      falling[i] = 1; flying[i] = 1
      pos[i * 3] = (Math.random() - 0.5) * G; pos[i * 3 + 2] = -G / 2 + Math.random() * (G / 2 + 10); pos[i * 3 + 1] = 6 + Math.random() * 16
      vel[i * 3 + 1] = -0.6 - Math.random() * 0.8; ang[i * 3] = (Math.random() - 0.5) * 2; ang[i * 3 + 1] = (Math.random() - 0.5) * 2; ang[i * 3 + 2] = (Math.random() - 0.5) * 2
      _q.setFromEuler(_e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)); quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
    }
  }
  geo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyph, 1)); geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3))
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
    if (f.falling[i]) { f.vel[b] = Math.sin(f.pos[b + 1] * 1.3 + i) * 0.4; f.vel[b + 2] = Math.cos(f.pos[b + 1] * 0.9 + i * 0.3) * 0.4 }
    else f.vel[b + 1] -= 11 * dt
    f.pos[b] += f.vel[b] * dt; f.pos[b + 1] += f.vel[b + 1] * dt; f.pos[b + 2] += f.vel[b + 2] * dt
    const ground = H(f.pos[b], f.pos[b + 2]) + 0.02
    _q.set(f.quat[i * 4], f.quat[i * 4 + 1], f.quat[i * 4 + 2], f.quat[i * 4 + 3])
    if (f.pos[b + 1] <= ground && f.vel[b + 1] <= 0) {
      if (f.falling[i]) { // landed from the sky: start again up high
        f.pos[b] = (Math.random() - 0.5) * G; f.pos[b + 2] = -G / 2 + Math.random() * (G / 2 + 10); f.pos[b + 1] = 8 + Math.random() * 14; f.vel[b + 1] = -0.6 - Math.random() * 0.8; keep.push(i)
      } else { // settle on the slope
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

// ------------------------------------------------------------------ the scene
type SceneProps = Props & { setHover: (h: 'igloo' | 'chimin' | null) => void; enterRef: React.MutableRefObject<() => void>; darkRef: React.RefObject<HTMLDivElement | null> }
function Scene({ onEnter, onAbout, setHover, enterRef, darkRef }: SceneProps) {
  const { camera, gl, scene } = useThree()
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const atlas = useMemo(() => glyphAtlas(), [])
  const field = useMemo(() => buildField(atlas), [atlas])
  const mound = useMemo(() => moundGeometry(), [])
  const moundMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#9aa7e6' }), [])
  const sparkles = useMemo(() => makeSparkles(), [])
  const hemi = useRef<THREE.HemisphereLight>(null); const sun = useRef<THREE.DirectionalLight>(null)

  const home = useMemo(() => new THREE.Vector3(0, 6.8, 23), [])
  const look = useMemo(() => new THREE.Vector3(0, 2.2, 0), [])
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
  const f = useRef({ x: 9, z: 8, target: new THREE.Vector3(9, 0, 8), gait: 0, idle: 0, flip: false, moving: false, leaving: false })
  const [foxFlip, setFoxFlip] = useState(false)

  // time of day
  const cur = useMemo(() => ({ snow: new THREE.Color(), light: new THREE.Color(), ambient: new THREE.Color(), sky: new THREE.Color(), horizon: new THREE.Color(), sparkle: 1, aurora: 0, glow: 0 }), [])
  const tgt = useMemo(() => ({ snow: new THREE.Color(), light: new THREE.Color(), ambient: new THREE.Color(), sky: new THREE.Color(), horizon: new THREE.Color(), sparkle: 1, aurora: 0, glow: 0 }), [])
  useEffect(() => {
    const set = (d: typeof tgt) => { const L = LOOKS[getMode()]; d.snow.set(L.snow); d.light.set(L.light); d.ambient.set(L.ambient); d.sky.set(L.sky); d.horizon.set(L.horizon); d.sparkle = L.sparkle; d.aurora = L.aurora; d.glow = L.glow }
    set(cur); set(tgt); const on = () => set(tgt); window.addEventListener('modechange', on); return () => window.removeEventListener('modechange', on)
  }, [cur, tgt])
  const skyMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color('#a9b7ea') }, uBot: { value: new THREE.Color('#e6e7fb') }, uAurora: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop, uBot; uniform float uAurora, uTime; varying vec3 vP;
      void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(uBot, uTop, pow(h, 0.6));
      if (uAurora > 0.001) { float a = atan(vP.x, vP.z); float band = sin(a*5.0 + uTime*0.25 + sin(a*2.0+uTime*0.1)*1.5);
        float y = smoothstep(0.05, 0.25, vP.y) * (1.0 - smoothstep(0.35, 0.7, vP.y)); float curtain = pow(0.5+0.5*band, 3.0) * y;
        vec3 ac = mix(vec3(0.45, 0.95, 0.7), vec3(0.65, 0.5, 0.95), 0.5+0.5*sin(a*3.0 - uTime*0.15)); c += ac * curtain * 0.55 * uAurora;
        float star = step(0.9985, fract(sin(dot(floor(vP.xz*400.0), vec2(12.9898,78.233))) * 43758.5453)) * smoothstep(0.1,0.4,vP.y); c += star * 0.8 * uAurora; }
      gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false,
  }), [])
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

  // Chimin lies in a hollow on the left; letters are heaped over her edges
  const chiminPos = useMemo(() => new THREE.Vector3(-6.6, 0, 5.4), [])
    // lying in a hollow, but propped toward the camera so she reads from the low front view
  const chiminQuat = useMemo(() => { const q = new THREE.Quaternion(); normalAt(chiminPos.x, chiminPos.z, _n); const toCam = new THREE.Vector3(0.15, 0.55, 1).normalize(); const nn = _n.clone().add(toCam.multiplyScalar(1.6)).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn); _q2.setFromAxisAngle(nn, 0.25); q.premultiply(_q2); return q }, [chiminPos])
  useEffect(() => {
    // heap: move a few hundred rest letters onto the rim of Chimin's silhouette, slightly above her plane
    let moved = 0
    for (let i = 0; i < N && moved < 420; i += 3) {
      const t = Math.random() * Math.PI * 2; const rr = 1.9 + Math.random() * 0.9; const ex = Math.cos(t) * rr * 1.1, ez = Math.sin(t) * rr * 0.9
      const x = chiminPos.x + ex, z = chiminPos.z + ez
      field.pos[i * 3] = x; field.pos[i * 3 + 2] = z; field.pos[i * 3 + 1] = H(x, z) + 0.12 + Math.random() * 0.1
      restOrientation(x, z, _q); field.quat.set([_q.x, _q.y, _q.z, _q.w], i * 4)
      _p.set(x, field.pos[i * 3 + 1], z); _s.setScalar(field.scl[i]); _m.compose(_p, _q, _s); field.mesh.setMatrixAt(i, _m); moved++
    }
    field.mesh.instanceMatrix.needsUpdate = true
  }, [field, chiminPos])

  const t0 = useRef(0)
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); t0.current += d; const k = Math.min(1, d * 2.2)
    cur.snow.lerp(tgt.snow, k); cur.light.lerp(tgt.light, k); cur.ambient.lerp(tgt.ambient, k); cur.sky.lerp(tgt.sky, k); cur.horizon.lerp(tgt.horizon, k)
    cur.sparkle += (tgt.sparkle - cur.sparkle) * k; cur.aurora += (tgt.aurora - cur.aurora) * k; cur.glow += (tgt.glow - cur.glow) * k
    moundMat.color.copy(cur.snow); if (hemi.current) { hemi.current.color.copy(cur.ambient); hemi.current.groundColor.copy(cur.snow) } if (sun.current) sun.current.color.copy(cur.light)
    const lm = field.mesh.material as THREE.ShaderMaterial
    lm.uniforms.uLight.value.copy(cur.light); lm.uniforms.uAmbient.value.copy(cur.ambient); lm.uniforms.uAurora.value = cur.aurora; lm.uniforms.uTime.value = t0.current; lm.uniforms.fogColor.value.copy(cur.horizon)
    ;(scene.background as THREE.Color).copy(cur.horizon); (scene.fog as THREE.Fog).color.copy(cur.horizon)
    skyMat.uniforms.uTop.value.copy(cur.sky); skyMat.uniforms.uBot.value.copy(cur.horizon); skyMat.uniforms.uAurora.value = cur.aurora; skyMat.uniforms.uTime.value = t0.current
    const sm = sparkles.material as THREE.ShaderMaterial; sm.uniforms.uTime.value = reduced ? 0.3 : t0.current; sm.uniforms.uGain.value = cur.sparkle; sm.uniforms.uPixel.value = gl.getPixelRatio()
    glowMat.opacity = cur.glow * 0.8

    // the cursor shifts the snow
    if (hasCursor.current && !entering.current && !reduced) {
      const moved = lastCursor.current.distanceTo(cursor.current); lastCursor.current.copy(cursor.current)
      if (moved > 0.02) kick(field, cursor.current.x, cursor.current.z, 1.4, Math.min(5, 1.8 + moved * 3), 40)
    }
    // the fox wades toward the cursor, kicking letters as it goes
    const F = f.current
    if (F.leaving) F.target.set(10, 0, 12)
    else if (hasCursor.current) { F.target.copy(cursor.current); const dd = Math.hypot(F.target.x, F.target.z); const keep = R + 1.4; if (dd < keep) { F.target.x *= keep / Math.max(dd, 1e-3); F.target.z *= keep / Math.max(dd, 1e-3) } }
    const dx = F.target.x - F.x, dz = F.target.z - F.z; const dist = Math.hypot(dx, dz); F.moving = dist > 0.6
    if (F.moving) {
      const speed = Math.min(6, 2 + dist * 1.1); const step = Math.min(dist, speed * d)
      let nx = F.x + (dx / dist) * step, nz = F.z + (dz / dist) * step; const nd = Math.hypot(nx, nz); const keep = R + 1.0
      if (nd < keep) { const ang = Math.atan2(nx, nz) + (dx * nz - dz * nx > 0 ? -1 : 1) * 0.08; nx = Math.sin(ang) * keep; nz = Math.cos(ang) * keep }
      F.x = nx; F.z = nz; F.gait += d * 9; F.idle = 0
      const flip = dx < 0; if (flip !== F.flip) { F.flip = flip; setFoxFlip(flip) }
      if (!reduced) kick(field, F.x - (dx / dist) * 0.4, F.z - (dz / dist) * 0.4, 1.2, 3.4 + speed * 0.3, 30)
    } else F.idle += d
    if (fox.current) {
      const bob = F.moving ? Math.abs(Math.sin(F.gait)) * 0.1 : 0
      fox.current.position.set(F.x, H(F.x, F.z) + 0.12 + bob, F.z)  // sunk: its legs are in the snow
      fox.current.rotation.z = F.moving ? Math.sin(F.gait) * 0.05 : 0
      fox.current.rotation.y = Math.atan2(camera.position.x - F.x, camera.position.z - F.z)
    }
    if (!reduced) stepField(field, d)

    if (!entering.current && !reduced) { camera.position.x += (home.x + par.current.x * 2.2 - camera.position.x) * 0.04; camera.position.y += (home.y - par.current.y * 0.9 - camera.position.y) * 0.04 }
    camera.lookAt(look)
  })
  useEffect(() => { camera.position.copy(home); camera.lookAt(look) }, [camera, home, look])

  const iglooY = H(0, 0)
  const camCtl = useRef<PieceControl | null>(null)
  return (
    <>
      <color attach="background" args={['#e6e7fb']} />
      <fog attach="fog" args={['#e6e7fb', 26, 70]} />
      <hemisphereLight ref={hemi} args={['#ffffff', '#9aa7e6', 1.2]} />
      <directionalLight ref={sun} position={[-9, 14, 10]} intensity={1.0} />
      <mesh material={skyMat} renderOrder={-1}><sphereGeometry args={[150, 32, 16]} /></mesh>
      {/* the snow: the mound underneath, the letters on it, the sparkles */}
      <mesh ref={moundRef} geometry={mound} material={moundMat} />
      <primitive object={field.mesh} />
      <primitive object={sparkles} />
      {/* the igloo, set into the middle mound */}
      <Piece url={paper('igloo-back')} width={12.4} position={[0, iglooY + 2.9, -2.6]} rotation={[-0.06, 0, 0]} delay={0.2} solid onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <Piece url={paper('igloo-front')} width={11.6} position={[0, iglooY + 2.5, 1.2]} rotation={[-0.05, 0, 0]} delay={0.5} solid onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <Piece url={paper('igloo-arch')} width={4.6} position={[0, H(0, 3.9) + 1.35, 3.9]} rotation={[-0.04, 0, 0]} delay={0.8} solid onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <mesh position={[0, H(0, 6.4) + 0.08, 6.4]} rotation={[-Math.PI / 2, 0, 0]} material={glowMat}><planeGeometry args={[9, 7]} /></mesh>
      {/* Chimin, lying in the snow */}
      <Piece url={paper('chimin')} width={4.6} position={[chiminPos.x, H(chiminPos.x, chiminPos.z) + 0.9, chiminPos.z]} quaternion={chiminQuat} delay={1.1} solid onHover={h => setHover(h ? 'chimin' : null)} onClick={onAbout} />
      {/* the fox, wading */}
      <group ref={fox}>
        <Piece url={paper('fox-side')} width={3.2} position={[0, 0.5, 0]} delay={1.4} flip={foxFlip} solid control={camCtl} />
      </group>
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.15} intensity={0.7} mipmapBlur />
        <Noise opacity={0.04} />
        <Vignette eskil={false} offset={0.2} darkness={0.35} />
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
        <Canvas dpr={[1, 1.5]} camera={{ fov: 36, near: 0.1, far: 400, position: [0, 6.8, 23] }} gl={{ antialias: true, powerPreference: 'high-performance' }} onPointerDown={() => { if (hover === 'igloo') enter() }}>
          <Suspense fallback={null}>
            <Scene onEnter={onEnter} onAbout={onAbout} setHover={setHover} enterRef={enterRef} darkRef={darkRef} />
          </Suspense>
        </Canvas>
      </div>
      <h1 className="snow__name display">Chimin</h1>
      <p className="snow__hint label">{hover === 'chimin' ? 'that’s me, lying in the snow' : hover === 'igloo' ? 'go inside' : 'the snow is made of letters · the fox follows your cursor · click the igloo to go inside'}</p>
      <button type="button" className="snow__go label" onClick={enter}>go inside →</button>
      <div ref={darkRef} className="snow__dark" aria-hidden="true" />
    </div>
  )
}
