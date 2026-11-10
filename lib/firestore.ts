// lib/firestore.ts
// Firestore helper functions — collection references and common queries

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type QueryConstraint,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import type {
  Incident,
  SOSRequest,
  Notification,
  EmergencyAlert,
  AdminAuditLog,
  AppUser,
  IncidentUpdate,
  ResponseTeam,
} from './types'

// ─── Collection References ────────────────────────────────────────────────────

export const COLLECTIONS = {
  USERS: 'users',
  INCIDENTS: 'incidents',
  INCIDENT_UPDATES: 'incident_updates',
  RESPONSE_TEAMS: 'response_teams',
  SOS_REQUESTS: 'sos_requests',
  NOTIFICATIONS: 'notifications',
  EMERGENCY_ALERTS: 'emergency_alerts',
  ADMIN_AUDIT_LOGS: 'admin_audit_logs',
} as const

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Convert Firestore Timestamps to ISO strings for serialization */
export function normalizeTimestamps<T>(data: T): T {
  if (!data || typeof data !== 'object') return data
  const result: Record<string, unknown> = { ...(data as Record<string, unknown>) }
  for (const key in result) {
    const val = result[key]
    if (val instanceof Timestamp) {
      result[key] = val.toDate().toISOString()
    }
  }
  return result as T
}

export function nowISO(): string {
  return new Date().toISOString()
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<AppUser | null> {
  if (!auth.currentUser) return null
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
    if (!snap.exists()) return null
    return normalizeTimestamps(snap.data() as AppUser)
  } catch {
    return null
  }
}

export async function createUser(uid: string, data: Omit<AppUser, 'uid'>): Promise<void> {
  if (!auth.currentUser) return
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { uid, ...data }).catch(async () => {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, COLLECTIONS.USERS, uid), { uid, ...data })
    })
  } catch {}
}

export async function updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
  if (!auth.currentUser) return
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { ...data, updatedAt: nowISO() })
  } catch {}
}

// ─── Incidents Local & Hybrid Store ──────────────────────────────────────────

const LOCAL_INCIDENTS_KEY = 'respondai_local_incidents'

