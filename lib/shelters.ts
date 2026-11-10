import type { Incident, Shelter } from './types'
import { distanceKm } from './utils'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

export const LOCAL_SHELTERS_KEY = 'respondai:evacuation_shelters'

export const INITIAL_SHELTERS: Shelter[] = [
  { shelterId: 'SHL-CHN-01', name: 'Greater Chennai Corporation Relief Centre', address: 'Nandanam Community Hall, Chennai, Tamil Nadu', latitude: 13.0315, longitude: 80.2398, capacity: 450, occupancy: 126, status: 'open', amenities: ['Drinking water', 'First aid', 'Accessible entry'], contactPhone: '+91 44 2538 1234', updatedAt: new Date().toISOString() },
  { shelterId: 'SHL-CHN-02', name: 'Koyambedu Disaster Relief Shelter', address: 'Municipal School Campus, Koyambedu, Chennai, Tamil Nadu', latitude: 13.0699, longitude: 80.1947, capacity: 700, occupancy: 318, status: 'open', amenities: ['Medical desk', 'Food service', 'Family area'], contactPhone: '+91 44 2538 1234', updatedAt: new Date().toISOString() },
  { shelterId: 'SHL-CBE-01', name: 'Coimbatore Community Safety Centre', address: 'RS Puram Community Hall, Coimbatore, Tamil Nadu', latitude: 11.0097, longitude: 76.9549, capacity: 350, occupancy: 64, status: 'open', amenities: ['First aid', 'Power backup', 'Family area'], updatedAt: new Date().toISOString() },
  { shelterId: 'SHL-MDU-01', name: 'Madurai Municipal Relief Centre', address: 'Anna Nagar Community Hall, Madurai, Tamil Nadu', latitude: 9.9492, longitude: 78.1451, capacity: 500, occupancy: 441, status: 'open', amenities: ['Food service', 'Water', 'Women and child support'], updatedAt: new Date().toISOString() },
  { shelterId: 'SHL-DEL-01', name: 'Dwarka Sector 14 Community Shelter', address: 'Sector 14 Community Centre, Dwarka, New Delhi', latitude: 28.5851, longitude: 77.1642, capacity: 300, occupancy: 72, status: 'open', amenities: ['First aid', 'Water', 'Power backup'], updatedAt: new Date().toISOString() },
]

export function getLocalShelters(): Shelter[] {
  if (typeof window === 'undefined') return INITIAL_SHELTERS
  try {
    const raw = localStorage.getItem(LOCAL_SHELTERS_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_SHELTERS_KEY, JSON.stringify(INITIAL_SHELTERS))
      return INITIAL_SHELTERS
    }
    return JSON.parse(raw) as Shelter[]
  } catch { return INITIAL_SHELTERS }
}

export function saveLocalShelters(shelters: Shelter[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_SHELTERS_KEY, JSON.stringify(shelters))
  window.dispatchEvent(new CustomEvent('respondai:shelters_updated', { detail: shelters }))
}

export function subscribeToShelters(callback: (shelters: Shelter[]) => void) {
  callback(getLocalShelters())
  const handler = (event: Event) => callback((event as CustomEvent<Shelter[]>).detail || getLocalShelters())
  window.addEventListener('respondai:shelters_updated', handler)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_SHELTERS_KEY) callback(getLocalShelters())
  }
  window.addEventListener('storage', handleStorage)

  let unsubscribeCloud: (() => void) | undefined
  if (auth.currentUser) {
    try {
      unsubscribeCloud = onSnapshot(
        query(collection(db, 'shelters'), orderBy('updatedAt', 'desc')),
        (snapshot) => {
          const cloudShelters = snapshot.docs.map((item) => item.data() as Shelter)
          const sheltersById = new Map(getLocalShelters().map((item) => [item.shelterId, item]))
          cloudShelters.forEach((item) => sheltersById.set(item.shelterId, item))
          callback(Array.from(sheltersById.values()))
        }
      )
    } catch {
      // The local directory remains available if the device is offline.
    }
  }

  return () => {
    window.removeEventListener('respondai:shelters_updated', handler)
    window.removeEventListener('storage', handleStorage)
    unsubscribeCloud?.()
  }
}

export async function saveShelter(shelter: Shelter) {
  const shelters = getLocalShelters()
  saveLocalShelters([shelter, ...shelters.filter((item) => item.shelterId !== shelter.shelterId)])
  if (!auth.currentUser) return shelter.shelterId
  try {
    await setDoc(doc(db, 'shelters', shelter.shelterId), shelter)
  } catch {
    // Save locally first so emergency operations can continue during an outage.
  }
  return shelter.shelterId
}

export async function deleteShelter(shelterId: string) {
  saveLocalShelters(getLocalShelters().filter((shelter) => shelter.shelterId !== shelterId))
  if (!auth.currentUser) return
  try {
    await deleteDoc(doc(db, 'shelters', shelterId))
  } catch {
    // The local removal is retained and will be reconciled when cloud access returns.
  }
}

const hazardRadiusKm: Record<Incident['severity'], number> = { critical: 5, high: 3, medium: 1.5, low: 0.8 }

export interface ShelterRecommendation {
  shelter: Shelter
  distanceKm: number
  safetyScore: number
  reason: string
}

export function recommendSafeShelters(
  origin: [number, number],
  shelters: Shelter[],
  incidents: Incident[]
): ShelterRecommendation[] {
  const activeIncidents = incidents.filter((incident) => incident.status !== 'resolved')
  return shelters
    .filter((shelter) => shelter.status === 'open' && shelter.occupancy < shelter.capacity)
    .map((shelter) => {
      const distance = distanceKm(origin[0], origin[1], shelter.latitude, shelter.longitude)
      const closestHazard = activeIncidents.reduce((nearest, incident) => {
        const hazardDistance = distanceKm(shelter.latitude, shelter.longitude, incident.latitude, incident.longitude)
        return Math.min(nearest, hazardDistance / hazardRadiusKm[incident.severity])
      }, Infinity)
      const hazardPenalty = closestHazard < 1 ? 70 : closestHazard < 2 ? 25 : 0
      const capacityScore = ((shelter.capacity - shelter.occupancy) / shelter.capacity) * 25
      const safetyScore = Math.max(0, Math.round(100 - distance * 3 - hazardPenalty + capacityScore))
      const reason = hazardPenalty > 0
        ? `Selected for available capacity and safer separation from active hazards.`
        : `Open with available capacity and outside active incident caution zones.`
      return { shelter, distanceKm: Number(distance.toFixed(1)), safetyScore, reason }
    })
    .sort((a, b) => b.safetyScore - a.safetyScore || a.distanceKm - b.distanceKm)
}
