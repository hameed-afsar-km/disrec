// app/admin/incidents/[id]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { Markdown } from '@/components/ui/Markdown'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  ArrowLeft, Shield, MapPin, Users, Calendar, AlertTriangle,
  Sparkles, CheckCircle, Clock, Send, FileText, Image as ImageIcon,
  Truck, Star, Navigation, Phone, XCircle,
} from 'lucide-react'
import {
  subscribeToIncident,
  subscribeToResponseTeams,
  subscribeToIncidentUpdates,
  updateIncident,
  addIncidentUpdate,
  assignTeamToIncident,
  unassignTeamFromIncident,
  logAdminAction,
  nowISO
} from '@/lib/firestore'
import { formatDateTime, timeAgo, categoryIcons, teamCategoryIcons } from '@/lib/utils'
import type { Incident, IncidentUpdate, IncidentStatus, Severity, ResponseTeam } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS, TEAM_CATEGORY_LABELS, TEAM_STATUS_LABELS } from '@/lib/types'
import { calculateIncidentPriority, recommendResponseTeams, type TeamAssignmentCandidate } from '@/lib/prioritization'
import { toast } from 'sonner'
import { IncidentAiChat } from '@/components/admin/IncidentAiChat'
import { DispatchRouteMap } from '@/components/map/DispatchRouteMap'

