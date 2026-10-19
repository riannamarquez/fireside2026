import { useId, useLayoutEffect, useRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const inputClass =
  'w-full min-w-0 rounded-[14px] border border-hairline bg-card px-4 font-serif text-[18px] text-ink outline-none placeholder:text-muted/60 focus-visible:border-pine/40 focus-visible:ring-2 focus-visible:ring-pine/20'

export function Field({ label, className = '', id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block font-serif text-[14px] text-muted">
        {label}
      </label>
      <input id={inputId} className={`h-14 ${inputClass}`} {...rest} />
    </div>
  )
}

// Grows with its content. label is optional when an aria-label is given.
export function TextArea({ label, className = '', id, value, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-2 block font-serif text-[14px] text-muted">
          {label}
        </label>
      )}
      <textarea ref={ref} id={inputId} rows={3} value={value} className={`resize-none py-3 leading-[1.6] ${inputClass}`} {...rest} />
    </div>
  )
}
