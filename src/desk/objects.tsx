import type { DeskItem } from './types'

export function ObjectArt({ item }: { item: DeskItem }) {
  switch (item.kind) {
    case 'image':
      return <img className="obj-image" src={item.src} alt="" draggable={false} />
    case 'polaroid':
      return (
        <figure className="obj-polaroid">
          <img src={item.photo} alt="" draggable={false} loading="lazy" />
          <figcaption className="label">{item.caption}</figcaption>
        </figure>
      )
    case 'folder':
      return (
        <svg className="obj-folder" viewBox="0 0 240 190" aria-hidden="true">
          <defs>
            <linearGradient id="fBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2bf7b" /><stop offset="1" stopColor="#cfa85f" /></linearGradient>
            <linearGradient id="fFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3d693" /><stop offset="1" stopColor="#e5c377" /></linearGradient>
          </defs>
          <path d="M12 30 h78 l18 16 h118 a10 10 0 0 1 10 10 v118 a10 10 0 0 1 -10 10 H12 a10 10 0 0 1 -10 -10 V40 a10 10 0 0 1 10 -10z" fill="url(#fBack)" />
          <path d="M2 72 h236 v102 a10 10 0 0 1 -10 10 H12 a10 10 0 0 1 -10 -10z" fill="url(#fFront)" />
          <rect x="150" y="10" width="76" height="26" rx="3" fill="#fbf7ee" stroke="#d9c9a5" />
          <text x="188" y="28" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#3a3a3a" letterSpacing="1">WORK</text>
          <g fill="#fbf7ee" stroke="#d9c9a5" strokeWidth="1"><rect x="26" y="52" width="150" height="16" rx="2" /><rect x="34" y="60" width="150" height="16" rx="2" /></g>
        </svg>
      )
    case 'calendar': {
      const d = new Date()
      const day = d.getDate(); const wd = d.toLocaleDateString('en-GB', { weekday: 'long' }); const mo = d.toLocaleDateString('en-GB', { month: 'long' })
      const start = new Date(d.getFullYear(), 0, 1); const doy = Math.floor((d.getTime() - start.getTime()) / 86400000) + 1
      const phase = (((d.getTime() / 86400000 - 10957.5 + 6.5) % 29.53058867) + 29.53058867) % 29.53058867 / 29.53058867
      const ill = 0.5 * (1 - Math.cos(2 * Math.PI * phase))
      return (
        <div className="obj-calendar" aria-label={`Today is ${wd} ${day} ${mo}`}>
          <div className="obj-calendar__day display">{day}</div>
          <div className="obj-calendar__meta label"><span>{wd}</span><span>{mo}</span><span>day {doy}</span></div>
          <svg className="obj-calendar__moon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" /><circle cx="12" cy="12" r="9" fill="currentColor" opacity={ill.toFixed(2)} /></svg>
        </div>
      )
    }
    case 'name':
      return (
        <div className="obj-name">
          <h1 className="display obj-name__title">Chimin Liu</h1>
          <p className="label obj-name__role">Engineer · Photographer · Painter</p>
          <p className="obj-name__line">Small tools for medicine and markets, photographs from an old Ricoh, and paintings of cold places.</p>
        </div>
      )
  }
}
