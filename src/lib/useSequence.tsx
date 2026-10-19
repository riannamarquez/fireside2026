// Plays several recordings back to back with one <audio> element (a letter told in pieces).
// Shared by AudioCard and the big labeled ListenButton on the storyteller's screens.
import { useEffect, useMemo, useRef, useState } from 'react'

// Keyed by the URLs themselves, so a parent re-render with a new array doesn't restart playback.
export function useTracks(urls: (string | undefined)[]): string[] {
  const key = urls.filter(Boolean).join('\n')
  return useMemo(() => (key ? key.split('\n') : []), [key])
}

// One <audio> element stepping through tracks. MediaRecorder webm files report duration
// Infinity until scanned, so we seek far ahead once to make the browser compute it.
export function useSequence(tracks: string[], autoPlay: boolean, onFinished?: () => void) {
  const ref = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState<number | null>(null)
  const wantPlay = useRef(autoPlay)
  const finished = useRef(onFinished)
  useEffect(() => {
    finished.current = onFinished
  }, [onFinished])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let fixing = false
    setCurrent(0)
    setDuration(null)
    const readDuration = () => {
      if (el.duration === Infinity && !fixing) {
        fixing = true
        el.currentTime = 1e101
      } else if (Number.isFinite(el.duration)) {
        setDuration(el.duration)
        if (fixing) {
          fixing = false
          el.currentTime = 0
        }
      }
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => {
      if (!fixing) setCurrent(el.currentTime)
    }
    const onEnded = () => {
      setCurrent(0)
      if (index < tracks.length - 1) {
        wantPlay.current = true
        setIndex(index + 1)
      } else {
        wantPlay.current = false
        setPlaying(false)
        setIndex(0)
        finished.current?.()
      }
    }
    el.addEventListener('loadedmetadata', readDuration)
    el.addEventListener('durationchange', readDuration)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    if (el.readyState >= 1) readDuration()
    if (wantPlay.current) el.play().catch(() => setPlaying(false))
    return () => {
      el.removeEventListener('loadedmetadata', readDuration)
      el.removeEventListener('durationchange', readDuration)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
    }
  }, [index, tracks])

  // Start over from the first piece.
  function restart() {
    const el = ref.current
    if (!el) return
    wantPlay.current = true
    if (index === 0) {
      el.currentTime = 0
      el.play().catch((err) => console.error('Audio playback failed', err))
    } else setIndex(0)
  }

  function toggle() {
    const el = ref.current
    if (!el) return
    if (el.paused) {
      wantPlay.current = true
      el.play().catch((err) => console.error('Audio playback failed', err))
    } else {
      wantPlay.current = false
      el.pause()
    }
  }

  const trackProgress = duration ? Math.min(1, current / duration) : 0
  const progress = tracks.length ? (index + trackProgress) / tracks.length : 0
  const audio = tracks.length ? <audio ref={ref} src={tracks[index]} preload="metadata" /> : null
  return { audio, toggle, restart, playing, current, duration, index, progress }
}
