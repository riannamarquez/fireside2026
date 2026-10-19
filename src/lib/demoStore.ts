// Storage for demo mode: an in-memory copy of the data, persisted to localStorage.
// Recorded audio is too big for localStorage (~5MB), so blobs go to IndexedDB and
// letters store "idb:<key>" in place of a URL; api.ts turns those into object URLs.
// Every storage access is wrapped: in a private window the demo still works for the session.
import type { Chapter, Family, FamilyMember, Letter, LetterReply, LifeMap, Memo } from '../types'
import { DEMO_FAMILY_CODE, seedChapters, seedFamily, seedLetters, seedLifeMap, seedMembers, seedReplies } from './demoSeed'

export type DemoState = {
  version: number
  family: Family
  members: FamilyMember[]
  viewerId: string
  lifeMap: LifeMap
  memos: Memo[]
  chapters: Chapter[]
  letters: Letter[]
  replies: LetterReply[]
}

const STATE_KEY = 'postscript-demo'
const VERSION = 2 // bump when the seed changes, so stored demo data is replaced

function seed(): DemoState {
  // structuredClone so edits never touch the seed constants.
  return structuredClone({
    version: VERSION,
    family: seedFamily,
    members: seedMembers,
    viewerId: 'm-ama',
    lifeMap: seedLifeMap,
    memos: [],
    chapters: seedChapters,
    letters: seedLetters,
    replies: seedReplies,
  })
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed.version === VERSION) return parsed
    }
  } catch {
    // Unreadable or blocked storage: start from the seed.
  }
  return seed()
}

let state = load()

export function demoState(): DemoState {
  return state
}

export function persist() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: changes last until the page is reloaded.
  }
}

export async function resetDemoState() {
  state = seed()
  persist()
  memoryAudio.clear()
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, 'readwrite')
      tx.objectStore(AUDIO_STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Nothing stored, or IndexedDB unavailable.
  }
}

export { DEMO_FAMILY_CODE }

// --- audio blobs ---

const DB_NAME = 'postscript-demo-audio'
const AUDIO_STORE = 'audio'
const memoryAudio = new Map<string, Blob>() // fallback when IndexedDB is unavailable
const objectUrls = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(AUDIO_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putAudio(key: string, blob: Blob): Promise<string> {
  memoryAudio.set(key, blob)
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, 'readwrite')
      tx.objectStore(AUDIO_STORE).put(blob, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Kept in memory for this session only.
  }
  return `idb:${key}`
}

export async function deleteAudio(url: string) {
  if (!url.startsWith('idb:')) return
  const key = url.slice(4)
  memoryAudio.delete(key)
  const objectUrl = objectUrls.get(key)
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrls.delete(key)
  try {
    const db = await openDb()
    db.transaction(AUDIO_STORE, 'readwrite').objectStore(AUDIO_STORE).delete(key)
  } catch {
    // Already gone.
  }
}

// "idb:<key>" -> a playable object URL ('' if the blob is gone); other URLs pass through.
export async function resolveAudio(url: string): Promise<string> {
  if (!url.startsWith('idb:')) return url
  const key = url.slice(4)
  const cached = objectUrls.get(key)
  if (cached) return cached
  let blob = memoryAudio.get(key)
  if (!blob) {
    try {
      const db = await openDb()
      blob = await new Promise<Blob | undefined>((resolve, reject) => {
        const req = db.transaction(AUDIO_STORE).objectStore(AUDIO_STORE).get(key)
        req.onsuccess = () => resolve(req.result as Blob | undefined)
        req.onerror = () => reject(req.error)
      })
    } catch {
      blob = undefined
    }
  }
  if (!blob) return ''
  const objectUrl = URL.createObjectURL(blob)
  objectUrls.set(key, objectUrl)
  return objectUrl
}
