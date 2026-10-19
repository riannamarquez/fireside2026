// All data access for the app goes through this file.
// Screens only use these functions, so the DB shape can change here without
// touching src/pages/. DB ids are integers; the app uses strings.
//
// Demo mode (VITE_DEMO_MODE, default true): an in-memory store persisted to localStorage
// (src/lib/demoStore.ts), seeded with Ama's family. Set VITE_DEMO_MODE=false to use Supabase.

import { supabase } from './lib/supabase'
import { resizeImage } from './lib/image'
import { DEMO_FAMILY_CODE, deleteAudio, demoState, persist, putAudio, resetDemoState, resolveAudio as resolveDemoAudio } from './lib/demoStore'
import { firstName, letterTitle } from './lib/format'
import { releasePresets } from './lib/releasePresets'
import { detectPeople, detectSensitive, replaceNames } from './lib/sensitivity'
import { formatDay, getToday, todayString } from './lib/today'
import type {
  Chapter,
  Envelope,
  Family,
  FamilyMember,
  Letter,
  LetterAccess,
  LetterPiece,
  LetterReply,
  LifeMap,
  LifeStage,
  Memo,
  MemoTags,
  NameChoice,
  Passage,
  Person,
  PsPrompt,
  Recipients,
  ReleaseChoice,
  ReleasePreset,
  Sensitivity,
  SpecialDate,
  MoviePace,
  MovieStyle,
  StoryMovie,
  Storybook,
} from './types'

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE !== 'false'
// The demo store replaces the whole life map on save, so the form can be prefilled safely.
export const LIFE_MAP_REPLACES_ON_SAVE = IS_DEMO

// Memo audio is uploaded by the backend (POST /api/memos), so there's no memos bucket constant here.
const FAMILY_PHOTOS_BUCKET = 'family-photos'
const LETTER_AUDIO_BUCKET = 'memos' // letter audio goes under letters/ in the existing bucket
const STORYTELLER_KEY = 'fireside-storyteller'

type LifeStageRow = {
  id: number
  label: string | null
  place: string | null
  start_year: number | null
  end_year: number | null
  notes: string | null
}
type PersonRow = {
  id: number
  name: string | null
  nickname: string | null
  relationship: string | null
  // Postscript columns (supabase/postscript.sql)
  birthday?: string | null
  special_dates?: SpecialDate[] | null
  member_id?: number | null
}
type MemoRow = {
  id: number
  audio_url: string | null
  transcript: string | null
  created_at: string
  stage_id?: number | null
  tags?: MemoTags | null
}
type ChapterRow = { id: number; stage_id: number | null; title: string | null; body: unknown; status: string | null; letter_id?: string | null }

// --- mapping helpers ---

function parseYears(years: string): { start_year: number | null; end_year: number | null } {
  const found = years.match(/\d{4}/g) ?? []
  return {
    start_year: found[0] ? Number(found[0]) : null,
    end_year: found[1] ? Number(found[1]) : null,
  }
}

function formatYears(start: number | null, end: number | null): string {
  if (start && end) return `${start}–${end}`
  return String(start ?? end ?? '')
}

function toLifeStage(row: LifeStageRow): LifeStage {
  return {
    id: String(row.id),
    label: row.label ?? '',
    years: formatYears(row.start_year, row.end_year),
    place: row.place ?? '',
    livedWith: row.notes ?? '',
  }
}

function toPerson(row: PersonRow): Person {
  return {
    id: String(row.id),
    name: row.name ?? '',
    nickname: row.nickname || undefined,
    relation: row.relationship ?? '',
    birthday: row.birthday || undefined,
    specialDates: row.special_dates?.length ? row.special_dates : undefined,
    memberId: row.member_id == null ? undefined : String(row.member_id),
  }
}

function toMemo(row: MemoRow): Memo {
  return {
    id: String(row.id),
    audioUrl: row.audio_url ?? '',
    transcript: row.transcript ?? undefined,
    createdAt: row.created_at,
    stageId: row.stage_id == null ? undefined : String(row.stage_id),
    tags: row.tags ?? undefined,
  }
}

function toPassages(body: unknown): Passage[] {
  const list =
    Array.isArray(body) ? body
    : body && typeof body === 'object' && Array.isArray((body as { passages?: unknown }).passages)
      ? (body as { passages: unknown[] }).passages
      : []
  return list.map((item) => {
    const p = (item ?? {}) as { text?: unknown; memoId?: unknown; memo_id?: unknown }
    const memoId = p.memoId ?? p.memo_id
    return { text: typeof p.text === 'string' ? p.text : '', memoId: memoId == null ? '' : String(memoId) }
  })
}

// Memo ids are numbers; letter piece ids (uuids) are kept as strings.
function fromPassages(passages: Passage[]) {
  return passages.map((p) => {
    if (p.memoId === '') return { text: p.text, memoId: null }
    const memoId = Number(p.memoId)
    return { text: p.text, memoId: Number.isFinite(memoId) ? memoId : p.memoId }
  })
}

const STATUSES: Chapter['status'][] = ['draft', 'approved', 'hidden']

function toChapter(row: ChapterRow): Chapter {
  const status = STATUSES.find((s) => s === row.status) ?? 'draft'
  return {
    id: String(row.id),
    title: row.title ?? '',
    stageId: row.stage_id == null ? '' : String(row.stage_id),
    passages: toPassages(row.body),
    status,
    letterId: row.letter_id || undefined,
  }
}

