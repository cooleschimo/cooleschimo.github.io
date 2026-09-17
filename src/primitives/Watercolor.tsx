/**
 * Shared SVG filter definitions for watercolour edges. Render once near the app root.
 * Tune the constants below; every fill on the site reads them.
 */
export const WATERCOLOR = {
  baseFrequency: 0.028,
  octaves: 3,
  displacementScale: 18,
  edgeBlur: 0.6,
  seed: 7,
} as const

export function WatercolorDefs() {
  const { baseFrequency, octaves, displacementScale, edgeBlur, seed } = WATERCOLOR
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }} focusable="false">
      <defs>
        {/* Wobbly, bleeding edge for any fill element: filter: url(#wc-edge) */}
        <filter id="wc-edge" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={baseFrequency} numOctaves={octaves} seed={seed} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={displacementScale} xChannelSelector="R" yChannelSelector="G" result="warped" />
          <feGaussianBlur in="warped" stdDeviation={edgeBlur} result="soft" />
          {/* Pool pigment at the edges: darken where alpha falls off. */}
          <feComponentTransfer in="soft" result="pooled">
            <feFuncA type="table" tableValues="0 0.9 1 1 0.85" />
          </feComponentTransfer>
          <feBlend in="pooled" in2="soft" mode="multiply" />
        </filter>
        {/* Coarser version for big washes (hero sky, section backgrounds). */}
        <filter id="wc-wash" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={baseFrequency * 0.45} numOctaves={2} seed={seed + 1} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={displacementScale * 2.2} xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation={edgeBlur * 2} />
        </filter>
        {/* Paper grain tile used by <PaperGrain>. */}
        <filter id="paper-grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
        </filter>
      </defs>
    </svg>
  )
}
