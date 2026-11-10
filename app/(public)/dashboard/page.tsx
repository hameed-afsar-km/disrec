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
import { EmergencyMapContainer } from '@/components/map/MapContainer'
import {
  AlertTriangle, Radio, MapPin, Bell, Shield, ArrowRight,
  Clock, Navigation, CheckCircle, FileText, ChevronRight,
  Users, Fingerprint, Phone, HeartPulse, AlertCircle
} from 'lucide-react'
import { getUserIncidents, subscribeToUserNotifications } from '@/lib/firestore'
import { timeAgo, categoryIcons } from '@/lib/utils'
import { updateFamilyMemberStatus } from '@/lib/mock-auth'
import type { Incident, Notification } from '@/lib/types'
import { toast } from 'sonner'
import { CATEGORY_LABELS } from '@/lib/types'

export default function UserDashboard() {
  const router = useRouter()
  const { firebaseUser, appUser, loading: authLoading } = useAuth()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'granted' | 'denied'>('idle')
  const [focusedFamilyId, setFocusedFamilyId] = useState<string | null>(null)

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
  const focusedFamily = appUser?.familyMembers?.find((member) => member.id === focusedFamilyId)
  const familyMapCenter: [number, number] =
    typeof focusedFamily?.latitude === 'number' && typeof focusedFamily.longitude === 'number'
      ? [focusedFamily.latitude, focusedFamily.longitude]
      : userLocation
      ? [userLocation.lat, userLocation.lng]
      : [28.582, 77.166]

  function locateFamilyMember(memberId: string) {
    setFocusedFamilyId(memberId)
    document.getElementById('family-safety-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

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

      {/* Primary situational awareness workspace */}
      {appUser?.aadhaarNumber && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card id="family-safety-map" className="xl:col-span-2 overflow-hidden border-blue-200 shadow-lg shadow-blue-950/5">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 text-white border-none">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Live safety view</p>
                <h2 className="mt-1 text-base font-bold flex items-center gap-2"><MapPin size={17} className="text-red-400" /> Family & incident map</h2>
              </div>
              <Link href="/live-map" className="text-xs font-semibold text-blue-200 hover:text-white inline-flex items-center gap-1">
                Open operational map <ArrowRight size={13} />
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              <div className="h-[360px]">
                <EmergencyMapContainer
                  incidents={incidents.filter((incident) => incident.status !== 'resolved')}
                  familyMembers={appUser.familyMembers || []}
                  center={familyMapCenter}
                  zoom={focusedFamily || userLocation ? 15 : 13}
                  showHeatmap
                  focusedFamilyId={focusedFamilyId}
                />
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-white via-blue-50/80 to-indigo-100/70 shadow-lg shadow-indigo-950/5">
            <CardBody className="p-5 h-full flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25"><Fingerprint size={20} /></div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">AADHAAR LINKED</span>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900">Family safety at a glance</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">Every linked family member has a last-known location pin and a live safety status on the map.</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {(['Safe', 'Affected', 'Unknown'] as const).map((status) => (
                  <div key={status} className="rounded-xl border border-white/80 bg-white/80 px-2 py-3 text-center shadow-sm">
                    <p className="text-lg font-black text-slate-900">{appUser.familyMembers?.filter((member) => member.status === status).length || 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{status}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-5">
                <button type="button" onClick={requestLocation} className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors">
                  <Navigation size={14} className="mr-1.5 inline" /> {locationStatus === 'granted' ? 'Your GPS is active' : 'Add my live location'}
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Aadhaar Family Safety Status Card */}
      {appUser?.aadhaarNumber && (
        <Card className="border-blue-300 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-white/80 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                <Fingerprint size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-[#101b2d]">Aadhaar Family Safety Registry</h2>
                  <span className="text-[10px] font-mono font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Aadhaar Linked
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Primary Card: <strong className="font-mono text-slate-700">•••• •••• {appUser.aadhaarNumber.slice(-4)}</strong> • Disaster Tracking & Evacuation Verification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {appUser.familyMembers?.filter((m) => m.status === 'Safe').length || 0} / {appUser.familyMembers?.length || 0} Reported Safe
              </span>
            </div>
          </CardHeader>

          <CardBody className="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
                <span>Family Member</span>
                <span>Safety Triage</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {appUser.familyMembers?.map((member) => {
                  const statusColors = {
                    Safe: 'bg-green-100 text-green-800 border-green-300',
                    Affected: 'bg-red-100 text-red-800 border-red-300',
                    Unknown: 'bg-amber-100 text-amber-800 border-amber-300',
                  }

                  return (
                    <div
                      key={member.id}
                      className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm text-[#101b2d]">{member.name}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              statusColors[member.status as 'Safe' | 'Affected' | 'Unknown'] || statusColors.Safe
                            }`}
                          >
                            ● {member.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          {member.relation} • Age {member.age} • UID: <span className="font-mono">•••• {member.aadhaarLast4}</span>
                        </p>

                        {member.lastKnownLocation && (
                          <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-1 truncate">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            {member.lastKnownLocation}
                          </p>
                        )}

                        {member.phone && (
                          <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            {member.phone}
                          </p>
                        )}
                      </div>

                      {/* Quick Status Toggle Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-slate-400">Mark:</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateFamilyMemberStatus(member.id, 'Safe')
                            toast.success(`${member.name} marked as Safe`)
                          }}
                          className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${
                            member.status === 'Safe'
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-800'
                          }`}
                        >
                          Safe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateFamilyMemberStatus(member.id, 'Affected')
                            toast.warning(`${member.name} marked as Needing Assistance`)
                          }}
                          className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${
                            member.status === 'Affected'
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-800'
                          }`}
                        >
                          Affected
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateFamilyMemberStatus(member.id, 'Unknown')
                            toast.info(`${member.name} marked as Unknown`)
                          }}
                          className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${
                            member.status === 'Unknown'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                          }`}
                        >
                          Unknown
                        </button>
                        {typeof member.latitude === 'number' && typeof member.longitude === 'number' && (
                          <button
                            type="button"
                            onClick={() => locateFamilyMember(member.id)}
                            className={`ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
                              focusedFamilyId === member.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            <MapPin size={11} /> {focusedFamilyId === member.id ? 'Located' : 'Locate'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

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

