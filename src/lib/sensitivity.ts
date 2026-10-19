// Keyword fallback for the sensitive-story suggestion, and name matching for "People in the letter".
// This only SUGGESTS choosing a release day; nothing is ever sealed automatically.
import type { Person, Sensitivity } from '../types'

const MENTAL_HEALTH_EN = ['mental illness', 'mentally ill', 'depression', 'depressed', 'suicide', 'kill myself', 'addiction', 'addicted', 'could not get out of bed', "couldn't get out of bed"]
const OTHER_EN = ['arrest', 'arrested', 'jail', 'police', 'prison', 'divorce', 'divorced', 'affair', 'never told', 'estranged', 'disowned', 'family fight', 'stopped speaking']
const MENTAL_HEALTH_ZH = ['憂鬱', '忧郁', '抑鬱', '抑郁', '自殺', '自杀', '精神病', '上癮', '上瘾']
const OTHER_ZH = ['坐牢', '警察', '監獄', '监狱', '被抓', '逮捕', '離婚', '离婚', '外遇', '斷絕', '断绝', '吵架', '沒告訴過', '没告诉过', '從來沒說', '从来没说']

function hasWord(text: string, phrase: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")
  return new RegExp(`\\b${escaped}`, 'i').test(text)
}

export function detectSensitive(text: string): Sensitivity {
  const matches: string[] = []
  let mentalHealth = false
  for (const w of MENTAL_HEALTH_EN) if (hasWord(text, w)) { matches.push(w); mentalHealth = true }
  for (const w of MENTAL_HEALTH_ZH) if (text.includes(w)) { matches.push(w); mentalHealth = true }
  for (const w of OTHER_EN) if (hasWord(text, w)) matches.push(w)
  for (const w of OTHER_ZH) if (text.includes(w)) matches.push(w)
  return { flagged: matches.length > 0, mentalHealth, matches }
}

// Names and nicknames people actually say: "Uncle Wei" also matches "Wei".
export function namesFor(person: Person): string[] {
  const names = [person.name, person.nickname ?? '']
  const lastWord = person.name.trim().split(/\s+/).at(-1)
  if (lastWord && lastWord !== person.name.trim()) names.push(lastWord)
  return [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 1))]
}

function mentions(text: string, name: string) {
  // CJK names have no word boundaries.
  if (/[\u3400-\u9fff]/.test(name)) return text.includes(name)
  return hasWord(text, name) && new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
}

export function detectPeople(text: string, people: Person[]): Person[] {
  return people.filter((p) => namesFor(p).some((n) => mentions(text, n)))
}

// Swap every way she says a person's name for a description ("my brother").
export function replaceNames(text: string, person: Person, replacement: string): string {
  let out = text
  // "my brother Wei" becomes "my brother", not "my brother my brother".
  const relation = person.relation.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (relation) {
    for (const name of namesFor(person).filter((n) => !/[\u3400-\u9fff]/.test(n))) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      out = out.replace(new RegExp(`\\b(?:my|our|your)\\s+${relation}\\s+${escaped}\\b`, 'gi'), replacement)
    }
  }
  // Longest first, so "Uncle Wei" is replaced before "Wei".
  for (const name of namesFor(person).sort((a, b) => b.length - a.length)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = /[\u3400-\u9fff]/.test(name) ? out.split(name).join(replacement) : out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), replacement)
  }
  return out
}
