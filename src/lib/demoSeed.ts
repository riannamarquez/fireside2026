// Seed data for demo mode (VITE_DEMO_MODE=true): Ama's family, life map and letters.
// Audio for the seeded pieces lives in public/demo/ (scripts/make-demo-audio.sh regenerates it).
import type { Chapter, Family, FamilyMember, Letter, LetterPiece, LetterReply, LifeMap } from '../types'

export const DEMO_FAMILY_CODE = 'lin'

export const seedFamily: Family = { code: DEMO_FAMILY_CODE, name: 'Lin Family', photoUrl: '/demo/photos/family-cover.jpg', createdAt: '2026-08-20T18:00:00Z' }

export const seedMembers: FamilyMember[] = [
  { id: 'm-ama', familyCode: DEMO_FAMILY_CODE, name: 'Ama', role: 'storyteller', relationship: 'Grandmother · 林秀英', createdAt: '2026-08-20T18:00:00Z' },
  { id: 'm-mei', familyCode: DEMO_FAMILY_CODE, name: 'Mei', role: 'organizer', relationship: 'Daughter', createdAt: '2026-08-20T18:01:00Z' },
  { id: 'm-lily', familyCode: DEMO_FAMILY_CODE, name: 'Lily', role: 'reader', relationship: 'Granddaughter', createdAt: '2026-08-21T02:00:00Z' },
  { id: 'm-david', familyCode: DEMO_FAMILY_CODE, name: 'David', role: 'reader', relationship: 'Son', createdAt: '2026-08-22T16:30:00Z' },
]

export const seedLifeMap: LifeMap = {
  name: 'Ama 林秀英',
  birthYear: 1950,
  stages: [
    { id: 's-1', label: 'Childhood in Tainan', years: '1950–1968', place: 'Tainan, Taiwan', livedWith: 'Parents, grandparents, twenty cousins, my brother Wei' },
    { id: 's-2', label: 'Starting over in California', years: '1975–1986', place: 'San Gabriel, California', livedWith: 'My husband, Mei, David' },
    { id: 's-3', label: 'Building our family', years: '1986–Present', place: 'Arcadia, California', livedWith: 'My husband, then Mei’s family nearby' },
  ],
  people: [
    { id: 'p-lily', name: 'Lily', nickname: '莉莉', relation: 'Granddaughter', birthday: '2013-06-12', memberId: 'm-lily' },
    { id: 'p-mei', name: 'Mei', nickname: '美美', relation: 'Daughter', birthday: '1978-03-03', specialDates: [{ label: 'Mei’s wedding day', date: '2005-09-24' }], memberId: 'm-mei' },
    { id: 'p-david', name: 'David', nickname: '大衛', relation: 'Son', birthday: '1981-11-20', memberId: 'm-david' },
    { id: 'p-wei', name: 'Uncle Wei', nickname: '阿偉', relation: 'Brother', birthday: '1947-08-15' },
  ],
}

const piece = (id: string, createdAt: string, transcript: string, prompt?: LetterPiece['prompt']): LetterPiece => ({
  id,
  audioUrl: `/demo/${id}.m4a`,
  transcript,
  createdAt,
  ...(prompt ? { prompt } : {}),
})

const everyoneOpened = (at: string) => ({ 'm-mei': at, 'm-lily': at, 'm-david': at })
const noFlag = { flagged: false, mentalHealth: false, matches: [] }

function letter(l: Partial<Letter> & Pick<Letter, 'id' | 'title' | 'createdAt' | 'pieces'>): Letter {
  return {
    status: 'finished',
    origin: 'normal',
    decided: true,
    psPieces: [],
    releaseMode: 'now',
    recipients: 'all',
    excluded: [],
    nameChoices: [],
    sensitive: noFlag,
    passages: l.pieces.map((p) => ({ text: p.transcript ?? '', memoId: p.id })),
    openedAt: {},
    ...l,
  }
}

