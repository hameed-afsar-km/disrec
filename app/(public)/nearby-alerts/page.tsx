// app/(public)/nearby-alerts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  Bell, Navigation, MapPin, AlertTriangle, Shield,
  Radio, RefreshCw, ArrowRight
} from 'lucide-react'
import { subscribeToAllIncidents, subscribeToActiveAlerts } from '@/lib/firestore'
import { distanceKm, timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, EmergencyAlert } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'

export default function NearbyAlertsPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'granted' | 'denied'>('idle')
  const [radiusKm, setRadiusKm] = useState<number>(25)

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [broadcasts, setBroadcasts] = useState<EmergencyAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    detectLocation()

    const unsubInc = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })

    const unsubAlerts = subscribeToActiveAlerts((data) => {
      setBroadcasts(data)
    })

    return () => {
      unsubInc()
      unsubAlerts()
    }
  }, [])

  function detectLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('denied')
      return
    }
    setGpsStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsStatus('granted')
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Filter incidents within current radius
  const nearbyIncidents = incidents
    .filter((inc) => inc.status !== 'resolved')
    .map((inc) => {
      let distance = 0
      if (userLocation && inc.latitude && inc.longitude) {
        distance = distanceKm(userLocation.lat, userLocation.lng, inc.latitude, inc.longitude)
      }
      return { ...inc, distance }
    })
    .filter((inc) => (userLocation ? inc.distance <= radiusKm : true))
    .sort((a, b) => {
      // Prioritize Critical, then High, then closest
      const sevScore = { critical: 4, high: 3, medium: 2, low: 1 }
      if (sevScore[b.severity] !== sevScore[a.severity]) {
        return sevScore[b.severity] - sevScore[a.severity]
      }
      return a.distance - b.distance
    })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101b2d] flex items-center gap-2">
            <Radio size={24} className="text-[#e53945]" />
            Nearby Emergency Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time proximity awareness and official crisis broadcasts
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={detectLocation} loading={gpsStatus === 'detecting'}>
          <RefreshCw size={14} /> Refresh GPS Location
        </Button>
      </div>

      {/* Proximity Radius & GPS Status banner */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${gpsStatus === 'granted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              <Navigation size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {gpsStatus === 'granted' && userLocation
                  ? `GPS Location Active: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                  : 'GPS Location Not Detected'}
              </p>
              <p className="text-[11px] text-slate-500">
                {gpsStatus === 'granted'
                  ? 'Showing active emergencies filtered by distance from your current position.'
                  : 'Enable location permission to calculate exact distances to incidents.'}
              </p>
            </div>
          </div>

          {/* Radius selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
              Radius: <strong>{radiusKm} km</strong>
            </span>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-36 accent-blue-600"
            />
          </div>
        </div>
      </Card>

      {/* Official Emergency Broadcasts (Admin Alerts) */}
      {broadcasts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 flex items-center gap-2">
            <AlertTriangle size={16} /> Official Emergency Broadcasts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {broadcasts.map((b) => (
              <div
                key={b.alertId}
                className="p-4 bg-red-50 border-2 border-red-400 rounded-xl space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide bg-red-600 text-white px-2 py-0.5 rounded">
                    {b.severity} ALERT
                  </span>
                  <span className="text-[11px] text-red-800 font-medium">
                    Radius: {b.radius} km
                  </span>
                </div>
                <h3 className="font-bold text-base text-red-950">{b.title}</h3>
                <p className="text-xs text-red-900 leading-relaxed">{b.description}</p>
                <div className="flex items-center justify-between text-[11px] text-red-700 pt-1 border-t border-red-200">
                  <span>Target Area: {b.centerLocation}</span>
                  <span>Issued: {timeAgo(b.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Active Incidents */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#101b2d]">
          Active Incidents Within {radiusKm} km ({nearbyIncidents.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : nearbyIncidents.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Shield size={40} />}
              title="No active emergencies nearby"
              description={`There are currently no active incidents reported within ${radiusKm} km of your area.`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nearbyIncidents.map((inc) => (
              <Link key={inc.incidentId} href={`/my-reports/${inc.incidentId}`}>
                <Card hover className="p-5 h-full flex flex-col justify-between border-slate-200 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{categoryIcons[inc.category] || '⚠️'}</span>
                        <span className="font-bold text-xs uppercase text-slate-700">
                          {CATEGORY_LABELS[inc.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} />
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-[#101b2d] line-clamp-1">{inc.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {inc.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-[#e53945]" />
                      {userLocation && inc.distance > 0 ? (
                        <strong>~{inc.distance.toFixed(1)} km away</strong>
                      ) : (
                        inc.location
                      )}
                    </span>
                    <span>{timeAgo(inc.createdAt)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
