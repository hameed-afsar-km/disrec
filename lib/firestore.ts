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
import { db } from './firebase'
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
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
  if (!snap.exists()) return null
  return normalizeTimestamps(snap.data() as AppUser)
}

export async function createUser(uid: string, data: Omit<AppUser, 'uid'>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), { uid, ...data }).catch(async () => {
    // Document doesn't exist yet — use set via updateDoc won't work, so we use setDoc
    const { setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, COLLECTIONS.USERS, uid), { uid, ...data })
  })
}

export async function updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), { ...data, updatedAt: nowISO() })
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export async function createIncident(data: Omit<Incident, 'incidentId'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.INCIDENTS), data)
  await updateDoc(ref, { incidentId: ref.id })
  return ref.id
}

export async function getIncident(id: string): Promise<Incident | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.INCIDENTS, id))
  if (!snap.exists()) return null
  return normalizeTimestamps(snap.data() as Incident)
}

export async function updateIncident(id: string, data: Partial<Incident>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.INCIDENTS, id), { ...data, updatedAt: nowISO() })
}

export async function getUserIncidents(uid: string): Promise<Incident[]> {
  const q = query(
    collection(db, COLLECTIONS.INCIDENTS),
    where('reporterId', '==', uid),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => normalizeTimestamps(d.data() as Incident))
}

export function subscribeToIncident(
  id: string,
  callback: (incident: Incident | null) => void,
  onError?: (err: FirestoreError) => void
) {
  return onSnapshot(
    doc(db, COLLECTIONS.INCIDENTS, id),
    (snap) => callback(snap.exists() ? normalizeTimestamps(snap.data() as Incident) : null),
    onError
  )
}

export function subscribeToAllIncidents(
  callback: (incidents: Incident[]) => void,
  constraints: QueryConstraint[] = []
) {
  const q = query(
    collection(db, COLLECTIONS.INCIDENTS),
    orderBy('createdAt', 'desc'),
    ...constraints
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => normalizeTimestamps(d.data() as Incident)))
  )
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

export function subscribeToUserSOS(uid: string, callback: (requests: SOSRequest[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.SOS_REQUESTS),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(10)
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => normalizeTimestamps(d.data() as SOSRequest)))
  )
}

export function subscribeToAllSOS(callback: (requests: SOSRequest[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.SOS_REQUESTS),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => normalizeTimestamps(d.data() as SOSRequest)))
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
  callback: (notifications: Notification[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => normalizeTimestamps(d.data() as Notification)))
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

export function subscribeToActiveAlerts(callback: (alerts: EmergencyAlert[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.EMERGENCY_ALERTS),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => normalizeTimestamps(d.data() as EmergencyAlert)))
  )
}

// ─── Admin Audit Logs ─────────────────────────────────────────────────────────

export async function logAdminAction(data: Omit<AdminAuditLog, 'logId'>): Promise<void> {
  const ref = await addDoc(collection(db, COLLECTIONS.ADMIN_AUDIT_LOGS), data)
  await updateDoc(ref, { logId: ref.id })
}

