import { ChopSeal } from './ChopSeal'
import { LOGO_TEXT } from './LogoStamp'

// A small seal, signed at the bottom right of book pages.
export function SignatureLine({ seal = LOGO_TEXT, className = '' }: { seal?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-end ${className}`}>
      <ChopSeal text={seal} size={26} />
    </div>
  )
}
