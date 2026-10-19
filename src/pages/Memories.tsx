// Every memo with its transcript and AI tags, grouped by life stage (timeline) or by place.
// Each life stage can be turned into a draft chapter, which then shows up in Review.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { generateChapter, getLifeMap, listMemos, reprocessMemo } from '../api'
import { AudioCard } from '../components/ui/AudioCard'
import { PrimaryButton, SecondaryButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Segmented } from '../components/ui/Segmented'
import { thumbFor } from '../lib/illustrations'
import type { LifeStage, Memo } from '../types'

type GroupBy = 'stage' | 'place'
type Group = { key: string; title: string; subtitle?: string; stageId?: string; memos: Memo[] }

function yearsOf(m: Memo) {
  const t = m.tags
  if (!t?.year_start) return null
  const range = t.year_end && t.year_end !== t.year_start ? `${t.year_start}–${t.year_end}` : `${t.year_start}`
  return t.year_is_estimate ? `~${range}` : range
}

function byYear(a: Memo, b: Memo) {
  return (a.tags?.year_start ?? 9999) - (b.tags?.year_start ?? 9999) || a.createdAt.localeCompare(b.createdAt)
}

function groupMemos(memos: Memo[], stages: LifeStage[], by: GroupBy): Group[] {
  if (by === 'stage') {
    const groups: Group[] = stages.map((s) => ({
      key: s.id,
      title: s.label,
      subtitle: [s.years, s.place].filter(Boolean).join(' · '),
      stageId: s.id,
      memos: memos.filter((m) => m.stageId === s.id).sort(byYear),
    }))
    const unplaced = memos.filter((m) => !m.stageId || !stages.some((s) => s.id === m.stageId))
    if (unplaced.length) groups.push({ key: 'unplaced', title: 'Not placed yet', memos: unplaced.sort(byYear) })
    return groups
  }

  const map = new Map<string, Memo[]>()
  for (const m of memos) {
    const place = m.tags?.place?.trim() || 'Unknown place'
    map.set(place, [...(map.get(place) ?? []), m])
  }
  return [...map.entries()]
    .map(([place, ms]) => ({ key: place, title: place, memos: ms.sort(byYear) }))
    .sort((a, b) => byYear(a.memos[0], b.memos[0]))
}

