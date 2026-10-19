import { Camera, LoaderCircle, Plus, Users } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  getCurrentMember,
  getFamily,
  getLetterShelf,
  getWaitingCounts,
  getMyIdentity,
  joinFamily,
  listFamilyMembers,
  releaseAsKeeper,
  saveCurrentMember,
  saveMyIdentity,
  uploadFamilyPhoto,
  type LetterShelf,
} from '../api'
import { EnvelopeSheet, MemberSheet } from '../components/FamilySheets'
import { InviteSheet } from '../components/InviteSheet'
import { WelcomeScreen } from '../components/WelcomeScreen'
import { AppShell } from '../components/ui/AppShell'
import { Avatar } from '../components/ui/Avatar'
import { PrimaryButton, SecondaryButton, TextButton } from '../components/ui/Button'
import { Card, TitledCard } from '../components/ui/Card'
import { EnvelopeCard } from '../components/ui/EnvelopeCard'
import { Field } from '../components/ui/Field'
import { Illustration } from '../components/ui/Illustration'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { RoleBadge } from '../components/ui/RoleBadge'
import { NotAnImageError } from '../lib/image'
import { useIsStoryteller } from '../lib/useViewer'
import { hasSeenWelcome, markWelcomeSeen } from '../lib/welcome'
import type { Envelope, Family as FamilyType, FamilyMember } from '../types'

// NOTE: roles are checked in the browser only (identity = a member id in localStorage).
// This is a hackathon demo, not real security — the database accepts writes from anyone.

const TITLE = 'Set up your family'
const SUBTITLE = 'Start a private home for the stories your family wants to keep.'

