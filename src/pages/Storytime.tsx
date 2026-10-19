// /storytime/:memoId — one memory as a rhyming picture book for the grandkids, one page at a time,
// with the storyteller's language under each page and her real recording one tap away.
import { BookOpen, Clapperboard, Play, RefreshCw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { listMemos, makeStoryMovie, makeStorybook } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Avatar } from '../components/ui/Avatar'
import { IconButton, PrimaryButton, TextButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Notice } from '../components/ui/Notice'
import { Pager } from '../components/ui/Pager'
import { Segmented } from '../components/ui/Segmented'
import { Diamond } from '../components/ui/story'
import type { Memo, MoviePace, MovieStyle, StoryMovie, Storybook } from '../types'

export default function Storytime() {
  const { memoId } = useParams<{ memoId: string }>()
  const [memo, setMemo] = useState<Memo | null>(null)
  const [book, setBook] = useState<Storybook | null>(null)
  const [page, setPage] = useState(0)
  const [showNative, setShowNative] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'movie' | 'pages'>('movie')
  const [making, setMaking] = useState(false)
  const [movieError, setMovieError] = useState<string | null>(null)
  const [style, setStyle] = useState<MovieStyle>('watercolor')
  const [pace, setPace] = useState<MoviePace>('normal')

  const movieKey = `${style}-${pace}`
  const currentMovie = book?.videos?.[movieKey] ?? (movieKey === 'watercolor-normal' ? book?.video : undefined)

  async function makeMovie(regenerate = false) {
    if (!memoId || !book) return
    setMaking(true)
    setMovieError(null)
    try {
      const video = await makeStoryMovie(memoId, { style, pace, regenerate })
      setBook({ ...book, videos: { ...(book.videos ?? {}), [movieKey]: video } })
      setMode('movie')
    } catch (e) {
      setMovieError(e instanceof Error ? e.message : String(e))
    } finally {
      setMaking(false)
    }
  }

  async function load(regenerate = false) {
    if (!memoId) return
    setLoading(true)
    setError(null)
    try {
      const [b, memos] = await Promise.all([makeStorybook(memoId, regenerate), listMemos()])
      setBook(b)
      setMemo(memos.find((m) => m.id === memoId) ?? null)
      setPage(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoId])

  if (loading) {
    return (
      <AppShell back="/letterbox" subtitle="Storytime">
        <Card className="mt-4 py-14 text-center">
          <Sparkles size={34} strokeWidth={1.5} className="mx-auto text-vermilion" aria-hidden="true" />
          <p className="text-title mt-4 animate-pulse">Turning this memory into a storybook…</p>
        </Card>
      </AppShell>
    )
  }

  if (error || !book) {
    return (
      <AppShell back="/letterbox" subtitle="Storytime">
        <Notice tone="error" className="mt-4">
          {error ?? 'No storybook yet.'}
        </Notice>
      </AppShell>
    )
  }

  const p = book.pages[page]
  const last = page === book.pages.length - 1
  const hasNative = book.pages.some((pg) => pg.text_native)

  return (
    <AppShell back="/letterbox" subtitle="Storytime">
      <div className="flex items-center justify-between gap-2">
        <Segmented
          label="Show as"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'movie', label: <><Clapperboard size={15} strokeWidth={1.5} aria-hidden="true" /> Movie</> },
            { value: 'pages', label: <><BookOpen size={15} strokeWidth={1.5} aria-hidden="true" /> Pages</> },
          ]}
        />
        <div className="flex items-center">
          {hasNative && mode === 'pages' && (
            <TextButton tone="muted" onClick={() => setShowNative((v) => !v)}>
              {showNative ? 'English only' : 'Both languages'}
            </TextButton>
          )}
          <IconButton label="Write a new version" onClick={() => load(true)}>
            <RefreshCw size={18} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {mode === 'movie' && (
        <div className="mt-3 space-y-2">
          <ChoiceLine label="Look">
            <Segmented
              label="Look"
              value={style}
              onChange={setStyle}
              options={[
                { value: 'watercolor', label: 'Watercolor' },
                { value: 'bedtime', label: 'Bedtime' },
                { value: 'crayon', label: 'Crayon' },
              ]}
            />
          </ChoiceLine>
          <ChoiceLine label="Speed">
            <Segmented
              label="Speed"
              value={pace}
              onChange={setPace}
              options={[
                { value: 'calm', label: 'Calm' },
                { value: 'normal', label: 'Normal' },
                { value: 'lively', label: 'Lively' },
              ]}
            />
          </ChoiceLine>
        </div>
      )}

      {mode === 'movie' && currentMovie ? (
        <MovieViewer key={currentMovie.url} movie={currentMovie} onRemake={() => makeMovie(true)} remaking={making} />
      ) : mode === 'movie' ? (
        <Card className="mt-4 text-center">
          <Clapperboard size={32} strokeWidth={1.5} className="mx-auto text-vermilion" aria-hidden="true" />
          <p className="text-title mt-3">Make it a movie</p>
          <p className="text-body mt-2 text-muted">
            Every card becomes a scene in one animated film, with music. The characters travel with you from card to card.
          </p>
          <PrimaryButton className="mt-5" onClick={() => makeMovie()} disabled={making}>
            {making ? 'Painting the scenes… (about 20 s)' : `Make the ${style} movie`}
          </PrimaryButton>
          {movieError && <Notice tone="error" className="mt-3">{movieError}</Notice>}
        </Card>
      ) : (
        <>
      <article className="surface-card mt-4 flex min-h-[28rem] flex-col px-6 py-8">
        {page === 0 ? (
          <header className="text-center">
            <p className="text-eyebrow inline-flex items-center gap-1.5 text-vermilion">
              <Sparkles size={14} strokeWidth={1.5} aria-hidden="true" /> Storytime
            </p>
            <h1 className="text-title mt-2">{book.title}</h1>
            <Diamond className="mx-auto mt-4" />
          </header>
        ) : (
          <p className="text-eyebrow text-center">{book.title}</p>
        )}

        <div className="my-auto py-8 text-center">
          <p className="font-display text-[27px] leading-relaxed whitespace-pre-line text-ink">{p.text}</p>
          {showNative && p.text_native && <p className="text-story mt-5 whitespace-pre-line text-pine">{p.text_native}</p>}
        </div>

        {p.illustration && <p className="text-meta rounded-[14px] bg-parchment px-4 py-3 text-center italic">{p.illustration}</p>}
      </article>

      <div className="mt-4">
        <Pager index={page} count={book.pages.length} nextDisabled={last} onPrev={() => setPage((n) => n - 1)} onNext={() => setPage((n) => n + 1)} />
      </div>

        </>
      )}

      {memo?.audioUrl && <AudioCard className="mt-6" title="Hear Grandma tell it" meta="Her real recording of this memory" audioUrl={memo.audioUrl} from="Grandma" thumb={<Avatar name="Grandma" size={96} />} />}
    </AppShell>
  )
}

function ChoiceLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-meta w-12 shrink-0">{label}</span>
      {children}
    </div>
  )
}

// One continuous movie; Next plays it to the next card's resting point and pauses there,
// so stepping through cards feels like scenes of one film rather than separate slides.
function MovieViewer({ movie, onRemake, remaking }: { movie: StoryMovie; onRemake: () => void; remaking: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const target = useRef<number | null>(null)
  const raf = useRef(0)
  const [card, setCard] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const rests = movie.rest_times
  const last = rests.length - 1

  const watch = useCallback(() => {
    const v = ref.current
    if (!v) return
    if (target.current !== null && v.currentTime >= target.current) {
      v.pause()
      v.currentTime = target.current
      target.current = null
      setPlaying(false)
      return
    }
    raf.current = requestAnimationFrame(watch)
  }, [])

  const playTo = useCallback(
    async (to: number | null) => {
      const v = ref.current
      if (!v) return
      target.current = to
      cancelAnimationFrame(raf.current)
      try {
        await v.play()
        setNeedsTap(false)
        setPlaying(true)
        raf.current = requestAnimationFrame(watch)
      } catch {
        setNeedsTap(true) // browser blocked autoplay with sound until a tap
      }
    },
    [watch],
  )

  useEffect(() => {
    setCard(0)
    playTo(rests[0])
    return () => cancelAnimationFrame(raf.current)
  }, [movie.url, playTo, rests])

  function next() {
    if (card >= last) return
    setCard(card + 1)
    playTo(rests[card + 1])
  }
  function prev() {
    const v = ref.current
    if (!v || card <= 0) return
    v.pause()
    target.current = null
    v.currentTime = rests[card - 1]
    setCard(card - 1)
    setPlaying(false)
  }
  function playAll() {
    setCard(last)
    playTo(null)
  }

  return (
    <>
      <div className="surface-card relative mt-4 overflow-hidden">
        <video
          ref={ref}
          src={movie.url}
          playsInline
          preload="auto"
          onEnded={() => setPlaying(false)}
          className="block aspect-[9/16] w-full"
        />
        {needsTap && (
          <button
            onClick={() => playTo(rests[card])}
            className="absolute inset-0 flex items-center justify-center bg-ink/10"
            aria-label="Start the movie"
          >
            <span className="flex size-20 items-center justify-center rounded-full bg-pine text-card shadow-card">
              <Play size={30} fill="currentColor" strokeWidth={0} className="ml-1" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      <div className="mt-4">
        <Pager index={card} count={rests.length} label="Card" prevDisabled={card === 0} nextDisabled={card >= last || playing} onPrev={prev} onNext={next} />
      </div>

      <div className="mt-2 flex justify-center gap-2">
        <TextButton onClick={playAll}>Play all</TextButton>
        <TextButton tone="muted" onClick={onRemake} disabled={remaking}>
          {remaking ? 'Repainting…' : 'Repaint movie'}
        </TextButton>
      </div>
    </>
  )
}
