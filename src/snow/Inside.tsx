import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { getMode, type Mode } from '../lib/mode'
import { ESSAYS } from '../lib/essays'
import songs from '../../content/songs.json'
import { ART } from '../room/art'
import { Piece, paper, type PieceControl } from './Piece'
import { makeSnowView } from './Letters'

/**
 * Inside the igloo, in the paper hand, walked through in three stops. You come in and the camera swings left to the
 * coat hooks: a white puffer and a brown leather shoulder bag. Hover the bag and a laptop rises out of it; click it and
 * it comes fully out, opens in front of you, and the technical projects appear on it. The enamel pins on the bag are
 * the design projects: hover and they swell and glisten, click and one floats up large while a panel opens beside it.
 * Scroll on to the bed, where the fox sleeps: on the bedside table a stack of magazines fans out on hover into the
 * essays, and a click opens one as a magazine you can flip; a record player plays a curated list, softer from a
 * distance and louder here. Scroll on to the window, whole in the frame: the letter snow and the sky outside, the camera
 * for the photographs, and postcards scattered on the chest that spread out into every place when you touch them.
 */
export type Thing = 'bag' | 'laptop' | 'pin' | 'puffer' | 'fox' | 'magazines' | 'vinyl' | 'camera' | 'postcards' | 'vase' | 'window' | 'paints' | 'coffee'
type Props = { onOpen: (thing: string) => void; opened: string | null; shut: boolean; onShutter: () => void }

const LOOKS: Record<Mode, { tint: string; bg: string; lampA: string; lampAI: number; lampBI: number; shadow: string }> = {
  day: { tint: '#ffffff', bg: '#d8dbe8', lampA: '#fff2d0', lampAI: 0.9, lampBI: 0.12, shadow: '#b3bfe6' },
  evening: { tint: '#f4dcc8', bg: '#d6bfc0', lampA: '#ffb27a', lampAI: 1.3, lampBI: 0.5, shadow: '#c0a3c4' },
  night: { tint: '#6b76ad', bg: '#1b2238', lampA: '#9fe6c8', lampAI: 0.9, lampBI: 1.2, shadow: '#2c3568' },
}

// the three stops: where the camera stands and what it looks at
const STATIONS: { pos: [number, number, number]; look: [number, number, number]; name: string; hint: string }[] = [
  { pos: [-3.2, 2.9, 9.4], look: [-9.8, 3.0, 7.7], name: 'the coats', hint: 'the coats · hover the bag · the pins are design projects · scroll on' },
  { pos: [0.5, 3.1, 5.4], look: [8.2, 1.7, 1.7], name: 'the bed', hint: 'the bed · the fox is asleep · the magazines are essays · the record player' },
  { pos: [0, 3.7, 5.6], look: [0, 3.95, -6.6], name: 'the window', hint: 'the window · the camera for photographs · touch the postcards · click the window to shut it' },
]

const WIN: [number, number, number] = [0, 5.6, -6.6]   // the window's centre in the wall
const WALL_L = -9.85                                     // the left wall, where the coats hang
const WALL_R = 9.85
const CHEST = 1.9                                        // the chest's top under the window
const BEDSIDE = 1.8                                      // the bedside table's top
const PINS: [number, number][] = [[-0.32, 0.05], [-0.05, -0.12], [0.24, 0.02], [-0.2, -0.36], [0.12, -0.38], [0.36, -0.22]]   // on the bag's flap, in its own units
const CARDS = ['venice', 'chicago', 'dubrovnik', 'como', 'malta']   // the postcards scattered on the chest

