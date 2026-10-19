import type { ReactNode } from 'react'

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="mx-auto h-[3px] max-w-[220px] overflow-hidden rounded-full bg-hairline" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-pine transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}

// The panel title under the header: "What do you remember?" + a short muted line.
export function PageHeader({
  eyebrow,
  counter,
  title,
  subtitle,
  progress,
}: {
  eyebrow?: string
  counter?: string
  title: ReactNode
  subtitle?: ReactNode
  progress?: number
}) {
  return (
    <header className="mb-6 text-center">
      {(eyebrow || counter) && <p className="text-eyebrow mb-3">{[eyebrow, counter].filter(Boolean).join(' · ')}</p>}
      <h1 className="text-title">{title}</h1>
      {subtitle && <p className="mx-auto mt-3 max-w-[300px] font-serif text-[15.5px] leading-[1.55] text-muted">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-5">
          <ProgressBar value={progress} />
        </div>
      )}
    </header>
  )
}
