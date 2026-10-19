// Whether this browser has seen the Postscript welcome (the first step of intake).
// Shown once; "Begin" marks it seen. Storage can fail (private mode), so every access is wrapped.
const KEY = 'postscript-welcomed'

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Storage unavailable: they'll see the welcome again next visit.
  }
}

export function resetWelcome() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to reset.
  }
}
