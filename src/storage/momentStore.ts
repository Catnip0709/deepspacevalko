import { momentStorageKey } from '../app/storageKeys'
import type { Moment, MomentReply } from '../app/types'
import { initialMoments } from '../apps/wechat/momentsData'

export function readStoredMoments(): Moment[] {
  try {
    const raw = window.localStorage.getItem(momentStorageKey)
    if (raw === null) return defaults()
    const data: unknown = JSON.parse(raw)
    // Accept the unversioned array shape, but do not invent dates for old posts.
    const items = Array.isArray(data) ? data : isRecord(data) && data.version === 1 ? data.moments : null
    if (!Array.isArray(items)) return defaults()
    return items.map(readMoment).filter((item): item is Moment => item !== null)
  } catch {
    return defaults()
  }
}

export function writeStoredMoments(moments: Moment[]): boolean {
  try {
    const completed = moments.map((moment) => ({
      ...moment,
      replies: moment.replies.filter((reply) => !reply.pending)
    }))
    window.localStorage.setItem(momentStorageKey, JSON.stringify({ version: 1, moments: completed }))
    return true
  } catch {
    return false
  }
}

function readMoment(value: unknown): Moment | null {
  if (
    !isRecord(value) || typeof value.id !== 'string' || !value.id ||
    (value.author !== 'hunter' && value.author !== 'aoyin') ||
    typeof value.text !== 'string' || !value.text.trim()
  ) return null

  return {
    id: value.id,
    author: value.author,
    authorName: typeof value.authorName === 'string' ? value.authorName : value.author === 'aoyin' ? '敖尹' : '猎人小姐',
    text: value.text,
    time: typeof value.time === 'string' ? value.time : '',
    createdAt: typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) &&
      value.createdAt > 0 && value.createdAt <= 8640000000000000 ? value.createdAt : undefined,
    replies: Array.isArray(value.replies)
      ? value.replies.map(readReply).filter((reply): reply is MomentReply => reply !== null)
      : []
  }
}

function readReply(value: unknown): MomentReply | null {
  if (
    !isRecord(value) || typeof value.id !== 'string' ||
    (value.author !== 'hunter' && value.author !== 'aoyin') ||
    typeof value.text !== 'string' || !value.text.trim() || value.pending
  ) return null
  return { id: value.id, author: value.author, text: value.text }
}

function defaults(): Moment[] {
  return initialMoments.map((item) => ({ ...item, replies: [...item.replies] }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
