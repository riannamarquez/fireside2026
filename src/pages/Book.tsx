// /book — the Family Book: one chapter opener per life stage, the approved letters in it as
// cards (tap a title to read), sealed letters for this reader as envelopes, and a signature.
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getLetterShelf, getLifeMap, listMemos, listVisibleChapters, type LetterShelf } from '../api'
import { EnvelopeSheet, LetterInfoSheet } from '../components/FamilySheets'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Card } from '../components/ui/Card'
import { ChapterHeader } from '../components/ui/ChapterHeader'
import { EnvelopeCard } from '../components/ui/EnvelopeCard'
import { HeaderIconButton } from '../components/ui/AppHeader'
import { HouseBackdrop } from '../components/ui/HouseBackdrop'
import { PillInput } from '../components/ui/OptionList'
import { SignatureLine } from '../components/ui/SignatureLine'
import { cjkName, sealFor } from '../lib/illustrations'
import { useIsStoryteller } from '../lib/useViewer'
import { Avatar } from '../components/ui/Avatar'
import type { Chapter, Envelope, LifeStage, Memo } from '../types'

type Part = { number: number; stage?: LifeStage; chapters: Chapter[]; envelopes: Envelope[] }

// Approved chapters (and sealed envelopes for this reader) grouped by life stage, in timeline
// order (getLifeMap sorts by start year). Anything whose stage we can't find goes in a final part.
function groupIntoParts(chapters: Chapter[], stages: LifeStage[], envelopes: Envelope[]): Part[] {
  const parts: Part[] = []
  for (const stage of stages) {
    const inStage = chapters.filter((c) => c.stageId === stage.id)
    const sealed = envelopes.filter((e) => e.stageId === stage.id)
    if (inStage.length || sealed.length) parts.push({ number: parts.length + 1, stage, chapters: inStage, envelopes: sealed })
  }
  const known = new Set(stages.map((s) => s.id))
  const rest = chapters.filter((c) => !known.has(c.stageId))
  const restEnvelopes = envelopes.filter((e) => !e.stageId || !known.has(e.stageId))
  if (rest.length || restEnvelopes.length) parts.push({ number: parts.length + 1, chapters: rest, envelopes: restEnvelopes })
  return parts
}

const dayLabel = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined

