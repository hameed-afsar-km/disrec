// components/map/DispatchRouteMap.tsx
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Incident, ResponseTeam } from '@/lib/types'
import { Skeleton } from '@/components/ui/Skeleton'

interface DispatchRouteMapProps {
  incident: Incident
  assignedTeam?: ResponseTeam | null
  nearbyTeams?: ResponseTeam[]
  onSelectTeam?: (team: ResponseTeam) => void
  height?: string
}

const LeafletDispatchMap = dynamic(
  () => import('./DispatchRouteCore').then((mod) => mod.DispatchRouteCore),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] bg-slate-100 flex flex-col items-center justify-center rounded-xl p-8 space-y-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <p className="text-xs text-slate-500 font-medium">Loading Dispatch Navigation & Routing...</p>
      </div>
    ),
  }
)

export function DispatchRouteMap(props: DispatchRouteMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[350px] bg-slate-100 flex items-center justify-center rounded-xl">
        <p className="text-xs text-slate-400">Initializing GPS Telemetry Map...</p>
      </div>
    )
  }

  return <LeafletDispatchMap {...props} />
}

