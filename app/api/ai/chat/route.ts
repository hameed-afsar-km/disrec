// app/api/ai/chat/route.ts
// AI Emergency Assistant chat endpoint — server-side only, never exposes API key
// Responses are generated in the requested language and fall back to local Ollama
// (gemma2:2b by default) when Groq is unavailable.

import { NextRequest } from 'next/server'
import { getGroqClient, GROQ_MODEL, buildEmergencySystemPrompt } from '@/lib/groq'
import { getOllamaChatCompletion } from '@/lib/ollama'
import { DEFAULT_AI_LANGUAGE } from '@/lib/ai-languages'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface IncidentContext {
  incidentId?: string
  title?: string
  description?: string
  category?: string
  severity?: string
  status?: string
  verified?: boolean
  location?: string
  peopleAffected?: number
  createdAt?: string
}

function buildIncidentContext(incident?: IncidentContext): string | null {
  if (!incident?.incidentId || !incident.title) return null

  const details = [
    `Incident ID: ${incident.incidentId}`,
    `Title: ${incident.title}`,
    `Category: ${incident.category || 'Not specified'}`,
    `Severity: ${incident.severity || 'Not specified'}`,
    `Status: ${incident.status || 'Not specified'}`,
    `Verified: ${incident.verified ? 'Yes' : 'No'}`,
    `Location: ${incident.location || 'Not specified'}`,
    `People affected: ${incident.peopleAffected ?? 'Not specified'}`,
    `Reported: ${incident.createdAt || 'Not specified'}`,
    `Narrative: ${(incident.description || 'Not provided').slice(0, 4000)}`,
  ]

  return `\n\nINCIDENT-SPECIFIC CONTEXT (use this to answer the administrator's question; do not invent missing facts):\n${details.join('\n')}`
}

export async function POST(request: NextRequest) {
  try {
    const { messages, language, incident } = (await request.json()) as {
      messages: ChatMessage[]
      language?: string
      incident?: IncidentContext
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 })
    }

    // Limit conversation history to last 20 messages to stay within token limits
    const recentMessages = messages.slice(-20)
    const systemPrompt = `${buildEmergencySystemPrompt(language || DEFAULT_AI_LANGUAGE)}${buildIncidentContext(incident) || ''}`

    let reply: string | null = null
    let provider: 'groq' | 'ollama' = 'groq'

    try {
      const groq = getGroqClient()
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
        ],
        max_tokens: 600,
        temperature: 0.7,
      })

      reply = completion.choices[0]?.message?.content ?? null
      if (!reply) {
        throw new Error('Groq returned an empty response')
      }
    } catch (groqErr) {
      console.warn('[AI Chat] Groq unavailable, falling back to Ollama:', groqErr)
      provider = 'ollama'
      reply = await getOllamaChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
        ],
        maxTokens: 600,
        temperature: 0.7,
      })
    }

    if (!reply) {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    return Response.json({ reply, provider })
  } catch (err: unknown) {
    console.error('[AI Chat Error]', err)
    const message = err instanceof Error ? err.message : 'AI service unavailable'
    return Response.json({ error: message }, { status: 500 })
  }
}
