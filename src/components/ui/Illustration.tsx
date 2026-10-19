// An illustration slot from public/illustrations/. Until the PNG exists, a soft watercolor-like
// blob (or, for overlays, a few painted leaves) stands in, so there are never broken images.
import { useId, useState } from 'react'
import { ILLUSTRATIONS, illustrationUrl, type IllustrationSlot } from '../../lib/illustrations'

type Props = {
  slot: IllustrationSlot
  className?: string
  fit?: 'cover' | 'contain'
  position?: 'center' | 'bottom'
  // 'blob' for scenes, 'leaves'/'mango' for transparent overlays, 'none' to show nothing.
  fallback?: 'blob' | 'leaves' | 'mango' | 'none'
  showLabel?: boolean
  flip?: boolean // mirrors the fallback only; a real PNG is drawn as-is
  alt?: string
}

export function Illustration({ slot, className = '', fit = 'cover', position = 'center', fallback = 'blob', showLabel = false, flip = false, alt = '' }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'missing'>('loading')
  return (
    <div className={`overflow-hidden ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`}>
      {state !== 'loaded' && fallback === 'blob' && <BlobFallback label={showLabel ? ILLUSTRATIONS[slot].label : ''} />}
      {state !== 'loaded' && (fallback === 'leaves' || fallback === 'mango') && <LeafFallback mango={fallback === 'mango'} flip={flip} />}
      {state !== 'missing' && (
        <img
          src={illustrationUrl(slot)}
          alt={alt}
          onLoad={() => setState('loaded')}
          onError={() => setState('missing')}
          className={`absolute inset-0 size-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${position === 'bottom' ? 'object-bottom' : ''} ${state === 'loaded' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        />
      )}
    </div>
  )
}

function BlobFallback({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: '#f1e8d8',
        backgroundImage: [
          'radial-gradient(ellipse 55% 45% at 30% 38%, rgb(243 214 193 / 0.95), transparent 70%)',
          'radial-gradient(ellipse 50% 50% at 72% 62%, rgb(221 230 215 / 0.95), transparent 70%)',
          'radial-gradient(ellipse 30% 25% at 62% 24%, rgb(233 162 59 / 0.22), transparent 70%)',
          'radial-gradient(ellipse 40% 30% at 22% 80%, rgb(31 77 58 / 0.10), transparent 70%)',
        ].join(','),
      }}
      aria-hidden="true"
    >
      {label && <span className="absolute inset-x-0 bottom-[34%] text-center font-display text-[15px] italic text-muted/80">{label}</span>}
    </div>
  )
}

// A loose painted branch for the corner overlays.
function LeafFallback({ mango, flip }: { mango: boolean; flip: boolean }) {
  const leaves: [number, number, number][] = [
    [34, 22, -35],
    [58, 30, 10],
    [24, 48, -70],
    [70, 52, 30],
    [46, 60, -20],
    [88, 34, 55],
  ]
  return (
    <svg viewBox="0 0 120 100" className="absolute inset-0 size-full" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <path d="M0 8 C30 18 60 30 112 70" fill="none" stroke="#5b6f4a" strokeOpacity="0.45" strokeWidth="1.6" />
      {leaves.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="13" ry="4.6" transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? '#1f4d3a' : '#6f8a5c'} fillOpacity={i % 2 ? 0.32 : 0.38} />
      ))}
      {mango && (
        <>
          <ellipse cx="76" cy="70" rx="8" ry="11" fill="#e9a23b" fillOpacity="0.75" />
          <ellipse cx="92" cy="78" rx="7" ry="10" fill="#e9a23b" fillOpacity="0.6" />
        </>
      )}
    </svg>
  )
}

// Leafy branches bleeding in from a top corner.
export function CornerLeaves({ side, className = '' }: { side: 'left' | 'right'; className?: string }) {
  return (
    <Illustration
      slot={side === 'left' ? 'leaves-top-left' : 'leaves-top-right'}
      fallback="leaves"
      fit="contain"
      flip={side === 'right'}
      className={`pointer-events-none absolute ${className}`}
    />
  )
}

// Stable SVG ids for filters, since several seals can be on one screen.
export function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, '')}`
}
