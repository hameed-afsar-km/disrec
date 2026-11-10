'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Navigation, ShieldCheck, MapPin, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EvacuationRouteMap } from '@/components/map/EvacuationRouteMap'
import { subscribeToAllIncidents } from '@/lib/firestore'
import { subscribeToShelters, recommendSafeShelters, type ShelterRecommendation } from '@/lib/shelters'
import type { Incident, Shelter } from '@/lib/types'

const DEFAULT_ORIGIN: [number, number] = [13.0418, 80.2341]

export default function EvacuationPage() {
  const [origin, setOrigin] = useState<[number, number]>(DEFAULT_ORIGIN)
  const [usingGps, setUsingGps] = useState(false)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [selected, setSelected] = useState<ShelterRecommendation | null>(null)

  useEffect(() => {
    const unsubscribeIncidents = subscribeToAllIncidents(setIncidents)
    const unsubscribeShelters = subscribeToShelters(setShelters)
    return () => { unsubscribeIncidents(); unsubscribeShelters() }
  }, [])

  const recommendations = recommendSafeShelters(origin, shelters, incidents)
  const activeRecommendation = selected && recommendations.some((item) => item.shelter.shelterId === selected.shelter.shelterId)
    ? recommendations.find((item) => item.shelter.shelterId === selected.shelter.shelterId) || recommendations[0]
    : recommendations[0]

  function locateMe() {
    if (!navigator.geolocation) return
    setUsingGps(true)
    navigator.geolocation.getCurrentPosition(
      (position) => { setOrigin([position.coords.latitude, position.coords.longitude]); setUsingGps(false) },
      () => setUsingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const directionsUrl = activeRecommendation
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${activeRecommendation.shelter.latitude},${activeRecommendation.shelter.longitude}&travelmode=walking`
    : '#'

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Safe evacuation navigation</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Find the safest available shelter</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Recommendations weigh distance, shelter capacity and active incident caution zones — not distance alone.</p></div>
          <Button variant="primary" onClick={locateMe} loading={usingGps} className="bg-cyan-500 hover:bg-cyan-400"><Navigation size={16} /> Use my live location</Button>
        </div>
      </div>

      {activeRecommendation ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2"><CardHeader><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Recommended safe corridor</h2><p className="text-xs text-slate-500">Red zones mark active incident caution areas.</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{activeRecommendation.safetyScore}/100 safety</span></div></CardHeader><CardBody><EvacuationRouteMap origin={origin} shelter={activeRecommendation.shelter} incidents={incidents} /></CardBody></Card>
          <Card className="border-emerald-200 bg-emerald-50/60"><CardBody className="space-y-5 p-5"><div className="flex gap-3"><div className="rounded-xl bg-emerald-600 p-2 text-white"><ShieldCheck size={20} /></div><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Best option</p><h2 className="font-bold text-slate-900">{activeRecommendation.shelter.name}</h2></div></div><div className="space-y-2 text-sm text-slate-700"><p className="flex gap-2"><MapPin size={15} className="mt-0.5 text-emerald-600" />{activeRecommendation.shelter.address}</p><p className="flex gap-2"><Users size={15} className="mt-0.5 text-emerald-600" />{activeRecommendation.shelter.capacity - activeRecommendation.shelter.occupancy} spaces available</p><p className="flex gap-2"><Navigation size={15} className="mt-0.5 text-emerald-600" />{activeRecommendation.distanceKm} km away</p></div><p className="rounded-xl border border-emerald-200 bg-white/80 p-3 text-xs leading-relaxed text-emerald-900">{activeRecommendation.reason}</p><a href={directionsUrl} target="_blank" rel="noreferrer"><Button variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-700">Start turn-by-turn navigation <ExternalLink size={14} /></Button></a></CardBody></Card>
        </div>
      ) : <Card><CardBody className="p-10 text-center"><AlertTriangle className="mx-auto text-amber-500" /><p className="mt-3 font-bold">No open shelters are available nearby.</p><p className="mt-1 text-sm text-slate-500">Please contact emergency services or await an official shelter broadcast.</p></CardBody></Card>}

      <div><h2 className="mb-3 text-lg font-bold text-slate-900">Alternative safe shelters</h2><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{recommendations.slice(1, 4).map((recommendation) => <button key={recommendation.shelter.shelterId} type="button" onClick={() => setSelected(recommendation)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"><div className="flex justify-between gap-2"><p className="font-bold text-slate-900">{recommendation.shelter.name}</p><span className="text-xs font-bold text-emerald-700">{recommendation.safetyScore}</span></div><p className="mt-2 text-xs text-slate-500">{recommendation.distanceKm} km · {recommendation.shelter.capacity - recommendation.shelter.occupancy} spaces left</p></button>)}</div></div>
      <p className="text-center text-xs text-slate-500">Evacuation guidance is informational. Follow official alerts and emergency personnel instructions.</p>
    </div>
  )
}
