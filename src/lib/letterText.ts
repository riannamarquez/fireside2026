// Plain-language release info for the storyteller's "My letters".
import type { FamilyMember, Letter, Recipients } from '../types'
import { formatDay } from './today'

export function recipientNames(recipients: Recipients, members: FamilyMember[]): string {
  if (recipients === 'all') return 'the whole family'
  const names = recipients.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean) as string[]
  if (names.length <= 1) return names[0] ?? 'no one yet'
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

const nameOf = (id: string | undefined, members: FamilyMember[]) => members.find((m) => m.id === id)?.name ?? 'someone'

export function releaseSummary(l: Letter, members: FamilyMember[]): string {
  if (!l.decided) return 'Not sent yet · choose when your family hears it'
  switch (l.releaseMode) {
    case 'now':
      return 'Shared with the family book'
    case 'private':
      return 'Only for you'
    case 'date':
      return `For ${recipientNames(l.recipients, members)} · opens ${l.releaseAt ? formatDay(l.releaseAt) : 'on a special day'}`
    case 'after':
      return `For ${recipientNames(l.recipients, members)} · when you’re gone · ${nameOf(l.keeperId, members)} keeps it${l.keeperReleasedAt ? ' (released)' : ''}`
  }
}

export function openedSummary(l: Letter, members: FamilyMember[]): string | null {
  const names = Object.keys(l.openedAt).map((id) => nameOf(id, members))
  return names.length ? `Opened by ${names.join(', ')}` : null
}

export const PS_PROMPT_LABEL = {
  ps: 'P.S.',
  why: 'Why I’m telling you this',
  hope: 'What I hope you understand',
} as const
