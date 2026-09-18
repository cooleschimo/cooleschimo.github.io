import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { getMode, type Mode } from '../lib/mode'
import { ART } from '../room/art'
import { Piece, paper, type PieceControl } from './Piece'

/**
 * Inside the igloo, as a paper diorama: one focal point, a low table close up with a few paper objects
 * large enough to touch. The window is behind it; the light of the day comes through it as a beam onto
 * the table and a pool on the floor, and shutting the window turns it off. Objects lift on hover and
 * dissolve when opened; they paint back when the sheet closes.
 */
export type Thing = 'camera' | 'notebook' | 'postcards' | 'vase' | 'window' | 'fox'
type Props = { onOpen: (thing: Exclude<Thing, 'window' | 'fox' | 'vase'>) => void; opened: string | null; shut: boolean; onShutter: () => void }

const LOOKS: Record<Mode, { tint: string; bg: string; beam: string; beamI: number; pool: number; lamp: number; wash: string; washI: number }> = {
  day: { tint: '#ffffff', bg: '#e9eef6', beam: '#fff2d6', beamI: 0.07, pool: 0.06, lamp: 0, wash: '#c8dcff', washI: 0.03 },
  evening: { tint: '#f1d2c0', bg: '#e6d3cf', beam: '#ffb078', beamI: 0.12, pool: 0.1, lamp: 0.1, wash: '#c9a8d0', washI: 0.05 },
  night: { tint: '#7d86b8', bg: '#2a3350', beam: '#8fe0c0', beamI: 0.1, pool: 0.07, lamp: 0.24, wash: '#4c5a90', washI: 0.08 },
}

function Sky() {
  const [mode, setMode] = useState<Mode>(getMode())
  useEffect(() => { const on = () => setMode(getMode()); window.addEventListener('modechange', on); return () => window.removeEventListener('modechange', on) }, [])
  // all three skies load up front so a mode change never suspends the scene
  const [day, evening, night] = useTexture([ART.skyDay, ART.skyEvening, ART.skyNight])
  for (const t of [day, evening, night]) t.colorSpace = THREE.SRGBColorSpace
  const tex = mode === 'night' ? night : mode === 'evening' ? evening : day
  return <mesh position={[0, 6.0, -8.2]}><circleGeometry args={[2.7, 40]} /><meshBasicMaterial map={tex} /></mesh>
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c)
}

