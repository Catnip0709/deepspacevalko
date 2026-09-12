import type { ChatMessage, MomentAuthor, PersonaSettings } from '../app/types'
import { buildAoyinSystemPrompt, fixedAoyinProfile } from '../config/aoyinPersona'
import type { DeepSeekChatMessage } from './deepseekClient'
import type { WechatToolName } from './wechatTools'

export function buildDeepSeekMessages(
  chatMessages: ChatMessage[],
  persona: PersonaSettings,
  options?: {
    requiredTool?: WechatToolName | null
  }
): DeepSeekChatMessage[] {
  const conversationMessages = chatMessages.map((message) => ({
    role: message.role,
    content: formatChatMessageForModel(message, persona)
  }))

  return [
    {
      role: 'system',
      content: [
        buildAoyinSystemPrompt(persona),
        '当前场景是微信私聊。',
        `如果${persona.hunter.name}发送定位，请结合她的位置、留言和上下文自然回应。`,
        `如果${persona.hunter.name}发送红包，你可以根据金额、留言、关系和上下文决定收下或拒收，并用回复说明决定。`,
        options?.requiredTool === 'send_location'
          ? `${persona.hunter.name}本轮明确索要定位，必须通过响应函数附带定位。`
          : options?.requiredTool === 'send_red_packet'
            ? `${persona.hunter.name}本轮明确索要红包，必须通过响应函数附带红包。`
            : '仅在上下文自然需要时附带定位或红包，否则只回复文字。'
      ].join('\n')
    },
    ...conversationMessages
  ]
}

function formatChatMessageForModel(message: ChatMessage, persona: PersonaSettings) {
  const hunterName = persona.hunter.name

  if (message.role === 'assistant') {
    if (message.type === 'location' && message.location) {
      const note = message.location.note ? `，留言：${message.location.note}` : ''
      return `${message.content}\n[${fixedAoyinProfile.name}已发送定位：${message.location.place}${note}]`
    }
    if (message.type === 'redPacket' && message.redPacket) {
      const note = message.redPacket.note ? `，留言：${message.redPacket.note}` : ''
      return `${message.content}\n[${fixedAoyinProfile.name}已发送红包：${message.redPacket.amount}元${note}]`
    }
    return message.content
  }

  if (message.type === 'location' && message.location) {
    const note = message.location.note ? `留言：${message.location.note}。` : ''
    const action = `${hunterName}发送了定位：${message.location.place}。`
    return `${action}${note}${message.content}`
  }

  if (message.type === 'redPacket' && message.redPacket) {
    const action = `${hunterName}发送了红包：${message.redPacket.amount}元。`
    const note = message.redPacket.note ? `留言：${message.redPacket.note}。` : ''
    return `${action}${note}${message.content}`
  }

  return message.content
}

export function buildMomentReplyMessages({
  sourceAuthor,
  sourceText,
  hunterComment,
  persona
}: {
  sourceAuthor: MomentAuthor
  sourceText: string
  hunterComment?: string
  persona: PersonaSettings
}): DeepSeekChatMessage[] {
  const hunterName = persona.hunter.name
  const scene =
    sourceAuthor === 'hunter'
      ? `${hunterName}发了一条朋友圈：“${sourceText}”。${hunterComment ? `她补充评论：“${hunterComment}”。请回应这条补充。` : ''}`
      : `${fixedAoyinProfile.name}之前发了一条朋友圈：“${sourceText}”。${hunterName}评论：“${hunterComment ?? ''}”。`

  return [
    {
      role: 'system',
      content: [
        buildAoyinSystemPrompt(persona),
        '当前场景是微信朋友圈评论区，不是私聊。',
        `请只生成${fixedAoyinProfile.name}对${hunterName}的一条朋友圈回复。`,
        '回复要根据她发的内容或评论内容自然回应，不要泛泛而谈。',
        '长度控制在 8 到 36 个中文字符之间，像真实朋友圈评论。',
        `不要加引号，不要写“${fixedAoyinProfile.name}：”，不要解释。`
      ].join('\n')
    },
    {
      role: 'user',
      content: scene
    }
  ]
}
