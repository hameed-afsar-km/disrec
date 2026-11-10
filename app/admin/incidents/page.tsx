// app/admin/incidents/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/Modal'
import {
  Search, Filter, ChevronRight, CheckCircle2, AlertTriangle,
  Trash2, ShieldCheck, RefreshCw, Eye, ChevronDown, ChevronUp, MessageCircle
} from 'lucide-react'
import {
  subscribeToAllIncidents,
  subscribeToResponseTeams,
  assignTeamToIncident,
  updateIncident,
  deleteIncident,
  logAdminAction,
  nowISO
} from '@/lib/firestore'
import { useAuth } from '@/components/auth/AuthProvider'
import { formatDate, timeAgo, categoryIcons, teamCategoryIcons } from '@/lib/utils'
import type { Incident, IncidentStatus, Severity, ResponseTeam } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/lib/types'
import {
  calculateIncidentPriority,
  sortIncidentsByPriority,
  recommendResponseTeams,
  type PrioritizedIncident
} from '@/lib/prioritization'
import { IncidentAiChat } from '@/components/admin/IncidentAiChat'
import { toast } from 'sonner'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function AdminIncidentsPage() {
  const { firebaseUser, appUser } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [teams, setTeams] = useState<ResponseTeam[]>([])
  const [loading, setLoading] = useState(true)

  // Expand row state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'priority' | 'newest' | 'people'>('priority')

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)

  useEffect(() => {
    const unsubInc = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })
    const unsubTeams = subscribeToResponseTeams((teamData) => {
      setTeams(teamData)
    })
    return () => {
      unsubInc()
      unsubTeams()
    }
  }, [])

  async function handleQuickStatusChange(incidentId: string, newStatus: IncidentStatus) {
    try {
      await updateIncident(incidentId, { status: newStatus })
      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'UPDATE_INCIDENT_STATUS',
        targetType: 'incident',
        targetId: incidentId,
        details: { newStatus },
        createdAt: nowISO(),
      })
      toast.success(`Incident status changed to ${STATUS_LABELS[newStatus]}`)
    } catch {
      toast.error('Failed to update incident status.')
    }
  }

  async function handleQuickAssign(incident: Incident, team: ResponseTeam, distanceKm?: number) {
    setDispatchingId(incident.incidentId)
    try {
      await assignTeamToIncident(
        incident.incidentId,
        team.teamId,
        {
          adminId: firebaseUser?.uid || 'admin',
          adminName: appUser?.name || 'Incident Dispatcher',
        },
        distanceKm
      )
      toast.success(`Dispatched ${team.name} to Incident #${incident.incidentId.slice(-6)}!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to assign response team.')
    } finally {
      setDispatchingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteIncident(deleteTarget.incidentId)
      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'DELETE_INCIDENT',
        targetType: 'incident',
        targetId: deleteTarget.incidentId,
        details: { title: deleteTarget.title },
        createdAt: nowISO(),
      })
      toast.success('Incident record deleted from system.')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete incident.')
    } finally {
      setDeleting(false)
    }
  }

  // Multi-factor intelligent prioritization & filtering
  const prioritizedIncidents: PrioritizedIncident[] = incidents.map((inc) => ({
    ...inc,
    priority: calculateIncidentPriority(inc),
  }))

  const filtered = prioritizedIncidents
    .filter((inc) => {
      const matchesSearch =
        inc.title.toLowerCase().includes(search.toLowerCase()) ||
        inc.incidentId.toLowerCase().includes(search.toLowerCase()) ||
        inc.location.toLowerCase().includes(search.toLowerCase()) ||
        (inc.reporterName || '').toLowerCase().includes(search.toLowerCase()) ||
        (inc.assignedTeamName || '').toLowerCase().includes(search.toLowerCase())

      const matchesCat = category === 'all' || inc.category === category
      const matchesSev = severity === 'all' || inc.severity === severity
      const matchesStatus = status === 'all' || inc.status === status

      return matchesSearch && matchesCat && matchesSev && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        if (a.status === 'resolved' && b.status !== 'resolved') return 1
        if (a.status !== 'resolved' && b.status === 'resolved') return -1
        if (b.priority.score !== a.priority.score) {
          return b.priority.score - a.priority.score
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        return (Number(b.peopleAffected) || 0) - (Number(a.peopleAffected) || 0)
      }
    })

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] tracking-tight">Incident Management Queue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Priority-ranked triage queue with AI-powered dispatch recommendations for all reported emergencies
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, ID, reporter, location, team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white text-slate-700"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'newest' | 'people')}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white text-slate-700 font-medium"
          >
            <option value="priority">🎯 Sort: Priority Score</option>
            <option value="newest">🕐 Sort: Newest First</option>
            <option value="people">👥 Sort: Most Affected</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={8} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No matching incidents"
            description="Adjust your search filters or check back when new reports arrive."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="p-3.5">Priority / ID</th>
                  <th className="p-3.5">Title & Location</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned Team</th>
                  <th className="p-3.5">People / Time</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inc) => {
                  const isCritical = inc.severity === 'critical'
                  const isExpanded = expandedRowId === inc.incidentId
                  const priority = inc.priority
                  const priorityColor = priority.priorityLevel === 'critical'
                    ? 'bg-red-600 text-white'
                    : priority.priorityLevel === 'high'
                    ? 'bg-amber-500 text-white'
                    : priority.priorityLevel === 'medium'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-400 text-white'

                  // Best-fit team recommendation for unassigned incidents
                  const recommendations = !inc.assignedTeamId && inc.status !== 'resolved'
                    ? recommendResponseTeams(inc, teams).slice(0, 1)
                    : []
                  const bestTeam = recommendations[0]

                  return (
                    <React.Fragment key={inc.incidentId}>
                      <tr
                        className={`transition-colors ${
                          isExpanded
                            ? 'bg-blue-50/50'
                            : isCritical
                            ? 'bg-red-50/70 border-l-4 border-l-red-600 hover:bg-red-50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Priority / ID */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : inc.incidentId)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand details & dispatch'}
                            >
                              {isExpanded ? (
                                <ChevronUp size={15} className="text-blue-600" />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                            </button>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${priorityColor}`}>
                                P{priority.priorityLevel === 'critical' ? '1' : priority.priorityLevel === 'high' ? '2' : priority.priorityLevel === 'medium' ? '3' : '4'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">{priority.score}pts</span>
                            </div>
                            <span className="text-lg">{categoryIcons[inc.category] || '⚠️'}</span>
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-800">
                                #{inc.incidentId.slice(-6)}
                              </span>
                              <span className="block text-[10px] text-slate-400 capitalize">
                                {inc.category.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Title & Location */}
                        <td className="p-3.5 max-w-xs">
                          <Link
                            href={`/admin/incidents/${inc.incidentId}`}
                            className="font-bold text-slate-900 hover:text-blue-600 block truncate"
                          >
                            {inc.title}
                          </Link>
                          <p className="text-[11px] text-slate-500 truncate">📍 {inc.location}</p>
                        </td>

                        {/* Severity */}
                        <td className="p-3.5 whitespace-nowrap">
                          <SeverityBadge severity={inc.severity} />
                        </td>

                        {/* Status */}
                        <td className="p-3.5 whitespace-nowrap">
                          <select
                            value={inc.status}
                            onChange={(e) =>
                              handleQuickStatusChange(inc.incidentId, e.target.value as IncidentStatus)
                            }
                            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none"
                          >
                            {Object.entries(STATUS_LABELS).map(([k, l]) => (
                              <option key={k} value={k}>{l}</option>
                            ))}
                          </select>
                        </td>

                        {/* Assigned Team */}
                        <td className="p-3.5 max-w-[160px]">
                          {inc.assignedTeamName ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 truncate max-w-[150px] block">
                                🚒 {inc.assignedTeamName}
                              </span>
                            </div>
                          ) : bestTeam ? (
                            <button
                              type="button"
                              disabled={dispatchingId === inc.incidentId}
                              onClick={() => handleQuickAssign(inc, bestTeam.team, bestTeam.distanceKm)}
                              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded truncate max-w-[150px] block transition-colors disabled:opacity-50"
                              title={bestTeam.recommendationReason}
                            >
                              {dispatchingId === inc.incidentId ? '...' : `⚡ ${bestTeam.team.name.split(' ').slice(0, 3).join(' ')}`}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* People / Time */}
                        <td className="p-3.5 whitespace-nowrap text-[11px]">
                          <span className="font-bold text-slate-800">👥 {inc.peopleAffected}</span>
                          <span className="block text-slate-400">{timeAgo(inc.createdAt)}</span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <IncidentAiChat
                              incident={inc}
                              buttonVariant="outline"
                              buttonSize="sm"
                              buttonLabel="Ask AI"
                              buttonClassName="h-7 px-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                            />
                            <Link href={`/admin/incidents/${inc.incidentId}`}>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                <Eye size={14} /> Review
                              </Button>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(inc)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Delete Report"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Sub-Row: Priority Breakdown + Team Assignment */}
                      {isExpanded && (
                        <tr className="bg-blue-50/20 border-b border-slate-200">
                          <td colSpan={7} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">
                                    Incident Intelligence & Priority Analysis
                                  </h4>
                                  <p className="text-[11px] text-slate-400">
                                    Reported {formatDate(inc.createdAt)} ({timeAgo(inc.createdAt)}) · Age: {priority.ageMinutes}m · Score: {priority.score}/100
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <IncidentAiChat
                                    incident={inc}
                                    buttonVariant="primary"
                                    buttonSize="sm"
                                    buttonLabel="Ask AI about this incident"
                                    buttonClassName="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
                                  />
                                  <Link href={`/admin/incidents/${inc.incidentId}`}>
                                    <Button variant="outline" size="sm" className="h-8 text-xs">
                                      Dispatch & Track →
                                    </Button>
                                  </Link>
                                </div>
                              </div>

                              {/* Priority Breakdown */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                  { label: 'Severity Points', value: priority.breakdown.severityPoints, max: 40, color: 'bg-red-500' },
                                  { label: 'People Affected', value: priority.breakdown.peoplePoints, max: 30, color: 'bg-amber-500' },
                                  { label: 'Time Urgency', value: priority.breakdown.agePoints, max: 20, color: 'bg-blue-500' },
                                  { label: 'Category Hazard', value: priority.breakdown.categoryPoints, max: 15, color: 'bg-purple-500' },
                                ].map((item) => (
                                  <div key={item.label} className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</span>
                                      <span className="text-xs font-black text-slate-800">{item.value}/{item.max}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${item.color}`}
                                        style={{ width: `${(item.value / item.max) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Description */}
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Narrative Description
                                </span>
                                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
                                  {inc.description || 'No detailed narrative provided.'}
                                </p>
                              </div>

                              {/* Team Recommendations */}
                              {!inc.assignedTeamId && inc.status !== 'resolved' && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                    Recommended Response Units (Top 3 by Match Score)
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {recommendResponseTeams(inc, teams).slice(0, 3).map((cand, idx) => (
                                      <div
                                        key={cand.team.teamId}
                                        className={`flex items-center justify-between p-2.5 rounded-lg border ${
                                          cand.isBestFit ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="font-bold text-[11px] text-slate-900 truncate">
                                            {idx === 0 ? '⭐ ' : ''}{cand.team.name.split(' ').slice(0, 4).join(' ')}
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            {cand.distanceKm} km · ~{cand.estimatedArrivalMinutes}m ETA · {cand.matchScore}% match
                                          </div>
                                          <div className={`text-[9px] font-bold ${cand.team.status === 'available' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {cand.team.status.toUpperCase()}
                                          </div>
                                        </div>
                                        {cand.team.status === 'available' && (
                                          <button
                                            type="button"
                                            disabled={dispatchingId === inc.incidentId}
                                            onClick={() => handleQuickAssign(inc, cand.team, cand.distanceKm)}
                                            className="ml-2 shrink-0 px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                          >
                                            {dispatchingId === inc.incidentId ? '...' : 'Assign'}
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Evidence */}
                              {inc.evidenceUrls && inc.evidenceUrls.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Attached Evidence ({inc.evidenceUrls.length})
                                  </span>
                                  <div className="flex gap-2 overflow-x-auto pb-1">
                                    {inc.evidenceUrls.map((url, i) => (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="h-16 w-20 rounded border border-slate-200 overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500"
                                      >
                                        <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Delete Incident Record"
        message={`Are you sure you want to permanently delete incident "${deleteTarget?.title}"? This action is recorded in audit logs and cannot be undone.`}
        confirmLabel="Delete Incident"
      />
    </div>
  )
}

