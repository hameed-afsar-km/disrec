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
  Sparkles, CheckCircle, Clock, Send, FileText, Image as ImageIcon
} from 'lucide-react'
import {
  subscribeToIncident,
  updateIncident,
  addIncidentUpdate,
  getIncidentUpdates,
  logAdminAction,
  nowISO
} from '@/lib/firestore'
import { formatDateTime, timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, IncidentUpdate, IncidentStatus, Severity } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/lib/types'
import { toast } from 'sonner'
import { IncidentAiChat } from '@/components/admin/IncidentAiChat'

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

  useEffect(() => {
    if (!id) return

    const unsub = subscribeToIncident(id, (data) => {
      setIncident(data)
      if (data) {
        setEditStatus(data.status)
        setEditSeverity(data.severity)
        setEditVerified(data.verified)
      }
      setLoading(false)
    })

    loadUpdates()

    return () => unsub()
  }, [id])

  async function loadUpdates() {
    try {
      const data = await getIncidentUpdates(id)
      setUpdates(data)
    } catch (err) {
      console.error(err)
    }
  }

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

      // Add audit log
      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Administrator',
        action: 'UPDATE_INCIDENT_TRIAGE',
        targetType: 'incident',
        targetId: id,
        details: {
          previousStatus: incident.status,
          newStatus: editStatus,
          previousSeverity: incident.severity,
          newSeverity: editSeverity,
          verified: editVerified,
        },
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
      await loadUpdates()
      toast.success('Incident update message recorded.')
    } catch {
      toast.error('Failed to post update.')
    } finally {
      setPostingUpdate(false)
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

  return (
    <div className="space-y-6">
      {/* Top bar navigation */}
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
        {/* Left 2 Cols: Incident Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                    {incident.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full font-semibold">
                        Verified Official
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-[#101b2d] leading-tight">
                    {incident.title}
                  </h1>
                  <p className="text-xs text-slate-400">
                    Reported by <strong>{incident.reporterName || 'Anonymous'}</strong> ({incident.reporterEmail || 'No email'}) • {timeAgo(incident.createdAt)}
                  </p>
                </div>
                <div className="text-3xl p-3 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
                  {categoryIcons[incident.category] || '⚠️'}
                </div>
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
                    <Users size={13} className="text-blue-600" /> Impact & Category
                  </span>
                  <p className="text-slate-800 font-medium">
                    ~{incident.peopleAffected} Affected Person(s)
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Category: {CATEGORY_LABELS[incident.category]}
                  </p>
                </div>
              </div>

              {/* Uploaded Evidence Gallery */}
              {incident.evidenceUrls && incident.evidenceUrls.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} /> Uploaded Media Evidence ({incident.evidenceUrls.length})
                  </h3>
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

          {/* Timeline & Dispatch Activity Log */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-[#101b2d] flex items-center gap-2">
                <Clock size={16} className="text-blue-600" /> Operational Updates & Audit Trail
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {updates.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No operational logs recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {updates.map((u) => (
                    <div
                      key={u.updateId}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        u.visibility === 'internal'
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{u.adminName}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              u.visibility === 'internal'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {u.visibility}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {timeAgo(u.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-700">{u.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Log new update form */}
              <form onSubmit={handleAddUpdate} className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-700">Add Coordinator Log / Public Update</p>
                <textarea
                  rows={2}
                  placeholder="Enter response update or internal coordinator note..."
                  value={updateMsg}
                  onChange={(e) => setUpdateMsg(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="vis"
                        checked={updateVisibility === 'public'}
                        onChange={() => setUpdateVisibility('public')}
                      />
                      Public Update (Visible to user)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="vis"
                        checked={updateVisibility === 'internal'}
                        onChange={() => setUpdateVisibility('internal')}
                      />
                      Internal Dispatch Note Only
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

        {/* Right 1 Col: Controls, Triage, AI Summary */}
        <div className="space-y-6">
          {/* Triage & Status Control Card */}
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
                  <option value="reported">Reported</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress (Dispatched)</option>
                  <option value="resolved">Resolved (Closed)</option>
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

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editVerified}
                    onChange={(e) => setEditVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  Mark as Verified Official Report
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5 ml-6">
                  Verified reports appear on public map feeds as confirmed.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full mt-2"
                onClick={handleSaveStatus}
                loading={savingStatus}
              >
                Save Triage Updates
              </Button>
            </CardBody>
          </Card>

          {/* AI Incident Analysis Tool */}
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

              {aiAnalysis ? (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <Markdown content={aiAnalysis} className="text-xs" />
                </div>
              ) : null}

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

