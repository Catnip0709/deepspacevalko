import { useState, type FormEvent } from 'react'
import { Trees } from 'lucide-react'
import type { Moment } from '../../app/types'
import { AoyinAvatar, AoyinMiniAvatar, HunterAvatar, HunterMiniAvatar } from '../../components/avatars'

export function MomentsFeed({
  moments,
  momentError,
  replyingMomentIds,
  hunterName,
  onPublishMoment,
  onReplyToMoment
}: {
  moments: Moment[]
  momentError: string
  replyingMomentIds: string[]
  hunterName: string
  onPublishMoment: (text: string) => Promise<void>
  onReplyToMoment: (momentId: string, text: string) => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const submitMoment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()

    if (!text) {
      return
    }

    void onPublishMoment(text)
    setDraft('')
  }

  const submitReply = (event: FormEvent<HTMLFormElement>, momentId: string) => {
    event.preventDefault()
    const text = replyDrafts[momentId]?.trim()

    if (!text) {
      return
    }

    void onReplyToMoment(momentId, text)
    setReplyDrafts((current) => ({ ...current, [momentId]: '' }))
  }

  return (
    <section className="moments-feed" aria-label="朋友圈列表">
      <form className="moment-composer" onSubmit={submitMoment} aria-label="发布朋友圈">
        <HunterAvatar />
        <div className="moment-composer-body">
          <label>
            <span>
              <Trees size={17} strokeWidth={2.2} />
              {hunterName}发朋友圈
            </span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="写点什么给朋友圈..."
              rows={3}
            />
          </label>
          <button type="submit" disabled={!draft.trim()}>
            发布
          </button>
        </div>
      </form>
      {momentError ? <p className="moment-error">{momentError}</p> : null}
      {moments.map((item) => (
        <article className="moment-card" key={item.id}>
          {item.author === 'aoyin' ? <AoyinAvatar /> : <HunterAvatar />}
          <div className="moment-body">
            <div className="moment-title">
              <span>{item.author === 'hunter' ? hunterName : item.authorName}</span>
              <time>{item.time}</time>
            </div>
            <p>{item.text}</p>
            {item.replies.length > 0 ? (
              <div
                className="moment-replies"
                aria-label={`${item.author === 'hunter' ? hunterName : item.authorName}朋友圈回复`}
              >
                {item.replies.map((reply) => (
                  <div className={`moment-reply ${reply.pending ? 'pending' : ''}`} key={reply.id}>
                    {reply.author === 'aoyin' ? <AoyinMiniAvatar /> : <HunterMiniAvatar />}
                    <p>
                      <strong>{reply.author === 'aoyin' ? '敖尹' : hunterName}：</strong>
                      {reply.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <form className="moment-reply-form" onSubmit={(event) => submitReply(event, item.id)}>
              <input
                value={replyDrafts[item.id] ?? ''}
                onChange={(event) =>
                  setReplyDrafts((current) => ({
                    ...current,
                    [item.id]: event.target.value
                  }))
                }
                placeholder={item.author === 'aoyin' ? '回复敖尹...' : '补充一句...'}
                aria-label={`回复${item.author === 'hunter' ? hunterName : item.authorName}的朋友圈`}
                disabled={replyingMomentIds.includes(item.id)}
              />
              <button type="submit" disabled={!replyDrafts[item.id]?.trim() || replyingMomentIds.includes(item.id)}>
                {replyingMomentIds.includes(item.id) ? '等待' : '回复'}
              </button>
            </form>
          </div>
        </article>
      ))}
    </section>
  )
}
