import type { ReactNode } from 'react'

type Props = { id: string; label: string; x: number; y: number; w: number; h?: number; onOpen?: () => void; children: ReactNode; layer?: number; className?: string; ariaLabel?: string }

/** An interactive thing in the room: a real button, lifts on hover, shows its label. */
export function RoomObject({ id, label, x, y, w, h, onOpen, children, className = '', ariaLabel }: Props) {
  const Tag = onOpen ? 'button' : 'div'
  return (
    <Tag type={onOpen ? 'button' : undefined} className={`ro ${onOpen ? 'ro--open' : ''} ${className}`} data-id={id}
      style={{ left: x, top: y, width: w, height: h }} onClick={onOpen} aria-label={ariaLabel ?? (onOpen ? `Open ${label}` : undefined)}>
      {children}
      <span className="ro__label label" aria-hidden="true">{label}</span>
    </Tag>
  )
}

/** Blockout placeholder: a flat grey shape with a soft paper lift. */
export function Block({ w, h, r = 6, tone = 2, className = '', style, children }: { w: number | string; h: number | string; r?: number; tone?: 1 | 2 | 3 | 4; className?: string; style?: React.CSSProperties; children?: ReactNode }) {
  return <div className={`block block--${tone} ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }}>{children}</div>
}
