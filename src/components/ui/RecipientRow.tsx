import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from './Avatar'

// "For Lily · My granddaughter ›" with a round portrait and a hairline below.
export function RecipientRow({
  name,
  title,
  subtitle,
  onClick,
  expanded,
  group = false,
}: {
  name: string // whose portrait to show
  title: ReactNode // "For Lily"
  subtitle?: ReactNode
  onClick?: () => void
  expanded?: boolean
  group?: boolean
}) {
  const content = (
    <>
      <Avatar name={name} size={56} group={group} />
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[19px] leading-snug text-ink">{title}</span>
        {subtitle && <span className="text-meta block">{subtitle}</span>}
      </span>
      {onClick && <ChevronRight size={22} strokeWidth={1.5} className={`shrink-0 text-ink/70 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />}
    </>
  )
  const className = 'flex w-full items-center gap-4 border-b border-hairline px-1 py-3.5 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} aria-expanded={expanded} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}
