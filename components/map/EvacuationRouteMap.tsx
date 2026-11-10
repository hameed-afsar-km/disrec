'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { Incident, Shelter } from '@/lib/types'

interface EvacuationRouteMapProps {
  origin: [number, number]
  shelter: Shelter
  incidents: Incident[]
}

export const EvacuationRouteMap = dynamic(
  () => import('./EvacuationRouteMapCore').then((mod) => mod.EvacuationRouteMapCore),
  { ssr: false, loading: () => <div className="h-[380px] animate-pulse rounded-xl bg-slate-100" /> }
) as ComponentType<EvacuationRouteMapProps>