type SceneProps = Props & { setHover: (t: Thing | null) => void }
function Scene({ onOpen, opened, shut, onShutter, setHover }: SceneProps) {
  const { camera, scene } = useThree()
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const home = useMemo(() => new THREE.Vector3(0, 4.6, 12.5), [])
  const look = useMemo(() => new THREE.Vector3(0, 3.0, 0), [])
  const TY = 2.35 // the table top
  const par = useRef({ x: 0, y: 0 })
  useEffect(() => { camera.position.copy(home); camera.lookAt(look) }, [camera, home, look])
  useEffect(() => {
    const onMove = (e: PointerEvent) => { par.current = { x: (e.clientX / innerWidth) * 2 - 1, y: -((e.clientY / innerHeight) * 2 - 1) } }
    window.addEventListener('pointermove', onMove); return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // the light of the day
  const glow = useMemo(() => glowTexture(), [])
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff8e8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: glow }), [glow])
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff8e8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: glow }), [glow])
  const lampMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffc27a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: glow }), [glow])
  const washMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d8e6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: glow }), [glow])
  const tint = useMemo(() => new THREE.Color('#ffffff'), [])
  const cur = useMemo(() => ({ tint: new THREE.Color('#ffffff'), bg: new THREE.Color('#e9eef6'), beam: new THREE.Color('#fff8e8'), wash: new THREE.Color('#d8e6ff'), beamI: 0, pool: 0, lamp: 0, washI: 0 }), [])
  const tgt = useMemo(() => ({ ...cur, tint: new THREE.Color(), bg: new THREE.Color(), beam: new THREE.Color(), wash: new THREE.Color() }), [cur])
  useEffect(() => {
    const set = () => { const L = LOOKS[getMode()]; tgt.tint.set(L.tint); tgt.bg.set(L.bg); tgt.beam.set(L.beam); tgt.wash.set(L.wash); tgt.beamI = L.beamI; tgt.pool = L.pool; tgt.lamp = L.lamp; tgt.washI = L.washI }
    set(); const on = () => set(); window.addEventListener('modechange', on); return () => window.removeEventListener('modechange', on)
  }, [tgt])

  // the shutter slides down over the window
  const shutterY = useRef(11.6)
  useEffect(() => { gsap.to(shutterY, { current: shut ? 6.0 : 11.6, duration: reduced ? 0.2 : 0.7, ease: 'power3.out' }) }, [shut, reduced])
  const shutterRef = useRef<THREE.Group>(null)

  // objects: hover lift, open → dissolve, close → paint back
  const ctl = { camera: useRef<PieceControl | null>(null), notebook: useRef<PieceControl | null>(null), postcards: useRef<PieceControl | null>(null) }
  const lifts = useRef<Record<string, number>>({ camera: 0, notebook: 0, postcards: 0, vase: 0 })
  const groups = { camera: useRef<THREE.Group>(null), notebook: useRef<THREE.Group>(null), postcards: useRef<THREE.Group>(null), vase: useRef<THREE.Group>(null) }
  const hoverRef = useRef<Thing | null>(null)
  const hover = (t: Thing | null) => { hoverRef.current = t; setHover(t) }
  const prevOpened = useRef<string | null>(null)
  useEffect(() => {
    const was = prevOpened.current; prevOpened.current = opened
    const keys: (keyof typeof ctl)[] = ['camera', 'notebook', 'postcards']
    for (const k of keys) {
      const c = ctl[k].current; if (!c) continue
      if (opened === k) c.dissolve(1, 1.1)
      else if (was === k) { c.dissolve(0, 0.01); c.reveal(0, 0.01); setTimeout(() => c.reveal(1, 1.6), 120) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // flowers in the vase: click a stem to take it out or put it back
  const [inVase, setInVase] = useState<boolean[]>(() => { try { const s = localStorage.getItem('vase'); return s ? JSON.parse(s) : [true, false, true, false, false, true] } catch { return [true, false, true, false, false, true] } })
  useEffect(() => { try { localStorage.setItem('vase', JSON.stringify(inVase)) } catch { /* ignore */ } }, [inVase])

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); const k = Math.min(1, d * 2.2)
    cur.tint.lerp(tgt.tint, k); cur.bg.lerp(tgt.bg, k); cur.beam.lerp(tgt.beam, k); cur.wash.lerp(tgt.wash, k)
    cur.beamI += (tgt.beamI - cur.beamI) * k; cur.pool += (tgt.pool - cur.pool) * k; cur.lamp += (tgt.lamp - cur.lamp) * k; cur.washI += (tgt.washI - cur.washI) * k
    const open = shut ? 0 : 1
    tint.copy(cur.tint); if (shut) tint.multiplyScalar(0.86)
    ;(scene.background as THREE.Color).copy(cur.bg)
    beamMat.color.copy(cur.beam); beamMat.opacity = cur.beamI * open; poolMat.color.copy(cur.beam); poolMat.opacity = cur.pool * open
    washMat.color.copy(cur.wash); washMat.opacity = cur.washI * open; lampMat.opacity = cur.lamp * (0.85 + 0.15 * Math.sin(performance.now() / 140))
    if (shutterRef.current) shutterRef.current.position.y = shutterY.current
    for (const key of Object.keys(groups) as (keyof typeof groups)[]) {
      const g = groups[key].current; if (!g) continue
      const want = hoverRef.current === key ? 1 : 0; lifts.current[key] += (want - lifts.current[key]) * Math.min(1, d * 8)
      g.position.y = lifts.current[key] * 0.18
    }
    if (!reduced) { camera.position.x += (home.x + par.current.x * 0.9 - camera.position.x) * 0.05; camera.position.y += (home.y - par.current.y * 0.4 - camera.position.y) * 0.05 }
    camera.lookAt(look)
  })

  return (
    <>
      <color attach="background" args={['#e9eef6']} />
      <Sky />
      {/* the wall, with the window hole, and the shutter behind it */}
      <group ref={shutterRef} position={[0, 11.6, -7.6]}><Piece url={paper('shutter')} width={5.2} position={[0, 0, 0]} delay={0} tint={tint} /></group>
      <Piece url={paper('wall-inside')} width={26} position={[0, 2.32, -7]} delay={0.1} tint={tint} />
      <mesh position={[0, 6.0, -6.8]} onPointerOver={(e) => { e.stopPropagation(); hover('window') }} onPointerOut={() => hover(null)} onClick={(e) => { e.stopPropagation(); onShutter() }}><circleGeometry args={[2.6, 32]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <Piece url={paper('floor-inside')} width={26} position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]} delay={0.2} tint={tint} />
      {/* the light: a beam from the window to the table, pools on the table and floor, a wash on the wall, the candle's lamp */}
      <mesh position={[0, 4.6, -3.2]} rotation={[-0.55, 0, 0]} material={beamMat}><planeGeometry args={[6.5, 10]} /></mesh>
      <mesh position={[0, TY + 0.1, 0.6]} rotation={[-1.2, 0, 0]} material={poolMat}><planeGeometry args={[8, 3]} /></mesh>
      <mesh position={[0, 0.03, 3]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat}><planeGeometry args={[10, 6]} /></mesh>
      <mesh position={[0, 5.4, -6.9]} material={washMat}><planeGeometry args={[16, 12]} /></mesh>
      <mesh position={[2.4, TY + 1.3, 0.5]} material={lampMat}><planeGeometry args={[4.5, 3.6]} /></mesh>
      {/* the table: the one focal point, seen from the front */}
      <Piece url={paper('table-front')} width={9.4} position={[0, 0.9, 0.4]} delay={0.4} tint={tint} renderOrder={1} />
      <group ref={groups.camera}>
        <Piece url={paper('camera')} width={2.2} position={[-2.5, TY + 0.85, 1.0]} delay={0.9} tint={tint} control={ctl.camera} onHover={h => hover(h ? 'camera' : null)} onClick={() => onOpen('camera')} />
      </group>
      <group ref={groups.notebook}>
        <Piece url={paper('sketchbook')} width={2.9} position={[1.2, TY + 0.32, 1.5]} rotation={[-1.05, 0, 0.1]} delay={1.1} tint={tint} control={ctl.notebook} onHover={h => hover(h ? 'notebook' : null)} onClick={() => onOpen('notebook')} />
      </group>
      <group ref={groups.postcards}>
        <Piece url={paper('postcards')} width={2.4} position={[3.1, TY + 0.7, 0.8]} rotation={[-0.3, -0.12, 0]} delay={1.3} tint={tint} control={ctl.postcards} onHover={h => hover(h ? 'postcards' : null)} onClick={() => onOpen('postcards')} />
      </group>
      <group ref={groups.vase}>
        <Piece url={paper('vase')} width={1.4} position={[-0.3, TY + 1.0, 0.5]} delay={0.7} tint={tint} renderOrder={2} onHover={h => hover(h ? 'vase' : null)} />
        {inVase.map((v, i) => v && (
          <Piece key={`in${i}`} url={paper(`flower-${i + 1}`)} width={0.75} position={[-0.3 + (i - 2.5) * 0.16, TY + 2.25 + (i % 3) * 0.12, 0.4 - i * 0.02]} rotation={[0, 0, (i - 2.5) * 0.12]} delay={0.8 + i * 0.1} tint={tint} renderOrder={1}
            onHover={h => hover(h ? 'vase' : null)} onClick={() => setInVase(a => a.map((x, j) => j === i ? false : x))} />
        ))}
        {inVase.map((v, i) => !v && (
          <Piece key={`out${i}`} url={paper(`flower-${i + 1}`)} width={0.75} position={[1.6 + i * 0.3, TY + 0.14, 2.0]} rotation={[-1.4, 0, 1.3 + i * 0.1]} delay={0.8 + i * 0.1} tint={tint}
            onHover={h => hover(h ? 'vase' : null)} onClick={() => setInVase(a => a.map((x, j) => j === i ? true : x))} />
        ))}
      </group>
      <Piece url={paper('candle')} width={0.6} position={[2.4, TY + 0.62, 0.3]} delay={1.0} tint={tint} />
      {/* the fox, asleep by the wall */}
      <Piece url={paper('fox-sit')} width={2.3} position={[-5.8, 1.2, -3.2]} delay={1.5} tint={tint} onHover={h => hover(h ? 'fox' : null)} />
      <Sparkles count={60} scale={[14, 6, 8]} position={[0, 3, -2]} size={1.4} speed={0.15} opacity={0.35} color="#ffffff" />
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.98} luminanceSmoothing={0.1} intensity={0.25} mipmapBlur />
        <Noise opacity={0.045} />
        <Vignette eskil={false} offset={0.25} darkness={0.4} />
      </EffectComposer>
    </>
  )
}

const HINT: Record<Thing, string> = { camera: 'photographs', notebook: 'writing', postcards: 'postcards from places', vase: 'arrange the flowers', window: 'the window · click to shut it', fox: 'the fox is asleep' }

export function Inside(props: Props) {
  const [hover, setHover] = useState<Thing | null>(null)
  return (
    <div className={`inside ${hover ? 'inside--hover' : ''}`}>
      <Canvas dpr={[1, 1.5]} camera={{ fov: 34, near: 0.1, far: 100, position: [0, 4.6, 12.5] }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}><Scene {...props} setHover={setHover} /></Suspense>
      </Canvas>
      <p className="inside__hint label">{hover ? (hover === 'window' && props.shut ? 'the window · click to open it' : HINT[hover]) : ''}</p>
    </div>
  )
}