const INITIAL_SEED_INCIDENTS: Incident[] = [
  {
    incidentId: 'INC-CRIT-001',
    reporterId: 'mock-user-citizen-001',
    reporterName: 'Demo Citizen User',
    reporterEmail: 'user@respondai.local',
    title: 'Commercial Building Electrical Fire on 3rd Floor',
    description: 'Dense smoke and open flames coming from the 3rd floor commercial office. Multiple people evacuating through emergency stairwells. Fire alarms active.',
    category: 'fire',
    severity: 'critical',
    location: 'Connaught Place, Inner Circle, New Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    peopleAffected: 25,
    evidenceUrls: [],
    status: 'in_progress',
    verified: true,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    incidentId: 'INC-HIGH-002',
    reporterId: 'mock-user-citizen-001',
    reporterName: 'Demo Citizen User',
    reporterEmail: 'user@respondai.local',
    title: 'Multi-Vehicle Collision on Ring Road Flyover',
    description: 'Collision involving two passenger cars and a mini delivery truck. Traffic stalled on both lanes. Emergency medical attention required for driver.',
    category: 'road_accident',
    severity: 'high',
    location: 'Ring Road near AIIMS Flyover, New Delhi',
    latitude: 28.5672,
    longitude: 77.2100,
    peopleAffected: 4,
    evidenceUrls: [],
    status: 'reported',
    verified: true,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    incidentId: 'INC-CRIT-003',
    reporterId: 'mock-user-citizen-001',
    reporterName: 'Demo Citizen User',
    reporterEmail: 'user@respondai.local',
    title: 'Cardiac Arrest on Metro Station Platform',
    description: 'Elderly commuter collapsed near coach 4 platform. Station security currently administering CPR. Ambulance requested immediately.',
    category: 'medical',
    severity: 'critical',
    location: 'Rajiv Chowk Metro Station Platform 2, New Delhi',
    latitude: 28.6328,
    longitude: 77.2195,
    peopleAffected: 1,
    evidenceUrls: [],
    status: 'in_progress',
    verified: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    incidentId: 'INC-MED-004',
    reporterId: 'mock-user-citizen-001',
    reporterName: 'Demo Citizen User',
    reporterEmail: 'user@respondai.local',
    title: 'Severe Waterlogging and Flooding in Underpass',
    description: 'Monsoon rainfall accumulation reaching 4 feet water level in underpass. Vehicles unable to cross, pedestrian movement completely halted.',
    category: 'flood',
    severity: 'medium',
    location: 'Minto Road Underpass, Connaught Place Outer, New Delhi',
    latitude: 28.6375,
    longitude: 77.2280,
    peopleAffected: 12,
    evidenceUrls: [],
    status: 'pending',
    verified: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    incidentId: 'INC-HIGH-005',
    reporterId: 'mock-user-citizen-001',
    reporterName: 'Demo Citizen User',
    reporterEmail: 'user@respondai.local',
    title: 'Partial Structural Collapse of Old Residential Balcony',
    description: 'Portion of second-story masonry balcony collapsed onto street pavement. Area cordoned off; structural inspection needed to prevent further collapse.',
    category: 'building_collapse',
    severity: 'high',
    location: 'Chandni Chowk Main Market Road, Old Delhi',
    latitude: 28.6506,
    longitude: 77.2303,
    peopleAffected: 6,
    evidenceUrls: [],
    status: 'in_progress',
    verified: true,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    incidentId: 'INC-LOW-006',
    reporterId: 'mock-user-citizen-001',
    reporterName: 'Demo Citizen User',
    reporterEmail: 'user@respondai.local',
    title: 'Overhead Electrical Cable Sparking & Snapped',
    description: 'Overhead transformer line sparking intermittently. Low-hanging cable poses safety hazard to passing high-body trucks. Power utility notified.',
    category: 'other',
    severity: 'low',
    location: 'Sector 14 Main Road, Dwarka, New Delhi',
    latitude: 28.5921,
    longitude: 77.0378,
    peopleAffected: 0,
    evidenceUrls: [],
    status: 'resolved',
    verified: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
]

export function getLocalIncidents(): Incident[] {
  if (typeof window === 'undefined') return INITIAL_SEED_INCIDENTS
  try {
    const raw = localStorage.getItem(LOCAL_INCIDENTS_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(INITIAL_SEED_INCIDENTS))
      return INITIAL_SEED_INCIDENTS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_SEED_INCIDENTS
  }
}

export function saveLocalIncident(incident: Incident): void {
  if (typeof window === 'undefined') return
  try {
    const current = getLocalIncidents()
    const updated = [incident, ...current.filter((i) => i.incidentId !== incident.incidentId)]
    localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('respondai:incidents_updated', { detail: updated }))
  } catch (err) {
    console.warn('Failed to save local incident:', err)
  }
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export async function createIncident(data: Omit<Incident, 'incidentId'>): Promise<string> {
  const localId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const incidentWithId: Incident = {
    ...data,
    incidentId: localId,
  }

  // Persist locally immediately for instantaneous UI response and resilience
  saveLocalIncident(incidentWithId)

  // Only attempt Firestore sync if real Firebase Auth is active
  if (auth.currentUser) {
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.INCIDENTS), data)
      await updateDoc(ref, { incidentId: ref.id })
      const synced: Incident = { ...data, incidentId: ref.id }
      if (typeof window !== 'undefined') {
        const current = getLocalIncidents()
        const updated = [synced, ...current.filter((i) => i.incidentId !== localId && i.incidentId !== ref.id)]
        localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent('respondai:incidents_updated', { detail: updated }))
      }
      return ref.id
    } catch {
      // Retain local record if cloud permissions are restricted
    }
  }

  return localId
}

