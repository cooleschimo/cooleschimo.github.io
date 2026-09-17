import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { getMode, type Mode } from '../lib/mode'
import { makePaintMaterial, NOISE_GLSL } from './paint'

/**
 * Outside, as a paper diorama: a real 3D space and camera, flat painted pieces inside it. The snow is a
 * field of letters with texture and light; the cursor and the fox push through it (a trail render target
 * displaces and shades it). The igloo is three paper plates. The fox wades, half sunk. Chimin lies pressed
 * into the snow. Every piece arrives as ink and fills with watercolour, and dissolves when you leave it.
 */
type Props = { onEnter: () => void; onAbout: () => void }

const B = import.meta.env.BASE_URL.replace(/\/$/, '')
const G = 64 // ground size, world units
const R = 5.2 // igloo footprint radius (the fox keeps outside it)

const LOOKS: Record<Mode, { tint: string; light: string; sky: string; horizon: string; sparkle: number; aurora: number; glow: number }> = {
  day: { tint: '#ffffff', light: '#fff6e6', sky: '#a9b7ea', horizon: '#e6e7fb', sparkle: 1.0, aurora: 0, glow: 0 },
  evening: { tint: '#f6cfc4', light: '#ffb884', sky: '#7c6db0', horizon: '#ffc9a2', sparkle: 0.7, aurora: 0, glow: 0.4 },
  night: { tint: '#5a63a8', light: '#a8b6ff', sky: '#0d1330', horizon: '#232f62', sparkle: 1.6, aurora: 1, glow: 1 },
}

