import type { ChatMessage } from '../app/types'

export type WechatToolName = 'send_location' | 'send_red_packet'

export type WechatToolCall =
  | {
      name: 'send_location'
      arguments: {
        place: string
        note?: string
      }
    }
  | {
      name: 'send_red_packet'
      arguments: {
        amount: string
        note?: string
      }
    }

export type AoyinChatReply = {
  reply: string
  toolCall: WechatToolCall | null
}

type WechatToolDefinition = {
  name: WechatToolName
  description: string
  parameters: Record<string, string>
  required: string[]
}

export const wechatTools: WechatToolDefinition[] = [
  {
    name: 'send_location',
    description: '敖尹向猎人小姐发送自己的定位。用户明确要求敖尹发送定位或位置时必须调用。',
    parameters: {
      place: '定位地点名称，必须具体且非空',
      note: '随定位附带的简短留言，可选'
    },
    required: ['place']
  },
  {
    name: 'send_red_packet',
    description: '敖尹向猎人小姐发送红包。用户明确要求敖尹发红包时必须调用。',
    parameters: {
      amount: '红包金额，使用大于 0 的数字字符串，最多两位小数',
      note: '红包留言，可选'
    },
    required: ['amount']
  }
]

export function buildWechatToolInstructions(requiredTool: WechatToolName | null, isRetry = false) {
  const definitions = wechatTools
    .map(
      (tool) =>
        `- ${tool.name}：${tool.description}\n  参数：${JSON.stringify(tool.parameters)}\n  必填：${tool.required.join('、')}`
    )
    .join('\n')
  const requiredInstruction = requiredTool
    ? `猎人小姐这次明确要求使用 ${requiredTool}。toolCall 不得为 null，必须调用该工具。`
    : '仅在场景自然需要时调用工具；不需要工具时 toolCall 必须为 null。'
  const retryInstruction = isRetry
    ? '上一次输出没有通过协议校验。这次必须严格遵守 JSON 格式、工具名和参数要求。'
    : ''

  return [
    '你可以使用以下微信工具：',
    definitions,
    requiredInstruction,
    retryInstruction,
    '每次只能调用一个工具。',
    '必须只输出一个合法 JSON 对象，不要使用 Markdown，不要添加 JSON 之外的文字。',
    '固定响应结构：',
    '{"reply":"给猎人小姐看的自然回复","toolCall":null}',
    '调用定位示例：',
    '{"reply":"站着别动，我的位置发你。","toolCall":{"name":"send_location","arguments":{"place":"临空市猎人协会东门","note":"我来接你"}}}',
    '调用红包示例：',
    '{"reply":"拿去买你刚才念叨的那杯。","toolCall":{"name":"send_red_packet","arguments":{"amount":"52.00","note":"给小铃兰"}}}',
    'reply 里不要提到工具、JSON、协议或调用过程，也不要写“敖尹：”。'
  ]
    .filter(Boolean)
    .join('\n')
}

export function detectRequiredWechatTool(messages: ChatMessage[]): WechatToolName | null {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')

  if (!lastUserMessage || (lastUserMessage.type ?? 'text') !== 'text') {
    return null
  }

  const text = lastUserMessage.content.trim()

  if (!text) {
    return null
  }

  if (isWechatToolRequested(text, '定位|位置')) {
    return 'send_location'
  }

  if (isWechatToolRequested(text, '红包')) {
    return 'send_red_packet'
  }

  return null
}

