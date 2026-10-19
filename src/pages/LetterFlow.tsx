// /record — the storyteller's letter flow, one full screen per decision, big labeled Back and
// Continue on every step (no sheets, no gestures):
//   record → when → (who) → (which day | who keeps it) → (P.S.) → (people) → confirm → done
// Steps that don't apply are skipped. The recording is saved the moment she stops, and going
// Back keeps every choice. ?secret=1 starts a sealed letter; ?add=<letterId> adds a piece to a
// letter in progress; ?start=1 starts recording right away (the Letterbox mic).
import { Check, EyeOff, Info, PenLine, UserCheck } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  addLetterPiece,
  addPsPiece,
  checkSensitive,
  createLetter,
  decideRelease,
  findMentionedPeople,
  finishLetter,
  forgetPiece,
  getReleasePresets,
  listMyLetters,
  setNameChoices as saveNameChoices,
  updatePieceTranscript,
} from '../api'
import { MiniRecorder } from '../components/MiniRecorder'
import { ReleaseStepOptions } from '../components/ReleaseSteps'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Avatar } from '../components/ui/Avatar'
import { PrimaryButton, SecondaryButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextArea } from '../components/ui/Field'
import { Notice } from '../components/ui/Notice'
import { OptionList, OptionRow, PillInput } from '../components/ui/OptionList'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordButton } from '../components/ui/RecordButton'
import { Segmented } from '../components/ui/Segmented'
import { STICKY_ACTION_BAR_HEIGHT, StickyActionBar } from '../components/ui/StickyActionBar'
import { formatDuration } from '../lib/format'
import { PS_PROMPT_LABEL, recipientNames, releaseSummary } from '../lib/letterText'
import { isSealing, releaseActionLabel, releaseSentence, releaseSteps, STEP_TITLES, stepProblem, type ReleaseStep } from '../lib/releaseFlow'
import { useLetterRecorder } from '../lib/useLetterRecorder'
import { useViewer } from '../lib/useViewer'
import type { Letter, NameChoice, Person, ReleaseChoice, ReleasePreset, Sensitivity } from '../types'

type FlowStep = 'record' | ReleaseStep | 'ps' | 'people' | 'confirm'
type Screen = FlowStep | 'saving' | 'transcript' | 'done' | 'added'

// Remount on ?add= / ?secret= changes so each letter starts from a clean slate.
export default function LetterFlowRoute() {
  const { search } = useLocation()
  return <LetterFlow key={search} />
}

const LANGS = [
  { value: 'en-US', label: 'English' },
  { value: 'zh-TW', label: '中文' },
] as const

