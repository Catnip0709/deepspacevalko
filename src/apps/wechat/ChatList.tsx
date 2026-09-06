import { ChevronRight } from 'lucide-react'
import { AoyinAvatar } from '../../components/avatars'

export function ChatList({ onOpenConversation }: { onOpenConversation: () => void }) {
  return (
    <section className="chat-list" aria-label="聊天列表">
      <button className="contact-row" type="button" onClick={onOpenConversation} aria-label="打开与敖尹的聊天">
        <AoyinAvatar />
        <span className="contact-main">
          <span className="contact-title">敖尹</span>
          <span className="contact-preview">别总是一个人冲在最前面。</span>
        </span>
        <span className="contact-meta">
          <span>刚刚</span>
          <ChevronRight size={18} strokeWidth={2.3} />
        </span>
      </button>
    </section>
  )
}