export async function getIncident(id: string): Promise<Incident | null> {
  const local = getLocalIncidents().find((i) => i.incidentId === id)
  if (!auth.currentUser) {
    return local || null
  }
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.INCIDENTS, id))
    if (snap.exists()) {
      return normalizeTimestamps(snap.data() as Incident)
    }
  } catch {}
  return local || null
}

export async function updateIncident(id: string, data: Partial<Incident>): Promise<void> {
  let assignedTeamToRelease: string | undefined

  if (typeof window !== 'undefined') {
    const current = getLocalIncidents()
    const target = current.find((i) => i.incidentId === id)
    if (data.status === 'resolved' && target?.assignedTeamId) {
      assignedTeamToRelease = target.assignedTeamId
    }

    const updated = current.map((i) =>
      i.incidentId === id ? { ...i, ...data, updatedAt: nowISO() } : i
    )
    localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('respondai:incidents_updated', { detail: updated }))
  }

  if (auth.currentUser) {
    try {
      if (data.status === 'resolved' && !assignedTeamToRelease) {
        const snap = await getDoc(doc(db, COLLECTIONS.INCIDENTS, id))
        if (snap.exists()) {
          assignedTeamToRelease = (snap.data() as Incident).assignedTeamId
        }
      }
      await updateDoc(doc(db, COLLECTIONS.INCIDENTS, id), { ...data, updatedAt: nowISO() })
    } catch {}
  }

  // Auto-release assigned response team when incident is resolved
  if (data.status === 'resolved' && assignedTeamToRelease) {
    try {
      await updateResponseTeam(assignedTeamToRelease, {
        status: 'available',
        assignedIncidentId: null,
        assignedIncidentTitle: null,
      })
    } catch (err) {
      console.warn('Could not auto-release team on resolve:', err)
    }
  }
}

export async function deleteIncident(id: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const current = getLocalIncidents()
    const updated = current.filter((i) => i.incidentId !== id)
    localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('respondai:incidents_updated', { detail: updated }))
  }

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.INCIDENTS, id))
    } catch {}
  }
}

