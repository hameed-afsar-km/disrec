// lib/types.ts
// Shared TypeScript type definitions for the entire application

export type UserRole = 'user' | 'admin' | 'super_admin' | 'incident_manager' | 'monitoring_admin' | 'alert_manager'

export type EmergencyCategory =
  | 'fire'
  | 'road_accident'
  | 'medical'
  | 'flood'
  | 'building_collapse'
  | 'natural_disaster'
  | 'other'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type IncidentStatus = 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'pending'

export type TeamResponseCategory =
  | 'fire'
  | 'medical'
  | 'rescue'
  | 'police'
  | 'hazmat'
  | 'general'

export type TeamStatus = 'available' | 'busy' | 'offline'

export interface ResponseTeam {
  teamId: string
  name: string
  callSign?: string
  category: TeamResponseCategory
  status: TeamStatus
  latitude: number
  longitude: number
  locationAddress: string
  assignedIncidentId?: string | null
  assignedIncidentTitle?: string | null
  memberCount: number
  contactPhone: string
  leaderName: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type SOSStatus = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'cancelled'

export type AlertStatus = 'draft' | 'published' | 'expired'

export type NotificationType =
  | 'nearby_emergency'
  | 'sos_update'
  | 'incident_update'
  | 'emergency_broadcast'
  | 'system'
  | 'critical_alert'

export interface GeoLocation {
  latitude: number
  longitude: number
  address?: string
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface AppUser {
  uid: string
  name: string
  email: string
  phone?: string
  photoURL?: string
  role: UserRole
  preferredLanguage: string
  aadhaarNumber?: string
  familyMembers?: {
    id: string
    name: string
    relation: string
    age: number
    aadhaarLast4: string
    status: 'Safe' | 'Affected' | 'Unknown'
    phone?: string
    lastKnownLocation?: string
    latitude?: number
    longitude?: number
  }[]
  emergencyContacts: EmergencyContact[]
  notificationPreferences: {
    email: boolean
    push: boolean
    nearby: boolean
    radius: number // km
  }
  createdAt: string // ISO string
  updatedAt: string
}

export interface Incident {
  incidentId: string
  reporterId: string
  reporterName?: string
  reporterEmail?: string
  title: string
  description: string
  category: EmergencyCategory
  severity: Severity
  aiSuggestedSeverity?: Severity
  aiSeverityReason?: string
  location: string
  latitude: number
  longitude: number
  peopleAffected: number
  evidenceUrls: string[]
  status: IncidentStatus
  verified: boolean
  assignedAdminId?: string
  assignedTeamId?: string
  assignedTeamName?: string
  priorityScore?: number
  priorityLevel?: Severity
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface IncidentUpdate {
  updateId: string
  incidentId: string
  adminId: string
  adminName?: string
  previousStatus?: IncidentStatus
  newStatus?: IncidentStatus
  previousSeverity?: Severity
  newSeverity?: Severity
  message: string
  visibility: 'public' | 'internal'
  createdAt: string
}

export interface SOSRequest {
  sosId: string
  userId: string
  userName?: string
  userEmail?: string
  userPhone?: string
  location: string
  latitude: number
  longitude: number
  emergencyType?: EmergencyCategory
  description?: string
  status: SOSStatus
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  adminNotes?: string
}

export interface Notification {
  notificationId: string
  userId: string
  title: string
  message: string
  type: NotificationType
  relatedId?: string
  read: boolean
  createdAt: string
}

export interface EmergencyAlert {
  alertId: string
  title: string
  description: string
  category: EmergencyCategory
  severity: Severity
  centerLocation: string
  centerLatitude: number
  centerLongitude: number
  radius: number // km
  status: AlertStatus
  expiresAt: string
  createdBy: string
  createdByName?: string
  createdAt: string
}

export interface AdminAuditLog {
  logId: string
  adminId: string
  adminName?: string
  action: string
  targetType: 'incident' | 'sos' | 'user' | 'alert' | 'admin'
  targetId: string
  details: Record<string, unknown>
  createdAt: string
}

// UI helpers
export const CATEGORY_LABELS: Record<EmergencyCategory, string> = {
  fire: 'Fire Emergency',
  road_accident: 'Road Accident',
  medical: 'Medical Emergency',
  flood: 'Flood',
  building_collapse: 'Building Collapse',
  natural_disaster: 'Natural Disaster',
  other: 'Other Emergency',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  assigned: 'Assigned',
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export const TEAM_CATEGORY_LABELS: Record<TeamResponseCategory, string> = {
  fire: 'Fire & Rescue',
  medical: 'Emergency Medical (EMS)',
  rescue: 'Search & Disaster Rescue (NDRF/SDRF)',
  police: 'Law & Security',
  hazmat: 'Hazardous Materials (HazMat)',
  general: 'Civil Defense & General Response',
}

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  available: 'Available',
  busy: 'Busy / Dispatched',
  offline: 'Offline / Maintenance',
}

export const SOS_STATUS_LABELS: Record<SOSStatus, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
}

