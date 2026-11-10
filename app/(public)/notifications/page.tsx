// app/(public)/notifications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import {
  Bell, CheckCheck, Radio, AlertTriangle, ShieldCheck,
  Info, ExternalLink, Trash2
} from 'lucide-react'
import {
  subscribeToUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '@/lib/firestore'
import { formatDateTime, timeAgo } from '@/lib/utils'
import type { Notification } from '@/lib/types'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login?redirect=/notifications')
    }
  }, [authLoading, firebaseUser, router])

  useEffect(() => {
    if (!firebaseUser) return

    const unsub = subscribeToUserNotifications(firebaseUser.uid, (data) => {
      setNotifications(data)
      setLoading(false)
    })

    return () => unsub()
  }, [firebaseUser])

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id)
    } catch {
      toast.error('Failed to update notification status.')
    }
  }

  async function handleMarkAll() {
    if (!firebaseUser) return
    try {
      await markAllNotificationsRead(firebaseUser.uid)
      toast.success('All notifications marked as read.')
    } catch {
      toast.error('Failed to mark all as read.')
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101b2d] flex items-center gap-2">
            <Bell size={24} className="text-blue-600" />
            Alerts & Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Status updates on your reports, SOS coordination alerts, and emergency broadcasts
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll}>
            <CheckCheck size={16} /> Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={5} />
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell size={40} />}
            title="No notifications"
            description="You will receive alerts here when incident statuses change or broadcasts are issued."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isAlert = n.type === 'critical_alert' || n.type === 'emergency_broadcast'
            return (
              <Card
                key={n.notificationId}
                className={`p-4 transition-colors ${
                  !n.read ? 'border-blue-300 bg-blue-50/30' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isAlert ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {isAlert ? <AlertTriangle size={18} /> : <Info size={18} />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#101b2d]">{n.title}</h3>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(n.createdAt)} ({timeAgo(n.createdAt)})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.notificationId)}
                        className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1"
                        title="Mark read"
                      >
                        Mark read
                      </button>
                    )}
                    {n.relatedId && (
                      <Link
                        href={`/my-reports/${n.relatedId}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        View <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

