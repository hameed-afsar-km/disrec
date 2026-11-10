// app/admin/alerts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SeverityBadge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import {
  Radio, Plus, AlertTriangle, MapPin, Calendar, Clock,
  CheckCircle, Trash2, Shield
} from 'lucide-react'
import {
  createAlert,
  updateAlert,
  subscribeToActiveAlerts,
  logAdminAction,
  nowISO
} from '@/lib/firestore'
import { useAuth } from '@/components/auth/AuthProvider'
import { formatDateTime, timeAgo } from '@/lib/utils'
import type { EmergencyAlert, EmergencyCategory, Severity, AlertStatus } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@/lib/types'
import { toast } from 'sonner'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function AdminAlertsPage() {
  const { firebaseUser, appUser } = useAuth()
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [loading, setLoading] = useState(true)

  // Creation form modal state
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<EmergencyCategory>('natural_disaster')
  const [severity, setSeverity] = useState<Severity>('high')
  const [centerLocation, setCenterLocation] = useState('')
  const [radius, setRadius] = useState<number>(15)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const unsub = subscribeToActiveAlerts((data) => {
      setAlerts(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function handleCreateAlert(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !centerLocation.trim()) {
      toast.error('Please complete all required broadcast fields.')
      return
    }

    setCreating(true)
    try {
      const now = nowISO()
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours default

      const alertData: Omit<EmergencyAlert, 'alertId'> = {
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        centerLocation: centerLocation.trim(),
        centerLatitude: 0,
        centerLongitude: 0,
        radius: Number(radius) || 15,
        status: 'published',
        expiresAt: expiry,
        createdBy: firebaseUser?.uid || 'admin',
        createdByName: appUser?.name || 'Emergency Coordinator',
        createdAt: now,
      }

      const alertId = await createAlert(alertData)

      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'PUBLISH_EMERGENCY_BROADCAST',
        targetType: 'alert',
        targetId: alertId,
        details: { title, category, severity, radius },
        createdAt: now,
      })

      toast.success('Emergency Broadcast Published!')
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setCenterLocation('')
    } catch {
      toast.error('Failed to publish emergency alert.')
    } finally {
      setCreating(false)
    }
  }

  async function handleExpireAlert(alertId: string) {
    try {
      await updateAlert(alertId, { status: 'expired' })
      toast.info('Emergency alert marked as expired.')
    } catch {
      toast.error('Failed to expire alert.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <Radio size={26} className="text-[#e53945]" />
            Emergency Broadcasts & Alerts Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dispatch geographic crisis warnings and emergency announcements to citizens
          </p>
        </div>

        <Button variant="danger" size="md" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create Emergency Broadcast
        </Button>
      </div>

      {/* Broadcast Creation Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#101b2d] flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              New Emergency Broadcast
            </h2>

            <form onSubmit={handleCreateAlert} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Headline *</label>
                <input
                  type="text"
                  placeholder="e.g., Flash Flood Warning: Immediate Evacuation of Sector 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Broadcast Instructions & Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Clear instructions: avoid bridge crossings, relocate to designated high school shelter..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EmergencyCategory)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
                  >
                    <option value="critical">Critical (Immediate Hazard)</option>
                    <option value="high">High Warning</option>
                    <option value="medium">Medium Advisory</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Center Location *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. South Riverside District"
                    value={centerLocation}
                    onChange={(e) => setCenterLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Broadcast Radius ({radius} km)
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full accent-red-600 mt-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" size="sm" loading={creating}>
                  Issue Broadcast Now
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast List */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={5} />
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="p-8 text-center text-xs text-slate-400">
          No active emergency alerts currently published.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((al) => (
            <Card key={al.alertId} className="border-2 border-red-300 p-5 space-y-3 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={al.severity} />
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {CATEGORY_LABELS[al.category]}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Radius: {al.radius} km
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#101b2d]">{al.title}</h3>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-red-600"
                  onClick={() => handleExpireAlert(al.alertId)}
                >
                  Expire Alert
                </Button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {al.description}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>📍 Center: {al.centerLocation}</span>
                <span>Issued by {al.createdByName} ({timeAgo(al.createdAt)})</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

