// app/admin/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  BarChart2, TrendingUp, Calendar, Download, ShieldCheck,
  CheckCircle, Clock, AlertTriangle, Truck, Users, Radio,
  Activity, MapPin,
} from 'lucide-react'
import {
  subscribeToAllIncidents,
  subscribeToAllSOS,
  subscribeToResponseTeams,
} from '@/lib/firestore'
import type { Incident, SOSRequest, ResponseTeam } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { toast } from 'sonner'

const CHART_COLORS = ['#3182ce', '#e53945', '#f59e0b', '#16a34a', '#8b5cf6', '#ec4899', '#64748b']

export default function AdminAnalyticsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [sosList, setSosList] = useState<SOSRequest[]>([])
  const [teams, setTeams] = useState<ResponseTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubInc = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })
    const unsubSos = subscribeToAllSOS((data) => setSosList(data))
    const unsubTeams = subscribeToResponseTeams((data) => setTeams(data))

    return () => {
      unsubInc()
      unsubSos()
      unsubTeams()
    }
  }, [])

  function exportCSV() {
    if (incidents.length === 0) {
      toast.info('No incident data to export.')
      return
    }

    const headers = ['Incident ID', 'Title', 'Category', 'Severity', 'Status', 'Location', 'People Affected', 'Priority Level', 'Assigned Team', 'Created At']
    const rows = incidents.map((i) => [
      i.incidentId,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.severity,
      i.status,
      `"${i.location.replace(/"/g, '""')}"`,
      i.peopleAffected ?? 0,
      i.priorityLevel ?? 'N/A',
      i.assignedTeamName ?? 'Unassigned',
      i.createdAt,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `emergency_incidents_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report exported to CSV!')
  }

  // ── Core Counts ──────────────────────────────────────────────
  const totalReports = incidents.length
  const criticalCount = incidents.filter(
    (i) => i.severity === 'critical'
  ).length
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length
  const assignedCount = incidents.filter(
    (i) => i.status === 'assigned' || i.status === 'in_progress'
  ).length
  const pendingCount = incidents.filter(
    (i) => i.status === 'reported' || i.status === 'pending'
  ).length
  const resolutionRate = totalReports > 0 ? ((resolvedCount / totalReports) * 100).toFixed(0) : '0'

  // ── Team Stats ────────────────────────────────────────────────
  const availableTeams = teams.filter((t) => t.status === 'available').length
  const busyTeams = teams.filter((t) => t.status === 'busy').length
  const offlineTeams = teams.filter((t) => t.status === 'offline').length

  // ── Charts ────────────────────────────────────────────────────

  // Incident timeline (grouped by date)
  const dateCounts: Record<string, number> = {}
  incidents.forEach((inc) => {
    const d = new Date(inc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    dateCounts[d] = (dateCounts[d] || 0) + 1
  })
  const timelineData = Object.entries(dateCounts).map(([date, count]) => ({ date, count }))

  // Category breakdown
  const catCounts: Record<string, number> = {}
  incidents.forEach((inc) => {
    const label = CATEGORY_LABELS[inc.category] || inc.category
    catCounts[label] = (catCounts[label] || 0) + 1
  })
  const categoryData = Object.entries(catCounts).map(([name, value]) => ({ name, value }))

  // Severity distribution
  const sevCounts: Record<string, number> = {}
  incidents.forEach((inc) => {
    const s = inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)
    sevCounts[s] = (sevCounts[s] || 0) + 1
  })
  const severityData = Object.entries(sevCounts).map(([name, value]) => ({ name, value }))
  const severityColors: Record<string, string> = {
    Critical: '#e53945',
    High: '#f59e0b',
    Medium: '#3182ce',
    Low: '#16a34a',
  }

  // Incident status distribution
  const statusLabels: Record<string, string> = {
    reported: 'Reported',
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  }
  const statusCounts: Record<string, number> = {}
  incidents.forEach((inc) => {
    const s = statusLabels[inc.status] ?? inc.status
    statusCounts[s] = (statusCounts[s] || 0) + 1
  })
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
  const statusColors: Record<string, string> = {
    Reported: '#64748b',
    Pending: '#8b5cf6',
    Assigned: '#3182ce',
    'In Progress': '#f59e0b',
    Resolved: '#16a34a',
  }

  // Team status distribution
  const teamStatusData = [
    { name: 'Available', value: availableTeams, fill: '#16a34a' },
    { name: 'Busy', value: busyTeams, fill: '#f59e0b' },
    { name: 'Offline', value: offlineTeams, fill: '#64748b' },
  ].filter((d) => d.value > 0)

  // Team discipline distribution
  const teamCatCounts: Record<string, number> = {}
  teams.forEach((t) => {
    const label = t.category.charAt(0).toUpperCase() + t.category.slice(1)
    teamCatCounts[label] = (teamCatCounts[label] || 0) + 1
  })
  const teamCategoryData = Object.entries(teamCatCounts).map(([name, value]) => ({ name, value }))

  // Priority level breakdown (P1-P4)
  const priorityCounts: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 }
  incidents.forEach((inc) => {
    if (inc.priorityLevel) priorityCounts[inc.priorityLevel] = (priorityCounts[inc.priorityLevel] || 0) + 1
  })
  const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }))
  const priorityColors: Record<string, string> = {
    P1: '#e53945', P2: '#f59e0b', P3: '#3182ce', P4: '#16a34a',
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <BarChart2 size={26} className="text-blue-600" />
            Operational Analytics &amp; Disaster Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live incident prioritization, team deployment stats, resolution rates, and CSV export
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download size={14} /> Export CSV Report
        </Button>
      </div>

      {/* ── KPI Row 1: Incidents ──────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity size={14} /> Incident Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Incidents"
            value={totalReports}
            icon={<BarChart2 size={20} />}
            color="blue"
            trend="All logged emergencies"
          />
          <StatCard
            label="Critical Incidents"
            value={criticalCount}
            icon={<AlertTriangle size={20} />}
            color="red"
            trend="P1 severity — immediate response"
          />
          <StatCard
            label="Assigned / Active"
            value={assignedCount}
            icon={<Radio size={20} />}
            color="orange"
            trend="Assigned or in progress"
          />
          <StatCard
            label="Resolved"
            value={resolvedCount}
            icon={<CheckCircle size={20} />}
            color="green"
            trend={`${resolutionRate}% resolution rate`}
          />
        </div>
      </div>

      {/* ── KPI Row 2: Teams ─────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Truck size={14} /> Response Team Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Teams"
            value={teams.length}
            icon={<Truck size={20} />}
            color="blue"
            trend="Registered response units"
          />
          <StatCard
            label="Available Teams"
            value={availableTeams}
            icon={<CheckCircle size={20} />}
            color="green"
            trend="Ready for immediate dispatch"
          />
          <StatCard
            label="Busy Teams"
            value={busyTeams}
            icon={<Clock size={20} />}
            color="orange"
            trend="On active emergency missions"
          />
          <StatCard
            label="Total SOS Signals"
            value={sosList.length}
            icon={<AlertTriangle size={20} />}
            color="red"
            trend="Distress signals received"
          />
        </div>
      </div>

      {/* ── Charts Row 1 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents Over Time */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              Incident Volume Over Time
            </h3>
          </CardHeader>
          <CardBody className="h-64">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No telemetry recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3182ce" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Incident Distribution by Category */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <MapPin size={16} className="text-purple-500" />
              Incident Distribution by Category
            </h3>
          </CardHeader>
          <CardBody className="h-64">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Charts Row 2 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <ShieldCheck size={16} className="text-red-500" />
              Severity Distribution
            </h3>
          </CardHeader>
          <CardBody className="h-56">
            {severityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {severityData.map((d, i) => (
                      <Cell key={i} fill={severityColors[d.name] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Incident Status Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              Incident Status Breakdown
            </h3>
          </CardHeader>
          <CardBody className="h-56">
            {statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((d, i) => (
                      <Cell key={i} fill={statusColors[d.name] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Team Status Distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <Truck size={16} className="text-green-600" />
              Team Availability Status
            </h3>
          </CardHeader>
          <CardBody className="h-56">
            {teamStatusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No teams registered yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={teamStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={72}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {teamStatusData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Charts Row 3 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Level Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Priority Level Distribution (P1–P4)
            </h3>
          </CardHeader>
          <CardBody className="h-56">
            {priorityData.every((d) => d.value === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No prioritized incidents yet — prioritization runs automatically on creation
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {priorityData.map((d) => (
                      <Cell key={d.name} fill={priorityColors[d.name] ?? '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Team Discipline / Category */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              Team Discipline Breakdown
            </h3>
          </CardHeader>
          <CardBody className="h-56">
            {teamCategoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No teams registered yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamCategoryData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {teamCategoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Summary Table ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
            <Calendar size={16} className="text-slate-500" />
            System-Wide Summary
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            {[
              { label: 'Total Incidents', value: totalReports, color: 'text-blue-600' },
              { label: 'Critical', value: criticalCount, color: 'text-red-600' },
              { label: 'Available Teams', value: availableTeams, color: 'text-green-600' },
              { label: 'Busy Teams', value: busyTeams, color: 'text-amber-600' },
              { label: 'Assigned', value: assignedCount, color: 'text-blue-500' },
              { label: 'Resolved', value: resolvedCount, color: 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 bg-slate-50 rounded-xl">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
