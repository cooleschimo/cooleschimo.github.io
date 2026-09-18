import * as THREE from 'three'

/**
 * The paint material: a painted picture standing in the scene. It arrives as an ink line and fills with
 * watercolour (uReveal 0→1, a wet edge running ahead of the colour) and leaves by dissolving into pigment
 * that drifts up (uDissolve 0→1). Its edge is a brushed edge, not a cut one: the alpha is broken up by
 * noise so no straight sticker outline survives. It takes the scene's light (uTint, a brighter top),
 * its fog, and can sink into the snow (uSink: the bottom of the picture blends toward uSnow), give up
 * contrast to the snow (uFrost), carry the snow's grain (uGrain) and glisten like it (uGlisten).
 *
 * A picture can also be a puppet: up to BONES regions of the picture (an arm, a leg, a head, a tail) that
 * rotate about a pivot by warping the plane's vertices, with a soft falloff so nothing is cut. Angles are
 * set per frame. An eye can blink (uEye, uBlink: fur from just above the eye is drawn over it).
 */
export const BONES = 6

export const NOISE_GLSL = `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.1; a *= 0.5; } return v; }
`

export function makePaintMaterial(map: THREE.Texture, seed = Math.random() * 100) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map }, uReveal: { value: 0 }, uDissolve: { value: 0 }, uTime: { value: 0 }, uSeed: { value: seed },
      uTint: { value: new THREE.Color('#ffffff') }, uFlip: { value: 0 }, uOpacity: { value: 1 }, uCut: { value: 0.12 },
      uSnow: { value: new THREE.Color('#f4f5ff') }, uSink: { value: 0 }, uTopLight: { value: 0.08 }, uFrost: { value: 0 }, uGrain: { value: 0 }, uGlisten: { value: 0 },
      uLight: { value: new THREE.Color('#ffffff') },
      fogColor: { value: new THREE.Color('#e6e7fb') }, fogNear: { value: 1e6 }, fogFar: { value: 1e7 },
      uSize: { value: new THREE.Vector2(1, 1) }, uBreath: { value: 0 },
      uPivot: { value: Array.from({ length: BONES }, () => new THREE.Vector2(0.5, 0.5)) },
      uRegion: { value: Array.from({ length: BONES }, () => new THREE.Vector4(0.5, 0.5, 0, 0)) },
      uAngle: { value: new Float32Array(BONES) },
      uEye: { value: new THREE.Vector4(0, 0, 0, 0) }, uBlink: { value: 0 },
      // relief: a height map inflated from the silhouette; the picture is shaded as a soft form and pushed out in depth
      uHeight: { value: null as THREE.Texture | null }, uPuff: { value: 0 }, uRelief: { value: 0 }, uShadowCol: { value: new THREE.Color('#a7b6ea') },
      uKey: { value: new THREE.Vector3(-0.45, 0.6, 0.65).normalize() }, uSunPic: { value: new THREE.Vector2(-0.6, 0.6).normalize() },
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vW; varying float vFog; uniform float uFlip, uBreath, uPuff; uniform vec2 uSize; uniform sampler2D uHeight;
      uniform vec2 uPivot[${BONES}]; uniform vec4 uRegion[${BONES}]; uniform float uAngle[${BONES}];
      void main(){
        vUv = uv; if (uFlip > 0.5) vUv.x = 1.0 - vUv.x;
        vec2 p = position.xy;
        // breathing: the picture swells a little about its middle
        p *= 1.0 + uBreath;
        // bones: each region turns about its pivot, weighted by a soft ellipse so the picture bends rather than cuts
        for (int i = 0; i < ${BONES}; i++) {
          if (uRegion[i].z <= 0.0) continue;
          vec2 pu = uPivot[i], cu = uRegion[i].xy; float a = uAngle[i];
          if (uFlip > 0.5) { pu.x = 1.0 - pu.x; cu.x = 1.0 - cu.x; a = -a; }
          vec2 piv = (pu - 0.5) * uSize, c = (cu - 0.5) * uSize, r = uRegion[i].zw * uSize;
          vec2 d = (p - c) / r; float w = 1.0 - smoothstep(0.55, 1.0, length(d));
          a *= w; vec2 q = p - piv; float cs = cos(a), sn = sin(a);
          p = piv + vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs);
        }
        float hz = uPuff > 0.0 ? texture2D(uHeight, vUv).r * uPuff : 0.0;
        vec4 w4 = modelMatrix * vec4(p, hz, 1.0); vW = w4.xyz;
        vec4 mv = viewMatrix * w4; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uReveal, uDissolve, uTime, uSeed, uFlip, uOpacity, uCut, uSink, uTopLight, uFrost, uGrain, uGlisten, uBlink, fogNear, fogFar;
      uniform vec3 uTint, uSnow, uLight, fogColor, uShadowCol, uKey; uniform vec4 uEye; uniform sampler2D uHeight; uniform float uRelief; uniform vec2 uSunPic;
      varying vec2 vUv; varying vec3 vW; varying float vFog;
      ${NOISE_GLSL}
      void main(){
        vec2 uv = vUv;
        // dissolve: pigment lifts and drifts upward, breaking up along a noise field
        float dn = fbm(uv * 3.0 + uSeed * 0.37);
        float drift = uDissolve * (0.12 + 0.1 * dn);
        uv.y -= drift * 0.6; uv.x += (dn - 0.5) * drift * 0.8;
        vec4 tex = texture2D(uMap, uv);
        // a blink: fur from just above the eye closes over it
        if (uEye.z > 0.0 && uBlink > 0.001) { vec2 ed = (uv - uEye.xy) / uEye.zw; float d = length(ed);
          if (d < 1.2) tex = mix(tex, texture2D(uMap, uv + vec2(0.0, uEye.w * 2.2)), smoothstep(1.2, 0.7, d) * uBlink); }
        // a brushed edge: the alpha edge wanders with fine noise, so it reads as paint, not a cut-out
        float en = fbm(uv * 28.0 + uSeed) - 0.5;
        float ta = smoothstep(0.25, 0.75, tex.a + en * 0.45);
        // ink line: where the picture's alpha changes (its outline) and where its tone changes sharply
        vec2 px = vec2(1.0) / vec2(textureSize(uMap, 0));
        float aL = texture2D(uMap, uv - vec2(px.x, 0.0)).a, aR = texture2D(uMap, uv + vec2(px.x, 0.0)).a;
        float aU = texture2D(uMap, uv - vec2(0.0, px.y)).a, aD = texture2D(uMap, uv + vec2(0.0, px.y)).a;
        float outline = clamp(abs(aR - aL) + abs(aD - aU), 0.0, 1.0) * ta;
        float lum = dot(tex.rgb, vec3(0.3, 0.59, 0.11));
        // the picture's own edges, centred (a difference either side of this pixel), so the ink sits on the drawn lines
        vec3 W = vec3(0.3, 0.59, 0.11); float lx = dot(texture2D(uMap, uv + vec2(px.x, 0.0)).rgb, W) - dot(texture2D(uMap, uv - vec2(px.x, 0.0)).rgb, W);
        float ly = dot(texture2D(uMap, uv + vec2(0.0, px.y)).rgb, W) - dot(texture2D(uMap, uv - vec2(0.0, px.y)).rgb, W);
        float tone = smoothstep(0.04, 0.16, length(vec2(lx, ly))) * ta;
        float ink = max(outline, tone * 0.7);
        // watercolour fill: colour arrives where the noise field is below the reveal, with a wet darker edge ahead of it
        float m = fbm(uv * 4.0 + uSeed) * 0.8 + uv.y * 0.15 + 0.05;
        float painted = smoothstep(m + 0.05, m - 0.05, 1.0 - uReveal);
        float wet = smoothstep(0.14, 0.0, abs((1.0 - uReveal) - m)) * (1.0 - step(0.999, uReveal)) * 0.35;
        vec3 paper = vec3(0.97, 0.96, 0.94);
        vec3 col = mix(paper, tex.rgb, painted);
        col = mix(col, col * 0.72, wet * ta);
        float inkShow = smoothstep(0.0, 0.25, uReveal);
        col = mix(col, vec3(0.28, 0.22, 0.2), ink * inkShow * 0.45);
        // the scene's light: a little brighter toward the top, and the day's tint
        col *= uTint * (1.0 + uTopLight * (vUv.y - 0.5) * 2.0);
        // relief: the form is shaded from its height map (a soft key light from the upper left, blue in the turn), its edges
        // toward the sun catch a rim, and the base of each form sits in a little shadow
        if (uRelief > 0.0) { vec2 hp = 1.0 / vec2(textureSize(uHeight, 0)); float h = texture2D(uHeight, vUv).r;
          float hx = texture2D(uHeight, vUv + vec2(hp.x, 0.0)).r - texture2D(uHeight, vUv - vec2(hp.x, 0.0)).r;
          float hy = texture2D(uHeight, vUv + vec2(0.0, hp.y)).r - texture2D(uHeight, vUv - vec2(0.0, hp.y)).r;
          vec3 n = normalize(vec3(-hx * 7.0, -hy * 7.0, 1.0)); float lam = dot(n, uKey) * 0.5 + 0.5;
          vec3 shade = mix(uShadowCol / max(lum, 0.35) * 0.55 + 0.25, vec3(1.04), smoothstep(0.25, 0.95, lam));
          col *= mix(vec3(1.0), shade, uRelief);
          vec2 g2 = vec2(-hx, -hy); float gl = length(g2); float rim = pow(1.0 - h, 2.5) * max(0.0, dot(g2 / max(gl, 1e-4), uSunPic)) * smoothstep(0.0, 0.02, gl);
          col += uLight * rim * 0.4 * uRelief;
          col *= 1.0 - (1.0 - h) * 0.14 * uRelief; }
        // frost: the picture gives up some of its own contrast to the snow's colour; grain: the same dry speckle as the snow
        col = mix(col, uSnow, uFrost * (0.6 + 0.4 * (1.0 - lum)));
        col *= 1.0 + (fbm(uv * 70.0 + uSeed) - 0.5) * uGrain;
        // glisten: the bright parts of the picture sparkle like the snow, cells that flash in turn, and a slow light that sweeps across
        if (uGlisten > 0.0) { vec2 g = uv * 260.0 + uSeed; vec2 cell = floor(g); float h = hash(cell);
          vec2 pt = vec2(hash(cell + 3.3), hash(cell + 7.1)); float dd = length(fract(g) - pt);
          float dot_ = smoothstep(0.32, 0.0, dd); float tw = pow(0.5 + 0.5 * sin(uTime * 1.6 + h * 80.0), 12.0); float bright = smoothstep(0.5, 0.9, lum);
          col += uLight * dot_ * tw * step(0.6, h) * bright * 1.2 * uGlisten;
          col *= 1.0 + 0.04 * uGlisten * sin(uv.x * 4.0 + uv.y * 3.0 + uTime * 0.35) * bright; }
        // sunk into the snow: the bottom of the picture takes the snow's colour
        if (uSink > 0.0) { float s = smoothstep(uSink, 0.0, vUv.y + (fbm(vUv * 9.0 + uSeed) - 0.5) * 0.12); col = mix(col, uSnow, s * 0.9); }
        float a = ta * max(painted, ink * inkShow) * uOpacity;
        // dissolve alpha: pigment breaks into flecks
        float dz = fbm(uv * 9.0 + uSeed * 1.7);
        a *= 1.0 - smoothstep(dz - 0.15, dz + 0.05, uDissolve * 1.15);
        float f = smoothstep(fogNear, fogFar, vFog); col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, a);
        if (a < uCut) discard;
      }`,
    transparent: true, depthWrite: false,
  })
}