type SceneProps = Props & { setHover: (t: Thing | null) => void; station: number; vinylOpen: boolean; setVinylOpen: (v: boolean) => void }
function Scene({ onOpen, opened, shut, onShutter, setHover, station, setVinylOpen }: SceneProps) {
  const { camera, scene } = useThree()
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const view = useMemo(() => makeSnowView(), [])
  useEffect(() => { view.group.position.set(0, 2.4, 0); (window as unknown as { __inside?: unknown }).__inside = { gsap }; return () => { view.group.removeFromParent() } }, [view])

  // the camera walks between the stops
  const pos = useMemo(() => new THREE.Vector3(...STATIONS[0].pos), [])
  const look = useMemo(() => new THREE.Vector3(...STATIONS[0].look), [])
  const par = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const st = STATIONS[station]; const dur = reduced ? 0.2 : 1.8
    gsap.to(pos, { x: st.pos[0], y: st.pos[1], z: st.pos[2], duration: dur, ease: 'power2.inOut' })
    gsap.to(look, { x: st.look[0], y: st.look[1], z: st.look[2], duration: dur, ease: 'power2.inOut' })
  }, [station, pos, look, reduced])
  useEffect(() => {
    const onMove = (e: PointerEvent) => { par.current = { x: (e.clientX / innerWidth) * 2 - 1, y: -((e.clientY / innerHeight) * 2 - 1) } }
    window.addEventListener('pointermove', onMove); return () => window.removeEventListener('pointermove', onMove)
  }, [])
  /** a point in front of the camera: `dist` ahead, `side` to the right, `up` above the line of sight */
  const inFront = useCallback((dist: number, side = 0, up = 0) => {
    const f = new THREE.Vector3().subVectors(look, pos).normalize(); const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(); const u = new THREE.Vector3().crossVectors(r, f).normalize()
    return new THREE.Vector3().copy(pos).addScaledVector(f, dist).addScaledVector(r, side).addScaledVector(u, up)
  }, [pos, look])

  // the light: the day's tint on every piece, the window as one lamp, the candle as another
  const tint = useMemo(() => new THREE.Color('#ffffff'), [])
  const shadow = useMemo(() => new THREE.Color('#b3bfe6'), [])
  const lampA = useMemo(() => new THREE.Vector4(WIN[0], WIN[1], WIN[2] + 0.3, 0), [])
  const lampACol = useMemo(() => new THREE.Color('#fff2d0'), [])
  const lampB = useMemo(() => new THREE.Vector4(WALL_R - 0.6, BEDSIDE + 0.5, 2.4, 0), [])
  const lampBCol = useMemo(() => new THREE.Color('#ffc27c'), [])
  const cur = useMemo(() => ({ tint: new THREE.Color('#ffffff'), bg: new THREE.Color('#d8dbe8'), lampA: new THREE.Color('#fff2d0'), shadow: new THREE.Color('#b3bfe6'), lampAI: 0, lampBI: 0 }), [])
  const tgt = useMemo(() => ({ tint: new THREE.Color(), bg: new THREE.Color(), lampA: new THREE.Color(), shadow: new THREE.Color(), lampAI: 0, lampBI: 0 }), [])
  useEffect(() => {
    const set = () => { const L = LOOKS[getMode()]; tgt.tint.set(L.tint); tgt.bg.set(L.bg); tgt.lampA.set(L.lampA); tgt.shadow.set(L.shadow); tgt.lampAI = L.lampAI; tgt.lampBI = L.lampBI }
    set(); const on = () => set(); window.addEventListener('modechange', on); return () => window.removeEventListener('modechange', on)
  }, [tgt])
  const ceiling = useMemo(() => new THREE.Color('#c9cddb'), [])

  // the shutter slides down over the window
  const shutterY = useRef(9.4)
  useEffect(() => { gsap.to(shutterY, { current: shut ? WIN[1] : 9.4, duration: reduced ? 0.2 : 0.8, ease: 'power3.out' }) }, [shut, reduced])
  const shutterRef = useRef<THREE.Group>(null)

  const hoverRef = useRef<Thing | null>(null)
  const hover = useCallback((t: Thing | null) => { hoverRef.current = t; setHover(t) }, [setHover])

  // ---- the bag and the laptop
  const laptop = useRef<THREE.Group>(null); const hinge = useRef<THREE.Group>(null); const baseG = useRef<THREE.Group>(null)
  const bagPos = useMemo(() => new THREE.Vector3(WALL_L + 0.34, 2.9, 6.9), [])
  const laptopHome = useMemo(() => new THREE.Vector3(WALL_L + 0.2, 2.05, 6.9), [])   // inside the bag, behind its face (its hinge line at its bottom)
  const [bagHover, setBagHover] = useState(false)
  const laptopOut = opened === 'laptop'
  useEffect(() => {
    const g = laptop.current, h = hinge.current, b = baseG.current; if (!g || !h || !b) return
    for (const o of [g.position, g.rotation, g.scale, h.rotation, b.rotation]) gsap.killTweensOf(o)
    if (laptopOut) {
      // out of the bag, into the middle of the view: the closed slab flies out, then the base lies down and the screen leans back
      const to = inFront(2.6, 0, -0.75); const yaw = Math.atan2(pos.x - to.x, pos.z - to.z)
      const D = reduced ? 0.2 : 1.1
      gsap.to(g.position, { x: to.x, y: to.y, z: to.z, duration: D, ease: 'power3.inOut' })
      gsap.to(g.rotation, { y: yaw, duration: D, ease: 'power3.inOut' }); gsap.to(g.scale, { x: 1.4, y: 1.4, z: 1.4, duration: D, ease: 'power3.inOut' })
      gsap.to(b.rotation, { x: 1.35, duration: reduced ? 0.2 : 0.9, delay: reduced ? 0 : 0.8, ease: 'power2.inOut' })
      gsap.to(h.rotation, { x: -0.22, duration: reduced ? 0.2 : 0.9, delay: reduced ? 0 : 0.8, ease: 'power2.inOut' })
    } else {
      // closed: a slab standing in the bag; on hover it rises so its top shows over the flap
      const peek = bagHover ? 0.75 : 0
      gsap.to(b.rotation, { x: 0, duration: 0.5, ease: 'power2.in' }); gsap.to(h.rotation, { x: 0, duration: 0.5, ease: 'power2.in' })
      gsap.to(g.position, { x: laptopHome.x, y: laptopHome.y + peek, z: laptopHome.z, duration: reduced ? 0.2 : 0.7, ease: bagHover ? 'back.out(1.6)' : 'power3.out', delay: 0 })
      gsap.to(g.rotation, { y: Math.PI / 2, duration: 0.7, ease: 'power3.out' }); gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'power3.out' })
    }
  }, [laptopOut, bagHover, inFront, pos, laptopHome, reduced])

  // ---- the pins
  const pinRefs = useRef<(THREE.Group | null)[]>([])
  const [pinHover, setPinHover] = useState<number | null>(null)
  const openPin = opened?.startsWith('pin:') ? Number(opened.slice(4)) : null
  useEffect(() => {
    PINS.forEach(([px, py], i) => {
      const g = pinRefs.current[i]; if (!g) return
      const home = { x: bagPos.x + 0.16, y: bagPos.y + py * 1.9 + 0.1, z: bagPos.z + px * 1.9 }
      gsap.killTweensOf(g.position); gsap.killTweensOf(g.scale); gsap.killTweensOf(g.rotation)
      if (openPin === i + 1) {
        const to = inFront(2.6, -0.6, 0.05); const yaw = Math.atan2(pos.x - to.x, pos.z - to.z)
        gsap.to(g.position, { x: to.x, y: to.y, z: to.z, duration: reduced ? 0.2 : 1.0, ease: 'power3.inOut' })
        gsap.to(g.scale, { x: 3.8, y: 3.8, z: 3.8, duration: reduced ? 0.2 : 1.0, ease: 'power3.inOut' })
        gsap.to(g.rotation, { y: yaw, z: 0, duration: 1.0, ease: 'power3.inOut' })
      } else {
        const s = pinHover === i + 1 ? 1.6 : 1
        gsap.to(g.position, { x: home.x + (pinHover === i + 1 ? 0.12 : 0), y: home.y, z: home.z, duration: 0.7, ease: 'power3.out' })
        gsap.to(g.scale, { x: s, y: s, z: s, duration: 0.45, ease: 'back.out(2)' }); gsap.to(g.rotation, { y: Math.PI / 2, z: 0, duration: 0.7 })
      }
    })
  }, [openPin, pinHover, inFront, pos, bagPos, reduced])

  // ---- the magazines
  const magRefs = useRef<(THREE.Group | null)[]>([])
  const [fan, setFan] = useState(false)
  const fanTimer = useRef(0)
  const fanOn = useCallback((on: boolean) => { window.clearTimeout(fanTimer.current); if (on) setFan(true); else fanTimer.current = window.setTimeout(() => setFan(false), 350) }, [])
  const stackPos = useMemo(() => new THREE.Vector3(WALL_R - 0.5, BEDSIDE + 0.12, 3.2), [])
  useEffect(() => {
    ESSAYS.forEach((_, i) => {
      const g = magRefs.current[i]; if (!g) return; gsap.killTweensOf(g.position); gsap.killTweensOf(g.rotation); gsap.killTweensOf(g.scale)
      const k = i - (ESSAYS.length - 1) / 2
      if (fan) {
        gsap.to(g.position, { x: stackPos.x - 0.55 - Math.abs(k) * 0.06, y: stackPos.y + 0.95 + Math.abs(k) * 0.02, z: stackPos.z + k * 0.34, duration: reduced ? 0.2 : 0.7, delay: Math.abs(k) * 0.04, ease: 'power3.out' })
        gsap.to(g.rotation, { z: k * 0.16, duration: 0.7, ease: 'power3.out' }); gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.5 })
      } else {
        gsap.to(g.position, { x: stackPos.x, y: stackPos.y + 0.02 * i, z: stackPos.z, duration: 0.5, ease: 'power3.in' })
        gsap.to(g.rotation, { z: 0, duration: 0.5 }); gsap.to(g.scale, { x: 0.35, y: 0.35, z: 0.35, duration: 0.5, ease: 'power3.in' })
      }
    })
  }, [fan, stackPos, reduced])

  // ---- the postcards on the chest: they dissolve when the spread is open
  const cardCtls = useMemo(() => CARDS.map(() => ({ current: null as PieceControl | null })), [])
  useEffect(() => { cardCtls.forEach((c) => c.current && c.current.dissolve(opened === 'postcards' ? 1 : 0)) }, [opened, cardCtls])
  const camCtl = useRef<PieceControl | null>(null)
  useEffect(() => { camCtl.current?.dissolve(opened === 'camera' ? 1 : 0) }, [opened])
  const [inVase, setInVase] = useState<boolean[]>(() => { try { const v = localStorage.getItem('vase'); if (v) return JSON.parse(v) } catch { /* ignore */ } return [true, false, true, false, true, false] })
  useEffect(() => { try { localStorage.setItem('vase', JSON.stringify(inVase)) } catch { /* ignore */ } }, [inVase])

  const t0 = useRef(0)
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); t0.current += d; const k = Math.min(1, d * 2.2)
    cur.tint.lerp(tgt.tint, k); cur.bg.lerp(tgt.bg, k); cur.lampA.lerp(tgt.lampA, k); cur.shadow.lerp(tgt.shadow, k)
    cur.lampAI += (tgt.lampAI - cur.lampAI) * k; cur.lampBI += (tgt.lampBI - cur.lampBI) * k
    const open = shut ? 0 : 1
    tint.copy(cur.tint); if (shut) tint.multiplyScalar(0.8)
    shadow.copy(cur.shadow); (scene.background as THREE.Color).copy(cur.bg); ceiling.copy(cur.bg).multiplyScalar(0.92)
    lampA.w = cur.lampAI * open; lampACol.copy(cur.lampA)
    lampB.w = cur.lampBI * (0.85 + 0.15 * Math.sin(t0.current * 9.0) * Math.sin(t0.current * 2.3))
    view.tick(dt, reduced)
    if (shutterRef.current) shutterRef.current.position.y = shutterY.current
    // the open pin turns slowly in the light
    if (openPin) { const g = pinRefs.current[openPin - 1]; if (g) g.rotation.y += d * 0.6 }
    if (!reduced) { camera.position.x = pos.x + par.current.x * 0.4; camera.position.y = pos.y - par.current.y * 0.2; camera.position.z = pos.z } else camera.position.copy(pos)
    camera.lookAt(look)
  })

  const piece = { tint, shadow, lampA, lampACol, lampB, lampBCol, frost: 0.08, grain: 0.3, relief: 0.9 }
  const onLeft: [number, number, number] = [0, Math.PI / 2, 0], onRight: [number, number, number] = [0, -Math.PI / 2, 0]
  return (
    <>
      <color attach="background" args={['#d8dbe8']} />
      <primitive object={view.group} />
      {/* the room: the wall with the window, the shutter behind it, the side walls, the floor, the ceiling */}
      <group ref={shutterRef} position={[0, 9.4, WIN[2] - 0.12]}><Piece url={paper('shutter')} width={3.7} position={[0, 0, 0]} delay={0} {...piece} puff={0.25} solid /></group>
      <Piece url={paper('wall-inside')} width={20} position={[0, 1.83, WIN[2]]} delay={0.1} {...piece} puff={0.2} relief={0.6} solid />
      <Piece url={paper('wall-inside')} width={22} position={[-10, 3.4, 2]} rotation={onLeft} delay={0.15} {...piece} puff={0.2} relief={0.6} solid />
      <Piece url={paper('wall-inside')} width={22} position={[10, 3.4, 2]} rotation={onRight} delay={0.15} {...piece} puff={0.2} relief={0.6} solid />
      <mesh position={[0, 7.6, 3.5]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[22, 20]} /><meshBasicMaterial color={ceiling} /></mesh>
      <mesh position={[WIN[0], WIN[1], WIN[2] + 0.1]} onPointerOver={(e) => { e.stopPropagation(); hover('window') }} onPointerOut={() => hover(null)} onClick={(e) => { e.stopPropagation(); onShutter() }}><circleGeometry args={[1.75, 32]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <Piece url={paper('floor-inside')} width={26} position={[0, 0, 0.2]} rotation={[-Math.PI / 2, 0, 0]} delay={0.2} {...piece} relief={0} solid />
      <Piece url={paper('floor-inside')} width={26} position={[0, 0, 13.2]} rotation={[-Math.PI / 2, 0, 0]} delay={0.2} {...piece} relief={0} solid />

      {/* stop 1, the coats: the puffer and the bag on the left wall by the door */}
      <Piece url={paper('puffer')} width={2.3} position={[WALL_L + 0.3, 3.7, 9.0]} rotation={onLeft} delay={0.4} {...piece} puff={0.35} solid onHover={h => hover(h ? 'puffer' : null)} />
      <group ref={laptop} position={[laptopHome.x, laptopHome.y, laptopHome.z]} rotation={onLeft}>
        <group ref={baseG}><Piece url={paper('laptop-base')} width={1.25} position={[0, 0.4, 0]} delay={0.6} {...piece} relief={0.5} solid onHover={h => { hover(h ? 'laptop' : null); setBagHover(h) }} onClick={() => onOpen('laptop')} /></group>
        <group ref={hinge}><Piece url={paper('laptop-screen')} width={1.25} position={[0, 0.43, 0.02]} delay={0.6} {...piece} relief={0.5} glisten={0.4} solid onHover={h => { hover(h ? 'laptop' : null); setBagHover(h) }} onClick={() => onOpen('laptop')} /></group>
      </group>
      <Piece url={paper('bag')} width={1.9} position={[bagPos.x, bagPos.y, bagPos.z]} rotation={onLeft} delay={0.5} {...piece} puff={0.35} solid
        onHover={h => { hover(h ? 'bag' : null); setBagHover(h) }} onClick={() => onOpen('laptop')} />
      {PINS.map((_, i) => (
        <group key={i} ref={(el) => { pinRefs.current[i] = el }} position={[bagPos.x + 0.16, bagPos.y + PINS[i][1] * 1.9 + 0.1, bagPos.z + PINS[i][0] * 1.9]} rotation={onLeft}>
          <Piece url={paper(`pin-${i + 1}`)} width={0.3} position={[0, 0, 0]} delay={0.8 + i * 0.08} {...piece} frost={0} grain={0.1} relief={0.8} puff={0.05} glisten={pinHover === i + 1 || openPin === i + 1 ? 2.2 : 0.5}
            onHover={h => { hover(h ? 'pin' : null); setPinHover(h ? i + 1 : null) }} onClick={() => onOpen(`pin:${i + 1}`)} />
        </group>
      ))}

      {/* stop 2, the bed: the fox asleep on it, the bedside table with the magazines, the candle and a coffee, the record player on a bench */}
      <Piece url={paper('bed')} width={6.0} position={[WALL_R - 0.4, 1.05, -0.4]} rotation={onRight} delay={0.5} {...piece} puff={0.3} solid />
      <Piece url={paper('fox-sit')} width={1.5} position={[WALL_R - 1.1, 2.15, -0.9]} rotation={onRight} delay={0.9} {...piece} puff={0.25} solid onHover={h => hover(h ? 'fox' : null)} />
      <Piece url={paper('bedside')} width={1.7} position={[WALL_R - 0.5, 1.0, 3.2]} rotation={onRight} delay={0.55} {...piece} puff={0.2} solid />
      <Piece url={paper('magazines')} width={1.0} position={[WALL_R - 0.5, BEDSIDE + 0.18, 3.2]} rotation={onRight} delay={0.9} {...piece} puff={0.12} solid
        onHover={h => { hover(h ? 'magazines' : null); fanOn(h) }} onClick={() => fanOn(true)} />
      {ESSAYS.map((e, i) => (
        <group key={e.slug} ref={(el) => { magRefs.current[i] = el }} position={[stackPos.x, stackPos.y + 0.02 * i, stackPos.z]} rotation={onRight} scale={0.35}>
          <Piece url={paper(`magazine-${e.slug}`)} width={0.62} position={[0, 0, 0]} delay={1.0} {...piece} relief={0.4} solid
            onHover={h => { hover(h ? 'magazines' : null); fanOn(h) }} onClick={() => onOpen(`magazine:${e.slug}`)} />
        </group>
      ))}
      <Piece url={paper('candle')} width={0.34} position={[WALL_R - 0.55, BEDSIDE + 0.3, 2.35]} rotation={onRight} delay={1.0} {...piece} glisten={0.6} />
      <Piece url={paper('coffee')} width={0.42} position={[WALL_R - 0.55, BEDSIDE + 0.17, 3.85]} rotation={onRight} delay={1.0} {...piece} puff={0.1} onHover={h => hover(h ? 'coffee' : null)} />
      <Piece url={paper('table')} width={2.4} position={[WALL_R - 0.9, 0.2, 4.9]} rotation={onRight} delay={0.6} {...piece} puff={0.2} solid />
      <Piece url={paper('vinyl')} width={1.5} position={[WALL_R - 0.8, 0.98, 4.9]} rotation={onRight} delay={1.0} {...piece} puff={0.25} solid onHover={h => hover(h ? 'vinyl' : null)} onClick={() => setVinylOpen(true)} />

      {/* stop 3, the window: the chest below it with the camera, the vase, the paints, and the postcards scattered */}
      <Piece url={paper('table-front')} width={6.4} position={[0, 1.085, -5.4]} delay={0.6} {...piece} puff={0.25} solid />
      <Piece url={paper('camera')} width={1.4} position={[-2.1, CHEST + 0.55, -5.0]} delay={0.9} {...piece} puff={0.2} control={camCtl} onHover={h => hover(h ? 'camera' : null)} onClick={() => onOpen('camera')} />
      <Piece url={paper('paints')} width={0.9} position={[2.5, CHEST + 0.32, -4.9]} rotation={[-0.4, 0.2, 0]} delay={1.0} {...piece} puff={0.12} onHover={h => hover(h ? 'paints' : null)} onClick={() => onOpen('paints')} />
      <group>
        <Piece url={paper('vase')} width={0.95} position={[1.4, CHEST + 0.68, -5.3]} delay={0.8} {...piece} puff={0.22} renderOrder={2} onHover={h => hover(h ? 'vase' : null)} />
        {inVase.map((v, i) => v && (
          <Piece key={`in${i}`} url={paper(`flower-${i + 1}`)} width={0.52} position={[1.4 + (i - 2.5) * 0.11, CHEST + 1.55 + (i % 3) * 0.09, -5.4 - i * 0.02]} rotation={[0, 0, (i - 2.5) * 0.12]} delay={0.9 + i * 0.1} {...piece} renderOrder={1}
            onHover={h => hover(h ? 'vase' : null)} onClick={() => setInVase(a => a.map((x, j) => j === i ? false : x))} />
        ))}
        {inVase.map((v, i) => !v && (
          <Piece key={`out${i}`} url={paper(`flower-${i + 1}`)} width={0.52} position={[2.0 + i * 0.2, CHEST + 0.06, -4.6]} rotation={[-1.4, 0, 1.2 + i * 0.1]} delay={0.9 + i * 0.1} {...piece}
            onHover={h => hover(h ? 'vase' : null)} onClick={() => setInVase(a => a.map((x, j) => j === i ? true : x))} />
        ))}
      </group>
      {CARDS.map((slug, i) => (
        <Piece key={slug} url={ART.postcardFront(slug)} width={1.05} position={[-0.9 + i * 0.42 + (i % 2) * 0.15, CHEST + 0.02 + i * 0.006, -5.1 + (i % 2) * 0.5 - (i === 4 ? 0.3 : 0)]} rotation={[-Math.PI / 2, 0, (i - 2) * 0.35 + (i % 2) * 0.4]} delay={1.0 + i * 0.05}
          {...piece} relief={0.2} frost={0} grain={0.15} control={cardCtls[i]} onHover={h => hover(h ? 'postcards' : null)} onClick={() => onOpen('postcards')} />
      ))}

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.96} luminanceSmoothing={0.1} intensity={0.4} mipmapBlur />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.2} darkness={0.4} />
      </EffectComposer>
    </>
  )
}

