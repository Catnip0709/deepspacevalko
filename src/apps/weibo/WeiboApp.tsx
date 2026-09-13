import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Home,
  PenLine,
  RefreshCw,
  Settings,
  Trash2,
  TrendingUp,
  UserRound,
  X
} from 'lucide-react'
import type { DeepSeekModel, PersonaSettings } from '../../app/types'
import { formatWeiboDate, localWeiboDate } from './weiboDates'
import { WeiboPostCard } from './WeiboPostCard'
import type { WeiboTab } from './weiboTypes'
import { useWeibo } from './useWeibo'
import './weibo.css'

export function WeiboApp({
  onBackHome,
  onOpenSettings,
  apiKey,
  model,
  persona
}: {
  onBackHome: () => void
  onOpenSettings: () => void
  apiKey: string
  model: DeepSeekModel
  persona: PersonaSettings
}) {
  const {
    state,
    isRefreshing,
    error,
    refreshToday,
    toggleLike,
    addComment,
    retryCommentReply,
    publishPost,
    retryPostReactions,
    clearDate
  } = useWeibo({ apiKey, model, persona })
  const [tab, setTab] = useState<WeiboTab>('trending')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState<string>()
  const [clearTarget, setClearTarget] = useState('')

  const today = localWeiboDate()
  const refreshedToday = state.refreshedDates.includes(today)
  const days = [...state.days].sort((a, b) => b.date.localeCompare(a.date))
  const topicMap = useMemo(
    () => new Map(state.days.flatMap((day) => day.hotSearches.map((topic) => [topic.id, topic.title]))),
    [state.days]
  )
  const feedPosts = [...state.posts]
    .filter((post) => !selectedTopicId || post.hotSearchId === selectedTopicId)
    .sort((a, b) => b.createdAt - a.createdAt)
  const myPosts = state.posts
    .filter((post) => post.author.kind === 'hunter')
    .sort((a, b) => b.createdAt - a.createdAt)
  const clearDates = [...new Set([
    ...state.days.map((day) => day.date),
    ...state.posts.map((post) => post.date)
  ])].sort((a, b) => b.localeCompare(a))
  const selectedClearDate = clearTarget.replace(':confirm', '')
  const clearSummary = selectedClearDate
    ? {
        topics: state.days.find((day) => day.date === selectedClearDate)?.hotSearches.length ?? 0,
        posts: state.posts.filter((post) => post.date === selectedClearDate).length,
        comments: state.posts
          .filter((post) => post.date === selectedClearDate)
          .reduce((total, post) => total + post.comments.length, 0)
      }
    : null

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setIsComposerOpen(false)
    setTab('profile')
    void publishPost(text)
  }

  const openTopic = (id: string) => {
    setSelectedTopicId(id)
    setTab('feed')
  }

  const changeTab = (next: WeiboTab) => {
    setTab(next)
    if (next !== 'feed') setSelectedTopicId(undefined)
  }

  return (
    <section className="weibo-shell" aria-label="微博应用">
      <header className="weibo-topbar">
        <button type="button" className="icon-button" aria-label="返回桌面" onClick={onBackHome}>
          <ArrowLeft size={21} />
        </button>
        <h2>{tab === 'trending' ? '临空热搜' : tab === 'feed' ? '微博' : '蓝莓'}</h2>
        <button type="button" className="icon-button" aria-label="发布微博"
          title="发布微博" onClick={() => setIsComposerOpen(true)}>
          <PenLine size={20} />
        </button>
      </header>

      <main className="weibo-content">
        {error ? (
          <div className="weibo-error" role="alert">
            <span>{error}</span>
            {!apiKey.trim() ? (
              <button type="button" onClick={onOpenSettings}><Settings size={14} /> 去设置</button>
            ) : null}
          </div>
        ) : null}

        {tab === 'trending' ? (
          <section className="weibo-trending-view" aria-label="每日热搜时间线">
            <div className="weibo-refresh-panel">
              <span className="weibo-refresh-mark"><Flame size={24} fill="currentColor" /></span>
              <span>
                <small>{formatWeiboDate(today)}</small>
                <strong>{refreshedToday ? '今日热搜已送达' : '今天的临空市在聊什么'}</strong>
              </span>
              <button type="button" onClick={() => void refreshToday()}
                disabled={refreshedToday || isRefreshing}>
                <RefreshCw size={17} className={isRefreshing ? 'spinning' : ''} />
                {isRefreshing ? '生成中' : refreshedToday ? '已刷新' : '刷新'}
              </button>
            </div>
            {refreshedToday ? (
              <p className="weibo-refresh-note">每天只能刷新一次，请第二天再试。</p>
            ) : null}

            {days.length === 0 ? (
              <div className="weibo-empty">
                <TrendingUp size={28} />
                <strong>还没有热搜记录</strong>
                <span>刷新后，临空市今天的消息会出现在这里。</span>
              </div>
            ) : (
              <div className="weibo-timeline">
                {days.map((day) => (
                  <section className="weibo-trend-day" key={day.date}>
                    <time dateTime={day.date}>{formatWeiboDate(day.date)}</time>
                    <div className="weibo-trend-list">
                      {day.hotSearches.map((topic, index) => (
                        <button type="button" key={topic.id} onClick={() => openTopic(topic.id)}>
                          <b>{index + 1}</b>
                          <span>
                            <strong>{topic.title}</strong>
                            <small>{topic.heat.toLocaleString('zh-CN')} 热度</small>
                          </span>
                          <em className={`tag-${topic.tag}`}>{topic.tag}</em>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === 'feed' ? (
          <section className="weibo-feed" aria-label="微博首页信息流">
            {selectedTopicId ? (
              <button className="weibo-feed-filter" type="button" onClick={() => setSelectedTopicId(undefined)}>
                #{topicMap.get(selectedTopicId)}# <X size={14} />
              </button>
            ) : null}
            {feedPosts.length === 0 ? (
              <div className="weibo-empty">
                <Home size={28} />
                <strong>{selectedTopicId ? '这条热搜还没有微博' : '首页还是空的'}</strong>
                <span>{selectedTopicId ? '清除筛选看看其他内容。' : '先去热搜页刷新今天的内容。'}</span>
              </div>
            ) : feedPosts.map((post) => (
              <WeiboPostCard key={post.id} post={post}
                topic={post.hotSearchId ? topicMap.get(post.hotSearchId) : undefined}
                onLike={toggleLike} onComment={addComment}
                onRetryComment={retryCommentReply} onRetryReactions={retryPostReactions} />
            ))}
          </section>
        ) : null}

        {tab === 'profile' ? (
          <section className="weibo-profile" aria-label="蓝莓的微博">
            <div className="weibo-profile-header">
              <span className="weibo-profile-avatar" aria-hidden="true">🫐</span>
              <span>
                <h3>蓝莓</h3>
                <p>{myPosts.length} 条微博 · 临空市生活记录</p>
              </span>
            </div>

            <section className="weibo-cleanup" aria-label="内容清理">
              <header>
                <span><Trash2 size={17} /> 内容清理</span>
                <small>按日期删除本机记录</small>
              </header>
              <div>
                <select value={selectedClearDate} onChange={(event) => setClearTarget(event.target.value)}
                  aria-label="选择要清理的日期">
                  <option value="">选择日期</option>
                  {clearDates.map((date) => <option value={date} key={date}>{formatWeiboDate(date)}</option>)}
                </select>
                <button type="button" disabled={!clearTarget}
                  onClick={() => setClearTarget((current) => current ? `${current}:confirm` : '')}>
                  清理
                </button>
              </div>
            </section>

            <div className="weibo-profile-feed">
              {myPosts.length === 0 ? (
                <div className="weibo-empty">
                  <UserRound size={28} />
                  <strong>还没有发布微博</strong>
                  <span>写下此刻想留在临空市的话。</span>
                </div>
              ) : myPosts.map((post) => (
                <WeiboPostCard key={post.id} post={post} onLike={toggleLike}
                  onComment={addComment} onRetryComment={retryCommentReply}
                  onRetryReactions={retryPostReactions} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <nav className="weibo-tabs" aria-label="微博底部标签">
        <button type="button" aria-pressed={tab === 'trending'} onClick={() => changeTab('trending')}>
          <TrendingUp size={20} /><span>热搜</span>
        </button>
        <button type="button" aria-pressed={tab === 'feed'} onClick={() => changeTab('feed')}>
          <Home size={20} /><span>首页</span>
        </button>
        <button type="button" aria-pressed={tab === 'profile'} onClick={() => changeTab('profile')}>
          <UserRound size={20} /><span>我的</span>
        </button>
      </nav>

      {isComposerOpen ? (
        <div className="weibo-modal" role="dialog" aria-modal="true" aria-labelledby="weibo-compose-title">
          <button className="weibo-modal-backdrop" type="button" aria-label="关闭发布窗口"
            onClick={() => setIsComposerOpen(false)} />
          <form className="weibo-compose-sheet" onSubmit={submitPost}>
            <header>
              <button type="button" className="icon-button" aria-label="取消发布"
                onClick={() => setIsComposerOpen(false)}><X size={19} /></button>
              <h3 id="weibo-compose-title">发布微博</h3>
              <button className="weibo-submit" type="submit" disabled={!draft.trim()}>发布</button>
            </header>
            <div className="weibo-compose-author"><span>🫐</span><strong>蓝莓</strong></div>
            <textarea value={draft} autoFocus
              onChange={(event) => setDraft(Array.from(event.target.value).slice(0, 280).join(''))}
              placeholder="分享此刻的新鲜事..." aria-label="微博正文" />
            <small>{Array.from(draft).length}/280</small>
          </form>
        </div>
      ) : null}

      {clearTarget.endsWith(':confirm') && clearSummary ? (
        <div className="weibo-modal" role="dialog" aria-modal="true" aria-labelledby="weibo-clear-title">
          <button className="weibo-modal-backdrop" type="button" aria-label="取消清理"
            onClick={() => setClearTarget(selectedClearDate)} />
          <section className="weibo-confirm-sheet">
            <Trash2 size={24} />
            <h3 id="weibo-clear-title">清理这一天的内容？</h3>
            <p>{formatWeiboDate(selectedClearDate)}的 {clearSummary.topics} 条热搜、
              {clearSummary.posts} 条微博和 {clearSummary.comments} 条评论将从本机删除。</p>
            <div>
              <button type="button" onClick={() => setClearTarget(selectedClearDate)}>取消</button>
              <button type="button" className="danger" onClick={() => {
                clearDate(selectedClearDate)
                setClearTarget('')
              }}>确认清理</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
