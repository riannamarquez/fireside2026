// /letterbox/:id — one of the storyteller's letters, as a full screen with big worded buttons:
// Listen again, Change the day, Change when, Change who it's for, Release now, Delete.
// Every change is its own full-screen step ending in a plain-words confirm. No sheets, no menus.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { decideRelease, deleteLetter, finishLetter, getReleasePresets, listMyLetters, releaseLetterNow } from '../api'
import { ReleaseStepOptions } from '../components/ReleaseSteps'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Avatar } from '../components/ui/Avatar'
import { PrimaryButton, SecondaryButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ListenButton } from '../components/ui/ListenButton'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionHeader } from '../components/ui/SectionHeader'
import { STICKY_ACTION_BAR_HEIGHT, StickyActionBar } from '../components/ui/StickyActionBar'
import { formatMemoDate } from '../lib/format'
import { openedSummary, recipientNames, releaseSummary } from '../lib/letterText'
import { choosesRecipients, releaseSentence, releaseSteps, STEP_TITLES, stepProblem, type ReleaseStep } from '../lib/releaseFlow'
import { useViewer } from '../lib/useViewer'
import type { FamilyMember, Letter, LetterReply, ReleaseChoice, ReleasePreset } from '../types'

type Edit = 'day' | 'who' | 'when'
type Screen = { kind: 'overview' } | { kind: 'step'; edit: Edit; step: ReleaseStep } | { kind: 'confirm'; edit: Edit } | { kind: 'release' } | { kind: 'delete' }

const choiceOf = (l: Letter): ReleaseChoice => ({ releaseMode: l.releaseMode, releaseAt: l.releaseAt, recipients: l.recipients, keeperId: l.keeperId })