function isWechatToolRequested(text: string, targetPattern: string) {
  const negatedPatterns = [
    new RegExp(`(?:别|不要|不用|无需)(?:再)?(?:给我|向我)?(?:发|给|分享|传).{0,4}(?:${targetPattern})`),
    new RegExp(`(?:别|不要|不用|无需)(?:再)?(?:把)?(?:${targetPattern}).{0,4}(?:发|给|分享|传)(?:给)?我`)
  ]

  if (negatedPatterns.some((pattern) => pattern.test(text))) {
    return false
  }

  const requestPatterns = [
    new RegExp(`(?:^|[，。！？,!?\\s])(?:那)?(?:你|敖尹|小狼|oi).{0,6}(?:发|给|分享|传).{0,6}(?:${targetPattern})`, 'i'),
    new RegExp(`(?:让|叫)(?:你|敖尹|小狼|oi).{0,6}(?:发|给|分享|传).{0,6}(?:${targetPattern})`, 'i'),
    new RegExp(`(?:把)?(?:你|自己)(?:的)?(?:${targetPattern}).{0,6}(?:发|给|分享|传)(?:给)?我`),
    new RegExp(`(?:给|发|分享|传).{0,3}我.{0,4}(?:${targetPattern})`),
    new RegExp(`(?:${targetPattern}).{0,4}(?:发|给|分享|传).{0,3}我`),
    new RegExp(`(?:让|给)我(?:看看|看下|知道|确认).{0,4}(?:你|自己)(?:的)?(?:${targetPattern})`),
    new RegExp(`(?:^|[，。！？,!?\\s])(?:请|麻烦|能不能|可以)?(?:发|分享|传)(?:一个|个|下)?(?:你(?:的)?|自己(?:的)?)?(?:${targetPattern})`)
  ]

  return requestPatterns.some((pattern) => pattern.test(text))
}

export function parseWechatToolResponse(rawText: string, requiredTool: WechatToolName | null): AoyinChatReply {
  const payload = parseJsonObject(rawText)
  const reply = readNonEmptyString(payload.reply)
  const rawToolCall = payload.toolCall

  if (rawToolCall === null || rawToolCall === undefined) {
    if (requiredTool) {
      throw new Error(`模型没有调用必需工具 ${requiredTool}`)
    }

    return {
      reply,
      toolCall: null
    }
  }

  if (!isRecord(rawToolCall)) {
    throw new Error('toolCall 必须是对象或 null')
  }

  const name = rawToolCall.name

  if (name !== 'send_location' && name !== 'send_red_packet') {
    throw new Error('模型返回了未知微信工具')
  }

  if (requiredTool && name !== requiredTool) {
    throw new Error(`模型没有调用必需工具 ${requiredTool}`)
  }

  if (!isRecord(rawToolCall.arguments)) {
    throw new Error('工具 arguments 必须是对象')
  }

  if (name === 'send_location') {
    return {
      reply,
      toolCall: {
        name,
        arguments: {
          place: readNonEmptyString(rawToolCall.arguments.place),
          note: readOptionalString(rawToolCall.arguments.note)
        }
      }
    }
  }

  const amount = readNonEmptyString(rawToolCall.arguments.amount)

  if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    throw new Error('红包金额必须是大于 0 且最多两位小数的数字')
  }

  return {
    reply,
    toolCall: {
      name,
      arguments: {
        amount,
        note: readOptionalString(rawToolCall.arguments.note)
      }
    }
  }
}

export function aoyinReplyToMessagePatch(reply: AoyinChatReply): Partial<ChatMessage> {
  if (reply.toolCall?.name === 'send_location') {
    return {
      type: 'location',
      content: reply.reply,
      location: reply.toolCall.arguments,
      redPacket: undefined
    }
  }

  if (reply.toolCall?.name === 'send_red_packet') {
    return {
      type: 'redPacket',
      content: reply.reply,
      redPacket: {
        amount: reply.toolCall.arguments.amount,
        note: reply.toolCall.arguments.note || '给小铃兰的红包'
      },
      location: undefined
    }
  }

  return {
    type: 'text',
    content: reply.reply,
    location: undefined,
    redPacket: undefined
  }
}

function parseJsonObject(rawText: string): Record<string, unknown> {
  const normalized = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = normalized.indexOf('{')
  const end = normalized.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('模型没有返回 JSON 对象')
  }

  const parsed: unknown = JSON.parse(normalized.slice(start, end + 1))

  if (!isRecord(parsed)) {
    throw new Error('模型响应必须是 JSON 对象')
  }

  return parsed
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('工具响应缺少必填文本字段')
  }

  return value.trim()
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
