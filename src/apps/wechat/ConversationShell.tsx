import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Check, MapPin, Pencil, Plus, RefreshCw, Send, X } from 'lucide-react'
import type { ChatMessage } from '../../app/types'
import { AoyinAvatar } from '../../components/avatars'
import { MessageContent } from './MessageCards'
import { wechatActions, type WechatActionId } from './wechatActions'

export function ConversationShell({
  messages,
  isChatting,
  error,
  hasApiKey,
  onSend,
  onSendLocation,
  onSendRedPacket,
  onEditLastUserMessage,
  onRegenerateLastAssistantMessage,
  onOpenSettings
}: {
  messages: ChatMessage[]
  isChatting: boolean
  error: string
  hasApiKey: boolean
  onSend: (text: string) => void
  onSendLocation: (place: string, note?: string) => void
  onSendRedPacket: (amount: string, note?: string) => void
  onEditLastUserMessage: (messageId: string, text: string) => void
  onRegenerateLastAssistantMessage: (messageId: string) => void
  onOpenSettings: () => void
}) {
  const [draft, setDraft] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false)
  const [activeActionId, setActiveActionId] = useState<WechatActionId | null>(null)
  const [locationDraft, setLocationDraft] = useState('')
  const [locationNoteDraft, setLocationNoteDraft] = useState('')
  const [redPacketAmount, setRedPacketAmount] = useState('')
  const [redPacketNoteDraft, setRedPacketNoteDraft] = useState('')
  const draftRef = useRef<HTMLTextAreaElement | null>(null)
  const editRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant')
  const isDraftEmpty = !draft.trim()

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
    if (!isDraftEmpty) {
      closeActionPanel()
    }
  }, [isDraftEmpty])

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

  const submitLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const place = locationDraft.trim()

    if (!place || isChatting) {
      return
    }

    onSendLocation(place, locationNoteDraft)
    setLocationDraft('')
    setLocationNoteDraft('')
    closeActionPanel()
  }

  const submitRedPacket = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = redPacketAmount.trim()

    if (!amount || isChatting) {
      return
    }

    onSendRedPacket(amount, redPacketNoteDraft)
    setRedPacketAmount('')
    setRedPacketNoteDraft('')
    closeActionPanel()
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

  const closeActionPanel = () => {
    setIsActionPanelOpen(false)
    setActiveActionId(null)
  }

  const toggleActionPanel = () => {
    if (!isDraftEmpty || isChatting || !hasApiKey) {
      return
    }

    setIsActionPanelOpen((current) => !current)
    setActiveActionId(null)
  }

  const selectAction = (actionId: WechatActionId) => {
    setActiveActionId(actionId)
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)

    if (value.trim()) {
      closeActionPanel()
    }
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
                <MessageContent message={message} />
              )}
              {message.role === 'user' &&
              (message.type ?? 'text') === 'text' &&
              message.id === lastUserMessage?.id &&
              editingMessageId !== message.id ? (
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

      {isActionPanelOpen && isDraftEmpty ? (
        <section className="chat-action-panel" aria-label="微信扩展功能">
          {activeActionId ? (
            <button className="chat-panel-close" type="button" onClick={closeActionPanel} aria-label="关闭扩展功能">
              <X size={16} strokeWidth={2.5} />
            </button>
          ) : null}

          {!activeActionId ? (
            <div className="chat-action-grid">
              {wechatActions.map((action) => (
                <button
                  className="chat-action-item"
                  type="button"
                  key={action.id}
                  onClick={() => selectAction(action.id)}
                >
                  <span>
                    <action.Icon size={20} strokeWidth={2.3} />
                  </span>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </button>
              ))}
            </div>
          ) : null}

          {activeActionId === 'location' ? (
            <form className="chat-plugin-card location-composer" onSubmit={submitLocation}>
              <div className="composer-map-preview" aria-hidden="true">
                <span className="map-road main" />
                <span className="map-road branch" />
                <span className="map-water" />
                <span className="map-pin">
                  <MapPin size={17} strokeWidth={2.6} />
                </span>
              </div>
              <label>
                <span>当前位置</span>
                <input
                  value={locationDraft}
                  onChange={(event) => setLocationDraft(event.target.value)}
                  placeholder="例如：临空市猎人协会门口"
                  disabled={isChatting}
                />
              </label>
              <label>
                <span>留言（选填）</span>
                <input
                  value={locationNoteDraft}
                  onChange={(event) => setLocationNoteDraft(event.target.value)}
                  placeholder="例如：我在这里等你"
                  disabled={isChatting}
                />
              </label>
              <button type="submit" disabled={!locationDraft.trim() || isChatting}>
                发送定位
              </button>
            </form>
          ) : null}

          {activeActionId === 'redPacket' ? (
            <form className="chat-plugin-card red-packet-composer" onSubmit={submitRedPacket}>
              <div className="red-packet-preview" aria-hidden="true">
                <span>¥</span>
              </div>
              <label>
                <span>红包金额</span>
                <input
                  value={redPacketAmount}
                  onChange={(event) => setRedPacketAmount(event.target.value)}
                  placeholder="例如：52.00"
                  inputMode="decimal"
                  disabled={isChatting}
                />
              </label>
              <label>
                <span>留言（选填）</span>
                <input
                  value={redPacketNoteDraft}
                  onChange={(event) => setRedPacketNoteDraft(event.target.value)}
                  placeholder="例如：给小狼买夜宵"
                  disabled={isChatting}
                />
              </label>
              <button type="submit" disabled={!redPacketAmount.trim() || isChatting}>
                发送红包
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <form className="chat-input-bar" onSubmit={submitMessage} aria-label="发送消息">
        <textarea
          ref={draftRef}
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={hasApiKey ? '和敖尹说点什么...' : '请先去设置填写 API Key'}
          disabled={!hasApiKey || isChatting}
          rows={1}
        />
        {isDraftEmpty ? (
          <button
            type="button"
            disabled={!hasApiKey || isChatting}
            onClick={toggleActionPanel}
            aria-label={isActionPanelOpen ? '收起更多功能' : '展开更多功能'}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        ) : (
          <button type="submit" disabled={!hasApiKey || isChatting} aria-label="发送消息">
            <Send size={18} strokeWidth={2.4} />
          </button>
        )}
      </form>
    </section>
  )
}
