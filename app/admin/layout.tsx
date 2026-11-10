// app/admin/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopbar } from '@/components/layout/AdminTopbar'
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { firebaseUser, appUser, isAdmin, loading } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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
    <div className="min-h-screen bg-[#f4f6fa] flex">
      {/* Sidebar */}
      <AdminSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:ml-[240px] min-w-0">
        <AdminTopbar onToggle={() => setMobileSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  )
}
