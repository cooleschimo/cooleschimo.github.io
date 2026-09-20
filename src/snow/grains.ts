import * as THREE from 'three'
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

/**
 * The letters as grains, simulated on the GPU: every letter has a position, a velocity and an orientation in three
 * float textures, and a small shader steps them all each frame. At rest a letter lies on the ground; kicked, it flies
 * and tumbles and lands; lying on a slope too steep for the heap, it hops downhill. The ground the letters lie on is
 * the painted terrain plus a pile height read from where the letters actually are (a density image rendered from
 * their positions each frame, against the density at the start): take letters away and the ground there drops, throw
 * them somewhere and it rises. Prints (the trail map) press the ground down as before.
 *
 * Nothing here knows about the scene: the terrain, the snow shading and the trail are handed in.
 */

export const KICKS = 8
export type Kick = { x: number; z: number; r: number; strength: number; frac: number; px?: number; pz?: number; radial?: number }

export type GrainOpts = {
  renderer: THREE.WebGLRenderer; atlas: THREE.Texture
  count: number; fallers: number
  H: (x: number, z: number) => number
  snowGlsl: string; snowUniforms: () => Record<string, THREE.IUniform>; letterFragment: string
  trailTex: THREE.Texture; trailBox: THREE.Vector4; trailDepth: number
  xHalf: number; zMin: number; zMax: number
}

// the box the height and density images cover (world x and z)
export const BX0 = -40, BX1 = 40, BZ0 = -36, BZ1 = 24
const HW = 640, HH = 480      // the baked terrain height
const DW = 160, DH = 120      // the letters' density: half-unit cells
export const PILE_K = 0.02    // ground height per letter per density cell

