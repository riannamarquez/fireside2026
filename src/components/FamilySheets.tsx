// Bottom sheets for the family side: a letter's details, a sealed envelope, a family member.
// Readers stay on the page underneath. (The storyteller gets full screens instead.)
import { BookOpen, Languages, Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { formatDuration } from '../lib/format'
import { useTotalDuration } from '../lib/useDurations'
import type { Chapter, Envelope, FamilyMember, LifeStage, Memo } from '../types'
import { BottomSheet, SheetFacts, type Detent } from './ui/BottomSheet'
import { PrimaryButton, SecondaryButton } from './ui/Button'
import { EnvelopeArt } from './ui/EnvelopeCard'
import { ListenButton } from './ui/ListenButton'
import { RoleBadge } from './ui/RoleBadge'
import { Avatar } from './ui/Avatar'
import { StoryPassages } from './ui/story'

const day = (iso: string | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—')

// Family Book: a letter's ⋮ → recorded date, life stage, length; play, transcript, original language.
export function LetterInfoSheet({ chapter, memos, stage, onClose }: { chapter: Chapter | null; memos: Memo[]; stage?: LifeStage; onClose: () => void }) {
  const [detent, setDetent] = useState<Detent>('medium')
  const [showing, setShowing] = useState<'none' | 'transcript' | 'original'>('none')
  const urls = memos.map((m) => m.audioUrl).filter(Boolean)
  const total = useTotalDuration(urls)
  // "Original language" only when a recording has a translation that differs from what she said.
  const originals = memos.filter((m) => m.tags?.language && m.tags.transcript_en?.trim() && m.transcript?.trim() !== m.tags.transcript_en.trim())

  function show(what: 'transcript' | 'original') {
    setShowing(what)
    setDetent('large')
  }

  return (
    <BottomSheet
      open={!!chapter}
      onClose={() => {
        setShowing('none')
        setDetent('medium')
        onClose()
      }}
      title={chapter?.title ?? ''}
      detent={detent}
      onDetentChange={setDetent}
    >
      {chapter && (
        <div className="space-y-4">
          <SheetFacts
            items={[
              { label: 'Recorded', value: day(memos[0]?.createdAt) },
              { label: 'Life stage', value: stage?.label ?? '—' },
              { label: 'Length', value: total ? formatDuration(total) : '—' },
              ...(memos.length > 1 ? [{ label: 'Parts', value: String(memos.length) }] : []),
            ]}
          />
          <ListenButton urls={urls} label="Play from the start" />
          <SecondaryButton icon={<BookOpen size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={() => (showing === 'transcript' ? setShowing('none') : show('transcript'))}>
            {showing === 'transcript' ? 'Hide the transcript' : 'Read the transcript'}
          </SecondaryButton>
          {originals.length > 0 && (
            <SecondaryButton icon={<Languages size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={() => (showing === 'original' ? setShowing('none') : show('original'))}>
              {showing === 'original' ? 'Hide the original language' : 'Hear in original language'}
            </SecondaryButton>
          )}
          {showing === 'transcript' && (
            <div className="pt-2">
              <StoryPassages passages={chapter.passages} />
            </div>
          )}
          {showing === 'original' && (
            <div className="space-y-4 pt-2">
              {originals.map((m) => (
                <div key={m.id}>
                  <p className="text-eyebrow">{m.tags?.language}</p>
                  <p className="text-story mt-1">{m.transcript}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

// A sealed envelope: who, for whom, when. Never anything about what's inside.
export function EnvelopeSheet({ envelope, onClose }: { envelope: Envelope | null; onClose: () => void }) {
  const navigate = useNavigate()
  const when = envelope?.openable ? 'It’s ready to open today.' : envelope?.opensLabel.startsWith('Opens when') ? 'It will open when the time comes.' : 'It will open on this day.'
  return (
    <BottomSheet open={!!envelope} onClose={onClose} title={envelope ? `From ${envelope.fromName} · For ${envelope.forNames}` : ''}>
      {envelope && (
        <div className="space-y-4">
          <div className="surface-card overflow-hidden p-1.5">
            <EnvelopeArt className="block h-36 w-full rounded-[12px]" />
          </div>
          <p className="flex items-center gap-2 font-serif text-[18px] text-ink">
            {envelope.openable ? <LockOpen size={18} strokeWidth={1.75} className="text-pine" aria-hidden="true" /> : <Lock size={18} strokeWidth={1.75} className="text-vermilion" aria-hidden="true" />}
            {envelope.opensLabel}
          </p>
          <p className="text-body text-muted">
            {envelope.fromName} sealed this letter for {envelope.forNames === 'the family' ? 'the family' : 'you'}. {when}
          </p>
          {envelope.openable && <PrimaryButton onClick={() => navigate(`/letter/${envelope.id}`)}>Open the letter</PrimaryButton>}
        </div>
      )}
    </BottomSheet>
  )
}

// Family page: a member's name, relationship, role, and how many letters wait for them (a count only).
export function MemberSheet({ member, waiting, onClose }: { member: FamilyMember | null; waiting: number | undefined; onClose: () => void }) {
  return (
    <BottomSheet open={!!member} onClose={onClose} title={member?.name ?? ''}>
      {member && (
        <div className="space-y-4">
          <Avatar name={member.name} size={64} />
          <SheetFacts
            items={[
              { label: 'Relationship', value: member.relationship?.split('·')[0]?.trim() || '—' },
              { label: 'Role', value: <RoleBadge role={member.role} /> },
              ...(member.role === 'storyteller' ? [] : [{ label: 'Letters waiting for them', value: waiting === undefined ? '—' : String(waiting) }]),
            ]}
          />
        </div>
      )}
    </BottomSheet>
  )
}
