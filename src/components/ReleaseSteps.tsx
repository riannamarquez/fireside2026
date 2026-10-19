// The body of each release step screen: one question, one list of choices. No pop-ups,
// no expanders beyond the date field inside "Pick a date".
import { CalendarDays, Feather, Lock, Send, Users } from 'lucide-react'
import { useState } from 'react'
import type { ReleaseStep } from '../lib/releaseFlow'
import { formatDay, todayString } from '../lib/today'
import type { FamilyMember, ReleaseChoice, ReleaseMode, ReleasePreset } from '../types'
import { OptionList, OptionRow, PillInput } from './ui/OptionList'

type StepProps = {
  step: ReleaseStep
  value: ReleaseChoice
  onChange: (choice: ReleaseChoice) => void
  presets: ReleasePreset[]
  members: FamilyMember[] // family members other than the storyteller
}

const MODES: { mode: ReleaseMode; label: string; hint: string; icon: typeof Send }[] = [
  { mode: 'now', label: 'Now', hint: 'They can hear it right away, once it’s in the book.', icon: Send },
  { mode: 'date', label: 'On a special day', hint: 'Choose a date for it to be released.', icon: CalendarDays },
  { mode: 'after', label: 'When I am gone', hint: 'Release after I pass away.', icon: Feather },
  { mode: 'private', label: 'Only for me', hint: 'Keep it private in my book.', icon: Lock },
]

export function ReleaseStepOptions(props: StepProps) {
  switch (props.step) {
    case 'when':
      return <WhenOptions {...props} />
    case 'who':
      return <WhoOptions {...props} />
    case 'day':
      return <DayOptions {...props} />
    case 'keeper':
      return <KeeperOptions {...props} />
  }
}

function WhenOptions({ value, onChange }: StepProps) {
  return (
    <OptionList label="When should they hear it">
      {MODES.map(({ mode, label, hint, icon }) => (
        <OptionRow key={mode} selected={value.releaseMode === mode} onSelect={() => onChange({ ...value, releaseMode: mode })} icon={icon} title={label} subtitle={hint} />
      ))}
    </OptionList>
  )
}

function WhoOptions({ value, onChange, members }: StepProps) {
  function toggle(id: string) {
    const current = value.recipients === 'all' ? [] : value.recipients
    onChange({ ...value, recipients: current.includes(id) ? current.filter((r) => r !== id) : [...current, id] })
  }
  return (
    <OptionList label="Who is it for">
      <OptionRow type="check" icon={Users} selected={value.recipients === 'all'} onSelect={() => onChange({ ...value, recipients: value.recipients === 'all' ? [] : 'all' })} title="The whole family" subtitle="Everyone in your family book" />
      {members.map((m) => (
        <OptionRow key={m.id} type="check" selected={value.recipients !== 'all' && value.recipients.includes(m.id)} onSelect={() => toggle(m.id)} title={`For ${m.name}`} subtitle={m.relationship} />
      ))}
    </OptionList>
  )
}

function DayOptions({ value, onChange, presets }: StepProps) {
  const matching = presets.find((p) => p.date === value.releaseAt)
  const [picking, setPicking] = useState(!!value.releaseAt && !matching)
  const forWhom = value.recipients === 'all' ? null : value.recipients
  // Birthdays of the people it's for come first.
  const sorted = forWhom ? [...presets].sort((a, b) => Number(!!b.memberId && forWhom.includes(b.memberId)) - Number(!!a.memberId && forWhom.includes(a.memberId))) : presets
  return (
    <OptionList label="Which day">
      {sorted.map((p) => (
        <OptionRow
          key={p.id}
          icon={CalendarDays}
          selected={!picking && value.releaseAt === p.date && matching?.id === p.id}
          onSelect={() => {
            setPicking(false)
            onChange({ ...value, releaseAt: p.date })
          }}
          title={p.label.split(' — ')[0]}
          subtitle={formatDay(p.date)}
        />
      ))}
      <OptionRow icon={CalendarDays} selected={picking} onSelect={() => setPicking(true)} title="Pick a date" subtitle="Any day in the future">
        <PillInput type="date" aria-label="Pick a date" min={todayString()} value={value.releaseAt ?? ''} onChange={(e) => onChange({ ...value, releaseAt: e.target.value || undefined })} />
      </OptionRow>
    </OptionList>
  )
}

function KeeperOptions({ value, onChange, members }: StepProps) {
  return (
    <OptionList label="Who keeps it">
      {members.map((m) => (
        <OptionRow key={m.id} selected={value.keeperId === m.id} onSelect={() => onChange({ ...value, keeperId: m.id })} title={m.name} subtitle={m.relationship} />
      ))}
    </OptionList>
  )
}