const HINT: Record<Thing, string> = {
  bag: 'my bag · the laptop is in it', laptop: 'the laptop · click for the technical projects', pin: 'an enamel pin · click for the design project', puffer: 'the white puffer', fox: 'the fox is asleep',
  magazines: 'the magazines · the essays', vinyl: 'the record player · click to play', camera: 'the camera · photographs', postcards: 'postcards · touch them and they spread out', vase: 'arrange the flowers',
  window: 'the window · click to shut it', paints: 'my paints · about me', coffee: 'still warm',
}

/** The record player: a curated list; it plays softly from the other stops and fully at the bed. */
function Vinyl({ station, onClose }: { station: number; onClose: () => void }) {
  const [playing, setPlaying] = useState<number | null>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const list = songs as { title: string; artist: string; src: string }[]
  useEffect(() => { const a = audio.current; if (!a) return; gsap.to(a, { volume: station === 1 ? 0.9 : 0.28, duration: 1.4 }) }, [station, playing])
  const play = (i: number) => {
    const a = audio.current; if (!a) return
    if (playing === i) { a.pause(); setPlaying(null); return }
    a.src = list[i].src; a.volume = station === 1 ? 0.9 : 0.28; a.play().then(() => setPlaying(i)).catch(() => setPlaying(null))
  }
  return (
    <div className="vinyl" role="region" aria-label="Record player">
      <div className="vinyl__head"><span className="label">the record player</span><button type="button" className="sheet__close" onClick={onClose} aria-label="Close the record player" /></div>
      <ol>{list.map((s, i) => <li key={i}><button type="button" className={playing === i ? 'is-playing' : ''} disabled={!s.src} onClick={() => play(i)}><span>{playing === i ? '▮▮ ' : '▶ '}{s.title}</span><span className="muted">{s.artist}</span></button></li>)}</ol>
      <audio ref={audio} loop onEnded={() => setPlaying(null)} />
    </div>
  )
}

