import { ArrowLeft, Feather, LoaderCircle, Camera, MessageCircle, Trash2 } from 'lucide-react'
import type { ChatMessage, Moment, PersonaSettings, WechatTab } from '../../app/types'
import { ConversationShell } from './ConversationShell'
import { MomentsFeed } from './MomentsFeed'

export function WechatApp({
  activeTab,
  moments,
  chatMessages,
  isChatting,
  chatError,
  hasApiKey,
  personaSettings,
  onBackHome,
  onChangeTab,
  onPublishMoment,
  onPublishAoyinMoment,
  isPostingMoment,
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
  personaSettings: PersonaSettings
  onBackHome: () => void
  onChangeTab: (tab: WechatTab) => void
  onPublishMoment: (text: string) => Promise<void>
  onPublishAoyinMoment: () => Promise<void>
  isPostingMoment: boolean
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
  const publishMomentWithConfirmation = () => {
    if (isPostingMoment) return
    if (window.confirm('确认让敖尹根据聊天和朋友圈记录发一条新朋友圈吗？')) {
      void onPublishAoyinMoment()
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
          <button
            className="icon-button ghost"
            type="button"
            aria-label={isPostingMoment ? '敖尹正在写朋友圈' : '让敖尹发朋友圈'}
            title={isPostingMoment ? '敖尹正在写朋友圈' : '让敖尹发朋友圈'}
            aria-busy={isPostingMoment}
            disabled={isPostingMoment}
            onClick={publishMomentWithConfirmation}
          >
            {isPostingMoment
              ? <LoaderCircle className="moment-post-spinner" size={19} strokeWidth={2.3} />
              : <Feather size={19} strokeWidth={2.3} />}
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
            hunterName={personaSettings.hunter.name}
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
