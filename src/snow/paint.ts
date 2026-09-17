import * as THREE from 'three'

/**
 * The paint material: a flat picture on a plane that arrives as an ink line and fills with watercolour
 * (uReveal 0→1, a wet edge running ahead of the colour), and leaves by dissolving into pigment that
 * drifts up (uDissolve 0→1). Shared by every piece in the diorama so the motion language is one.
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
      uTint: { value: new THREE.Color('#ffffff') }, uFlip: { value: 0 }, uOpacity: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; uniform float uFlip; void main(){ vUv = uv; if (uFlip > 0.5) vUv.x = 1.0 - vUv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uReveal, uDissolve, uTime, uSeed, uFlip, uOpacity; uniform vec3 uTint; varying vec2 vUv;
      ${NOISE_GLSL}
      void main(){
        vec2 uv = vUv;
        // dissolve: pigment lifts and drifts upward, breaking up along a noise field
        float dn = fbm(uv * 3.0 + uSeed * 0.37);
        float drift = uDissolve * (0.12 + 0.1 * dn);
        uv.y -= drift * 0.6; uv.x += (dn - 0.5) * drift * 0.8;
        vec4 tex = texture2D(uMap, uv);
        // ink line: where the picture's alpha changes (its outline) and where its tone changes sharply
        vec2 px = vec2(1.0) / vec2(textureSize(uMap, 0));
        float aL = texture2D(uMap, uv - vec2(px.x, 0.0)).a, aR = texture2D(uMap, uv + vec2(px.x, 0.0)).a;
        float aU = texture2D(uMap, uv - vec2(0.0, px.y)).a, aD = texture2D(uMap, uv + vec2(0.0, px.y)).a;
        float outline = clamp(abs(aR - aL) + abs(aD - aU), 0.0, 1.0) * tex.a;
        float lum = dot(tex.rgb, vec3(0.3, 0.59, 0.11));
        float lL = dot(texture2D(uMap, uv - vec2(px.x * 2.0, 0.0)).rgb, vec3(0.3, 0.59, 0.11));
        float lU = dot(texture2D(uMap, uv - vec2(0.0, px.y * 2.0)).rgb, vec3(0.3, 0.59, 0.11));
        float tone = clamp((abs(lum - lL) + abs(lum - lU)) * 3.0, 0.0, 1.0) * tex.a;
        float ink = max(outline, tone * 0.6);
        // watercolour fill: colour arrives where the noise field is below the reveal, with a wet darker edge ahead of it
        float m = fbm(uv * 4.0 + uSeed) * 0.8 + uv.y * 0.15 + 0.05;
        float painted = smoothstep(m + 0.05, m - 0.05, 1.0 - uReveal);
        float wet = smoothstep(0.14, 0.0, abs((1.0 - uReveal) - m)) * (1.0 - step(0.999, uReveal)) * 0.35;
        vec3 paper = vec3(0.97, 0.96, 0.94);
        vec3 col = mix(paper, tex.rgb, painted);
        col = mix(col, col * 0.72, wet * tex.a);
        float inkShow = smoothstep(0.0, 0.25, uReveal);
        col = mix(col, vec3(0.28, 0.22, 0.2), ink * inkShow * 0.55);
        float a = tex.a * max(painted, ink * inkShow) * uOpacity;
        // dissolve alpha: pigment breaks into flecks
        float dz = fbm(uv * 9.0 + uSeed * 1.7);
        a *= 1.0 - smoothstep(dz - 0.15, dz + 0.05, uDissolve * 1.15);
        gl_FragColor = vec4(col * uTint, a);
        if (a < 0.01) discard;
      }`,
    transparent: true, depthWrite: false,
  })
}
