import { useEffect, useRef, useState } from 'react'
import type { DeepSeekModel, PersonaSettings } from '../../app/types'
import { createId } from '../../app/time'
import {
  requestDailyWeibo,
  requestHunterPostReactions,
  requestWeiboAuthorReply
} from '../../harness/weiboHarness'
import { clearWeiboDate, readStoredWeibo, writeStoredWeibo } from '../../storage/weiboStore'
import { localWeiboDate } from './weiboDates'
import type {
  GeneratedPostReaction,
  WeiboAuthor,
  WeiboComment,
  WeiboPost,
  WeiboState
} from './weiboTypes'

const blueberry: WeiboAuthor = {
  id: 'blueberry',
  kind: 'hunter',
  name: '蓝莓',
  avatar: '🫐',
  bio: '临空市生活记录'
}

export function useWeibo({
  apiKey,
  model,
  persona
}: {
  apiKey: string
  model: DeepSeekModel
  persona: PersonaSettings
}) {
  const [state, setState] = useState<WeiboState>(readStoredWeibo)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState('')
  const requests = useRef(new Map<AbortController, string>())

  useEffect(() => {
    setStorageError(writeStoredWeibo(state) ? '' : '微博内容未能保存，请清理部分旧内容后再试。')
  }, [state])

  useEffect(() => () => {
    requests.current.forEach((_, controller) => controller.abort())
    requests.current.clear()
  }, [])

  const runRequest = async <T,>(date: string, request: (signal: AbortSignal) => Promise<T>) => {
    const controller = new AbortController()
    requests.current.set(controller, date)
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    try {
      return await request(controller.signal)
    } finally {
      window.clearTimeout(timeout)
      requests.current.delete(controller)
    }
  }

  const refreshToday = async () => {
    const date = localWeiboDate()
    if (isRefreshing || state.refreshedDates.includes(date)) return
    if (!apiKey.trim()) {
      setError('请先到设置里填写 DeepSeek API Key，再刷新今日热搜。')
      return
    }

    setIsRefreshing(true)
    setError('')
    try {
      const generated = await runRequest(date, (signal) => requestDailyWeibo({
        apiKey,
        model,
        date,
        persona,
        signal,
        previousTopics: state.days.flatMap((day) => day.hotSearches.map((item) => item.title))
      }))
      const hotSearches = generated.hotSearches.map((item) => ({
        ...item,
        id: createId('weibo-hot')
      }))
      const now = Date.now()
      const orderedPosts = [...generated.posts].sort((left, right) => {
        if (left.authorKind !== right.authorKind) return left.authorKind === 'aoyin' ? -1 : 1
        return left.hotSearchIndex - right.hotSearchIndex
      })
      const posts: WeiboPost[] = orderedPosts.map((item, index) => ({
        id: createId('weibo-post'),
        date,
        createdAt: now - index * 4 * 60 * 1000,
        author: item.authorKind === 'aoyin'
          ? aoyinAuthor()
          : {
              id: createId('weibo-npc'),
              kind: 'npc',
              name: item.authorName,
              avatar: item.avatar,
              bio: item.bio
            },
        text: item.text,
        hotSearchId: hotSearches[item.hotSearchIndex].id,
        likeCount: randomLikes(item.authorKind === 'aoyin' ? 1800 : 80, item.authorKind === 'aoyin' ? 18000 : 6800),
        liked: false,
        comments: []
      }))
      setState((current) => ({
        ...current,
        refreshedDates: [...new Set([...current.refreshedDates, date])],
        days: [{ date, hotSearches }, ...current.days.filter((day) => day.date !== date)],
        posts: [...posts, ...current.posts]
      }))
    } catch (requestError) {
      setError(normalizeRequestError(requestError, '今日热搜没有刷新成功，请检查网络后再试。'))
    } finally {
      setIsRefreshing(false)
    }
  }

  const toggleLike = (postId: string) => {
    setState((current) => updatePost(current, postId, (post) => ({
      ...post,
      liked: !post.liked,
      likeCount: Math.max(0, post.likeCount + (post.liked ? -1 : 1))
    })))
  }

  const addComment = async (postId: string, text: string) => {
    const post = state.posts.find((item) => item.id === postId)
    const trimmed = text.trim()
    if (!post || !trimmed) return
    const comment: WeiboComment = {
      id: createId('weibo-comment'),
      author: blueberry,
      text: trimmed,
      createdAt: Date.now(),
      replyStatus: apiKey.trim() ? 'pending' : 'failed'
    }
    setState((current) => updatePost(current, postId, (item) => ({
      ...item,
      comments: [...item.comments, comment]
    })))
    if (!apiKey.trim()) {
      setError('评论已保存。填写 DeepSeek API Key 后可以补写博主回复。')
      return
    }
    await generateCommentReply(post, comment)
  }

  const retryCommentReply = async (postId: string, commentId: string) => {
    const post = state.posts.find((item) => item.id === postId)
    const comment = post?.comments.find((item) => item.id === commentId)
    if (!post || !comment || comment.reply || comment.replyStatus === 'pending') return
    if (!apiKey.trim()) {
      setError('请先到设置里填写 DeepSeek API Key。')
      return
    }
    setState((current) => updateComment(current, postId, commentId, (item) => ({
      ...item,
      replyStatus: 'pending'
    })))
    await generateCommentReply(post, { ...comment, replyStatus: 'pending' })
  }

  const generateCommentReply = async (post: WeiboPost, comment: WeiboComment) => {
    setError('')
    try {
      const text = await runRequest(post.date, (signal) => requestWeiboAuthorReply({
        apiKey,
        model,
        post,
        comment,
        persona,
        signal
      }))
      setState((current) => updateComment(current, post.id, comment.id, (item) => ({
        ...item,
        replyStatus: undefined,
        reply: {
          id: createId('weibo-reply'),
          author: post.author,
          text,
          createdAt: Date.now()
        }
      })))
    } catch (requestError) {
      setState((current) => updateComment(current, post.id, comment.id, (item) => ({
        ...item,
        replyStatus: 'failed'
      })))
      setError(normalizeRequestError(requestError, '博主暂时没有回复，评论已保存。'))
    }
  }

  const publishPost = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const now = Date.now()
    const post: WeiboPost = {
      id: createId('blueberry-weibo'),
      date: localWeiboDate(new Date(now)),
      createdAt: now,
      author: blueberry,
      text: trimmed,
      likeCount: 0,
      liked: false,
      comments: [],
      reactionStatus: apiKey.trim() ? 'pending' : 'failed'
    }
    setState((current) => ({ ...current, posts: [post, ...current.posts] }))
    if (!apiKey.trim()) {
      setError('微博已发布。填写 DeepSeek API Key 后可以补写评论。')
      return
    }
    await generatePostReactions(post)
  }

  const retryPostReactions = async (postId: string) => {
    const post = state.posts.find((item) => item.id === postId)
    if (!post || post.author.kind !== 'hunter' || post.reactionStatus === 'pending') return
    if (!apiKey.trim()) {
      setError('请先到设置里填写 DeepSeek API Key。')
      return
    }
    setState((current) => updatePost(current, postId, (item) => ({ ...item, reactionStatus: 'pending' })))
    await generatePostReactions(post)
  }

  const generatePostReactions = async (post: WeiboPost) => {
    setError('')
    try {
      const reactions = await runRequest(post.date, (signal) => requestHunterPostReactions({
        apiKey,
        model,
        text: post.text,
        persona,
        signal
      }))
      const comments = reactions.map(reactionToComment)
      setState((current) => updatePost(current, post.id, (item) => ({
        ...item,
        reactionStatus: undefined,
        comments: [...item.comments, ...comments]
      })))
    } catch (requestError) {
      setState((current) => updatePost(current, post.id, (item) => ({ ...item, reactionStatus: 'failed' })))
      setError(normalizeRequestError(requestError, '微博已发布，但评论暂时没有生成。'))
    }
  }

  const clearDate = (date: string) => {
    requests.current.forEach((requestDate, controller) => {
      if (requestDate === date) controller.abort()
    })
    setState((current) => clearWeiboDate(current, date))
    setError('')
  }

  return {
    state,
    isRefreshing,
    error: [error, storageError].filter(Boolean).join(' '),
    refreshToday,
    toggleLike,
    addComment,
    retryCommentReply,
    publishPost,
    retryPostReactions,
    clearDate
  }
}

