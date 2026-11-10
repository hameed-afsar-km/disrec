// app/api/ai/quick-report/route.ts
// Voice Quick Report AI Triage Officer — analyzes spoken narrative,
// extracts incident details, and prompts for missing critical information (family, hazards, casualties).

import { NextRequest } from 'next/server'
import { getGroqClient, GROQ_MODEL } from '@/lib/groq'
import { getLanguageName } from '@/lib/ai-languages'
import type { EmergencyCategory, Severity } from '@/lib/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface QuickReportExtracted {
  title: string
  category: EmergencyCategory
  severity: Severity
  severityReason: string
  location: string
  peopleAffected: number
  familyStatus: string
  hazards: string
  description: string
  isReadyToSubmit: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { messages, language = 'en', gpsLocation } = (await request.json()) as {
      messages: ChatMessage[]
      language?: string
      gpsLocation?: { latitude: number; longitude: number; address?: string }
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 })
    }

    const languageName = getLanguageName(language)

    const systemPrompt = `You are an AI Emergency Intake & Dispatch Officer for a smart disaster coordination network.
A citizen is reporting an emergency via voice. Your task is to extract structured details and conversationally ask for critical missing information.

CRITICAL INSTRUCTIONS:
1. Extract structured fields from the conversation:
   - title: Concise, authoritative emergency headline (e.g. "Residential Structure Fire at Sector 14", "Head-on Vehicle Collision on NH-44")
   - category: One of: "fire", "road_accident", "medical", "flood", "building_collapse", "natural_disaster", "other"
   - severity: "low" | "medium" | "high" | "critical"
     * CRITICAL: Life-threatening, active fire with people trapped, severe trauma, massive structural collapse.
     * HIGH: Serious injury, rising flood waters, multi-vehicle crash, toxic leak.
     * MEDIUM: Moderate injury, non-structural fire under control, minor collision blocking road.
     * LOW: Property damage only, minor hazard.
   - severityReason: 1 sentence explaining the rating.
   - location: Specific address, landmark, intersection or neighborhood. ${gpsLocation?.address ? `(Citizen's GPS detected: "${gpsLocation.address}")` : ''}
   - peopleAffected: Integer estimate of victims, injured, or trapped (minimum 1).
   - familyStatus: Crucial! State whether the user's family/dependents are safe, missing, or trapped. If not mentioned, state "Unspecified".
   - hazards: Any secondary risks (e.g. gas leak, live wires, chemical smoke, blocked stairs, rising flood).
   - description: Comprehensive synthesized operational narrative of the emergency.
   - isReadyToSubmit: boolean. Set true once you know the emergency type, general location, and basic severity.

2. CONVERSATIONAL QUESTIONING (in the "aiResponse" field):
   - You MUST write your "aiResponse" entirely in ${languageName}.
   - Be calm, reassuring, and concise (1 to 2 sentences max).
   - If the user has NOT mentioned their family safety, specifically ask: "Are you and your family safe? Are there any trapped individuals or injuries?"
   - If family is confirmed safe, check for secondary hazards: "Are there any secondary hazards like gas leaks, fallen electrical wires, or blocked exits?"
   - If details are comprehensive, reassure the user: "I have compiled your emergency report with priority dispatch. Review the details and tap Submit, or let me know if anything else has changed."

3. OUTPUT FORMAT:
   Return strictly valid JSON with this exact schema:
   {
     "extracted": {
       "title": "string",
       "category": "fire" | "road_accident" | "medical" | "flood" | "building_collapse" | "natural_disaster" | "other",
       "severity": "low" | "medium" | "high" | "critical",
       "severityReason": "string",
       "location": "string",
       "peopleAffected": number,
       "familyStatus": "string",
       "hazards": "string",
       "description": "string",
       "isReadyToSubmit": boolean
     },
     "aiResponse": "Conversational reply in ${languageName} to the user"
   }`

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
      temperature: 0.2,
      max_tokens: 650,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('Groq returned empty response')
    }

    const parsed = JSON.parse(content) as {
      extracted: QuickReportExtracted
      aiResponse: string
    }

    return Response.json(parsed)
  } catch (err: unknown) {
    console.error('[AI Quick Report Error]', err)
    const message = err instanceof Error ? err.message : 'AI intake failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

