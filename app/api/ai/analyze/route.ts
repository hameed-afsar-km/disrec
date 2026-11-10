// app/api/ai/analyze/route.ts
// Analyzes patterns in incident data for the admin AI Intelligence Center

import { NextRequest } from 'next/server'
import { getGroqClient, GROQ_MODEL } from '@/lib/groq'
import type { Incident } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { incidents, analysisType } = await request.json() as {
      incidents: Incident[]
      analysisType: 'patterns' | 'hotspots' | 'report_quality'
    }

    if (!incidents || incidents.length === 0) {
      return Response.json({ error: 'incidents array is required' }, { status: 400 })
    }

    // Build a compact data summary to stay within token limits
    const summary = {
      total: incidents.length,
      byCategory: Object.entries(
        incidents.reduce<Record<string, number>>((acc, inc) => {
          acc[CATEGORY_LABELS[inc.category]] = (acc[CATEGORY_LABELS[inc.category]] || 0) + 1
          return acc
        }, {})
      ),
      bySeverity: {
        critical: incidents.filter((i) => i.severity === 'critical').length,
        high: incidents.filter((i) => i.severity === 'high').length,
        medium: incidents.filter((i) => i.severity === 'medium').length,
        low: incidents.filter((i) => i.severity === 'low').length,
      },
      byStatus: {
        reported: incidents.filter((i) => i.status === 'reported').length,
        pending: incidents.filter((i) => i.status === 'pending').length,
        in_progress: incidents.filter((i) => i.status === 'in_progress').length,
        resolved: incidents.filter((i) => i.status === 'resolved').length,
      },
      unresolved_critical: incidents
        .filter((i) => i.severity === 'critical' && i.status !== 'resolved')
        .slice(0, 5)
        .map((i) => ({ id: i.incidentId, title: i.title, location: i.location, age: i.createdAt })),
      date_range: {
        oldest: incidents[incidents.length - 1]?.createdAt,
        newest: incidents[0]?.createdAt,
      },
    }

    const prompts: Record<string, string> = {
      patterns: `Analyze the emergency incident pattern data and identify:
1. Most common emergency types
2. Any unusual spikes or trends
3. Areas of concern
4. Recommendations for resource allocation

Data: ${JSON.stringify(summary, null, 2)}`,
      hotspots: `Based on the incident data, provide hotspot analysis:
1. Categories with the highest incident density
2. Severity distribution assessment
3. Critical unresolved incidents that need attention
4. Geographic risk assessment (note: only location names provided)

Data: ${JSON.stringify(summary, null, 2)}`,
      report_quality: `Analyze the report submission patterns:
1. Assessment of verification rate
2. Category distribution analysis
3. Response time observations based on status distribution
4. Recommendations for improving emergency response

Data: ${JSON.stringify(summary, null, 2)}`,
    }

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an AI analytics system for emergency management. Provide data-driven insights to help emergency coordinators make better decisions. 
Always note that your analysis is AI-generated and should be verified by human coordinators before action.
Be specific, actionable, and professional.`,
        },
        {
          role: 'user',
          content: prompts[analysisType] || prompts.patterns,
        },
      ],
      max_tokens: 600,
      temperature: 0.5,
    })

    const analysis = completion.choices[0]?.message?.content
    if (!analysis) {
      return Response.json({ error: 'No analysis returned' }, { status: 500 })
    }

    return Response.json({ analysis, dataPoints: incidents.length })
  } catch (err: unknown) {
    console.error('[AI Analyze Error]', err)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

