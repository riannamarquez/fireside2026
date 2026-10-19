import { PrimaryButton, SecondaryButton } from './Button'

export const STICKY_ACTION_BAR_HEIGHT = 80

// The storyteller's bottom bar: big labeled Back and Continue (or the final action), never icon-only.
export function StickyActionBar({
  onBack,
  onContinue,
  backLabel = 'Back',
  continueLabel = 'Continue',
  continueDisabled = false,
  danger = false,
}: {
  onBack?: () => void
  onContinue: () => void
  backLabel?: string
  continueLabel?: string
  continueDisabled?: boolean
  danger?: boolean
}) {
  return (
    <div className={`grid items-stretch gap-3 ${onBack ? 'grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]' : 'grid-cols-1'}`}>
      {onBack && (
        <SecondaryButton large onClick={onBack}>
          {backLabel}
        </SecondaryButton>
      )}
      <PrimaryButton large danger={danger} onClick={onContinue} disabled={continueDisabled} className="whitespace-nowrap">
        {continueLabel}
      </PrimaryButton>
    </div>
  )
}
