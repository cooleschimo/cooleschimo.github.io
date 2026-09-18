import * as THREE from 'three'

/**
 * The paint material: a painted picture standing in the scene. It arrives as an ink line and fills with
 * watercolour (uReveal 0→1, a wet edge running ahead of the colour) and leaves by dissolving into pigment
 * that drifts up (uDissolve 0→1). Its edge is a brushed edge, not a cut one: the alpha is broken up by
 * noise so no straight sticker outline survives. It takes the scene's light (uTint, a brighter top),
 * its fog, and can sink into the snow (uSink: the bottom of the picture blends toward uSnow).
 */
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
      uSnow: { value: new THREE.Color('#f4f5ff') }, uSink: { value: 0 }, uTopLight: { value: 0.08 },
      fogColor: { value: new THREE.Color('#e6e7fb') }, fogNear: { value: 1e6 }, fogFar: { value: 1e7 },
    },
    vertexShader: `varying vec2 vUv; varying float vFog; uniform float uFlip;
      void main(){ vUv = uv; if (uFlip > 0.5) vUv.x = 1.0 - vUv.x; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uReveal, uDissolve, uTime, uSeed, uFlip, uOpacity, uCut, uSink, uTopLight, fogNear, fogFar; uniform vec3 uTint, uSnow, fogColor;
      varying vec2 vUv; varying float vFog;
      ${NOISE_GLSL}
      void main(){
        vec2 uv = vUv;
        // dissolve: pigment lifts and drifts upward, breaking up along a noise field
        float dn = fbm(uv * 3.0 + uSeed * 0.37);
        float drift = uDissolve * (0.12 + 0.1 * dn);
        uv.y -= drift * 0.6; uv.x += (dn - 0.5) * drift * 0.8;
        vec4 tex = texture2D(uMap, uv);
        // a brushed edge: the alpha edge wanders with fine noise, so it reads as paint, not a cut-out
        float en = fbm(uv * 28.0 + uSeed) - 0.5;
        float ta = smoothstep(0.25, 0.75, tex.a + en * 0.45);
        // ink line: where the picture's alpha changes (its outline) and where its tone changes sharply
        vec2 px = vec2(1.0) / vec2(textureSize(uMap, 0));
        float aL = texture2D(uMap, uv - vec2(px.x, 0.0)).a, aR = texture2D(uMap, uv + vec2(px.x, 0.0)).a;
        float aU = texture2D(uMap, uv - vec2(0.0, px.y)).a, aD = texture2D(uMap, uv + vec2(0.0, px.y)).a;
        float outline = clamp(abs(aR - aL) + abs(aD - aU), 0.0, 1.0) * ta;
        float lum = dot(tex.rgb, vec3(0.3, 0.59, 0.11));
        float lL = dot(texture2D(uMap, uv - vec2(px.x * 2.0, 0.0)).rgb, vec3(0.3, 0.59, 0.11));
        float lU = dot(texture2D(uMap, uv - vec2(0.0, px.y * 2.0)).rgb, vec3(0.3, 0.59, 0.11));
        float tone = clamp((abs(lum - lL) + abs(lum - lU)) * 3.0, 0.0, 1.0) * ta;
        float ink = max(outline, tone * 0.6);
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
