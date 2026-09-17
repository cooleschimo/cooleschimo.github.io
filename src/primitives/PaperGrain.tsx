/** Fixed, pointer-events-none grain over the whole page. Uses the filter from <WatercolorDefs>. */
export function PaperGrain() {
  return (
    <svg className="paper-grain" aria-hidden="true" focusable="false">
      <rect width="100%" height="100%" filter="url(#paper-grain-filter)" />
    </svg>
  )
}
