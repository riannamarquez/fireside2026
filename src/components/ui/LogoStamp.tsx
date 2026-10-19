// The Postscript logo: a vertical vermilion chop with 家 over 書 carved in cream, hand-pressed
// edges, faint ink texture, tilted -3°. Inline SVG with real text, so it's crisp at any size.
// public/favicon.svg is the same drawing; keep them in sync.
import { useSvgId } from './Illustration'

export const LOGO_TEXT = '家書'

const SIZES = { sm: 32, md: 64, lg: 160, xl: 220 } as const

export type LogoSize = keyof typeof SIZES | number

export function LogoStamp({ size = 'md', className = '' }: { size?: LogoSize; className?: string }) {
  const id = useSvgId('logo')
  const height = typeof size === 'number' ? size : SIZES[size]
  const width = Math.round(height * 0.62)
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 62 100"
      className={`shrink-0 -rotate-3 ${className}`}
      role="img"
      aria-label="Postscript logo"
    >
      <defs>
        {/* Uneven, hand-pressed outline */}
        <filter id={`${id}-press`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="11" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Ink that didn't take: cream speckles over the red */}
        <filter id={`${id}-ink`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="5" result="n" />
          <feColorMatrix in="n" values="0 0 0 0 0.96  0 0 0 0 0.94  0 0 0 0 0.89  0 0 0 -2.6 1.45" result="speckle" />
          <feComposite in="speckle" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-press)`}>
        <rect x="3" y="3" width="56" height="94" rx="3" fill="#c8492f" />
        <rect x="7.5" y="7.5" width="47" height="85" rx="1.5" fill="none" stroke="#f5efe3" strokeWidth="1.6" />
        <g fill="#f5efe3" fontFamily="'Noto Serif TC', 'Songti TC', serif" fontWeight="700" fontSize="34" textAnchor="middle">
          <text x="31" y="45">家</text>
          <text x="31" y="83">書</text>
        </g>
      </g>
      <rect x="3" y="3" width="56" height="94" rx="3" fill="#c8492f" filter={`url(#${id}-ink)`} opacity="0.32" />
    </svg>
  )
}
