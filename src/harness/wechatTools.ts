import type { ChatMessage, PersonaSettings } from '../app/types'
import { fixedAoyinProfile } from '../config/aoyinPersona'
import type { DeepSeekStrictTool } from './deepseekClient'

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

export class WechatProtocolError extends Error {
  constructor(
    public readonly code: 'json' | 'reply' | 'tool' | 'arguments' | 'missing_tool',
    public readonly repairMessage: string
  ) {
    super({
      json: '回复格式暂时异常，请再试一次。',
      reply: '敖尹这次没有发来内容，请再试一次。',
      tool: '这次附带的定位或红包没能发送，请再试一次。',
      arguments: '这次附带的定位或红包内容不完整，请再试一次。',
      missing_tool: '这次定位或红包没有发出，请再试一次。'
    }[code])
  }
}

export function buildWechatResponseTool(
  requiredTool: WechatToolName | null,
  persona: PersonaSettings
): DeepSeekStrictTool {
  const hunterName = persona.hunter.name
  const hunterNickname = persona.hunter.nicknameFromAoyin || hunterName
  const noneAction = strictObject({
    type: {
      type: 'string',
      enum: ['none'],
      description: '只发送普通文字消息，不附带卡片。'
    }
  })
  const locationAction = strictObject({
    type: {
      type: 'string',
      enum: ['location'],
      description: '发送定位卡片。'
    },
    place: {
      type: 'string',
      description: '具体且非空的定位地点名称。'
    },
    note: {
      type: 'string',
      description: '定位卡片留言；不需要留言时使用空字符串。'
    }
  })
  const redPacketAction = strictObject({
    type: {
      type: 'string',
      enum: ['red_packet'],
      description: '发送红包卡片。'
    },
    amount: {
      type: 'string',
      pattern: '^(?:0\\.(?:0[1-9]|[1-9]\\d?)|[1-9]\\d*(?:\\.\\d{1,2})?)$',
      description: '大于0、最多两位小数的数字字符串，例如52.00。'
    },
    note: {
      type: 'string',
      description: `红包留言；不需要时使用“给${hunterNickname}”。`
    }
  })
  const action = requiredTool === 'send_location'
    ? locationAction
    : requiredTool === 'send_red_packet'
      ? redPacketAction
      : { anyOf: [noneAction, locationAction, redPacketAction] }

  return {
    type: 'function',
    function: {
      name: 'deliver_wechat_response',
      strict: true,
      description: [
        `提交${fixedAoyinProfile.name}给${hunterName}的本轮微信回复。`,
        '必须调用且只能调用一次。',
        'reply 是自然聊天正文，不得提到函数、协议或调用过程，也不要添加说话人前缀。',
        requiredTool === 'send_location'
          ? '对方明确索要定位，本轮必须发送 location。'
          : requiredTool === 'send_red_packet'
            ? '对方明确索要红包，本轮必须发送 red_packet。'
            : '仅在上下文自然需要时附带定位或红包，否则使用 none。'
      ].join(''),
      parameters: strictObject({
        reply: {
          type: 'string',
          description: '自然、可独立理解的微信回复。发送卡片时可以为空字符串，否则必须有内容。'
        },
        action
      })
    }
  }
}

function strictObject(properties: Record<string, unknown>) {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false
  }
}

export function detectRequiredWechatTool(
  messages: ChatMessage[],
  persona: PersonaSettings
): WechatToolName | null {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')

  if (!lastUserMessage || (lastUserMessage.type ?? 'text') !== 'text') {
    return null
  }

  const text = lastUserMessage.content.trim()

  if (!text) {
    return null
  }

  const aliases = persona.aoyin.aliases
    .split(/[、,，/\s]+/)
    .map((alias) => alias.trim())
    .filter(Boolean)
  const assistantPattern = [fixedAoyinProfile.name, fixedAoyinProfile.englishName, '小狼', 'oi', ...aliases]
    .map(escapeRegExp)
    .join('|')

  if (isWechatToolRequested(text, '定位|位置', assistantPattern)) {
    return 'send_location'
  }

  if (isWechatToolRequested(text, '红包', assistantPattern)) {
    return 'send_red_packet'
  }

  return null
}

