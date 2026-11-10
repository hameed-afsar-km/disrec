// lib/mock-auth.ts
// Handles mock quick credentials and sample Aadhaar + OTP verification and linked family checking.

import type { AppUser, UserRole } from './types'

export interface FamilyMember {
  id: string
  name: string
  relation: 'Spouse' | 'Child' | 'Parent' | 'Sibling'
  age: number
  aadhaarLast4: string
  status: 'Safe' | 'Affected' | 'Unknown'
  phone?: string
  lastKnownLocation?: string
}

export interface MockSession {
  uid: string
  name: string
  email: string
  role: UserRole
  phone?: string
  aadhaarNumber?: string
  familyMembers?: FamilyMember[]
}

export const MOCK_USERS: Record<string, { pass: string; user: MockSession }> = {
  user: {
    pass: 'user',
    user: {
      uid: 'mock-user-citizen-001',
      name: 'Demo Citizen User',
      email: 'user@respondai.local',
      role: 'user',
      phone: '+91 98765 43210',
      aadhaarNumber: '123321456654',
      familyMembers: [
        {
          id: 'fam-01',
          name: 'Sunita Sharma',
          relation: 'Spouse',
          age: 38,
          aadhaarLast4: '8891',
          status: 'Safe',
          phone: '+91 98765 43211',
          lastKnownLocation: 'Home, Sector 14, Dwarka',
        },
        {
          id: 'fam-02',
          name: 'Aarav Sharma',
          relation: 'Child',
          age: 14,
          aadhaarLast4: '3412',
          status: 'Safe',
          phone: '+91 98765 43212',
          lastKnownLocation: 'Public School, Block C',
        },
        {
          id: 'fam-03',
          name: 'Ramesh Sharma',
          relation: 'Parent',
          age: 68,
          aadhaarLast4: '9920',
          status: 'Safe',
          phone: '+91 98765 43213',
          lastKnownLocation: 'Home, Sector 14, Dwarka',
        },
      ],
    },
  },
  admin: {
    pass: 'admin',
    user: {
      uid: 'mock-admin-operator-001',
      name: 'Command Duty Administrator',
      email: 'admin@respondai.local',
      role: 'super_admin',
      phone: '+91 99999 88888',
    },
  },
}

export const SAMPLE_AADHAAR = '123321456654'
export const SAMPLE_AADHAAR_OTP = '123456'

export const SAMPLE_AADHAAR_USER: MockSession = {
  uid: 'mock-aadhaar-123321456654',
  name: 'Rajesh Sharma (Aadhaar Verified)',
  email: 'aadhaar.123321456654@respondai.local',
  role: 'user',
  phone: '+91 98765 12345',
  aadhaarNumber: '123321456654',
  familyMembers: [
    {
      id: 'fam-101',
      name: 'Sunita Sharma',
      relation: 'Spouse',
      age: 38,
      aadhaarLast4: '8891',
      status: 'Safe',
      phone: '+91 98765 43211',
      lastKnownLocation: 'Home, Sector 14, Dwarka',
    },
    {
      id: 'fam-102',
      name: 'Aarav Sharma',
      relation: 'Child',
      age: 14,
      aadhaarLast4: '3412',
      status: 'Safe',
      phone: '+91 98765 43212',
      lastKnownLocation: 'Public School, Block C',
    },
    {
      id: 'fam-103',
      name: 'Ramesh Sharma',
      relation: 'Parent',
      age: 68,
      aadhaarLast4: '9920',
      status: 'Safe',
      phone: '+91 98765 43213',
      lastKnownLocation: 'Home, Sector 14, Dwarka',
    },
  ],
}

const STORAGE_KEY = 'respondai_mock_session'

export function setMockSession(session: MockSession) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  // Set cookies for Next.js middleware protection
  document.cookie = `auth-token=mock-${session.uid}; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `user-role=${session.role}; path=/; max-age=86400; SameSite=Lax`
  // Dispatch custom event to notify components
  window.dispatchEvent(new Event('mock-auth-changed'))
}

export function getMockSession(): MockSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MockSession
  } catch {
    return null
  }
}

export function updateFamilyMemberStatus(memberId: string, status: 'Safe' | 'Affected' | 'Unknown') {
  const current = getMockSession()
  if (!current || !current.familyMembers) return
  const updatedMembers = current.familyMembers.map((m) =>
    m.id === memberId ? { ...m, status } : m
  )
  const updatedSession = { ...current, familyMembers: updatedMembers }
  setMockSession(updatedSession)
}

export function clearMockSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  document.cookie = `auth-token=; path=/; max-age=0`
  document.cookie = `user-role=; path=/; max-age=0`
  window.dispatchEvent(new Event('mock-auth-changed'))
}
