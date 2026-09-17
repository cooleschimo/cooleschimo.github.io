import { Snow } from '../world/Snow'

/** Fixed sky behind the page: a watercolour wash with a wobbly horizon, and snow. Sections scroll over it. */
export function SkyBand() {
  return (
    <div className="sky-band" aria-hidden="true">
      <div className="sky-wash" />
      <div className="sky-aurora" />
      <Snow className="sky-snow" />
    </div>
  )
}
