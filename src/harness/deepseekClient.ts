export type DeepSeekChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type StreamDeepSeekOptions = {
  apiKey: string
  model: string
  messages: DeepSeekChatMessage[]
  signal?: AbortSignal
  onDelta: (delta: string) => void
}

export async function streamDeepSeekCompletion({
  apiKey,
  model,
  messages,
  signal,
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
      temperature: 0.85
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

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed.startsWith('data:')) {
        continue
      }

      const payload = trimmed.slice(5).trim()

      if (!payload || payload === '[DONE]') {
        continue
      }

      try {
        const data = JSON.parse(payload) as {
          choices?: Array<{
            delta?: {
              content?: string
            }
          }>
        }
        const delta = data.choices?.[0]?.delta?.content ?? ''

        if (delta) {
          fullText += delta
          onDelta(delta)
        }
      } catch {
        // Ignore malformed SSE fragments and continue reading the stream.
      }
    }
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