function isWechatToolRequested(text: string, targetPattern: string, assistantPattern: string) {
  const negatedPatterns = [
    new RegExp(`(?:别|不要|不用|无需)(?:再)?(?:给我|向我)?(?:发|给|分享|传).{0,4}(?:${targetPattern})`),
    new RegExp(`(?:别|不要|不用|无需)(?:再)?(?:把)?(?:${targetPattern}).{0,4}(?:发|给|分享|传)(?:给)?我`)
  ]

  if (negatedPatterns.some((pattern) => pattern.test(text))) {
    return false
  }

  const requestPatterns = [
    new RegExp(`(?:^|[，。！？,!?\\s])(?:那)?(?:你|${assistantPattern}).{0,6}(?:发|给|分享|传).{0,6}(?:${targetPattern})`, 'i'),
    new RegExp(`(?:让|叫)(?:你|${assistantPattern}).{0,6}(?:发|给|分享|传).{0,6}(?:${targetPattern})`, 'i'),
    new RegExp(`(?:把)?(?:你|自己)(?:的)?(?:${targetPattern}).{0,6}(?:发|给|分享|传)(?:给)?我`),
    new RegExp(`(?:给|发|分享|传).{0,3}我.{0,4}(?:${targetPattern})`),
    new RegExp(`(?:${targetPattern}).{0,4}(?:发|给|分享|传).{0,3}我`),
    new RegExp(`(?:让|给)我(?:看看|看下|知道|确认).{0,4}(?:你|自己)(?:的)?(?:${targetPattern})`),
    new RegExp(`(?:^|[，。！？,!?\\s])(?:请|麻烦|能不能|可以)?(?:发|分享|传)(?:一个|个|下)?(?:你(?:的)?|自己(?:的)?)?(?:${targetPattern})`)
  ]

  return requestPatterns.some((pattern) => pattern.test(text))
}

export function parseWechatResponseArguments(
  value: unknown,
  requiredTool: WechatToolName | null
): AoyinChatReply {
  if (!isRecord(value)) {
    throw new WechatProtocolError('json', '函数参数必须是一个对象。')
  }
  if (typeof value.reply !== 'string') {
    throw new WechatProtocolError('reply', 'reply 必须是字符串。')
  }
  if (!isRecord(value.action) || typeof value.action.type !== 'string') {
    throw new WechatProtocolError('tool', 'action 必须是有效的微信动作。')
  }

  const reply = value.reply.trim()
  const action = value.action
  if (action.type === 'none') {
    if (requiredTool) {
      throw new WechatProtocolError('missing_tool', `本轮必须执行 ${requiredTool}。`)
    }
    if (!reply) {
      throw new WechatProtocolError('reply', '普通聊天的 reply 不能为空。')
    }
    return { reply, toolCall: null }
  }

  if (action.type === 'location') {
    if (requiredTool === 'send_red_packet') {
      throw new WechatProtocolError('missing_tool', '本轮必须发送红包。')
    }
    return {
      reply,
      toolCall: {
        name: 'send_location',
        arguments: {
          place: readNonEmptyString(action.place),
          note: readOptionalString(action.note)
        }
      }
    }
  }

  if (action.type === 'red_packet') {
    if (requiredTool === 'send_location') {
      throw new WechatProtocolError('missing_tool', '本轮必须发送定位。')
    }
    const amount = readNonEmptyString(action.amount)
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new WechatProtocolError('arguments', '红包金额必须大于0且最多两位小数。')
    }
    return {
      reply,
      toolCall: {
        name: 'send_red_packet',
        arguments: {
          amount,
          note: readOptionalString(action.note)
        }
      }
    }
  }

  throw new WechatProtocolError('tool', '未知的微信动作。')
}

export function aoyinReplyToMessagePatch(
  reply: AoyinChatReply,
  hunterNickname: string
): Partial<ChatMessage> {
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
        note: reply.toolCall.arguments.note || `给${hunterNickname}`
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new WechatProtocolError('arguments', '必填文本参数缺失或为空，请检查 place/amount。')
  }

  return value.trim()
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
