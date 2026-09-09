import { ArrowLeft, Bell, Camera, MessageCircle, Trash2 } from 'lucide-react'
import type { ChatMessage, Moment, WechatTab } from '../../app/types'
import { ConversationShell } from './ConversationShell'
import { MomentsFeed } from './MomentsFeed'

export function WechatApp({
  activeTab,
  moments,
  chatMessages,
  isChatting,
  chatError,
  hasApiKey,
  onBackHome,
  onChangeTab,
  onPublishMoment,
  onReplyToMoment,
  momentError,
  replyingMomentIds,
  onSendChatMessage,
  onSendLocationMessage,
  onSendRedPacketMessage,
  onEditLastUserMessage,
  onRegenerateLastAssistantMessage,
  onClearChat,
  onOpenSettings
}: {
  activeTab: WechatTab
  moments: Moment[]
  chatMessages: ChatMessage[]
  isChatting: boolean
  chatError: string
  hasApiKey: boolean
  onBackHome: () => void
  onChangeTab: (tab: WechatTab) => void
  onPublishMoment: (text: string) => Promise<void>
  onReplyToMoment: (momentId: string, text: string) => Promise<void>
  momentError: string
  replyingMomentIds: string[]
  onSendChatMessage: (text: string) => void
  onSendLocationMessage: (place: string, note?: string) => void
  onSendRedPacketMessage: (amount: string, note?: string) => void
  onEditLastUserMessage: (messageId: string, text: string) => void
  onRegenerateLastAssistantMessage: (messageId: string) => void
  onClearChat: () => void
  onOpenSettings: () => void
}) {
  const title = activeTab === 'chats' ? '敖尹' : '朋友圈'
  const clearChatWithConfirmation = () => {
    if (window.confirm('确认清空和敖尹的聊天记录吗？')) {
      onClearChat()
    }
  }

  return (
    <section className="wechat-shell" aria-label="微信">
      <header className="app-topbar">
        <button
          className="icon-button"
          type="button"
          aria-label="返回桌面"
          onClick={onBackHome}
        >
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <h2>{title}</h2>
        {activeTab === 'chats' ? (
          <button
            className="icon-button ghost danger"
            type="button"
            onClick={clearChatWithConfirmation}
            aria-label="清空与敖尹的聊天记录"
          >
            <Trash2 size={19} strokeWidth={2.3} />
          </button>
        ) : (
          <button className="icon-button ghost" type="button" aria-label="微信通知">
            <Bell size={19} strokeWidth={2.3} />
          </button>
        )}
      </header>

      <div className="wechat-content">
        {activeTab === 'chats' ? (
          <ConversationShell
            messages={chatMessages}
            isChatting={isChatting}
            error={chatError}
            hasApiKey={hasApiKey}
            onSend={onSendChatMessage}
            onSendLocation={onSendLocationMessage}
            onSendRedPacket={onSendRedPacketMessage}
            onEditLastUserMessage={onEditLastUserMessage}
            onRegenerateLastAssistantMessage={onRegenerateLastAssistantMessage}
            onOpenSettings={onOpenSettings}
          />
        ) : null}
        {activeTab === 'moments' ? (
          <MomentsFeed
            moments={moments}
            momentError={momentError}
            replyingMomentIds={replyingMomentIds}
            onPublishMoment={onPublishMoment}
            onReplyToMoment={onReplyToMoment}
          />
        ) : null}
      </div>

      <nav className="wechat-tabs" aria-label="微信底部标签">
        <button
          className={activeTab === 'chats' ? 'active' : ''}
          type="button"
          aria-pressed={activeTab === 'chats'}
          onClick={() => onChangeTab('chats')}
        >
          <MessageCircle size={21} strokeWidth={2.3} />
          <span>聊天</span>
        </button>
        <button
          className={activeTab === 'moments' ? 'active' : ''}
          type="button"
          aria-pressed={activeTab === 'moments'}
          onClick={() => onChangeTab('moments')}
        >
          <Camera size={21} strokeWidth={2.3} />
          <span>朋友圈</span>
        </button>
      </nav>
    </section>
  )
}
