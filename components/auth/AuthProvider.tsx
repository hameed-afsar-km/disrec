// components/auth/AuthProvider.tsx
// Global authentication context — supports Firebase Auth and evaluation Mock Auth
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUser } from '@/lib/firestore'
import type { AppUser } from '@/lib/types'
import { getMockSession, clearMockSession, type MockSession } from '@/lib/mock-auth'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  appUser: AppUser | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadAppUser(fbUser: FirebaseUser) {
    try {
      let data = await getUser(fbUser.uid)
      if (!data) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        data = await getUser(fbUser.uid)
      }
      setAppUser(data)
    } catch {
      setAppUser(null)
    }
  }

  function syncMockSession() {
    const mock = getMockSession()
    if (mock) {
      const mockAppUser: AppUser = {
        uid: mock.uid,
        name: mock.name,
        email: mock.email,
        phone: mock.phone,
        role: mock.role,
        preferredLanguage: 'en',
        emergencyContacts: [],
        notificationPreferences: {
          email: true,
          push: true,
          nearby: true,
          radius: 10,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setAppUser(mockAppUser)
      // Provide a synthetic minimal FirebaseUser shape
      setFirebaseUser({
        uid: mock.uid,
        displayName: mock.name,
        email: mock.email,
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock-token',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: mock.phone || null,
        photoURL: null,
        providerId: 'mock',
      } as unknown as FirebaseUser)
      setLoading(false)
      return true
    }
    return false
  }

  async function refreshUser() {
    if (syncMockSession()) return
    if (firebaseUser) {
      await loadAppUser(firebaseUser)
    }
  }

  useEffect(() => {
    // Check local mock session first
    if (syncMockSession()) {
      setLoading(false)
    }

    const handleMockChanged = () => {
      if (!syncMockSession()) {
        setFirebaseUser(null)
        setAppUser(null)
      }
    }
    window.addEventListener('mock-auth-changed', handleMockChanged)

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // If a mock session is active, do not overwrite with null fbUser
      if (getMockSession()) {
        syncMockSession()
        return
      }

      setFirebaseUser(fbUser)
      if (fbUser) {
        await loadAppUser(fbUser)
      } else {
        setAppUser(null)
      }
      setLoading(false)
    })

    return () => {
      unsubscribe()
      window.removeEventListener('mock-auth-changed', handleMockChanged)
    }
  }, [])

  const adminRoles = ['admin', 'super_admin', 'incident_manager', 'monitoring_admin', 'alert_manager']
  const isAdmin = !!appUser && adminRoles.includes(appUser.role)

  async function handleSignOut() {
    clearMockSession()
    try {
      await fbSignOut(auth)
    } catch {
      // ignore
    }
    setFirebaseUser(null)
    setAppUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, appUser, loading, isAdmin, signOut: handleSignOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
