import { LoaderCircle, Mic, Square } from 'lucide-react'
import type { ReactNode } from 'react'

// The big oxblood mic with a soft halo (pulsing while recording) and a serif label under it.
// Recording logic stays with the caller; this only shows the state.
export function RecordButton({
  state = 'idle',
  onClick,
  label = 'Record a memory',
  sublabel,
  disabled = false,
}: {
  state?: 'idle' | 'recording' | 'saving'
  onClick: () => void
  label?: ReactNode
  sublabel?: ReactNode
  disabled?: boolean
}) {
  const recording = state === 'recording'
  // One button: the circle and its worded label are both tappable.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === 'saving'}
      aria-pressed={recording}
      className="group mx-auto flex flex-col items-center rounded-[24px] px-4 pb-2 focus-visible:outline-offset-4 disabled:cursor-default"
    >
      <span className="relative flex size-[200px] items-center justify-center">
        <span className={`absolute inset-0 rounded-full bg-vermilion/[0.07] ${recording ? 'motion-safe:animate-halo [animation-delay:300ms]' : ''}`} aria-hidden="true" />
        <span className={`absolute inset-[14px] rounded-full bg-vermilion/[0.11] ${recording ? 'motion-safe:animate-halo' : ''}`} aria-hidden="true" />
        <span className="relative flex size-[160px] items-center justify-center rounded-full bg-oxblood text-white shadow-mic transition-colors group-hover:bg-oxblood-dark group-disabled:opacity-80">
          {state === 'saving' ? (
            <LoaderCircle size={48} strokeWidth={1.5} className="motion-safe:animate-spin" aria-hidden="true" />
          ) : recording ? (
            <Square size={40} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          ) : (
            <Mic size={58} strokeWidth={1.5} aria-hidden="true" />
          )}
        </span>
      </span>
      <span className="mt-1 text-center" aria-live="polite">
        <span className="block font-serif text-[21px] text-ink">{label}</span>
        {sublabel && <span className="text-meta mt-1 block">{sublabel}</span>}
      </span>
    </button>
  )
}