export async function getUserIncidents(uid: string): Promise<Incident[]> {
  const local = getLocalIncidents().filter(
    (i) => i.reporterId === uid || uid.startsWith('mock-') || i.reporterId === 'mock-user-citizen-001'
  )
  if (!auth.currentUser) {
    return local
  }
  try {
    const q = query(
      collection(db, COLLECTIONS.INCIDENTS),
      where('reporterId', '==', uid),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    const cloud = snap.docs.map((d) => normalizeTimestamps(d.data() as Incident))

    const map = new Map<string, Incident>()
    for (const item of [...local, ...cloud]) {
      map.set(item.incidentId, item)
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return local
  }
}

type Unsubscribe = () => void

/**
 * Firestore rules require an authenticated user. On a fresh page load Firebase
 * restores the session asynchronously, so starting a listener immediately can
 * fire before request.auth is available and be rejected with permission-denied.
 * Wait for the auth state to be ready before attaching any listener.
 */
function subscribeWithAuth<T>(
  start: (emit: (value: T) => void, fail: (err: FirestoreError) => void) => Unsubscribe,
  callback: (value: T) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe {
  let unsubscribe: Unsubscribe | null = null
  let cancelled = false

  const handleError = (err: FirestoreError) => {
    if (err.code !== 'permission-denied') {
      onError?.(err)
    }
  }

  auth
    .authStateReady()
    .then(() => {
      if (!cancelled) {
        if (!auth.currentUser) {
          // If no Firebase Auth session exists (e.g. mock user/admin or Aadhaar login),
          // do not attach remote listeners that trigger permission-denied.
          return
        }
        unsubscribe = start(callback, handleError)
      }
    })
    .catch(() => {})

  return () => {
    cancelled = true
    unsubscribe?.()
  }
}

export function subscribeToIncident(
  id: string,
  callback: (incident: Incident | null) => void,
  onError?: (err: FirestoreError) => void
) {
  // Immediately serve from local store if found
  const localInitial = getLocalIncidents().find((i) => i.incidentId === id)
  if (localInitial) {
    callback(localInitial)
  }

  const handleCustomUpdate = (e: Event) => {
    const detail = (e as CustomEvent<Incident[]>).detail
    const match = (detail || getLocalIncidents()).find((i) => i.incidentId === id)
    if (match) {
      callback(match)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('respondai:incidents_updated', handleCustomUpdate)
  }

  const unsubCloud = subscribeWithAuth(
    (emit, fail) =>
      onSnapshot(
        doc(db, COLLECTIONS.INCIDENTS, id),
        (snap) => {
          if (snap.exists()) {
            emit(normalizeTimestamps(snap.data() as Incident))
          } else {
            const currentLocal = getLocalIncidents().find((i) => i.incidentId === id)
            emit(currentLocal || null)
          }
        },
        fail
      ),
    callback,
    onError
  )

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('respondai:incidents_updated', handleCustomUpdate)
    }
    unsubCloud()
  }
}

export function subscribeToAllIncidents(
  callback: (incidents: Incident[]) => void,
  constraints: QueryConstraint[] = [],
  onError?: (err: FirestoreError) => void
) {
  // Immediately provide current local incidents
  const localList = getLocalIncidents()
  if (localList.length > 0) {
    callback(localList)
  }

  const handleCustomUpdate = (e: Event) => {
    const detail = (e as CustomEvent<Incident[]>).detail || getLocalIncidents()
    callback(detail)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('respondai:incidents_updated', handleCustomUpdate)
  }

  const unsubCloud = subscribeWithAuth(
    (emit, fail) => {
      const q = query(
        collection(db, COLLECTIONS.INCIDENTS),
        orderBy('createdAt', 'desc'),
        ...constraints
      )
      return onSnapshot(
        q,
        (snap) => {
          const cloud = snap.docs.map((d) => normalizeTimestamps(d.data() as Incident))
          const currentLocal = getLocalIncidents()
          const map = new Map<string, Incident>()
          for (const item of [...currentLocal, ...cloud]) {
            map.set(item.incidentId, item)
          }
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          emit(merged)
        },
        fail
      )
    },
    callback,
    onError
  )

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('respondai:incidents_updated', handleCustomUpdate)
    }
    unsubCloud()
  }
}

// ─── Incident Updates & Activity Timeline ────────────────────────────────────

const LOCAL_UPDATES_KEY = 'respondai:incident_updates'