// ------------------------------------------------------------------ the letters
function lettersTexture(size = 2048) {
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#98a6e4'; g.fillRect(0, 0, size, size)
  const chars = 'AaBbdDeEhHiJkKMmnNoOPqrRstTuvwWxyzZ'
  for (let i = 0; i < 34000; i++) {
    const s = 9 + Math.random() * Math.random() * 22
    const x = Math.random() * size, y = Math.random() * size, r = Math.random()
    g.fillStyle = r < 0.1 ? `rgba(255,255,255,${0.75 + Math.random() * 0.25})` : r < 0.18 ? `rgba(232,200,236,${0.5 + Math.random() * 0.4})` : r < 0.3 ? `rgba(205,212,248,${0.55 + Math.random() * 0.4})` : r < 0.44 ? `rgba(128,144,220,${0.45 + Math.random() * 0.4})` : `rgba(176,188,240,${0.45 + Math.random() * 0.5})`
    g.font = `${s | 0}px Geist, ui-sans-serif, system-ui, sans-serif`
    const ch = chars[(Math.random() * chars.length) | 0]
    if (Math.random() < 0.15) { g.save(); g.translate(x, y); g.rotate((Math.random() - 0.5) * 0.7); g.fillText(ch, 0, 0); g.restore() } else g.fillText(ch, x, y)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.2, 3.2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

// ------------------------------------------------------------------ the trail: where the snow has been pushed
type Stamp = { x: number; z: number; r: number; s: number }
function useTrail() {
  const size = 512
  const targets = useMemo(() => [0, 1].map(() => new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false })), [])
  const scene = useMemo(() => new THREE.Scene(), [])
  const cam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uPrev: { value: null }, uDecay: { value: 0.99 }, uStamps: { value: new Float32Array(16) }, uCount: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D uPrev; uniform float uDecay; uniform float uStamps[16]; uniform int uCount; varying vec2 vUv;
      void main(){ float h = texture2D(uPrev, vUv).r * uDecay;
        for (int i = 0; i < 4; i++) { if (i >= uCount) break; vec2 c = vec2(uStamps[i*4], uStamps[i*4+1]); float r = uStamps[i*4+2], s = uStamps[i*4+3];
          float d = length(vUv - c) / r; h = max(h, s * smoothstep(1.0, 0.2, d)); }
        gl_FragColor = vec4(h, 0.0, 0.0, 1.0); }`,
  }), [])
  useEffect(() => { scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return () => { targets.forEach(t => t.dispose()); mat.dispose() } }, [scene, mat, targets])
  const idx = useRef(0)
  const stamps = useRef<Stamp[]>([])
  const step = (gl: THREE.WebGLRenderer) => {
    const arr = mat.uniforms.uStamps.value as Float32Array; const list = stamps.current.slice(0, 4)
    list.forEach((s, i) => { arr[i * 4] = s.x / G + 0.5; arr[i * 4 + 1] = 0.5 - s.z / G; arr[i * 4 + 2] = s.r / G; arr[i * 4 + 3] = s.s })
    mat.uniforms.uCount.value = list.length; mat.uniforms.uPrev.value = targets[idx.current].texture
    gl.setRenderTarget(targets[1 - idx.current]); gl.render(scene, cam); gl.setRenderTarget(null)
    idx.current = 1 - idx.current; stamps.current = []
    return targets[idx.current].texture
  }
  return { step, stamps }
}

// ------------------------------------------------------------------ the snow
function snowMaterial(letters: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: letters }, uTrail: { value: null }, uTint: { value: new THREE.Color('#ffffff') }, uLight: { value: new THREE.Color('#fff6e6') }, uLightDir: { value: new THREE.Vector3(-0.5, 0.8, 0.4).normalize() }, uTime: { value: 0 }, uAurora: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uMap, uTrail; uniform vec3 uTint, uLight, uLightDir; uniform float uTime, uAurora; varying vec2 vUv; varying vec3 vW;
      ${NOISE_GLSL}
      void main(){
        // the trail: pressed depth, and its slope for shading
        float h = texture2D(uTrail, vUv).r; float e = 1.0 / 512.0;
        float hx = texture2D(uTrail, vUv + vec2(e, 0.0)).r - texture2D(uTrail, vUv - vec2(e, 0.0)).r;
        float hy = texture2D(uTrail, vUv + vec2(0.0, e)).r - texture2D(uTrail, vUv - vec2(0.0, e)).r;
        // the letters, pushed sideways a little where the snow is displaced
        vec2 luv = vUv * 3.2 + vec2(hx, hy) * 2.0;
        vec4 tex = texture2D(uMap, luv);
        // paper texture: fibre and a fine grain
        float fib = fbm(vUv * 40.0) - 0.5; float grain = hash(floor(vW.xz * 90.0)) - 0.5;
        vec3 col = tex.rgb * (1.0 + fib * 0.10 + grain * 0.06);
        // light over the field: letters catch it like relief, the trail's slopes catch it more
        float lum = dot(tex.rgb, vec3(0.3, 0.59, 0.11));
        vec3 n = normalize(vec3(-hx * 9.0, 1.0, -hy * 9.0));
        float lit = 0.72 + 0.34 * max(0.0, dot(n, uLightDir));
        col *= lit * uTint * mix(vec3(1.0), uLight, 0.25);
        col *= 1.0 - h * 0.2;                                   // the trough is in shadow
        float ridge = max(0.0, dot(normalize(vec3(-hx, 0.0, -hy)), uLightDir.xzy)) ;
        col += vec3(1.0) * smoothstep(0.02, 0.2, h) * (1.0 - h) * 0.18 * lum; // the lip catches light
        // aurora on the snow at night
        if (uAurora > 0.001) { vec2 p = vW.xz * 0.25; float b = pow(0.5 + 0.5 * sin(p.x * 1.4 + p.y * 0.8 + uTime * 0.3 + sin(p.y * 1.2 - uTime * 0.2) * 2.0), 3.0);
          vec3 ac = mix(vec3(0.35, 0.9, 0.65), vec3(0.6, 0.45, 0.9), 0.5 + 0.5 * sin(p.x * 0.8 - uTime * 0.17)); col += ac * b * 0.28 * uAurora; }
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
}

// ------------------------------------------------------------------ a painted piece
type PieceProps = { url: string; width: number; position: [number, number, number]; rotation?: [number, number, number]; delay?: number; flip?: boolean; opacity?: number; onHover?: (h: boolean) => void; onClick?: () => void; name?: string; control?: React.MutableRefObject<{ reveal: (to: number, d?: number) => void; dissolve: (to: number, d?: number) => void } | null> }
function Piece({ url, width, position, rotation = [0, 0, 0], delay = 0, flip = false, opacity = 1, onHover, onClick, control }: PieceProps) {
  const tex = useTexture(url); tex.colorSpace = THREE.SRGBColorSpace
  const mat = useMemo(() => makePaintMaterial(tex), [tex])
  const aspect = (tex.image as HTMLImageElement).height / (tex.image as HTMLImageElement).width
  useEffect(() => {
    mat.uniforms.uReveal.value = 0
    const tw = gsap.to(mat.uniforms.uReveal, { value: 1, duration: prefersReducedMotion() ? 0.3 : 1.8, delay, ease: 'power2.out' })
    if (control) control.current = {
      reveal: (to, d = 1.6) => { gsap.killTweensOf(mat.uniforms.uReveal); gsap.to(mat.uniforms.uReveal, { value: to, duration: d, ease: 'power2.out' }) },
      dissolve: (to, d = 1.4) => { gsap.killTweensOf(mat.uniforms.uDissolve); gsap.to(mat.uniforms.uDissolve, { value: to, duration: d, ease: 'power2.in' }) },
    }
    return () => { tw.kill() }
  }, [mat, delay, control])
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt; mat.uniforms.uFlip.value = flip ? 1 : 0; mat.uniforms.uOpacity.value = opacity })
  return (
    <mesh position={position} rotation={rotation} material={mat} onPointerOver={onHover ? () => onHover(true) : undefined} onPointerOut={onHover ? () => onHover(false) : undefined} onClick={onClick}>
      <planeGeometry args={[width, width * aspect]} />
    </mesh>
  )
}

// ------------------------------------------------------------------ the scene
type SceneProps = Props & { setHover: (h: 'igloo' | 'chimin' | 'camera' | null) => void; enterRef: React.MutableRefObject<() => void>; darkRef: React.RefObject<HTMLDivElement | null> }
function Scene({ onEnter, onAbout, setHover, enterRef, darkRef }: SceneProps) {
  const { camera, gl, scene } = useThree()
  const letters = useMemo(() => lettersTexture(), [])
  const snowMat = useMemo(() => snowMaterial(letters), [letters])
  const trail = useTrail()
  const reduced = useMemo(() => prefersReducedMotion(), [])

  // camera: a paper-theatre angle, drifting with the pointer; the look target is tweened when entering
  const home = useMemo(() => new THREE.Vector3(0, 6.2, 22), [])
  const look = useMemo(() => new THREE.Vector3(0, 2.0, 0), [])
  const par = useRef({ x: 0, y: 0 })
  const entering = useRef(false)

  // pointer on the ground
  const cursor = useRef(new THREE.Vector3()); const hasCursor = useRef(false)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const ray = useMemo(() => new THREE.Raycaster(), [])
  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      par.current = { x: ndc.x, y: ndc.y }; ray.setFromCamera(ndc, camera); hasCursor.current = ray.ray.intersectPlane(plane, cursor.current) !== null
    }
    const onLeave = () => { hasCursor.current = false }
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave)
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave) }
  }, [gl, camera, ray, plane])

  // the fox: a paper cut-out that wades toward the cursor and keeps outside the igloo
  const fox = useRef<THREE.Group>(null)
  const foxState = useRef({ x: 7, z: 9, heading: 1, target: new THREE.Vector3(8, 0, 7), gait: 0, idle: 0, flip: false, moving: false, leaving: false })
  const [foxFlip, setFoxFlip] = useState(false)
  const spray = useRef<THREE.Points>(null)
  const sprayData = useMemo(() => ({ pos: new Float32Array(90 * 3), vel: new Float32Array(90 * 3), life: new Float32Array(90), next: 0 }), [])

  // time of day
  const look_ = useMemo(() => ({ tint: new THREE.Color(), light: new THREE.Color(), sky: new THREE.Color(), horizon: new THREE.Color(), sparkle: 1, aurora: 0, glow: 0 }), [])
  const tgt = useMemo(() => ({ tint: new THREE.Color(), light: new THREE.Color(), sky: new THREE.Color(), horizon: new THREE.Color(), sparkle: 1, aurora: 0, glow: 0 }), [])
  useEffect(() => {
    const set = (dst: typeof tgt) => { const L = LOOKS[getMode()]; dst.tint.set(L.tint); dst.light.set(L.light); dst.sky.set(L.sky); dst.horizon.set(L.horizon); dst.sparkle = L.sparkle; dst.aurora = L.aurora; dst.glow = L.glow }
    set(look_); set(tgt); const on = () => set(tgt); window.addEventListener('modechange', on); return () => window.removeEventListener('modechange', on)
  }, [look_, tgt])
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
  const glowTex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); return t }, [])
  useEffect(() => { glowMat.map = glowTex; glowMat.needsUpdate = true }, [glowMat, glowTex])
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#4a4f8c', transparent: true, opacity: 0.35, depthWrite: false, map: glowTex }), [glowTex])

  // entering the igloo
  const timelines = useRef<gsap.core.Timeline[]>([])
  useEffect(() => {
    enterRef.current = () => {
      if (entering.current) return
      entering.current = true; foxState.current.leaving = true
      if (reduced) { gsap.to(darkRef.current, { opacity: 1, duration: 0.4, onComplete: onEnter }); return }
      const tl = gsap.timeline({ onComplete: onEnter })
      tl.to(camera.position, { x: 0, y: 2.8, z: 13.5, duration: 1.7, ease: 'power2.inOut' })
        .to(look, { x: 0, y: 1.2, z: 4.0, duration: 1.7, ease: 'power2.inOut' }, '<')
        .to(camera.position, { x: 0, y: 1.2, z: 3.6, duration: 1.2, ease: 'power3.in' }, '-=0.1')
        .to(look, { x: 0, y: 1.0, z: -2, duration: 1.2, ease: 'power3.in' }, '<')
        .to(darkRef.current, { opacity: 1, duration: 0.55 }, '-=0.5')
      timelines.current.push(tl)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') enterRef.current() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); timelines.current.forEach(t => t.kill()) }
  }, [camera, look, onEnter, enterRef, darkRef, reduced])

  // the object test: the camera on its table paints in, dissolves on click, paints back
  const camCtl = useRef<{ reveal: (to: number, d?: number) => void; dissolve: (to: number, d?: number) => void } | null>(null)
  const [camGone, setCamGone] = useState(false)
  const onCameraClick = () => {
    if (camGone || !camCtl.current) return
    setCamGone(true); camCtl.current.dissolve(1, 1.4)
    setTimeout(() => { camCtl.current?.dissolve(0, 0.01); camCtl.current?.reveal(0, 0.01); setTimeout(() => { camCtl.current?.reveal(1, 2.0); setCamGone(false) }, 250) }, 2200)
  }

  const t0 = useRef(0)
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05); t0.current += d
    // look eases
    const k = Math.min(1, d * 2.2)
    look_.tint.lerp(tgt.tint, k); look_.light.lerp(tgt.light, k); look_.sky.lerp(tgt.sky, k); look_.horizon.lerp(tgt.horizon, k)
    look_.sparkle += (tgt.sparkle - look_.sparkle) * k; look_.aurora += (tgt.aurora - look_.aurora) * k; look_.glow += (tgt.glow - look_.glow) * k
    snowMat.uniforms.uTint.value.copy(look_.tint); snowMat.uniforms.uLight.value.copy(look_.light); snowMat.uniforms.uAurora.value = look_.aurora; snowMat.uniforms.uTime.value = t0.current
    ;(scene.background as THREE.Color).copy(look_.horizon); (scene.fog as THREE.Fog).color.copy(look_.horizon)
    skyMat.uniforms.uTop.value.copy(look_.sky); skyMat.uniforms.uBot.value.copy(look_.horizon); skyMat.uniforms.uAurora.value = look_.aurora; skyMat.uniforms.uTime.value = t0.current
    glowMat.opacity = look_.glow * 0.8

    // the fox
    const f = foxState.current
    if (f.leaving) f.target.set(9, 0, 10)
    else if (hasCursor.current) {
      f.target.copy(cursor.current); const dist0 = Math.hypot(f.target.x, f.target.z); const keep = R + 1.2
      if (dist0 < keep) { f.target.x *= keep / Math.max(dist0, 1e-3); f.target.z *= keep / Math.max(dist0, 1e-3) }
    }
    const dx = f.target.x - f.x, dz = f.target.z - f.z; const dist = Math.hypot(dx, dz)
    f.moving = dist > 0.6
    if (f.moving) {
      const speed = Math.min(6.5, 2.2 + dist * 1.2); const step = Math.min(dist, speed * d) // wading: slower than running
      let nx = f.x + (dx / dist) * step, nz = f.z + (dz / dist) * step
      const nd = Math.hypot(nx, nz); const keep = R + 0.9
      if (nd < keep) { const ang = Math.atan2(nx, nz) + (dx * nz - dz * nx > 0 ? -1 : 1) * 0.08; nx = Math.sin(ang) * keep; nz = Math.cos(ang) * keep }
      f.x = nx; f.z = nz; f.gait += d * 9; f.idle = 0
      const flip = dx < 0; if (flip !== f.flip) { f.flip = flip; setFoxFlip(flip) }
      // snow spray from the feet
      for (let n = 0; n < 2; n++) {
        const i = sprayData.next = (sprayData.next + 1) % 90
        sprayData.pos[i * 3] = f.x + (Math.random() - 0.5) * 0.6; sprayData.pos[i * 3 + 1] = 0.1; sprayData.pos[i * 3 + 2] = f.z + (Math.random() - 0.5) * 0.6
        sprayData.vel[i * 3] = -(dx / dist) * 1.5 + (Math.random() - 0.5) * 1.5; sprayData.vel[i * 3 + 1] = 2 + Math.random() * 2; sprayData.vel[i * 3 + 2] = -(dz / dist) * 1.5 + (Math.random() - 0.5) * 1.5
        sprayData.life[i] = 1
      }
    } else f.idle += d
    if (fox.current) {
      const bob = f.moving ? Math.abs(Math.sin(f.gait)) * 0.12 : 0
      fox.current.position.set(f.x, -0.55 + bob, f.z)               // sunk: the lower part is below the snow
      fox.current.rotation.z = f.moving ? Math.sin(f.gait) * 0.04 : 0
      fox.current.rotation.y = Math.atan2(camera.position.x - f.x, camera.position.z - f.z) // face the camera, flat
    }
    // spray particles
    const p = sprayData; const pa = spray.current?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    for (let i = 0; i < 90; i++) {
      if (p.life[i] <= 0) { p.pos[i * 3 + 1] = -5; continue }
      p.life[i] -= d * 1.6; p.vel[i * 3 + 1] -= 9 * d
      p.pos[i * 3] += p.vel[i * 3] * d; p.pos[i * 3 + 1] += p.vel[i * 3 + 1] * d; p.pos[i * 3 + 2] += p.vel[i * 3 + 2] * d
      if (p.pos[i * 3 + 1] < 0) p.life[i] = 0
    }
    if (pa) { (pa.array as Float32Array).set(p.pos); pa.needsUpdate = true }

    // the trail: the cursor, the fox, and Chimin pressed in
    if (hasCursor.current && !entering.current) trail.stamps.current.push({ x: cursor.current.x, z: cursor.current.z, r: 0.7, s: 0.38 })
    trail.stamps.current.push({ x: f.x, z: f.z, r: 0.95, s: 0.7 })
    trail.stamps.current.push({ x: -6.8, z: 5.2, r: 2.7, s: 0.45 })
    snowMat.uniforms.uTrail.value = trail.step(gl)

    // camera drift
    if (!entering.current && !reduced) { camera.position.x += (home.x + par.current.x * 1.8 - camera.position.x) * 0.04; camera.position.y += (home.y - par.current.y * 0.8 - camera.position.y) * 0.04 }
    camera.lookAt(look)
  })

  useEffect(() => { camera.position.copy(home); camera.lookAt(look) }, [camera, home, look])

  return (
    <>
      <color attach="background" args={['#e6e7fb']} />
      <fog attach="fog" args={['#e6e7fb', 40, 120]} />
      <mesh material={skyMat} renderOrder={-1}><sphereGeometry args={[150, 32, 16]} /></mesh>
      {/* the snow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={snowMat}><planeGeometry args={[G, G]} /></mesh>
      <Sparkles count={420} scale={[70, 0.4, 70]} position={[0, 0.15, 0]} size={2.4} speed={0.35} opacity={0.75 * Math.min(1.6, look_.sparkle)} color="#ffffff" noise={0.4} />
      {/* the igloo: three paper plates and a warm glow at the door for the evening and night */}
      <mesh position={[0.6, 0.02, 0.8]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat}><planeGeometry args={[17, 13]} /></mesh>
      <Piece url={`${B}/art/paper/igloo-back.webp`} width={11.9} position={[0, 2.9, -2.4]} rotation={[-0.06, 0, 0]} delay={0.2} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <Piece url={`${B}/art/paper/igloo-front.webp`} width={11.6} position={[0, 2.45, 1.2]} rotation={[-0.05, 0, 0]} delay={0.5} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <mesh position={[0, 0.9, 3.75]} rotation={[-0.04, 0, 0]}><circleGeometry args={[1.35, 24, 0, Math.PI]} /><meshBasicMaterial color="#2e3650" /></mesh>
      <Piece url={`${B}/art/paper/igloo-arch.webp`} width={4.6} position={[0, 1.4, 3.9]} rotation={[-0.04, 0, 0]} delay={0.8} onHover={h => setHover(h ? 'igloo' : null)} onClick={() => enterRef.current()} />
      <mesh position={[0, 0.06, 6.2]} rotation={[-Math.PI / 2, 0, 0]} material={glowMat}><planeGeometry args={[9, 7]} /></mesh>
      {/* Chimin, pressed into the snow, and a drift or two */}
      <Piece url={`${B}/art/paper/chimin.webp`} width={4.2} position={[-6.8, 0.6, 5.2]} rotation={[-1.15, 0, 0.35]} delay={1.1} onHover={h => setHover(h ? 'chimin' : null)} onClick={onAbout} />
      <Piece url={`${B}/art/paper/drift-3.webp`} width={11} position={[-14, 0.03, -9]} rotation={[-Math.PI / 2, 0, 0.2]} delay={0.3} opacity={0.85} />
      <Piece url={`${B}/art/paper/drift-1.webp`} width={8} position={[15, 0.03, -6]} rotation={[-Math.PI / 2, 0, -0.3]} delay={0.6} opacity={0.85} />
      {/* the object test: a table patch with the camera on it */}
      <Piece url={`${B}/art/paper/table.webp`} width={5.2} position={[7.0, 0.3, 5.0]} rotation={[-1.25, 0, -0.1]} delay={1.3} />
      <Piece url={`${B}/art/paper/camera.webp`} width={2.4} position={[7.0, 1.15, 5.3]} delay={1.8} control={camCtl} onHover={h => setHover(h ? 'camera' : null)} onClick={onCameraClick} />
      {/* the fox, wading */}
      <group ref={fox}>
        <Piece url={`${B}/art/paper/fox-side.webp`} width={3.2} position={[0, 1.05, 0]} delay={1.4} flip={foxFlip} />
      </group>
      <points ref={spray}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[sprayData.pos, 3]} /></bufferGeometry>
        <pointsMaterial size={0.14} color="#ffffff" transparent opacity={0.9} sizeAttenuation depthWrite={false} />
      </points>
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.86} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.2} darkness={0.35} />
      </EffectComposer>
    </>
  )
}

export function Diorama({ onEnter, onAbout }: Props) {
  const [hover, setHover] = useState<'igloo' | 'chimin' | 'camera' | null>(null)
  const [entering, setEntering] = useState(false)
  const enterRef = useRef<() => void>(() => {})
  const darkRef = useRef<HTMLDivElement>(null)
  const enter = () => { setEntering(true); enterRef.current() }
  return (
    <div className={`snow ${entering ? 'snow--entering' : ''} ${hover ? `snow--hover-${hover}` : ''}`}>
      <div className="snow__canvas">
        <Canvas dpr={[1, 1.5]} camera={{ fov: 36, near: 0.1, far: 400, position: [0, 6.2, 22] }} gl={{ antialias: true, powerPreference: 'high-performance' }} onPointerDown={() => { if (hover === 'igloo') enter() }}>
          <Suspense fallback={null}>
            <Scene onEnter={onEnter} onAbout={onAbout} setHover={setHover} enterRef={enterRef} darkRef={darkRef} />
          </Suspense>
        </Canvas>
      </div>
      <h1 className="snow__name display">Chimin</h1>
      <p className="snow__hint label">{hover === 'chimin' ? 'that’s me, lying in the snow' : hover === 'igloo' ? 'go inside' : hover === 'camera' ? 'photographs · click to see it dissolve' : 'the fox follows your cursor · click the igloo to go inside'}</p>
      <button type="button" className="snow__go label" onClick={enter}>go inside →</button>
      <div ref={darkRef} className="snow__dark" aria-hidden="true" />
    </div>
  )
}
