import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { getMode, type Mode } from '../lib/mode'
import { Piece, paper, type PieceControl } from './Piece'
import { makeSnowView } from './Letters'

/**
 * Inside the igloo, in the same paper hand as outside: a walk from the entryway to the window with three stations,
 * each close on the thing there is to touch. The entry: a bench with the paints and a coffee, the fox asleep by the
 * door, letters blown in over the floor. The middle: the table with the camera, the sketchbook and a candle. The
 * window: the letter snow and the sky outside (the same field, the same time of day), postcards pinned beside it, the
 * vase on the chest below, and a shutter to close. Scroll, arrow keys or the row of names move between stations.
 */
export type Thing = 'camera' | 'notebook' | 'postcards' | 'vase' | 'window' | 'fox' | 'paints' | 'coffee'
type Props = { onOpen: (thing: 'camera' | 'notebook' | 'postcards' | 'paints') => void; opened: string | null; shut: boolean; onShutter: () => void }

const LOOKS: Record<Mode, { tint: string; bg: string; lampA: string; lampAI: number; lampBI: number; shadow: string }> = {
  day: { tint: '#ffffff', bg: '#d8dbe8', lampA: '#fff2d0', lampAI: 0.9, lampBI: 0.12, shadow: '#b3bfe6' },
  evening: { tint: '#f4dcc8', bg: '#d6bfc0', lampA: '#ffb27a', lampAI: 1.3, lampBI: 0.5, shadow: '#c0a3c4' },
  night: { tint: '#6b76ad', bg: '#1b2238', lampA: '#9fe6c8', lampAI: 0.9, lampBI: 1.2, shadow: '#2c3568' },
}

// the three stations: where the camera stands and what it looks at
const STATIONS: { pos: [number, number, number]; look: [number, number, number]; name: string; hint: string }[] = [
  { pos: [0.6, 2.7, 11.4], look: [-1.2, 1.1, 4.4], name: 'the entry', hint: 'the entry · my paints, a coffee, the fox asleep · scroll on' },
  { pos: [0, 3.3, 6.2], look: [0, 1.9, -0.8], name: 'the table', hint: 'the table · the camera holds the photographs, the sketchbook the writing' },
  { pos: [0, 4.1, 1.6], look: [0, 3.5, -6.6], name: 'the window', hint: 'the window · postcards from places, the vase to arrange, the shutter to close' },
]

const TY = 1.9     // the table's top
const WIN: [number, number, number] = [0, 5.6, -6.6]   // the window's centre in the wall

