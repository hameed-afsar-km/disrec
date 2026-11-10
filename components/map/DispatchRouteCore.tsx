// components/map/DispatchRouteCore.tsx
'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Incident, ResponseTeam } from '@/lib/types'
import { SeverityBadge } from '@/components/ui/Badge'
import { teamCategoryIcons, categoryIcons, distanceKm } from '@/lib/utils'
import { TEAM_CATEGORY_LABELS, TEAM_STATUS_LABELS } from '@/lib/types'

interface DispatchRouteCoreProps {
  incident: Incident
  assignedTeam?: ResponseTeam | null
  nearbyTeams?: ResponseTeam[]
  onSelectTeam?: (team: ResponseTeam) => void
  height?: string
}

function createIncidentMarker(severity: string, icon: string) {
  const colors: Record<string, string> = {
    critical: '#e53945',
    high: '#f59e0b',
    medium: '#3182ce',
    low: '#16a34a',
  }
  const color = colors[severity] || '#e53945'

  return L.divIcon({
    className: 'dispatch-incident-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: ${color};
        color: white;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        font-size: 16px;
      ">
        <span>${icon}</span>
        <div style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid ${color};
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

function createTeamMarker(category: string, isAssigned: boolean, status: string) {
  const emoji = teamCategoryIcons[category] || '🚒'
  const bgColor = isAssigned ? '#1d4ed8' : status === 'available' ? '#059669' : '#d97706'
  const ringColor = isAssigned ? '#3b82f6' : status === 'available' ? '#10b981' : '#f59e0b'

  return L.divIcon({
    className: 'dispatch-team-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: ${bgColor};
        color: white;
        border-radius: 10px;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        font-size: 17px;
      ">
        <span>${emoji}</span>
        ${
          isAssigned
            ? `<div style="
                position: absolute;
                inset: -6px;
                border-radius: 12px;
                border: 2px solid ${ringColor};
                animation: pulse 2s infinite;
              "></div>`
            : ''
        }
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

function FitMapBounds({
  points,
}: {
  points: [number, number][]
}) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 13)
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [points, map])
  return null
}

export function DispatchRouteCore({
  incident,
  assignedTeam,
  nearbyTeams = [],
  onSelectTeam,
  height = '420px',
}: DispatchRouteCoreProps) {
  const hasIncidentCoords =
    typeof incident.latitude === 'number' &&
    typeof incident.longitude === 'number' &&
    incident.latitude !== 0 &&
    incident.longitude !== 0

  const hasAssignedCoords =
    assignedTeam &&
    typeof assignedTeam.latitude === 'number' &&
    typeof assignedTeam.longitude === 'number' &&
    assignedTeam.latitude !== 0 &&
    assignedTeam.longitude !== 0

  // Calculate points for bounds
  const points: [number, number][] = []
  if (hasIncidentCoords) points.push([incident.latitude, incident.longitude])
  if (hasAssignedCoords && assignedTeam) points.push([assignedTeam.latitude, assignedTeam.longitude])

  // Center
  const defaultCenter: [number, number] = hasIncidentCoords
    ? [incident.latitude, incident.longitude]
    : [28.6139, 77.2090]

  // Midpoint & Route Distance
  let distance = 0
  let midPoint: [number, number] | null = null
  let etaMinutes = 0

  if (hasIncidentCoords && hasAssignedCoords && assignedTeam) {
    distance = +distanceKm(
      incident.latitude,
      incident.longitude,
      assignedTeam.latitude,
      assignedTeam.longitude
    ).toFixed(1)
    midPoint = [
      (incident.latitude + assignedTeam.latitude) / 2,
      (incident.longitude + assignedTeam.longitude) / 2,
    ]
    etaMinutes = Math.max(3, Math.round((distance / 40) * 60))
  }

  return (
    <div
      className="w-full relative rounded-xl overflow-hidden border border-slate-200 shadow-inner"
      style={{ height, minHeight: '350px' }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <FitMapBounds points={points} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Incident Marker */}
        {hasIncidentCoords && (
          <Marker
            position={[incident.latitude, incident.longitude]}
            icon={createIncidentMarker(incident.severity, categoryIcons[incident.category] || '⚠️')}
          >
            <Popup>
              <div className="p-1 space-y-1.5 max-w-[220px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] text-slate-500 font-bold">
                    #{incident.incidentId.slice(-6)}
                  </span>
                  <SeverityBadge severity={incident.severity} />
                </div>
                <h4 className="font-bold text-xs text-[#101b2d]">{incident.title}</h4>
                <div className="text-[10px] text-slate-600">📍 {incident.location}</div>
                <div className="text-[10px] text-rose-600 font-bold">
                  👥 {incident.peopleAffected} People Affected
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 2. Route Polyline (Assigned Team -> Incident) */}
        {hasIncidentCoords && hasAssignedCoords && assignedTeam && (
          <>
            <Polyline
              positions={[
                [assignedTeam.latitude, assignedTeam.longitude],
                [incident.latitude, incident.longitude],
              ]}
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 0.85,
                dashArray: '8, 8',
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-bold text-blue-700">
                  {assignedTeam.name} ➔ {incident.title}
                  <div className="text-[10px] text-slate-600 font-normal">
                    Distance: {distance} km • ETA: ~{etaMinutes} mins
                  </div>
                </div>
              </Tooltip>
            </Polyline>

            {/* Midpoint Distance Badge */}
            {midPoint && (
              <Marker
                position={midPoint}
                icon={L.divIcon({
                  className: 'route-distance-marker',
                  html: `
                    <div style="
                      background: #1e293b;
                      color: white;
                      font-size: 11px;
                      font-weight: bold;
                      padding: 3px 8px;
                      border-radius: 9999px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                      border: 1px solid rgba(255,255,255,0.3);
                      white-space: nowrap;
                    ">
                      🛣️ ${distance} km (~${etaMinutes}m ETA)
                    </div>
                  `,
                  iconAnchor: [40, 12],
                })}
              />
            )}
          </>
        )}

        {/* 3. Assigned Response Team Marker */}
        {hasAssignedCoords && assignedTeam && (
          <Marker
            position={[assignedTeam.latitude, assignedTeam.longitude]}
            icon={createTeamMarker(assignedTeam.category, true, assignedTeam.status)}
          >
            <Popup>
              <div className="p-1 space-y-1.5 max-w-[240px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{teamCategoryIcons[assignedTeam.category]}</span>
                  <div>
                    <h4 className="font-bold text-xs text-[#101b2d]">{assignedTeam.name}</h4>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">
                      ASSIGNED RESPONSE UNIT
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600">
                  <strong>Leader:</strong> {assignedTeam.leaderName} ({assignedTeam.memberCount} crew)
                </div>
                <div className="text-[10px] text-slate-500">📍 {assignedTeam.locationAddress}</div>
                <div className="text-[10px] text-emerald-700 font-bold">
                  📞 {assignedTeam.contactPhone}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 4. Nearby Available Teams (if no team is assigned or for preview) */}
        {!assignedTeam &&
          nearbyTeams.map((team) => {
            if (!team.latitude || !team.longitude) return null
            const dist = hasIncidentCoords
              ? +distanceKm(incident.latitude, incident.longitude, team.latitude, team.longitude).toFixed(1)
              : 0

            return (
              <Marker
                key={team.teamId}
                position={[team.latitude, team.longitude]}
                icon={createTeamMarker(team.category, false, team.status)}
              >
                <Popup>
                  <div className="p-1 space-y-2 max-w-[240px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{teamCategoryIcons[team.category]}</span>
                      <div>
                        <h4 className="font-bold text-xs text-[#101b2d]">{team.name}</h4>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          {TEAM_STATUS_LABELS[team.status]} • {dist} km away
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Lead:</strong> {team.leaderName} | <strong>Crew:</strong> {team.memberCount}
                    </div>
                    <div className="text-[10px] text-slate-500">📍 {team.locationAddress}</div>
                    {onSelectTeam && team.status === 'available' && (
                      <button
                        type="button"
                        onClick={() => onSelectTeam(team)}
                        className="w-full py-1 text-center text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Assign Unit ({dist} km)
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
      </MapContainer>
    </div>
  )
}

