import type { ChatMessage, DeepSeekModel, MomentAuthor } from '../app/types'
import { streamDeepSeekCompletion } from './deepseekClient'
import { buildDeepSeekMessages, buildMomentReplyMessages } from './messageBuilders'

export function streamAoyinChatReply({
  apiKey,
  model,
  chatMessages,
  onDelta
}: {
  apiKey: string
  model: DeepSeekModel
  chatMessages: ChatMessage[]
  onDelta: (delta: string) => void
}) {
  return streamDeepSeekCompletion({
    apiKey,
    model,
    messages: buildDeepSeekMessages(chatMessages),
    onDelta
  })
}

export function streamAoyinMomentReply({
  apiKey,
  model,
  sourceAuthor,
  sourceText,
  hunterComment,
  onDelta
}: {
  apiKey: string
  model: DeepSeekModel
  sourceAuthor: MomentAuthor
  sourceText: string
  hunterComment?: string
  onDelta: (delta: string) => void
}) {
  return streamDeepSeekCompletion({
    apiKey,
    model,
    messages: buildMomentReplyMessages({
      sourceAuthor,
      sourceText,
      hunterComment
    }),
    onDelta
  })
}
