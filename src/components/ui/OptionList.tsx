// Choice rows: radio · line icon · serif title · muted subtitle. The selected row turns pale sage
// and can open a nested field (a date pill, a short list).
import { Check, ChevronRight, type LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'

export function OptionList({ children, label, className = '' }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`space-y-1 ${className}`}>
      {children}
    </div>
  )
}

export function OptionRow({
  selected,
  onSelect,
  icon: Icon,
  title,
  subtitle,
  children,
  type = 'radio',
  compact = false,
}: {
  selected: boolean
  onSelect: () => void
  icon?: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  type?: 'radio' | 'check'
  compact?: boolean
}) {
  return (
    <div className={`rounded-[14px] transition-colors ${selected ? 'bg-sage' : ''}`}>
      <button
        type="button"
        role={type === 'radio' ? 'radio' : 'checkbox'}
        aria-checked={selected}
        onClick={onSelect}
        className={`flex w-full items-center gap-4 rounded-[14px] px-3 text-left ${compact ? 'py-2.5' : 'py-3'} ${selected ? '' : 'hover:bg-ink/[0.03]'}`}
      >
        <Mark selected={selected} type={type} />
        {Icon && <Icon size={22} strokeWidth={1.5} className="shrink-0 text-pine" aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className={`block font-serif ${compact ? 'text-[17px]' : 'text-[18px]'} leading-snug text-ink`}>{title}</span>
          {subtitle && <span className="text-meta block">{subtitle}</span>}
        </span>
      </button>
      {selected && children && <div className={`pr-3 pb-3 ${Icon ? 'pl-[90px]' : 'pl-[52px]'}`}>{children}</div>}
    </div>
  )
}

function Mark({ selected, type }: { selected: boolean; type: 'radio' | 'check' }) {
  if (type === 'check') {
    return (
      <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${selected ? 'border-pine bg-pine text-card' : 'border-ink/35'}`} aria-hidden="true">
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
    )
  }
  return (
    <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${selected ? 'border-pine' : 'border-ink/35'}`} aria-hidden="true">
      {selected && <span className="size-3 rounded-full bg-pine" />}
    </span>
  )
}

// The white pill inside a selected row: "June 12, 2030 ›".
export function PillButton({ children, onClick, expanded }: { children: ReactNode; onClick: () => void; expanded?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex h-12 w-full items-center justify-between gap-3 rounded-[10px] border border-black/[0.04] bg-card px-4 font-serif text-[17px] text-ink shadow-[0_1px_3px_rgb(60_40_20/0.06)]"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ChevronRight size={18} strokeWidth={1.5} className={`shrink-0 text-ink/70 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
    </button>
  )
}

// A text or date field styled like the pill, for inside a selected row.
export function PillInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-[10px] border border-black/[0.04] bg-card px-4 font-serif text-[17px] text-ink shadow-[0_1px_3px_rgb(60_40_20/0.06)] outline-none placeholder:text-muted/60 focus-visible:ring-2 focus-visible:ring-pine/25 ${className}`}
      {...rest}
    />
  )
}
