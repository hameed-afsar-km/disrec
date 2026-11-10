'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import type { Incident, Shelter } from '@/lib/types'

interface Props { origin: [number, number]; shelter: Shelter; incidents: Incident[] }

function ViewBounds({ origin, shelter }: Pick<Props, 'origin' | 'shelter'>) {
  const map = useMap()
  useEffect(() => { map.fitBounds([origin, [shelter.latitude, shelter.longitude]], { padding: [36, 36] }) }, [map, origin, shelter])
  return null
}

const icon = (label: string, color: string) => L.divIcon({
  className: 'evacuation-marker',
  html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${color};border:3px solid white;color:white;box-shadow:0 3px 12px rgba(15,23,42,.35);font-size:16px">${label}</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -17],
})

export function EvacuationRouteMapCore({ origin, shelter, incidents }: Props) {
  const active = incidents.filter((incident) => incident.status !== 'resolved')
  return (
    <div className="relative z-0 isolate h-[380px] overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={origin} zoom={13} style={{ height: '100%', width: '100%' }}>
        <ViewBounds origin={origin} shelter={shelter} />
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {active.map((incident) => (
          <Circle key={incident.incidentId} center={[incident.latitude, incident.longitude]} radius={incident.severity === 'critical' ? 5000 : 2500} pathOptions={{ color: '#e53945', fillColor: '#ef4444', fillOpacity: 0.15, weight: 1 }} />
        ))}
        <Polyline positions={[origin, [shelter.latitude, shelter.longitude]]} pathOptions={{ color: '#2563eb', weight: 5, dashArray: '10 10' }} />
        <Marker position={origin} icon={icon('●', '#2563eb')}><Popup>Your current location</Popup></Marker>
        <Marker position={[shelter.latitude, shelter.longitude]} icon={icon('⌂', '#16a34a')}><Popup><strong>{shelter.name}</strong><br />{shelter.address}</Popup></Marker>
      </MapContainer>
    </div>
  )
}
