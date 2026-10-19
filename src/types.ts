export type LifeStage = { id: string; label: string; years: string; place: string; livedWith: string }
// date is YYYY-MM-DD; a past special date (e.g. a wedding day) repeats every year.
export type SpecialDate = { label: string; date: string }
// memberId links an intake person to a family member so they can receive letters.
export type Person = {
  id: string
  name: string
  nickname?: string
  relation: string
  birthday?: string // YYYY-MM-DD
  specialDates?: SpecialDate[]
  memberId?: string
}
export type LifeMap = { name: string; birthYear: number; stages: LifeStage[]; people: Person[] }
// AI tags from backend/ai.py tag_memo()
export type MemoTags = {
  language?: string
  transcript_en?: string // English translation; the original is Memo.transcript
  summary?: string
  place?: string | null
  year_start?: number | null
  year_end?: number | null
  year_is_estimate?: boolean
  people?: string[]
  unmatched_people?: string[]
  themes?: string[]
  tone?: string
  sensitive?: boolean
  sensitivity_reason?: string | null
  storybook?: Storybook // Storytime version, cached by the backend
}
export type StorybookPage = { text: string; text_native: string | null; illustration: string }
// Storytime movie: one continuous animation; rest_times[i] = where card i (title, pages…, end) settles.
export type MovieStyle = 'watercolor' | 'bedtime' | 'crayon'
export type MoviePace = 'calm' | 'normal' | 'lively'
export type StoryMovie = { url: string; rest_times: number[]; duration: number; style?: MovieStyle; pace?: MoviePace }
// videos is keyed "<style>-<pace>"; video is the original watercolor-normal movie from before styles existed.
export type Storybook = { title: string; pages: StorybookPage[]; video?: StoryMovie; videos?: Record<string, StoryMovie> }
export type Memo = { id: string; audioUrl: string; transcript?: string; createdAt: string; stageId?: string; tags?: MemoTags }
export type Passage = { text: string; memoId: string }
export type Chapter = {
  id: string
  title: string
  stageId: string
  passages: Passage[]
  status: 'draft' | 'approved' | 'hidden'
  letterId?: string // set when the chapter came from a Postscript letter
}

// 'member' is the original role (shown as Reader); storyteller/reader need the roles SQL.
export type FamilyRole = 'organizer' | 'storyteller' | 'reader' | 'member'
export type Family = { code: string; name: string; photoUrl?: string; createdAt: string }
export type FamilyMember = { id: string; familyCode: string; name: string; role: FamilyRole; relationship?: string; createdAt: string }

// --- Postscript letters ---
// Each recording is a piece of a letter. A letter can have several pieces (told in pieces),
// played in order; P.S. pieces are addressed to the reader and play first on release.
export type ReleaseMode = 'now' | 'date' | 'after' | 'private'
export type PsPrompt = 'ps' | 'why' | 'hope'
export type LetterPiece = { id: string; audioUrl: string; transcript?: string; createdAt: string; prompt?: PsPrompt }
// 'all' = the whole family (everyone but the storyteller).
export type Recipients = string[] | 'all'
export type NameChoice = { personId: string; choice: 'keep' | 'replace' | 'exclude'; replacement?: string }
export type Sensitivity = { flagged: boolean; mentalHealth: boolean; matches: string[] }
export type Letter = {
  id: string
  title: string
  photoUrl?: string // a photo shown as the letter's card thumbnail (demo seed only for now)
  stageId?: string
  createdAt: string
  status: 'in_progress' | 'finished'
  origin: 'normal' | 'secret' // 'secret' = "Something you've never told anyone"
  decided: boolean // false until she answers "When should your family hear this?"
  pieces: LetterPiece[]
  psPieces: LetterPiece[]
  releaseMode: ReleaseMode
  releaseAt?: string // YYYY-MM-DD, for 'date'
  recipients: Recipients
  keeperId?: string // member who can release an 'after' letter
  keeperReleasedAt?: string
  sealedAt?: string
  excluded: string[] // member ids (or person:<id>) who must never see it; overrides recipients
  nameChoices: NameChoice[]
  sensitive: Sensitivity
  passages: Passage[] // the letter's chapter text; Passage.memoId is a piece id
  openedAt: Record<string, string> // member id -> ISO time
  chapterId?: string // draft/approved chapter for 'now' letters
}
export type LetterReply = { id: string; letterId: string; memberId: string; memberName: string; audioUrl: string; createdAt: string }
export type ReleaseChoice = { releaseMode: ReleaseMode; releaseAt?: string; recipients: Recipients; keeperId?: string }
export type ReleasePreset = { id: string; label: string; date: string; memberId?: string }
// What a reader may see of a sealed letter: no title, transcript, audio or topic.
export type Envelope = { id: string; stageId?: string; fromName: string; forNames: string; opensLabel: string; openable: boolean }
export type LetterAccess =
  | { kind: 'author'; letter: Letter; replies: LetterReply[] }
  | { kind: 'reader'; letter: Letter; opened: boolean; replies: LetterReply[]; fromName: string }
  | { kind: 'envelope'; envelope: Envelope; canKeeperRelease: boolean }
  | { kind: 'hidden' }
