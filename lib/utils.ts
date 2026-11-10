// lib/utils.ts
// Shared utility functions

import type { EmergencyCategory, Severity, IncidentStatus, SOSStatus } from './types'

/** Merge class names (Tailwind-safe) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Format ISO date string to human-readable */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Calculate distance between two lat/lng points in km (Haversine) */
export function distanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Generate a readable incident ID */
export function generateId(prefix: string = 'INC'): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${ts}-${rnd}`
}

// ─── Color helpers ────────────────────────────────────────────────────────────

export const severityColors: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
}

export const statusColors: Record<IncidentStatus, { bg: string; text: string }> = {
  reported: { bg: 'bg-slate-100', text: 'text-slate-700' },
  assigned: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700' },
}

export const teamStatusColors: Record<string, { bg: string; text: string; dot: string }> = {
  available: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  busy: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  offline: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

export const teamCategoryIcons: Record<string, string> = {
  fire: '🚒',
  medical: '🚑',
  rescue: '🛟',
  police: '🚓',
  hazmat: '☣️',
  general: '🛡️',
}

export const sosStatusColors: Record<SOSStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-red-100', text: 'text-red-700' },
  acknowledged: { bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-600' },
}

export const categoryIcons: Record<EmergencyCategory, string> = {
  fire: '🔥',
  road_accident: '🚗',
  medical: '🏥',
  flood: '🌊',
  building_collapse: '🏗️',
  natural_disaster: '🌪️',
  other: '⚠️',
}

