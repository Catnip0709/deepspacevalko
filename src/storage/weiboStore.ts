import { weiboStorageKey } from '../app/storageKeys'
import type {
  HotSearchTag,
  WeiboAuthor,
  WeiboComment,
  WeiboDay,
  WeiboHotSearch,
  WeiboPost,
  WeiboReply,
  WeiboState
} from '../apps/weibo/weiboTypes'

const emptyState: WeiboState = {
  version: 1,
  refreshedDates: [],
  days: [],
  posts: []
}

export function readStoredWeibo(): WeiboState {
  try {
    const raw = window.localStorage.getItem(weiboStorageKey)
    if (!raw) return cloneEmptyState()
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== 1) return cloneEmptyState()

    const refreshedDates = Array.isArray(value.refreshedDates)
      ? [...new Set(value.refreshedDates.filter(isDateKey))]
      : []
    const days = Array.isArray(value.days)
      ? value.days.map(readDay).filter((day): day is WeiboDay => day !== null)
      : []
    const posts = Array.isArray(value.posts)
      ? value.posts.map(readPost).filter((post): post is WeiboPost => post !== null)
      : []

    return { version: 1, refreshedDates, days, posts }
  } catch {
    return cloneEmptyState()
  }
}

export function writeStoredWeibo(state: WeiboState) {
  try {
    const stableState: WeiboState = {
      ...state,
      posts: state.posts.map((post) => ({
        ...post,
        reactionStatus: post.reactionStatus === 'pending' ? 'failed' : post.reactionStatus,
        comments: post.comments.map((comment) => ({
          ...comment,
          replyStatus: comment.replyStatus === 'pending' ? 'failed' : comment.replyStatus
        }))
      }))
    }
    window.localStorage.setItem(weiboStorageKey, JSON.stringify(stableState))
    return true
  } catch {
    return false
  }
}

export function clearWeiboDate(state: WeiboState, date: string): WeiboState {
  return {
    ...state,
    days: state.days.filter((day) => day.date !== date),
    posts: state.posts.filter((post) => post.date !== date)
  }
}

function readDay(value: unknown): WeiboDay | null {
  if (!isRecord(value) || !isDateKey(value.date) || !Array.isArray(value.hotSearches)) return null
  const hotSearches = value.hotSearches
    .map(readHotSearch)
    .filter((item): item is WeiboHotSearch => item !== null)
  return hotSearches.length === 3 ? { date: value.date, hotSearches } : null
}

function readHotSearch(value: unknown): WeiboHotSearch | null {
  if (
    !isRecord(value) ||
    !isText(value.id, 100) ||
    !isText(value.title, 80) ||
    typeof value.heat !== 'number' ||
    !Number.isFinite(value.heat) ||
    !isHotSearchTag(value.tag)
  ) return null
  return { id: value.id, title: value.title.trim(), heat: Math.max(0, Math.round(value.heat)), tag: value.tag }
}

function readPost(value: unknown): WeiboPost | null {
  if (
    !isRecord(value) ||
    !isText(value.id, 100) ||
    !isDateKey(value.date) ||
    !isTimestamp(value.createdAt) ||
    !isText(value.text, 1000) ||
    typeof value.likeCount !== 'number' ||
    !Number.isFinite(value.likeCount) ||
    typeof value.liked !== 'boolean'
  ) return null
  const author = readAuthor(value.author)
  if (!author) return null
  const comments = Array.isArray(value.comments)
    ? value.comments.map(readComment).filter((comment): comment is WeiboComment => comment !== null)
    : []
  return {
    id: value.id,
    date: value.date,
    createdAt: value.createdAt,
    author,
    text: value.text.trim(),
    hotSearchId: isText(value.hotSearchId, 100) ? value.hotSearchId : undefined,
    likeCount: Math.max(0, Math.round(value.likeCount)),
    liked: value.liked,
    comments,
    reactionStatus: value.reactionStatus === 'failed' || value.reactionStatus === 'pending'
      ? value.reactionStatus
      : undefined
  }
}

function readComment(value: unknown): WeiboComment | null {
  if (
    !isRecord(value) ||
    !isText(value.id, 100) ||
    !isText(value.text, 600) ||
    !isTimestamp(value.createdAt)
  ) return null
  const author = readAuthor(value.author)
  const reply = value.reply === undefined ? undefined : readReply(value.reply)
  if (!author || (value.reply !== undefined && !reply)) return null
  return {
    id: value.id,
    author,
    text: value.text.trim(),
    createdAt: value.createdAt,
    reply: reply ?? undefined,
    replyStatus: value.replyStatus === 'failed' || value.replyStatus === 'pending'
      ? value.replyStatus
      : undefined
  }
}

function readReply(value: unknown): WeiboReply | null {
  if (!isRecord(value) || !isText(value.id, 100) || !isText(value.text, 600) || !isTimestamp(value.createdAt)) {
    return null
  }
  const author = readAuthor(value.author)
  return author ? { id: value.id, author, text: value.text.trim(), createdAt: value.createdAt } : null
}

function readAuthor(value: unknown): WeiboAuthor | null {
  if (
    !isRecord(value) ||
    !isText(value.id, 100) ||
    (value.kind !== 'hunter' && value.kind !== 'aoyin' && value.kind !== 'npc') ||
    !isText(value.name, 80) ||
    !isText(value.avatar, 24)
  ) return null
  return {
    id: value.id,
    kind: value.kind,
    name: value.name.trim(),
    avatar: value.avatar.trim(),
    bio: isText(value.bio, 120) ? value.bio.trim() : undefined
  }
}

function cloneEmptyState(): WeiboState {
  return { ...emptyState, refreshedDates: [], days: [], posts: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Array.from(value).length <= maxLength
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 8640000000000000
}

function isHotSearchTag(value: unknown): value is HotSearchTag {
  return value === '沸' || value === '热' || value === '新'
}
