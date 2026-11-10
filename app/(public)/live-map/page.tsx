// app/(public)/live-map/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SeverityBadge } from '@/components/ui/Badge'
import { EmergencyMapContainer } from '@/components/map/MapContainer'
import {
  MapPin, Filter, Layers, Navigation, RefreshCw, Flame,
  AlertTriangle, Shield, CheckCircle
} from 'lucide-react'
import { subscribeToAllIncidents } from '@/lib/firestore'
import type { Incident, EmergencyCategory, Severity } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@/lib/types'

export default function LiveMapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('active')
  const [showHeatmap, setShowHeatmap] = useState(false)

  // Map state
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629])
  const [zoom, setZoom] = useState(5)

  useEffect(() => {
    const unsub = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)

      // If user has incidents with coordinates, auto-center on the newest
      const withCoords = data.filter((i) => i.latitude && i.longitude)
      if (withCoords.length > 0) {
        setCenter([withCoords[0].latitude, withCoords[0].longitude])
        setZoom(10)
      }
    })

    return () => unsub()
  }, [])

  function locateMe() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter([pos.coords.latitude, pos.coords.longitude])
          setZoom(13)
        },
        () => console.warn('Location permission denied')
      )
    }
  }

  const filteredIncidents = incidents.filter((inc) => {
    const matchesCat = selectedCategory === 'all' || inc.category === selectedCategory
    const matchesSev = selectedSeverity === 'all' || inc.severity === selectedSeverity
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? inc.status !== 'resolved'
        : inc.status === 'resolved'

    return matchesCat && matchesSev && matchesStatus
  })

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50">
      {/* Top Map Control Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[#101b2d] flex items-center gap-1.5">
              <MapPin size={18} className="text-[#e53945]" />
              Live Emergency GIS Map
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">
              {filteredIncidents.length} plotted
            </span>
          </div>

          {/* Controls & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'active' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('resolved')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'resolved' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                Resolved
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                All
              </button>
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            {/* Severity Select */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Severities</option>
              {Object.entries(SEVERITY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            {/* Heatmap Layer Toggle */}
            <Button
              variant={showHeatmap ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowHeatmap((v) => !v)}
              className="text-xs h-8"
            >
              <Layers size={14} />
              {showHeatmap ? 'Heatmap: ON' : 'Heatmap'}
            </Button>

            {/* Locate GPS */}
            <Button variant="outline" size="sm" onClick={locateMe} className="text-xs h-8">
              <Navigation size={14} /> My Location
            </Button>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="flex-1 w-full h-full relative">
        <EmergencyMapContainer
          incidents={filteredIncidents}
          center={center}
          zoom={zoom}
          showHeatmap={showHeatmap}
        />

        {/* Floating Map Legend */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1.5 max-w-xs">
          <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Severity Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#e53945]" />
            <span>Critical (Life threat, immediate)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <span>High (Severe hazard)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#3182ce]" />
            <span>Medium (Needs response)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#16a34a]" />
            <span>Low (Minor concern)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

