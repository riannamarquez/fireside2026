// The one source of "today" for every date check (release days, presets, greetings).
// The demo panel can set a fake date (e.g. jump to 2031-06-12); the time of day stays real.

const FAKE_TODAY_KEY = 'postscript-fake-today'

export function getFakeToday(): string | null {
  try {
    return localStorage.getItem(FAKE_TODAY_KEY)
  } catch {
    return null
  }
}

export function setFakeToday(date: string | null) {
  try {
    if (date) localStorage.setItem(FAKE_TODAY_KEY, date)
    else localStorage.removeItem(FAKE_TODAY_KEY)
  } catch {
    // Storage unavailable: the fake date just won't stick.
  }
}

export function getToday(): Date {
  const now = new Date()
  const fake = getFakeToday()
  if (!fake) return now
  const [y, m, d] = fake.split('-').map(Number)
  if (!y || !m || !d) return now
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
}

// Local YYYY-MM-DD (not toISOString, which is UTC and can be a day off).
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function todayString(): string {
  return toDateString(getToday())
}

// "2031-06-12" -> "June 12, 2031"
export function formatDay(date: string, month: 'long' | 'short' = 'long'): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, { month, day: 'numeric', year: 'numeric' })
}
