import { ChopSeal } from './ChopSeal'

// A Family Book chapter opener: vermilion numeral, big two-line title, one muted line, a seal.
export function ChapterHeader({ number, title, description, seal }: { number: number; title: string; description?: string; seal?: string }) {
  return (
    <header className="relative pt-3 pb-6">
      <p className="font-display text-[68px] leading-[0.9] font-semibold text-vermilion">{String(number).padStart(2, '0')}</p>
      <h2 className="text-display-xl mt-2 max-w-[250px] text-balance">{title}</h2>
      {description && <p className="mt-4 max-w-[230px] font-serif text-[15px] leading-[1.5] text-muted">{description}</p>}
      {seal && <ChopSeal text={seal} size={30} className="absolute right-1 bottom-7" />}
    </header>
  )
}