type SceneProps = Props & { setHover: (t: Thing | null) => void; station: number }
function Scene({ onOpen, opened, shut, onShutter, setHover, station }: SceneProps) {
  const { camera, scene } = useThree()
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const view = useMemo(() => makeSnowView(), [])
  useEffect(() => { view.group.position.set(0, 2.4, 0); (window as unknown as { __inside?: unknown }).__inside = { gsap }; return () => { view.group.removeFromParent() } }, [view])

  // the camera walks between stations
  const pos = useMemo(() => new THREE.Vector3(...STATIONS[0].pos), [])
  const look = useMemo(() => new THREE.Vector3(...STATIONS[0].look), [])
  const par = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const st = STATIONS[station]; const dur = reduced ? 0.2 : 1.7
    gsap.to(pos, { x: st.pos[0], y: st.pos[1], z: st.pos[2], duration: dur, ease: 'power2.inOut' })
    gsap.to(look, { x: st.look[0], y: st.look[1], z: st.look[2], duration: dur, ease: 'power2.inOut' })
  }, [station, pos, look, reduced])
  useEffect(() => {
    const onMove = (e: PointerEvent) => { par.current = { x: (e.clientX / innerWidth) * 2 - 1, y: -((e.clientY / innerHeight) * 2 - 1) } }
    window.addEventListener('pointermove', onMove); return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // the light: the day's tint on every piece, the window as one lamp, the candle as another
  const tint = useMemo(() => new THREE.Color('#ffffff'), [])
  const shadow = useMemo(() => new THREE.Color('#b3bfe6'), [])
  const lampA = useMemo(() => new THREE.Vector4(WIN[0], WIN[1], WIN[2] + 0.3, 0), [])
  const lampACol = useMemo(() => new THREE.Color('#fff2d0'), [])
  const lampB = useMemo(() => new THREE.Vector4(2.1, TY + 0.7, -0.3, 0), [])
  const lampBCol = useMemo(() => new THREE.Color('#ffc27c'), [])
  const cur = useMemo(() => ({ tint: new THREE.Color('#ffffff'), bg: new THREE.Color('#d8dbe8'), lampA: new THREE.Color('#fff2d0'), shadow: new THREE.Color('#b3bfe6'), lampAI: 0, lampBI: 0 }), [])
  const tgt = useMemo(() => ({ tint: new THREE.Color(), bg: new THREE.Color(), lampA: new THREE.Color(), shadow: new THREE.Color(), lampAI: 0, lampBI: 0 }), [])
  useEffect(() => {
    const set = () => { const L = LOOKS[getMode()]; tgt.tint.set(L.tint); tgt.bg.set(L.bg); tgt.lampA.set(L.lampA); tgt.shadow.set(L.shadow); tgt.lampAI = L.lampAI; tgt.lampBI = L.lampBI }
    set(); const on = () => set(); window.addEventListener('modechange', on); return () => window.removeEventListener('modechange', on)
  }, [tgt])

  // the shutter slides down over the window
  const shutterY = useRef(9.4)
  useEffect(() => { gsap.to(shutterY, { current: shut ? WIN[1] : 9.4, duration: reduced ? 0.2 : 0.8, ease: 'power3.out' }) }, [shut, reduced])
  const shutterRef = useRef<THREE.Group>(null)

  // objects: hover lift, open → dissolve, close → paint back
  const ctl = { camera: useRef<PieceControl | null>(null), notebook: useRef<PieceControl | null>(null), postcards: useRef<PieceControl | null>(null), paints: useRef<PieceControl | null>(null) }
  const lifts = useRef<Record<string, number>>({})
  const groups = { camera: useRef<THREE.Group>(null), notebook: useRef<THREE.Group>(null), postcards: useRef<THREE.Group>(null), vase: useRef<THREE.Group>(null), paints: useRef<THREE.Group>(null), coffee: useRef<THREE.Group>(null) }
  const hoverRef = useRef<Thing | null>(null)
  const hover = useCallback((t: Thing | null) => { hoverRef.current = t; setHover(t) }, [setHover])
  useEffect(() => {
    for (const key of Object.keys(ctl) as (keyof typeof ctl)[]) { const c = ctl[key].current; if (!c) continue; if (opened === key) c.dissolve(1); else c.dissolve(0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // the vase: which flowers are in it (kept between visits)
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
    lampB.w = cur.lampBI * (0.85 + 0.15 * Math.sin(t0.current * 9.0) * Math.sin(t0.current * 2.3)); lampBCol.set('#ffc27c')
    view.tick(dt, reduced)
    if (shutterRef.current) shutterRef.current.position.y = shutterY.current
    for (const key of Object.keys(groups) as (keyof typeof groups)[]) {
      const g = groups[key].current; if (!g) continue
      const want = hoverRef.current === key ? 1 : 0; lifts.current[key] = (lifts.current[key] || 0) + (want - (lifts.current[key] || 0)) * Math.min(1, d * 8)
      g.position.y = lifts.current[key] * 0.14
    }
    if (!reduced) { camera.position.x = pos.x + par.current.x * 0.5; camera.position.y = pos.y - par.current.y * 0.25; camera.position.z = pos.z } else camera.position.copy(pos)
    camera.lookAt(look)
  })

  const piece = { tint, shadow, lampA, lampACol, lampB, lampBCol, frost: 0.08, grain: 0.3, relief: 0.9 }
  const ceiling = useMemo(() => new THREE.Color('#c9cddb'), [])
  const skin = (n: number) => `flower-${n + 1}`
  return (
    <>
      <color attach="background" args={['#d8dbe8']} />
      {/* the world outside, seen through the window: the same letter snow under the same sky */}
      <primitive object={view.group} />
      {/* the wall with the window, the shutter behind it, the floor */}
      <group ref={shutterRef} position={[0, 9.4, WIN[2] - 0.12]}><Piece url={paper('shutter')} width={3.7} position={[0, 0, 0]} delay={0} {...piece} puff={0.25} solid /></group>
      <Piece url={paper('wall-inside')} width={20} position={[0, 1.83, WIN[2]]} delay={0.1} {...piece} puff={0.2} relief={0.6} solid />
      <Piece url={paper('wall-inside')} width={22} position={[-10, 3.4, 2]} rotation={[0, Math.PI / 2, 0]} delay={0.15} {...piece} puff={0.2} relief={0.6} solid />
      <Piece url={paper('wall-inside')} width={22} position={[10, 3.4, 2]} rotation={[0, -Math.PI / 2, 0]} delay={0.15} {...piece} puff={0.2} relief={0.6} solid />
      <mesh position={[0, 7.6, 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[22, 30]} /><meshBasicMaterial color={ceiling} /></mesh>
      <mesh position={[WIN[0], WIN[1], WIN[2] + 0.1]} onPointerOver={(e) => { e.stopPropagation(); hover('window') }} onPointerOut={() => hover(null)} onClick={(e) => { e.stopPropagation(); onShutter() }}><circleGeometry args={[1.75, 32]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <Piece url={paper('floor-inside')} width={26} position={[0, 0, 0.2]} rotation={[-Math.PI / 2, 0, 0]} delay={0.2} {...piece} relief={0} solid />
      <Piece url={paper('floor-inside')} width={26} position={[0, 0, 13.2]} rotation={[-Math.PI / 2, 0, 0]} delay={0.2} {...piece} relief={0} solid />

      {/* station 1, the entry: a bench with the paints and a coffee, the fox asleep, letters blown in */}
      <Piece url={paper('drift-1')} width={4.0} position={[-0.6, 0.03, 8.4]} rotation={[-Math.PI / 2, 0, 0.3]} delay={0.3} {...piece} relief={0.5} frost={0.35} opacity={0.85} />
      <Piece url={paper('table')} width={3.0} position={[-2.1, 0.32, 4.3]} delay={0.4} {...piece} puff={0.2} solid />
      <group ref={groups.paints}>
        <Piece url={paper('paints')} width={1.15} position={[-2.5, 0.65 + 0.4, 4.5]} delay={0.8} {...piece} puff={0.15} control={ctl.paints} onHover={h => hover(h ? 'paints' : null)} onClick={() => onOpen('paints')} />
      </group>
      <group ref={groups.coffee}>
        <Piece url={paper('coffee')} width={0.55} position={[-1.45, 0.65 + 0.22, 4.6]} delay={0.9} {...piece} puff={0.12} onHover={h => hover(h ? 'coffee' : null)} />
      </group>
      <Piece url={paper('fox-sit')} width={1.3} position={[2.6, 0.46, 2.6]} delay={1.0} {...piece} puff={0.25} solid onHover={h => hover(h ? 'fox' : null)} />

      {/* station 2, the table: the camera, the sketchbook, the candle */}
      <Piece url={paper('table-front')} width={6.4} position={[0, 1.085, -0.6]} delay={0.5} {...piece} puff={0.25} solid />
      <group ref={groups.camera}>
        <Piece url={paper('camera')} width={1.4} position={[-1.8, TY + 0.55, -0.3]} delay={0.9} {...piece} puff={0.2} control={ctl.camera} onHover={h => hover(h ? 'camera' : null)} onClick={() => onOpen('camera')} />
      </group>
      <group ref={groups.notebook}>
        <Piece url={paper('sketchbook')} width={1.9} position={[0.7, TY + 0.22, 0.1]} rotation={[-0.95, 0, 0.08]} delay={1.1} {...piece} puff={0.15} control={ctl.notebook} onHover={h => hover(h ? 'notebook' : null)} onClick={() => onOpen('notebook')} />
      </group>
      <Piece url={paper('candle')} width={0.42} position={[2.1, TY + 0.37, -0.5]} delay={1.0} {...piece} glisten={0.6} />

      {/* station 3, the window: postcards pinned beside it, the chest with the vase, the flowers in and out */}
      <Piece url={paper('table-front')} width={4.8} position={[0, 0.81, -5.7]} delay={0.6} {...piece} puff={0.2} solid />
      <group ref={groups.postcards}>
        <Piece url={paper('postcards')} width={1.6} position={[2.7, 4.4, WIN[2] + 0.2]} rotation={[0, 0, -0.08]} delay={1.2} {...piece} puff={0.12} control={ctl.postcards} onHover={h => hover(h ? 'postcards' : null)} onClick={() => onOpen('postcards')} />
      </group>
      <group ref={groups.vase}>
        <Piece url={paper('vase')} width={0.95} position={[-0.4, 1.45 + 0.68, -5.3]} delay={0.8} {...piece} puff={0.22} renderOrder={2} onHover={h => hover(h ? 'vase' : null)} />
        {inVase.map((v, i) => v && (
          <Piece key={`in${i}`} url={paper(skin(i))} width={0.52} position={[-0.4 + (i - 2.5) * 0.11, 1.45 + 1.55 + (i % 3) * 0.09, -5.4 - i * 0.02]} rotation={[0, 0, (i - 2.5) * 0.12]} delay={0.9 + i * 0.1} {...piece} renderOrder={1}
            onHover={h => hover(h ? 'vase' : null)} onClick={() => setInVase(a => a.map((x, j) => j === i ? false : x))} />
        ))}
        {inVase.map((v, i) => !v && (
          <Piece key={`out${i}`} url={paper(skin(i))} width={0.52} position={[0.9 + i * 0.22, 1.45 + 0.08, -4.9]} rotation={[-1.4, 0, 1.2 + i * 0.1]} delay={0.9 + i * 0.1} {...piece}
            onHover={h => hover(h ? 'vase' : null)} onClick={() => setInVase(a => a.map((x, j) => j === i ? true : x))} />
        ))}
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.96} luminanceSmoothing={0.1} intensity={0.4} mipmapBlur />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.2} darkness={0.4} />
      </EffectComposer>
    </>
  )
}

const HINT: Record<Thing, string> = { camera: 'the camera · photographs', notebook: 'the sketchbook · writing', postcards: 'postcards from places', vase: 'arrange the flowers', window: 'the window · click to shut it', fox: 'the fox is asleep', paints: 'my paints · about me', coffee: 'still warm' }

export function Inside(props: Props) {
  const [hover, setHover] = useState<Thing | null>(null)
  const [station, setStation] = useState(0)
  const busy = useRef(0)
  const go = useCallback((to: number) => { const t = Math.max(0, Math.min(STATIONS.length - 1, to)); busy.current = performance.now(); setStation(t) }, [])
  const onWheel = (e: React.WheelEvent) => { if (performance.now() - busy.current < 1100 || Math.abs(e.deltaY) < 30) return; go(station + (e.deltaY > 0 ? 1 : -1)) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(station + 1); else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(station - 1) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [station, go])
  return (
    <div className={`inside ${hover ? 'inside--hover' : ''}`} onWheel={onWheel}>
      <Canvas dpr={[1, 1.5]} camera={{ fov: 34, near: 0.1, far: 300, position: STATIONS[0].pos }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}><Scene {...props} setHover={setHover} station={station} /></Suspense>
      </Canvas>
      <p className="inside__hint label">{hover ? (hover === 'window' && props.shut ? 'the window · click to open it' : HINT[hover]) : STATIONS[station].hint}</p>
      <nav className="inside__nav label" aria-label="Where you are in the igloo">
        {STATIONS.map((s, i) => <button key={s.name} type="button" className={i === station ? 'is-here' : ''} onClick={() => go(i)}>{s.name}</button>)}
      </nav>
    </div>
  )
}
