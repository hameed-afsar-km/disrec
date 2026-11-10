// app/api/ai/classify/route.ts
// Classifies emergency severity based on incident description

import { NextRequest } from 'next/server'
import { getGroqClient, GROQ_MODEL } from '@/lib/groq'
import type { Severity, EmergencyCategory } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, peopleAffected } = await request.json()

    if (!description) {
      return Response.json({ error: 'description is required' }, { status: 400 })
    }

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an emergency severity classifier. Analyze emergency incident reports and classify their severity.

Severity levels:
- LOW: Minor incident with minimal risk, no immediate threat to life
- MEDIUM: Moderate risk, requires attention but not life-threatening
- HIGH: Significant risk, potential for serious injury or property damage
- CRITICAL: Immediate life threat, mass casualties possible, requires urgent response

Respond ONLY with valid JSON in this exact format:
{
  "severity": "low" | "medium" | "high" | "critical",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation of why this severity was assigned (1-2 sentences)"
}`,
        },
        {
          role: 'user',
          content: `Classify this emergency:
Title: ${title || 'N/A'}
Category: ${category || 'other'}
People affected: ${peopleAffected || 'unknown'}
Description: ${description}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return Response.json({ error: 'No classification returned' }, { status: 500 })
    }

    const parsed = JSON.parse(content) as {
      severity: Severity
      confidence: number
      reason: string
    }

    // Validate the response
    const validSeverities: Severity[] = ['low', 'medium', 'high', 'critical']
    if (!validSeverities.includes(parsed.severity)) {
      return Response.json({ error: 'Invalid severity returned by AI' }, { status: 500 })
    }

    return Response.json(parsed)
  } catch (err: unknown) {
    console.error('[AI Classify Error]', err)
    return Response.json({ error: 'Classification failed' }, { status: 500 })
  }
}