const SIM_GLSL = `
  uniform sampler2D uHeight, uDensity, uDensity0, uTrail; uniform vec4 uHBox, uTrailBox; uniform float uPileK, uTrailDepth;
  uniform float uDt, uTime, uFrame, uRepose, uSlide, uCool;
  uniform vec4 uKickA[${KICKS}], uKickB[${KICKS}]; uniform int uKicks;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec2 p, float k){ return hash(p + vec2(k * 0.731, k * 0.317)); }
  vec2 boxUv(vec2 xz){ return (xz - uHBox.xy) * uHBox.zw; }
  float hgt(vec2 xz){ return texture2D(uHeight, boxUv(xz)).r; }
  float pile(vec2 xz){ vec2 uv = boxUv(xz); vec2 e = vec2(0.5 / ${DW}.0, 0.5 / ${DH}.0);
    float d = texture2D(uDensity, uv + e).r + texture2D(uDensity, uv - e).r + texture2D(uDensity, uv + vec2(e.x, -e.y)).r + texture2D(uDensity, uv - vec2(e.x, -e.y)).r;
    float d0 = texture2D(uDensity0, uv + e).r + texture2D(uDensity0, uv - e).r + texture2D(uDensity0, uv + vec2(e.x, -e.y)).r + texture2D(uDensity0, uv - vec2(e.x, -e.y)).r;
    return (d - d0) * 0.25 * uPileK; }
  float trailAt(vec2 xz){ vec2 uv = (xz - uTrailBox.xy) * uTrailBox.zw; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0; return texture2D(uTrail, uv).r * 3.0 - 1.0; }
  float ground(vec2 xz){ return hgt(xz) + pile(xz) - trailAt(xz) * uTrailDepth; }
  // the heap's own slope (the pile, not the terrain): what the letters slide on
  vec2 pileGrad(vec2 xz){ float e = 0.5; return vec2(pile(xz + vec2(e, 0.0)) - pile(xz - vec2(e, 0.0)), pile(xz + vec2(0.0, e)) - pile(xz - vec2(0.0, e))) / (2.0 * e); }
  vec3 groundNormal(vec2 xz){ float e = 0.25; return normalize(vec3(ground(xz - vec2(e, 0.0)) - ground(xz + vec2(e, 0.0)), 2.0 * e, ground(xz - vec2(0.0, e)) - ground(xz + vec2(0.0, e)))); }
  vec4 qmul(vec4 a, vec4 b){ return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz)); }
  vec4 qaxis(vec3 axis, float ang){ return vec4(axis * sin(ang * 0.5), cos(ang * 0.5)); }
  vec4 qfromTo(vec3 a, vec3 b){ vec3 c = cross(a, b); float d = 1.0 + dot(a, b); if (d < 1e-4) return vec4(1.0, 0.0, 0.0, 0.0); return normalize(vec4(c, d)); }
  // where a letter lies: its face along the ground's normal, its own yaw, a little of its own tilt
  vec4 restRot(vec2 xz, vec2 id){ vec3 n = groundNormal(xz); vec4 q = qfromTo(vec3(0.0, 0.0, 1.0), n);
    q = qmul(qaxis(n, hash3(id, 1.0) * 6.2832), q);
    q = qmul(q, qaxis(vec3(1.0, 0.0, 0.0), (hash3(id, 2.0) - 0.5) * 0.7)); q = qmul(q, qaxis(vec3(0.0, 1.0, 0.0), (hash3(id, 3.0) - 0.5) * 0.7));
    return normalize(q); }
  vec3 skySpawn(vec2 id, float k){ return vec3((hash3(id, k) - 0.5) * 60.0, 7.0 + hash3(id, k + 1.0) * 14.0, -30.0 + hash3(id, k + 2.0) * 48.0); }

  // one step for one letter: reads pos (xyz, w = state: 0 rest, 1 flying, 2 falling from the sky), vel (xyz, w = when it
  // last landed) and rot (a quaternion); writes the three back
  void stepGrain(vec2 uv, inout vec4 pos, inout vec4 vel, inout vec4 rot){
    float state = pos.w; float dt = uDt; vec2 id = uv;
    float seed = hash(id);
    if (state > 1.5) {
      // snow from the sky: drifts down, tumbling, and starts again up high when it lands, unless it lands in a hole, where it stays
      vel.x = sin(pos.y * 1.3 + seed * 40.0) * 0.35; vel.z = cos(pos.y * 0.9 + seed * 12.0) * 0.35;
      pos.xyz += vel.xyz * dt;
      rot = normalize(qmul(rot, qaxis(normalize(vec3(hash3(id, 4.0) - 0.5, hash3(id, 5.0) - 0.5, hash3(id, 6.0) - 0.5)), 2.0 * dt)));
      float g = ground(pos.xz);
      if (pos.y <= g + 0.02) {
        if (pile(pos.xz) < -0.06 && abs(pos.x) < 34.0 && pos.z > -31.0 && pos.z < 21.0) { pos.w = 0.0; vel = vec4(0.0, 0.0, 0.0, uTime); pos.y = g + 0.02; }
        else { pos.xyz = skySpawn(id, uFrame); vel.y = -0.45 - hash3(id, uFrame + 3.0) * 0.7; }
      }
      return;
    }
    if (state > 0.5) {
      // flying: gravity, tumbling; lands on the ground
      vel.y -= 11.0 * dt; pos.xyz += vel.xyz * dt;
      vec3 ax = normalize(vec3(hash3(id, 7.0) - 0.5, hash3(id, 8.0) - 0.5, hash3(id, 9.0) - 0.5) + 1e-3);
      rot = normalize(qmul(rot, qaxis(ax, (6.0 + 8.0 * hash3(id, 10.0)) * dt)));
      float g = ground(pos.xz);
      if (pos.y <= g + 0.02 && vel.y <= 0.0) { pos.w = 0.0; pos.y = g + 0.02; vel = vec4(0.0, 0.0, 0.0, uTime); }
      return;
    }
    // at rest: lie on the ground (it moves under the letter as prints press it and the heap changes), settle the face
    vec2 xz = pos.xz; float g = ground(xz);
    float lie = mix(-0.12, 0.06, hash3(id, 11.0));
    pos.y += (g + lie - pos.y) * min(1.0, dt * 8.0);
    vec4 target = restRot(xz, id); if (dot(target, rot) < 0.0) target = -target;
    rot = normalize(mix(rot, target, min(1.0, dt * 6.0)));
    if (uTime - vel.w < uCool) return;
    // kicked: something moved through here
    for (int i = 0; i < ${KICKS}; i++) { if (i >= uKicks) break;
      vec4 A = uKickA[i], B = uKickB[i]; vec2 d = xz - A.xy; float dist = length(d); if (dist > A.z) continue;
      float rnd = hash3(id, uFrame + float(i) * 7.0); if (rnd > B.w * (1.0 - 0.5 * dist / A.z)) continue;
      float s = A.w * (1.0 - dist / A.z) * (0.6 + 0.8 * hash3(id, uFrame + 1.0)); vec2 dir = d / max(dist, 1e-3);
      vec2 jit = vec2(hash3(id, uFrame + 2.0), hash3(id, uFrame + 3.0)) - 0.5;
      vel.xz = dir * s * 0.9 * B.z + jit * 0.6 + B.xy * (0.6 + 0.8 * hash3(id, uFrame + 4.0));
      vel.y = s * (0.9 + 0.7 * hash3(id, uFrame + 5.0)); pos.w = 1.0; return; }
    // on a slope the heap cannot hold, it hops downhill
    vec2 gr = pileGrad(xz); float slope = length(gr);
    if (slope > uRepose && hash3(id, uFrame + 20.0) < uSlide * dt * (slope - uRepose)) {
      vec2 dir = -gr / slope; float v = 0.6 + slope; vel.xz = dir * v + (vec2(hash3(id, uFrame + 21.0), hash3(id, uFrame + 22.0)) - 0.5) * 0.4; vel.y = 0.8 + 0.3 * hash3(id, uFrame + 23.0); pos.w = 1.0; }
  }
`
const simShader = (out: 'pos' | 'vel' | 'rot') => `
  ${SIM_GLSL}
  void main(){ vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 pos = texture2D(tPos, uv), vel = texture2D(tVel, uv), rot = texture2D(tRot, uv);
    stepGrain(uv, pos, vel, rot);
    gl_FragColor = ${out === 'pos' ? 'pos' : out === 'vel' ? 'vel' : 'rot'}; }`

