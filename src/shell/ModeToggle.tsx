import { getMode, nextMode, setMode, useMode } from '../lib/mode'

const LABEL = { day: 'Day', evening: 'Evening', night: 'Night' } as const

export function ModeToggle() {
  const mode = useMode()
  const next = nextMode(mode)
  return (
    <button type="button" className="mode-toggle" onClick={() => setMode(nextMode(getMode()))} aria-label={`${LABEL[mode]}. Switch to ${LABEL[next].toLowerCase()}`} title={`${LABEL[mode]} → ${LABEL[next].toLowerCase()}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        {mode === 'day' && (<><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" /></>)}
        {mode === 'evening' && (<><path d="M4 15h16" /><path d="M7.5 15a4.5 4.5 0 0 1 9 0" /><path d="M12 5v2.2M5.6 8.6l1.6 1.6M18.4 8.6l-1.6 1.6M3 19h18" /></>)}
        {mode === 'night' && (<path d="M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.5 7.5 0 1 0 9.7 9.7z" />)}
      </svg>
    </button>
  )
}