function LetterFlow() {
  const [params] = useSearchParams()
  const addId = params.get('add')
  const secret = params.get('secret') === '1'
  const autoStart = params.get('start') === '1'
  const navigate = useNavigate()
  const viewer = useViewer()

  const [addTo, setAddTo] = useState<Letter | null>(null)
  const [lang, setLang] = useState<string>('en-US')
  const rec = useLetterRecorder(lang)
  const [screen, setScreen] = useState<Screen>('record')
  const [letter, setLetter] = useState<Letter | null>(null)
  const [pieceId, setPieceId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [sensitivity, setSensitivity] = useState<Sensitivity | null>(null)
  const [choice, setChoice] = useState<ReleaseChoice>({ releaseMode: secret ? 'private' : 'now', recipients: 'all' })
  const [presets, setPresets] = useState<ReleasePreset[]>([])
  const [mentioned, setMentioned] = useState<Person[]>([])
  const [choices, setChoices] = useState<NameChoice[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getReleasePresets().then(setPresets).catch((err) => console.error(err))
    if (addId) {
      listMyLetters()
        .then(({ letters }) => setAddTo(letters.find((l) => l.id === addId) ?? null))
        .catch((err) => console.error(err))
    }
  }, [addId])

  // The Letterbox mic sends ?start=1. A timer (cleared on unmount) so a dev-mode double mount
  // can't open the microphone twice; the ref so a language change doesn't start it again.
  const { start } = rec
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!autoStart || autoStarted.current) return
    const id = window.setTimeout(() => {
      autoStarted.current = true
      start()
    }, 0)
    return () => window.clearTimeout(id)
  }, [autoStart, start])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setError(null)
  }, [screen])

  if (viewer && !viewer.isStoryteller) {
    return (
      <AppShell back="/book">
        <PageHeader title="Letters are written here" subtitle={`Only ${viewer.storytellerName} can record letters. Her shared letters are in the family book.`} />
        <PrimaryButton onClick={() => navigate('/book')}>Open the family book</PrimaryButton>
      </AppShell>
    )
  }

  const privateRoom = secret || !!addId
  const members = viewer?.members.filter((m) => m.role !== 'storyteller') ?? []
  const sealing = isSealing(choice)

  // The steps that apply right now; Back and Continue walk this list.
  const flow: FlowStep[] = [
    'record',
    ...releaseSteps(choice),
    ...(sealing ? (['ps'] as const) : []),
    ...(sealing && mentioned.length ? (['people'] as const) : []),
    'confirm',
  ]
  const stepIndex = flow.indexOf(screen as FlowStep)
  const stepLabel = stepIndex >= 0 ? `Step ${stepIndex + 1} of ${flow.length}` : undefined

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function goBack() {
    if (screen === 'transcript') return setScreen(addTo ? 'added' : 'when')
    if (stepIndex <= 0) return navigate('/letterbox')
    setScreen(flow[stepIndex - 1]!)
  }

  async function goNext() {
    const current = screen as FlowStep
    if (current === 'who' || current === 'day' || current === 'keeper') {
      const problem = stepProblem(current, choice)
      if (problem) return setError(problem)
    }
    // Before sealing, look for people she mentions, so "People in this letter" can follow the P.S.
    let people = mentioned
    if (current === 'when' && sealing && letter) {
      try {
        setBusy(true)
        people = await findMentionedPeople(letter.id)
        setMentioned(people)
        setChoices((prev) =>
          people.map((p) => prev.find((c) => c.personId === p.id) ?? { personId: p.id, choice: 'keep', replacement: p.relation ? `my ${p.relation.toLowerCase()}` : '' }),
        )
      } catch (err) {
        console.error(err)
      } finally {
        setBusy(false)
      }
    }
    const nextFlow: FlowStep[] = ['record', ...releaseSteps(choice), ...(sealing ? (['ps'] as const) : []), ...(sealing && people.length ? (['people'] as const) : []), 'confirm']
    const next = nextFlow[nextFlow.indexOf(current) + 1]
    if (next) setScreen(next)
  }

  async function handleStop() {
    setScreen('saving')
    setError(null)
    const recording = await rec.stop()
    if (!recording) {
      setScreen('record')
      return
    }
    try {
      if (addTo) {
        const updated = await addLetterPiece(addTo.id, recording.blob, recording.transcript)
        setLetter(updated)
        setPieceId(updated.pieces.at(-1)!.id)
        setScreen('added')
      } else {
        const created = await createLetter({ origin: secret ? 'secret' : 'normal', blob: recording.blob, transcript: recording.transcript })
        setLetter(created)
        setPieceId(created.pieces[0]!.id)
        setSensitivity(await checkSensitive(recording.transcript))
        setScreen('when')
      }
      setTranscript(recording.transcript)
    } catch (err) {
      console.error(err)
      setError(`We couldn’t save that recording: ${err instanceof Error ? err.message : err}`)
      setScreen('record')
    }
  }

  // "Forget this": one tap, gone, back to a fresh recording.
  function forgetRecording() {
    if (!letter || !pieceId) return
    run(async () => {
      await forgetPiece(letter.id, pieceId)
      setLetter(null)
      setPieceId(null)
      setTranscript('')
      setSensitivity(null)
      setScreen('record')
    })
  }

  function saveTranscript() {
    if (!letter || !pieceId) return
    run(async () => {
      const updated = await updatePieceTranscript(letter.id, pieceId, transcript)
      setLetter(updated)
      setSensitivity(await checkSensitive(updated.pieces.map((p) => p.transcript ?? '').join('\n')))
      setScreen(addTo ? 'added' : 'when')
    })
  }

  function confirm() {
    if (!letter) return
    run(async () => {
      let updated = await decideRelease(letter.id, choice, sensitivity ?? undefined)
      if (sealing && choices.length) updated = await saveNameChoices(letter.id, choices)
      setLetter(updated)
      setScreen('done')
    })
  }

  function finish() {
    if (!letter) return
    run(async () => setLetter(await finishLetter(letter.id)))
  }

  const errorBox = error && <Notice tone="error">{error}</Notice>
  const letterCard = letter && (
    <AudioCard
      title={letter.title}
      meta="Just now"
      from={viewer ? `${viewer.storytellerName} (you)` : 'you'}
      urls={letter.pieces.map((p) => p.audioUrl)}
      thumb={<Avatar name={viewer?.storytellerName ?? null} size={96} />}
    />
  )

  // One full-screen step: header with "‹ Back" and "Step n of N", content, big Back / Continue.
  const stepShell = (content: ReactNode, { continueLabel = 'Continue', onContinue = goNext, hero = false }: { continueLabel?: string; onContinue?: () => void; hero?: boolean } = {}) => (
    <AppShell
      onBack={goBack}
      labeledBack
      step={stepLabel}
      hero={hero ? 'hero-grandma-tea' : undefined}
      heroSize="short"
      floatingHeight={STICKY_ACTION_BAR_HEIGHT}
      floating={<StickyActionBar onBack={goBack} onContinue={onContinue} continueLabel={busy ? 'Saving…' : continueLabel} continueDisabled={busy} />}
    >
      {content}
    </AppShell>
  )

  // --- 1. record ---
  if (screen === 'record' || screen === 'saving') {
    const recording = rec.recording
    const title = addTo ? 'Add to your letter' : secret ? 'Something you’ve never told anyone' : 'What do you remember?'
    const subtitle = addTo
      ? `Adding part ${addTo.pieces.length + 1} to “${addTo.title}”.`
      : secret
        ? 'It starts sealed. You decide who hears it, and when.'
        : 'A place, a person, a taste, a moment.'
    return (
      <AppShell hero="hero-grandma" back="/letterbox" labeledBack step={addTo ? undefined : `Step 1 of ${flow.length}`}>
        <PageHeader title={title} subtitle={subtitle} />
        {letter && screen === 'record' && !recording ? (
          // Came back from step 2: the recording is safe. Continue, or start over.
          <div className="space-y-4">
            <Notice>Your recording is saved.</Notice>
            {letterCard}
            <PrimaryButton large onClick={() => setScreen('when')}>
              Continue with this recording
            </PrimaryButton>
            <SecondaryButton large onClick={forgetRecording} disabled={busy}>
              Forget it and record again
            </SecondaryButton>
            {errorBox}
          </div>
        ) : (
          <>
            <RecordButton
              state={screen === 'saving' ? 'saving' : recording ? 'recording' : 'idle'}
              onClick={recording ? handleStop : rec.start}
              label={screen === 'saving' ? 'Keeping it safe…' : recording ? `Stop · ${formatDuration(rec.elapsed)}` : addTo ? 'Record the next part' : 'Record a memory'}
              sublabel={recording ? 'Tap the red button to stop' : screen === 'record' ? 'Even one minute is enough.' : undefined}
            />
            <div className="mt-4 space-y-4 text-center">
              {privateRoom && <p className="font-serif text-[18px] text-pine">No one can hear this until you decide.</p>}
              {/* Private room: no live words on screen. */}
              {recording && !privateRoom && rec.liveTranscript && (
                <Card className="text-left">
                  <p className="text-body">{rec.liveTranscript}</p>
                </Card>
              )}
              {recording && (
                <SecondaryButton large onClick={rec.forget}>
                  Forget this
                </SecondaryButton>
              )}
              {!recording && screen === 'record' && <Segmented label="Language" value={lang} onChange={setLang} options={LANGS} />}
              {(rec.error || error) && <Notice tone="error">{rec.error ?? error}</Notice>}
            </div>
          </>
        )}
      </AppShell>
    )
  }

  // --- 2–4. when / who / which day / who keeps it ---
  if ((screen === 'when' || screen === 'who' || screen === 'day' || screen === 'keeper') && letter) {
    const { title, subtitle } = STEP_TITLES[screen]
    return stepShell(
      <>
        <PageHeader title={title} subtitle={subtitle} />
        <div className="space-y-4">
          {screen === 'when' && letterCard}
          {screen === 'when' && sensitivity?.flagged && (
            <Notice icon={<Info size={20} strokeWidth={1.5} className="text-pine" aria-hidden="true" />}>
              This letter mentions some difficult moments. Would you like to choose when your family hears it?
            </Notice>
          )}
          <ReleaseStepOptions step={screen} value={choice} onChange={(c) => (setChoice(c), setError(null))} presets={presets} members={members} />
          {errorBox}
          {screen === 'when' && (
            <SecondaryButton large onClick={() => setScreen('transcript')}>
              Fix what we heard
            </SecondaryButton>
          )}
        </div>
      </>,
      { hero: screen === 'when' },
    )
  }

  // --- fix the transcript: its own screen, reached from step 2 ---
  if (screen === 'transcript' && letter) {
    return (
      <AppShell
        onBack={goBack}
        labeledBack
        floatingHeight={STICKY_ACTION_BAR_HEIGHT}
        floating={<StickyActionBar onBack={goBack} onContinue={saveTranscript} continueLabel={busy ? 'Saving…' : 'Save'} continueDisabled={busy} />}
      >
        <PageHeader title="What we heard" subtitle={transcript ? 'Fix anything we got wrong.' : 'We couldn’t hear the words, so you can type them here.'} />
        <TextArea aria-label="What we heard" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        {error && (
          <Notice tone="error" className="mt-4">
            {error}
          </Notice>
        )}
      </AppShell>
    )
  }

  // --- 5. P.S. (optional) ---
  if (screen === 'ps' && letter) {
    const forWhom = recipientNames(choice.recipients, members)
    const addPs = (prompt: 'ps' | 'why' | 'hope') => async (r: { blob: Blob; transcript: string }) => {
      setLetter(await addPsPiece(letter.id, prompt, r.blob, r.transcript))
    }
    return stepShell(
      <>
        <PageHeader title="Add a P.S." subtitle={`A few words just for ${forWhom}. They’ll hear it first, before the letter. This is optional.`} />
        <div className="space-y-4">
          <MiniRecorder label="P.S." hint={`Talk to ${forWhom} directly.`} lang={lang} onSave={addPs('ps')} />
          <MiniRecorder label="Why are you telling them this?" hint="Optional" lang={lang} onSave={addPs('why')} />
          <MiniRecorder label="What do you hope they understand?" hint="Optional" lang={lang} onSave={addPs('hope')} />
          {letter.psPieces.length > 0 && (
            <Card>
              <p className="text-card-title">Saved</p>
              <ul className="mt-1 divide-y divide-hairline">
                {letter.psPieces.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <Check size={18} strokeWidth={1.75} className="shrink-0 text-pine" aria-hidden="true" />
                    <span className="text-body min-w-0 flex-1">{PS_PROMPT_LABEL[p.prompt ?? 'ps']}</span>
                    <SecondaryButton
                      compact
                      className="w-auto"
                      onClick={() =>
                        run(async () => {
                          await forgetPiece(letter.id, p.id)
                          setLetter({ ...letter, psPieces: letter.psPieces.filter((x) => x.id !== p.id) })
                        })
                      }
                    >
                      Forget this
                    </SecondaryButton>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {errorBox}
        </div>
      </>,
      { continueLabel: letter.psPieces.length ? 'Continue' : 'Skip the P.S.' },
    )
  }

  // --- 6. people in this letter ---
  if (screen === 'people' && letter) {
    return stepShell(
      <>
        <PageHeader title="People in this letter" subtitle={`${mentioned.map((p) => p.name).join(', ')}. Choose how each of them appears.`} />
        <div className="space-y-4">
          {mentioned.map((person) => {
            const c = choices.find((x) => x.personId === person.id)
            if (!c) return null
            const update = (patch: Partial<NameChoice>) => setChoices((prev) => prev.map((x) => (x.personId === person.id ? { ...x, ...patch } : x)))
            return (
              <Card key={person.id}>
                <p className="text-card-title text-[21px]">{person.name}</p>
                {person.relation && <p className="text-meta">{person.relation}</p>}
                <OptionList label={`How ${person.name} appears`} className="-mx-2 mt-3">
                  <OptionRow selected={c.choice === 'keep'} onSelect={() => update({ choice: 'keep' })} icon={UserCheck} title="Keep the name" />
                  <OptionRow selected={c.choice === 'replace'} onSelect={() => update({ choice: 'replace' })} icon={PenLine} title="Replace it with a description">
                    <PillInput aria-label={`Description for ${person.name}`} value={c.replacement ?? ''} onChange={(e) => update({ replacement: e.target.value })} placeholder="my brother" />
                  </OptionRow>
                  <OptionRow selected={c.choice === 'exclude'} onSelect={() => update({ choice: 'exclude' })} icon={EyeOff} title={`Never show this letter to ${person.name}`} />
                </OptionList>
              </Card>
            )
          })}
          {errorBox}
        </div>
      </>,
    )
  }

  // --- 7. confirm: the choice read back in plain words ---
  if (screen === 'confirm' && letter) {
    const replaced = choices.some((c) => c.choice === 'replace')
    const excluded = choices
      .filter((c) => c.choice === 'exclude')
      .map((c) => mentioned.find((p) => p.id === c.personId)?.name)
      .filter(Boolean)
    return stepShell(
      <>
        <PageHeader title="Is this right?" />
        <Card tone="sage" className="text-center">
          <p className="text-title text-[27px]">{releaseSentence(choice, members)}</p>
        </Card>
        <div className="mt-4 space-y-4">
          {letterCard}
          <ul className="text-body space-y-1 text-muted">
            <li>
              {letter.pieces.length} {letter.pieces.length === 1 ? 'recording' : 'recordings'}
              {letter.psPieces.length ? ', with a P.S.' : ''}
            </li>
            {sealing && replaced && <li>Some names will be replaced with a description.</li>}
            {sealing && excluded.length > 0 && <li>{excluded.join(', ')} will never see it.</li>}
          </ul>
          {errorBox}
        </div>
      </>,
      { continueLabel: releaseActionLabel(choice), onContinue: confirm },
    )
  }

  // --- added a piece to a letter in progress ---
  if (screen === 'added' && letter) {
    return (
      <AppShell back="/letterbox" labeledBack>
        <PageHeader title="Added to your letter" subtitle={`“${letter.title}” now has ${letter.pieces.length} parts. They’ll be played in order.`} />
        <div className="space-y-4">
          {letterCard}
          {errorBox}
          {letter.status === 'finished' ? (
            <Notice>This letter is finished.</Notice>
          ) : (
            <>
              <PrimaryButton large onClick={() => navigate(`/record?add=${letter.id}&n=${letter.pieces.length}`)}>
                Add another piece
              </PrimaryButton>
              <SecondaryButton large disabled={busy} onClick={finish}>
                This letter is finished
              </SecondaryButton>
            </>
          )}
          <SecondaryButton large onClick={() => setScreen('transcript')}>
            Fix what we heard
          </SecondaryButton>
          <SecondaryButton large disabled={busy} onClick={forgetRecording}>
            Forget this piece
          </SecondaryButton>
          <SecondaryButton large onClick={() => navigate('/letterbox')}>
            Back to my letterbox
          </SecondaryButton>
        </div>
      </AppShell>
    )
  }

  // --- done ---
  if (screen === 'done' && letter) {
    const title =
      letter.releaseMode === 'now' ? 'Sent to your family book'
      : letter.releaseMode === 'private' ? 'Kept just for you'
      : 'Your letter is sealed'
    const subtitle =
      letter.releaseMode === 'now' ? 'Your family can read it once it’s approved in Review.'
      : letter.releaseMode === 'private' ? 'No one can hear this until you decide. You can share it any time from your letters.'
      : releaseSummary(letter, viewer?.members ?? [])
    return (
      <AppShell back="/letterbox" labeledBack>
        <PageHeader title={title} subtitle={subtitle} />
        <div className="space-y-4">
          {letterCard}
          {letter.releaseMode !== 'now' &&
            (letter.status === 'in_progress' ? (
              <Card>
                <p className="text-card-title">Is this letter finished?</p>
                <p className="text-meta mt-1 text-[15px]">You can tell it in pieces. Add more any time{sealing ? '. It reaches them only once it’s finished.' : '.'}</p>
                <div className="mt-4 space-y-3">
                  <PrimaryButton large disabled={busy} onClick={finish}>
                    This letter is finished
                  </PrimaryButton>
                  <SecondaryButton large onClick={() => navigate(`/record?add=${letter.id}`)}>
                    Add to this letter
                  </SecondaryButton>
                </div>
              </Card>
            ) : (
              <Notice>This letter is finished.{sealing && ' Only you can change it, until someone opens it.'}</Notice>
            ))}
          {errorBox}
          {letter.releaseMode === 'now' && (
            <SecondaryButton large onClick={() => navigate('/chapters')}>
              See it in Review
            </SecondaryButton>
          )}
          <PrimaryButton large onClick={() => navigate('/letterbox')}>
            Back to my letterbox
          </PrimaryButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell back="/letterbox" labeledBack>
      <p className="text-body pt-10 text-center text-muted">Loading…</p>
    </AppShell>
  )
}
