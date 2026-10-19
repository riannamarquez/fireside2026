// Family side only: secondary details slide up over the page so readers never lose their place.
// Opens at "medium" (~50%); drag the handle up for "large" (~90%), down to close. A labeled
// Close button, the backdrop and Escape always close it too, so nothing depends on a gesture.
import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

export type Detent = 'medium' | 'large'

const HEIGHT: Record<Detent, string> = { medium: '50dvh', large: '90dvh' }
const DURATION = 280
const SNAP = 60 // px of drag that changes detent
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  detent?: Detent // controlled detent (e.g. "Read the transcript" asks for large)
  onDetentChange?: (detent: Detent) => void
}

export function BottomSheet({ open, onClose, title, children, detent: controlled, onDetentChange }: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false) // drives the slide/fade
  const [own, setOwn] = useState<Detent>('medium')
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<number | null>(null)
  const detent = controlled ?? own
  const setDetent = (d: Detent) => (onDetentChange ? onDetentChange(d) : setOwn(d))

  // Mount, then slide in on the next frame; slide out, then unmount.
  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null
      setMounted(true)
      setOwn('medium')
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const t = window.setTimeout(() => setMounted(false), DURATION)
    return () => window.clearTimeout(t)
  }, [open])

  // Focus the close button on open, return focus on close.
  useEffect(() => {
    if (!mounted) return
    closeRef.current?.focus()
    return () => returnFocus.current?.focus?.()
  }, [mounted])

  // Escape closes; Tab stays inside the sheet.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]!
      const last = items[items.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  function onPointerDown(e: ReactPointerEvent) {
    dragStart.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: ReactPointerEvent) {
    if (dragStart.current === null) return
    setDrag(e.clientY - dragStart.current)
  }
  function onPointerUp() {
    if (dragStart.current === null) return
    dragStart.current = null
    setDragging(false)
    const dy = drag
    setDrag(0)
    if (dy < -SNAP) setDetent('large')
    else if (dy > SNAP) {
      if (detent === 'large') setDetent('medium')
      else onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`sheet-fade absolute inset-0 bg-ink/35 ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-w-[430px] flex-col rounded-t-[24px] bg-card shadow-float ${shown ? 'is-open' : ''} ${dragging ? 'is-dragging' : ''}`}
        style={{
          height: `calc(${HEIGHT[detent]} - ${Math.min(0, drag)}px)`,
          transform: shown ? `translateY(${Math.max(0, drag)}px)` : 'translateY(100%)',
        }}
      >
        {/* Grab handle: drag up for more room, down to close. The Close button does the same without a gesture. */}
        <div
          className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className="h-1.5 w-11 rounded-full bg-ink/20" />
        </div>
        <div className="flex shrink-0 items-start gap-3 px-6 pb-3">
          <h2 id={titleId} className="text-heading min-w-0 flex-1 pt-1">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-4 font-serif text-[16px] text-ink hover:bg-parchment"
          >
            <X size={17} strokeWidth={1.75} aria-hidden="true" />
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(24px+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

// A labeled row of facts inside a sheet: "Recorded · Sep 2, 2026".
export function SheetFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-hairline border-y border-hairline">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-meta text-[15px]">{item.label}</dt>
          <dd className="text-right font-serif text-[17px] text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