function updatePost(state: WeiboState, postId: string, update: (post: WeiboPost) => WeiboPost): WeiboState {
  return {
    ...state,
    posts: state.posts.map((post) => post.id === postId ? update(post) : post)
  }
}

function updateComment(
  state: WeiboState,
  postId: string,
  commentId: string,
  update: (comment: WeiboComment) => WeiboComment
) {
  return updatePost(state, postId, (post) => ({
    ...post,
    comments: post.comments.map((comment) => comment.id === commentId ? update(comment) : comment)
  }))
}

function reactionToComment(item: GeneratedPostReaction): WeiboComment {
  return {
    id: createId('weibo-comment'),
    author: item.authorKind === 'aoyin'
      ? aoyinAuthor()
      : {
          id: createId('weibo-npc'),
          kind: 'npc',
          name: item.authorName,
          avatar: item.avatar,
          bio: item.bio
        },
    text: item.text,
    createdAt: Date.now()
  }
}

function aoyinAuthor(): WeiboAuthor {
  return { id: 'headphones-on', kind: 'aoyin', name: '耳机不离身', avatar: '🎧', bio: '低调在线' }
}

function randomLikes(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
}

function normalizeRequestError(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === 'AbortError') return '请求已取消。'
  return error instanceof Error && error.message ? error.message : fallback
}
