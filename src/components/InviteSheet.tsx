// Invite a family member: QR + link. Family side: a bottom sheet over the Family page.
// Storyteller: its own full screen with a worded Close (no sheets on her side).
import { Check, Copy, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { useIsStoryteller } from '../lib/useViewer'
import { BottomSheet } from './ui/BottomSheet'
import { PrimaryButton, SecondaryButton } from './ui/Button'

export function InviteSheet({ code, familyName, onClose }: { code: string; familyName: string; onClose: () => void }) {
  const isStoryteller = useIsStoryteller()
  const content = <InviteContent code={code} familyName={familyName} />
  if (isStoryteller === null) return null
  if (!isStoryteller) {
    return (
      <BottomSheet open onClose={onClose} title="Invite your family">
        {content}
      </BottomSheet>
    )
  }
  return <FullScreenInvite onClose={onClose}>{content}</FullScreenInvite>
}

function FullScreenInvite({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="invite-title" className="bg-paper fixed inset-0 z-50 overflow-y-auto">
      <div className="mx-auto max-w-[430px] px-6 pt-6 pb-[calc(32px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 id="invite-title" className="text-title">
            Invite your family
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-ink/15 bg-card px-4 font-serif text-[18px] text-ink">
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
        <SecondaryButton large className="mt-6" onClick={onClose}>
          Back to the family page
        </SecondaryButton>
      </div>
    </div>
  )
}

function InviteContent({ code, familyName }: { code: string; familyName: string }) {
  const url = `${window.location.origin}/family/${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this invite link', url)
    }
  }

  return (
    <>
      <p className="text-body text-muted">Scan this code or share the link to join {familyName}. They’ll just enter their name.</p>
      <div className="mt-6 flex justify-center">
        <div className="surface-card p-4">
          <QRCodeSVG value={url} size={196} fgColor="#1F4D3A" bgColor="#FBF7EF" marginSize={0} level="M" title="Invite QR code" />
        </div>
      </div>
      <p className="text-meta mt-6 rounded-[14px] bg-parchment px-4 py-3 break-all text-ink">{url}</p>
      <PrimaryButton
        onClick={copy}
        arrow={false}
        className="mt-4"
        icon={copied ? <Check size={20} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={20} strokeWidth={1.75} aria-hidden="true" />}
      >
        {copied ? 'Copied' : 'Copy link'}
      </PrimaryButton>
      {isLocal && (
        <p className="text-meta mt-4 text-center">
          This link only works on this computer. Run <code className="font-semibold">npm run dev -- --host</code> to invite phones on the same Wi-Fi.
        </p>
      )}
    </>
  )
}
