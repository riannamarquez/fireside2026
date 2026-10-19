// /qr — big QR for the laptop/kitchen screen, plus a live feed of memories as they're placed.
// Scanning the QR opens /r on the phone: one big record button that uploads to the backend.
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { SecondaryButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionHeader } from '../components/ui/SectionHeader'
import { type ApiMemo, type ApiStage, listMemos, listStages, publicBaseUrl, RECORD_PATH } from '../lib/qrApi'

const POLL_MS = 3000

export default function QRPage() {
  const url = `${publicBaseUrl()}${RECORD_PATH}`
  const wrapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [memos, setMemos] = useState<ApiMemo[]>([])
  const [stages, setStages] = useState<ApiStage[]>([])
  const [backendDown, setBackendDown] = useState(false)

  useEffect(() => {
    listStages().then(setStages).catch(() => {})
    let alive = true
    async function refresh() {
      try {
        const all = await listMemos()
        if (alive) {
          setMemos(all.slice(-8).reverse())
          setBackendDown(false)
        }
      } catch {
        if (alive) setBackendDown(true)
      }
    }
    refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  function download() {
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'family-story-qr.png'
    a.click()
  }

  const stageLabel = (id: number | null) => stages.find((s) => s.id === id)?.label

  return (
    <div className="space-y-6">
      <PageHeader title="Record from a phone" subtitle="Scan with your phone camera to record a memory." />
      <Card className="flex flex-col items-center gap-4 text-center">
        <div ref={wrapRef}>
          <QRCodeCanvas value={url} size={240} marginSize={2} level="M" fgColor="#1F4D3A" bgColor="#FBF7EF" />
        </div>
        <p className="text-meta break-all">{url}</p>
        <div className="grid w-full grid-cols-3 gap-2 print:hidden">
          <SecondaryButton compact onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </SecondaryButton>
          <SecondaryButton compact onClick={download}>
            PNG
          </SecondaryButton>
          <SecondaryButton compact onClick={() => window.print()}>
            Print
          </SecondaryButton>
        </div>
        {url.startsWith('http://') && (
          <p className="text-meta print:hidden">
            Phones only allow the mic over HTTPS: run <code>npm run dev:phone</code>.
          </p>
        )}
      </Card>

      <section className="print:hidden">
        <SectionHeader title="Latest memories" />
        {backendDown && (
          <Notice tone="error" className="mb-3">
            Can’t reach the backend. Start it: <code>cd backend && venv/bin/uvicorn main:app --reload</code>
          </Notice>
        )}
        {!backendDown && memos.length === 0 && <p className="text-meta">Nothing yet. Scan the code and record one.</p>}
        <ul className="divide-y divide-hairline">
          {memos.map((m) => {
            const t = m.tags ?? { stage_id: null }
            const years = t.year_start ? `${t.year_is_estimate ? '~' : ''}${t.year_start}${t.year_end && t.year_end !== t.year_start ? `–${t.year_end}` : ''}` : null
            return (
              <li key={m.id} className="py-3">
                <p className="text-body">{t.summary ?? m.transcript?.slice(0, 160)}</p>
                <p className="text-meta mt-1">
                  {[stageLabel(m.stage_id) ?? 'Not placed yet', t.place, years, ...(t.people ?? [])].filter(Boolean).join(' · ')}
                  {t.sensitive && ' · private'}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
