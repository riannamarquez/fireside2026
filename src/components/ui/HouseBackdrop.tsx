// The old Tainan house, faded into the page behind content (Family Book, life map).
// Purely decorative: hidden from screen readers and never catches clicks.
export function HouseBackdrop({ className = '' }: { className?: string }) {
  return (
    <img
      src="/illustrations/house-backdrop.png"
      alt=""
      aria-hidden="true"
      className={`pointer-events-none absolute select-none ${className}`}
    />
  )
}