export default function Memories() {
  const navigate = useNavigate()
  const [memos, setMemos] = useState<Memo[] | null>(null)
  const [stages, setStages] = useState<LifeStage[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>('stage')
  const [writing, setWriting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listMemos(), getLifeMap()])
      .then(([m, map]) => {
        setMemos(m)
        setStages(map?.stages ?? [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  async function writeChapter(stageId: string) {
    setWriting(stageId)
    setError(null)
    try {
      await generateChapter(stageId)
      navigate('/review')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setWriting(null)
    }
  }

  if (memos === null) return error ? <Notice tone="error">{error}</Notice> : <p className="text-body text-center text-muted">Loading…</p>

  const groups = groupMemos(memos, stages, groupBy)

  return (
    <div className="space-y-8">
      <PageHeader title="Memories" subtitle="Every recording, transcribed and placed on the timeline. Turn a life stage into a chapter when it has enough memories." />
      <div className="text-center">
        <Segmented
          label="Group memories"
          value={groupBy}
          onChange={setGroupBy}
          options={[
            { value: 'stage', label: 'By time period' },
            { value: 'place', label: 'By place' },
          ]}
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {memos.length === 0 && <p className="text-body text-center text-muted">No recordings yet.</p>}

      {groups.map((g) => (
        <section key={g.key}>
          <SectionHeader title={g.title} />
          <p className="text-meta -mt-2 mb-3">{[g.subtitle, `${g.memos.length} ${g.memos.length === 1 ? 'memory' : 'memories'}`].filter(Boolean).join(' · ')}</p>
          {groupBy === 'stage' && g.stageId && (
            <SecondaryButton compact className="mb-4" disabled={g.memos.length === 0 || writing !== null} onClick={() => writeChapter(g.stageId!)}>
              {writing === g.stageId ? 'Writing…' : 'Write chapter'}
            </SecondaryButton>
          )}

          {g.memos.length === 0 && <p className="text-meta">Nothing about this period yet.</p>}

          <div className="space-y-4">
            {g.memos.map((m) => (
              <MemoCard
                key={m.id}
                memo={m}
                stages={stages}
                stageLabel={groupBy === 'place' ? stages.find((s) => s.id === m.stageId)?.label : undefined}
                onUpdate={(updated) => setMemos((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? prev)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// Saved without real AI output (backend had no OpenAI key, or an early upload).
const needsRetry = (m: Memo) => !m.transcript?.trim() || m.transcript.startsWith('[stub')

function MemoCard({ memo, stages, stageLabel, onUpdate }: { memo: Memo; stages: LifeStage[]; stageLabel?: string; onUpdate: (m: Memo) => void }) {
  const navigate = useNavigate()
  const t = memo.tags
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  async function retry() {
    setRetrying(true)
    setRetryError(null)
    try {
      onUpdate(await reprocessMemo(memo.id))
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : String(e))
    } finally {
      setRetrying(false)
    }
  }

  if (needsRetry(memo)) {
    return (
      <Card tone="parchment">
        <p className="text-card-title">This recording wasn’t transcribed</p>
        <p className="text-meta mt-1">It was saved before the AI could run. The audio is safe.</p>
        {memo.audioUrl && <AudioCard className="mt-3" title="The recording" audioUrl={memo.audioUrl} thumb={null} />}
        <PrimaryButton compact arrow={false} className="mt-3" onClick={retry} disabled={retrying}>
          {retrying ? 'Transcribing…' : 'Retry transcription'}
        </PrimaryButton>
        {retryError && <Notice tone="error" className="mt-2">{retryError}</Notice>}
      </Card>
    )
  }
  const chips = [stageLabel, yearsOf(memo), t?.place, ...(t?.people ?? []), ...(t?.unmatched_people ?? []).map((p) => `${p} (new)`), ...(t?.themes ?? []), t?.tone].filter(Boolean) as string[]
  const menu = memo.transcript && !t?.sensitive ? [{ label: 'Make it a Storytime book', onSelect: () => navigate(`/storytime/${memo.id}`) }] : []

  return (
    <AudioCard
      title={t?.summary ?? (memo.transcript ? 'Memory' : 'Not transcribed yet')}
      meta={new Date(memo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      note={t?.sensitive ? 'Private' : undefined}
      audioUrl={memo.audioUrl || undefined}
      thumb={thumbFor(memo.stageId, stages)}
      menu={menu}
    >
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span key={i} className="rounded-full bg-parchment px-2.5 py-0.5 font-serif text-[13.5px] text-ink/80">
              {c}
            </span>
          ))}
        </div>
      )}
      {memo.transcript && <Transcript memo={memo} />}
    </AudioCard>
  )
}

// Original-language transcript with an English translation toggle (shown only when they differ).
function Transcript({ memo }: { memo: Memo }) {
  const english = memo.tags?.transcript_en
  const hasTranslation = !!english && english.trim() !== memo.transcript?.trim()
  const [lang, setLang] = useState<'original' | 'english'>('original')
  const text = lang === 'english' && hasTranslation ? english : memo.transcript

  return (
    <details className="mt-3">
      <summary className="text-meta cursor-pointer">Transcript{memo.tags?.language ? ` · ${memo.tags.language}` : ''}</summary>
      {hasTranslation && (
        <div className="mt-2">
          <Segmented
            label="Transcript language"
            value={lang}
            onChange={setLang}
            options={[
              { value: 'original', label: `Original${memo.tags?.language ? ` (${memo.tags.language})` : ''}` },
              { value: 'english', label: 'English' },
            ]}
          />
        </div>
      )}
      <p className="text-body mt-2">{text}</p>
    </details>
  )
}