export function getLocalIncidentUpdates(): IncidentUpdate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_UPDATES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function addIncidentUpdate(data: Omit<IncidentUpdate, 'updateId'>): Promise<string> {
  const localId = `UPD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const fullItem: IncidentUpdate = {
    ...data,
    updateId: localId,
  }

  if (typeof window !== 'undefined') {
    const current = getLocalIncidentUpdates()
    const next = [...current, fullItem]
    localStorage.setItem(LOCAL_UPDATES_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('respondai:updates_changed', { detail: next }))
  }

  if (auth.currentUser) {
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.INCIDENT_UPDATES), data)
      await updateDoc(ref, { updateId: ref.id })
      return ref.id
    } catch {}
  }
  return localId
}

export async function getIncidentUpdates(incidentId: string): Promise<IncidentUpdate[]> {
  const local = getLocalIncidentUpdates().filter((u) => u.incidentId === incidentId)
  if (!auth.currentUser) {
    return local
  }
  try {
    const q = query(
      collection(db, COLLECTIONS.INCIDENT_UPDATES),
      where('incidentId', '==', incidentId),
      orderBy('createdAt', 'asc')
    )
    const snap = await getDocs(q)
    const cloud = snap.docs.map((d) => normalizeTimestamps(d.data() as IncidentUpdate))
    const map = new Map<string, IncidentUpdate>()
    for (const item of [...local, ...cloud]) {
      map.set(item.updateId, item)
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  } catch {
    return local
  }
}

export function subscribeToIncidentUpdates(
  incidentId: string,
  callback: (updates: IncidentUpdate[]) => void
) {
  const local = getLocalIncidentUpdates().filter((u) => u.incidentId === incidentId)
  callback(local)

  const handleUpdate = () => {
    callback(getLocalIncidentUpdates().filter((u) => u.incidentId === incidentId))
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('respondai:updates_changed', handleUpdate)
  }

  const unsub = subscribeWithAuth(
    (emit, fail) => {
      const q = query(
        collection(db, COLLECTIONS.INCIDENT_UPDATES),
        where('incidentId', '==', incidentId),
        orderBy('createdAt', 'asc')
      )
      return onSnapshot(
        q,
        (snap) => {
          const cloud = snap.docs.map((d) => normalizeTimestamps(d.data() as IncidentUpdate))
          const currentLocal = getLocalIncidentUpdates().filter((u) => u.incidentId === incidentId)
          const map = new Map<string, IncidentUpdate>()
          for (const item of [...currentLocal, ...cloud]) {
            map.set(item.updateId, item)
          }
          emit(
            Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
          )
        },
        fail
      )
    },
    callback
  )

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('respondai:updates_changed', handleUpdate)
    }
    unsub()
  }
}

// ─── SOS Requests ─────────────────────────────────────────────────────────────

export async function createSOS(data: Omit<SOSRequest, 'sosId'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.SOS_REQUESTS), data)
  await updateDoc(ref, { sosId: ref.id })
  return ref.id
}

export async function updateSOS(id: string, data: Partial<SOSRequest>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SOS_REQUESTS, id), data)
}

export function subscribeToUserSOS(
  uid: string,
  callback: (requests: SOSRequest[]) => void,
  onError?: (err: FirestoreError) => void
) {
  return subscribeWithAuth(
    (emit, fail) => {
      const q = query(
        collection(db, COLLECTIONS.SOS_REQUESTS),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      return onSnapshot(
        q,
        (snap) => emit(snap.docs.map((d) => normalizeTimestamps(d.data() as SOSRequest))),
        fail
      )
    },
    callback,
    onError
  )
}

export function subscribeToAllSOS(
  callback: (requests: SOSRequest[]) => void,
  onError?: (err: FirestoreError) => void
) {
  return subscribeWithAuth(
    (emit, fail) => {
      const q = query(
        collection(db, COLLECTIONS.SOS_REQUESTS),
        orderBy('createdAt', 'desc')
      )
      return onSnapshot(
        q,
        (snap) => emit(snap.docs.map((d) => normalizeTimestamps(d.data() as SOSRequest))),
        fail
      )
    },
    callback,
    onError
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: Omit<Notification, 'notificationId'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), data)
  await updateDoc(ref, { notificationId: ref.id })
  return ref.id
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { read: true })
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', uid),
    where('read', '==', false)
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })))
}

export function subscribeToUserNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void,
  onError?: (err: FirestoreError) => void
) {
  return subscribeWithAuth(
    (emit, fail) => {
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      return onSnapshot(
        q,
        (snap) => emit(snap.docs.map((d) => normalizeTimestamps(d.data() as Notification))),
        fail
      )
    },
    callback,
    onError
  )
}

// ─── Emergency Alerts ─────────────────────────────────────────────────────────

export async function createAlert(data: Omit<EmergencyAlert, 'alertId'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.EMERGENCY_ALERTS), data)
  await updateDoc(ref, { alertId: ref.id })
  return ref.id
}

export async function updateAlert(id: string, data: Partial<EmergencyAlert>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EMERGENCY_ALERTS, id), data)
}

export function subscribeToActiveAlerts(
  callback: (alerts: EmergencyAlert[]) => void,
  onError?: (err: FirestoreError) => void
) {
  return subscribeWithAuth(
    (emit, fail) => {
      const q = query(
        collection(db, COLLECTIONS.EMERGENCY_ALERTS),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc')
      )
      return onSnapshot(
        q,
        (snap) => emit(snap.docs.map((d) => normalizeTimestamps(d.data() as EmergencyAlert))),
        fail
      )
    },
    callback,
    onError
  )
}

// ─── Admin Audit Logs ─────────────────────────────────────────────────────────

export async function logAdminAction(data: Omit<AdminAuditLog, 'logId'>): Promise<void> {
  const ref = await addDoc(collection(db, COLLECTIONS.ADMIN_AUDIT_LOGS), data)
  await updateDoc(ref, { logId: ref.id })
}

// ─────────────────────────────────────────────────────────────────────────────
// Module 2 & 3 & 4: Emergency Response Teams & Assignment Engine
// ─────────────────────────────────────────────────────────────────────────────

export const LOCAL_TEAMS_KEY = 'respondai:response_teams'

export const INITIAL_SEED_TEAMS: ResponseTeam[] = [
  {
    teamId: 'TEAM-FIRE-01',
    name: 'Delhi Fire Brigade - Unit 4 Rapid Response',
    callSign: 'BRAVO-4',
    category: 'fire',
    status: 'available',
    latitude: 28.6304,
    longitude: 77.2177,
    locationAddress: 'Fire Station, Connaught Circus, New Delhi',
    memberCount: 8,
    contactPhone: '+91 11 2341 2222',
    leaderName: 'Capt. Rajesh Sharma',
    notes: 'Equipped with 3000L water tender, hydraulic rescue spreaders, breathing apparatus.',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    teamId: 'TEAM-MED-02',
    name: 'AIIMS Trauma Emergency Mobile Corps',
    callSign: 'MEDIC-1',
    category: 'medical',
    status: 'available',
    latitude: 28.5672,
    longitude: 77.2100,
    locationAddress: 'AIIMS Apex Trauma Centre, Ring Road, New Delhi',
    memberCount: 5,
    contactPhone: '+91 11 2659 8888',
    leaderName: 'Dr. Sunita Rao (Chief Paramedic)',
    notes: 'Advanced Life Support (ALS) ambulance with portable defibrillator, trauma stabilization kits.',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    teamId: 'TEAM-RESCUE-03',
    name: 'NDRF 8th Battalion Urban Search & Rescue',
    callSign: 'DISASTER-8',
    category: 'rescue',
    status: 'available',
    latitude: 28.6448,
    longitude: 77.2167,
    locationAddress: 'State Disaster Management Depot, New Delhi',
    memberCount: 14,
    contactPhone: '+91 11 2436 3260',
    leaderName: 'Inspector Vikram Singh',
    notes: 'Heavy structural collapse equipment, acoustic life detectors, inflatable rescue boats.',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    teamId: 'TEAM-POLICE-04',
    name: 'Central District Police Quick Reaction Team',
    callSign: 'EAGLE-9',
    category: 'police',
    status: 'available',
    latitude: 28.6421,
    longitude: 77.2290,
    locationAddress: 'Police Headquarters, ITO, New Delhi',
    memberCount: 6,
    contactPhone: '+91 11 2331 1111',
    leaderName: 'ACP Manoj Verma',
    notes: 'Traffic diversion, crowd perimeter security, emergency evacuation escort.',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    teamId: 'TEAM-HAZMAT-05',
    name: 'National CBRN & HazMat Containment Unit',
    callSign: 'HAZMAT-DELTA',
    category: 'hazmat',
    status: 'available',
    latitude: 28.5880,
    longitude: 77.2340,
    locationAddress: 'Lodhi Road Emergency Base, New Delhi',
    memberCount: 7,
    contactPhone: '+91 11 2469 1100',
    leaderName: 'Cmdr. Amitav Mukherjee',
    notes: 'Chemical, biological, electrical hazard containment gear, vapor suppressors.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    teamId: 'TEAM-CIVIL-06',
    name: 'Civil Defense & Disaster Volunteer Corps',
    callSign: 'SHIELD-GEN',
    category: 'general',
    status: 'available',
    latitude: 28.6139,
    longitude: 77.2090,
    locationAddress: 'Janpath Civil Operations Center, New Delhi',
    memberCount: 12,
    contactPhone: '+91 11 2301 5555',
    leaderName: 'Coordinator Priya Das',
    notes: 'Food & shelter logistics, community evacuation assistance, general first response.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function getLocalResponseTeams(): ResponseTeam[] {
  if (typeof window === 'undefined') return INITIAL_SEED_TEAMS
  try {
    const raw = localStorage.getItem(LOCAL_TEAMS_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(INITIAL_SEED_TEAMS))
      return INITIAL_SEED_TEAMS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_SEED_TEAMS
  }
}

export function saveLocalResponseTeams(teams: ResponseTeam[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(teams))
  window.dispatchEvent(new CustomEvent('respondai:teams_updated', { detail: teams }))
}

export async function createResponseTeam(
  data: Omit<ResponseTeam, 'teamId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const localId = `TEAM-${data.category.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`
  const now = nowISO()
  const newTeam: ResponseTeam = {
    ...data,
    teamId: localId,
    createdAt: now,
    updatedAt: now,
  }

  const current = getLocalResponseTeams()
  saveLocalResponseTeams([...current, newTeam])

  if (auth.currentUser) {
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.RESPONSE_TEAMS), newTeam)
      await updateDoc(ref, { teamId: ref.id })
      return ref.id
    } catch {}
  }
  return localId
}

export async function updateResponseTeam(id: string, data: Partial<ResponseTeam>): Promise<void> {
  const current = getLocalResponseTeams()
  const updated = current.map((t) =>
    t.teamId === id ? { ...t, ...data, updatedAt: nowISO() } : t
  )
  saveLocalResponseTeams(updated)

  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, COLLECTIONS.RESPONSE_TEAMS, id), { ...data, updatedAt: nowISO() })
    } catch {}
  }
}

export async function deleteResponseTeam(id: string): Promise<void> {
  const current = getLocalResponseTeams()
  const updated = current.filter((t) => t.teamId !== id)
  saveLocalResponseTeams(updated)

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.RESPONSE_TEAMS, id))
    } catch {}
  }
}

export async function getResponseTeams(): Promise<ResponseTeam[]> {
  const local = getLocalResponseTeams()
  if (!auth.currentUser) return local

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.RESPONSE_TEAMS))
    const cloud = snap.docs.map((d) => normalizeTimestamps(d.data() as ResponseTeam))
    const map = new Map<string, ResponseTeam>()
    for (const t of [...local, ...cloud]) {
      map.set(t.teamId, t)
    }
    return Array.from(map.values())
  } catch {
    return local
  }
}

export function subscribeToResponseTeams(
  callback: (teams: ResponseTeam[]) => void,
  onError?: (err: FirestoreError) => void
) {
  const local = getLocalResponseTeams()
  callback(local)

  const handleCustomUpdate = (e: Event) => {
    const detail = (e as CustomEvent<ResponseTeam[]>).detail || getLocalResponseTeams()
    callback(detail)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('respondai:teams_updated', handleCustomUpdate)
  }

  const unsubCloud = subscribeWithAuth(
    (emit, fail) => {
      const q = query(
        collection(db, COLLECTIONS.RESPONSE_TEAMS),
        orderBy('createdAt', 'desc')
      )
      return onSnapshot(
        q,
        (snap) => {
          const cloud = snap.docs.map((d) => normalizeTimestamps(d.data() as ResponseTeam))
          const currentLocal = getLocalResponseTeams()
          const map = new Map<string, ResponseTeam>()
          for (const item of [...currentLocal, ...cloud]) {
            map.set(item.teamId, item)
          }
          emit(Array.from(map.values()))
        },
        fail
      )
    },
    callback,
    onError
  )

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('respondai:teams_updated', handleCustomUpdate)
    }
    unsubCloud()
  }
}

/**
 * Assigns an available response team to an incident.
 * Updates incident status to 'assigned', marks the team as 'busy',
 * and records an official entry in the incident activity timeline.
 */
export async function assignTeamToIncident(
  incidentId: string,
  teamId: string,
  adminInfo?: { adminId: string; adminName: string },
  distanceKm?: number
): Promise<void> {
  const teams = getLocalResponseTeams()
  const incidents = getLocalIncidents()

  const team = teams.find((t) => t.teamId === teamId)
  const incident = incidents.find((i) => i.incidentId === incidentId)

  if (!team) throw new Error('Response team not found')

  // 1. Update incident
  await updateIncident(incidentId, {
    status: 'assigned',
    assignedTeamId: team.teamId,
    assignedTeamName: team.name,
  })

  // 2. Update response team to busy
  await updateResponseTeam(team.teamId, {
    status: 'busy',
    assignedIncidentId: incidentId,
    assignedIncidentTitle: incident?.title || 'Active Emergency Mission',
  })

  // 3. Post timeline activity update
  const distanceMsg = typeof distanceKm === 'number' && distanceKm > 0 ? ` (${distanceKm} km away)` : ''
  await addIncidentUpdate({
    incidentId,
    adminId: adminInfo?.adminId || 'admin',
    adminName: adminInfo?.adminName || 'Incident Dispatcher',
    previousStatus: incident?.status || 'reported',
    newStatus: 'assigned',
    message: `Team Dispatched: Assigned ${team.name} [Callsign: ${team.callSign || team.name}]${distanceMsg}. Leader: ${team.leaderName} (${team.contactPhone}). Team status set to BUSY.`,
    visibility: 'public',
    createdAt: nowISO(),
  })

  // 4. Log admin audit action
  await logAdminAction({
    adminId: adminInfo?.adminId || 'admin',
    adminName: adminInfo?.adminName || 'Incident Dispatcher',
    action: 'ASSIGN_RESPONSE_TEAM',
    targetType: 'incident',
    targetId: incidentId,
    details: {
      teamId: team.teamId,
      teamName: team.name,
      teamCategory: team.category,
      distanceKm,
    },
    createdAt: nowISO(),
  })
}

/**
 * Releases/unassigns a team from an incident, returning the team to 'available'.
 */
export async function unassignTeamFromIncident(
  incidentId: string,
  teamId: string,
  adminInfo?: { adminId: string; adminName: string }
): Promise<void> {
  const teams = getLocalResponseTeams()
  const team = teams.find((t) => t.teamId === teamId)

  // 1. Update incident
  await updateIncident(incidentId, {
    assignedTeamId: undefined,
    assignedTeamName: undefined,
    status: 'reported',
  })

  // 2. Update team to available
  await updateResponseTeam(teamId, {
    status: 'available',
    assignedIncidentId: null,
    assignedIncidentTitle: null,
  })

  // 3. Activity timeline log
  await addIncidentUpdate({
    incidentId,
    adminId: adminInfo?.adminId || 'admin',
    adminName: adminInfo?.adminName || 'Incident Dispatcher',
    previousStatus: 'assigned',
    newStatus: 'reported',
    message: `Response team ${team?.name || teamId} was recalled/released by dispatch. Team returned to AVAILABLE standby.`,
    visibility: 'internal',
    createdAt: nowISO(),
  })

  // 4. Admin audit log
  await logAdminAction({
    adminId: adminInfo?.adminId || 'admin',
    adminName: adminInfo?.adminName || 'Incident Dispatcher',
    action: 'UNASSIGN_RESPONSE_TEAM',
    targetType: 'incident',
    targetId: incidentId,
    details: { teamId },
    createdAt: nowISO(),
  })
}

/**
 * Ensures initial teams are populated into Firestore if empty
 */
export async function seedInitialResponseTeams(): Promise<void> {
  const local = getLocalResponseTeams()
  if (local.length === 0) {
    saveLocalResponseTeams(INITIAL_SEED_TEAMS)
  }

  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.RESPONSE_TEAMS))
      if (snap.empty) {
        for (const t of INITIAL_SEED_TEAMS) {
          const docRef = doc(db, COLLECTIONS.RESPONSE_TEAMS, t.teamId)
          await updateDoc(docRef, t as any).catch(async () => {
            await addDoc(collection(db, COLLECTIONS.RESPONSE_TEAMS), t)
          })
        }
      }
    } catch {}
  }
}


