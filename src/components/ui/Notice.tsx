import type { ReactNode } from 'react'

const tones = {
  error: 'bg-vermilion/10 text-vermilion-dark',
  info: 'bg-sage text-ink',
  quiet: 'bg-parchment text-ink',
}

// Inline messages: errors, suggestions, gentle notes.
export function Notice({ children, tone = 'info', icon, className = '' }: { children: ReactNode; tone?: keyof typeof tones; icon?: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 rounded-[14px] px-4 py-3.5 font-serif text-[16px] leading-[1.5] ${tones[tone]} ${className}`} role={tone === 'error' ? 'alert' : undefined}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
