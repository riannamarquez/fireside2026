import { ArrowRight } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; compact?: boolean; large?: boolean }

// Full-width deep-green pill with a serif label and a trailing arrow: "Seal this memory →".
export function PrimaryButton({ children, icon, compact = false, large = false, arrow = true, danger = false, className = '', type = 'button', ...rest }: Props & { arrow?: boolean; danger?: boolean }) {
  return (
    <button
      type={type}
      className={`inline-flex w-full items-center justify-center gap-3 rounded-full font-serif font-medium text-card transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${danger ? 'bg-vermilion hover:bg-vermilion-dark' : 'bg-pine hover:bg-pine-dark'} ${large ? 'min-h-[62px] px-6 py-2 text-[20px]' : compact ? 'h-12 px-5 text-[17px]' : 'h-[58px] px-6 text-[19px]'} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {arrow && <ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  )
}

// Quiet outlined pill for second choices ("Later", "Cancel").
export function SecondaryButton({ children, icon, compact = false, large = false, className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-ink/15 bg-card font-serif font-medium text-ink transition-colors hover:bg-parchment disabled:cursor-not-allowed disabled:opacity-50 ${large ? 'min-h-[62px] px-5 py-2 text-[20px]' : compact ? 'h-12 px-5 text-[16px]' : 'h-[54px] px-6 text-[18px]'} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

const textTones = {
  pine: 'text-pine',
  muted: 'text-muted',
  vermilion: 'text-vermilion',
}

// A text link that does something: "See all ›", "Forget this", "Something you've never told anyone".
export function TextButton({ children, icon, tone = 'pine', className = '', type = 'button', ...rest }: Props & { tone?: keyof typeof textTones }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 font-serif text-[16px] underline-offset-4 hover:underline disabled:opacity-50 ${textTones[tone]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

// A round line-icon button (edit, remove). label is required for screen readers.
export function IconButton({ label, children, className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type={type} aria-label={label} className={`flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink ${className}`} {...rest}>
      {children}
    </button>
  )
}
