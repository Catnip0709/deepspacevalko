import { ArrowLeft, Bell, Camera, MessageCircle } from 'lucide-react'
import type { ChatMessage, Moment, WechatTab, WechatView } from '../../app/types'
import { ChatList } from './ChatList'
import { ConversationShell } from './ConversationShell'
import { MomentsFeed } from './MomentsFeed'

export function WechatApp({
  activeTab,
  view,
  moments,
  chatMessages,
  isChatting,
  chatError,
  hasApiKey,
  onBackHome,
  onOpenConversation,
  onBackToList,
  onChangeTab,
  onPublishMoment,
  onReplyToMoment,
  momentError,
  replyingMomentIds,
  onSendChatMessage,
  onClearChat,
  onOpenSettings
}: {
  activeTab: WechatTab
  view: WechatView
  moments: Moment[]
  chatMessages: ChatMessage[]
  isChatting: boolean
  chatError: string
  hasApiKey: boolean
  onBackHome: () => void
  onOpenConversation: () => void
  onBackToList: () => void
  onChangeTab: (tab: WechatTab) => void
  onPublishMoment: (text: string) => Promise<void>
  onReplyToMoment: (momentId: string, text: string) => Promise<void>
  momentError: string
  replyingMomentIds: string[]
  onSendChatMessage: (text: string) => void
  onClearChat: () => void
  onOpenSettings: () => void
}) {
  const title = activeTab === 'chats' ? (view === 'conversation' ? '敖尹' : '微信') : '朋友圈'

  return (
    <section className="wechat-shell" aria-label="微信">
      <header className="app-topbar">
        <button
          className="icon-button"
          type="button"
          aria-label={view === 'conversation' ? '返回聊天列表' : '返回桌面'}
          onClick={view === 'conversation' ? onBackToList : onBackHome}
        >
          <ArrowLeft size={21} strokeWidth={2.4} />
        </button>
        <h2>{title}</h2>
        <button className="icon-button ghost" type="button" aria-label="微信通知">
          <Bell size={19} strokeWidth={2.3} />
        </button>
      </header>

      <div className="wechat-content">
        {activeTab === 'chats' && view === 'list' ? <ChatList onOpenConversation={onOpenConversation} /> : null}
        {activeTab === 'chats' && view === 'conversation' ? (
          <ConversationShell
            messages={chatMessages}
            isChatting={isChatting}
            error={chatError}
            hasApiKey={hasApiKey}
            onSend={onSendChatMessage}
            onClear={onClearChat}
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
