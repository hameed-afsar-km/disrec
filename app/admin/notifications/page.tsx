// app/admin/notifications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bell, Send, ShieldAlert, Users, Radio } from 'lucide-react'
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logAdminAction, nowISO } from '@/lib/firestore'
import { useAuth } from '@/components/auth/AuthProvider'
import { formatDateTime, timeAgo } from '@/lib/utils'
import type { Notification } from '@/lib/types'
import { toast } from 'sonner'

export default function AdminNotificationsPage() {
  const { firebaseUser, appUser } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Dispatch broadcast
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadBroadcasts()
  }, [])

  async function loadBroadcasts() {
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(30))
      const snap = await getDocs(q)
      setNotifications(snap.docs.map((d) => d.data() as Notification))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSending(true)

    try {
      const now = nowISO()
      // Send to notifications collection with target 'all'
      const notifRef = await addDoc(collection(db, 'notifications'), {
        userId: 'all',
        title: title.trim(),
        message: message.trim(),
        type: 'emergency_broadcast',
        read: false,
        createdAt: now,
      })

      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'SEND_SYSTEM_NOTIFICATION',
        targetType: 'alert',
        targetId: notifRef.id,
        details: { title },
        createdAt: now,
      })

      toast.success('System broadcast delivered!')
      setTitle('')
      setMessage('')
      await loadBroadcasts()
    } catch {
      toast.error('Failed to send broadcast.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <Bell size={26} className="text-blue-600" />
            System Broadcasts & Incident Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dispatch announcements and inspect real-time user notification logs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Broadcast Card */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
                <Radio size={16} className="text-red-500" /> Dispatch System Push
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notice Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Server Maintenance or City Advisory"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    placeholder="Provide clear details and guidance for all active platform users..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <Button type="submit" variant="primary" size="sm" className="w-full" loading={sending}>
                  <Send size={13} /> Dispatch Notification
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Recent Notifications Log */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-bold text-sm text-[#101b2d]">Delivered Notifications Log</h2>
            </CardHeader>
            <CardBody className="p-0">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No recent notifications logged.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {notifications.map((n, i) => (
                    <div key={i} className="p-3.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        <span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Target: {n.userId} • Type: {n.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

