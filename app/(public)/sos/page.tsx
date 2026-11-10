// app/(public)/sos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SOSStatusBadge } from '@/components/ui/Badge'
import {
  AlertTriangle, Navigation, Phone, ShieldAlert, CheckCircle,
  XCircle, Clock, MapPin, Radio, HeartPulse, Flame, Car, Waves, Info
} from 'lucide-react'
import { toast } from 'sonner'
import { createSOS, updateSOS, subscribeToUserSOS, nowISO } from '@/lib/firestore'
import type { SOSRequest, EmergencyCategory } from '@/lib/types'

export default function SOSPage() {
  const router = useRouter()
  const { firebaseUser, appUser, loading: authLoading } = useAuth()

  const [sosHistory, setSosHistory] = useState<SOSRequest[]>([])
  const [activeSOS, setActiveSOS] = useState<SOSRequest | null>(null)
  
  // Form / Action states
  const [emergencyType, setEmergencyType] = useState<EmergencyCategory>('medical')
  const [description, setDescription] = useState('')
  const [locationText, setLocationText] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [pressProgress, setPressProgress] = useState(0)
  const [isPressing, setIsPressing] = useState(false)
  const [activating, setActivating] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login?redirect=/sos')
    }
  }, [authLoading, firebaseUser, router])

  // Get active and past SOS requests for current user
  useEffect(() => {
    if (!firebaseUser) return

    const unsub = subscribeToUserSOS(firebaseUser.uid, (requests) => {
      setSosHistory(requests)
      const current = requests.find((r) => r.status === 'active' || r.status === 'acknowledged' || r.status === 'in_progress')
      setActiveSOS(current || null)
    })

    return () => unsub()
  }, [firebaseUser])

  // Acquire GPS on page load
  useEffect(() => {
    fetchGPS()
  }, [])

  function fetchGPS() {
    if (!navigator.geolocation) {
      setLocationText('GPS not supported on device')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setGpsLoading(false)

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          )
          const data = await res.json()
          setLocationText(data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } catch {
          setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
      },
      () => {
        setGpsLoading(false)
        setLocationText('Location permission denied or unavailable')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Press-and-hold trigger handler (prevents accidental tap)
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPressing) {
      timer = setInterval(() => {
        setPressProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer)
            triggerSOS()
            return 100
          }
          return prev + 5
        })
      }, 50)
    } else {
      setPressProgress(0)
    }

    return () => clearInterval(timer)
  }, [isPressing])

  async function triggerSOS() {
    if (!firebaseUser) return
    setIsPressing(false)
    setActivating(true)

    try {
      const now = nowISO()
      const sosData: Omit<SOSRequest, 'sosId'> = {
        userId: firebaseUser.uid,
        userName: appUser?.name || firebaseUser.displayName || 'Emergency Citizen',
        userEmail: firebaseUser.email || undefined,
        userPhone: appUser?.phone || undefined,
        location: locationText || 'Current GPS coordinates',
        latitude: coords?.lat || 0,
        longitude: coords?.lng || 0,
        emergencyType,
        description: description.trim() || 'Immediate assistance requested via SOS Center',
        status: 'active',
        createdAt: now,
      }

      await createSOS(sosData)
      toast.success('SOS Signal Broadcasted! Emergency Coordinators Alerted.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to broadcast SOS. Please call 112 directly.')
    } finally {
      setActivating(false)
    }
  }

  async function handleCancelSOS(sosId: string) {
    try {
      await updateSOS(sosId, { status: 'cancelled' })
      toast.info('SOS request marked as cancelled.')
    } catch (err) {
      toast.error('Failed to cancel SOS.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Disclaimer Alert */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>CRITICAL SAFETY NOTICE:</strong> This platform coordinates with administrators and duty responders.
          If you or someone else is in immediate life-threatening danger, always call local emergency dispatch immediately:
          <span className="font-bold ml-1 text-amber-950">Police: 100 / 112 • Ambulance: 108 • Fire: 101</span>.
        </div>
      </div>

      {/* Active SOS Banner if running */}
      {activeSOS && (
        <Card className="border-red-500 bg-red-50/50 shadow-md">
          <CardBody className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                  <span className="font-bold text-red-700 text-sm tracking-wide uppercase">
                    SOS Emergency Active
                  </span>
                  <SOSStatusBadge status={activeSOS.status} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Request #{activeSOS.sosId.slice(-6)} • {activeSOS.emergencyType?.toUpperCase()}
                </h2>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <MapPin size={13} /> {activeSOS.location}
                </p>
                {activeSOS.acknowledgedAt && (
                  <p className="text-xs text-green-700 font-medium">
                    ✓ Acknowledged by dispatch operations at {new Date(activeSOS.acknowledgedAt).toLocaleTimeString()}
                  </p>
                )}
                {activeSOS.adminNotes && (
                  <p className="text-xs text-slate-800 bg-white p-2.5 rounded border border-red-200 mt-2">
                    <strong>Responder Notes:</strong> {activeSOS.adminNotes}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                onClick={() => handleCancelSOS(activeSOS.sosId)}
              >
                Cancel SOS
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* SOS Activation Control Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Button & Hold trigger */}
        <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring background */}
            <div className={`absolute w-52 h-52 rounded-full bg-red-100 ${isPressing ? 'scale-110' : 'animate-ping opacity-40'} transition-transform duration-200`} />
            
            {/* The actual SOS Button */}
            <button
              onMouseDown={() => setIsPressing(true)}
              onMouseUp={() => setIsPressing(false)}
              onTouchStart={() => setIsPressing(true)}
              onTouchEnd={() => setIsPressing(false)}
              disabled={activating}
              className={`relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center text-white font-black tracking-widest text-3xl shadow-2xl transition-all duration-150 select-none cursor-pointer ${
                isPressing ? 'scale-95 bg-red-700 shadow-inner' : 'bg-[#e53945] hover:bg-red-600'
              }`}
            >
              <ShieldAlert size={36} className="mb-1" />
              <span>SOS</span>
              <span className="text-[10px] font-medium tracking-normal mt-1 opacity-90">
                HOLD 2 SECONDS
              </span>
            </button>
          </div>

          {/* Progress bar for hold feedback */}
          <div className="w-48 space-y-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-75"
                style={{ width: `${pressProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {isPressing ? `Broadcasting in ${((100 - pressProgress) * 0.02).toFixed(1)}s...` : 'Press & hold to broadcast SOS'}
            </p>
          </div>
        </div>

        {/* Right: Emergency Context Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm text-[#101b2d]">SOS Emergency Type</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'medical', label: 'Medical', icon: HeartPulse },
                  { id: 'fire', label: 'Fire Hazard', icon: Flame },
                  { id: 'road_accident', label: 'Collision', icon: Car },
                  { id: 'flood', label: 'Water Hazard', icon: Waves },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEmergencyType(id as EmergencyCategory)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                      emergencyType === id
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Optional Situation Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trapped on 2nd floor, 2 people injured"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1">
                    <Navigation size={13} className="text-blue-600" /> Detected Location
                  </span>
                  <button
                    type="button"
                    onClick={fetchGPS}
                    className="text-blue-600 hover:underline text-[11px]"
                  >
                    {gpsLoading ? 'Acquiring...' : 'Refresh GPS'}
                  </button>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 truncate">
                  {locationText || 'Acquiring location...'}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Past SOS History */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#101b2d] flex items-center gap-2">
          <Clock size={16} className="text-slate-500" />
          My SOS Signal History
        </h3>

        {sosHistory.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-400">
            No previous SOS requests on record for this account.
          </Card>
        ) : (
          <div className="space-y-2">
            {sosHistory.map((s) => (
              <Card key={s.sosId} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-600">
                      #{s.sosId.slice(-6)}
                    </span>
                    <SOSStatusBadge status={s.status} />
                    <span className="text-xs uppercase font-bold text-slate-700">
                      {s.emergencyType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{s.location}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

