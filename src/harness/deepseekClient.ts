export type DeepSeekChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type DeepSeekStrictTool = {
  type: 'function'
  function: {
    name: string
    description: string
    strict: true
    parameters: Record<string, unknown>
  }
}

type RequestDeepSeekToolOptions = {
  apiKey: string
  model: string
  messages: DeepSeekChatMessage[]
  tool: DeepSeekStrictTool
  signal?: AbortSignal
  temperature?: number
  maxTokens?: number
  thinking?: 'enabled' | 'disabled'
}

type StreamDeepSeekOptions = {
  apiKey: string
  model: string
  messages: DeepSeekChatMessage[]
  signal?: AbortSignal
  temperature?: number
  jsonMode?: boolean
  maxTokens?: number
  thinking?: 'enabled' | 'disabled'
  requireComplete?: boolean
  onDelta: (delta: string) => void
}

export class DeepSeekStreamError extends Error {
  constructor(
    public readonly code: 'truncated' | 'invalid_stream' | 'empty' | 'incomplete',
    public readonly partialText: string
  ) {
    super({
      truncated: '回复过长，未能完整生成，请再试一次。',
      invalid_stream: '回复传输异常，请再试一次。',
      empty: '敖尹这次没有发来内容，请再试一次。',
      incomplete: '回复没有完整接收，请再试一次。'
    }[code])
  }
}

export async function requestDeepSeekToolCall({
  apiKey,
  model,
  messages,
  tool,
  signal,
  temperature = 0.45,
  maxTokens = 1024,
  thinking = 'disabled'
}: RequestDeepSeekToolOptions): Promise<unknown> {
  const response = await fetch('https://api.deepseek.com/beta/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature,
      max_tokens: maxTokens,
      thinking: { type: thinking },
      tools: [tool],
      tool_choice: {
        type: 'function',
        function: { name: tool.function.name }
      }
    })
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(normalizeDeepSeekError(response.status, detail))
  }

  let data: {
    choices?: Array<{
      finish_reason?: string | null
      message?: {
        tool_calls?: Array<{
          type?: string
          function?: { name?: string; arguments?: string }
        }>
      }
    }>
  }
  try {
    data = await response.json()
  } catch {
    throw new DeepSeekStreamError('invalid_stream', '')
  }

  const choice = data.choices?.[0]
  if (choice?.finish_reason === 'length') {
    throw new DeepSeekStreamError('truncated', '')
  }

  const calls = choice?.message?.tool_calls
  const call = calls?.[0]
  if (
    !Array.isArray(calls) ||
    calls.length !== 1 ||
    call?.type !== 'function' ||
    call.function?.name !== tool.function.name ||
    typeof call.function.arguments !== 'string'
  ) {
    throw new DeepSeekStreamError('empty', '')
  }

  try {
    return JSON.parse(call.function.arguments)
  } catch {
    throw new DeepSeekStreamError('invalid_stream', call.function.arguments)
  }
}

export async function streamDeepSeekCompletion({
  apiKey,
  model,
  messages,
  signal,
  temperature = 0.85,
  jsonMode = false,
  maxTokens,
  thinking,
  requireComplete = false,
  onDelta
}: StreamDeepSeekOptions) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
      ...(thinking ? { thinking: { type: thinking } } : {})
    })
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(normalizeDeepSeekError(response.status, detail))
  }

  if (!response.body) {
    throw new Error('DeepSeek 没有返回可读取的响应流。')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let finishReason: string | undefined
  let sawDone = false

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload) return
    if (payload === '[DONE]') {
      sawDone = true
      return
    }
    let data: {
      error?: unknown
      choices?: Array<{ index?: number; finish_reason?: string | null; delta?: { content?: string | null } }>
    }
    try {
      data = JSON.parse(payload)
      if (!data || typeof data !== 'object' || data.error || (data.choices !== undefined && !Array.isArray(data.choices))) {
        throw new Error('Invalid SSE event')
      }
    } catch {
      throw new DeepSeekStreamError('invalid_stream', fullText)
    }
    const choice = data.choices?.find((item) => item?.index === 0 || item?.index === undefined)
    if (choice?.finish_reason) finishReason = choice.finish_reason
    const delta = choice?.delta?.content
    if (delta !== undefined && delta !== null && typeof delta !== 'string') {
      throw new DeepSeekStreamError('invalid_stream', fullText)
    }
    if (delta) {
      fullText += delta
      // Callback failures are application errors, not malformed stream fragments.
      onDelta(delta)
    }
  }

  try {
    while (!sawDone) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        consumeLine(line)
        if (sawDone) break
      }
      if (done) {
        if (!sawDone && buffer.trim()) consumeLine(buffer)
        break
      }
    }
    if (finishReason === 'length') throw new DeepSeekStreamError('truncated', fullText)
    if (requireComplete && finishReason && finishReason !== 'stop') {
      throw new DeepSeekStreamError('incomplete', fullText)
    }
    if (requireComplete && !sawDone && finishReason !== 'stop') {
      throw new DeepSeekStreamError('incomplete', fullText)
    }
    if (requireComplete && !fullText.trim()) throw new DeepSeekStreamError('empty', fullText)
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
  return fullText
}

function normalizeDeepSeekError(status: number, detail: string) {
  if (status === 401) {
    return 'DeepSeek API Key 无效或已过期，请到设置里重新填写。'
  }

  if (status === 429) {
    return 'DeepSeek 当前限流了，稍后再试。'
  }

  if (status >= 500) {
    return 'DeepSeek 服务暂时不可用，稍后再试。'
  }

  return `DeepSeek 请求失败（${status}）${detail ? `：${detail.slice(0, 120)}` : ''}`
}
