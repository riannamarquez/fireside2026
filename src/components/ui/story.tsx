import type { Passage } from '../../types'

export function Diamond({ className = '' }: { className?: string }) {
  return <span className={`block size-1.5 rotate-45 bg-vermilion ${className}`} aria-hidden="true" />
}

export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} role="separator">
      <span className="h-px flex-1 bg-hairline" />
      <Diamond />
      <span className="h-px flex-1 bg-hairline" />
    </div>
  )
}

export function DropCapParagraph({ children }: { children: string }) {
  return (
    <p className="text-story first-letter:float-left first-letter:mt-1.5 first-letter:mr-2.5 first-letter:font-display first-letter:text-[74px] first-letter:leading-[0.8] first-letter:font-semibold first-letter:text-vermilion">
      {children}
    </p>
  )
}

export function PullQuote({ children, align = 'left' }: { children: string; align?: 'left' | 'center' }) {
  if (align === 'center') {
    return (
      <blockquote className="py-2 text-center">
        <span className="mx-auto block h-px w-12 bg-vermilion" aria-hidden="true" />
        <p className="my-5 font-display text-[27px] leading-snug font-medium text-pine italic">{children}</p>
        <span className="mx-auto block h-px w-12 bg-vermilion" aria-hidden="true" />
      </blockquote>
    )
  }
  return (
    <blockquote className="border-l-2 border-pine pl-5">
      <p className="font-display text-[25px] leading-snug font-medium text-pine italic">{children}</p>
    </blockquote>
  )
}

function isQuotation(text: string) {
  return /^\s*[“"]/.test(text)
}

// Passages as book text: drop cap on the first paragraph, quotations as pull quotes.
export function StoryPassages({ passages, quoteAlign = 'left' }: { passages: Passage[]; quoteAlign?: 'left' | 'center' }) {
  return (
    <div className="space-y-5">
      {passages.map((p, i) => {
        if (isQuotation(p.text)) return <PullQuote key={i} align={quoteAlign}>{p.text.trim()}</PullQuote>
        if (i === 0) return <DropCapParagraph key={i}>{p.text}</DropCapParagraph>
        return <p key={i} className="text-story">{p.text}</p>
      })}
    </div>
  )
}
