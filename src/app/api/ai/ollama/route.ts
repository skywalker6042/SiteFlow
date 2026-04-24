import { NextRequest, NextResponse } from 'next/server'
import { chatWithOllama, checkOllamaHealth, getOllamaConfig } from '@/lib/ollama'

type PromptBody = {
  prompt?: string
  system?: string
  model?: string
}

export async function GET() {
  try {
    await checkOllamaHealth()
    const config = getOllamaConfig()
    return NextResponse.json({
      ok: true,
      provider: 'ollama',
      baseUrl: config.baseUrl,
      model: config.model,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      provider: 'ollama',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PromptBody
    const prompt = body.prompt?.trim()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
    }

    const system = body.system?.trim() || 'You are a concise assistant for a construction business app.'
    const output = await chatWithOllama([
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ], { model: body.model })

    return NextResponse.json({
      ok: true,
      provider: 'ollama',
      model: body.model ?? getOllamaConfig().model,
      output,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