export type Grains = {
  mesh: THREE.Mesh; material: THREE.ShaderMaterial; count: number
  /** the pile height inputs, for anything else that wants to sit on the letters */
  density: THREE.Texture; density0: THREE.Texture; hBox: THREE.Vector4
  kick: (k: Kick) => void
  step: (dt: number, time: number) => void
  /** for probes: the pile height (world units) at a point, read back from the GPU; slow */
  readPile: (x: number, z: number) => number
  /** for probes: how many letters are flying, at rest, and falling from the sky, read back from the GPU; slow */
  readStates: () => { rest: number; flying: number; sky: number }
  /** for probes: the raw density counts [now, at the start] at a point, and how many letters lie within r of it */
  readCell: (x: number, z: number, r: number) => { d: number; d0: number; near: number }
  dispose: () => void
}

export function createGrains(o: GrainOpts): Grains {
  const total = o.count + o.fallers; const S = Math.ceil(Math.sqrt(total)); const cap = S * S
  const gl = o.renderer

  // the terrain, baked
  const hData = new Float32Array(HW * HH * 4)
  for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) { const x = BX0 + ((i + 0.5) / HW) * (BX1 - BX0), z = BZ0 + ((j + 0.5) / HH) * (BZ1 - BZ0); hData[(j * HW + i) * 4] = o.H(x, z) }
  const height = new THREE.DataTexture(hData, HW, HH, THREE.RGBAFormat, THREE.FloatType); height.minFilter = height.magFilter = THREE.LinearFilter; height.needsUpdate = true
  const hBox = new THREE.Vector4(BX0, BZ0, 1 / (BX1 - BX0), 1 / (BZ1 - BZ0))

  // the letters: where they start, how they lie, what they look like
  const gpu = new GPUComputationRenderer(S, S, gl)
  const pos0 = gpu.createTexture(), vel0 = gpu.createTexture(), rot0 = gpu.createTexture()
  const P = pos0.image.data as Float32Array, V = vel0.image.data as Float32Array, Q = rot0.image.data as Float32Array
  const glyph = new Float32Array(cap), color = new Float32Array(cap * 3), seed = new Float32Array(cap), scale = new Float32Array(cap), ref = new Float32Array(cap * 2)
  const PALETTE = [[1, 1, 1], [1, 1, 1], [0.97, 0.97, 1], [0.93, 0.95, 1.0], [0.88, 0.91, 1.0], [0.96, 0.92, 0.98]]
  const _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _up = new THREE.Vector3(0, 0, 1), _e = new THREE.Euler()
  const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
  for (let i = 0; i < cap; i++) {
    const u = ((i % S) + 0.5) / S, v = (Math.floor(i / S) + 0.5) / S; ref[i * 2] = u; ref[i * 2 + 1] = v
    glyph[i] = Math.floor(Math.random() * 64); seed[i] = Math.random(); scale[i] = 0.14 + Math.random() * Math.random() * 0.32
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)]; color[i * 3] = c[0]; color[i * 3 + 1] = c[1]; color[i * 3 + 2] = c[2]
    if (Math.random() < 0.7) { color[i * 3] = color[i * 3 + 1] = color[i * 3 + 2] = 1.08 }   // most of them white: the shader lifts these to the snow's white and lets them sparkle
    const b = i * 4
    if (i < o.count) {
      const x = (Math.random() - 0.5) * 2 * o.xHalf, z = o.zMin + (o.zMax - o.zMin) * Math.pow(Math.random(), 0.7)
      const lie = -0.12 + 0.18 * hash(u + 11 * 0.731, v + 11 * 0.317)
      P[b] = x; P[b + 1] = o.H(x, z) + lie; P[b + 2] = z; P[b + 3] = 0
      // the same rest orientation the shader will settle to, so nothing swings at the start
      const e = 0.15; _n.set(o.H(x - e, z) - o.H(x + e, z), 2 * e, o.H(x, z - e) - o.H(x, z + e)).normalize()
      _q.setFromUnitVectors(_up, _n); _q2.setFromAxisAngle(_n, hash(u + 0.731, v + 0.317) * Math.PI * 2); _q.premultiply(_q2)
      _e.set((hash(u + 2 * 0.731, v + 2 * 0.317) - 0.5) * 0.7, (hash(u + 3 * 0.731, v + 3 * 0.317) - 0.5) * 0.7, 0); _q2.setFromEuler(_e); _q.multiply(_q2)
      Q[b] = _q.x; Q[b + 1] = _q.y; Q[b + 2] = _q.z; Q[b + 3] = _q.w
      V[b + 3] = -9
    } else if (i < total) {
      P[b] = (Math.random() - 0.5) * 60; P[b + 1] = Math.random() * 20; P[b + 2] = -30 + Math.random() * 48; P[b + 3] = 2
      V[b + 1] = -0.45 - Math.random() * 0.7; V[b + 3] = -9; scale[i] *= 0.7
      Q[b] = 0; Q[b + 1] = 0; Q[b + 2] = 0; Q[b + 3] = 1
    } else {
      // spare texels past the count: parked far below, never drawn
      P[b] = 999; P[b + 1] = -999; P[b + 2] = 999; P[b + 3] = 0; Q[b + 3] = 1; scale[i] = 0
    }
  }
  const posVar = gpu.addVariable('tPos', simShader('pos'), pos0), velVar = gpu.addVariable('tVel', simShader('vel'), vel0), rotVar = gpu.addVariable('tRot', simShader('rot'), rot0)
  for (const v of [posVar, velVar, rotVar]) gpu.setVariableDependencies(v, [posVar, velVar, rotVar])

  // the density of letters at rest, rendered from their positions; and the same at the start
  const rtOpts: THREE.RenderTargetOptions = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false }
  const density = new THREE.WebGLRenderTarget(DW, DH, rtOpts), density0 = new THREE.WebGLRenderTarget(DW, DH, rtOpts)
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3)); dGeo.setAttribute('aRef', new THREE.BufferAttribute(ref, 2))
  const dMat = new THREE.ShaderMaterial({
    uniforms: { tPos: { value: null as THREE.Texture | null }, uHBox: { value: hBox } },
    vertexShader: `attribute vec2 aRef; uniform sampler2D tPos; uniform vec4 uHBox;
      void main(){ vec4 p = texture2D(tPos, aRef); if (p.w > 0.5) { gl_Position = vec4(3.0, 3.0, 3.0, 1.0); gl_PointSize = 1.0; return; }
        vec2 uv = (p.xz - uHBox.xy) * uHBox.zw; gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0; }`,
    fragmentShader: `void main(){ gl_FragColor = vec4(1.0); }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, depthTest: false, depthWrite: false, transparent: true,
  })
  const dPoints = new THREE.Points(dGeo, dMat); dPoints.frustumCulled = false
  const dScene = new THREE.Scene(); dScene.add(dPoints); const dCam = new THREE.Camera()
  const _clear = new THREE.Color()
  const renderDensity = (target: THREE.WebGLRenderTarget, posTex: THREE.Texture) => {
    dMat.uniforms.tPos.value = posTex
    const prevRT = gl.getRenderTarget(); gl.getClearColor(_clear); const prevAlpha = gl.getClearAlpha(); const prevAuto = gl.autoClear
    gl.setRenderTarget(target); gl.setClearColor(0x000000, 0); gl.clear(true, false, false); gl.autoClear = false
    gl.render(dScene, dCam)
    gl.autoClear = prevAuto; gl.setClearColor(_clear, prevAlpha); gl.setRenderTarget(prevRT)
  }

  const simU = {
    uHeight: { value: height }, uDensity: { value: density.texture }, uDensity0: { value: density0.texture }, uTrail: { value: o.trailTex }, uHBox: { value: hBox }, uTrailBox: { value: o.trailBox },
    uPileK: { value: PILE_K }, uTrailDepth: { value: o.trailDepth }, uDt: { value: 0 }, uTime: { value: 0 }, uFrame: { value: 0 }, uRepose: { value: 0.5 }, uSlide: { value: 3.0 }, uCool: { value: 0.3 },
    uKickA: { value: Array.from({ length: KICKS }, () => new THREE.Vector4()) }, uKickB: { value: Array.from({ length: KICKS }, () => new THREE.Vector4()) }, uKicks: { value: 0 },
  }
  for (const v of [posVar, velVar, rotVar]) Object.assign((v as Variable).material.uniforms, simU)
  const err = gpu.init(); if (err) console.error(err)
  renderDensity(density0, gpu.getCurrentRenderTarget(posVar).texture)

  // the letters drawn: an instanced quad per grain, placed from the textures
  const geo = new THREE.InstancedBufferGeometry(); const quad = new THREE.PlaneGeometry(1, 1)
  geo.index = quad.index; geo.setAttribute('position', quad.attributes.position); geo.setAttribute('uv', quad.attributes.uv)
  geo.setAttribute('aRef', new THREE.InstancedBufferAttribute(ref, 2)); geo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyph, 1))
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1)); geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scale, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: { ...o.snowUniforms(), uAtlas: { value: o.atlas }, tPos: { value: null as THREE.Texture | null }, tRot: { value: null as THREE.Texture | null } },
    vertexShader: `
      attribute vec2 aRef; attribute float aGlyph, aSeed, aScale; attribute vec3 aColor; uniform sampler2D tPos, tRot, uTrail; uniform vec3 uCursor; uniform float uCursorOn, uTime, uTrailDepth; uniform vec4 uTrailBox;
      varying vec2 vUv; varying vec3 vColor; varying vec3 vN; varying vec3 vW; varying float vFog; varying float vSeed; varying float vRing; varying float vTrail;
      float trailAt(vec2 xz){ vec2 uv = (xz - uTrailBox.xy) * uTrailBox.zw; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0; return texture2D(uTrail, uv).r * 3.0 - 1.0; }
      vec3 qrot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
      void main(){
        float col = mod(aGlyph, 8.0), row = floor(aGlyph / 8.0); vUv = (uv + vec2(col, row)) / 8.0; vSeed = aSeed;
        vec4 p = texture2D(tPos, aRef); vec4 q = texture2D(tRot, aRef);
        vColor = p.w > 1.5 ? vec3(1.2) : aColor;   // the snow falling from the sky is the brightest white
        vec3 local = qrot(q, position * aScale); vec4 w = modelMatrix * vec4(p.xyz + local, 1.0);
        // under the cursor the letters stir: they lift a little and shimmer
        float cd = distance(w.xz, uCursor.xz); vRing = smoothstep(4.2, 0.4, cd) * uCursorOn;
        w.y += vRing * (0.05 * (0.5 + 0.5 * sin(cd * 2.6 - uTime * 3.2 + aSeed * 3.0)) + 0.04 * (0.5 + 0.5 * sin(uTime * 5.0 + aSeed * 40.0)));
        vTrail = trailAt(w.xz); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * qrot(q, vec3(0.0, 0.0, 1.0)));
        vec4 mv = viewMatrix * w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: o.letterFragment,
    side: THREE.DoubleSide,
  })
  geo.instanceCount = cap
  const mesh = new THREE.Mesh(geo, material); mesh.frustumCulled = false

  const pending: Kick[] = []; let frame = 0
  return {
    mesh, material, count: total, density: density.texture, density0: density0.texture, hBox,
    kick: (k) => { if (pending.length < KICKS) pending.push(k) },
    step: (dt, time) => {
      simU.uDt.value = dt; simU.uTime.value = time; simU.uFrame.value = (frame++ % 4096) + 0.5
      simU.uKicks.value = pending.length
      pending.forEach((k, i) => { simU.uKickA.value[i].set(k.x, k.z, k.r, k.strength); simU.uKickB.value[i].set(k.px || 0, k.pz || 0, k.radial ?? 1, k.frac) }); pending.length = 0
      gpu.compute()
      const posTex = gpu.getCurrentRenderTarget(posVar).texture
      renderDensity(density, posTex)
      material.uniforms.tPos.value = posTex; material.uniforms.tRot.value = gpu.getCurrentRenderTarget(rotVar).texture
    },
    readPile: (x, z) => {
      const i = Math.floor((x - BX0) / (BX1 - BX0) * DW), j = Math.floor((z - BZ0) / (BZ1 - BZ0) * DH); const px = new Uint16Array(4), px0 = new Uint16Array(4)
      gl.readRenderTargetPixels(density, i, j, 1, 1, px); gl.readRenderTargetPixels(density0, i, j, 1, 1, px0)
      return (THREE.DataUtils.fromHalfFloat(px[0]) - THREE.DataUtils.fromHalfFloat(px0[0])) * PILE_K
    },
    readCell: (x, z, r) => {
      const i = Math.floor((x - BX0) / (BX1 - BX0) * DW), j = Math.floor((z - BZ0) / (BZ1 - BZ0) * DH); const px = new Uint16Array(4), px0 = new Uint16Array(4)
      gl.readRenderTargetPixels(density, i, j, 1, 1, px); gl.readRenderTargetPixels(density0, i, j, 1, 1, px0)
      const buf = new Float32Array(S * S * 4); gl.readRenderTargetPixels(gpu.getCurrentRenderTarget(posVar), 0, 0, S, S, buf)
      let near = 0; for (let k = 0; k < total; k++) { if (buf[k * 4 + 3] > 0.5) continue; const dx = buf[k * 4] - x, dz = buf[k * 4 + 2] - z; if (dx * dx + dz * dz < r * r) near++ }
      return { d: THREE.DataUtils.fromHalfFloat(px[0]), d0: THREE.DataUtils.fromHalfFloat(px0[0]), near }
    },
    readStates: () => {
      const buf = new Float32Array(S * S * 4); gl.readRenderTargetPixels(gpu.getCurrentRenderTarget(posVar), 0, 0, S, S, buf)
      let rest = 0, flying = 0, sky = 0; for (let i = 0; i < total; i++) { const w = buf[i * 4 + 3]; if (w > 1.5) sky++; else if (w > 0.5) flying++; else rest++ } return { rest, flying, sky }
    },
    dispose: () => { gpu.dispose(); density.dispose(); density0.dispose(); height.dispose(); geo.dispose(); material.dispose(); dGeo.dispose(); dMat.dispose() },
  }
}
