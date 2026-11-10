// components/map/MapContainer.tsx
'use client'

import dynamic from 'next/dynamic'
import type { Incident } from '@/lib/types'
import { Skeleton } from '@/components/ui/Skeleton'

export interface FamilyMapMember {
  id: string
  name: string
  relation: string
  status: 'Safe' | 'Affected' | 'Unknown'
  lastKnownLocation?: string
  latitude?: number
  longitude?: number
}

interface LiveMapProps {
  incidents: Incident[]
  center?: [number, number]
  zoom?: number
  showHeatmap?: boolean
  familyMembers?: FamilyMapMember[]
  focusedFamilyId?: string | null
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
  familyMembers = [],
  focusedFamilyId = null,
}: LiveMapProps) {
  return (
    <LeafletMap
      incidents={incidents}
      center={center}
      zoom={zoom}
      showHeatmap={showHeatmap}
      familyMembers={familyMembers}
      focusedFamilyId={focusedFamilyId}
    />
  )
}

