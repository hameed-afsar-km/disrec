// lib/mock-auth.ts
// Handles mock quick credentials and sample Aadhaar + OTP verification for evaluation and testing.

import type { AppUser, UserRole } from './types'

export interface MockSession {
  uid: string
  name: string
  email: string
  role: UserRole
  phone?: string
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
  name: 'Aadhaar Verified Citizen',
  email: 'aadhaar.123321456654@respondai.local',
  role: 'user',
  phone: '+91 98765 12345',
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

export function clearMockSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  document.cookie = `auth-token=; path=/; max-age=0`
  document.cookie = `user-role=; path=/; max-age=0`
  window.dispatchEvent(new Event('mock-auth-changed'))
}

