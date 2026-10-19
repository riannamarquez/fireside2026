import { Check, Clock, EyeOff, MapPin, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getLifeMap, getMyName, listChapters, listMemos, updateChapter } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { PrimaryButton, SecondaryButton, TextButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ChopSeal } from '../components/ui/ChopSeal'
import { TextArea } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import { Notice } from '../components/ui/Notice'
import { Pager } from '../components/ui/Pager'
import { Divider, StoryPassages } from '../components/ui/story'
import { firstName, readMinutes, startYear } from '../lib/format'
import { sealFor } from '../lib/illustrations'
import type { Chapter, LifeStage, Memo } from '../types'

const REVIEW_PANEL_HEIGHT = 128

const statusStyle: Record<Chapter['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-parchment text-muted' },
  approved: { label: 'Approved', className: 'bg-sage text-pine' },
  hidden: { label: 'Hidden', className: 'bg-ink/5 text-muted' },
}

export default function Chapters() {
  const [chapters, setChapters] = useState<Chapter[] | null>(null)
  const [stages, setStages] = useState<LifeStage[]>([])
  const [memos, setMemos] = useState<Memo[]>([])
  const [name, setName] = useState(() => getMyName())
  const [index, setIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([listChapters(), getLifeMap(), listMemos()])
      .then(([c, map, m]) => {
        setChapters(c)
        setStages(map?.stages ?? [])
        if (map?.name) setName(map.name)
        setMemos(m)
        const firstDraft = c.findIndex((ch) => ch.status === 'draft')
        setIndex(firstDraft === -1 ? 0 : firstDraft)
      })
      .catch((err) => {
        console.error(err)
        setChapters([])
        setError(true)
      })
  }, [])

  if (chapters === null) {
    return (
      <AppShell subtitle="Review">
        <p className="text-body pt-10 text-center text-muted">Loading chapters…</p>
      </AppShell>
    )
  }

  if (chapters.length === 0) {
    return (
      <AppShell subtitle="Review">
        <Card className="mt-4 overflow-hidden px-6 py-10 text-center">
          <h1 className="text-title mt-4">No chapters to review yet.</h1>
          <p className="text-body mx-auto mt-3 max-w-[300px] text-muted">
            {error ? 'We couldn’t load your chapters. Check your connection and refresh.' : 'Keep recording. Postscript will write your first chapter soon.'}
          </p>
        </Card>
      </AppShell>
    )
  }

  const chapter = chapters[Math.min(index, chapters.length - 1)]!
  const stage = stages.find((s) => s.id === chapter.stageId)
  const year = startYear(stage?.years)
  const audioUrls = [...new Set(chapter.passages.map((p) => p.memoId))].map((id) => memos.find((m) => m.id === id)?.audioUrl).filter(Boolean) as string[]
  const first = firstName(name)
  const status = statusStyle[chapter.status]

  function replaceChapter(updated: Chapter) {
    setChapters((prev) => prev && prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  function editPassage(i: number, text: string) {
    replaceChapter({ ...chapter, passages: chapter.passages.map((p, j) => (j === i ? { ...p, text } : p)) })
  }

  async function savePassages() {
    try {
      replaceChapter(await updateChapter(chapter.id, { passages: chapter.passages }))
    } catch (err) {
      console.error(err)
    }
  }

  async function setStatus(next: Chapter['status']) {
    if (!chapters) return
    setSaving(true)
    try {
      const updated = await updateChapter(chapter.id, { status: next })
      const list = chapters.map((c) => (c.id === updated.id ? updated : c))
      setChapters(list)
      setEditing(false)
      // Move on to the next draft, wrapping around; stay put if none are left.
      const i = list.indexOf(updated)
      for (let step = 1; step < list.length; step++) {
        const j = (i + step) % list.length
        if (list[j]!.status === 'draft') {
          setIndex(j)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          break
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      subtitle="Review"
      floatingHeight={REVIEW_PANEL_HEIGHT}
      floating={
        <div className="surface-card p-4">
          <p className="text-center font-serif text-[17px] text-ink">Does this feel true to your memory?</p>
          <div className="mt-3 flex gap-3">
            <SecondaryButton compact onClick={() => setStatus('hidden')} disabled={saving} className="w-[38%]" icon={<EyeOff size={18} strokeWidth={1.5} aria-hidden="true" />}>
              Hide
            </SecondaryButton>
            <PrimaryButton compact arrow={false} onClick={() => setStatus('approved')} disabled={saving} className="flex-1" icon={<Check size={18} strokeWidth={1.75} aria-hidden="true" />}>
              Approve
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex h-7 items-center rounded-full px-3 font-serif text-[13.5px] ${status.className}`}>{status.label}</span>
        <TextButton onClick={() => setEditing((e) => !e)} aria-pressed={editing} icon={editing ? <Check size={17} strokeWidth={1.75} aria-hidden="true" /> : <Pencil size={17} strokeWidth={1.5} aria-hidden="true" />}>
          {editing ? 'Done' : 'Edit chapter'}
        </TextButton>
      </div>

      {chapters.length > 1 && (
        <div className="mt-3">
          <Pager
            index={index}
            count={chapters.length}
            label="Chapter"
            onPrev={() => {
              setIndex(index - 1)
              setEditing(false)
            }}
            onNext={() => {
              setIndex(index + 1)
              setEditing(false)
            }}
          />
        </div>
      )}

      <article className="surface-card relative mt-4 px-5 py-7">
        <p className="font-display text-[54px] leading-none font-semibold text-vermilion">{String(index + 1).padStart(2, '0')}</p>
        <h1 className="text-display-xl mt-2 pr-10">{chapter.title}</h1>
        <ChopSeal text={sealFor(stage)} size={28} className="absolute top-8 right-5" />
        <div className="text-meta mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {(stage?.place || year) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
              {[stage?.place, year].filter(Boolean).join(' · ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} strokeWidth={1.5} aria-hidden="true" />
            {readMinutes(chapter.passages)} min read
          </span>
        </div>
        <Divider className="my-6" />

        {editing ? (
          <div className="space-y-3">
            {chapter.passages.map((p, i) => (
              <TextArea key={i} aria-label={`Passage ${i + 1}`} value={p.text} onChange={(e) => editPassage(i, e.target.value)} onBlur={savePassages} />
            ))}
          </div>
        ) : (
          <StoryPassages passages={chapter.passages} />
        )}

        {audioUrls.length > 0 && (
          <AudioCard className="mt-7" title={first ? `Hear ${first} tell it` : 'Hear the original recording'} urls={audioUrls} from={first || undefined} thumb={<Avatar name={name} size={96} />} />
        )}
      </article>

      {error && <Notice tone="error" className="mt-4">We couldn’t load everything. Refresh to try again.</Notice>}
    </AppShell>
  )
}
