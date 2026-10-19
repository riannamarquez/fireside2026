// /letter/:id — open or read a letter. Readers see an envelope until it's openable; on the day:
// "Open now / Later / Open with someone", then heads-up (if sensitive) → P.S. → the letter →
// a voice reply. api.ts decides how much of the letter this viewer may see.
import { Copy, Info, Lock, LockOpen } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { addReply, getLetter, getLifeMap, getViewer, markLetterOpened, releaseAsKeeper } from '../api'
import { MiniRecorder } from '../components/MiniRecorder'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Avatar } from '../components/ui/Avatar'
import { PrimaryButton, SecondaryButton, TextButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ChopSeal } from '../components/ui/ChopSeal'
import { EnvelopeArt } from '../components/ui/EnvelopeCard'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionHeader } from '../components/ui/SectionHeader'
import { SignatureLine } from '../components/ui/SignatureLine'
import { DropCapParagraph } from '../components/ui/story'
import { cjkName, sealFor } from '../lib/illustrations'
import { PS_PROMPT_LABEL, releaseSummary } from '../lib/letterText'
import { publicBaseUrl } from '../lib/qrApi'
import type { FamilyMember, Letter, LetterAccess, LetterReply, LifeStage } from '../types'

type Phase = 'choices' | 'together' | 'headsup' | 'ps' | 'letter'

