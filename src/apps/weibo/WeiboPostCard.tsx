import { useState, type FormEvent } from 'react'
import { Heart, MessageCircle, RotateCcw, Send } from 'lucide-react'
import { formatPostTime } from './weiboDates'
import type { WeiboPost } from './weiboTypes'

export function WeiboPostCard({
  post,
  topic,
  onLike,
  onComment,
  onRetryComment,
  onRetryReactions
}: {
  post: WeiboPost
  topic?: string
  onLike: (postId: string) => void
  onComment: (postId: string, text: string) => Promise<void>
  onRetryComment: (postId: string, commentId: string) => Promise<void>
  onRetryReactions: (postId: string) => Promise<void>
}) {
  const [isCommenting, setIsCommenting] = useState(false)
  const [draft, setDraft] = useState('')

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setIsCommenting(false)
    void onComment(post.id, text)
  }

  return (
    <article className="weibo-post">
      <header className="weibo-post-author">
        <span className={`weibo-avatar ${post.author.kind}`} aria-hidden="true">{post.author.avatar}</span>
        <span className="weibo-author-copy">
          <strong>{post.author.name}</strong>
          <small>{post.author.bio || '临空市用户'} · {formatPostTime(post.createdAt)}</small>
        </span>
      </header>

      <p className="weibo-post-text">{post.text}</p>
      {topic ? <p className="weibo-topic">#{topic}#</p> : null}

      {post.comments.length > 0 || post.reactionStatus ? (
        <section className="weibo-comments" aria-label={`${post.author.name}微博评论`}>
          {post.comments.map((comment) => (
            <div className="weibo-comment-thread" key={comment.id}>
              <div className="weibo-comment">
                <span aria-hidden="true">{comment.author.avatar}</span>
                <p><strong>{comment.author.name}</strong>{comment.text}</p>
              </div>
              {comment.reply ? (
                <div className="weibo-comment weibo-comment-reply">
                  <span aria-hidden="true">{comment.reply.author.avatar}</span>
                  <p><strong>{comment.reply.author.name}</strong>{comment.reply.text}</p>
                </div>
              ) : null}
              {comment.replyStatus === 'pending' ? (
                <p className="weibo-inline-state">博主正在回复...</p>
              ) : null}
              {comment.replyStatus === 'failed' ? (
                <button className="weibo-inline-action" type="button"
                  onClick={() => void onRetryComment(post.id, comment.id)}>
                  <RotateCcw size={13} /> 补写博主回复
                </button>
              ) : null}
            </div>
          ))}
          {post.reactionStatus === 'pending' ? <p className="weibo-inline-state">正在等他们看到...</p> : null}
          {post.reactionStatus === 'failed' ? (
            <button className="weibo-inline-action" type="button"
              onClick={() => void onRetryReactions(post.id)}>
              <RotateCcw size={13} /> 重新生成评论
            </button>
          ) : null}
        </section>
      ) : null}

      {isCommenting && post.author.kind !== 'hunter' ? (
        <form className="weibo-comment-form" onSubmit={submitComment}>
          <input value={draft} autoFocus maxLength={180}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`评论 ${post.author.name}`} aria-label={`评论${post.author.name}的微博`} />
          <button type="submit" aria-label="发送评论" disabled={!draft.trim()}>
            <Send size={17} />
          </button>
        </form>
      ) : null}

      <footer className="weibo-post-actions">
        <button type="button" className={post.liked ? 'liked' : ''}
          aria-label={post.liked ? '取消点赞' : '点赞'} aria-pressed={post.liked}
          onClick={() => onLike(post.id)}>
          <Heart size={18} fill={post.liked ? 'currentColor' : 'none'} />
          <span>{formatCount(post.likeCount)}</span>
        </button>
        {post.author.kind !== 'hunter' ? (
          <button type="button" aria-label="评论" aria-pressed={isCommenting}
            onClick={() => setIsCommenting((current) => !current)}>
            <MessageCircle size={18} />
            <span>{post.comments.length || '评论'}</span>
          </button>
        ) : (
          <span className="weibo-comment-count">
            <MessageCircle size={18} />
            {post.comments.length || '评论'}
          </span>
        )}
      </footer>
    </article>
  )
}

function formatCount(value: number) {
  if (value < 10000) return String(value)
  return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`
}
