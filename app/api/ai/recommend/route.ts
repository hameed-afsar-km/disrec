// app/api/ai/recommend/route.ts
// Generates operational recommendations for the admin dashboard

import { NextRequest } from 'next/server'
import { getGroqClient, GROQ_MODEL } from '@/lib/groq'
import type { Incident, SOSRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { incidents, sosRequests } = await request.json() as {
      incidents: Incident[]
      sosRequests?: SOSRequest[]
    }

    // Build compact operational summary
    const activeSOS = (sosRequests || []).filter(
      (s) => s.status === 'active' || s.status === 'acknowledged'
    )
    const criticalUnresolved = incidents.filter(
      (i) => i.severity === 'critical' && i.status !== 'resolved'
    )
    const highUnresolved = incidents.filter(
      (i) => i.severity === 'high' && i.status !== 'resolved'
    )
    const unverified = incidents.filter((i) => !i.verified && i.status === 'reported')

    const operationalStatus = {
      active_sos_count: activeSOS.length,
      critical_unresolved: criticalUnresolved.length,
      high_unresolved: highUnresolved.length,
      unverified_reports: unverified.length,
      total_active: incidents.filter((i) => i.status !== 'resolved').length,
      critical_sos: activeSOS.filter((s) => !s.acknowledgedAt).slice(0, 3).map(s => ({
        id: s.sosId, type: s.emergencyType, location: s.location, time: s.createdAt
      })),
      critical_incidents: criticalUnresolved.slice(0, 3).map(i => ({
        id: i.incidentId, title: i.title, location: i.location, time: i.createdAt
      })),
    }

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an AI operational assistant for an emergency command center. 
Generate a concise operational summary and prioritized recommendations for the duty administrator.
Be direct and actionable. Prioritize life-safety issues first.
Always note these are AI recommendations requiring human verification.`,
        },
        {
          role: 'user',
          content: `Generate an operational summary and recommendations based on current emergency data:

${JSON.stringify(operationalStatus, null, 2)}

Provide:
1. **Operational Status** (2-3 sentence summary)
2. **Priority Actions** (numbered list of 3-5 immediate priorities)
3. **Watch Items** (things to monitor)

Keep it under 300 words.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.4,
    })

    const recommendation = completion.choices[0]?.message?.content
    if (!recommendation) {
      return Response.json({ error: 'No recommendation returned' }, { status: 500 })
    }

    return Response.json({ recommendation, generatedAt: new Date().toISOString() })
  } catch (err: unknown) {
    console.error('[AI Recommend Error]', err)
    return Response.json({ error: 'Recommendation generation failed' }, { status: 500 })
  }
}

