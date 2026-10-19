// A sealed letter as readers see it: a square of cream paper tied with twine under a wax seal,
// and only "From Ama · For Lily · Opens June 12, 2030". Never a title or a hint of the topic.
import { MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Envelope } from '../../types'
import { useSvgId } from './Illustration'

// onOpen: the family side shows a bottom sheet; without it, the card opens the letter page.
export function EnvelopeCard({ envelope, onOpen }: { envelope: Envelope; onOpen?: () => void }) {
  const navigate = useNavigate()
  const open = onOpen ?? (() => navigate(`/letter/${envelope.id}`))
  return (
    <article
      className={`relative flex overflow-hidden rounded-card border border-black/[0.05] bg-parchment shadow-card ${envelope.openable ? 'ring-2 ring-pine/40' : ''}`}
      style={{ backgroundImage: 'var(--paper-grain)' }}
    >
      <button
        type="button"
        onClick={open}
        className="flex min-w-0 flex-1 items-center text-left"
        aria-label={`Letter from ${envelope.fromName} for ${envelope.forNames}. ${envelope.openable ? 'Ready to open' : envelope.opensLabel}`}
      >
        <EnvelopeArt className="m-1.5 h-[104px] w-[104px] shrink-0 rounded-[14px] shadow-[2px_2px_8px_rgb(60_40_20/0.14)]" />
        <span className="min-w-0 flex-1 py-4 pr-10 pl-4">
          <span className="flex items-start gap-2.5">
            <Padlock open={envelope.openable} className="mt-[2px] shrink-0" />
            <span className="min-w-0 font-serif text-[18px] font-medium leading-snug text-ink">
              From {envelope.fromName} · For {envelope.forNames}
            </span>
          </span>
          <span className={`mt-1.5 block pl-[30px] font-serif text-[14.5px] ${envelope.openable ? 'text-pine' : 'text-muted'}`}>
            {envelope.openable ? `${envelope.fromName} left you a letter for today` : envelope.opensLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={open}
        aria-label="About this sealed letter"
        aria-haspopup={onOpen ? 'dialog' : undefined}
        className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-vermilion hover:bg-ink/5"
      >
        <MoreVertical size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </article>
  )
}

// A small filled padlock: vermilion while sealed, pine and unlatched once it can be opened.
function Padlock({ open, className = '' }: { open: boolean; className?: string }) {
  const color = open ? 'var(--color-pine)' : 'var(--color-vermilion)'
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" className={className} aria-hidden="true">
      <path
        d={open ? 'M5.5 9.5V6.5a4.5 4.5 0 0 1 8.7-1.6' : 'M5.5 9.5V6.5a4.5 4.5 0 0 1 9 0v3'}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="2.5" y="9" width="15" height="12" rx="3" fill={color} />
      <circle cx="10" cy="14" r="1.6" fill="var(--color-card)" />
      <rect x="9.25" y="14.5" width="1.5" height="3.2" rx="0.75" fill="var(--color-card)" />
    </svg>
  )
}

// Cream paper square, one cord of twine crossing it, and a raised wax seal with a blossom.
export function EnvelopeArt({ className = '' }: { className?: string }) {
  const id = useSvgId('env')
  // Five rounded petals around the seal's centre.
  const petals = [0, 72, 144, 216, 288]
  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <filter id={`${id}-paper`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="4" result="n" />
          <feColorMatrix in="n" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.14 0" result="grain" />
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="g" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="g" />
          </feMerge>
        </filter>
        <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0.8" dy="1.6" stdDeviation="1.6" floodColor="#5a2414" floodOpacity="0.35" />
        </filter>
        <radialGradient id={`${id}-wax`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#e2694d" />
          <stop offset="0.55" stopColor="#c8492f" />
          <stop offset="1" stopColor="#96331d" />
        </radialGradient>
      </defs>

      <rect width="120" height="120" rx="14" fill="#f3ecdd" filter={`url(#${id}-paper)`} />
      {/* faint pressed pattern in the paper */}
      <g fill="none" stroke="#d9ccb2" strokeOpacity="0.55" strokeWidth="0.8">
        <path d="M14 22 C24 14 34 26 26 34 C20 40 12 32 18 28" />
        <path d="M86 92 C96 84 106 96 98 104 C92 110 84 102 90 98" />
        <path d="M90 18 C98 24 92 34 84 30" />
        <path d="M22 96 C30 90 36 100 28 104" />
      </g>

      {/* one cord of twine, crossing a little off-true like it was tied by hand */}
      <g stroke="#b5583c" strokeLinecap="round" fill="none">
        <path d="M0 61 Q60 58 120 62" strokeWidth="2.4" />
        <path d="M59 0 Q57 60 60 120" strokeWidth="2.4" />
        <path d="M0 62.6 Q60 59.6 120 63.6 M60.6 0 Q58.6 60 61.6 120" strokeWidth="0.7" stroke="#e39a7c" strokeOpacity="0.6" />
      </g>

      {/* wax seal: an uneven pooled edge, a pressed ring, a blossom in relief */}
      <g filter={`url(#${id}-lift)`}>
        <path
          d="M60 35 C66 34 70 38 75 38 C80 39 84 44 83 49 C85 53 86 58 84 63 C86 68 83 74 78 77 C75 82 69 84 64 83 C59 86 53 84 49 80 C43 79 38 74 38 68 C35 63 35 57 37 52 C36 46 40 41 45 39 C49 35 55 36 60 35 Z"
          fill={`url(#${id}-wax)`}
        />
      </g>
      <circle cx="60.5" cy="59.5" r="16" fill="none" stroke="#8c2f1a" strokeOpacity="0.5" strokeWidth="1.1" />
      <circle cx="60.5" cy="59.5" r="15" fill="none" stroke="#f0a083" strokeOpacity="0.35" strokeWidth="0.6" />
      <g transform="translate(60.5 59.5)">
        {petals.map((r) => (
          <g key={r} transform={`rotate(${r})`}>
            <path d="M0 -1.5 C-4.4 -4 -4.6 -10.2 0 -11.6 C4.6 -10.2 4.4 -4 0 -1.5 Z" fill="#b13e24" stroke="#8c2f1a" strokeOpacity="0.7" strokeWidth="0.7" />
            <path d="M-1.4 -9.6 C-0.4 -10.6 0.8 -10.6 1.6 -9.8" fill="none" stroke="#f0a083" strokeOpacity="0.55" strokeWidth="0.6" />
          </g>
        ))}
        <circle r="2.2" fill="#8c2f1a" fillOpacity="0.8" />
        <circle r="1" cx="-0.4" cy="-0.4" fill="#f0a083" fillOpacity="0.7" />
      </g>
    </svg>
  )
}
