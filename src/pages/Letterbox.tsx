// /letterbox — the storyteller's home: record a letter, tell something she's never told anyone,
// hear replies, and manage her letters. Only she can see or change these (checked in api.ts).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getMyName, getViewer, listMyLetters, type Viewer } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Avatar } from '../components/ui/Avatar'
import { PrimaryButton, SecondaryButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordButton } from '../components/ui/RecordButton'
import { SectionHeader } from '../components/ui/SectionHeader'
import { formatMemoDate } from '../lib/format'
import { openedSummary, releaseSummary } from '../lib/letterText'
import type { FamilyMember, Letter, LetterReply } from '../types'

type Data = { letters: Letter[]; replies: LetterReply[]; members: FamilyMember[] }

const RECENT = 3

const GROUPS: { key: string; title: string; test: (l: Letter) => boolean }[] = [
  { key: 'undecided', title: 'Not sent yet', test: (l) => !l.decided },
  { key: 'sealed', title: 'Sealed', test: (l) => l.decided && (l.releaseMode === 'date' || l.releaseMode === 'after') },
  { key: 'private', title: 'Only for you', test: (l) => l.decided && l.releaseMode === 'private' },
  { key: 'sent', title: 'In the family book', test: (l) => l.decided && l.releaseMode === 'now' },
]

export default function Letterbox() {
  const navigate = useNavigate()
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState(false)

  async function load() {
    const v = await getViewer()
    setViewer(v)
    if (!v.isStoryteller) return
    const d = await listMyLetters()
    setData(d)
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err)
      setError(true)
    })
  }, [])

  if (viewer && !viewer.isStoryteller) {
    return (
      <AppShell>
        <PageHeader title={`${viewer.storytellerName}’s letterbox`} subtitle={`Only ${viewer.storytellerName} can open her letterbox. Letters she shares are in the family book.`} />
        <PrimaryButton onClick={() => navigate('/book')}>Open the family book</PrimaryButton>
      </AppShell>
    )
  }

  const titleOf = (letterId: string) => data?.letters.find((l) => l.id === letterId)?.title ?? 'a letter'
  const letters = data?.letters ?? []

  return (
    <AppShell hero="hero-grandma">
      <PageHeader title="What do you remember?" subtitle="A place, a person, a taste, a moment." />

      <RecordButton onClick={() => navigate('/record?start=1')} />
      <div className="mt-1 text-center">
        <SecondaryButton large className="mt-2" onClick={() => navigate('/record?secret=1')}>
          Something you’ve never told anyone
        </SecondaryButton>
      </div>

      {error && (
        <Notice tone="error" className="mt-6">
          We couldn’t load your letters. Check your connection and refresh.
        </Notice>
      )}

      {data && data.replies.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Replies from your family" />
          <div className="space-y-4">
            {data.replies.map((r) => (
              <AudioCard key={r.id} title={`From ${r.memberName}`} meta={`About “${titleOf(r.letterId)}”`} audioUrl={r.audioUrl} thumb={<Avatar name={r.memberName} size={96} />} />
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="mt-8">
          <SectionHeader
            title={showAll ? 'My letters' : 'Recent'}
            action={letters.length > RECENT || showAll ? { label: showAll ? 'Show less' : 'See all', onClick: () => setShowAll((s) => !s) } : undefined}
          />
          {letters.length === 0 && (
            <Card className="text-center">
              <p className="text-body text-muted">Your letters will show up here. Only you can see them.</p>
            </Card>
          )}
          {showAll ? (
            GROUPS.map((g) => {
              const inGroup = letters.filter(g.test)
              if (!inGroup.length) return null
              return (
                <div key={g.key} className="mt-5 first:mt-0">
                  <p className="text-eyebrow mb-3">{g.title}</p>
                  <div className="space-y-4">
                    {inGroup.map((l) => (
                      <LetterItem key={l.id} letter={l} members={data.members} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="space-y-4">
              {letters.slice(0, RECENT).map((l) => (
                <LetterItem key={l.id} letter={l} members={data.members} />
              ))}
            </div>
          )}
          {letters.length > 0 && <p className="text-meta mt-4 text-center">Only you can see these letters.</p>}
        </section>
      )}
    </AppShell>
  )
}

// One of her letters: listen right here, or open it (full screen) to change or release it.
function LetterItem({ letter, members }: { letter: Letter; members: FamilyMember[] }) {
  const navigate = useNavigate()
  const note = [
    letter.status === 'in_progress' ? 'In progress' : null,
    releaseSummary(letter, members),
    letter.pieces.length > 1 ? `${letter.pieces.length} parts` : null,
    letter.psPieces.length ? 'with a P.S.' : null,
    openedSummary(letter, members),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AudioCard title={letter.title} meta={formatMemoDate(letter.createdAt)} note={note} urls={[...letter.psPieces, ...letter.pieces].map((p) => p.audioUrl)} from="you" thumb={letter.photoUrl ? <img src={letter.photoUrl} alt="" className="size-full object-cover" /> : <Avatar name={getMyName()} size={96} />}>
      <SecondaryButton large onClick={() => navigate(`/letterbox/${letter.id}`)}>
        Open this letter
      </SecondaryButton>
    </AudioCard>
  )
}