export default function Family() {
  const params = useParams()
  // /family/:code from an invite link; plain /family reopens the family you joined last.
  const code = params.code ?? getMyIdentity()?.code ?? 'default'
  const navigate = useNavigate()
  const [family, setFamily] = useState<FamilyType | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [memberId, setMemberId] = useState<string | null>(() => getCurrentMember(code))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [inviting, setInviting] = useState(false)
  // Intake starts with the welcome (logo + Begin), once per browser.
  const [welcomed, setWelcomed] = useState(hasSeenWelcome)
  // Family side: tapping a member opens a details sheet. The storyteller's rows stay plain.
  const isStoryteller = useIsStoryteller()
  const [sheetMember, setSheetMember] = useState<FamilyMember | null>(null)
  const [waiting, setWaiting] = useState<Record<string, number>>({})

  async function refresh() {
    const [f, m] = await Promise.all([getFamily(code), listFamilyMembers(code)])
    setFamily(f)
    setMembers(m)
  }

  useEffect(() => {
    setMemberId(getCurrentMember(code))
    setLoading(true)
    setLoadError(false)
    refresh()
      .catch((err) => {
        console.error(err)
        setLoadError(true)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // A saved id that isn't in this family (e.g. the data was reset) counts as not joined.
  const me = members.find((m) => m.id === memberId)

  useEffect(() => {
    if (me) saveMyIdentity({ code, name: me.name })
  }, [code, me])

  useEffect(() => {
    if (isStoryteller === false) getWaitingCounts().then(setWaiting).catch((err) => console.error(err))
  }, [isStoryteller])

  if (!welcomed) {
    return (
      <WelcomeScreen
        onBegin={() => {
          markWelcomeSeen()
          setWelcomed(true)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  if (loading) {
    return (
      <AppShell>
        <PageHeader counter="1 of 2" title={TITLE} subtitle={SUBTITLE} />
        <p className="text-body text-center text-muted">Loading your family…</p>
      </AppShell>
    )
  }

  if (loadError) {
    return (
      <AppShell>
        <PageHeader counter="1 of 2" title={TITLE} subtitle={SUBTITLE} />
        <Notice tone="error">We couldn’t load this family. Check your connection and refresh the page.</Notice>
      </AppShell>
    )
  }

  if (!me) {
    return (
      <AppShell>
        <JoinScreen
          family={family}
          onJoin={async (name) => {
            const member = await joinFamily(code, name)
            saveCurrentMember(code, member.id)
            setMemberId(member.id)
            await refresh()
          }}
        />
      </AppShell>
    )
  }

  const isOrganizer = me.role === 'organizer'
  const familyName = family?.name ?? 'Our family'
  const since = new Date(family?.createdAt ?? Date.now()).getFullYear()

  return (
    <AppShell>
      <PageHeader counter="1 of 2" title={TITLE} subtitle={SUBTITLE} />

      <div className="space-y-4">
        <CoverCard
          code={code}
          familyName={familyName}
          since={since}
          photoUrl={family?.photoUrl}
          isOrganizer={isOrganizer}
          onUploaded={(photoUrl) => setFamily((f) => (f ? { ...f, photoUrl } : f))}
        />

        <EnvelopeWall />

        <TitledCard
          title="Family roles"
          aside={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}
          subtitle="Everyone can have more than one role, but each family has one organizer."
        >
          <ul className="-mt-2 divide-y divide-hairline">
            {members.map((m) => {
              const isMe = m.id === me.id
              const subtext = m.relationship ?? (m.role === 'organizer' ? 'Started this family' : undefined)
              const row = (
                <>
                  <Avatar name={m.name} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-serif text-[19px] leading-snug break-words text-ink">
                      <span className="min-w-0">{m.name}</span>
                      {isMe && <span className="text-meta shrink-0">· you</span>}
                    </span>
                    {subtext && <span className="text-meta block">{subtext}</span>}
                  </span>
                  <RoleBadge role={m.role} />
                </>
              )
              return (
                <li key={m.id}>
                  {isStoryteller === false ? (
                    <button type="button" onClick={() => setSheetMember(m)} aria-haspopup="dialog" className="flex w-full items-center gap-4 py-3.5 text-left">
                      {row}
                    </button>
                  ) : (
                    <div className="flex items-center gap-4 py-3.5">{row}</div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="mt-2 text-center">
            <TextButton onClick={() => setInviting(true)} icon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" />}>
              Invite a family member
            </TextButton>
          </div>

          <Notice className="mt-4" icon={<Users size={20} strokeWidth={1.5} className="text-pine" aria-hidden="true" />}>
            <p className="font-medium">What does the organizer do?</p>
            <p className="text-meta mt-1 text-[15px]">Manages invites, the family cover, and who can see or contribute stories.</p>
          </Notice>
        </TitledCard>

        <div className="pt-2">
          <PrimaryButton onClick={() => navigate('/life')}>Continue to your life map</PrimaryButton>
          <p className="text-meta mt-4 text-center">Your family space is private. Only invited members can enter.</p>
        </div>
      </div>

      {inviting && <InviteSheet code={code} familyName={familyName} onClose={() => setInviting(false)} />}
      <MemberSheet member={sheetMember} waiting={sheetMember ? waiting[sheetMember.id] : undefined} onClose={() => setSheetMember(null)} />
    </AppShell>
  )
}

function JoinScreen({ family, onJoin }: { family: FamilyType | null; onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setJoining(true)
    setError(false)
    try {
      await onJoin(trimmed)
    } catch (err) {
      console.error(err)
      setError(true)
      setJoining(false)
    }
  }

  return (
    <>
      <PageHeader
        counter={family ? undefined : '1 of 2'}
        title={family ? `Join ${family.name}` : TITLE}
        subtitle={family ? 'Your family is keeping its stories on Postscript. Tell us your name to join them.' : SUBTITLE}
      />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="What’s your name?"
            autoFocus
            autoComplete="given-name"
            placeholder="Your first name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <Notice tone="error">Something went wrong. Please try again.</Notice>}
          <PrimaryButton type="submit" disabled={joining || !name.trim()}>
            {joining ? 'Joining…' : family ? 'Join family' : 'Start our family'}
          </PrimaryButton>
        </form>
      </Card>
      <p className="text-meta mt-4 text-center">Your family space is private. Only invited members can enter.</p>
    </>
  )
}

function CoverCard({
  code,
  familyName,
  since,
  photoUrl,
  isOrganizer,
  onUploaded,
}: {
  code: string
  familyName: string
  since: number
  photoUrl?: string
  isOrganizer: boolean
  onUploaded: (photoUrl: string) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image.')
      return
    }
    setPreview(URL.createObjectURL(file))
    try {
      onUploaded(await uploadFamilyPhoto(code, file))
    } catch (err) {
      console.error(err)
      setError(err instanceof NotAnImageError ? 'That file isn’t an image.' : 'Upload failed, try again.')
    } finally {
      setPreview(null)
    }
  }

  const fileInput = <input type="file" accept="image/*" onChange={handleFile} disabled={!!preview} className="sr-only" />
  const src = preview ?? photoUrl
  // "THE Chen Family" reads well; "THE Our family" doesn't.
  const showThe = !/^(the|our)\b/i.test(familyName)

  return (
    <div>
      {src ? (
        <div className="relative h-[300px] overflow-hidden rounded-card bg-parchment shadow-card">
          <img src={src} alt={`${familyName} cover photo`} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-linear-to-t from-ink/75 via-ink/30 to-transparent" />
          <div className="absolute right-6 bottom-6 left-6 text-card">
            {showThe && <p className="text-eyebrow text-card/75">The</p>}
            <p className="text-display-xl mt-1 text-card">{familyName}</p>
            <p className="text-eyebrow mt-3 text-card/80">Our stories · since {since}</p>
          </div>
          {isOrganizer && !preview && (
            <label className="absolute top-4 right-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-card px-4 font-serif text-[15px] text-ink shadow-card focus-within:ring-2 focus-within:ring-pine/30 hover:bg-parchment">
              <Camera size={18} strokeWidth={1.5} aria-hidden="true" />
              Change cover
              {fileInput}
            </label>
          )}
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/25">
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-5 font-serif text-[15px] text-ink">
                <LoaderCircle size={18} strokeWidth={1.5} className="motion-safe:animate-spin" aria-hidden="true" />
                Uploading…
              </span>
            </div>
          )}
        </div>
      ) : (
        <CoverPlaceholder familyName={familyName} since={since} isOrganizer={isOrganizer}>
          {fileInput}
        </CoverPlaceholder>
      )}
      {error && (
        <Notice tone="error" className="mt-3">
          {error}
        </Notice>
      )}
    </div>
  )
}

function CoverPlaceholder({
  familyName,
  since,
  isOrganizer,
  children,
}: {
  familyName: string
  since: number
  isOrganizer: boolean
  children: ReactNode
}) {
  const content = (
    <>
      <Illustration slot="house-tainan" className="absolute inset-0 opacity-70" />
      {isOrganizer && (
        <span className="relative flex size-14 items-center justify-center rounded-full bg-card text-pine shadow-card">
          <Camera size={24} strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      <span className="text-title relative mt-4">{isOrganizer ? 'Add a family photo' : familyName}</span>
      <span className="text-body relative mt-2 max-w-[260px] text-muted">
        {isOrganizer ? 'A photo everyone will see when they open Postscript.' : 'Your organizer hasn’t added a photo yet.'}
      </span>
      <span className="text-eyebrow relative mt-5">Our stories · since {since}</span>
    </>
  )
  const className = 'relative flex h-[300px] flex-col items-center justify-center overflow-hidden rounded-card px-6 text-center shadow-card'
  if (!isOrganizer) return <div className={className}>{content}</div>
  return (
    <label className={`${className} cursor-pointer focus-within:ring-2 focus-within:ring-pine/30`}>
      {content}
      {children}
    </label>
  )
}

// "Ama has N letters waiting for you": envelopes only, never titles or topics.
function EnvelopeWall() {
  const navigate = useNavigate()
  const [shelf, setShelf] = useState<LetterShelf | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [sheetEnvelope, setSheetEnvelope] = useState<Envelope | null>(null)

  const load = () => getLetterShelf().then(setShelf)

  useEffect(() => {
    load().catch((err) => console.error(err))
  }, [])

  if (!shelf) return null

  if (shelf.isStoryteller) {
    return (
      <Card>
        <h2 className="text-heading">Your letters</h2>
        <p className="text-meta mt-2 text-[15px]">
          {shelf.waitingForOthers > 0
            ? `You have ${shelf.waitingForOthers} sealed ${shelf.waitingForOthers === 1 ? 'letter' : 'letters'} waiting for your family.`
            : 'Write a letter to your family, or keep one sealed for a special day.'}
        </p>
        <PrimaryButton className="mt-4" onClick={() => navigate('/letterbox')}>
          Open my letterbox
        </PrimaryButton>
      </Card>
    )
  }

  const count = shelf.envelopes.length
  if (count === 0 && shelf.waitingForOthers === 0 && shelf.keeperLetters === 0) return null

  return (
    <section className="pt-2">
      <h2 className="text-heading mb-3">
        {count > 0 ? `${shelf.fromName} has ${count} ${count === 1 ? 'letter' : 'letters'} waiting for you.` : `Letters from ${shelf.fromName}`}
      </h2>
      {count > 0 && (
        <div className="space-y-4">
          {shelf.envelopes.map((e) => (
            <EnvelopeCard key={e.id} envelope={e} onOpen={() => setSheetEnvelope(e)} />
          ))}
        </div>
      )}
      {shelf.waitingForOthers > 0 && (
        <p className="text-meta mt-4 text-[15px]">
          {shelf.fromName} has {shelf.waitingForOthers} {shelf.waitingForOthers === 1 ? 'letter' : 'letters'} waiting for others.
        </p>
      )}
      {shelf.keeperLetters > 0 && (
        <Card tone="sage" className="mt-5">
          <p className="text-card-title">
            {shelf.fromName} asked you to keep {shelf.keeperLetters} {shelf.keeperLetters === 1 ? 'letter' : 'letters'} until the time comes.
          </p>
          {confirming ? (
            <div className="mt-3">
              <p className="text-body">
                This opens every letter {shelf.fromName} left for when she’s gone, for everyone she chose. It can’t be undone.
              </p>
              <div className="mt-3 flex gap-3">
                <SecondaryButton compact onClick={() => setConfirming(false)}>
                  Not yet
                </SecondaryButton>
                <PrimaryButton
                  compact
                  arrow={false}
                  disabled={releasing}
                  onClick={async () => {
                    setReleasing(true)
                    try {
                      await releaseAsKeeper()
                      await load()
                      setConfirming(false)
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setReleasing(false)
                    }
                  }}
                >
                  Release them
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <PrimaryButton className="mt-3" onClick={() => setConfirming(true)}>
              Release {shelf.fromName}’s letters
            </PrimaryButton>
          )}
        </Card>
      )}
      <EnvelopeSheet envelope={sheetEnvelope} onClose={() => setSheetEnvelope(null)} />
    </section>
  )
}
