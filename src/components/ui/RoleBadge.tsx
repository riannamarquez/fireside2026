import type { FamilyRole } from '../../types'

const roles: Record<FamilyRole, { label: string; className: string }> = {
  organizer: { label: 'Organizer', className: 'bg-sage text-pine' },
  storyteller: { label: 'Storyteller', className: 'bg-vermilion/10 text-vermilion-dark' },
  reader: { label: 'Reader', className: 'bg-parchment text-muted' },
  member: { label: 'Reader', className: 'bg-parchment text-muted' }, // legacy role from before storyteller/reader existed
}

export function RoleBadge({ role }: { role: FamilyRole }) {
  const { label, className } = roles[role]
  return <span className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 font-serif text-[13.5px] ${className}`}>{label}</span>
}
