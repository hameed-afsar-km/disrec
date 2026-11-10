// app/admin/sos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SOSStatusBadge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  AlertOctagon, CheckCircle2, Clock, Phone, MapPin,
  MessageSquare, User, ShieldAlert
} from 'lucide-react'
import {
  subscribeToAllSOS,
  updateSOS,
  logAdminAction,
  nowISO
} from '@/lib/firestore'
import { useAuth } from '@/components/auth/AuthProvider'
import { formatDateTime, timeAgo } from '@/lib/utils'
import type { SOSRequest, SOSStatus } from '@/lib/types'
import { toast } from 'sonner'

export default function AdminSOSPage() {
  const { firebaseUser, appUser } = useAuth()
  const [sosList, setSosList] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Status notes modal/state
  const [activeModalId, setActiveModalId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const unsub = subscribeToAllSOS((data) => {
      setSosList(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function handleAcknowledge(sos: SOSRequest) {
    try {
      await updateSOS(sos.sosId, {
        status: 'acknowledged',
        acknowledgedAt: nowISO(),
      })
      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'ACKNOWLEDGE_SOS',
        targetType: 'sos',
        targetId: sos.sosId,
        details: { user: sos.userName },
        createdAt: nowISO(),
      })
      toast.success(`SOS #${sos.sosId.slice(-6)} acknowledged!`)
    } catch {
      toast.error('Failed to acknowledge SOS.')
    }
  }

  async function handleSetStatus(sosId: string, status: SOSStatus, notes?: string) {
    setUpdating(true)
    try {
      const payload: Partial<SOSRequest> = { status }
      if (status === 'resolved') payload.resolvedAt = nowISO()
      if (notes) payload.adminNotes = notes

      await updateSOS(sosId, payload)
      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'UPDATE_SOS_STATUS',
        targetType: 'sos',
        targetId: sosId,
        details: { status, notes },
        createdAt: nowISO(),
      })
      toast.success(`SOS status updated to ${status}`)
      setActiveModalId(null)
      setNoteText('')
    } catch {
      toast.error('Failed to update SOS status.')
    } finally {
      setUpdating(false)
    }
  }

  const activeSignals = sosList.filter((s) => s.status === 'active')
  const acknowledgedSignals = sosList.filter((s) => s.status === 'acknowledged' || s.status === 'in_progress')
  const resolvedSignals = sosList.filter((s) => s.status === 'resolved' || s.status === 'cancelled')

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <AlertOctagon size={26} className="text-[#e53945]" />
            SOS Distress Monitoring Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time citizen SOS distress calls with GPS locations and dispatch status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            {activeSignals.length} Active Distress Calls
          </span>
        </div>
      </div>

      {/* Critical Active Signals Queue */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
          <ShieldAlert size={15} /> Immediate Action Required ({activeSignals.length})
        </h2>

        {activeSignals.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-400">
            No unacknowledged SOS emergency signals at this moment.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSignals.map((sos) => (
              <Card key={sos.sosId} className="border-2 border-red-500 bg-red-50/40 p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-900">
                        #{sos.sosId.slice(-6)}
                      </span>
                      <span className="bg-red-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded">
                        {sos.emergencyType || 'EMERGENCY'}
                      </span>
                      <span className="text-[11px] text-red-700 font-medium">
                        {timeAgo(sos.createdAt)}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mt-1">{sos.userName}</h3>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleAcknowledge(sos)}
                  >
                    Acknowledge SOS
                  </Button>
                </div>

                <p className="text-xs text-slate-700 bg-white p-2.5 rounded border border-red-200">
                  {sos.description || 'Emergency SOS initiated.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-red-200/60">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin size={13} className="text-red-500 shrink-0" /> {sos.location}
                  </span>
                  {sos.userPhone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone size={13} className="text-blue-500 shrink-0" /> {sos.userPhone}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Acknowledged & In-Progress Signals */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
          <Clock size={15} /> In-Progress Dispatch ({acknowledgedSignals.length})
        </h2>

        {acknowledgedSignals.length === 0 ? (
          <Card className="p-4 text-center text-xs text-slate-400">
            No incidents currently under active dispatch.
          </Card>
        ) : (
          <div className="space-y-3">
            {acknowledgedSignals.map((sos) => (
              <Card key={sos.sosId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      #{sos.sosId.slice(-6)}
                    </span>
                    <SOSStatusBadge status={sos.status} />
                    <span className="text-xs uppercase font-bold text-slate-600">
                      {sos.emergencyType}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(sos.createdAt)}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{sos.userName}</p>
                  <p className="text-xs text-slate-500">{sos.location}</p>
                  {sos.adminNotes && (
                    <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                      <strong>Notes:</strong> {sos.adminNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setActiveModalId(sos.sosId)}
                  >
                    Update Notes
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs bg-green-600 hover:bg-green-700"
                    onClick={() => handleSetStatus(sos.sosId, 'resolved')}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Notes modal for in-progress SOS */}
      {activeModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-[#101b2d]">Add Dispatch / Responder Notes</h3>
            <textarea
              rows={3}
              placeholder="e.g. Unit 4 dispatched to location, ETA 6 minutes..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveModalId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={updating}
                onClick={() => handleSetStatus(activeModalId, 'in_progress', noteText)}
              >
                Save Dispatch Note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

