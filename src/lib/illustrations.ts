// Illustration slots. Drop a PNG with the same name into public/illustrations/ to replace the
// watercolor-blob fallback; nothing else needs to change. Sizes are 3x for a 390pt-wide screen.
import type { LifeStage } from '../types'

export const ILLUSTRATIONS = {
  'hero-grandma': { size: '1170×1140', label: 'Ama at the window' },
  'hero-grandma-tea': { size: '1170×780', label: 'Ama with her tea' },
  'house-tainan': { size: '288×288', label: 'The house in Tainan' },
  'kitchen-bowl': { size: '288×288', label: 'Grandma’s kitchen' },
  'market-street': { size: '288×288', label: 'The market street' },
  'leaves-top-left': { size: '600×600, transparent', label: '' },
  'leaves-top-right': { size: '600×600, transparent', label: '' },
  'mango-branch': { size: '720×480, transparent', label: '' },
  'avatar-lily': { size: '240×240', label: 'Lily' },
  'avatar-ama': { size: '240×240', label: 'Ama' },
} as const

export type IllustrationSlot = keyof typeof ILLUSTRATIONS

export const illustrationUrl = (slot: IllustrationSlot) => `/illustrations/${slot}.png`

// AudioCard thumbnails rotate through the scene slots by life stage.
const THUMBS: IllustrationSlot[] = ['house-tainan', 'market-street', 'kitchen-bowl']

export function thumbFor(stageId: string | undefined, stages: LifeStage[]): IllustrationSlot {
  const i = stages.findIndex((s) => s.id === stageId)
  return THUMBS[(i === -1 ? stages.length : i) % THUMBS.length]!
}

// Portraits exist only for these first names (avatar-<name>.png); everyone else gets initials.
export function avatarSlot(name: string | null | undefined): IllustrationSlot | null {
  const first = name?.trim().split(/\s+/)[0]?.toLowerCase()
  const slot = `avatar-${first}`
  return slot in ILLUSTRATIONS ? (slot as IllustrationSlot) : null
}

// Characters carved into a stage's chop seal: the place in Chinese when we know it.
const PLACE_SEALS: [RegExp, string][] = [
  [/tainan/i, '臺南'],
  [/taipei/i, '臺北'],
  [/taichung/i, '臺中'],
  [/kaohsiung/i, '高雄'],
  [/taiwan/i, '臺灣'],
  [/california|san gabriel|arcadia|los angeles/i, '加州'],
  [/new york/i, '紐約'],
]

export function sealFor(stage: LifeStage | undefined, fallback = '家書'): string {
  const text = `${stage?.place ?? ''} ${stage?.label ?? ''}`
  return PLACE_SEALS.find(([re]) => re.test(text))?.[1] ?? fallback
}

// The Chinese part of a name like "Ama 林秀英", for signature seals.
export function cjkName(name: string | null | undefined): string | null {
  const match = name?.match(/[㐀-鿿]+/)?.[0]
  return match ? match.slice(-2) : null
}
