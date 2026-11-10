// app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SeverityBadge, StatusBadge, SOSStatusBadge } from '@/components/ui/Badge'
import {
  AlertTriangle, FileText, AlertOctagon, CheckCircle,
  Clock, Sparkles, Brain, ArrowRight, MapPin, ChevronRight
} from 'lucide-react'
import { subscribeToAllIncidents, subscribeToAllSOS } from '@/lib/firestore'
import { timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, SOSRequest } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@/lib/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [sosList, setSosList] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)

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
  const active = incidents.filter((i) => i.status !== 'resolved').length
  const critical = incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length
  const resolved = incidents.filter((i) => i.status === 'resolved').length
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Incidents"
          value={total}
          icon={<FileText size={20} />}
          color="slate"
        />
        <StatCard
          label="Active Incidents"
          value={active}
          icon={<AlertTriangle size={20} />}
          color={active > 0 ? 'orange' : 'slate'}
        />
        <StatCard
          label="Critical Triage"
          value={critical}
          icon={<AlertOctagon size={20} />}
          color={critical > 0 ? 'red' : 'slate'}
        />
        <StatCard
          label="Active SOS Signals"
          value={activeSOS}
          icon={<AlertTriangle size={20} />}
          color={activeSOS > 0 ? 'red' : 'slate'}
        />
        <StatCard
          label="Resolved Today"
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
            <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {aiSummary}
            </div>
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

        {/* Critical & High Incidents Queue */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Critical & High Incident Queue
            </h3>
            <Link href="/admin/incidents" className="text-xs text-blue-600 hover:underline">
              All Incidents →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No critical or high emergencies reported.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {incidents
                  .filter((i) => i.severity === 'critical' || i.severity === 'high')
                  .slice(0, 5)
                  .map((inc) => (
                    <Link
                      key={inc.incidentId}
                      href={`/admin/incidents/${inc.incidentId}`}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors block"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={inc.severity} />
                          <StatusBadge status={inc.status} />
                          <span className="text-xs text-slate-400">{timeAgo(inc.createdAt)}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">{inc.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{inc.location}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    </Link>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

