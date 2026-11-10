// app/api/ai/summarize/route.ts
// Summarizes an incident for admin review

import { NextRequest } from 'next/server'
import { getGroqClient, GROQ_MODEL } from '@/lib/groq'
import type { Incident } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { incident } = await request.json() as { incident: Incident }

    if (!incident) {
      return Response.json({ error: 'incident is required' }, { status: 400 })
    }

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an emergency response AI analyst. Summarize incident reports for emergency coordinators. 
Provide structured, actionable summaries. Be concise and professional.
Focus on: what happened, severity assessment, recommended actions, any missing information.
Label all outputs as AI-generated recommendations, not verified facts.`,
        },
        {
          role: 'user',
          content: `Summarize this incident report for the emergency coordinator:

Incident ID: ${incident.incidentId}
Category: ${CATEGORY_LABELS[incident.category]}
Severity: ${SEVERITY_LABELS[incident.severity]}
Status: ${STATUS_LABELS[incident.status]}
Location: ${incident.location}
People Affected: ${incident.peopleAffected}
Reported: ${incident.createdAt}
Verified: ${incident.verified ? 'Yes' : 'No'}

Title: ${incident.title}
Description: ${incident.description}

Please provide:
1. Brief summary (2-3 sentences)
2. Key concerns
3. Recommended immediate actions
4. Information gaps (if any)`,
        },
      ],
      max_tokens: 500,
      temperature: 0.4,
    })

    const summary = completion.choices[0]?.message?.content
    if (!summary) {
      return Response.json({ error: 'No summary returned' }, { status: 500 })
    }

    return Response.json({ summary })
  } catch (err: unknown) {
    console.error('[AI Summarize Error]', err)
    return Response.json({ error: 'Summarization failed' }, { status: 500 })
  }
}

