// A small red carved seal (印章): characters in reserved white on vermilion, slightly rotated,
// with worn edges. Two characters stack vertically; four sit in a 2×2 grid read right to left.
import { useSvgId } from './Illustration'
import { LOGO_TEXT, LogoStamp } from './LogoStamp'

export function ChopSeal({ text, size = 34, className = '' }: { text: string; size?: number; className?: string }) {
  // 家書 is the Postscript logo: always draw it with the one shared mark.
  if (text === LOGO_TEXT) return <LogoStamp size={Math.round(size * 1.7)} className={className} />
  return <CarvedSeal text={text} size={size} className={className} />
}

function CarvedSeal({ text, size, className }: { text: string; size: number; className: string }) {
  const id = useSvgId('chop')
  const chars = [...text].slice(0, 4)
  const height = chars.length === 2 ? size * 1.7 : size
  const width = size
  // Columns run right to left, top to bottom.
  const cells =
    chars.length === 4 ? [
      { c: chars[0]!, x: 0.72, y: 0.36 },
      { c: chars[1]!, x: 0.72, y: 0.78 },
      { c: chars[2]!, x: 0.28, y: 0.36 },
      { c: chars[3]!, x: 0.28, y: 0.78 },
    ]
    : chars.length === 2 ? [
      { c: chars[0]!, x: 0.5, y: 0.4 },
      { c: chars[1]!, x: 0.5, y: 0.86 },
    ]
    : chars.map((c, i) => ({ c, x: 0.5, y: (i + 0.8) / chars.length }))
  const fontSize = chars.length === 4 ? size * 0.4 : size * 0.62

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 -rotate-[4deg] ${className}`}
      role="img"
      aria-label={`Seal: ${text}`}
    >
      <defs>
        <filter id={`${id}-rough`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <filter id={`${id}-wear`}>
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7" result="n" />
          <feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.25" result="speckle" />
          <feComposite in="speckle" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-rough)`}>
        <rect x="1.5" y="1.5" width={width - 3} height={height - 3} rx="2" fill="#c8492f" />
        <rect x="3.5" y="3.5" width={width - 7} height={height - 7} rx="1" fill="none" stroke="#fbf7ef" strokeOpacity="0.85" strokeWidth="1" />
        {cells.map(({ c, x, y }, i) => (
          <text
            key={i}
            x={width * x}
            y={height * y}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily="'Noto Serif TC', 'Songti TC', 'PMingLiU', serif"
            fontWeight="700"
            fill="#fbf7ef"
          >
            {c}
          </text>
        ))}
      </g>
      <rect x="0" y="0" width={width} height={height} fill="#c8492f" opacity="0.18" filter={`url(#${id}-wear)`} />
    </svg>
  )
}
