import type { ChatMessage, DeepSeekModel, MomentAuthor, PersonaSettings } from '../app/types'
import { streamDeepSeekCompletion } from './deepseekClient'
import { buildDeepSeekMessages, buildMomentReplyMessages } from './messageBuilders'
import {
  detectRequiredWechatTool,
  parseWechatToolResponse,
  type AoyinChatReply
} from './wechatTools'

export async function requestAoyinChatReply({
  apiKey,
  model,
  chatMessages,
  persona
}: {
  apiKey: string
  model: DeepSeekModel
  chatMessages: ChatMessage[]
  persona: PersonaSettings
}): Promise<AoyinChatReply> {
  const requiredTool = detectRequiredWechatTool(chatMessages, persona)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rawText = await streamDeepSeekCompletion({
      apiKey,
      model,
      messages: buildDeepSeekMessages(chatMessages, persona, {
        requiredTool,
        isToolRetry: attempt > 0
      }),
      temperature: 0.45,
      onDelta: () => undefined
    })

    try {
      return parseWechatToolResponse(rawText, requiredTool)
    } catch {
      // Retry once with a stricter protocol reminder.
    }
  }

  throw new Error('敖尹这次没有回应，请再试一次。')
}

export function streamAoyinMomentReply({
  apiKey,
  model,
  sourceAuthor,
  sourceText,
  hunterComment,
  persona,
  onDelta
}: {
  apiKey: string
  model: DeepSeekModel
  sourceAuthor: MomentAuthor
  sourceText: string
  hunterComment?: string
  persona: PersonaSettings
  onDelta: (delta: string) => void
}) {
  return streamDeepSeekCompletion({
    apiKey,
    model,
    messages: buildMomentReplyMessages({
      sourceAuthor,
      sourceText,
      hunterComment,
      persona
    }),
    onDelta
  })
}
