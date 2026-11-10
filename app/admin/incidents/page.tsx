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
  updateIncident,
  deleteIncident,
  logAdminAction,
  nowISO
} from '@/lib/firestore'
import { useAuth } from '@/components/auth/AuthProvider'
import { formatDate, timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, IncidentStatus, Severity } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/lib/types'
import { IncidentAiChat } from '@/components/admin/IncidentAiChat'
import { toast } from 'sonner'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function AdminIncidentsPage() {
  const { firebaseUser, appUser } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  // Expand row state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('all')

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const unsub = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })
    return () => unsub()
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

  const filtered = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.incidentId.toLowerCase().includes(search.toLowerCase()) ||
      inc.location.toLowerCase().includes(search.toLowerCase()) ||
      (inc.reporterName || '').toLowerCase().includes(search.toLowerCase())

    const matchesCat = category === 'all' || inc.category === category
    const matchesSev = severity === 'all' || inc.severity === severity
    const matchesStatus = status === 'all' || inc.status === status

    return matchesSearch && matchesCat && matchesSev && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] tracking-tight">Incident Management Queue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review, verify, triage, and dispatch response operations for all reported emergencies
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, ID, reporter, location..."
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
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white text-slate-700"
          >
            <option value="all">All Severities</option>
            {Object.entries(SEVERITY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
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
                  <th className="p-3.5">ID / Category</th>
                  <th className="p-3.5">Title & Location</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Reporter</th>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inc) => {
                  const isCritical = inc.severity === 'critical';
                  const isExpanded = expandedRowId === inc.incidentId;
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
                        {/* ID & Category */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : inc.incidentId)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand details'}
                            >
                              {isExpanded ? (
                                <ChevronUp size={15} className="text-blue-600" />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                            </button>
                            <span className="text-lg">{categoryIcons[inc.category] || '⚠️'}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-slate-800">
                                  #{inc.incidentId.slice(-6)}
                                </span>
                                {isCritical && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                                    CRITICAL
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-slate-400 capitalize">
                                {inc.category.replace('_', ' ')}
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
                          <p className="text-[11px] text-slate-500 truncate">{inc.location}</p>
                        </td>

                        {/* Severity */}
                        <td className="p-3.5 whitespace-nowrap">
                          <SeverityBadge severity={inc.severity} />
                        </td>

                        {/* Status dropdown */}
                        <td className="p-3.5 whitespace-nowrap">
                          <select
                            value={inc.status}
                            onChange={(e) =>
                              handleQuickStatusChange(inc.incidentId, e.target.value as IncidentStatus)
                            }
                            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none"
                          >
                            <option value="reported">Reported</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </td>

                        {/* Reporter */}
                        <td className="p-3.5 whitespace-nowrap">
                          <p className="text-slate-800 font-medium truncate max-w-[120px]">
                            {inc.reporterName || 'Anonymous'}
                          </p>
                          {inc.reporterEmail && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {inc.reporterEmail}
                            </p>
                          )}
                        </td>

                        {/* Time */}
                        <td className="p-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                          {timeAgo(inc.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ask AI button directly in table row */}
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

                      {/* Expandable Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-blue-50/20 border-b border-slate-200">
                          <td colSpan={7} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">
                                    Incident Intelligence & Tactical Context
                                  </h4>
                                  <p className="text-[11px] text-slate-400">
                                    Reported {formatDate(inc.createdAt)} ({timeAgo(inc.createdAt)}) · ID: #{inc.incidentId}
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
                                      Open Dossier →
                                    </Button>
                                  </Link>
                                </div>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Narrative Description
                                </span>
                                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
                                  {inc.description || 'No detailed narrative provided.'}
                                </p>
                              </div>

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

