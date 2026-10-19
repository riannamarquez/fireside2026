// /r — where the QR code points. One big record button; saving uploads to POST /api/memos,
// which transcribes (Whisper), tags, and places the memo on the timeline.
import { useMemo, useState } from 'react'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Avatar } from '../components/ui/Avatar'
import { PrimaryButton, SecondaryButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordButton } from '../components/ui/RecordButton'
import { formatDuration } from '../lib/format'
import { type ApiMemo, type ApiStage, listStages, uploadMemo } from '../lib/qrApi'
import { useRecorder } from '../lib/useRecorder'

type Phase = 'idle' | 'review' | 'saving' | 'done' | 'error'

export default function PhoneRecord() {
  const rec = useRecorder()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ApiMemo | null>(null)
  const [stages, setStages] = useState<ApiStage[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const audioUrl = useMemo(() => (rec.audio ? URL.createObjectURL(rec.audio) : undefined), [rec.audio])

  function stop() {
    rec.stop()
    setPhase('review')
  }

  async function save() {
    if (!rec.audio) return
    setFailure(null)
    setPhase('saving')
    try {
      const [memo, s] = await Promise.all([uploadMemo(rec.audio), listStages().catch(() => [])])
      setResult(memo)
      setStages(s)
      setPhase('done')
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  function again() {
    rec.reset()
    setResult(null)
    setPhase('idle')
  }

  const tags = result?.tags

  return (
    <AppShell hero="hero-grandma" menu={false} right={<span />}>
      <PageHeader title="Tell one memory" subtitle="Any language. A minute or two is plenty." />

      {(phase === 'idle' || phase === 'saving') && (
        <>
          <RecordButton
            state={phase === 'saving' ? 'saving' : rec.recording ? 'recording' : 'idle'}
            onClick={rec.recording ? stop : rec.start}
            label={phase === 'saving' ? 'Placing it on your timeline…' : rec.recording ? formatDuration(rec.seconds) : 'Record a memory'}
            sublabel={rec.recording ? 'Tap to stop' : undefined}
          />
          {rec.error && <Notice tone="error" className="mt-4">{rec.error}</Notice>}
        </>
      )}

      {phase === 'review' && rec.audio && (
        <div className="space-y-4">
          <AudioCard title="Your memory" meta="Just now" from="you" audioUrl={audioUrl} thumb={<Avatar name={null} size={96} />} />
          <div className="flex gap-3">
            <SecondaryButton onClick={again}>Redo</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="space-y-4">
          <Card>
            <p className="text-card-title">Saved</p>
            {tags?.summary && <p className="text-body mt-1">{tags.summary}</p>}
            <dl className="text-meta mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt>Life stage</dt>
              <dd className="text-ink">{stages.find((s) => s.id === result.stage_id)?.label ?? 'Not sure yet'}</dd>
              {tags?.place && (
                <>
                  <dt>Place</dt>
                  <dd className="text-ink">{tags.place}</dd>
                </>
              )}
              {tags?.year_start && (
                <>
                  <dt>Years</dt>
                  <dd className="text-ink">
                    {tags.year_is_estimate ? 'around ' : ''}
                    {tags.year_start}
                    {tags.year_end && tags.year_end !== tags.year_start ? `–${tags.year_end}` : ''}
                  </dd>
                </>
              )}
              {!!tags?.people?.length && (
                <>
                  <dt>People</dt>
                  <dd className="text-ink">{tags.people.join(', ')}</dd>
                </>
              )}
            </dl>
            {tags?.sensitive && <Notice className="mt-3">Kept private until you choose who can see it.</Notice>}
          </Card>
          <PrimaryButton onClick={again}>Record another</PrimaryButton>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <Notice tone="error">Something went wrong: {failure}</Notice>
          <p className="text-meta text-center">Your recording is still here.</p>
          <PrimaryButton onClick={save}>Try again</PrimaryButton>
        </div>
      )}
    </AppShell>
  )
}
