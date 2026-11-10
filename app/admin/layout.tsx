// app/admin/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopbar } from '@/components/layout/AdminTopbar'
import { cn } from '@/lib/utils'

const SIDEBAR_STORAGE_KEY = 'disrec-admin-sidebar-collapsed'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { firebaseUser, isAdmin, loading } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.push('/login?redirect=/admin/dashboard')
      } else if (!isAdmin) {
        // If logged in as regular user, redirect to user dashboard
        router.push('/dashboard')
      }
    }
  }, [loading, firebaseUser, isAdmin, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-transparent flex">
      {/* Sidebar */}
      <AdminSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      {/* Main Container */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out',
          sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-[240px]'
        )}
      >
        <AdminTopbar
          onToggle={() => setMobileSidebarOpen((v) => !v)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  )
}