function readStoryteller(): { name: string; birthYear: number } | null {
  try {
    const raw = localStorage.getItem(STORYTELLER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoryteller(name: string, birthYear: number) {
  try {
    localStorage.setItem(STORYTELLER_KEY, JSON.stringify({ name, birthYear }))
  } catch {
    // Storage unavailable (private mode etc.) — name/birth year just won't persist.
  }
}

const hasContent = (values: string[]) => values.some((v) => v.trim())

// --- API ---

// TODO: this always inserts new rows, so saving the life map twice duplicates
// stages and people. Needs an update/upsert path (or a "replace all") on the backend.
// (Demo mode replaces the whole life map instead.)
export async function saveLifeMap(map: LifeMap): Promise<LifeMap> {
  if (IS_DEMO) {
    const state = demoState()
    state.lifeMap = structuredClone({
      name: map.name,
      birthYear: map.birthYear,
      stages: map.stages.filter((s) => hasContent([s.label, s.years, s.place, s.livedWith])),
      people: linkPeople(map.people.filter((p) => hasContent([p.name, p.nickname ?? '', p.relation])), state.members),
    })
    persist()
    return structuredClone(state.lifeMap)
  }

  writeStoryteller(map.name, map.birthYear)

  const stageRows = map.stages
    .filter((s) => hasContent([s.label, s.years, s.place, s.livedWith]))
    .map((s) => ({ label: s.label, place: s.place, notes: s.livedWith, ...parseYears(s.years) }))
  const personRows = map.people
    .filter((p) => hasContent([p.name, p.nickname ?? '', p.relation]))
    .map((p) => ({
      name: p.name,
      nickname: p.nickname || null,
      relationship: p.relation,
      birthday: p.birthday || null,
      special_dates: p.specialDates?.length ? p.specialDates : null,
      member_id: p.memberId && /^\d+$/.test(p.memberId) ? Number(p.memberId) : null,
    }))

  let stages: LifeStage[] = []
  if (stageRows.length) {
    const { data, error } = await supabase.from('life_stages').insert(stageRows).select()
    if (error) throw error
    stages = (data as LifeStageRow[]).map(toLifeStage)
  }

  let people: Person[] = []
  if (personRows.length) {
    const { data, error } = await supabase.from('people').insert(personRows).select()
    if (error) throw error
    people = (data as PersonRow[]).map(toPerson)
  }

  return { name: map.name, birthYear: map.birthYear, stages, people }
}

export async function getLifeMap(): Promise<LifeMap | null> {
  if (IS_DEMO) return structuredClone(demoState().lifeMap)

  const [stagesRes, peopleRes] = await Promise.all([
    supabase.from('life_stages').select('*').order('start_year', { ascending: true }),
    supabase.from('people').select('*').order('id', { ascending: true }),
  ])
  if (stagesRes.error) throw stagesRes.error
  if (peopleRes.error) throw peopleRes.error

  const storyteller = readStoryteller()
  const stages = (stagesRes.data as LifeStageRow[]).map(toLifeStage)
  const people = (peopleRes.data as PersonRow[]).map(toPerson)
  if (!storyteller && stages.length === 0 && people.length === 0) return null

  return {
    name: storyteller?.name ?? '',
    birthYear: storyteller?.birthYear ?? 0,
    stages,
    people,
  }
}

// Goes through the FastAPI backend so the memo gets transcribed (Whisper) and tagged before it's saved.
export async function uploadMemo(blob: Blob): Promise<Memo> {
  const contentType = blob.type.split(';')[0].trim() || 'audio/webm'
  const ext = contentType.includes('mp4') ? 'm4a' : contentType.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', blob, `memo.${ext}`)
  const res = await fetch('/api/memos', { method: 'POST', body: form })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Upload failed (${res.status})`)
  return toMemo((await res.json()) as MemoRow)
}

/** Re-run transcription + AI tagging on a memo's saved audio (e.g. one saved while the backend had no OpenAI key). */
export async function reprocessMemo(memoId: string): Promise<Memo> {
  const res = await fetch(`/api/memos/${encodeURIComponent(memoId)}/reprocess`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Retry failed (${res.status})`)
  return toMemo((await res.json()) as MemoRow)
}

// For idempotent backend calls: retry once on a 5xx (e.g. a dropped Supabase connection on the backend).
async function postWithRetry(url: string): Promise<Response> {
  const res = await fetch(url, { method: 'POST' })
  if (res.status < 500) return res
  await new Promise((r) => setTimeout(r, 600))
  return fetch(url, { method: 'POST' })
}

/** Storytime: one memo as a rhyming kids' picture book. Cached on the memo; regenerate makes a new version. */
export async function makeStorybook(memoId: string, regenerate = false): Promise<Storybook> {
  const res = await postWithRetry(`/api/memos/${encodeURIComponent(memoId)}/storybook?regenerate=${regenerate}`)
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Storytime failed (${res.status})`)
  return res.json()
}

/** Storytime movie: renders the storybook as one continuous watercolor animation (~20 s to render, then cached). */
export async function makeStoryMovie(
  memoId: string,
  { style = 'watercolor', pace = 'normal', regenerate = false }: { style?: MovieStyle; pace?: MoviePace; regenerate?: boolean } = {},
): Promise<StoryMovie> {
  const q = new URLSearchParams({ style, pace, regenerate: String(regenerate) })
  const res = await postWithRetry(`/api/memos/${encodeURIComponent(memoId)}/storybook/video?${q}`)
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Movie failed (${res.status})`)
  return res.json()
}

/** AI writes a draft chapter from every memo placed in this life stage. */
export async function generateChapter(stageId: string): Promise<Chapter> {
  if (IS_DEMO) {
    // No AI in demo mode: the chapter is her own words from the stage's recordings.
    const memos = (await listMemos()).filter((m) => m.stageId === stageId).reverse()
    const stage = demoState().lifeMap.stages.find((s) => s.id === stageId)
    const chapter: Chapter = {
      id: `c-${crypto.randomUUID()}`,
      title: stage?.label ?? 'A new chapter',
      stageId,
      status: 'draft',
      passages: memos.map((m) => ({ text: m.transcript ?? '', memoId: m.id })).filter((p) => p.text),
    }
    demoState().chapters.push(chapter)
    persist()
    return structuredClone(chapter)
  }
  const res = await fetch(`/api/chapters/generate?stage_id=${encodeURIComponent(stageId)}`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Chapter failed (${res.status})`)
  return toChapter((await res.json()) as ChapterRow)
}

// Memos plus the letter pieces the current viewer is allowed to hear (so chapter audio works).
export async function listMemos(): Promise<Memo[]> {
  let memos: Memo[] = []
  if (!IS_DEMO) {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    memos = (data as MemoRow[]).map(toMemo)
  }
  const letterMemos = await visibleLetterMemos().catch((err) => {
    console.error(err)
    return []
  })
  return [...letterMemos, ...memos].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listChapters(): Promise<Chapter[]> {
  if (IS_DEMO) return structuredClone(demoState().chapters)
  const { data, error } = await supabase.from('chapters').select('*').order('id', { ascending: true })
  if (error) throw error
  return (data as ChapterRow[]).map(toChapter)
}

/** Chapters the current viewer may see in the Family Book: a "Now" letter sent to specific people stays out for everyone else. */
export async function listVisibleChapters(): Promise<Chapter[]> {
  const [ctx, letters, chapters] = await Promise.all([store.context(), store.letters(), listChapters()])
  if (isStoryteller(ctx)) return chapters
  const byId = new Map(letters.map((l) => [l.id, l]))
  return chapters.filter((c) => {
    const letter = c.letterId ? byId.get(c.letterId) : undefined
    return !letter || (!!ctx.me && isRecipient(letter, ctx.me.id, ctx.members))
  })
}

export async function updateChapter(
  id: string,
  changes: Partial<Omit<Chapter, 'id'>>,
): Promise<Chapter> {
  if (IS_DEMO) {
    const chapters = demoState().chapters
    const i = chapters.findIndex((c) => c.id === id)
    if (i === -1) throw new Error(`Chapter not found: ${id}`)
    chapters[i] = { ...chapters[i]!, ...changes }
    persist()
    return structuredClone(chapters[i]!)
  }

  const patch: Partial<Omit<ChapterRow, 'id'>> = {}
  if (changes.title !== undefined) patch.title = changes.title
  if (changes.status !== undefined) patch.status = changes.status
  if (changes.stageId !== undefined) patch.stage_id = changes.stageId === '' ? null : Number(changes.stageId)
  if (changes.passages !== undefined) patch.body = fromPassages(changes.passages)

  const { data, error } = await supabase
    .from('chapters')
    .update(patch)
    .eq('id', Number(id))
    .select()
    .single()
  if (error) throw error
  return toChapter(data as ChapterRow)
}

// --- Families ---
// No real auth for the hackathon: "who am I" is a member id saved in localStorage,
// and organizer-only actions are checked in the browser. This is NOT real security —
// anyone with the anon key can write to these tables directly.

type FamilyRow = { code: string; name: string | null; photo_url: string | null; created_at: string }
type FamilyMemberRow = {
  id: number
  family_code: string
  name: string
  role: string
  relationship?: string | null // only present once the relationship column SQL has run
  created_at: string
}

const FAMILY_ROLES: FamilyMember['role'][] = ['organizer', 'storyteller', 'reader', 'member']
const IDENTITY_KEY = 'fireside-me'

const UNIQUE_VIOLATION = '23505'

function toFamily(row: FamilyRow): Family {
  return {
    code: row.code,
    name: row.name || 'Our family',
    photoUrl: row.photo_url || undefined,
    createdAt: row.created_at,
  }
}

function toFamilyMember(row: FamilyMemberRow): FamilyMember {
  return {
    id: String(row.id),
    familyCode: row.family_code,
    name: row.name,
    role: FAMILY_ROLES.find((r) => r === row.role) ?? 'member',
    relationship: row.relationship || undefined,
    createdAt: row.created_at,
  }
}

function memberKey(code: string) {
  return `fireside-member:${code}`
}

export async function getFamily(code: string): Promise<Family | null> {
  if (IS_DEMO) return code === DEMO_FAMILY_CODE ? structuredClone(demoState().family) : null
  const { data, error } = await supabase.from('families').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  return data ? toFamily(data as FamilyRow) : null
}

export async function ensureFamily(code: string): Promise<Family> {
  if (IS_DEMO) return structuredClone(demoState().family)
  const { error } = await supabase
    .from('families')
    .upsert({ code }, { onConflict: 'code', ignoreDuplicates: true })
  if (error) throw error
  const family = await getFamily(code)
  if (!family) throw new Error(`Family not found after creating it: ${code}`)
  return family
}

export async function listFamilyMembers(code: string): Promise<FamilyMember[]> {
  if (IS_DEMO) return code === DEMO_FAMILY_CODE ? structuredClone(demoState().members) : []
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_code', code)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as FamilyMemberRow[]).map(toFamilyMember)
}

async function insertMember(code: string, name: string, role: FamilyMember['role']) {
  return supabase.from('family_members').insert({ family_code: code, name, role }).select().single()
}

// The first person to join becomes the organizer. The unique partial index on
// family_members(family_code) where role = 'organizer' settles races: if someone
// else became organizer first, the insert fails and we join as a member instead.
export async function joinFamily(code: string, name: string): Promise<FamilyMember> {
  if (IS_DEMO) {
    const state = demoState()
    const member: FamilyMember = { id: `m-${crypto.randomUUID()}`, familyCode: DEMO_FAMILY_CODE, name, role: 'reader', createdAt: getToday().toISOString() }
    state.members.push(member)
    state.viewerId = member.id
    persist()
    return structuredClone(member)
  }

  await ensureFamily(code)

  const { count, error: countError } = await supabase
    .from('family_members')
    .select('id', { count: 'exact', head: true })
    .eq('family_code', code)
    .eq('role', 'organizer')
  if (countError) throw countError

  if (!count) {
    const { data, error } = await insertMember(code, name, 'organizer')
    if (!error) return toFamilyMember(data as FamilyMemberRow)
    if (error.code !== UNIQUE_VIOLATION) throw error
  }

  const { data, error } = await insertMember(code, name, 'member')
  if (error) throw error
  return toFamilyMember(data as FamilyMemberRow)
}

// Resizes in the browser (max 1600px, JPEG ~0.85), uploads to
// family-photos/<code>/cover.jpg and saves a cache-busted public URL on the family.
export async function uploadFamilyPhoto(code: string, file: File): Promise<string> {
  const jpeg = await resizeImage(file)

  if (IS_DEMO) {
    // Smaller copy as a data URL so it fits in localStorage.
    const small = await resizeImage(new File([jpeg], 'cover.jpg', { type: 'image/jpeg' }), 900, 0.8)
    const photoUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(small)
    })
    demoState().family.photoUrl = photoUrl
    persist()
    return photoUrl
  }

  const path = `${code}/cover.jpg`

  const { error: uploadError } = await supabase.storage
    .from(FAMILY_PHOTOS_BUCKET)
    .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(FAMILY_PHOTOS_BUCKET).getPublicUrl(path)
  const photoUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { error } = await supabase.from('families').update({ photo_url: photoUrl }).eq('code', code)
  if (error) throw error
  return photoUrl
}

export function getCurrentMember(code: string): string | null {
  if (IS_DEMO) return code === DEMO_FAMILY_CODE ? demoState().viewerId : null
  try {
    return localStorage.getItem(memberKey(code))
  } catch {
    return null
  }
}

export function saveCurrentMember(code: string, memberId: string) {
  if (IS_DEMO) {
    demoState().viewerId = memberId
    persist()
    return
  }
  try {
    localStorage.setItem(memberKey(code), memberId)
  } catch {
    // Storage unavailable — they'll be asked for their name again next visit.
  }
}

// "Who am I" across screens (header initials, which family /family opens).
// Same caveat as above: localStorage only, not real identity.
export type MyIdentity = { code: string; name: string }

export function getMyIdentity(): MyIdentity | null {
  if (IS_DEMO) {
    const state = demoState()
    const me = state.members.find((m) => m.id === state.viewerId)
    return { code: DEMO_FAMILY_CODE, name: me?.name ?? '' }
  }
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    return raw ? (JSON.parse(raw) as MyIdentity) : null
  } catch {
    return null
  }
}

export function saveMyIdentity(identity: MyIdentity) {
  if (IS_DEMO) return // the demo viewer is the identity
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  } catch {
    // Storage unavailable — header falls back to the life map name.
  }
}

// Synchronous best guess at the current user's name: family identity first,
// then the storyteller name saved by saveLifeMap.
export function getMyName(): string | null {
  return getMyIdentity()?.name || readStoryteller()?.name || null
}

// =====================================================================
// Postscript letters
// =====================================================================
//
// Storage goes through a small LetterStore (demo store or Supabase); everything else
// below (who can see or change what, release rules) is shared by both modes.

type LetterContext = {
  me: FamilyMember | null
  members: FamilyMember[]
  people: Person[]
  stages: LifeStage[]
  storytellerName: string
}

type LetterStore = {
  context(): Promise<LetterContext>
  letters(): Promise<Letter[]>
  putLetter(letter: Letter): Promise<void>
  removeLetter(id: string): Promise<void>
  replies(): Promise<LetterReply[]>
  putReply(reply: LetterReply): Promise<void>
  storeAudio(blob: Blob, key: string): Promise<string>
  dropAudio(url: string): Promise<void>
  resolveAudio(url: string): Promise<string>
  saveChapter(chapter: Chapter, isNew: boolean): Promise<Chapter>
  removeChapter(id: string): Promise<void>
}

// Intake people link to family members by memberId, or by matching first names.
function linkPeople(people: Person[], members: FamilyMember[]): Person[] {
  return people.map((p) => {
    if (p.memberId) return p
    const match = members.find((m) => m.role !== 'storyteller' && firstName(m.name).toLowerCase() === firstName(p.name).toLowerCase())
    return match ? { ...p, memberId: match.id } : p
  })
}

function storytellerNameFrom(members: FamilyMember[], lifeMapName: string | undefined) {
  return members.find((m) => m.role === 'storyteller')?.name || firstName(lifeMapName) || 'Grandma'
}

const demoStore: LetterStore = {
  async context() {
    const state = demoState()
    return structuredClone({
      me: state.members.find((m) => m.id === state.viewerId) ?? null,
      members: state.members,
      people: linkPeople(state.lifeMap.people, state.members),
      stages: state.lifeMap.stages,
      storytellerName: storytellerNameFrom(state.members, state.lifeMap.name),
    })
  },
  async letters() {
    return structuredClone(demoState().letters)
  },
  async putLetter(letter) {
    const letters = demoState().letters
    const i = letters.findIndex((l) => l.id === letter.id)
    if (i === -1) letters.push(structuredClone(letter))
    else letters[i] = structuredClone(letter)
    persist()
  },
  async removeLetter(id) {
    const state = demoState()
    state.letters = state.letters.filter((l) => l.id !== id)
    state.replies = state.replies.filter((r) => r.letterId !== id)
    persist()
  },
  async replies() {
    return structuredClone(demoState().replies)
  },
  async putReply(reply) {
    demoState().replies.push(structuredClone(reply))
    persist()
  },
  storeAudio: (blob, key) => putAudio(key, blob),
  dropAudio: deleteAudio,
  resolveAudio: resolveDemoAudio,
  async saveChapter(chapter, isNew) {
    const chapters = demoState().chapters
    const saved = isNew ? { ...chapter, id: `c-${crypto.randomUUID()}` } : chapter
    const i = chapters.findIndex((c) => c.id === saved.id)
    if (i === -1) chapters.push(structuredClone(saved))
    else chapters[i] = structuredClone(saved)
    persist()
    return saved
  },
  async removeChapter(id) {
    const state = demoState()
    state.chapters = state.chapters.filter((c) => c.id !== id)
    persist()
  },
}

type LetterRow = {
  id: string
  family_code: string
  title: string | null
  stage_id: number | null
  created_at: string
  status: string | null
  origin: string | null
  decided: boolean | null
  pieces: LetterPiece[] | null
  ps_pieces: LetterPiece[] | null
  release_mode: string | null
  release_at: string | null
  recipients: Recipients | null
  keeper_id: string | null
  keeper_released_at: string | null
  sealed_at: string | null
  excluded: string[] | null
  name_choices: NameChoice[] | null
  sensitive: Sensitivity | null
  passages: Passage[] | null
  opened_at: Record<string, string> | null
  chapter_id: number | null
}
type LetterReplyRow = { id: string; family_code: string; letter_id: string; member_id: string; member_name: string | null; audio_url: string | null; created_at: string }

const RELEASE_MODES: Letter['releaseMode'][] = ['now', 'date', 'after', 'private']

function toLetter(row: LetterRow): Letter {
  return {
    id: row.id,
    title: row.title ?? '',
    stageId: row.stage_id == null ? undefined : String(row.stage_id),
    createdAt: row.created_at,
    status: row.status === 'in_progress' ? 'in_progress' : 'finished',
    origin: row.origin === 'secret' ? 'secret' : 'normal',
    decided: row.decided ?? false,
    pieces: row.pieces ?? [],
    psPieces: row.ps_pieces ?? [],
    releaseMode: RELEASE_MODES.find((m) => m === row.release_mode) ?? 'private',
    releaseAt: row.release_at ?? undefined,
    recipients: row.recipients ?? [],
    keeperId: row.keeper_id ?? undefined,
    keeperReleasedAt: row.keeper_released_at ?? undefined,
    sealedAt: row.sealed_at ?? undefined,
    excluded: row.excluded ?? [],
    nameChoices: row.name_choices ?? [],
    sensitive: row.sensitive ?? { flagged: false, mentalHealth: false, matches: [] },
    passages: row.passages ?? [],
    openedAt: row.opened_at ?? {},
    chapterId: row.chapter_id == null ? undefined : String(row.chapter_id),
  }
}

function fromLetter(l: Letter, familyCode: string): LetterRow {
  return {
    id: l.id,
    family_code: familyCode,
    title: l.title,
    stage_id: l.stageId && /^\d+$/.test(l.stageId) ? Number(l.stageId) : null,
    created_at: l.createdAt,
    status: l.status,
    origin: l.origin,
    decided: l.decided,
    pieces: l.pieces,
    ps_pieces: l.psPieces,
    release_mode: l.releaseMode,
    release_at: l.releaseAt ?? null,
    recipients: l.recipients,
    keeper_id: l.keeperId ?? null,
    keeper_released_at: l.keeperReleasedAt ?? null,
    sealed_at: l.sealedAt ?? null,
    excluded: l.excluded,
    name_choices: l.nameChoices,
    sensitive: l.sensitive,
    passages: l.passages,
    opened_at: l.openedAt,
    chapter_id: l.chapterId && /^\d+$/.test(l.chapterId) ? Number(l.chapterId) : null,
  }
}

const familyCode = () => getMyIdentity()?.code ?? 'default'

const supabaseStore: LetterStore = {
  async context() {
    const code = familyCode()
    const [members, map] = await Promise.all([listFamilyMembers(code), getLifeMap()])
    const meId = getCurrentMember(code)
    return {
      me: members.find((m) => m.id === meId) ?? null,
      members,
      people: linkPeople(map?.people ?? [], members),
      stages: map?.stages ?? [],
      storytellerName: storytellerNameFrom(members, map?.name),
    }
  },
  async letters() {
    const { data, error } = await supabase.from('letters').select('*').eq('family_code', familyCode()).order('created_at', { ascending: true })
    if (error) throw error
    return (data as LetterRow[]).map(toLetter)
  },
  async putLetter(letter) {
    const { error } = await supabase.from('letters').upsert(fromLetter(letter, familyCode()))
    if (error) throw error
  },
  async removeLetter(id) {
    const { error } = await supabase.from('letters').delete().eq('id', id)
    if (error) throw error
  },
  async replies() {
    const { data, error } = await supabase.from('letter_replies').select('*').eq('family_code', familyCode()).order('created_at', { ascending: true })
    if (error) throw error
    return (data as LetterReplyRow[]).map((r) => ({
      id: r.id,
      letterId: r.letter_id,
      memberId: r.member_id,
      memberName: r.member_name ?? '',
      audioUrl: r.audio_url ?? '',
      createdAt: r.created_at,
    }))
  },
  async putReply(reply) {
    const { error } = await supabase.from('letter_replies').insert({
      id: reply.id,
      family_code: familyCode(),
      letter_id: reply.letterId,
      member_id: reply.memberId,
      member_name: reply.memberName,
      audio_url: reply.audioUrl,
      created_at: reply.createdAt,
    })
    if (error) throw error
  },
  async storeAudio(blob, key) {
    const contentType = blob.type.split(';')[0]?.trim() || 'audio/webm'
    const ext = contentType.includes('mp4') ? 'm4a' : contentType.includes('ogg') ? 'ogg' : 'webm'
    const path = `letters/${familyCode()}/${key}.${ext}`
    const { error } = await supabase.storage.from(LETTER_AUDIO_BUCKET).upload(path, blob, { contentType })
    if (error) throw error
    return supabase.storage.from(LETTER_AUDIO_BUCKET).getPublicUrl(path).data.publicUrl
  },
  async dropAudio(url) {
    const marker = `/${LETTER_AUDIO_BUCKET}/`
    const i = url.indexOf(`${marker}letters/`)
    if (i === -1) return
    await supabase.storage.from(LETTER_AUDIO_BUCKET).remove([url.slice(i + marker.length)])
  },
  resolveAudio: async (url) => url,
  async saveChapter(chapter, isNew) {
    if (!isNew) return updateChapter(chapter.id, chapter)
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        stage_id: chapter.stageId && /^\d+$/.test(chapter.stageId) ? Number(chapter.stageId) : null,
        title: chapter.title,
        body: fromPassages(chapter.passages),
        status: chapter.status,
        letter_id: chapter.letterId ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return toChapter(data as ChapterRow)
  },
  async removeChapter(id) {
    const { error } = await supabase.from('chapters').delete().eq('id', Number(id))
    if (error) throw error
  },
}

const store: LetterStore = IS_DEMO ? demoStore : supabaseStore

// --- rules ---

// Permission checks below are demo-level, NOT real security: "who am I" is a member id in the
// browser, and anyone with the anon key can read or write the tables directly. They keep the app
// honest for the demo (only the storyteller can see or change her sealed letters, only the keeper
// can release "when I'm gone" letters). Real privacy needs auth plus row-level security.
function requireStoryteller(ctx: LetterContext) {
  if (ctx.me?.role !== 'storyteller') throw new Error('Only the storyteller can change her letters.')
}

function isStoryteller(ctx: LetterContext) {
  return ctx.me?.role === 'storyteller'
}

function isRecipient(l: Letter, memberId: string, members: FamilyMember[]) {
  if (l.excluded.includes(memberId)) return false
  const member = members.find((m) => m.id === memberId)
  if (!member || member.role === 'storyteller') return false
  return l.recipients === 'all' || l.recipients.includes(memberId)
}

// Sealed = waiting for a day or for the keeper. These show as envelopes.
function isSealed(l: Letter) {
  return l.decided && l.status === 'finished' && (l.releaseMode === 'date' || l.releaseMode === 'after')
}

function releaseHasArrived(l: Letter) {
  if (l.releaseMode === 'now') return true
  if (l.releaseMode === 'date') return !!l.releaseAt && todayString() >= l.releaseAt
  if (l.releaseMode === 'after') return !!l.keeperReleasedAt
  return false
}

function isOpenable(l: Letter, memberId: string, members: FamilyMember[]) {
  return l.decided && l.status === 'finished' && isRecipient(l, memberId, members) && releaseHasArrived(l)
}

function hasBeenOpened(l: Letter) {
  return Object.keys(l.openedAt).length > 0
}

// The letter's chapter: her words, a few sentences per passage, each tied to its piece's audio.
function passagesFrom(pieces: LetterPiece[]): Passage[] {
  const passages: Passage[] = []
  for (const piece of pieces) {
    const text = piece.transcript?.trim()
    if (!text) continue
    const sentences = text.match(/[^.!?。！？]+[.!?。！？]+["”’]?\s*|[^.!?。！？]+$/g) ?? [text]
    for (let i = 0; i < sentences.length; i += 3) {
      passages.push({ text: sentences.slice(i, i + 3).join('').trim(), memoId: piece.id })
    }
  }
  return passages
}

// Which life stage a letter belongs to: a year she mentions, else a place, else the latest stage.
function guessStage(text: string, stages: LifeStage[]): string | undefined {
  const range = (s: LifeStage) => {
    const years = s.years.match(/\d{4}/g)?.map(Number) ?? []
    return { from: years[0] ?? 0, to: /present/i.test(s.years) ? 9999 : (years[1] ?? years[0] ?? 0) }
  }
  for (const y of (text.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number)) {
    const stage = stages.find((s) => {
      const r = range(s)
      return y >= r.from && y <= r.to
    })
    if (stage) return stage.id
  }
  // A year between stages goes to the closest one.
  const firstYear = Number(text.match(/\b(19|20)\d{2}\b/)?.[0])
  if (firstYear && stages.length) {
    const distance = (s: LifeStage) => {
      const r = range(s)
      return firstYear < r.from ? r.from - firstYear : firstYear - r.to
    }
    return [...stages].sort((a, b) => distance(a) - distance(b))[0]!.id
  }
  const lower = text.toLowerCase()
  const byPlace = stages.find((s) => {
    const place = s.place.split(',')[0]?.trim().toLowerCase()
    return place && lower.includes(place)
  })
  return byPlace?.id ?? stages.at(-1)?.id
}

function mergeSensitivity(a: Sensitivity, b: Sensitivity): Sensitivity {
  return { flagged: a.flagged || b.flagged, mentalHealth: a.mentalHealth || b.mentalHealth, matches: [...new Set([...a.matches, ...b.matches])] }
}

async function hydrate(l: Letter): Promise<Letter> {
  const resolvePieces = (pieces: LetterPiece[]) => Promise.all(pieces.map(async (p) => ({ ...p, audioUrl: await store.resolveAudio(p.audioUrl) })))
  const [pieces, psPieces] = await Promise.all([resolvePieces(l.pieces), resolvePieces(l.psPieces)])
  return { ...l, pieces, psPieces }
}

async function hydrateReplies(replies: LetterReply[]): Promise<LetterReply[]> {
  return Promise.all(replies.map(async (r) => ({ ...r, audioUrl: await store.resolveAudio(r.audioUrl) })))
}

// What a reader gets: names swapped where she asked, no sealing details.
async function presentForReader(l: Letter, people: Person[]): Promise<Letter> {
  const swap = (text: string) =>
    l.nameChoices.reduce((out, c) => {
      const person = people.find((p) => p.id === c.personId)
      return c.choice === 'replace' && c.replacement?.trim() && person ? replaceNames(out, person, c.replacement.trim()) : out
    }, text)
  const swapPieces = (pieces: LetterPiece[]) => pieces.map((p) => ({ ...p, transcript: p.transcript && swap(p.transcript) }))
  return hydrate({
    ...l,
    title: swap(l.title),
    passages: l.passages.map((p) => ({ ...p, text: swap(p.text) })),
    pieces: swapPieces(l.pieces),
    psPieces: swapPieces(l.psPieces),
    excluded: [],
    nameChoices: [],
    keeperId: undefined,
  })
}

function namesOf(recipients: Recipients, members: FamilyMember[]) {
  if (recipients === 'all') return 'the family'
  const names = recipients.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean) as string[]
  if (names.length <= 1) return names[0] ?? 'someone'
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function envelopeFor(l: Letter, ctx: LetterContext, viewerId: string): Envelope {
  const openable = isOpenable(l, viewerId, ctx.members)
  const forNames = l.recipients === 'all' ? 'the family' : namesOf(l.recipients.filter((id) => !l.excluded.includes(id)), ctx.members)
  return {
    id: l.id,
    stageId: l.stageId,
    fromName: ctx.storytellerName,
    forNames,
    opensLabel: openable ? 'Ready to open' : l.releaseMode === 'date' && l.releaseAt ? `Opens ${formatDay(l.releaseAt)}` : 'Opens when the time comes',
    openable,
  }
}

async function findLetter(id: string): Promise<Letter> {
  const letter = (await store.letters()).find((l) => l.id === id)
  if (!letter) throw new Error('That letter is gone.')
  return letter
}

// Loads a letter for the storyteller to change. Opened letters can't be changed.
async function editableLetter(id: string) {
  const ctx = await store.context()
  requireStoryteller(ctx)
  const letter = await findLetter(id)
  return { ctx, letter }
}

async function syncChapter(letter: Letter) {
  if (!letter.chapterId) return
  const chapter = (await listChapters()).find((c) => c.id === letter.chapterId)
  if (chapter) await store.saveChapter({ ...chapter, title: letter.title, stageId: letter.stageId ?? '', passages: letter.passages }, false)
}

async function visibleLetterMemos(): Promise<Memo[]> {
  const [ctx, letters, chapters] = await Promise.all([store.context(), store.letters(), listChapters()])
  const approved = new Set(chapters.filter((c) => c.status !== 'hidden').map((c) => c.letterId).filter(Boolean))
  const visible = letters.filter((l) => {
    if (isStoryteller(ctx)) return true
    if (l.releaseMode === 'now') return approved.has(l.id) && !!ctx.me && isRecipient(l, ctx.me.id, ctx.members)
    return !!ctx.me && !!l.openedAt[ctx.me.id]
  })
  const presented = await Promise.all(visible.map((l) => (isStoryteller(ctx) ? hydrate(l) : presentForReader(l, ctx.people))))
  return presented.flatMap((l) =>
    l.pieces.map((p) => ({ id: p.id, audioUrl: p.audioUrl, transcript: p.transcript, createdAt: p.createdAt, stageId: l.stageId })),
  )
}

// --- who's looking ---

export type Viewer = { me: FamilyMember | null; members: FamilyMember[]; storytellerName: string; isStoryteller: boolean }

export async function getViewer(): Promise<Viewer> {
  const ctx = await store.context()
  return { me: ctx.me, members: ctx.members, storytellerName: ctx.storytellerName, isStoryteller: isStoryteller(ctx) }
}

// --- recording a letter ---

/** Sensitive-story suggestion. Uses the backend AI when it answers, else the keyword check. Never seals anything. */
export async function checkSensitive(transcript: string): Promise<Sensitivity> {
  const keywords = detectSensitive(transcript)
  if (!transcript.trim()) return keywords
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 5000)
    const res = await fetch('/api/sensitivity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    })
    window.clearTimeout(timer)
    if (!res.ok) return keywords
    const ai = (await res.json()) as { sensitive?: boolean; mental_health?: boolean; reason?: string | null }
    return { flagged: !!ai.sensitive, mentalHealth: !!ai.mental_health, matches: ai.reason ? [ai.reason] : [] }
  } catch {
    return keywords
  }
}

/** Family members (and other intake people) the letter mentions, by name or nickname. */
export async function findMentionedPeople(letterId: string): Promise<Person[]> {
  const ctx = await store.context()
  requireStoryteller(ctx)
  const letter = await findLetter(letterId)
  const text = [...letter.pieces, ...letter.psPieces].map((p) => p.transcript ?? '').join('\n')
  const storytellerId = ctx.members.find((m) => m.role === 'storyteller')?.id
  return detectPeople(text, ctx.people.filter((p) => !p.memberId || p.memberId !== storytellerId))
}

export async function getReleasePresets(): Promise<ReleasePreset[]> {
  return releasePresets((await store.context()).people)
}

/** First recording of a new letter. Saved right away so "Forget this" can delete it. */
export async function createLetter({ origin, blob, transcript }: { origin: Letter['origin']; blob: Blob; transcript: string }): Promise<Letter> {
  const ctx = await store.context()
  requireStoryteller(ctx)
  const now = getToday().toISOString()
  const pieceId = crypto.randomUUID()
  const piece: LetterPiece = { id: pieceId, audioUrl: await store.storeAudio(blob, pieceId), transcript: transcript.trim() || undefined, createdAt: now }
  const letter: Letter = {
    id: crypto.randomUUID(),
    title: letterTitle(transcript, now),
    stageId: guessStage(transcript, ctx.stages),
    createdAt: now,
    status: 'in_progress',
    origin,
    decided: false,
    pieces: [piece],
    psPieces: [],
    releaseMode: origin === 'secret' ? 'private' : 'now',
    recipients: 'all',
    excluded: [],
    nameChoices: [],
    sensitive: detectSensitive(transcript),
    passages: passagesFrom([piece]),
    openedAt: {},
  }
  await store.putLetter(letter)
  return hydrate(letter)
}

/** "Add to this letter": another piece, played after the others. The chapter text is rebuilt from all pieces. */
export async function addLetterPiece(letterId: string, blob: Blob, transcript: string): Promise<Letter> {
  const { letter } = await editableLetter(letterId)
  if (letter.status === 'finished') throw new Error('This letter is finished.')
  const pieceId = crypto.randomUUID()
  const piece: LetterPiece = { id: pieceId, audioUrl: await store.storeAudio(blob, pieceId), transcript: transcript.trim() || undefined, createdAt: getToday().toISOString() }
  const pieces = [...letter.pieces, piece]
  const updated: Letter = {
    ...letter,
    pieces,
    passages: passagesFrom(pieces),
    title: letter.pieces.some((p) => p.transcript) ? letter.title : letterTitle(transcript, letter.createdAt),
    sensitive: mergeSensitivity(letter.sensitive, detectSensitive(transcript)),
  }
  await store.putLetter(updated)
  await syncChapter(updated)
  return hydrate(updated)
}

/** A P.S. to the reader (or an answer to "Why are you telling them this?" / "What do you hope they understand?"). */
export async function addPsPiece(letterId: string, prompt: PsPrompt, blob: Blob, transcript: string): Promise<Letter> {
  const { letter } = await editableLetter(letterId)
  if (hasBeenOpened(letter)) throw new Error('This letter has already been opened.')
  const pieceId = crypto.randomUUID()
  const piece: LetterPiece = { id: pieceId, audioUrl: await store.storeAudio(blob, pieceId), transcript: transcript.trim() || undefined, createdAt: getToday().toISOString(), prompt }
  const updated = { ...letter, psPieces: [...letter.psPieces, piece] }
  await store.putLetter(updated)
  return hydrate(updated)
}

/** Fixes what the speech recognizer heard. Rebuilds the title, chapter text and keyword check. */
export async function updatePieceTranscript(letterId: string, pieceId: string, transcript: string): Promise<Letter> {
  const { letter } = await editableLetter(letterId)
  if (hasBeenOpened(letter)) throw new Error('This letter has already been opened.')
  const fix = (pieces: LetterPiece[]) => pieces.map((p) => (p.id === pieceId ? { ...p, transcript: transcript.trim() || undefined } : p))
  const pieces = fix(letter.pieces)
  const allText = pieces.map((p) => p.transcript ?? '').join('\n')
  const updated: Letter = {
    ...letter,
    pieces,
    psPieces: fix(letter.psPieces),
    passages: passagesFrom(pieces),
    title: letter.pieces[0]?.id === pieceId ? letterTitle(transcript, letter.createdAt) : letter.title,
    stageId: letter.pieces[0]?.id === pieceId ? (guessStage(allText, (await store.context()).stages) ?? letter.stageId) : letter.stageId,
    sensitive: detectSensitive(allText),
  }
  await store.putLetter(updated)
  await syncChapter(updated)
  return hydrate(updated)
}

/** "Forget this": deletes a recording right away. A letter with no pieces left is deleted too. */
export async function forgetPiece(letterId: string, pieceId: string): Promise<{ letterDeleted: boolean }> {
  const { letter } = await editableLetter(letterId)
  const target = [...letter.pieces, ...letter.psPieces].find((p) => p.id === pieceId)
  if (target) await store.dropAudio(target.audioUrl).catch((err) => console.error(err))
  const pieces = letter.pieces.filter((p) => p.id !== pieceId)
  if (pieces.length === 0) {
    await deleteLetter(letterId)
    return { letterDeleted: true }
  }
  const updated = { ...letter, pieces, psPieces: letter.psPieces.filter((p) => p.id !== pieceId), passages: passagesFrom(pieces) }
  await store.putLetter(updated)
  await syncChapter(updated)
  return { letterDeleted: false }
}

/** "When should your family hear this?" Also used to change the date or recipients later. */
export async function decideRelease(letterId: string, choice: ReleaseChoice, sensitive?: Sensitivity): Promise<Letter> {
  const { letter } = await editableLetter(letterId)
  if (hasBeenOpened(letter)) throw new Error('This letter has already been opened.')
  if (choice.releaseMode === 'date' && !choice.releaseAt) throw new Error('Pick a day.')
  if (choice.releaseMode === 'after' && !choice.keeperId) throw new Error('Choose who keeps it.')

  const sealing = choice.releaseMode === 'date' || choice.releaseMode === 'after'
  let updated: Letter = {
    ...letter,
    decided: true,
    releaseMode: choice.releaseMode,
    releaseAt: choice.releaseMode === 'date' ? choice.releaseAt : undefined,
    recipients: choice.releaseMode === 'private' ? [] : choice.recipients,
    keeperId: choice.releaseMode === 'after' ? choice.keeperId : undefined,
    keeperReleasedAt: choice.releaseMode === 'after' ? letter.keeperReleasedAt : undefined,
    sealedAt: sealing ? (letter.sealedAt ?? getToday().toISOString()) : undefined,
    sensitive: sensitive ? mergeSensitivity(letter.sensitive, sensitive) : letter.sensitive,
  }

  if (choice.releaseMode === 'now') {
    // "Now" letters go to review, then into the book (for everyone, or only the people chosen).
    updated = { ...updated, status: 'finished' }
    if (!updated.chapterId) {
      const chapter = await store.saveChapter(
        { id: '', title: updated.title, stageId: updated.stageId ?? '', passages: updated.passages, status: 'draft', letterId: updated.id },
        true,
      )
      updated.chapterId = chapter.id
    }
  } else if (updated.chapterId) {
    await store.removeChapter(updated.chapterId)
    updated.chapterId = undefined
  }

  await store.putLetter(updated)
  return hydrate(updated)
}

/** People in the letter: keep a name, replace it with a description, or never show the letter to them. */
export async function setNameChoices(letterId: string, choices: NameChoice[]): Promise<Letter> {
  const { ctx, letter } = await editableLetter(letterId)
  const excluded = choices
    .filter((c) => c.choice === 'exclude')
    .map((c) => ctx.people.find((p) => p.id === c.personId)?.memberId ?? `person:${c.personId}`)
  const updated = { ...letter, nameChoices: choices, excluded: [...new Set(excluded)] }
  await store.putLetter(updated)
  return hydrate(updated)
}

/** "This letter is finished." Sealed letters only reach their readers once finished. */
export async function finishLetter(letterId: string): Promise<Letter> {
  const { letter } = await editableLetter(letterId)
  const updated: Letter = { ...letter, status: 'finished' }
  await store.putLetter(updated)
  return hydrate(updated)
}

/** "Release now": a private letter goes to review like a "Now" letter; a sealed one opens today. */
export async function releaseLetterNow(letterId: string): Promise<Letter> {
  const { letter } = await editableLetter(letterId)
  if (letter.releaseMode === 'private' || !letter.decided) return decideRelease(letterId, { releaseMode: 'now', recipients: 'all' })
  const updated: Letter = { ...letter, status: 'finished', releaseMode: 'date', releaseAt: todayString(), keeperId: undefined }
  await store.putLetter(updated)
  return hydrate(updated)
}

export async function deleteLetter(letterId: string): Promise<void> {
  const { letter } = await editableLetter(letterId)
  await Promise.all([...letter.pieces, ...letter.psPieces].map((p) => store.dropAudio(p.audioUrl).catch((err) => console.error(err))))
  if (letter.chapterId) await store.removeChapter(letter.chapterId)
  await store.removeLetter(letterId)
}

/** The storyteller's "My letters": everything she has recorded, plus the replies she has received. */
export async function listMyLetters(): Promise<{ letters: Letter[]; replies: LetterReply[]; members: FamilyMember[] }> {
  const ctx = await store.context()
  requireStoryteller(ctx)
  const [letters, replies] = await Promise.all([store.letters(), store.replies()])
  return {
    letters: await Promise.all(letters.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(hydrate)),
    replies: await hydrateReplies(replies.sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    members: ctx.members,
  }
}

// --- reading ---

/** One letter, as much of it as the current viewer may see. */
export async function getLetter(letterId: string): Promise<LetterAccess> {
  const [ctx, letters, replies] = await Promise.all([store.context(), store.letters(), store.replies()])
  const letter = letters.find((l) => l.id === letterId)
  const me = ctx.me
  if (!letter || !me) return { kind: 'hidden' }

  if (isStoryteller(ctx)) {
    return { kind: 'author', letter: await hydrate(letter), replies: await hydrateReplies(replies.filter((r) => r.letterId === letterId)) }
  }

  const myReplies = () => hydrateReplies(replies.filter((r) => r.letterId === letterId && r.memberId === me.id))
  if (letter.releaseMode === 'now') {
    if (!isRecipient(letter, me.id, ctx.members)) return { kind: 'hidden' }
    const chapter = (await listChapters()).find((c) => c.id === letter.chapterId)
    if (chapter?.status !== 'approved') return { kind: 'hidden' }
    return { kind: 'reader', letter: await presentForReader(letter, ctx.people), opened: true, replies: await myReplies(), fromName: ctx.storytellerName }
  }

  if (!isSealed(letter)) return { kind: 'hidden' }
  const canKeeperRelease = letter.releaseMode === 'after' && letter.keeperId === me.id && !letter.keeperReleasedAt
  if (isOpenable(letter, me.id, ctx.members)) {
    return { kind: 'reader', letter: await presentForReader(letter, ctx.people), opened: !!letter.openedAt[me.id], replies: await myReplies(), fromName: ctx.storytellerName }
  }
  if (isRecipient(letter, me.id, ctx.members) || canKeeperRelease) {
    return { kind: 'envelope', envelope: envelopeFor(letter, ctx, me.id), canKeeperRelease }
  }
  return { kind: 'hidden' }
}

export async function markLetterOpened(letterId: string): Promise<void> {
  const [ctx, letter] = await Promise.all([store.context(), findLetter(letterId)])
  if (!ctx.me || !isOpenable(letter, ctx.me.id, ctx.members)) throw new Error('This letter isn’t ready to open.')
  if (letter.openedAt[ctx.me.id]) return
  await store.putLetter({ ...letter, openedAt: { ...letter.openedAt, [ctx.me.id]: getToday().toISOString() } })
}

/** A short voice reply ("Thank you, Ama") from someone who has opened the letter. */
export async function addReply(letterId: string, blob: Blob): Promise<LetterReply> {
  const [ctx, letter] = await Promise.all([store.context(), findLetter(letterId)])
  const me = ctx.me
  if (!me || isStoryteller(ctx)) throw new Error('Only readers can reply.')
  const canReply = letter.releaseMode === 'now' || (isOpenable(letter, me.id, ctx.members) && !!letter.openedAt[me.id])
  if (!canReply) throw new Error('Open the letter before replying.')
  const id = crypto.randomUUID()
  const reply: LetterReply = { id, letterId, memberId: me.id, memberName: me.name, audioUrl: await store.storeAudio(blob, `reply-${id}`), createdAt: getToday().toISOString() }
  await store.putReply(reply)
  return (await hydrateReplies([reply]))[0]!
}

export type LetterShelf = {
  fromName: string
  envelopes: Envelope[] // sealed letters for the viewer that they haven't opened
  openedChapters: Chapter[] // letters the viewer opened, as book pages
  waitingForOthers: number // sealed letters for other people: a count only
  keeperLetters: number // unreleased "when I'm gone" letters this viewer keeps
  isStoryteller: boolean
}

/** Envelopes and opened letters for the family book and the family page's envelope wall. */
export async function getLetterShelf(): Promise<LetterShelf> {
  const [ctx, letters] = await Promise.all([store.context(), store.letters()])
  const me = ctx.me
  const sealed = letters.filter(isSealed)
  const shelf: LetterShelf = { fromName: ctx.storytellerName, envelopes: [], openedChapters: [], waitingForOthers: 0, keeperLetters: 0, isStoryteller: isStoryteller(ctx) }
  if (!me) return shelf
  if (isStoryteller(ctx)) {
    // The storyteller sees her own sealed letters as envelopes too, so she knows what's waiting and for whom.
    const waiting = sealed.filter((l) => !hasBeenOpened(l))
    shelf.envelopes = waiting.map((l) => envelopeFor(l, ctx, me.id))
    shelf.waitingForOthers = waiting.length
    return shelf
  }
  const mine = sealed.filter((l) => isRecipient(l, me.id, ctx.members))
  shelf.envelopes = mine.filter((l) => !l.openedAt[me.id]).map((l) => envelopeFor(l, ctx, me.id))
  shelf.openedChapters = await Promise.all(
    mine
      .filter((l) => l.openedAt[me.id] && isOpenable(l, me.id, ctx.members))
      .map(async (l) => {
        const shown = await presentForReader(l, ctx.people)
        return { id: `letter-${l.id}`, title: shown.title, stageId: l.stageId ?? '', passages: shown.passages, status: 'approved' as const, letterId: l.id }
      }),
  )
  shelf.waitingForOthers = sealed.filter((l) => !isRecipient(l, me.id, ctx.members)).length
  shelf.keeperLetters = sealed.filter((l) => l.releaseMode === 'after' && l.keeperId === me.id && !l.keeperReleasedAt).length
  return shelf
}

/** Family page: how many sealed letters are waiting for each member. A count only, never which letters or what's in them. */
export async function getWaitingCounts(): Promise<Record<string, number>> {
  const [ctx, letters] = await Promise.all([store.context(), store.letters()])
  const counts: Record<string, number> = {}
  for (const m of ctx.members) {
    counts[m.id] = letters.filter((l) => isSealed(l) && isRecipient(l, m.id, ctx.members) && !l.openedAt[m.id]).length
  }
  return counts
}

async function releaseAfterLetters(keeperId: string | null): Promise<number> {
  const letters = (await store.letters()).filter((l) => isSealed(l) && l.releaseMode === 'after' && !l.keeperReleasedAt && (keeperId === null || l.keeperId === keeperId))
  const now = getToday().toISOString()
  for (const l of letters) await store.putLetter({ ...l, keeperReleasedAt: now })
  return letters.length
}

/** "Release Ama's letters": only the keeper she chose can do this. */
export async function releaseAsKeeper(): Promise<number> {
  const ctx = await store.context()
  if (!ctx.me) throw new Error('Who are you?')
  return releaseAfterLetters(ctx.me.id)
}

// --- demo controls (opened from the header avatar) ---

export async function demoSetViewer(memberId: string) {
  if (IS_DEMO) {
    demoState().viewerId = memberId
    persist()
    return
  }
  const code = familyCode()
  const member = (await listFamilyMembers(code)).find((m) => m.id === memberId)
  saveCurrentMember(code, memberId)
  if (member) saveMyIdentity({ code, name: member.name })
}

/** Plays the keeper's part for the video: releases every "when I'm gone" letter. */
export function demoKeeperRelease(): Promise<number> {
  return releaseAfterLetters(null)
}

export async function demoReset() {
  if (!IS_DEMO) throw new Error('Reset only works in demo mode.')
  await resetDemoState()
}
