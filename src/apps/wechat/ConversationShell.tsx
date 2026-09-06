import { useState, type FormEvent } from 'react'
import { Send, Trash2 } from 'lucide-react'
import type { ChatMessage } from '../../app/types'
import { AoyinAvatar } from '../../components/avatars'

export function ConversationShell({
  messages,
  isChatting,
  error,
  hasApiKey,
  onSend,
  onClear,
  onOpenSettings
}: {
  messages: ChatMessage[]
  isChatting: boolean
  error: string
  hasApiKey: boolean
  onSend: (text: string) => void
  onClear: () => void
  onOpenSettings: () => void
}) {
  const [draft, setDraft] = useState('')

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()

    if (!text || isChatting) {
      return
    }

    onSend(text)
    setDraft('')
  }

  return (
    <section className="conversation-shell" aria-label="与敖尹的聊天">
      <div className="conversation-actions">
        <span>{hasApiKey ? 'DeepSeek 已连接' : '需要填写 DeepSeek API Key'}</span>
        <button type="button" onClick={onClear} aria-label="清空与敖尹的聊天记录">
          <Trash2 size={15} strokeWidth={2.4} />
          清空
        </button>
      </div>

      <div className="messages-scroll" aria-live="polite">
        {messages.map((message) => (
          <div className={`message-row ${message.role === 'assistant' ? 'other' : 'mine'}`} key={message.id}>
            {message.role === 'assistant' ? <AoyinAvatar /> : null}
            <p>{message.content || '...'}</p>
          </div>
        ))}
      </div>

      {!hasApiKey ? (
        <div className="chat-warning">
          <span>先在设置里填写 DeepSeek API Key，才能继续聊天。</span>
          <button type="button" onClick={onOpenSettings}>
            去设置
          </button>
        </div>
      ) : null}

      {error ? <p className="chat-error">{error}</p> : null}

      <form className="chat-input-bar" onSubmit={submitMessage} aria-label="发送消息">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={hasApiKey ? '和敖尹说点什么...' : '请先去设置填写 API Key'}
          disabled={!hasApiKey || isChatting}
        />
        <button type="submit" disabled={!hasApiKey || !draft.trim() || isChatting} aria-label="发送消息">
          <Send size={18} strokeWidth={2.4} />
        </button>
      </form>
    </section>
  )
}
