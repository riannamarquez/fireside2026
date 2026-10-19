import type { Passage } from '../types'
import { getToday } from './today'

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]

export function numberToWords(n: number): string {
  return WORDS[n] ?? String(n)
}

export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? ''
}

export function initials(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function greeting(date = getToday()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// "1958–1975" → "1958"
export function startYear(years: string | undefined): string | undefined {
  return years?.match(/\d{4}/)?.[0]
}

export function readMinutes(passages: Passage[]): number {
  const words = passages.reduce((sum, p) => sum + p.text.trim().split(/\s+/).filter(Boolean).length, 0)
  return Math.max(1, Math.ceil(words / 200))
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return ''
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// "Today, 9:42 AM" / "Yesterday, 9:42 AM" / "Mon, Oct 12, 9:42 AM"
export function formatMemoDate(iso: string, now = getToday()): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const dayDiff = Math.round(
    (new Date(now.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000,
  )
  if (dayDiff === 0) return `Today, ${time}`
  if (dayDiff === 1) return `Yesterday, ${time}`
  const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return `${day}, ${time}`
}

export function memoTitle(transcript: string | undefined, createdAt: string): string {
  const words = transcript?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length) {
    const title = words.slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '')
    return words.length > 6 ? `${title}…` : title
  }
  return `Memory from ${new Date(createdAt).toLocaleDateString(undefined, { weekday: 'long' })}`
}

// A letter's title: the first few words she said, or "Letter from Tuesday".
export function letterTitle(transcript: string | undefined, createdAt: string): string {
  const text = transcript?.trim() ?? ''
  if (/^[\u3400-\u9fff]/.test(text)) {
    const first = text.split(/[，。！？,.!?]/)[0] ?? ''
    return first.length > 14 ? `${first.slice(0, 14)}…` : first
  }
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length) {
    const title = words.slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '')
    return words.length > 6 ? `${title}…` : title
  }
  return `Letter from ${new Date(createdAt).toLocaleDateString(undefined, { weekday: 'long' })}`
}