export function Inside(props: Props) {
  const [hover, setHover] = useState<Thing | null>(null)
  const [station, setStation] = useState(0)
  const [vinylOpen, setVinylOpen] = useState(false)
  const busy = useRef(0)
  const go = useCallback((to: number) => { const t = Math.max(0, Math.min(STATIONS.length - 1, to)); busy.current = performance.now(); setStation(t) }, [])
  const onWheel = (e: React.WheelEvent) => { if (props.opened || performance.now() - busy.current < 1200 || Math.abs(e.deltaY) < 30) return; go(station + (e.deltaY > 0 ? 1 : -1)) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (props.opened) return; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(station + 1); else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(station - 1) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [station, go, props.opened])
  return (
    <div className={`inside ${hover ? 'inside--hover' : ''}`} onWheel={onWheel}>
      <Canvas dpr={[1, 1.5]} camera={{ fov: 34, near: 0.1, far: 300, position: STATIONS[0].pos }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}><Scene {...props} setHover={setHover} station={station} vinylOpen={vinylOpen} setVinylOpen={setVinylOpen} /></Suspense>
      </Canvas>
      <p className="inside__hint label">{hover ? (hover === 'window' && props.shut ? 'the window · click to open it' : HINT[hover]) : STATIONS[station].hint}</p>
      <nav className="inside__nav label" aria-label="Where you are in the igloo">
        {STATIONS.map((s, i) => <button key={s.name} type="button" className={i === station ? 'is-here' : ''} onClick={() => go(i)}>{s.name}</button>)}
      </nav>
      {vinylOpen && <Vinyl station={station} onClose={() => setVinylOpen(false)} />}
    </div>
  )
}
