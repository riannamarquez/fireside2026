// "On a special day" presets built from the intake: birthdays (an 18th for anyone under 18)
// and special dates like a wedding day, each on its next occurrence after today.
import type { Person, ReleasePreset } from '../types'
import { formatDay, getToday, toDateString } from './today'

const ORDINAL = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!)
}

function parse(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return y && m && d ? { y, m, d } : null
}

// Next time this month/day comes around, today included.
function nextOccurrence(m: number, d: number, today: Date): Date {
  const thisYear = new Date(today.getFullYear(), m - 1, d)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return thisYear >= startOfToday ? thisYear : new Date(today.getFullYear() + 1, m - 1, d)
}

const possessive = (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`)

export function releasePresets(people: Person[]): ReleasePreset[] {
  const today = getToday()
  const presets: ReleasePreset[] = []
  for (const p of people) {
    const name = p.name.trim()
    if (!name) continue
    const born = p.birthday ? parse(p.birthday) : null
    if (born) {
      const age = today.getFullYear() - born.y
      if (age < 18) {
        const date = toDateString(new Date(born.y + 18, born.m - 1, born.d))
        presets.push({ id: `${p.id}-18`, label: `${possessive(name)} ${ORDINAL(18)} birthday — ${formatDay(date, 'short')}`, date, memberId: p.memberId })
      }
      const next = nextOccurrence(born.m, born.d, today)
      const date = toDateString(next)
      presets.push({ id: `${p.id}-bday`, label: `${possessive(name)} birthday — ${formatDay(date, 'short')}`, date, memberId: p.memberId })
    }
    for (const [i, sd] of (p.specialDates ?? []).entries()) {
      const when = parse(sd.date)
      if (!sd.label.trim() || !when) continue
      const original = new Date(when.y, when.m - 1, when.d)
      const date = toDateString(original >= today ? original : nextOccurrence(when.m, when.d, today))
      presets.push({ id: `${p.id}-sd${i}`, label: `${sd.label} — ${formatDay(date, 'short')}`, date, memberId: p.memberId })
    }
  }
  return presets.sort((a, b) => a.date.localeCompare(b.date))
}
