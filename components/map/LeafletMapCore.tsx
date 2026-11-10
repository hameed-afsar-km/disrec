// components/map/LeafletMapCore.tsx
'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Incident, Severity } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import type { FamilyMapMember } from './MapContainer'

interface LeafletCoreProps {
  incidents: Incident[]
  center: [number, number]
  zoom: number
  showHeatmap?: boolean
  familyMembers?: FamilyMapMember[]
  focusedFamilyId?: string | null
}

// Custom Leaflet DivIcon factory for severity-based pulsing map markers
function createCustomMarker(severity: Severity, categoryIcon: string) {
  const colors: Record<Severity, string> = {
    critical: '#e53945',
    high: '#f59e0b',
    medium: '#3182ce',
    low: '#16a34a',
  }

  const color = colors[severity] || '#3182ce'

  return L.divIcon({
    className: 'custom-emergency-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: ${color};
        color: white;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        font-size: 14px;
      ">
        <span style="line-height: 1;">${categoryIcon}</span>
        ${
          severity === 'critical'
            ? `<div style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                border: 2px solid #e53945;
                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>`
            : ''
        }
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

// User location marker
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(37,99,235,0.6);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function createFamilyMarker(status: FamilyMapMember['status'], isFocused: boolean) {
  const color = status === 'Safe' ? '#16a34a' : status === 'Affected' ? '#e53945' : '#f59e0b'
  return L.divIcon({
    className: 'family-location-marker',
    html: `<div style="width:${isFocused ? 36 : 28}px;height:${isFocused ? 36 : 28}px;display:flex;align-items:center;justify-content:center;background:${color};color:white;border:3px solid white;border-radius:12px;box-shadow:0 0 0 ${isFocused ? 5 : 0}px ${color}44,0 4px 12px rgba(15,23,42,.35);font-size:16px;transition:all .2s">⌖</div>`,
    iconSize: isFocused ? [36, 36] : [28, 28],
    iconAnchor: isFocused ? [18, 18] : [14, 14],
    popupAnchor: [0, isFocused ? -18 : -14],
  })
}

// Subcomponent to sync map view when center changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

export function LeafletMapCore({
  incidents,
  center,
  zoom,
  showHeatmap = false,
  familyMembers = [],
  focusedFamilyId = null,
}: LeafletCoreProps) {
  // Filter incidents with valid coordinates
  const validIncidents = incidents.filter(
    (inc) =>
      typeof inc.latitude === 'number' &&
      typeof inc.longitude === 'number' &&
      inc.latitude !== 0 &&
      inc.longitude !== 0 &&
      !isNaN(inc.latitude) &&
      !isNaN(inc.longitude)
  )

  const catEmoji: Record<string, string> = {
    fire: '🔥',
    road_accident: '🚗',
    medical: '🏥',
    flood: '🌊',
    building_collapse: '🏗️',
    natural_disaster: '🌪️',
    other: '⚠️',
  }

  const locatedFamily = familyMembers.filter(
    (member) => typeof member.latitude === 'number' && typeof member.longitude === 'number'
  )

  return (
    <div className="w-full h-full min-h-[500px] relative rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      >
        <ChangeView center={center} zoom={zoom} />

        {/* High-quality OpenStreetMap Tile Server */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Heatmap rings / visual density buffers when heatmap mode is toggled */}
        {showHeatmap &&
          validIncidents.map((inc) => {
            const radius = inc.severity === 'critical' ? 4000 : inc.severity === 'high' ? 2500 : 1200
            const fillColor =
              inc.severity === 'critical' ? '#e53945' : inc.severity === 'high' ? '#f59e0b' : '#3182ce'
            return (
              <Circle
                key={`heat-${inc.incidentId}`}
                center={[inc.latitude, inc.longitude]}
                radius={radius}
                pathOptions={{
                  fillColor,
                  fillOpacity: 0.25,
                  stroke: false,
                }}
              />
            )
          })}

        {/* Incidents Markers */}
        {validIncidents.map((inc) => (
          <Marker
            key={inc.incidentId}
            position={[inc.latitude, inc.longitude]}
            icon={createCustomMarker(inc.severity, catEmoji[inc.category] || '⚠️')}
          >
            <Popup className="emergency-map-popup">
              <div className="p-1 space-y-2 max-w-[240px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-500 font-bold">
                    #{inc.incidentId.slice(-6)}
                  </span>
                  <SeverityBadge severity={inc.severity} />
                </div>
                <h4 className="font-bold text-xs text-[#101b2d] leading-tight">{inc.title}</h4>
                <p className="text-[11px] text-slate-600 line-clamp-2">{inc.description}</p>
                <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                  📍 {inc.location}
                </div>
                <Link
                  href={`/my-reports/${inc.incidentId}`}
                  className="block text-center text-xs bg-blue-600 text-white py-1 rounded font-medium hover:bg-blue-700"
                >
                  View Details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Aadhaar-linked family safety markers */}
        {locatedFamily.map((member) => (
          <Marker
            key={`family-${member.id}`}
            position={[member.latitude!, member.longitude!]}
            icon={createFamilyMarker(member.status, member.id === focusedFamilyId)}
          >
            <Popup>
              <div className="space-y-1 p-1 text-xs">
                <p className="font-bold text-slate-900">{member.name}</p>
                <p className="text-slate-500">{member.relation} · Aadhaar-linked family</p>
                <p className="font-semibold" style={{ color: member.status === 'Safe' ? '#15803d' : member.status === 'Affected' ? '#c0252f' : '#b45309' }}>
                  ● {member.status}
                </p>
                {member.lastKnownLocation && <p className="border-t border-slate-100 pt-1 text-slate-600">📍 {member.lastKnownLocation}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

