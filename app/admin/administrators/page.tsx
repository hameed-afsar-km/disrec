// app/admin/administrators/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShieldCheck, UserPlus, Shield, Clock } from 'lucide-react'
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AppUser, UserRole } from '@/lib/types'
import { toast } from 'sonner'
import { logAdminAction, nowISO } from '@/lib/firestore'
import { useAuth } from '@/components/auth/AuthProvider'

export default function AdminAdministratorsPage() {
  const { firebaseUser, appUser } = useAuth()
  const [admins, setAdmins] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  // Provisioning state
  const [targetEmail, setTargetEmail] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('incident_manager')
  const [promoting, setPromoting] = useState(false)

  useEffect(() => {
    loadAdmins()
  }, [])

  async function loadAdmins() {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', 'in', [
          'admin',
          'super_admin',
          'incident_manager',
          'monitoring_admin',
          'alert_manager',
        ])
      )
      const snap = await getDocs(q)
      setAdmins(snap.docs.map((d) => d.data() as AppUser))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handlePromoteUser(e: React.FormEvent) {
    e.preventDefault()
    if (!targetEmail.trim()) return
    setPromoting(true)

    try {
      // Find user by email
      const q = query(collection(db, 'users'), where('email', '==', targetEmail.trim().toLowerCase()))
      const snap = await getDocs(q)

      if (snap.empty) {
        toast.error('No registered user found with this email. Citizen must register first.')
        return
      }

      const targetDoc = snap.docs[0]
      await updateDoc(doc(db, 'users', targetDoc.id), {
        role: newRole,
        updatedAt: nowISO(),
      })

      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'PROVISION_ADMIN_ROLE',
        targetType: 'admin',
        targetId: targetDoc.id,
        details: { email: targetEmail, assignedRole: newRole },
        createdAt: nowISO(),
      })

      toast.success(`User role upgraded to ${newRole.replace('_', ' ')}!`)
      setTargetEmail('')
      await loadAdmins()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update administrator role.')
    } finally {
      setPromoting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <ShieldCheck size={26} className="text-blue-600" />
            Administrator Roles & Access Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provision verified personnel, configure command center privileges, and review audit records
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Admins List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-bold text-sm text-[#101b2d]">Current Operational Administrators</h2>
            </CardHeader>
            <CardBody className="p-0">
              {admins.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading administrators...</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {admins.map((adm) => (
                    <div key={adm.uid} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                          {adm.name?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{adm.name}</p>
                          <p className="text-xs text-slate-400">{adm.email}</p>
                        </div>
                      </div>

                      <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full capitalize">
                        {adm.role?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Role Provisioning Card */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
                <UserPlus size={16} className="text-blue-600" />
                Provision Administrator
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handlePromoteUser} className="space-y-3.5 text-xs">
                <p className="text-slate-500 leading-relaxed">
                  Assign administrative privileges to an already registered user account.
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Email Address</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Operational Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                  >
                    <option value="super_admin">Super Admin (Full System Control)</option>
                    <option value="incident_manager">Incident Manager (Triage & Statuses)</option>
                    <option value="monitoring_admin">Monitoring Admin (Heatmap & Alerts)</option>
                    <option value="alert_manager">Alert Manager (Broadcast Warnings)</option>
                  </select>
                </div>

                <Button type="submit" variant="primary" size="sm" className="w-full mt-2" loading={promoting}>
                  Upgrade Account Role
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

