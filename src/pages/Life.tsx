import { Pencil, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getLifeMap, getMyName, LIFE_MAP_REPLACES_ON_SAVE, saveLifeMap } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { HouseBackdrop } from '../components/ui/HouseBackdrop'
import { Avatar } from '../components/ui/Avatar'
import { IconButton, TextButton } from '../components/ui/Button'
import { Card, TitledCard } from '../components/ui/Card'
import { Notice } from '../components/ui/Notice'
import { DashedAddButton } from '../components/ui/DashedAddButton'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { STICKY_ACTION_BAR_HEIGHT, StickyActionBar } from '../components/ui/StickyActionBar'
import { formatDay } from '../lib/today'
import type { LifeStage, Person, SpecialDate } from '../types'

// The form edits From/To separately; they're joined into LifeStage.years ("1958–1975") on save.
type StageDraft = { id: string; label: string; from: string; to: string; place: string; livedWith: string }

const newStage = (): StageDraft => ({ id: crypto.randomUUID(), label: '', from: '', to: '', place: '', livedWith: '' })
const newPerson = (): Person => ({ id: crypto.randomUUID(), name: '', nickname: '', relation: '' })

function stageRange(s: StageDraft) {
  if (s.from) return `${s.from}–${s.to || 'Present'}`
  return s.to ? `Until ${s.to}` : ''
}

function fromLifeStage(s: LifeStage): StageDraft {
  const [from = '', to = ''] = s.years.match(/\d{4}/g) ?? []
  return { id: s.id, label: s.label, from, to, place: s.place, livedWith: s.livedWith }
}

function toLifeStage(s: StageDraft): LifeStage {
  return { id: s.id, label: s.label, years: s.from ? `${s.from}–${s.to || 'Present'}` : s.to, place: s.place, livedWith: s.livedWith }
}

const yearInput = { inputMode: 'numeric' as const, maxLength: 4, pattern: '[0-9]*' }

