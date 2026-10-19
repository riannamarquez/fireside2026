import { ChevronLeft, ChevronRight } from 'lucide-react'

// Previous / dots / next, for stepping through chapters or picture-book pages.
export function Pager({
  index,
  count,
  onPrev,
  onNext,
  prevDisabled = index === 0,
  nextDisabled = index >= count - 1,
  label = 'Page',
}: {
  index: number
  count: number
  onPrev: () => void
  onNext: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
  label?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        aria-label={`Previous ${label.toLowerCase()}`}
        className="surface-card flex size-12 items-center justify-center rounded-full text-ink disabled:opacity-30"
      >
        <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className="flex flex-wrap justify-center gap-1.5" aria-label={`${label} ${index + 1} of ${count}`}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-pine' : 'w-1.5 bg-ink/20'}`} />
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        aria-label={`Next ${label.toLowerCase()}`}
        className="flex size-12 items-center justify-center rounded-full bg-pine text-card disabled:opacity-30"
      >
        <ChevronRight size={22} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  )
}
