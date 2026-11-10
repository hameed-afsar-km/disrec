// lib/prioritization.ts
// Intelligent Incident Prioritization & Location-Based Team Assignment Engine

import type { Incident, Severity, EmergencyCategory, ResponseTeam, TeamResponseCategory } from './types'
import { distanceKm } from './utils'

export interface PriorityBreakdown {
  severityPoints: number
  peoplePoints: number
  agePoints: number
  categoryPoints: number
}

export interface IncidentPriorityResult {
  score: number // 0 to 100
  priorityLevel: Severity // 'critical' | 'high' | 'medium' | 'low'
  rankLabel: string
  breakdown: PriorityBreakdown
  ageMinutes: number
}

/**
 * Calculates a dynamic multi-factor priority score and level for an incident.
 * Evaluates:
 * 1. Incident Severity (Base urgency: 10 - 40 pts)
 * 2. People Affected (Human impact scale: 5 - 30 pts)
 * 3. Elapsed Time Since Reporting (Aging urgency: 0 - 20 pts)
 * 4. Emergency Category (Hazard profile: 5 - 15 pts)
 */
export function calculateIncidentPriority(incident: Incident): IncidentPriorityResult {
  // 1. Severity points (up to 40)
  const severityMap: Record<Severity, number> = {
    critical: 40,
    high: 30,
    medium: 20,
    low: 10,
  }
  const severityPoints = severityMap[incident.severity] ?? 20

  // 2. People affected points (up to 30)
  const count = Number(incident.peopleAffected) || 1
  let peoplePoints = 5
  if (count >= 50) peoplePoints = 30
  else if (count >= 16) peoplePoints = 25
  else if (count >= 6) peoplePoints = 18
  else if (count >= 3) peoplePoints = 10
  else peoplePoints = 5

  // 3. Time elapsed aging factor (up to 20 points)
  // For unresolved incidents, delay without intervention compounds danger.
  const elapsedMs = Math.max(0, Date.now() - new Date(incident.createdAt).getTime())
  const ageMinutes = Math.floor(elapsedMs / (1000 * 60))
  let agePoints = 5
  if (incident.status === 'resolved') {
    agePoints = 0
  } else if (ageMinutes > 180) {
    agePoints = 20
  } else if (ageMinutes > 60) {
    agePoints = 15
  } else if (ageMinutes > 15) {
    agePoints = 10
  } else {
    agePoints = 5
  }

  // 4. Emergency category hazard weight (up to 15 points)
  const categoryHazardMap: Record<EmergencyCategory, number> = {
    fire: 15,
    building_collapse: 15,
    medical: 12,
    flood: 10,
    natural_disaster: 10,
    road_accident: 8,
    other: 5,
  }
  const categoryPoints = categoryHazardMap[incident.category] ?? 5

  // Total raw score (max 105, normalized to 100)
  const rawScore = severityPoints + peoplePoints + agePoints + categoryPoints
  const score = Math.min(100, Math.max(1, rawScore))

  // Determine Priority Level
  let priorityLevel: Severity = 'low'
  let rankLabel = 'Low Priority'
  if (score >= 70) {
    priorityLevel = 'critical'
    rankLabel = 'P1 - Critical Priority'
  } else if (score >= 48) {
    priorityLevel = 'high'
    rankLabel = 'P2 - High Priority'
  } else if (score >= 28) {
    priorityLevel = 'medium'
    rankLabel = 'P3 - Medium Priority'
  } else {
    priorityLevel = 'low'
    rankLabel = 'P4 - Low Priority'
  }

  return {
    score,
    priorityLevel,
    rankLabel,
    breakdown: {
      severityPoints,
      peoplePoints,
      agePoints,
      categoryPoints,
    },
    ageMinutes,
  }
}

export type PrioritizedIncident = Incident & {
  priority: IncidentPriorityResult
}

/**
 * Attaches real-time priority scores to incidents and sorts descending by priority.
 */
