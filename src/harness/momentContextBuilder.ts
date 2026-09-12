import type { ChatMessage, Moment, PersonaSettings } from '../app/types'
import { momentPostInstructions } from '../apps/wechat/momentPrompts'
import { buildAoyinSystemPrompt } from '../config/aoyinPersona'
import type { DeepSeekChatMessage } from './deepseekClient'

export function buildMomentPostMessages({
  chatMessages, moments, persona, now = new Date()
}: {
  chatMessages: ChatMessage[]
  moments: Moment[]
  persona: PersonaSettings
  now?: Date
}): DeepSeekChatMessage[] {
  // Explicitly select narrative data; never serialize app settings or credentials.
  const context = {
    localDateTime: now.toLocaleString('zh-CN', { hour12: false }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    chatOrder: '从旧到新',
    chat: chatMessages
      .filter((message) => message.content.trim() || message.location || message.redPacket)
      .map((message) => ({
        speaker: message.role === 'assistant' ? '敖尹' : persona.hunter.name,
        time: message.createdAt,
        type: message.type ?? 'text',
        text: message.content,
        location: message.location ? { place: message.location.place, note: message.location.note } : undefined,
        redPacket: message.redPacket ? { amount: message.redPacket.amount, note: message.redPacket.note } : undefined
      })),
    momentsOrder: '列表顺序，新发布内容在前；无日期的旧记录不推断具体日期',
    moments: moments.map((moment) => ({
      author: moment.author === 'aoyin' ? '敖尹' : persona.hunter.name,
      time: moment.createdAt ? new Date(moment.createdAt).toLocaleString('zh-CN', { hour12: false }) : moment.time,
      text: moment.text,
      replies: moment.replies.filter((reply) => !reply.pending).map((reply) => ({
        author: reply.author === 'aoyin' ? '敖尹' : persona.hunter.name,
        text: reply.text
      }))
    }))
  }
  return [
    { role: 'system', content: `${buildAoyinSystemPrompt(persona)}\n${momentPostInstructions}` },
    { role: 'user', content: JSON.stringify(context) }
  ]
}
