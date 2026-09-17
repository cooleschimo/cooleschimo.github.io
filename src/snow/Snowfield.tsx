import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { getMode, type Mode } from '../lib/mode'

/**
 * Outside: a field of snow made of letters (Chimin's reference), glittering; an igloo of translucent ice
 * blocks in the middle, in real 3D (lit from inside at night); an arctic fox that runs around the igloo to
 * wherever the cursor is; and Chimin lying in the snow. Click the igloo (or press Enter) and the camera
 * drops to the door and goes in. Day, evening and night follow the site's mode.
 */
type Props = { onEnter: () => void; onAbout: () => void }

const R = 4.2 // igloo radius

/** Everything that changes with the time of day, as targets the scene eases toward. */
const LOOKS: Record<Mode, { ground: string; sky: string; horizon: string; hemi: string; hemiI: number; sun: string; sunI: number; glow: number; sparkle: number; aurora: number; mouth: string }> = {
  day: { ground: '#ffffff', sky: '#a9b7ea', horizon: '#dfe3fb', hemi: '#ffffff', hemiI: 1.7, sun: '#fff5e8', sunI: 1.1, glow: 0.0, sparkle: 1.0, aurora: 0.0, mouth: '#4a6a86' },
  evening: { ground: '#f3c8bf', sky: '#7e6fb0', horizon: '#ffc9a2', hemi: '#ffd9c2', hemiI: 1.5, sun: '#ffb27a', sunI: 1.4, glow: 0.35, sparkle: 0.8, aurora: 0.0, mouth: '#ffb779' },
  night: { ground: '#4a5490', sky: '#0d1330', horizon: '#233062', hemi: '#8ea2e8', hemiI: 0.8, sun: '#9fb2ff', sunI: 0.35, glow: 1.0, sparkle: 1.6, aurora: 1.0, mouth: '#ffd191' },
}

