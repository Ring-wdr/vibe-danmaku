import type { Difficulty, RunResult } from '../game/types'

export const leaderboardStorageKey = 'vibe-danmaku.leaderboard.v1'

export type LeaderboardEntry = {
  id: string
  recordedAt: string
  outcome: RunResult['outcome']
  difficulty: Difficulty
  stageNumber: number
  stageName: string
  selectedCharacterId: string
  score: number
}

type SaveLeaderboardEntryInput = {
  result: RunResult
  selectedCharacterId: string
  score: number
}

const maxLeaderboardEntries = 10

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.recordedAt === 'string' &&
    (value.outcome === 'victory' || value.outcome === 'defeat') &&
    (value.difficulty === 'easy' || value.difficulty === 'normal' || value.difficulty === 'hard') &&
    typeof value.stageNumber === 'number' &&
    typeof value.stageName === 'string' &&
    typeof value.selectedCharacterId === 'string' &&
    typeof value.score === 'number'
  )
}

function sortEntries(entries: LeaderboardEntry[]) {
  return entries.toSorted((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return right.recordedAt.localeCompare(left.recordedAt)
  })
}

function readRawEntries(): LeaderboardEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(leaderboardStorageKey)
    const parsed: unknown = raw ? JSON.parse(raw) : []

    return Array.isArray(parsed) ? parsed.filter(isLeaderboardEntry) : []
  } catch {
    return []
  }
}

export function readLeaderboardEntries(): LeaderboardEntry[] {
  return sortEntries(readRawEntries()).slice(0, maxLeaderboardEntries)
}

export function saveLeaderboardEntry({
  result,
  score,
  selectedCharacterId,
}: SaveLeaderboardEntryInput): LeaderboardEntry | null {
  if (typeof window === 'undefined') {
    return null
  }

  const recordedAt = new Date().toISOString()
  const entry: LeaderboardEntry = {
    id: `${recordedAt}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt,
    outcome: result.outcome,
    difficulty: result.difficulty,
    stageNumber: result.stageNumber,
    stageName: result.stageName,
    selectedCharacterId,
    score,
  }

  try {
    const entries = sortEntries([entry, ...readRawEntries()]).slice(0, maxLeaderboardEntries)
    window.localStorage.setItem(leaderboardStorageKey, JSON.stringify(entries))
    return entry
  } catch {
    return null
  }
}
