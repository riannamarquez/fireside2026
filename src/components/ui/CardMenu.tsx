import { MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean }

// The vertical "⋮" at a card's top right, opening a small list of actions.
export function CardMenu({ items, label = 'More options', className = '', tone = 'ink' }: { items: MenuItem[]; label?: string; className?: string; tone?: 'ink' | 'seal' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (items.length === 0) return null
  return (
    <div ref={ref} className={`absolute z-20 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex size-9 items-center justify-center rounded-full hover:bg-ink/5 ${tone === 'seal' ? 'text-vermilion' : 'text-ink/70'}`}
      >
        <MoreVertical size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <ul role="menu" className="surface-card absolute top-9 right-0 min-w-[220px] overflow-hidden py-1">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  item.onSelect()
                }}
                className={`block w-full px-4 py-3 text-left font-serif text-[16px] hover:bg-parchment ${item.danger ? 'text-vermilion-dark' : 'text-ink'}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
