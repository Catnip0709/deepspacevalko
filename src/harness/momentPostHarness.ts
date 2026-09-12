import type { ChatMessage, DeepSeekModel, Moment, PersonaSettings } from '../app/types'
import { streamDeepSeekCompletion } from './deepseekClient'
import { buildMomentPostMessages } from './momentContextBuilder'

export async function requestAoyinMomentPost({
  apiKey, model, chatMessages, moments, persona, signal
}: {
  apiKey: string
  model: DeepSeekModel
  chatMessages: ChatMessage[]
  moments: Moment[]
  persona: PersonaSettings
  signal?: AbortSignal
}): Promise<string> {
  if (!apiKey.trim()) throw new Error('请先到设置里填写 DeepSeek API Key。')
  const messages = buildMomentPostMessages({ chatMessages, moments, persona })
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await streamDeepSeekCompletion({
      apiKey, model, messages, signal, temperature: 0.65, onDelta: () => undefined
    })
    try {
      return parseMomentPost(raw, moments)
    } catch {
      messages.push(
        { role: 'assistant', content: raw },
        { role: 'user', content: '上次结果无效或与已有动态重复。请换一个切入点，重新输出合规JSON，text为15到80字符，topic使用规定分类。' }
      )
    }
  }
  throw new Error('敖尹这次没发出朋友圈，请再试一次。')
}

function parseMomentPost(raw: string, moments: Moment[]): string {
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response')
  const value = data as Record<string, unknown>
  if (typeof value.text !== 'string' || typeof value.topic !== 'string' ||
    !['relationship', 'daily', 'work', 'pet'].includes(value.topic)) throw new Error('Invalid fields')
  const text = value.text.trim()
  const length = Array.from(text).length
  if (length < 15 || length > 80 || /^(敖尹\s*[:：]|["“「])|```|\[\[/.test(text)) {
    throw new Error('Invalid text')
  }
  if (moments.some((moment) => moment.author === 'aoyin' && isSimilar(text, moment.text))) {
    throw new Error('Duplicate post')
  }
  return text
}

function isSimilar(a: string, b: string) {
  const normalize = (text: string) => text.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu, '').toLowerCase()
  const left = normalize(a)
  const right = normalize(b)
  if (left === right) return true
  // Character bigrams catch near-copies with a few words or punctuation changed.
  const pairs = (text: string) => {
    const characters = Array.from(text)
    return new Set(characters.slice(1).map((char, i) => characters[i] + char))
  }
  const l = pairs(left)
  const r = pairs(right)
  const intersection = [...l].filter((pair) => r.has(pair)).length
  return l.size + r.size > 0 && (2 * intersection) / (l.size + r.size) >= 0.85
}
