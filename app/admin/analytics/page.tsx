// app/admin/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  BarChart2, TrendingUp, Calendar, Download, ShieldCheck,
  CheckCircle, Clock, AlertTriangle
} from 'lucide-react'
import { subscribeToAllIncidents, subscribeToAllSOS } from '@/lib/firestore'
import type { Incident, SOSRequest } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { toast } from 'sonner'

export default function AdminAnalyticsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [sosList, setSosList] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubInc = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })
    const unsubSos = subscribeToAllSOS((data) => setSosList(data))

    return () => {
      unsubInc()
      unsubSos()
    }
  }, [])

  function exportCSV() {
    if (incidents.length === 0) {
      toast.info('No incident data to export.')
      return
    }

    const headers = ['Incident ID', 'Title', 'Category', 'Severity', 'Status', 'Location', 'Created At']
    const rows = incidents.map((i) => [
      i.incidentId,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.severity,
      i.status,
      `"${i.location.replace(/"/g, '""')}"`,
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

  // Analytics Computations
  const totalReports = incidents.length
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length
  const resolutionRate = totalReports > 0 ? ((resolvedCount / totalReports) * 100).toFixed(0) : '0'

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

  const COLORS = ['#3182ce', '#e53945', '#f59e0b', '#16a34a', '#8b5cf6', '#ec4899', '#64748b']

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <BarChart2 size={26} className="text-blue-600" />
            Operational Analytics & Disaster Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aggregated system reporting, incident resolution rates, and CSV data export
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download size={14} /> Export CSV Report
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Logged Incidents" value={totalReports} icon={<BarChart2 size={20} />} color="blue" />
        <StatCard label="Resolved Incidents" value={resolvedCount} icon={<CheckCircle size={20} />} color="green" />
        <StatCard label="Resolution Rate" value={`${resolutionRate}%`} icon={<TrendingUp size={20} />} color="orange" />
        <StatCard label="Total SOS Signals" value={sosList.length} icon={<AlertTriangle size={20} />} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents Over Time */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d]">Incident Volume Over Time</h3>
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

        {/* Category Share */}
        <Card>
          <CardHeader>
            <h3 className="font-bold text-sm text-[#101b2d]">Category Share</h3>
          </CardHeader>
          <CardBody className="h-64">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No telemetry recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

