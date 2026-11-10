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
} from './types'

// ─── Collection References ────────────────────────────────────────────────────

export const COLLECTIONS = {
  USERS: 'users',
  INCIDENTS: 'incidents',
  INCIDENT_UPDATES: 'incident_updates',
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
  if (typeof window !== 'undefined') {
    const current = getLocalIncidents()
    const updated = current.map((i) =>
      i.incidentId === id ? { ...i, ...data, updatedAt: nowISO() } : i
    )
    localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('respondai:incidents_updated', { detail: updated }))
  }

  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, COLLECTIONS.INCIDENTS, id), { ...data, updatedAt: nowISO() })
    } catch {}
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

// ─── Incident Updates ─────────────────────────────────────────────────────────

export async function addIncidentUpdate(data: Omit<IncidentUpdate, 'updateId'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.INCIDENT_UPDATES), data)
  await updateDoc(ref, { updateId: ref.id })
  return ref.id
}

export async function getIncidentUpdates(incidentId: string): Promise<IncidentUpdate[]> {
  const q = query(
    collection(db, COLLECTIONS.INCIDENT_UPDATES),
    where('incidentId', '==', incidentId),
    orderBy('createdAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => normalizeTimestamps(d.data() as IncidentUpdate))
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

