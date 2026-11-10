// app/(public)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  AlertTriangle, Radio, MapPin, Bell, Shield, ArrowRight,
  Clock, Navigation, CheckCircle, FileText, ChevronRight
} from 'lucide-react'
import { getUserIncidents, subscribeToUserNotifications } from '@/lib/firestore'
import { timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, Notification } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'

export default function UserDashboard() {
  const router = useRouter()
  const { firebaseUser, appUser, loading: authLoading } = useAuth()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'granted' | 'denied'>('idle')

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login?redirect=/dashboard')
    }
  }, [authLoading, firebaseUser, router])

  useEffect(() => {
    if (!firebaseUser) return

    async function loadData() {
      try {
        const userIncs = await getUserIncidents(firebaseUser!.uid)
        setIncidents(userIncs)
      } catch (err) {
        console.error('Failed to load user incidents:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    const unsubNotifs = subscribeToUserNotifications(firebaseUser.uid, (notifs) => {
      setNotifications(notifs)
    })

    return () => unsubNotifs()
  }, [firebaseUser])

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      return
    }
    setLocationStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('granted')
      },
      () => setLocationStatus('denied'),
      { timeout: 8000 }
    )
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved')
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved')
  const unreadNotifs = notifications.filter((n) => !n.read)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101b2d]">
            Welcome back, {appUser?.name || firebaseUser?.displayName || 'User'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Emergency operations, your incident reports, and community alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sos">
            <Button variant="danger" size="md" className="sos-active">
              <AlertTriangle size={16} />
              Emergency SOS
            </Button>
          </Link>
          <Link href="/report">
            <Button variant="primary" size="md">
              <Radio size={16} />
              Report Emergency
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Submitted"
          value={incidents.length}
          icon={<FileText size={22} />}
          color="blue"
        />
        <StatCard
          label="Active Incidents"
          value={activeIncidents.length}
          icon={<AlertTriangle size={22} />}
          color={activeIncidents.length > 0 ? 'red' : 'slate'}
        />
        <StatCard
          label="Resolved Reports"
          value={resolvedIncidents.length}
          icon={<CheckCircle size={22} />}
          color="green"
        />
        <StatCard
          label="Unread Alerts"
          value={unreadNotifs.length}
          icon={<Bell size={22} />}
          color={unreadNotifs.length > 0 ? 'orange' : 'slate'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Incidents (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#101b2d] flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              My Recent Reports
            </h2>
            <Link
              href="/my-reports"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View all ({incidents.length}) <ChevronRight size={14} />
            </Link>
          </div>

          {incidents.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Shield size={40} />}
                title="No emergencies reported yet"
                description="When you report incidents or hazards, they will appear here with live progress updates."
                action={
                  <Link href="/report">
                    <Button variant="primary" size="sm">
                      Report an Incident
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 5).map((inc) => (
                <Link key={inc.incidentId} href={`/my-reports/${inc.incidentId}`}>
                  <Card hover className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="text-2xl p-2 bg-slate-50 border border-slate-100 rounded-lg shrink-0">
                        {categoryIcons[inc.category] || '⚠️'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-slate-400">
                            #{inc.incidentId.slice(-6)}
                          </span>
                          <SeverityBadge severity={inc.severity} />
                          <StatusBadge status={inc.status} />
                        </div>
                        <h3 className="font-semibold text-sm text-[#101b2d] truncate">
                          {inc.title}
                        </h3>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="shrink-0" />
                          {inc.location} • {timeAgo(inc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Location, Map Preview, Notifications (1 col) */}
        <div className="space-y-6">
          {/* Location & GPS Awareness */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm text-[#101b2d] flex items-center gap-2">
                <Navigation size={16} className="text-blue-600" />
                Location & Awareness
              </h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {locationStatus === 'granted' && userLocation ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-green-600" /> GPS Active
                  </div>
                  <div>Coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</div>
                  <Link href="/nearby-alerts" className="text-green-900 underline font-medium block mt-1">
                    Check nearby alerts within 10 km →
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-500 mb-3">
                    Enable GPS to receive immediate location-based alerts and nearby incident notifications.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={requestLocation}
                    loading={locationStatus === 'detecting'}
                  >
                    <Navigation size={14} />
                    {locationStatus === 'denied' ? 'Retry GPS Permission' : 'Share My Location'}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Live Map Preview Teaser */}
          <Card>
            <CardBody className="p-0 overflow-hidden relative group">
              <div className="h-36 bg-gradient-to-br from-slate-800 to-navy-900 flex flex-col items-center justify-center text-white p-4 text-center">
                <MapPin size={28} className="text-[#e53945] mb-2 animate-bounce" />
                <h4 className="font-bold text-sm">Interactive Live Map</h4>
                <p className="text-xs text-slate-300 mt-1">View real-time incidents & heatmaps</p>
              </div>
              <Link
                href="/live-map"
                className="block p-3 bg-white text-center font-medium text-xs text-blue-600 hover:text-blue-800 border-t border-slate-100"
              >
                Open Full Screen Live Map →
              </Link>
            </CardBody>
          </Card>

          {/* Notifications Quick Preview */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#101b2d] flex items-center gap-2">
                <Bell size={16} className="text-amber-500" />
                Recent Notifications
              </h3>
              <Link href="/notifications" className="text-xs text-blue-600 hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardBody>
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
              ) : (
                <div className="space-y-2.5">
                  {notifications.slice(0, 3).map((n) => (
                    <div
                      key={n.notificationId}
                      className={`p-2.5 rounded-lg text-xs border ${
                        n.read ? 'bg-slate-50 border-slate-100' : 'bg-blue-50/50 border-blue-200'
                      }`}
                    >
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-slate-600 mt-0.5 line-clamp-1">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {timeAgo(n.createdAt)}
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

