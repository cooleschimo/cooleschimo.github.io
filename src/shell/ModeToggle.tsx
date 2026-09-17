import { getMode, setMode, useMode, type Mode } from '../lib/mode'

/** A small sun / crescent. One click switches the tokens; the CSS transition does the rest. */
export function ModeToggle() {
  const mode = useMode()
  const isDay = mode === 'day'
  const onClick = () => {
    const next: Mode = getMode() === 'day' ? 'night' : 'day'
    setMode(next)
  }
  return (
    <button type="button" className="mode-toggle" onClick={onClick}
      aria-label={isDay ? 'Switch to night' : 'Switch to day'} aria-pressed={!isDay} title={isDay ? 'Night' : 'Day'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        {isDay ? (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
          </>
        ) : (
          <path d="M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.5 7.5 0 1 0 9.7 9.7z" />
        )}
      </svg>
    </button>
  )
}
