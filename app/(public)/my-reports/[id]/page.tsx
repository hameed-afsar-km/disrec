// app/(public)/my-reports/[id]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  ArrowLeft, MapPin, Users, Calendar, AlertTriangle, Shield,
  CheckCircle2, Clock, Image as ImageIcon, Sparkles
} from 'lucide-react'
import { subscribeToIncident, getIncidentUpdates } from '@/lib/firestore'
import { formatDateTime, timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, IncidentUpdate } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@/lib/types'

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()

  const [incident, setIncident] = useState<Incident | null>(null)
  const [updates, setUpdates] = useState<IncidentUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push(`/login?redirect=/my-reports/${id}`)
    }
  }, [authLoading, firebaseUser, router, id])

  useEffect(() => {
    if (!id) return

    // Real-time listener for incident details & status updates
    const unsubscribe = subscribeToIncident(id, (data) => {
      setIncident(data)
      setLoading(false)
    })

    // Fetch administrative timeline updates
    async function loadUpdates() {
      try {
        const updateList = await getIncidentUpdates(id)
        setUpdates(updateList)
      } catch (err) {
        console.error('Failed to load incident updates:', err)
      }
    }

    loadUpdates()

    return () => unsubscribe()
  }, [id])

  if (loading || authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#101b2d] mb-2">Report Not Found</h1>
        <p className="text-slate-600 mb-6">
          The requested emergency incident report could not be found or has been removed.
        </p>
        <Link href="/my-reports">
          <Button variant="primary">Return to My Reports</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/my-reports"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft size={16} /> Back to My Reports
        </Link>
      </div>

      {/* Main Incident Card */}
      <Card>
        <CardBody className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-semibold">
                  #{incident.incidentId}
                </span>
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
                {incident.verified && (
                  <span className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Verified by Admin
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#101b2d]">
                {incident.title}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={13} /> Reported on {formatDateTime(incident.createdAt)} ({timeAgo(incident.createdAt)})
              </p>
            </div>
            <div className="text-4xl p-3 bg-slate-50 border border-slate-200 rounded-2xl shrink-0 self-start">
              {categoryIcons[incident.category] || '⚠️'}
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Incident Description
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {incident.description}
            </p>
          </div>

          {/* AI Severity Recommendation (if generated) */}
          {incident.aiSuggestedSeverity && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-900">
                  AI Severity Classification at Submission:
                </span>
                <SeverityBadge severity={incident.aiSuggestedSeverity} />
              </div>
              {incident.aiSeverityReason && (
                <p className="text-xs text-blue-800">{incident.aiSeverityReason}</p>
              )}
            </div>
          )}

          {/* Meta Grid: Location & Affected */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <MapPin size={20} className="text-[#e53945] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Incident Location</p>
                <p className="text-sm font-semibold text-slate-800">{incident.location}</p>
                {incident.latitude !== 0 && incident.longitude !== 0 && (
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    GPS: {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <Users size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Affected Persons</p>
                <p className="text-sm font-semibold text-slate-800">
                  ~{incident.peopleAffected} {incident.peopleAffected === 1 ? 'person' : 'people'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category: {CATEGORY_LABELS[incident.category]}
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Gallery */}
          {incident.evidenceUrls && incident.evidenceUrls.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ImageIcon size={14} /> Attached Evidence Photos ({incident.evidenceUrls.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {incident.evidenceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-90 transition-opacity"
                  >
                    <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Response Timeline & Updates */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-[#101b2d] flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            Response Timeline & Official Updates
          </h2>
        </CardHeader>
        <CardBody className="p-6">
          {updates.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <Clock size={28} className="mx-auto mb-2 opacity-60" />
              <p>No operational updates logged by coordinators yet.</p>
              <p className="text-xs mt-1 text-slate-400">
                Administrators are notified and any change in status or response instructions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {updates.map((update) => (
                <div key={update.updateId} className="relative space-y-1">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {update.adminName || 'Emergency Coordinator'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(update.createdAt)}
                    </span>
                  </div>
                  {update.newStatus && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Status changed to:</span>
                      <StatusBadge status={update.newStatus} />
                    </div>
                  )}
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {update.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

