import type { ChatMessage, MomentAuthor } from '../app/types'
import { aoyinPersona } from '../config/aoyinPersona'
import type { DeepSeekChatMessage } from './deepseekClient'

export function buildDeepSeekMessages(chatMessages: ChatMessage[]): DeepSeekChatMessage[] {
  const recentMessages = chatMessages.slice(-12).map((message) => ({
    role: message.role,
    content: message.content
  }))

  return [
    {
      role: 'system',
      content: aoyinPersona.systemPrompt
    },
    ...recentMessages
  ]
}

export function buildMomentReplyMessages({
  sourceAuthor,
  sourceText,
  hunterComment
}: {
  sourceAuthor: MomentAuthor
  sourceText: string
  hunterComment?: string
}): DeepSeekChatMessage[] {
  const scene =
    sourceAuthor === 'hunter'
      ? `猎人小姐刚刚发了一条朋友圈：“${sourceText}”。`
      : `敖尹之前发了一条朋友圈：“${sourceText}”。猎人小姐评论：“${hunterComment ?? ''}”。`

  return [
    {
      role: 'system',
      content: [
        aoyinPersona.systemPrompt,
        '当前场景是微信朋友圈评论区，不是私聊。',
        '请只生成敖尹对猎人小姐的一条朋友圈回复。',
        '回复要根据她发的内容或评论内容自然回应，不要泛泛而谈。',
        '长度控制在 8 到 36 个中文字符之间，像真实朋友圈评论。',
        '不要加引号，不要写“敖尹：”，不要解释。'
      ].join('\n')
    },
    {
      role: 'user',
      content: scene
    }
  ]
}
