import type { ReactNode } from 'react'

// A small pill toggle: language, Movie / Pages, a picture-book look.
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<{ value: T; label: ReactNode }>
  label: string
}) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-parchment p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 font-serif text-[15px] ${value === o.value ? 'bg-card text-pine shadow-card' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
