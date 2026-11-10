// lib/ollama.ts
// Server-side only Ollama client — used as a fallback when Groq is unavailable.

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b'

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaChatOptions {
  messages: OllamaMessage[]
  maxTokens?: number
  temperature?: number
  json?: boolean
}

export async function getOllamaChatCompletion({
  messages,
  maxTokens = 600,
  temperature = 0.7,
  json = false,
}: OllamaChatOptions): Promise<string> {
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS) || 120000
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        ...(json ? { format: 'json' } : {}),
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    })

    if (!res.ok) {
      throw new Error(`Ollama request failed with status ${res.status}`)
    }

    const data = (await res.json()) as { message?: { content?: string } }
    const content = data.message?.content
    if (!content) {
      throw new Error('Ollama returned an empty response')
    }
    return content
  } finally {
    clearTimeout(timeout)
  }
}