export function sortIncidentsByPriority(incidents: Incident[]): PrioritizedIncident[] {
  return incidents
    .map((inc) => ({
      ...inc,
      priority: calculateIncidentPriority(inc),
    }))
    .sort((a, b) => {
      // Unresolved first
      if (a.status === 'resolved' && b.status !== 'resolved') return 1
      if (a.status !== 'resolved' && b.status === 'resolved') return -1

      // Then by calculated priority score descending
      if (b.priority.score !== a.priority.score) {
        return b.priority.score - a.priority.score
      }

      // Then by newest created
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Location-Based Team Assignment Recommendation Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamAssignmentCandidate {
  team: ResponseTeam
  distanceKm: number
  estimatedArrivalMinutes: number
  isCategoryMatch: boolean
  compatibilityScore: number
  matchScore: number
  recommendationReason: string
  isBestFit: boolean
}

/**
 * Matrix mapping an incident emergency category to primary and secondary response team categories.
 */
const CATEGORY_COMPATIBILITY: Record<
  EmergencyCategory,
  { primary: TeamResponseCategory[]; secondary: TeamResponseCategory[] }
> = {
  fire: {
    primary: ['fire'],
    secondary: ['rescue', 'general'],
  },
  medical: {
    primary: ['medical'],
    secondary: ['rescue', 'general'],
  },
  flood: {
    primary: ['rescue'],
    secondary: ['fire', 'medical', 'general'],
  },
  building_collapse: {
    primary: ['rescue', 'fire'],
    secondary: ['medical', 'general'],
  },
  natural_disaster: {
    primary: ['rescue'],
    secondary: ['fire', 'medical', 'police', 'general'],
  },
  road_accident: {
    primary: ['medical', 'police'],
    secondary: ['rescue', 'fire', 'general'],
  },
  other: {
    primary: ['general'],
    secondary: ['police', 'rescue', 'fire', 'medical'],
  },
}

/**
 * Finds and ranks response teams for a specific incident using GPS coordinates,
 * availability, and emergency category specialization.
 */
export function recommendResponseTeams(
  incident: Incident,
  teams: ResponseTeam[]
): TeamAssignmentCandidate[] {
  if (!teams || teams.length === 0) return []

  const compatibility = CATEGORY_COMPATIBILITY[incident.category] || {
    primary: ['general'],
    secondary: ['general'],
  }

  const candidates: TeamAssignmentCandidate[] = teams.map((team) => {
    // Distance in km using Haversine
    let dist = 0
    if (
      incident.latitude &&
      incident.longitude &&
      team.latitude &&
      team.longitude
    ) {
      dist = +distanceKm(
        incident.latitude,
        incident.longitude,
        team.latitude,
        team.longitude
      ).toFixed(1)
    }

    // Category compatibility score (0 - 50 pts)
    let compScore = 15 // baseline
    let isCategoryMatch = false
    if (compatibility.primary.includes(team.category)) {
      compScore = 50
      isCategoryMatch = true
    } else if (compatibility.secondary.includes(team.category)) {
      compScore = 32
      isCategoryMatch = false
    }

    // Availability factor
    const isAvailable = team.status === 'available'
    const availabilityMultiplier = isAvailable ? 1 : team.status === 'busy' ? 0.35 : 0.05

    // Proximity score (0 - 50 pts, closer is higher)
    // 0km -> 50pts, 25km -> ~25pts, >50km -> 0pts
    const proximityScore = Math.max(0, 50 - dist * 1.0)

    // Total Match Score (0 - 100)
    const rawMatch = (compScore + proximityScore) * availabilityMultiplier
    const matchScore = Math.min(100, Math.round(rawMatch))

    // ETA calculation (assuming average 40 km/h emergency response travel speed in urban/suburban zones)
    const travelMinutes = dist > 0 ? Math.round((dist / 40) * 60) : 4
    const estimatedArrivalMinutes = Math.max(3, travelMinutes)

    // Clear recommendation reason for dispatchers
    let recommendationReason = ''
    if (!isAvailable) {
      recommendationReason = `Currently ${team.status === 'busy' ? 'deployed on another mission' : 'offline/standby'}`
    } else if (isCategoryMatch && dist <= 15) {
      recommendationReason = `Optimal unit: Direct ${team.category.toUpperCase()} specialist stationed ${dist} km away`
    } else if (isCategoryMatch) {
      recommendationReason = `Specialist unit: Matching ${team.category.toUpperCase()} equipment (${dist} km away)`
    } else if (dist <= 10) {
      recommendationReason = `Rapid support unit: Closest available team (${dist} km away)`
    } else {
      recommendationReason = `Standby backup: Available secondary response (${dist} km away)`
    }

    return {
      team,
      distanceKm: dist,
      estimatedArrivalMinutes,
      isCategoryMatch,
      compatibilityScore: compScore,
      matchScore,
      recommendationReason,
      isBestFit: false,
    }
  })

  // Sort by match score descending, then distance ascending
  candidates.sort((a, b) => {
    // Available teams first
    if (a.team.status === 'available' && b.team.status !== 'available') return -1
    if (a.team.status !== 'available' && b.team.status === 'available') return 1

    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }
    return a.distanceKm - b.distanceKm
  })

  // Mark the top available candidate as best fit
  const topAvailable = candidates.find((c) => c.team.status === 'available')
  if (topAvailable) {
    topAvailable.isBestFit = true
  }

  return candidates
}

