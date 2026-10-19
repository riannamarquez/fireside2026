import { ChevronRight } from 'lucide-react'

// "Recent" ............ "See all ›"
export function SectionHeader({ title, action, className = '' }: { title: string; action?: { label: string; onClick: () => void }; className?: string }) {
  return (
    <div className={`mb-3 flex items-baseline justify-between gap-4 ${className}`}>
      <h2 className="font-serif text-[20px] text-ink">{title}</h2>
      {action && (
        <button type="button" onClick={action.onClick} className="-mr-1 inline-flex min-h-11 items-center gap-1 font-serif text-[15px] text-ink/80 hover:text-pine">
          {action.label}
          <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
