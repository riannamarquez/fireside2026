import { User, Users } from 'lucide-react'
import { useState } from 'react'
import { avatarSlot, illustrationUrl } from '../../lib/illustrations'
import { initials } from '../../lib/format'

// A round portrait from public/illustrations/avatar-<name>.png when there is one, else initials.
export function Avatar({ name, size = 40, group = false }: { name?: string | null; size?: number; group?: boolean }) {
  const slot = group ? null : avatarSlot(name)
  const [loaded, setLoaded] = useState(false)
  const [missing, setMissing] = useState(false)
  const letters = initials(name).slice(0, 2)
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/[0.06] bg-sage font-display font-semibold text-pine"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {group ? <Users size={Math.round(size * 0.45)} strokeWidth={1.5} /> : letters || <User size={Math.round(size * 0.45)} strokeWidth={1.5} />}
      {slot && !missing && <img src={illustrationUrl(slot)} alt="" onLoad={() => setLoaded(true)} onError={() => setMissing(true)} className={`absolute inset-0 size-full object-cover ${loaded ? '' : 'opacity-0'}`} />}
    </span>
  )
}