export default function Book() {
  const [parts, setParts] = useState<Part[] | null>(null)
  const [stages, setStages] = useState<LifeStage[]>([])
  const [memos, setMemos] = useState<Memo[]>([])
  const [shelf, setShelf] = useState<LetterShelf | null>(null)
  const [signature, setSignature] = useState('家書')
  const navigate = useNavigate()
  const isStoryteller = useIsStoryteller()
  // Family side: details open in bottom sheets so the reader keeps their place.
  const [sheetChapter, setSheetChapter] = useState<Chapter | null>(null)
  const [sheetEnvelope, setSheetEnvelope] = useState<Envelope | null>(null)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    Promise.all([listVisibleChapters(), getLifeMap(), listMemos(), getLetterShelf()])
      .then(([chapters, map, m, letterShelf]) => {
        // Letters this reader has opened become normal pages in the book.
        const approved = [...chapters.filter((c) => c.status === 'approved'), ...letterShelf.openedChapters]
        setStages(map?.stages ?? [])
        setParts(groupIntoParts(approved, map?.stages ?? [], letterShelf.envelopes))
        setShelf(letterShelf)
        setMemos(m)
        setSignature(cjkName(map?.name) ?? '家書')
      })
      .catch((err) => {
        console.error(err)
        setParts([])
      })
  }, [])

  // Every recording behind a chapter, in passage order.
  const memosFor = (c: Chapter) => [...new Set(c.passages.map((p) => p.memoId))].map((id) => memos.find((m) => m.id === id)).filter(Boolean) as Memo[]

  const q = query.trim().toLowerCase()
  const matches = (c: Chapter) => !q || c.title.toLowerCase().includes(q) || c.passages.some((p) => p.text.toLowerCase().includes(q))
  const shown = (parts ?? []).map((p) => ({ ...p, chapters: p.chapters.filter(matches), envelopes: q ? [] : p.envelopes })).filter((p) => p.chapters.length || p.envelopes.length)

  const fromName = shelf?.fromName ?? ''
  const forToday = q ? [] : (shelf?.envelopes.filter((e) => e.openable) ?? [])
  const waiting = shelf?.waitingForOthers ?? 0

  const searchButton = (
    <HeaderIconButton
      label={searching ? 'Close search' : 'Search the book'}
      active={searching}
      onClick={() => {
        setSearching((s) => !s)
        setQuery('')
      }}
    >
      {searching ? <X size={22} strokeWidth={1.5} aria-hidden="true" /> : <Search size={22} strokeWidth={1.5} aria-hidden="true" />}
    </HeaderIconButton>
  )

  return (
    <AppShell spine subtitle="Family Book" divider right={searchButton}>
      {searching && <PillInput autoFocus type="search" aria-label="Search the book" placeholder="Search for a place, a person, a taste…" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-4" />}

      {parts === null && <p className="text-body pt-10 text-center text-muted">Opening your book…</p>}

      {parts !== null && shown.length === 0 && forToday.length === 0 && (
        <Card className="mt-4 overflow-hidden px-6 py-10 text-center">
          <h1 className="text-title mt-4">{q ? 'Nothing found' : 'The book is still being written'}</h1>
          <p className="text-body mx-auto mt-3 max-w-[280px] text-muted">
            {q ? 'Try another word.' : 'Your family’s book will appear here once letters are approved.'}
          </p>
        </Card>
      )}

      {forToday.length > 0 && (
        <div className="mb-2 space-y-4 pt-2">
          {forToday.map((e) => (
            <EnvelopeCard key={e.id} envelope={e} onOpen={() => setSheetEnvelope(e)} />
          ))}
        </div>
      )}

      {shown.length > 0 && <HouseBackdrop className="top-28 -right-16 w-[280px] opacity-45" />}
      {shown.map((part) => (
        <section key={part.number} className="relative pb-4">
          <ChapterHeader
            number={part.number}
            title={part.stage?.label || 'More letters'}
            description={part.stage ? [part.stage.years, part.stage.place].filter(Boolean).join(' · ') : undefined}
            seal={sealFor(part.stage)}
          />
          <div className="space-y-4">
            {part.chapters.map((chapter) => {
              const recs = memosFor(chapter)
              // Storyteller: her own letter opens as a full screen. Family: a details sheet.
              const openDetails = isStoryteller ? (chapter.letterId ? () => navigate(`/letterbox/${chapter.letterId}`) : undefined) : () => setSheetChapter(chapter)
              return (
                <AudioCard
                  key={chapter.id}
                  title={chapter.title}
                  meta={dayLabel(recs[0]?.createdAt)}
                  urls={recs.map((m) => m.audioUrl)}
                  from={fromName || undefined}
                  thumb={<Avatar name={fromName} size={96} />}
                  onTitleClick={openDetails}
                  onMore={openDetails}
                />
              )
            })}
            {part.envelopes.filter((e) => !e.openable).map((e) => (
              <EnvelopeCard key={e.id} envelope={e} onOpen={isStoryteller ? undefined : () => setSheetEnvelope(e)} />
            ))}
          </div>
        </section>
      ))}

      {parts !== null && waiting > 0 && !q && (
        <p className="text-meta pt-6 text-center text-[15px]">
          {fromName} has {waiting} {waiting === 1 ? 'letter' : 'letters'} waiting for {shelf?.isStoryteller ? 'the family' : 'others'}.
        </p>
      )}

      {parts !== null && (
        <footer className="relative mt-8 flex min-h-28 items-end">
          <SignatureLine className="relative ml-auto" seal={signature} />
        </footer>
      )}

      <LetterInfoSheet
        chapter={sheetChapter}
        memos={sheetChapter ? memosFor(sheetChapter) : []}
        stage={stages.find((s) => s.id === sheetChapter?.stageId)}
        onClose={() => setSheetChapter(null)}
      />
      <EnvelopeSheet envelope={sheetEnvelope} onClose={() => setSheetEnvelope(null)} />
    </AppShell>
  )
}