export default function LetterDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const viewer = useViewer()
  const [letter, setLetter] = useState<Letter | null | undefined>(undefined)
  const [replies, setReplies] = useState<LetterReply[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [presets, setPresets] = useState<ReleasePreset[]>([])
  const [screen, setScreen] = useState<Screen>({ kind: 'overview' })
  const [choice, setChoice] = useState<ReleaseChoice | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const [mine, p] = await Promise.all([listMyLetters(), getReleasePresets()])
    const found = mine.letters.find((l) => l.id === id) ?? null
    setLetter(found)
    setReplies(mine.replies.filter((r) => r.letterId === id))
    setMembers(mine.members)
    setPresets(p)
  }

  useEffect(() => {
    if (viewer?.isStoryteller) load().catch((err) => (console.error(err), setLetter(null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, id])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setError(null)
  }, [screen])

  if (viewer && !viewer.isStoryteller) {
    return (
      <AppShell back="/book">
        <PageHeader title="This letter isn’t for you" subtitle={`Only ${viewer.storytellerName} can see her letters here.`} />
        <PrimaryButton onClick={() => navigate('/book')}>Open the family book</PrimaryButton>
      </AppShell>
    )
  }

  if (letter === undefined) {
    return (
      <AppShell back="/letterbox" labeledBack>
        <p className="text-body pt-10 text-center text-muted">Opening your letter…</p>
      </AppShell>
    )
  }

  if (letter === null) {
    return (
      <AppShell back="/letterbox" labeledBack>
        <PageHeader title="This letter is gone" subtitle="It may have been deleted." />
        <PrimaryButton large onClick={() => navigate('/letterbox')}>
          Back to my letterbox
        </PrimaryButton>
      </AppShell>
    )
  }

  const others = members.filter((m) => m.role !== 'storyteller')
  const opened = Object.keys(letter.openedAt).length > 0

  async function run(action: () => Promise<unknown>, after: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      after()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  // The steps of a change: just the day, just who, or the whole "when" (which may add steps).
  const stepsFor = (edit: Edit, c: ReleaseChoice): ReleaseStep[] => (edit === 'when' ? releaseSteps(c) : [edit])

  function startEdit(edit: Edit) {
    const c = choiceOf(letter!)
    // Undecided letters start from "Now"; recipients default to the whole family when sealing.
    setChoice({ ...c, recipients: c.recipients === 'all' || c.recipients.length ? c.recipients : 'all' })
    setScreen({ kind: 'step', edit, step: stepsFor(edit, c)[0]! })
  }

  // --- a change, one step per screen ---
  if (screen.kind === 'step' && choice) {
    const steps = stepsFor(screen.edit, choice)
    const i = steps.indexOf(screen.step)
    const back = () => (i <= 0 ? setScreen({ kind: 'overview' }) : setScreen({ kind: 'step', edit: screen.edit, step: steps[i - 1]! }))
    const next = () => {
      const problem = stepProblem(screen.step, choice)
      if (problem) return setError(problem)
      const after = steps[i + 1]
      setScreen(after ? { kind: 'step', edit: screen.edit, step: after } : { kind: 'confirm', edit: screen.edit })
    }
    const { title, subtitle } = STEP_TITLES[screen.step]
    return (
      <AppShell
        onBack={back}
        labeledBack
        step={`Step ${i + 1} of ${steps.length + 1}`}
        floatingHeight={STICKY_ACTION_BAR_HEIGHT}
        floating={<StickyActionBar onBack={back} onContinue={next} />}
      >
        <PageHeader title={title} subtitle={subtitle} />
        <div className="space-y-4">
          <ReleaseStepOptions step={screen.step} value={choice} onChange={(c) => (setChoice(c), setError(null))} presets={presets} members={others} />
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      </AppShell>
    )
  }

  // --- confirm a change in plain words ---
  if (screen.kind === 'confirm' && choice) {
    const steps = stepsFor(screen.edit, choice)
    const back = () => setScreen({ kind: 'step', edit: screen.edit, step: steps[steps.length - 1]! })
    return (
      <AppShell
        onBack={back}
        labeledBack
        step={`Step ${steps.length + 1} of ${steps.length + 1}`}
        floatingHeight={STICKY_ACTION_BAR_HEIGHT}
        floating={
          <StickyActionBar
            onBack={back}
            continueDisabled={busy}
            continueLabel={busy ? 'Saving…' : 'Save these changes'}
            onContinue={() => run(() => decideRelease(letter.id, choice), () => load().then(() => setScreen({ kind: 'overview' })))}
          />
        }
      >
        <PageHeader title="Is this right?" subtitle={`“${letter.title}”`} />
        <Card tone="sage" className="text-center">
          <p className="text-title text-[27px]">{releaseSentence(choice, others)}</p>
        </Card>
        {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      </AppShell>
    )
  }

  // --- release now: a confirm step of its own ---
  if (screen.kind === 'release') {
    const back = () => setScreen({ kind: 'overview' })
    const what =
      letter.releaseMode === 'private' || !letter.decided
        ? 'It goes to the family book. Your family can read it once it’s approved.'
        : `${recipientNames(letter.recipients, others)} can open it today.`
    return (
      <AppShell
        onBack={back}
        labeledBack
        floatingHeight={STICKY_ACTION_BAR_HEIGHT}
        floating={<StickyActionBar onBack={back} continueDisabled={busy} continueLabel={busy ? 'Releasing…' : 'Release now'} onContinue={() => run(() => releaseLetterNow(letter.id), () => load().then(() => setScreen({ kind: 'overview' })))} />}
      >
        <PageHeader title="Release this letter now?" subtitle={`“${letter.title}”`} />
        <Card tone="sage" className="text-center">
          <p className="text-title text-[27px]">{what}</p>
        </Card>
        {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      </AppShell>
    )
  }

  // --- delete: a confirm step of its own ---
  if (screen.kind === 'delete') {
    const back = () => setScreen({ kind: 'overview' })
    return (
      <AppShell
        onBack={back}
        labeledBack
        floatingHeight={STICKY_ACTION_BAR_HEIGHT}
        floating={<StickyActionBar onBack={back} backLabel="Keep it" danger continueDisabled={busy} continueLabel={busy ? 'Deleting…' : 'Delete this letter'} onContinue={() => run(() => deleteLetter(letter.id), () => navigate('/letterbox'))} />}
      >
        <PageHeader title="Delete this letter?" subtitle={`“${letter.title}”`} />
        <Card tone="parchment" className="text-center">
          <p className="text-title text-[27px]">This can’t be undone. The recording and everything with it will be gone.</p>
        </Card>
        {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      </AppShell>
    )
  }

  // --- overview ---
  const urls = [...letter.psPieces, ...letter.pieces].map((p) => p.audioUrl)
  const details = [
    formatMemoDate(letter.createdAt),
    letter.status === 'in_progress' ? 'In progress' : null,
    letter.pieces.length > 1 ? `${letter.pieces.length} parts` : null,
    letter.psPieces.length ? 'with a P.S.' : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <AppShell back="/letterbox" labeledBack>
      <PageHeader title={letter.title} subtitle={releaseSummary(letter, members)} />
      <p className="text-meta -mt-3 mb-6 text-center text-[15px]">{details}</p>
      <div className="space-y-3">
        <ListenButton urls={urls} />
        {opened ? (
          <Notice>{openedSummary(letter, members)}. Once a letter is opened, it can’t be changed.</Notice>
        ) : (
          <>
            {letter.releaseMode === 'date' && (
              <SecondaryButton large onClick={() => startEdit('day')}>
                Change the day
              </SecondaryButton>
            )}
            <SecondaryButton large onClick={() => startEdit('when')}>
              {letter.decided ? 'Change when they hear it' : 'Choose when they hear it'}
            </SecondaryButton>
            {letter.decided && choosesRecipients(choiceOf(letter)) && (
              <SecondaryButton large onClick={() => startEdit('who')}>
                Change who it’s for
              </SecondaryButton>
            )}
            {letter.releaseMode !== 'now' && (
              <SecondaryButton large onClick={() => setScreen({ kind: 'release' })}>
                Release now
              </SecondaryButton>
            )}
            {letter.status === 'in_progress' && letter.releaseMode !== 'now' && (
              <>
                <SecondaryButton large onClick={() => navigate(`/record?add=${letter.id}`)}>
                  Add to this letter
                </SecondaryButton>
                <SecondaryButton large disabled={busy} onClick={() => run(() => finishLetter(letter.id), () => load())}>
                  This letter is finished
                </SecondaryButton>
              </>
            )}
            <PrimaryButton large danger arrow={false} onClick={() => setScreen({ kind: 'delete' })}>
              Delete
            </PrimaryButton>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </div>

      {replies.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Replies" />
          <div className="space-y-4">
            {replies.map((r) => (
              <AudioCard key={r.id} title={`From ${r.memberName}`} meta={formatMemoDate(r.createdAt)} audioUrl={r.audioUrl} thumb={<Avatar name={r.memberName} size={96} />} />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}