export default function AdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const { firebaseUser, appUser } = useAuth()

  const [incident, setIncident] = useState<Incident | null>(null)
  const [updates, setUpdates] = useState<IncidentUpdate[]>([])
  const [teams, setTeams] = useState<ResponseTeam[]>([])
  const [loading, setLoading] = useState(true)

  // Status management state
  const [editStatus, setEditStatus] = useState<IncidentStatus>('reported')
  const [editSeverity, setEditSeverity] = useState<Severity>('medium')
  const [editVerified, setEditVerified] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  // Post update message
  const [updateMsg, setUpdateMsg] = useState('')
  const [updateVisibility, setUpdateVisibility] = useState<'public' | 'internal'>('public')
  const [postingUpdate, setPostingUpdate] = useState(false)

  // AI analysis
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [analyzingAi, setAnalyzingAi] = useState(false)

  // Dispatch assignment state
  const [assigning, setAssigning] = useState(false)
  const [unassigning, setUnassigning] = useState(false)

  useEffect(() => {
    if (!id) return

    const unsubInc = subscribeToIncident(id, (data) => {
      setIncident(data)
      if (data) {
        setEditStatus(data.status)
        setEditSeverity(data.severity)
        setEditVerified(data.verified)
      }
      setLoading(false)
    })

    const unsubUpdates = subscribeToIncidentUpdates(id, (data) => {
      setUpdates(data)
    })

    const unsubTeams = subscribeToResponseTeams((teamData) => {
      setTeams(teamData)
    })

    return () => {
      unsubInc()
      unsubUpdates()
      unsubTeams()
    }
  }, [id])

  async function handleSaveStatus() {
    if (!incident) return
    setSavingStatus(true)
    try {
      const isResolved = editStatus === 'resolved'
      await updateIncident(id, {
        status: editStatus,
        severity: editSeverity,
        verified: editVerified,
        resolvedAt: isResolved ? nowISO() : undefined,
      })

      await addIncidentUpdate({
        incidentId: id,
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        previousStatus: incident.status,
        newStatus: editStatus,
        previousSeverity: incident.severity,
        newSeverity: editSeverity,
        message: `Triage updated: Status → ${STATUS_LABELS[editStatus]}, Severity → ${SEVERITY_LABELS[editSeverity]}${editVerified ? ', Marked Verified' : ''}.`,
        visibility: 'internal',
        createdAt: nowISO(),
      })

      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'UPDATE_INCIDENT_TRIAGE',
        targetType: 'incident',
        targetId: id,
        details: { previousStatus: incident.status, newStatus: editStatus, editSeverity, editVerified },
        createdAt: nowISO(),
      })

      toast.success('Incident triage parameters saved!')
    } catch {
      toast.error('Failed to update incident.')
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!updateMsg.trim()) return
    setPostingUpdate(true)

    try {
      await addIncidentUpdate({
        incidentId: id,
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Emergency Coordinator',
        newStatus: editStatus,
        message: updateMsg.trim(),
        visibility: updateVisibility,
        createdAt: nowISO(),
      })

      setUpdateMsg('')
      toast.success('Incident update message recorded.')
    } catch {
      toast.error('Failed to post update.')
    } finally {
      setPostingUpdate(false)
    }
  }

  async function handleAssignTeam(team: ResponseTeam, distanceKm?: number) {
    setAssigning(true)
    try {
      await assignTeamToIncident(
        id,
        team.teamId,
        { adminId: firebaseUser?.uid || 'admin', adminName: appUser?.name || 'Dispatcher' },
        distanceKm
      )
      toast.success(`Team "${team.name}" dispatched to this incident!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to assign team.')
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassignTeam() {
    if (!incident?.assignedTeamId) return
    setUnassigning(true)
    try {
      await unassignTeamFromIncident(
        id,
        incident.assignedTeamId,
        { adminId: firebaseUser?.uid || 'admin', adminName: appUser?.name || 'Dispatcher' }
      )
      toast.success('Response team recalled. Incident returned to unassigned queue.')
    } catch {
      toast.error('Failed to unassign team.')
    } finally {
      setUnassigning(false)
    }
  }

  async function handleAiAnalyze() {
    if (!incident) return
    setAnalyzingAi(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident }),
      })
      const data = await res.json()
      if (data.summary) {
        setAiAnalysis(data.summary)
        toast.success('AI summary generated!')
      } else {
        toast.error('AI summary failed.')
      }
    } catch {
      toast.error('AI service unavailable.')
    } finally {
      setAnalyzingAi(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
        <SkeletonCard />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Incident Not Found</h2>
        <Link href="/admin/incidents" className="text-blue-600 text-sm mt-2 block">
          Return to Incidents Queue
        </Link>
      </div>
    )
  }

  // Compute priority & team recommendations
  const priority = calculateIncidentPriority(incident)
  const recommendations: TeamAssignmentCandidate[] = !incident.assignedTeamId
    ? recommendResponseTeams(incident, teams).slice(0, 5)
    : []
  const assignedTeamObj = incident.assignedTeamId
    ? teams.find((t) => t.teamId === incident.assignedTeamId) || null
    : null

  const priorityColor = priority.priorityLevel === 'critical'
    ? 'bg-red-100 text-red-800 border-red-300'
    : priority.priorityLevel === 'high'
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : priority.priorityLevel === 'medium'
    ? 'bg-blue-100 text-blue-700 border-blue-300'
    : 'bg-slate-100 text-slate-700 border-slate-300'

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={14} /> Back to Incident Queue
        </Link>
        <span className="font-mono text-xs text-slate-400">ID: {incident.incidentId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Incident Details, Dispatch Map & Timeline */}
        <div className="lg:col-span-2 space-y-6">

          {/* Incident Header Card */}
          <Card>
            <CardBody className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${priorityColor}`}>
                      {priority.rankLabel} ({priority.score}/100)
                    </span>
                    {incident.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full font-semibold">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-[#101b2d] leading-tight">
                    {incident.title}
                  </h1>
                  <p className="text-xs text-slate-400">
                    Reported by <strong>{incident.reporterName || 'Anonymous'}</strong> • {timeAgo(incident.createdAt)} • Category: {CATEGORY_LABELS[incident.category]}
                  </p>
                </div>
                <div className="text-3xl p-3 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
                  {categoryIcons[incident.category] || '⚠️'}
                </div>
              </div>

              {/* Priority Breakdown Bar */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Severity', value: priority.breakdown.severityPoints, max: 40, color: 'bg-red-500' },
                  { label: 'People', value: priority.breakdown.peoplePoints, max: 30, color: 'bg-amber-500' },
                  { label: 'Time Urgency', value: priority.breakdown.agePoints, max: 20, color: 'bg-blue-500' },
                  { label: 'Hazard Profile', value: priority.breakdown.categoryPoints, max: 15, color: 'bg-purple-500' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{item.label}</div>
                    <div className="text-xs font-black text-slate-800">{item.value}/{item.max}</div>
                    <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / item.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Incident Narrative
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                  {incident.description}
                </p>
              </div>

              {/* Location & Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <MapPin size={13} className="text-[#e53945]" /> Location
                  </span>
                  <p className="text-slate-800 font-medium">{incident.location}</p>
                  {incident.latitude !== 0 && (
                    <p className="font-mono text-slate-400 text-[11px]">
                      GPS: {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <Users size={13} className="text-blue-600" /> Impact & Response
                  </span>
                  <p className="text-slate-800 font-medium">~{incident.peopleAffected} Person(s) Affected</p>
                  <p className="text-slate-500">Age: {priority.ageMinutes} min without resolved response</p>
                </div>
              </div>

              {/* Evidence Gallery */}
              {incident.evidenceUrls && incident.evidenceUrls.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} /> Evidence ({incident.evidenceUrls.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {incident.evidenceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
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

          {/* Dispatch Route Map */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-[#101b2d] flex items-center gap-2">
                <Navigation size={16} className="text-blue-600" /> Route & Location Visualization
                {assignedTeamObj && (
                  <span className="ml-auto text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Team Dispatched
                  </span>
                )}
              </h2>
            </CardHeader>
            <CardBody className="p-0 overflow-hidden rounded-b-xl">
              <DispatchRouteMap
                incident={incident}
                assignedTeam={assignedTeamObj}
                nearbyTeams={!assignedTeamObj ? teams : []}
                onSelectTeam={(team) => handleAssignTeam(team)}
                height="380px"
              />
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>🔴 Incident Location</span>
                <span>🟦 Assigned Response Unit (pulsing)</span>
                <span>🟩 Available Teams (clickable to assign)</span>
                <span>--- Dispatch Route with ETA</span>
              </div>
            </CardBody>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-[#101b2d] flex items-center gap-2">
                <Clock size={16} className="text-blue-600" /> Incident Activity Timeline
                <span className="ml-auto text-[11px] text-slate-500 font-normal">({updates.length} entries)</span>
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {updates.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No activity recorded yet. Dispatch actions and manual notes appear here.</p>
              ) : (
                <div className="relative space-y-3 pl-4 border-l-2 border-slate-200">
                  {updates.map((u) => (
                    <div
                      key={u.updateId}
                      className={`relative p-3 rounded-lg border text-xs space-y-1 ${
                        u.visibility === 'internal'
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="absolute -left-[21px] top-3 w-3 h-3 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-bold text-slate-800">{u.adminName}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            u.visibility === 'internal'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {u.visibility}
                          </span>
                          {u.newStatus && (
                            <StatusBadge status={u.newStatus} />
                          )}
                          <span className="text-slate-400 text-[10px]">{timeAgo(u.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{u.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Post update form */}
              <form onSubmit={handleAddUpdate} className="pt-3 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-700">Post Coordinator Log / Public Update</p>
                <textarea
                  rows={2}
                  placeholder="Enter response update or internal coordinator note..."
                  value={updateMsg}
                  onChange={(e) => setUpdateMsg(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="vis" checked={updateVisibility === 'public'} onChange={() => setUpdateVisibility('public')} />
                      Public Update
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="vis" checked={updateVisibility === 'internal'} onChange={() => setUpdateVisibility('internal')} />
                      Internal Note Only
                    </label>
                  </div>
                  <Button type="submit" variant="primary" size="sm" loading={postingUpdate} className="text-xs">
                    <Send size={13} /> Post Note
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Triage, Team Assignment & AI */}
        <div className="space-y-6">
          {/* Triage Control Panel */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-[#101b2d] flex items-center gap-2">
                <Shield size={16} className="text-blue-600" /> Triage Control Panel
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Incident Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as IncidentStatus)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                >
                  {Object.entries(STATUS_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Severity Triage
                </label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value as Severity)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                >
                  <option value="critical">Critical (Life Threat)</option>
                  <option value="high">High Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="low">Low Severity</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editVerified}
                    onChange={(e) => setEditVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  Mark as Verified Official Report
                </label>
              </div>

              <Button type="button" variant="primary" size="sm" className="w-full" onClick={handleSaveStatus} loading={savingStatus}>
                Save Triage Updates
              </Button>
            </CardBody>
          </Card>

          {/* Team Assignment Panel */}
          <Card className={incident.assignedTeamId ? 'border-indigo-200 bg-indigo-50/30' : 'border-emerald-200'}>
            <CardHeader>
              <h2 className="text-sm font-bold text-[#101b2d] flex items-center gap-2">
                <Truck size={16} className="text-indigo-600" />
                {incident.assignedTeamId ? 'Assigned Response Unit' : 'Dispatch Response Team'}
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {incident.assignedTeamId ? (
                /* Currently Assigned Team */
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-indigo-100 border border-indigo-300 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{teamCategoryIcons[assignedTeamObj?.category || ''] || '🚒'}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-indigo-900 truncate">{incident.assignedTeamName}</p>
                        <p className="text-[10px] text-indigo-600 font-mono">{incident.assignedTeamId}</p>
                      </div>
                    </div>
                    {assignedTeamObj && (
                      <div className="text-[11px] text-indigo-800 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Phone size={11} />
                          <span>{assignedTeamObj.contactPhone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={11} />
                          <span>{assignedTeamObj.leaderName} ({assignedTeamObj.memberCount} crew)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={11} />
                          <span className="truncate">{assignedTeamObj.locationAddress}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleUnassignTeam}
                    loading={unassigning}
                  >
                    <XCircle size={13} /> Recall / Unassign Team
                  </Button>
                </div>
              ) : (
                /* Team Recommendations */
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">
                    AI-ranked units by category match, proximity, and availability. {recommendations.length} candidates found.
                  </p>
                  {recommendations.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-slate-200">
                      No response teams available. <Link href="/admin/teams" className="text-blue-600 underline">Manage teams</Link>
                    </p>
                  ) : (
                    recommendations.map((cand, idx) => (
                      <div
                        key={cand.team.teamId}
                        className={`p-2.5 rounded-lg border ${
                          cand.isBestFit
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              {cand.isBestFit && <Star size={11} className="text-emerald-500 shrink-0" fill="currentColor" />}
                              <span className="truncate">{cand.team.name.split(' ').slice(0, 4).join(' ')}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {cand.distanceKm} km · ~{cand.estimatedArrivalMinutes}m ETA · {cand.matchScore}% match
                            </div>
                            <div className={`text-[9px] font-bold mt-0.5 ${
                              cand.team.status === 'available' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {cand.team.status.toUpperCase()} · {TEAM_CATEGORY_LABELS[cand.team.category]}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 italic truncate">
                              {cand.recommendationReason}
                            </div>
                          </div>
                          {cand.team.status === 'available' && (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              className="shrink-0 text-[10px] px-2 py-1 h-7"
                              onClick={() => handleAssignTeam(cand.team, cand.distanceKm)}
                              loading={assigning}
                            >
                              Assign
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/admin/teams">
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-1">
                      <Truck size={13} /> Manage All Teams →
                    </Button>
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          {/* AI Incident Analysis */}
          <Card className="border-blue-200">
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={14} className="text-blue-600" /> AI Report Analysis
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-xs text-slate-500">
                Use Groq Llama 3 to analyze the report for critical concerns, information gaps, and recommended actions.
              </p>

              {aiAnalysis && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <Markdown content={aiAnalysis} className="text-xs" />
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleAiAnalyze}
                loading={analyzingAi}
              >
                <Sparkles size={13} /> {aiAnalysis ? 'Re-Analyze with AI' : 'Analyze Incident with AI'}
              </Button>
              <IncidentAiChat incident={incident} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