export default function LetterPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [access, setAccess] = useState<LetterAccess | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [stages, setStages] = useState<LifeStage[]>([])
  const [signature, setSignature] = useState('家書')
  const [phase, setPhase] = useState<Phase>('choices')
  const [confirmRelease, setConfirmRelease] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const [a, v, map] = await Promise.all([getLetter(id), getViewer(), getLifeMap()])
    setAccess(a)
    setMembers(v.members)
    setStages(map?.stages ?? [])
    setSignature(cjkName(map?.name) ?? '家書')
    if (a.kind === 'reader' && a.opened) setPhase('letter')
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err)
      setAccess({ kind: 'hidden' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [phase])

  // Opening is recorded once the letter itself is on screen.
  useEffect(() => {
    if (phase === 'letter' && access?.kind === 'reader' && !access.opened) {
      markLetterOpened(id).catch((err) => console.error(err))
    }
  }, [phase, access, id])

  if (access === null) {
    return (
      <AppShell back="/book">
        <p className="text-body pt-10 text-center text-muted">Opening…</p>
      </AppShell>
    )
  }

  if (access.kind === 'hidden') {
    return (
      <AppShell back="/book">
        <PageHeader title="This letter isn’t for you" subtitle="Letters are only shown to the people they were written for." />
        <PrimaryButton onClick={() => navigate('/book')}>Open the family book</PrimaryButton>
      </AppShell>
    )
  }

  if (access.kind === 'envelope') {
    const { envelope } = access
    return (
      <AppShell back="/book">
        <BigEnvelope />
        <div className="mt-6 text-center">
          <p className="flex items-center justify-center gap-2 font-serif text-[22px] text-ink">
            <Lock size={20} strokeWidth={1.75} className="text-vermilion" aria-hidden="true" />
            From {envelope.fromName} · For {envelope.forNames}
          </p>
          <p className="text-meta mt-2 text-[15px]">{envelope.opensLabel}</p>
        </div>

        {access.canKeeperRelease && (
          <Card className="mt-8">
            <p className="text-card-title">{envelope.fromName} asked you to keep her letters until the time comes.</p>
            {confirmRelease ? (
              <div className="mt-4 space-y-3">
                <Notice tone="quiet">This opens every letter {envelope.fromName} left for when she’s gone, for everyone she chose. It can’t be undone.</Notice>
                <div className="flex gap-3">
                  <SecondaryButton compact onClick={() => setConfirmRelease(false)}>
                    Not yet
                  </SecondaryButton>
                  <PrimaryButton
                    compact
                    arrow={false}
                    onClick={() =>
                      releaseAsKeeper()
                        .then(() => load())
                        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
                    }
                  >
                    Release them
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <PrimaryButton className="mt-4" onClick={() => setConfirmRelease(true)}>
                Release {envelope.fromName}’s letters
              </PrimaryButton>
            )}
            {error && <Notice tone="error" className="mt-3">{error}</Notice>}
          </Card>
        )}
      </AppShell>
    )
  }

  if (access.kind === 'author') {
    const { letter, replies } = access
    return (
      <AppShell back={`/letterbox/${letter.id}`} labeledBack>
        <LetterTitle eyebrow="Your letter" title={letter.title} sub={releaseSummary(letter, members)} seal={sealFor(stages.find((s) => s.id === letter.stageId))} />
        <LetterBody letter={letter} fromName="you" />
        <Replies replies={replies} title="Replies" />
        <SignatureLine className="mt-10" seal={signature} />
      </AppShell>
    )
  }

  // --- reader ---
  const { letter, fromName, replies } = access
  const afterOpen = () => setPhase(letter.sensitive.flagged ? 'headsup' : letter.psPieces.length ? 'ps' : 'letter')
  const afterHeadsUp = () => setPhase(letter.psPieces.length ? 'ps' : 'letter')

  if (phase === 'choices') {
    return (
      <AppShell back="/book">
        <BigEnvelope />
        <div className="mt-6 text-center">
          <p className="flex items-center justify-center gap-2 font-serif text-[17px] text-pine">
            <LockOpen size={18} strokeWidth={1.75} aria-hidden="true" />
            Ready to open
          </p>
          <h1 className="text-title mt-2">{fromName} left you a letter for today</h1>
        </div>
        <div className="mt-8 space-y-3">
          <PrimaryButton onClick={afterOpen}>Open now</PrimaryButton>
          <SecondaryButton onClick={() => setPhase('together')}>Open with someone</SecondaryButton>
          <div className="text-center">
            <TextButton tone="muted" onClick={() => navigate('/book')}>
              Later
            </TextButton>
          </div>
        </div>
      </AppShell>
    )
  }

  if (phase === 'together') {
    return <OpenTogether id={id} fromName={fromName} onOpen={afterOpen} />
  }

  if (phase === 'headsup') {
    return (
      <AppShell back="/book">
        <Card className="mt-6 px-6 py-10 text-center">
          <p className="text-title">This letter is about difficult things in our family.</p>
          <p className="text-body mt-4 text-muted">Open it when you’re ready.</p>
          <div className="mt-8 space-y-3">
            <PrimaryButton onClick={afterHeadsUp}>I’m ready</PrimaryButton>
            <TextButton tone="muted" onClick={() => navigate('/book')}>
              Later
            </TextButton>
          </div>
        </Card>
      </AppShell>
    )
  }

  if (phase === 'ps') {
    return (
      <AppShell back="/book">
        <PageHeader eyebrow={`A P.S. from ${fromName}`} title="Before you read" subtitle={`${fromName} recorded this just for you.`} />
        <div className="space-y-5">
          <AudioCard
            title={letter.psPieces.map((p) => PS_PROMPT_LABEL[p.prompt ?? 'ps']).join(' · ')}
            meta={`From ${fromName}`}
            urls={letter.psPieces.map((p) => p.audioUrl)}
            thumb={<Avatar name={fromName} size={96} />}
            autoPlay
          />
          {letter.psPieces.map((p) => p.transcript && <p key={p.id} className="text-story">{p.transcript}</p>)}
          <PrimaryButton onClick={() => setPhase('letter')}>Read the letter</PrimaryButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell back="/book">
      <LetterTitle eyebrow={`A letter from ${fromName}`} title={letter.title} seal={sealFor(stages.find((s) => s.id === letter.stageId))} />
      {/* P.S. and replies live in a sheet, so the letter itself stays on the page. */}
      <div className="-mt-4 mb-8">
        <SecondaryButton compact className="w-auto" aria-haspopup="dialog" onClick={() => setDetailsOpen(true)} icon={<Info size={17} strokeWidth={1.5} aria-hidden="true" />}>
          Details
        </SecondaryButton>
      </div>
      <LetterBody letter={letter} fromName={fromName} showPs={false} />

      {letter.sensitive.mentalHealth && (
        <p className="text-meta mt-10 border-t border-hairline pt-6 text-[14.5px] leading-[1.6]">
          If any of this feels close to home, you don’t have to carry it alone. In the US, call or text 988 to reach the Suicide &amp; Crisis Lifeline, any time.
        </p>
      )}

      <section className="mt-10">
        <SectionHeader title="Reply in your voice" />
        <MiniRecorder
          label={`Send ${fromName} a voice reply`}
          hint={`A few words is enough. “Thank you, ${fromName}.”`}
          onSave={async (r) => {
            const reply = await addReply(letter.id, r.blob)
            setAccess({ ...access, replies: [...replies, reply] })
          }}
        />
        {replies.length > 0 && <p className="text-meta mt-3 text-center">Your replies are under Details.</p>}
      </section>
      <SignatureLine className="mt-10" seal={signature} />

      <BottomSheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Details">
        <div className="space-y-6">
          <section>
            <p className="text-eyebrow mb-3">{fromName}’s P.S.</p>
            {letter.psPieces.length ? (
              <div className="space-y-3">
                <AudioCard
                  title={letter.psPieces.map((p) => PS_PROMPT_LABEL[p.prompt ?? 'ps']).join(' · ')}
                  meta={`From ${fromName}`}
                  urls={letter.psPieces.map((p) => p.audioUrl)}
                  thumb={<Avatar name={fromName} size={96} />}
                />
                {letter.psPieces.map((p) => p.transcript && <p key={p.id} className="text-body">{p.transcript}</p>)}
              </div>
            ) : (
              <p className="text-body text-muted">No P.S. with this letter.</p>
            )}
          </section>
          <section>
            <p className="text-eyebrow mb-3">Voice replies</p>
            {replies.length ? <Replies replies={replies} title="" /> : <p className="text-body text-muted">No replies yet. You can send one at the end of the letter.</p>}
          </section>
        </div>
      </BottomSheet>
    </AppShell>
  )
}

function BigEnvelope() {
  return (
    <div className="surface-card mx-auto mt-4 overflow-hidden p-2">
      <EnvelopeArt className="block h-[230px] w-full rounded-[12px]" />
    </div>
  )
}

function LetterTitle({ eyebrow, title, sub, seal }: { eyebrow: string; title: string; sub?: string; seal: string }) {
  return (
    <header className="relative mb-8 pr-12">
      <p className="text-eyebrow">{eyebrow}</p>
      <h1 className="text-display-xl mt-3">{title}</h1>
      {sub && <p className="text-meta mt-3 text-[15px]">{sub}</p>}
      <ChopSeal text={seal} size={28} className="absolute top-8 right-0" />
    </header>
  )
}

// P.S. first, then each passage with the recording it came from underneath.
function LetterBody({ letter, fromName, showPs = true }: { letter: Letter; fromName: string; showPs?: boolean }) {
  const pieceOf = (memoId: string) => letter.pieces.find((p) => p.id === memoId)
  const thumb = <Avatar name={fromName === 'you' ? null : fromName} size={96} />
  return (
    <div className="space-y-6">
      {showPs && letter.psPieces.length > 0 && (
        <AudioCard
          title={fromName === 'you' ? 'Your P.S.' : `${fromName}’s P.S.`}
          meta={letter.psPieces.map((p) => PS_PROMPT_LABEL[p.prompt ?? 'ps']).join(' · ')}
          urls={letter.psPieces.map((p) => p.audioUrl)}
          thumb={<Avatar name={fromName === 'you' ? null : fromName} size={96} />}
        />
      )}
      {letter.passages.map((p, i) => {
        const piece = pieceOf(p.memoId)
        const lastOfPiece = letter.passages[i + 1]?.memoId !== p.memoId
        const part = letter.pieces.findIndex((x) => x.id === p.memoId) + 1
        return (
          <div key={i} className="space-y-5">
            {i === 0 ? <DropCapParagraph>{p.text}</DropCapParagraph> : <p className="text-story">{p.text}</p>}
            {lastOfPiece && piece?.audioUrl && (
              <AudioCard
                title={fromName === 'you' ? 'Hear yourself tell it' : `Hear ${fromName} tell it`}
                meta={letter.pieces.length > 1 ? `Part ${part} of ${letter.pieces.length}` : undefined}
                from={fromName}
                audioUrl={piece.audioUrl}
                thumb={thumb}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Replies({ replies, title }: { replies: LetterReply[]; title: string }) {
  if (!replies.length) return null
  return (
    <div className={title ? 'mt-8' : ''}>
      {title && <SectionHeader title={title} />}
      <div className="space-y-4">
        {replies.map((r) => (
          <AudioCard key={r.id} title={`From ${r.memberName}`} meta="A voice reply" audioUrl={r.audioUrl} thumb={<Avatar name={r.memberName} size={96} />} />
        ))}
      </div>
    </div>
  )
}

function OpenTogether({ id, fromName, onOpen }: { id: string; fromName: string; onOpen: () => void }) {
  const url = `${publicBaseUrl()}/letter/${id}`
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <AppShell back="/book">
      <PageHeader title="Open it together" subtitle={`Send this to someone in your family, then open ${fromName}’s letter side by side. It only opens for the people she wrote it for.`} />
      <Card className="flex flex-col items-center text-center">
        <QRCodeSVG value={url} size={210} marginSize={0} level="M" fgColor="#1F4D3A" bgColor="#FBF7EF" title="Link to this letter" />
        <p className="text-meta mt-4 break-all">{url}</p>
        <SecondaryButton className="mt-4" onClick={copy} icon={<Copy size={18} strokeWidth={1.75} aria-hidden="true" />}>
          {copied ? 'Copied!' : 'Copy link'}
        </SecondaryButton>
      </Card>
      <PrimaryButton className="mt-6" onClick={onOpen}>
        We’re ready. Open now
      </PrimaryButton>
    </AppShell>
  )
}