function snowTexture(size = 2048) {
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#98a6e4'; g.fillRect(0, 0, size, size)
  const chars = 'AaBbdDeEhHiJkKMmnNoOPqrRstTuvwWxyzZ'
  for (let i = 0; i < 30000; i++) {
    const s = 6 + Math.random() * Math.random() * 16
    const x = Math.random() * size, y = Math.random() * size
    const r = Math.random()
    let col: string
    if (r < 0.06) col = `rgba(255,255,255,${0.75 + Math.random() * 0.25})`
    else if (r < 0.13) col = `rgba(232,200,236,${0.5 + Math.random() * 0.4})`
    else if (r < 0.3) col = `rgba(205,212,248,${0.55 + Math.random() * 0.4})`
    else if (r < 0.44) col = `rgba(128,144,220,${0.45 + Math.random() * 0.4})`
    else col = `rgba(176,188,240,${0.45 + Math.random() * 0.5})`
    g.fillStyle = col
    g.font = `${s | 0}px Geist, ui-sans-serif, system-ui, sans-serif`
    const ch = chars[(Math.random() * chars.length) | 0]
    if (Math.random() < 0.15) { g.save(); g.translate(x, y); g.rotate((Math.random() - 0.5) * 0.7); g.fillText(ch, 0, 0); g.restore() }
    else g.fillText(ch, x, y)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5.5, 5.5); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

function driftTexture(size = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d')!
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = size * (0.05 + Math.random() * 0.12)
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(232,234,254,0.55)'); grad.addColorStop(1, 'rgba(232,234,254,0)')
    g.fillStyle = grad; g.fillRect(x - r, y - r, 2 * r, 2 * r)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function blobTexture(color: string, inner = 0.4) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grad.addColorStop(0, color.replace('A', String(inner))); grad.addColorStop(1, color.replace('A', '0'))
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function makeSparkles(count = 800) {
  const pos = new Float32Array(count * 3), phase = new Float32Array(count), speed = new Float32Array(count), size = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 100; pos[i * 3 + 1] = 0.08; pos[i * 3 + 2] = (Math.random() - 0.5) * 100
    phase[i] = Math.random() * Math.PI * 2; speed[i] = 0.6 + Math.random() * 2.2; size[i] = 0.3 + Math.random() * Math.random() * 0.9
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uGain: { value: 1 } },
    vertexShader: `attribute float aPhase, aSpeed, aSize; uniform float uTime, uPixel, uGain; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float tw = pow(0.5+0.5*sin(uTime*aSpeed+aPhase), 5.0); vA = tw*uGain;
      gl_PointSize = aSize * uPixel * (260.0 / -mv.z) * (0.6+0.8*tw); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord-0.5; float d = length(p);
      float core = smoothstep(0.5, 0.08, d); float star = max(0.0, 1.0-abs(p.x)*9.0)*max(0.0,1.0-abs(p.y)*40.0) + max(0.0, 1.0-abs(p.y)*9.0)*max(0.0,1.0-abs(p.x)*40.0);
      float a = (core + star*0.7) * vA; gl_FragColor = vec4(1.0, 0.99, 1.0, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  return new THREE.Points(geo, mat)
}

/** The sky: a big inside-out sphere with a vertical gradient and, at night, slow aurora curtains and stars. */
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color('#a9b7ea') }, uBot: { value: new THREE.Color('#dfe3fb') }, uAurora: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop, uBot; uniform float uAurora, uTime; varying vec3 vP;
      void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(uBot, uTop, pow(h, 0.6));
      if (uAurora > 0.001) { float a = atan(vP.x, vP.z); float band = sin(a*5.0 + uTime*0.25 + sin(a*2.0+uTime*0.1)*1.5);
        float y = smoothstep(0.05, 0.25, vP.y) * (1.0 - smoothstep(0.35, 0.7, vP.y)); float curtain = pow(0.5+0.5*band, 3.0) * y;
        vec3 ac = mix(vec3(0.45, 0.95, 0.7), vec3(0.65, 0.5, 0.95), 0.5+0.5*sin(a*3.0 - uTime*0.15)); c += ac * curtain * 0.55 * uAurora;
        float star = step(0.9985, fract(sin(dot(floor(vP.xz*400.0), vec2(12.9898,78.233))) * 43758.5453)) * smoothstep(0.1,0.4,vP.y); c += star * 0.8 * uAurora; }
      gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), mat); sky.renderOrder = -1
  return sky
}

/** Aurora light falling on the snow at night: drifting green and violet bands, additive. */
function makeAuroraGround() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMix: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uMix; varying vec2 vUv; void main(){ vec2 p = (vUv-0.5)*40.0;
      float b = 0.5+0.5*sin(p.x*0.35 + p.y*0.2 + uTime*0.3 + sin(p.y*0.3 - uTime*0.2)*2.0); b = pow(b, 3.0);
      vec3 c = mix(vec3(0.35,0.9,0.65), vec3(0.6,0.45,0.9), 0.5+0.5*sin(p.x*0.2 - uTime*0.17)); gl_FragColor = vec4(c * b * 0.35 * uMix, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; return m
}

function makeIgloo() {
  const g = new THREE.Group()
  // translucent ice: light passes through the blocks, so the joint sphere behind them and the glow inside show
  const ice = new THREE.MeshPhysicalMaterial({ color: '#f2fbfd', roughness: 0.3, metalness: 0, transmission: 0.38, thickness: 0.9, ior: 1.31, attenuationColor: new THREE.Color('#b9e6f2'), attenuationDistance: 3.5, clearcoat: 0.8, clearcoatRoughness: 0.3, emissive: new THREE.Color('#dff5fa'), emissiveIntensity: 0.22 })
  const joint = new THREE.MeshLambertMaterial({ color: '#a9dcea', emissive: new THREE.Color('#ffb36b'), emissiveIntensity: 0 })
  const box = new THREE.BoxGeometry(1, 1, 1)
  const dummy = new THREE.Object3D(); const items: { p: THREE.Vector3; s: THREE.Vector3; look: THREE.Vector3; f: number }[] = []
  const courses = 11
  for (let ci = 0; ci < courses; ci++) {
    const a0 = (Math.PI / 2) * (ci / courses), a1 = (Math.PI / 2) * ((ci + 1) / courses)
    const am = (a0 + a1) / 2, rm = R * Math.cos(am); const n = Math.max(6, Math.round((2 * Math.PI * rm) / 1.05)); const off = (ci % 2) * 0.5
    const h = R * (a1 - a0) * 0.9, w = ((2 * Math.PI * rm) / n) * 0.91
    for (let bi = 0; bi < n; bi++) {
      const t = (2 * Math.PI * (bi + off + 0.5)) / n; const rr = R + (Math.random() - 0.5) * 0.05
      const p = new THREE.Vector3(rr * Math.cos(am) * Math.sin(t), rr * Math.sin(am), rr * Math.cos(am) * Math.cos(t))
      items.push({ p, s: new THREE.Vector3(w, h, 0.34), look: p.clone().multiplyScalar(2), f: ci / (courses - 1) })
    }
  }
  const tr = 1.25, tl = 2.3, z0 = R * 0.6
  for (let si = 0; si < 6; si++) {
    const zc = z0 + (tl * (si + 0.5)) / 6; const off = (si % 2) * 0.5; const n = 7
    for (let ai = 0; ai < n; ai++) {
      const a = (Math.PI * (ai + off + 0.5)) / n; if (a > Math.PI) continue
      const p = new THREE.Vector3(tr * Math.cos(a), tr * Math.sin(a), zc)
      items.push({ p, s: new THREE.Vector3((Math.PI * tr) / n * 0.9, tl / 6 * 0.9, 0.3), look: new THREE.Vector3(p.x * 2, p.y * 2, zc), f: Math.sin(a) })
    }
  }
  const blocks = new THREE.InstancedMesh(box, ice, items.length)
  const deep = new THREE.Color('#cfeff7'), top = new THREE.Color('#ffffff'), col = new THREE.Color()
  items.forEach((it, i) => {
    dummy.position.copy(it.p); dummy.lookAt(it.look); dummy.scale.copy(it.s)
    if (i >= items.length - 42) dummy.rotateZ(Math.PI / 2)
    dummy.updateMatrix(); blocks.setMatrixAt(i, dummy.matrix)
    col.copy(deep).lerp(top, it.f).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04); blocks.setColorAt(i, col)
  })
  g.add(blocks)
  g.add(new THREE.Mesh(new THREE.SphereGeometry(R - 0.22, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), joint))
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(tr - 0.18, tr - 0.18, tl + 0.3, 24, 1, true), joint)
  tube.rotation.x = Math.PI / 2; tube.position.z = z0 + tl / 2; g.add(tube)
  const mouthMat = new THREE.MeshBasicMaterial({ color: '#4a6a86' })
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(tr - 0.2, 24), mouthMat)
  mouth.position.z = z0 + tl + 0.16; g.add(mouth)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: blobTexture('rgba(70,80,150,A)', 0.45), transparent: true, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.9, 0.02, 0.6); g.add(shadow)
  // the glow inside, for evening and night: a warm light and a pool of it spilling out of the door
  const lamp = new THREE.PointLight('#ffb36b', 0, 14, 1.6); lamp.position.set(0, 1.4, 0.6); g.add(lamp)
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshBasicMaterial({ map: blobTexture('rgba(255,190,110,A)', 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.03, z0 + tl + 2.2); g.add(spill)
  g.scale.y = 0.86
  g.traverse(o => { o.userData.igloo = true })
  return { igloo: g, joint, mouthMat, lamp, spill }
}

function makeFox() {
  const fur = new THREE.MeshLambertMaterial({ color: '#f6f3ec' }); const dark = new THREE.MeshLambertMaterial({ color: '#3a332e' })
  const fox = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.62, 6, 14), fur); body.rotation.x = Math.PI / 2; body.position.y = 0.56; fox.add(body)
  const head = new THREE.Group(); head.position.set(0, 0.78, 0.5); fox.add(head)
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), fur))
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), fur); muzzle.scale.set(1, 0.8, 1.4); muzzle.position.set(0, -0.07, 0.2); head.add(muzzle)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dark); nose.position.set(0, -0.05, 0.36); head.add(nose)
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 8), fur); ear.position.set(sx * 0.14, 0.24, -0.04); ear.rotation.z = -sx * 0.25; head.add(ear)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dark); eye.position.set(sx * 0.1, 0.03, 0.2); head.add(eye)
  }
  const legs: THREE.Group[] = []
  for (const [x, z] of [[-0.15, 0.28], [0.15, 0.28], [-0.15, -0.28], [0.15, -0.28]]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.5, z)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.5, 8), fur); leg.position.y = -0.25; hip.add(leg)
    fox.add(hip); legs.push(hip)
  }
  const tailPivot = new THREE.Group(); tailPivot.position.set(0, 0.62, -0.42); fox.add(tailPivot)
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 6, 10), fur); tail.position.set(0, 0.08, -0.28); tail.rotation.x = -1.2; tailPivot.add(tail)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: blobTexture('rgba(70,80,150,A)', 0.4), transparent: true, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.15, 0.03, 0.1); fox.add(shadow)
  return { fox, body, head, legs, tailPivot }
}

function makeChimin() {
  const parka = new THREE.MeshLambertMaterial({ color: '#c9b49b' }); const trim = new THREE.MeshLambertMaterial({ color: '#f3efe6' })
  const skin = new THREE.MeshLambertMaterial({ color: '#e9c4a8' }); const mitt = new THREE.MeshLambertMaterial({ color: '#b96a4c' }); const boot = new THREE.MeshLambertMaterial({ color: '#5b4a3d' })
  const me = new THREE.Group()
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 6, 14), parka); torso.rotation.x = Math.PI / 2; torso.position.set(0, 0.4, 0); me.add(torso)
  const headG = new THREE.Group(); headG.position.set(0, 0.34, -0.95); me.add(headG)
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), skin))
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.13, 10, 24), trim); hood.rotation.x = Math.PI / 2; hood.position.y = -0.02; headG.add(hood)
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.8, 6, 10), parka); arm.position.set(sx * 0.9, 0.3, -0.45); arm.rotation.z = sx * 0.9; arm.rotation.x = 0.3; me.add(arm)
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mitt); m.position.set(sx * 1.35, 0.3, -0.75); me.add(m)
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.75, 6, 10), parka); leg.position.set(sx * 0.28, 0.32, 0.95); leg.rotation.x = Math.PI / 2; leg.rotation.y = sx * 0.12; me.add(leg)
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.4), boot); b.position.set(sx * 0.36, 0.32, 1.55); me.add(b)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), boot); eye.position.set(sx * 0.1, 0.26, 0.02); headG.add(eye)
  }
  const angel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.2), new THREE.MeshBasicMaterial({ map: blobTexture('rgba(236,238,255,A)', 0.55), transparent: true, depthWrite: false }))
  angel.rotation.x = -Math.PI / 2; angel.position.set(0, 0.015, 0.2); me.add(angel)
  me.traverse(o => { o.userData.chimin = true })
  return me
}

export function Snowfield({ onEnter, onAbout }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const dark = useRef<HTMLDivElement>(null)
  const enterRef = useRef<() => void>(() => {})
  const [entering, setEntering] = useState(false)
  const [hover, setHover] = useState<'igloo' | 'chimin' | null>(null)

  useEffect(() => {
    const el = host.current!; const reduced = prefersReducedMotion()
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.setSize(el.clientWidth, el.clientHeight); renderer.transmissionResolutionScale = 0.5
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#98a6e4'); scene.fog = new THREE.Fog('#98a6e4', 45, 110)
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 400)
    const camHome = new THREE.Vector3(0, 21, 16); const look = new THREE.Vector3(0, 0.6, 1); camera.position.copy(camHome); camera.lookAt(look)
    const hemi = new THREE.HemisphereLight('#ffffff', '#8f9de2', 1.7); scene.add(hemi)
    const sun = new THREE.DirectionalLight('#fff5e8', 1.1); sun.position.set(-8, 12, 7); scene.add(sun)
    const rim = new THREE.DirectionalLight('#bfe8ff', 0.6); rim.position.set(6, 6, -10); scene.add(rim)

    const groundMat = new THREE.MeshBasicMaterial({ map: snowTexture() })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground)
    const drifts = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshBasicMaterial({ map: driftTexture(), transparent: true, depthWrite: false }))
    drifts.rotation.x = -Math.PI / 2; drifts.position.y = 0.01; scene.add(drifts)
    const auroraGround = makeAuroraGround(); scene.add(auroraGround)
    const sky = makeSky(); scene.add(sky)
    const sparkles = makeSparkles(); scene.add(sparkles)
    const { igloo, joint, mouthMat, lamp, spill } = makeIgloo(); scene.add(igloo)
    const { fox, body, head, legs, tailPivot } = makeFox(); fox.position.set(6.5, 0, 6); fox.rotation.y = -0.8; scene.add(fox)
    const chimin = makeChimin(); chimin.position.set(-7.2, 0, 5.2); chimin.rotation.y = 0.55; scene.add(chimin)

    // time of day: ease every colour and intensity toward the mode's look
    type Look = { ground: THREE.Color; sky: THREE.Color; horizon: THREE.Color; hemi: THREE.Color; sun: THREE.Color; mouth: THREE.Color; hemiI: number; sunI: number; glow: number; sparkle: number; aurora: number }
    const mk = (): Look => ({ ground: new THREE.Color(), sky: new THREE.Color(), horizon: new THREE.Color(), hemi: new THREE.Color(), sun: new THREE.Color(), mouth: new THREE.Color(), hemiI: 1.7, sunI: 1.1, glow: 0, sparkle: 1, aurora: 0 })
    const cur = mk(), tgt = mk()
    const setLook = (m: Mode, dst: Look) => {
      const L = LOOKS[m]
      dst.ground.set(L.ground); dst.sky.set(L.sky); dst.horizon.set(L.horizon); dst.hemi.set(L.hemi); dst.sun.set(L.sun); dst.mouth.set(L.mouth)
      dst.hemiI = L.hemiI; dst.sunI = L.sunI; dst.glow = L.glow; dst.sparkle = L.sparkle; dst.aurora = L.aurora
    }
    setLook(getMode(), cur); setLook(getMode(), tgt)
    const onMode = () => setLook(getMode(), tgt)
    window.addEventListener('modechange', onMode)
    const applyLook = (k: number) => {
      cur.ground.lerp(tgt.ground, k); cur.sky.lerp(tgt.sky, k); cur.horizon.lerp(tgt.horizon, k); cur.hemi.lerp(tgt.hemi, k); cur.sun.lerp(tgt.sun, k); cur.mouth.lerp(tgt.mouth, k)
      cur.hemiI += (tgt.hemiI - cur.hemiI) * k; cur.sunI += (tgt.sunI - cur.sunI) * k; cur.glow += (tgt.glow - cur.glow) * k; cur.sparkle += (tgt.sparkle - cur.sparkle) * k; cur.aurora += (tgt.aurora - cur.aurora) * k
      groundMat.color.copy(cur.ground); hemi.color.copy(cur.hemi); hemi.intensity = cur.hemiI; sun.color.copy(cur.sun); sun.intensity = cur.sunI
      ;(scene.background as THREE.Color).copy(cur.horizon); (scene.fog as THREE.Fog).color.copy(cur.horizon)
      const sm = sky.material as THREE.ShaderMaterial; (sm.uniforms.uTop.value as THREE.Color).copy(cur.sky); (sm.uniforms.uBot.value as THREE.Color).copy(cur.horizon); sm.uniforms.uAurora.value = cur.aurora
      ;(auroraGround.material as THREE.ShaderMaterial).uniforms.uMix.value = cur.aurora
      ;(sparkles.material as THREE.ShaderMaterial).uniforms.uGain.value = cur.sparkle
      joint.emissiveIntensity = cur.glow * 0.9; lamp.intensity = cur.glow * 40; mouthMat.color.copy(cur.mouth); (spill.material as THREE.MeshBasicMaterial).opacity = cur.glow
    }

    // pointer → ground point
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const cursor = new THREE.Vector3(); let hasCursor = false; const par = { x: 0, y: 0 }
    let hoverKind: 'igloo' | 'chimin' | null = null
    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera); par.x = ndc.x; par.y = ndc.y
      const hits = ray.intersectObjects([igloo, chimin], true)
      const kind = hits.length ? (hits[0].object.userData.chimin ? 'chimin' : 'igloo') : null
      if (kind !== hoverKind) { hoverKind = kind; setHover(kind) }
      hasCursor = ray.ray.intersectPlane(plane, cursor) !== null
    }
    const onMove = (e: PointerEvent) => pick(e)
    const onLeave = () => { hasCursor = false }
    const onDown = (e: PointerEvent) => { pick(e); if (hoverKind === 'igloo') enterRef.current(); else if (hoverKind === 'chimin') onAbout() }
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave); el.addEventListener('pointerdown', onDown)

    // the fox
    const target = new THREE.Vector3(6.5, 0, 6); let gait = 0, idle = 0, sit = 0, running = false; const vel = new THREE.Vector3()
    let leaving = false
    const stepFox = (dt: number) => {
      if (leaving) target.set(6.2, 0, 9.5)
      else if (hasCursor) {
        target.copy(cursor); const d = Math.hypot(target.x, target.z); const keep = R + 1.3
        if (d < keep) { target.x *= keep / Math.max(d, 1e-3); target.z *= keep / Math.max(d, 1e-3) }
      }
      const dx = target.x - fox.position.x, dz = target.z - fox.position.z; const dist = Math.hypot(dx, dz)
      running = dist > 0.7
      if (running) {
        const speed = Math.min(10, 3 + dist * 1.6); const step = Math.min(dist, speed * dt)
        vel.set((dx / dist) * step, 0, (dz / dist) * step)
        const nx = fox.position.x + vel.x, nz = fox.position.z + vel.z; const nd = Math.hypot(nx, nz); const keep = R + 1.0
        if (nd < keep) { const ang = Math.atan2(nx, nz) + (dx * nz - dz * nx > 0 ? -1 : 1) * 0.09; fox.position.set(Math.sin(ang) * keep, 0, Math.cos(ang) * keep) }
        else fox.position.set(nx, 0, nz)
        const heading = Math.atan2(vel.x, vel.z); let da = heading - fox.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); fox.rotation.y += da * Math.min(1, dt * 10)
        gait += dt * 15; idle = 0
      } else idle += dt
      sit += ((idle > 2.2 ? 1 : 0) - sit) * Math.min(1, dt * 4)
      legs.forEach((l, i) => { l.rotation.x = running ? Math.sin(gait + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.7 : (i > 1 ? -sit * 1.3 : sit * 0.2) })
      body.position.y = 0.56 + (running ? Math.abs(Math.sin(gait)) * 0.06 : -sit * 0.12); body.rotation.x = Math.PI / 2 - sit * 0.6
      head.position.y = 0.78 + sit * 0.05; head.rotation.x = running ? 0.1 : -sit * 0.25 + Math.sin(performance.now() / 900) * 0.05
      tailPivot.rotation.y = Math.sin(performance.now() / (running ? 90 : 420)) * (running ? 0.25 : 0.5)
    }

    // entering the igloo
    const timelines: gsap.core.Timeline[] = []
    const enter = () => {
      if (entering) return
      setEntering(true); leaving = true
      const done = () => onEnter()
      if (reduced) { gsap.to(dark.current, { opacity: 1, duration: 0.4, onComplete: done }); return }
      const tl = gsap.timeline({ onComplete: done })
      tl.to(camera.position, { x: 0, y: 3.4, z: 13.5, duration: 1.7, ease: 'power2.inOut' })
        .to(look, { x: 0, y: 1.0, z: 5.6, duration: 1.7, ease: 'power2.inOut' }, '<')
        .to(camera.position, { x: 0, y: 1.05, z: 5.4, duration: 1.15, ease: 'power3.in' }, '-=0.1')
        .to(look, { x: 0, y: 0.9, z: 0, duration: 1.15, ease: 'power3.in' }, '<')
        .to(dark.current, { opacity: 1, duration: 0.55 }, '-=0.5')
      timelines.push(tl)
    }
    enterRef.current = enter
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') enter() }
    window.addEventListener('keydown', onKey)

    // loop
    const clock = new THREE.Clock(); let raf = 0; let hidden = document.hidden
    const tick = () => {
      raf = requestAnimationFrame(tick); if (hidden) return
      const dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime
      ;(sparkles.material as THREE.ShaderMaterial).uniforms.uTime.value = reduced ? 0.3 : t
      ;(sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t; (auroraGround.material as THREE.ShaderMaterial).uniforms.uTime.value = t
      applyLook(Math.min(1, dt * 2.2))
      stepFox(dt)
      if (!entering && !reduced) { camera.position.x += (camHome.x + par.x * 1.6 - camera.position.x) * 0.04; camera.position.y += (camHome.y - par.y * 0.8 - camera.position.y) * 0.04 }
      camera.lookAt(look)
      renderer.render(scene, camera)
    }
    tick()
    const onVis = () => { hidden = document.hidden; clock.getDelta() }
    const onResize = () => { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix() }
    document.addEventListener('visibilitychange', onVis); window.addEventListener('resize', onResize)
    ;(sparkles.material as THREE.ShaderMaterial).uniforms.uPixel.value = renderer.getPixelRatio()

    return () => {
      cancelAnimationFrame(raf); timelines.forEach(t => t.kill())
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey); window.removeEventListener('modechange', onMode); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize)
      scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mat = m.material as THREE.Material | undefined; if (mat) { const mm = mat as THREE.MeshBasicMaterial; if (mm.map) mm.map.dispose(); mat.dispose() } })
      renderer.dispose(); renderer.domElement.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`snow ${entering ? 'snow--entering' : ''} ${hover ? `snow--hover-${hover}` : ''}`}>
      <div ref={host} className="snow__canvas" />
      <h1 className="snow__name display">Chimin</h1>
      <p className="snow__hint label">{hover === 'chimin' ? 'that’s me, lying in the snow' : hover === 'igloo' ? 'go inside' : 'the fox follows your cursor · click the igloo to go inside'}</p>
      <button type="button" className="snow__go label" onClick={() => enterRef.current()}>go inside →</button>
      <div ref={dark} className="snow__dark" aria-hidden="true" />
    </div>
  )
}
