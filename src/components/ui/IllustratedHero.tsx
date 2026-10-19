// Illustration at the top of a screen (a transparent cutout, kept whole and sitting on the
// cream page), leafy branches in the top corners.
import type { IllustrationSlot } from '../../lib/illustrations'
import { CornerLeaves, Illustration } from './Illustration'

export function IllustratedHero({ image, size = 'tall' }: { image: IllustrationSlot; size?: 'tall' | 'short' }) {
  const height = size === 'tall' ? 'h-[clamp(320px,47dvh,420px)]' : 'h-[clamp(240px,33dvh,300px)]'
  return (
    <div className={`relative w-full ${height}`}>
      <Illustration slot={image} showLabel fit="contain" position="bottom" className="absolute inset-x-0 top-24 bottom-0" />
      <CornerLeaves side="left" className="-top-3 -left-8 h-36 w-44" />
      <CornerLeaves side="right" className="-top-4 -right-10 h-44 w-52" />
    </div>
  )
}
