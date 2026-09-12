import type { ChatMessage, DeepSeekModel, MomentAuthor, PersonaSettings } from '../app/types'
import { DeepSeekStreamError, requestDeepSeekToolCall, streamDeepSeekCompletion } from './deepseekClient'
import { buildDeepSeekMessages, buildMomentReplyMessages } from './messageBuilders'
import {
  buildWechatResponseTool,
  detectRequiredWechatTool,
  parseWechatResponseArguments,
  WechatProtocolError,
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
  if (!apiKey.trim()) throw new Error('请先到设置里填写 DeepSeek API Key。')
  const requiredTool = detectRequiredWechatTool(chatMessages, persona)
  const messages = buildDeepSeekMessages(chatMessages, persona, { requiredTool })
  const tool = buildWechatResponseTool(requiredTool, persona)
  let lastError: Error = new Error('回复没有完整接收，请再试一次。')
  let maxTokens = 1024

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)
    try {
      const args = await requestDeepSeekToolCall({
        apiKey,
        model,
        messages,
        tool,
        maxTokens,
        thinking: 'disabled',
        signal: controller.signal,
        temperature: 0.45
      })
      return parseWechatResponseArguments(args, requiredTool)
    } catch (error) {
      if (controller.signal.aborted) throw new Error('回复等待超时，请再试一次。')
      if (!(error instanceof WechatProtocolError) && !(error instanceof DeepSeekStreamError)) throw error
      lastError = error
      const repair = error instanceof WechatProtocolError
        ? error.repairMessage
        : error.code === 'truncated'
          ? '上次回复达到长度上限，请显著缩短回复。'
          : '上次没有完整调用响应函数，请重新调用。'
      if (error instanceof DeepSeekStreamError && error.code === 'truncated') maxTokens = 2048
      if (attempt === 0) {
        messages.push({
          role: 'user',
          content: `上一次结果未发布：${repair}请重新调用 deliver_wechat_response。`
        })
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError
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