export const seedLetters: Letter[] = [
  letter({
    id: 'l-courtyard',
    title: 'Sleeping in the courtyard',
    stageId: 's-1',
    createdAt: '2026-09-02T17:20:00Z',
    chapterId: 'c-1',
    openedAt: everyoneOpened('2026-09-04T03:00:00Z'),
    pieces: [
      piece('pc1a', '2026-09-02T17:20:00Z', 'When I was a little girl in Tainan, we lived in my grandfather’s house with twenty cousins. On summer nights it was too hot inside, so we carried our bamboo mats out to the courtyard and slept under the stars.'),
      piece('pc1b', '2026-09-02T17:24:00Z', 'My grandmother cooked for three days before Lunar New Year. My brother Wei and I fought over who could fold the dumplings. Mine were always the prettiest.'),
    ],
  }),
  letter({
    id: 'l-valley',
    title: 'Our first room on Valley Boulevard',
    stageId: 's-2',
    createdAt: '2026-09-09T17:05:00Z',
    chapterId: 'c-2',
    openedAt: everyoneOpened('2026-09-10T03:00:00Z'),
    pieces: [
      piece('pc2a', '2026-09-09T17:05:00Z', 'We came to California in 1975 with two suitcases. Your grandfather and I rented one room above a bakery on Valley Boulevard. I sewed in a garment factory from seven in the morning until dark.'),
      piece('pc2b', '2026-09-09T17:09:00Z', 'I learned English from the television. Every night I watched the news and repeated every word, even when I did not understand it.'),
    ],
  }),
  letter({
    id: 'l-dumplings',
    title: 'Sunday dumplings',
    stageId: 's-3',
    createdAt: '2026-09-16T18:40:00Z',
    chapterId: 'c-3',
    openedAt: everyoneOpened('2026-09-17T03:00:00Z'),
    pieces: [
      piece('pc3a', '2026-09-16T18:40:00Z', 'When Mei was small, every Sunday we made dumplings together at the kitchen table. Now Lily folds them with me, and her hands are faster than mine.'),
      piece('pc3b', '2026-09-16T18:43:00Z', 'The secret is a little ginger and a lot of patience. Write it down so you never forget.'),
    ],
  }),
  letter({
    id: 'l-lily18',
    title: 'The year I could not get out of bed',
    photoUrl: '/demo/photos/birthday-cake.jpg',
    stageId: 's-2',
    createdAt: '2026-09-30T19:10:00Z',
    origin: 'secret',
    releaseMode: 'date',
    releaseAt: '2031-06-12',
    recipients: ['m-lily'],
    sealedAt: '2026-09-30T19:20:00Z',
    sensitive: { flagged: true, mentalHealth: true, matches: ['depression', 'could not get out of bed', 'never told'] },
    pieces: [
      piece('pa1', '2026-09-30T19:10:00Z', 'Lily, when we first came to California, I was very sad for a long time. The doctor said it was depression. Some mornings I could not get out of bed, and your mother, only a little girl, made her own breakfast.'),
      piece('pa2', '2026-10-01T18:30:00Z', 'I never told anyone outside the family. In those days we did not talk about it. A neighbor, Mrs. Garcia, brought soup every week and sat with me. Slowly, I came back.'),
    ],
    psPieces: [
      piece('psA1', '2026-10-01T18:40:00Z', 'Lily, happy eighteenth birthday. You are grown now, so I want you to know this part of me.', 'ps'),
      piece('psA2', '2026-10-01T18:42:00Z', 'I hope you understand that being sad is not being weak. If you ever feel this way, tell someone. Tell your mother. Tell me, if I am still here.', 'hope'),
    ],
  }),
  letter({
    id: 'l-after',
    title: 'The night they took my father',
    photoUrl: '/demo/photos/kitchen.jpg',
    stageId: 's-1',
    createdAt: '2026-10-05T18:00:00Z',
    origin: 'secret',
    releaseMode: 'after',
    keeperId: 'm-mei',
    recipients: 'all',
    sealedAt: '2026-10-05T18:15:00Z',
    sensitive: { flagged: true, mentalHealth: false, matches: ['police', 'prison', 'stopped speaking'] },
    nameChoices: [{ personId: 'p-wei', choice: 'keep' }],
    pieces: [
      piece('pb1', '2026-10-05T18:00:00Z', 'In 1962 the police came to our house in Tainan at night and took my father away. He was in prison for four years because of something he said at work. We were told never to talk about it.'),
      piece('pb2', '2026-10-05T18:06:00Z', 'My brother Wei blamed our mother for staying quiet, and they stopped speaking for twenty years. I want you to know it was not anyone’s fault. It was the times.'),
    ],
    psPieces: [piece('psB1', '2026-10-05T18:12:00Z', 'I am telling you this because our family carried this silence for too long. I do not want you to carry it too.', 'why')],
  }),
  letter({
    id: 'l-private',
    title: 'The restaurant money',
    photoUrl: '/demo/photos/roast-pork.jpg',
    stageId: 's-3',
    createdAt: '2026-10-12T20:00:00Z',
    origin: 'secret',
    status: 'in_progress',
    releaseMode: 'private',
    recipients: [],
    sensitive: { flagged: true, mentalHealth: false, matches: ['never told'] },
    pieces: [
      piece('pp1', '2026-10-12T20:00:00Z', 'There is something about the restaurant money I never told David. When the restaurant closed in 1994, I lent all our savings to Wei, and he never paid it back.'),
    ],
  }),
]

export const seedChapters: Chapter[] = seedLetters
  .filter((l) => l.chapterId)
  .map((l) => ({ id: l.chapterId!, title: l.title, stageId: l.stageId ?? '', passages: l.passages, status: 'approved', letterId: l.id }))

export const seedReplies: LetterReply[] = [
  { id: 'r-1', letterId: 'l-dumplings', memberId: 'm-lily', memberName: 'Lily', audioUrl: '/demo/reply-lily.m4a', createdAt: '2026-09-17T04:00:00Z' },
]
