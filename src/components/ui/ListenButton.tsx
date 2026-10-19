// A big worded play control for the storyteller ("Listen again" / "Pause"), instead of an icon.
import { Pause, Play } from 'lucide-react'
import { formatDuration } from '../../lib/format'
import { useSequence, useTracks } from '../../lib/useSequence'
import { SecondaryButton } from './Button'

export function ListenButton({ urls, label = 'Listen again' }: { urls: string[]; label?: string }) {
  const tracks = useTracks(urls)
  const player = useSequence(tracks, false)
  if (!tracks.length) return null
  return (
    <>
      {player.audio}
      <SecondaryButton
        large
        onClick={player.toggle}
        icon={player.playing ? <Pause size={20} strokeWidth={1.75} aria-hidden="true" /> : <Play size={20} strokeWidth={1.75} aria-hidden="true" />}
      >
        {player.playing ? `Pause · ${formatDuration(player.current)}` : label}
      </SecondaryButton>
    </>
  )
}
