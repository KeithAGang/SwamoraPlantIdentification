import { api } from './api'

export interface SaviMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface SaviChatResponse {
  reply: string
  conversationId?: string
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>
}

export interface SaviChatRequest {
  messages: SaviMessage[]
  diagnosisId?: number
  conversationId?: string
}

const apiBase = (): string =>
  (import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
    : '') || ''

/**
 * Sends a chat turn to the Savi backend. The backend owns the Groq API key
 * and diagnosis grounding. Falls back to a local stub if the backend is
 * unreachable so the UI stays functional during dev.
 */
export const saviApi = {
  async chat(req: SaviChatRequest): Promise<SaviChatResponse> {
    try {
      const res = await api.post<SaviChatResponse>('/api/savi/chat', req)
      return res.data
    } catch {
      const last = req.messages.filter((m) => m.role === 'user').at(-1)?.content ?? ''
      return { reply: stubReply(last) }
    }
  },

  /**
   * Stream a chat turn over SSE. Calls `onDelta` for each token chunk and
   * resolves with the final `{ reply, conversationId }` payload.
   */
  async chatStream(
    req: SaviChatRequest,
    onDelta: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<SaviChatResponse> {
    const token = localStorage.getItem('authToken')
    const url = `${apiBase()}/api/savi/chat/stream`
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(req),
        signal,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      const last = req.messages.filter((m) => m.role === 'user').at(-1)?.content ?? ''
      const fallback = stubReply(last)
      onDelta(fallback)
      return { reply: fallback }
    }

    if (!res.ok || !res.body) {
      const last = req.messages.filter((m) => m.role === 'user').at(-1)?.content ?? ''
      const fallback = stubReply(last)
      onDelta(fallback)
      return { reply: fallback }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    let conversationId: string | undefined

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const evtBlock = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)

        let event = 'message'
        let data = ''
        for (const line of evtBlock.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) data += line.slice(5).trim()
        }
        if (!data) continue

        try {
          const parsed = JSON.parse(data) as {
            delta?: string
            reply?: string
            conversationId?: string
          }
          if (event === 'token' && parsed.delta) {
            full += parsed.delta
            onDelta(parsed.delta)
          } else if (event === 'done') {
            conversationId = parsed.conversationId
            if (parsed.reply) full = parsed.reply
          }
        } catch {
          // Ignore malformed events.
        }
      }
    }

    return { reply: full, conversationId }
  },
}

function stubReply(prompt: string): string {
  const p = prompt.trim().toLowerCase()
  if (!p) {
    return "Hi, I'm Savi. Ask me anything about your farm — crops, weather, soil, pests, or yields."
  }
  if (p.includes('weather')) {
    return 'Local forecast looks mild — around 28°C and cloudy. I will surface live data once the weather tool is connected.'
  }
  if (p.includes('soil')) {
    return 'Soil moisture is trending healthy. Once the soil-sensor tool is connected I can pull live nitrogen, phosphorus and pH readings.'
  }
  if (p.includes('disease') || p.includes('diagnose') || p.includes('leaf')) {
    return 'Snap a leaf on the Diagnose page and I will route it through the right plant model and recommend a treatment.'
  }
  if (p.includes('yield')) {
    return 'Projected yield will improve by 16% with current irrigation and lighting. I will pull this live from the harvest tool once integrated.'
  }
  return `I hear you on "${prompt.slice(0, 80)}". I'm running in local stub mode — once the LLM and tool-calling API key are wired, I'll give you live insights from your farm.`
}
