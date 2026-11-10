// components/map/MapContainer.tsx
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Incident } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface LiveMapProps {
  incidents: Incident[]
  center?: [number, number]
  zoom?: number
  showHeatmap?: boolean
}

// Leaflet and react-leaflet require window / DOM, so they MUST be dynamically imported with ssr: false
const LeafletMap = dynamic(
  () => import('./LeafletMapCore').then((mod) => mod.LeafletMapCore),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] bg-slate-100 flex flex-col items-center justify-center rounded-xl p-8 space-y-3">
        <Skeleton className="w-16 h-16 rounded-full" />
        <p className="text-xs text-slate-500 font-medium">Loading OpenStreetMap & Crisis Markers...</p>
      </div>
    ),
  }
)

export function EmergencyMapContainer({
  incidents,
  center = [20.5937, 78.9629], // Default center (India)
  zoom = 5,
  showHeatmap = false,
}: LiveMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-100 flex items-center justify-center rounded-xl">
        <p className="text-xs text-slate-400">Initializing Emergency Map...</p>
      </div>
    )
  }

  return (
    <LeafletMap
      incidents={incidents}
      center={center}
      zoom={zoom}
      showHeatmap={showHeatmap}
    />
  )
}

