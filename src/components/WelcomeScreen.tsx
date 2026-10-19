// The first step of intake: the logo pressed onto the page, the wordmark, and "Begin".
import { AppShell } from './ui/AppShell'
import { PrimaryButton } from './ui/Button'
import { LogoStamp } from './ui/LogoStamp'

export function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <AppShell bare>
      <div className="animate-stamp-press">
        <LogoStamp size="xl" />
      </div>
      <h1 className="mt-8 font-display text-[56px] leading-none font-semibold text-pine animate-rise [animation-delay:520ms]">
        Postscript
      </h1>
      <div className="mt-14 w-full max-w-[320px] animate-rise [animation-delay:760ms]">
        <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>
      </div>
    </AppShell>
  )
}
