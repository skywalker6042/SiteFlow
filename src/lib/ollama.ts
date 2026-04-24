type OllamaMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type OllamaChatResponse = {
  message?: {
    role?: string
    content?: string
  }
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'

export function getOllamaConfig() {
  return {
    baseUrl: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
  }
}

export async function chatWithOllama(messages: OllamaMessage[], options?: { model?: string; temperature?: number }) {
  const model = options?.model ?? OLLAMA_MODEL

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages,
      options: {
        temperature: options?.temperature ?? 0.2,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Ollama request failed (${response.status}): ${text || response.statusText}`)
  }

  const data = await response.json() as OllamaChatResponse
  return data.message?.content?.trim() ?? ''
}

export async function checkOllamaHealth() {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Ollama health check failed (${response.status})`)
  }

  return response.json()
}
