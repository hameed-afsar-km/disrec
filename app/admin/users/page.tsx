// app/admin/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Users, Search, Shield, Mail, Phone, Calendar } from 'lucide-react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AppUser } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadUsers() {
      try {
        const q = query(collection(db, 'users'), limit(50))
        const snap = await getDocs(q)
        const list = snap.docs.map((d) => d.data() as AppUser)
        setUsers(list)
      } catch (err) {
        console.error('Failed to load users:', err)
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [])

  const filtered = users.filter((u) => {
    return (
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search)
    )
  })

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <Users size={26} className="text-blue-600" />
            Citizen & User Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registered citizens, contact records, and account privilege audits
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user name, email, or telephone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* User Table */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={6} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No registered users found" description="Users who sign up will appear in this directory." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Phone Number</th>
                  <th className="p-3.5">Emergency Contacts</th>
                  <th className="p-3.5">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#101b2d] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {u.name?.[0] || u.email?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name || 'Anonymous'}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          u.role === 'admin' || u.role === 'super_admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role?.replace('_', ' ') || 'User'}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono text-xs">
                      {u.phone || '—'}
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-slate-600">
                      {u.emergencyContacts?.length || 0} designated
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-slate-400 text-xs">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

