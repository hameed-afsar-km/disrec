// app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SeverityBadge, StatusBadge, SOSStatusBadge } from '@/components/ui/Badge'
import { Markdown } from '@/components/ui/Markdown'
import {
  AlertTriangle, FileText, AlertOctagon, CheckCircle,
  Clock, Sparkles, Brain, ArrowRight, MapPin, ChevronRight,
  ChevronDown, ChevronUp, ShieldCheck, User, MessageCircle, ExternalLink
} from 'lucide-react'
import { subscribeToAllIncidents, subscribeToAllSOS } from '@/lib/firestore'
import { timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, SOSRequest } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@/lib/types'
import { IncidentAiChat } from '@/components/admin/IncidentAiChat'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [sosList, setSosList] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Incident queue expansion & filter
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null)
  const [incidentFilter, setIncidentFilter] = useState<'critical' | 'pending' | 'all'>('critical')

  // AI operational summary
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)

  useEffect(() => {
    const unsubInc = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })

    const unsubSos = subscribeToAllSOS((data) => {
      setSosList(data)
    })

    return () => {
      unsubInc()
      unsubSos()
    }
  }, [])

  async function generateAiBriefing() {
    if (incidents.length === 0) {
      toast.info('No incident data currently available for briefing.')
      return
    }
    setGeneratingAi(true)
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidents, sosRequests: sosList }),
      })
      const data = await res.json()
      if (data.recommendation) {
        setAiSummary(data.recommendation)
        toast.success('AI Command Briefing generated successfully!')
      } else {
        toast.error('AI briefing generation failed.')
      }
    } catch {
      toast.error('AI service unreachable.')
    } finally {
      setGeneratingAi(false)
    }
  }

  // Real-time metric computations
  const total = incidents.length
  const critical = incidents.filter((i) => i.severity === 'critical').length
  const pending = incidents.filter((i) => i.status === 'pending' || i.status === 'reported').length
  const resolved = incidents.filter((i) => i.status === 'resolved').length
  const inProgress = incidents.filter((i) => i.status === 'in_progress').length
  const activeSOS = sosList.filter((s) => s.status === 'active' || s.status === 'acknowledged').length

  // Category chart dataset
  const categoryCount: Record<string, number> = {}
  incidents.forEach((i) => {
    const label = CATEGORY_LABELS[i.category] || i.category
    categoryCount[label] = (categoryCount[label] || 0) + 1
  })
  const categoryChartData = Object.entries(categoryCount).map(([name, count]) => ({
    name,
    count,
  }))

  // Severity chart dataset
  const severityChartData = [
    { name: 'Critical', count: incidents.filter((i) => i.severity === 'critical').length, color: '#e53945' },
    { name: 'High', count: incidents.filter((i) => i.severity === 'high').length, color: '#f59e0b' },
    { name: 'Medium', count: incidents.filter((i) => i.severity === 'medium').length, color: '#3182ce' },
    { name: 'Low', count: incidents.filter((i) => i.severity === 'low').length, color: '#16a34a' },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#101b2d] tracking-tight">
            Incident Operations Command
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time emergency monitoring, priority triage, and AI intelligence
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={generateAiBriefing}
          loading={generatingAi}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Brain size={16} /> Generate AI Situation Briefing
        </Button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Incidents"
          value={total}
          icon={<FileText size={20} />}
          color="slate"
        />
        <StatCard
          label="Critical Incidents"
          value={critical}
          icon={<AlertOctagon size={20} />}
          color={critical > 0 ? 'red' : 'slate'}
        />
        <StatCard
          label="Pending Incidents"
          value={pending}
          icon={<Clock size={20} />}
          color={pending > 0 ? 'orange' : 'slate'}
        />
        <StatCard
          label="Resolved Incidents"
          value={resolved}
          icon={<CheckCircle size={20} />}
          color="green"
        />
      </div>

      {/* AI Operational Briefing Card (if generated) */}
      {aiSummary && (
        <Card className="border-blue-400 bg-gradient-to-r from-blue-50/80 to-slate-50 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              AI Operational Briefing & Response Priorities
            </h2>
            <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Llama 3 • Automated Analysis
            </span>
          </CardHeader>
          <CardBody>
            <Markdown content={aiSummary} className="text-xs sm:text-sm" />
          </CardBody>
        </Card>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d]">Incidents by Category</h3>
          </CardHeader>
          <CardBody className="h-64">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No incident records to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3182ce" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Severity Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d]">Severity Distribution</h3>
          </CardHeader>
          <CardBody className="h-64">
            {incidents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No incident records to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom Priority Queues: Active SOS & Recent Critical Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority SOS Queue */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <AlertOctagon size={16} className="text-[#e53945]" />
              Active SOS Distress Signals ({activeSOS})
            </h3>
            <Link href="/admin/sos" className="text-xs text-blue-600 hover:underline">
              Manage SOS →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {sosList.filter((s) => s.status === 'active' || s.status === 'acknowledged').length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active SOS signals right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sosList
                  .filter((s) => s.status === 'active' || s.status === 'acknowledged')
                  .slice(0, 5)
                  .map((sos) => (
                    <div key={sos.sosId} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            #{sos.sosId.slice(-6)}
                          </span>
                          <SOSStatusBadge status={sos.status} />
                          <span className="text-xs font-semibold text-red-600 uppercase">
                            {sos.emergencyType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium truncate">{sos.userName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{sos.location}</p>
                      </div>
                      <Link href="/admin/sos">
                        <Button variant="outline" size="sm" className="text-xs h-7">
                          Respond
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Critical & High Incidents Queue with Expandable Ask AI Feature */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Incident Queue & AI Command
              </h3>
              <p className="text-[11px] text-slate-400">Expand any incident to view details & ask AI</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => setIncidentFilter('critical')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    incidentFilter === 'critical'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Critical ({critical})
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentFilter('pending')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    incidentFilter === 'pending'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Pending ({pending})
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentFilter('all')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    incidentFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All ({total})
                </button>
              </div>

              <Link href="/admin/incidents" className="text-xs text-blue-600 hover:underline shrink-0">
                All →
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {incidents.filter((i) => {
              if (incidentFilter === 'critical') return i.severity === 'critical' || i.severity === 'high'
              if (incidentFilter === 'pending') return i.status === 'pending' || i.status === 'reported'
              return true
            }).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No incidents matching the selected filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
                {incidents
                  .filter((i) => {
                    if (incidentFilter === 'critical') return i.severity === 'critical' || i.severity === 'high'
                    if (incidentFilter === 'pending') return i.status === 'pending' || i.status === 'reported'
                    return true
                  })
                  .slice(0, 10)
                  .map((inc) => {
                    const isExpanded = expandedIncidentId === inc.incidentId
                    const isCritical = inc.severity === 'critical'
                    return (
                      <div
                        key={inc.incidentId}
                        className={`transition-colors ${
                          isExpanded
                            ? 'bg-blue-50/40'
                            : isCritical
                            ? 'hover:bg-red-50/30'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Summary Row (Click to toggle expansion) */}
                        <div
                          onClick={() => setExpandedIncidentId(isExpanded ? null : inc.incidentId)}
                          className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-base">{categoryIcons[inc.category] || '⚠️'}</span>
                              <span className="font-mono text-xs font-bold text-slate-800">
                                #{inc.incidentId.slice(-6)}
                              </span>
                              <SeverityBadge severity={inc.severity} />
                              <StatusBadge status={inc.status} />
                              {inc.verified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  <ShieldCheck size={11} /> Verified
                                </span>
                              )}
                              <span className="text-xs text-slate-400">{timeAgo(inc.createdAt)}</span>
                            </div>

                            <p className="text-xs font-bold text-slate-900 truncate">{inc.title}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                              <MapPin size={12} className="shrink-0 text-slate-400" />
                              {inc.location}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
                            <span className="text-[11px] text-blue-600 font-semibold hidden sm:inline">
                              {isExpanded ? 'Collapse' : 'Expand & Ask AI'}
                            </span>
                            <div className="p-1 rounded-md text-slate-400 hover:text-slate-700 bg-slate-100">
                              {isExpanded ? (
                                <ChevronUp size={16} className="text-blue-600" />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Panel with Full Details & Ask AI button */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-white/80 space-y-3">
                            {/* Narrative */}
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Incident Narrative & Notes
                              </span>
                              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
                                {inc.description || 'No detailed description provided by the reporter.'}
                              </p>
                            </div>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                              <div className="bg-slate-50 p-2 rounded border border-slate-200/60">
                                <span className="text-[10px] text-slate-400 block uppercase font-medium">Reporter</span>
                                <span className="font-semibold text-slate-800 truncate block">
                                  {inc.reporterName || 'Anonymous'}
                                </span>
                                {inc.reporterEmail && (
                                  <span className="text-[10px] text-slate-400 truncate block">{inc.reporterEmail}</span>
                                )}
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200/60">
                                <span className="text-[10px] text-slate-400 block uppercase font-medium">People Affected</span>
                                <span className="font-semibold text-slate-800 block">
                                  {inc.peopleAffected ? `${inc.peopleAffected} individuals` : 'Unspecified'}
                                </span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-200/60 col-span-2 sm:col-span-1">
                                <span className="text-[10px] text-slate-400 block uppercase font-medium">GPS Telemetry</span>
                                <span className="font-mono text-[11px] text-slate-700 truncate block">
                                  {inc.latitude && inc.longitude ? `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}` : 'Location only'}
                                </span>
                              </div>
                            </div>

                            {/* Evidence Photos */}
                            {inc.evidenceUrls && inc.evidenceUrls.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                  Photos & Evidence ({inc.evidenceUrls.length})
                                </span>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {inc.evidenceUrls.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="relative h-14 w-20 rounded border border-slate-200 overflow-hidden shrink-0 group hover:ring-2 hover:ring-blue-500 transition-all"
                                    >
                                      <img
                                        src={url}
                                        alt={`Evidence ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Toolbar with Ask AI Button */}
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                              <IncidentAiChat
                                incident={inc}
                                buttonVariant="primary"
                                buttonSize="sm"
                                buttonLabel="Ask AI about this incident"
                                buttonClassName="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg"
                              />

                              <Link href={`/admin/incidents/${inc.incidentId}`}>
                                <Button variant="outline" size="sm" className="text-xs h-8 flex items-center gap-1">
                                  <span>Full Dossier</span>
                                  <ExternalLink size={12} />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

