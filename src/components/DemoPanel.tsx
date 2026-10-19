// Controls for recording the demo video. Tapping your avatar in the header toggles it.
// Switch viewer, fake "today", play the keeper's part, reset to the seed. Changes reload the page.
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { demoKeeperRelease, demoReset, demoSetViewer, getViewer, IS_DEMO, type Viewer } from '../api'
import { TOGGLE_DEMO_PANEL } from '../lib/demoPanel'
import { getFakeToday, setFakeToday, todayString } from '../lib/today'
import { resetWelcome } from '../lib/welcome'
import { SecondaryButton } from './ui/Button'

const OPEN_KEY = 'postscript-demo-panel'

function readOpen() {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeOpen(open: boolean) {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // Panel just won't stay open across reloads.
  }
}

export function DemoPanel() {
  const [open, setOpen] = useState(readOpen)
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [date, setDate] = useState(() => getFakeToday() ?? '')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    function onToggle() {
      setOpen((o) => {
        writeOpen(!o)
        return !o
      })
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        writeOpen(false)
        setOpen(false)
      }
    }
    window.addEventListener(TOGGLE_DEMO_PANEL, onToggle)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(TOGGLE_DEMO_PANEL, onToggle)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (open) getViewer().then(setViewer).catch((err) => console.error(err))
  }, [open])

  if (!open) return null

  const reload = () => window.location.reload()
  const viewers = viewer?.members ?? []

  const close = () => {
    writeOpen(false)
    setOpen(false)
  }

  return (
    // Same 430px column as the app, so the menu stays inside the phone frame on a wide screen.
    <div className="fixed inset-x-0 top-0 z-[60] mx-auto h-0 max-w-[430px]">
      {/* Tapping anywhere outside closes it, like a native menu. */}
      <button type="button" aria-label="Close demo controls" tabIndex={-1} onClick={close} className="fixed inset-0 cursor-default" />
      <div
        className="motion-safe:animate-drop absolute top-[74px] right-3 w-[min(290px,calc(100vw-24px))] origin-top-right rounded-[18px] bg-card font-serif shadow-float ring-1 ring-hairline"
        role="dialog"
        aria-label="Demo controls"
      >
        {/* Little pointer up to the avatar it dropped from. */}
        <span aria-hidden="true" className="absolute -top-[7px] right-[19px] size-3.5 rotate-45 rounded-[3px] bg-card ring-1 ring-hairline [clip-path:polygon(0_0,100%_0,0_100%)]" />
        <div className="relative max-h-[calc(100dvh-160px)] overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow text-ink">Demo controls</p>
        <button
          type="button"
          onClick={close}
          aria-label="Close demo controls"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-ink/5"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {!IS_DEMO && <p className="mt-1 text-xs text-muted">Supabase mode: reset is off.</p>}

      <p className="text-meta mt-3">Viewing as</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {viewers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => demoSetViewer(m.id).then(reload)}
            aria-pressed={viewer?.me?.id === m.id}
            className={`h-11 rounded-xl text-base ${viewer?.me?.id === m.id ? 'bg-pine text-card' : 'bg-parchment text-ink hover:bg-sage'}`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <p className="text-meta mt-4">Today is {todayString()}</p>
      <div className="mt-2 flex gap-2">
        <input
          type="date"
          aria-label="Fake today"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl bg-parchment px-3 text-base text-ink"
        />
        <button
          type="button"
          onClick={() => {
            setFakeToday(date || null)
            reload()
          }}
          className="h-11 rounded-xl bg-parchment px-3 text-base text-ink hover:bg-sage"
        >
          Set
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setFakeToday('2031-06-12')
            reload()
          }}
          className="h-10 flex-1 rounded-xl bg-parchment text-sm text-ink hover:bg-sage"
        >
          Jun 12, 2031
        </button>
        <button
          type="button"
          onClick={() => {
            setFakeToday(null)
            reload()
          }}
          className="h-10 flex-1 rounded-xl bg-parchment text-sm text-ink hover:bg-sage"
        >
          Real today
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <SecondaryButton
          compact
          onClick={() =>
            demoKeeperRelease()
              .then((n) => {
                setMessage(n ? `Released ${n} letter${n === 1 ? '' : 's'}.` : 'Nothing left to release.')
                window.setTimeout(reload, 700)
              })
              .catch((err) => setMessage(String(err)))
          }
        >
          Keeper releases letters
        </SecondaryButton>
        {IS_DEMO && (
          <SecondaryButton
            compact
            onClick={() => {
              setFakeToday(null)
              resetWelcome() // so the next recording starts from the welcome screen
              demoReset().then(reload)
            }}
          >
            Reset demo data
          </SecondaryButton>
        )}
      </div>
      {message && <p className="mt-2 text-sm text-muted">{message}</p>}
        </div>
      </div>
    </div>
  )
}
