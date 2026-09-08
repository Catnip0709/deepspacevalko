import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Check, Pencil, RefreshCw, Send, X } from 'lucide-react'
import type { ChatMessage } from '../../app/types'
import { AoyinAvatar } from '../../components/avatars'

export function ConversationShell({
  messages,
  isChatting,
  error,
  hasApiKey,
  onSend,
  onEditLastUserMessage,
  onRegenerateLastAssistantMessage,
  onOpenSettings
}: {
  messages: ChatMessage[]
  isChatting: boolean
  error: string
  hasApiKey: boolean
  onSend: (text: string) => void
  onEditLastUserMessage: (messageId: string, text: string) => void
  onRegenerateLastAssistantMessage: (messageId: string) => void
  onOpenSettings: () => void
}) {
  const [draft, setDraft] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const draftRef = useRef<HTMLTextAreaElement | null>(null)
  const editRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant')

  const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 88)}px`
    textarea.style.overflowY = textarea.scrollHeight > 88 ? 'auto' : 'hidden'
  }

  useEffect(() => {
    resizeTextarea(draftRef.current)
  }, [draft])

  useEffect(() => {
    resizeTextarea(editRef.current)
  }, [editingText, editingMessageId])

  useEffect(() => {
    const scrollElement = messagesScrollRef.current

    if (!scrollElement) {
      return
    }

    scrollElement.scrollTop = scrollElement.scrollHeight
  }, [messages, editingMessageId])

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()

    if (!text || isChatting) {
      return
    }

    onSend(text)
    setDraft('')
  }

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = editingText.trim()

    if (!editingMessageId || !text || isChatting) {
      return
    }

    onEditLastUserMessage(editingMessageId, text)
    setEditingMessageId(null)
    setEditingText('')
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditingText('')
  }

  return (
    <section className="conversation-shell" aria-label="与敖尹的聊天">
      <div className="messages-scroll" ref={messagesScrollRef} aria-live="polite">
        {messages.map((message) => (
          <div className={`message-row ${message.role === 'assistant' ? 'other' : 'mine'}`} key={message.id}>
            {message.role === 'assistant' ? <AoyinAvatar /> : null}
            <div className="message-stack">
              {editingMessageId === message.id ? (
                <form className="message-edit-form" onSubmit={submitEdit}>
                  <textarea
                    ref={editRef}
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    rows={1}
                    aria-label="编辑最后一条消息"
                  />
                  <span className="message-edit-actions">
                    <button type="button" onClick={cancelEdit} aria-label="取消编辑">
                      <X size={15} strokeWidth={2.5} />
                    </button>
                    <button type="submit" disabled={!editingText.trim() || isChatting} aria-label="确认编辑并重新生成回复">
                      <Check size={15} strokeWidth={2.5} />
                    </button>
                  </span>
                </form>
              ) : (
                <p>{message.content || '...'}</p>
              )}
              {message.role === 'user' && message.id === lastUserMessage?.id && editingMessageId !== message.id ? (
                <button
                  className="message-inline-action"
                  type="button"
                  disabled={isChatting}
                  onClick={() => {
                    setEditingMessageId(message.id)
                    setEditingText(message.content)
                    window.requestAnimationFrame(() => {
                      editRef.current?.focus()
                    })
                  }}
                  aria-label="编辑最后一条已发送消息"
                >
                  <Pencil size={13} strokeWidth={2.4} />
                  编辑
                </button>
              ) : null}
              {message.role === 'assistant' && message.id === lastAssistantMessage?.id ? (
                <button
                  className="message-inline-action"
                  type="button"
                  disabled={isChatting || !hasApiKey || !lastUserMessage}
                  onClick={() => onRegenerateLastAssistantMessage(message.id)}
                  aria-label="重新生成敖尹的最后一条回复"
                >
                  <RefreshCw size={13} strokeWidth={2.4} />
                  重答
                </button>
              ) : null}
            </div>
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
        <textarea
          ref={draftRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={hasApiKey ? '和敖尹说点什么...' : '请先去设置填写 API Key'}
          disabled={!hasApiKey || isChatting}
          rows={1}
        />
        <button type="submit" disabled={!hasApiKey || !draft.trim() || isChatting} aria-label="发送消息">
          <Send size={18} strokeWidth={2.4} />
        </button>
      </form>
    </section>
  )
}
