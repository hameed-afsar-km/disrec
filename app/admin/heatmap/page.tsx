// app/admin/heatmap/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmergencyMapContainer } from '@/components/map/MapContainer'
import {
  Map, Layers, AlertTriangle, ShieldCheck, Filter,
  TrendingUp, Radio
} from 'lucide-react'
import { subscribeToAllIncidents } from '@/lib/firestore'
import type { Incident, EmergencyCategory } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'

export default function AdminHeatmapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const unsub = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = incidents.filter((inc) => {
    const matchesCat = selectedCategory === 'all' || inc.category === selectedCategory
    const matchesSev = severityFilter === 'all' || inc.severity === severityFilter
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? inc.status !== 'resolved'
        : inc.status === 'resolved'
    return matchesCat && matchesSev && matchesStatus
  })

  // Hotspot analysis stats
  const totalInArea = filtered.length
  const criticalCount = filtered.filter((i) => i.severity === 'critical').length

  const catCount: Record<string, number> = {}
  filtered.forEach((i) => {
    catCount[i.category] = (catCount[i.category] || 0) + 1
  })
  const topCategoryEntry = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]
  const topCategory = topCategoryEntry
    ? CATEGORY_LABELS[topCategoryEntry[0] as EmergencyCategory]
    : 'None'

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-7rem)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <Layers size={22} className="text-[#e53945]" />
            GIS Emergency Concentration Heatmap
          </h1>
          <p className="text-xs text-slate-500">
            Density clustering & geographical hotspot monitoring of incoming crisis reports
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High + Critical</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Workspace: Heatmap Canvas + Side Analytics Panel */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Heatmap Map Window */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative min-h-[350px]">
          <EmergencyMapContainer
            incidents={filtered}
            center={[20.5937, 78.9629]}
            zoom={5}
            showHeatmap={true}
          />
        </div>

        {/* Hotspot Intelligence Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-3 overflow-y-auto">
          <Card>
            <CardHeader className="py-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Hotspot Intelligence
              </h3>
            </CardHeader>
            <CardBody className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Total Plotted Incidents:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{totalInArea}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Critical Priority Density:</span>
                <span className="font-bold text-red-600 font-mono text-sm">{criticalCount}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Top Hazard Category:</span>
                <span className="font-bold text-slate-800">{topCategory}</span>
              </div>

              <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200 text-blue-900 leading-relaxed text-[11px]">
                <strong>Heatmap Guidance:</strong> Red and amber concentric zones represent high hazard clusters. Ensure closest regional emergency fire/medical depots are alerted.
              </div>
            </CardBody>
          </Card>

          {/* Active Hotspot Locations List */}
          <Card>
            <CardHeader className="py-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Recent Plotted Coordinates
              </h3>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {filtered.slice(0, 8).map((inc) => (
                  <div key={inc.incidentId} className="p-2.5 text-xs">
                    <p className="font-bold text-slate-850 truncate">{inc.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      📍 {inc.location} ({inc.latitude ? `${inc.latitude.toFixed(2)}, ${inc.longitude.toFixed(2)}` : 'No GPS'})
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

