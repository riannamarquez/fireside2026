import type { ReactNode } from 'react'

const tones = {
  card: 'surface-card',
  sage: 'rounded-card bg-sage',
  parchment: 'rounded-card bg-parchment',
}

export function Card({ children, className = '', tone = 'card' }: { children: ReactNode; className?: string; tone?: keyof typeof tones }) {
  return <section className={`${tones[tone]} p-5 ${className}`}>{children}</section>
}

// A card with a title row; used for headed groups (life map steps, family roles).
export function TitledCard({ title, subtitle, aside, step, children, className = '' }: { title: string; subtitle?: ReactNode; aside?: ReactNode; step?: number; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="flex items-start gap-3">
        {step !== undefined && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage font-display text-[18px] font-semibold text-pine" aria-hidden="true">
            {step}
          </span>
        )}
        <h2 className="flex-1 text-heading">{title}</h2>
        {aside && <span className="text-meta shrink-0 pt-2">{aside}</span>}
      </div>
      {subtitle && <p className="text-meta mt-2 text-[15px] leading-normal">{subtitle}</p>}
      <div className="my-5 h-px bg-hairline" />
      {children}
    </Card>
  )
}
