// A short recording in a card: a P.S., the two spoken prompts, a voice reply.
// Worded buttons only ("Record", "Stop", "Forget this"), never a bare icon.
import { LoaderCircle, Mic, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatDuration } from '../lib/format'
import { type Recording, useLetterRecorder } from '../lib/useLetterRecorder'
import { PrimaryButton, SecondaryButton } from './ui/Button'
import { Notice } from './ui/Notice'

type Props = {
  label: string
  hint?: string
  lang?: string
  onSave: (recording: Recording) => Promise<void>
}

export function MiniRecorder({ label, hint, lang = 'en-US', onSave }: Props) {
  const rec = useLetterRecorder(lang)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function stop() {
    const recording = await rec.stop()
    if (!recording) return
    setSaving(true)
    setError(null)
    try {
      await onSave(recording)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'We couldn’t save that. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="surface-card p-4">
      <p className="text-card-title">{label}</p>
      {hint && <p className="text-meta">{hint}</p>}
      <div className="mt-3 space-y-2">
        {rec.recording ? (
          <>
            <PrimaryButton danger arrow={false} onClick={stop} icon={<Square size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />}>
              Stop · {formatDuration(rec.elapsed)}
            </PrimaryButton>
            <SecondaryButton onClick={rec.forget} icon={<Trash2 size={18} strokeWidth={1.5} aria-hidden="true" />}>
              Forget this
            </SecondaryButton>
          </>
        ) : (
          <SecondaryButton
            onClick={rec.start}
            disabled={saving}
            icon={saving ? <LoaderCircle size={18} strokeWidth={1.5} className="motion-safe:animate-spin" aria-hidden="true" /> : <Mic size={18} strokeWidth={1.5} className="text-vermilion" aria-hidden="true" />}
          >
            {saving ? 'Saving…' : 'Record'}
          </SecondaryButton>
        )}
      </div>
      {(rec.error || error) && (
        <Notice tone="error" className="mt-3">
          {rec.error ?? error}
        </Notice>
      )}
    </div>
  )
}