export default function Life() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(() => getMyName() ?? '')
  const [birthYear, setBirthYear] = useState('')
  const firstStage = useState(newStage)[0]
  const firstPerson = useState(newPerson)[0]
  const [stages, setStages] = useState<StageDraft[]>([firstStage])
  const [editingStage, setEditingStage] = useState<string | null>(firstStage.id)
  const [people, setPeople] = useState<Person[]>([firstPerson])
  const [editingPerson, setEditingPerson] = useState<string | null>(firstPerson.id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // Only prefill name/birth year: saveLifeMap inserts rows, so reloading saved
  // stages/people here would duplicate them on the next save (see TODO in api.ts).
  // Demo mode replaces the whole life map on save, so everything can be prefilled there.
  useEffect(() => {
    getLifeMap()
      .then((map) => {
        if (map?.name) setName((n) => n || map.name)
        if (map?.birthYear) setBirthYear((y) => y || String(map.birthYear))
        if (LIFE_MAP_REPLACES_ON_SAVE && map) {
          if (map.stages.length) {
            setStages(map.stages.map(fromLifeStage))
            setEditingStage(null)
          }
          if (map.people.length) {
            setPeople(map.people)
            setEditingPerson(null)
          }
        }
      })
      .catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  function updateStage(id: string, changes: Partial<StageDraft>) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }

  function updatePerson(id: string, changes: Partial<Person>) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)))
  }

  function updateSpecialDate(person: Person, i: number, changes: Partial<SpecialDate>) {
    updatePerson(person.id, { specialDates: (person.specialDates ?? []).map((d, j) => (j === i ? { ...d, ...changes } : d)) })
  }

  const canContinue = step !== 1 || (name.trim() !== '' && /^\d{4}$/.test(birthYear))

  async function handleContinue() {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    setSaving(true)
    setError(false)
    try {
      await saveLifeMap({ name: name.trim(), birthYear: Number(birthYear), stages: stages.map(toLifeStage), people })
      navigate('/letterbox')
    } catch (err) {
      console.error(err)
      setError(true)
      setSaving(false)
    }
  }

  return (
    <AppShell
      back="/family"
      floatingHeight={STICKY_ACTION_BAR_HEIGHT}
      floating={
        <StickyActionBar
          onBack={() => (step === 1 ? navigate('/family') : setStep(step - 1))}
          onContinue={handleContinue}
          continueDisabled={!canContinue || saving}
          continueLabel={step === 3 ? (saving ? 'Saving…' : 'Finish my life map') : 'Continue'}
        />
      }
    >
      <PageHeader
        eyebrow="Your life map"
        counter={`Step ${step} of 3`}
        title="A little context goes a long way."
        subtitle="These details help Postscript place your stories in the right chapter. You can always change them later."
        progress={step / 3}
      />

      {step === 1 && <HouseBackdrop className="top-[566px] -right-6 w-[230px] opacity-50" />}
      {step === 1 && (
        <TitledCard step={1} title="About you">
          <div className="space-y-5">
            <Field label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field
              label="Year you were born"
              placeholder="1958"
              {...yearInput}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </TitledCard>
      )}

      {step === 2 && (
        <TitledCard step={2} title="The chapters of your life" subtitle="Break your story into places and seasons that feel natural to you.">
          <ol className="relative">
            {stages.map((stage) => {
              const editing = stage.id === editingStage
              return (
                <li key={stage.id} className="relative pl-9">
                  {/* timeline line + ring dot */}
                  <span className="absolute top-0 bottom-0 left-[7px] w-px bg-pine/40" aria-hidden="true" />
                  <span
                    className={`absolute left-0 flex size-[15px] items-center justify-center rounded-full border-[1.5px] border-pine bg-card ${editing ? 'top-0.5' : 'top-[22px]'}`}
                    aria-hidden="true"
                  >
                    <span className="size-1.5 rounded-full bg-vermilion" />
                  </span>

                  {editing ? (
                    <div className="space-y-5 pb-6">
                      <Field label="Life stage" placeholder="Childhood" value={stage.label} onChange={(e) => updateStage(stage.id, { label: e.target.value })} />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="From" placeholder="1958" {...yearInput} value={stage.from} onChange={(e) => updateStage(stage.id, { from: e.target.value.replace(/\D/g, '') })} />
                        <Field label="To" placeholder="Present" {...yearInput} value={stage.to} onChange={(e) => updateStage(stage.id, { to: e.target.value.replace(/\D/g, '') })} />
                      </div>
                      <Field label="Place" placeholder="Tainan, Taiwan" value={stage.place} onChange={(e) => updateStage(stage.id, { place: e.target.value })} />
                      <Field
                        label="Who did you live with?"
                        placeholder="Parents, grandparents, cousins"
                        value={stage.livedWith}
                        onChange={(e) => updateStage(stage.id, { livedWith: e.target.value })}
                      />
                      <div className="flex justify-end">
                        <TextButton onClick={() => setEditingStage(null)}>Done</TextButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 border-b border-hairline py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-card-title truncate">{stage.label || 'Untitled stage'}</p>
                        <p className="text-meta truncate">{[stageRange(stage), stage.place].filter(Boolean).join(' · ') || 'Add years and a place'}</p>
                      </div>
                      <IconButton label={`Edit ${stage.label || 'life stage'}`} onClick={() => setEditingStage(stage.id)}>
                        <Pencil size={19} strokeWidth={1.5} aria-hidden="true" />
                      </IconButton>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {/* the line turns grey past the last stage */}
          <div className="relative pt-4 pl-9">
            <span className="absolute top-0 left-[7px] h-4 w-px bg-hairline" aria-hidden="true" />
            <DashedAddButton
              onClick={() => {
                const s = newStage()
                setStages((prev) => [...prev, s])
                setEditingStage(s.id)
              }}
            >
              Add another life stage
            </DashedAddButton>
          </div>
        </TitledCard>
      )}

      {step === 3 && (
        <TitledCard step={3} title="Your people" subtitle="Add the names that come up most often in your stories. Birthdays let you seal a letter for a special day.">
          <ul className="divide-y divide-hairline">
            {people.map((person) =>
              person.id === editingPerson ? (
                <li key={person.id} className="py-3">
                  <Card tone="parchment" className="space-y-4 p-4">
                  <Field label="Name" placeholder="Mei-Ling" value={person.name} onChange={(e) => updatePerson(person.id, { name: e.target.value })} />
                  <Field label="Nickname" placeholder="Optional" value={person.nickname ?? ''} onChange={(e) => updatePerson(person.id, { nickname: e.target.value })} />
                  <Field label="Relationship" placeholder="Cousin" value={person.relation} onChange={(e) => updatePerson(person.id, { relation: e.target.value })} />
                  <Field label="Birthday" type="date" value={person.birthday ?? ''} onChange={(e) => updatePerson(person.id, { birthday: e.target.value || undefined })} />
                  {(person.specialDates ?? []).map((d, i) => (
                    <div key={i} className="space-y-3 rounded-[14px] border border-hairline p-3">
                      <div className="flex items-end gap-2">
                        <Field label="Special date" className="min-w-0 flex-1" placeholder="Wedding day" value={d.label} onChange={(e) => updateSpecialDate(person, i, { label: e.target.value })} />
                        <IconButton label={`Remove ${d.label || 'special date'}`} className="mb-1.5" onClick={() => updatePerson(person.id, { specialDates: (person.specialDates ?? []).filter((_, j) => j !== i) })}>
                          <X size={19} strokeWidth={1.5} aria-hidden="true" />
                        </IconButton>
                      </div>
                      <Field label="Date" type="date" value={d.date} onChange={(e) => updateSpecialDate(person, i, { date: e.target.value })} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <TextButton
                      className="-ml-3"
                      onClick={() => updatePerson(person.id, { specialDates: [...(person.specialDates ?? []), { label: '', date: '' }] })}
                      icon={<Plus size={17} strokeWidth={1.75} aria-hidden="true" />}
                    >
                      Add a special date
                    </TextButton>
                    <TextButton onClick={() => setEditingPerson(null)}>Done</TextButton>
                  </div>
                  </Card>
                </li>
              ) : (
                <li key={person.id} className="flex items-center gap-4 py-3">
                  <Avatar name={person.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="text-card-title truncate">{person.name || 'New person'}</p>
                    <p className="text-meta truncate">
                      {[person.nickname && `“${person.nickname}”`, person.relation, person.birthday && `Born ${formatDay(person.birthday, 'short')}`].filter(Boolean).join(' · ') ||
                        'Tap the pencil to add details'}
                    </p>
                  </div>
                  <IconButton label={`Edit ${person.name || 'person'}`} onClick={() => setEditingPerson(person.id)}>
                    <Pencil size={19} strokeWidth={1.5} aria-hidden="true" />
                  </IconButton>
                </li>
              ),
            )}
          </ul>
          <div className="mt-4">
            <DashedAddButton
              onClick={() => {
                const p = newPerson()
                setPeople((prev) => [...prev, p])
                setEditingPerson(p.id)
              }}
            >
              Add a key person
            </DashedAddButton>
          </div>
        </TitledCard>
      )}

      {error && (
        <Notice tone="error" className="mt-4">
          We couldn’t save your life map. Please try again.
        </Notice>
      )}
    </AppShell>
  )
}
