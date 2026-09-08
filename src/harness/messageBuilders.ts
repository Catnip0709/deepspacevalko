import type { ChatMessage, MomentAuthor } from '../app/types'
import { aoyinPersona } from '../config/aoyinPersona'
import type { DeepSeekChatMessage } from './deepseekClient'

export function buildDeepSeekMessages(chatMessages: ChatMessage[]): DeepSeekChatMessage[] {
  const recentMessages = chatMessages.slice(-12).map((message) => ({
    role: message.role,
    content: formatChatMessageForModel(message)
  }))

  return [
    {
      role: 'system',
      content: [
        aoyinPersona.systemPrompt,
        '当前场景是微信私聊。',
        '如果猎人小姐发送定位，请自然回应她当前所在位置。',
        '如果猎人小姐发送红包，你可以根据关系和场景决定收下或拒收，并用回复说明决定。',
        '你也可以主动给猎人小姐发送定位或红包。',
        '如需发送定位，只输出一条回复，并在末尾单独追加：[[LOCATION:地点名称]]。',
        '如需发送红包，只输出一条回复，并在末尾单独追加：[[RED_PACKET:金额|留言]]。',
        '不要解释这些标记，不要写“敖尹：”。'
      ].join('\n')
    },
    ...recentMessages
  ]
}

function formatChatMessageForModel(message: ChatMessage) {
  if (message.type === 'location' && message.location) {
    return `${message.role === 'user' ? '猎人小姐' : '敖尹'}发送了定位：${message.location.place}。${message.content}`
  }

  if (message.type === 'redPacket' && message.redPacket) {
    const sender = message.role === 'user' ? '猎人小姐' : '敖尹'
    return `${sender}发送了红包：${message.redPacket.amount}元。${message.redPacket.note ?? message.content}`
  }

  return message.content
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
