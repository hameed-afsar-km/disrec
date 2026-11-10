// app/(public)/report/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/Badge'
import {
  AlertTriangle, MapPin, Upload, Sparkles, CheckCircle2,
  AlertCircle, Users, Phone, ArrowLeft, Loader2, Navigation, X, ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { createIncident, nowISO } from '@/lib/firestore'
import { generateId } from '@/lib/utils'
import type { EmergencyCategory, Severity, Incident } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@/lib/types'

// Helper to convert selected image files into lightweight local base64 Data URLs
async function fileToLocalDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const maxDim = 800
          let width = img.width
          let height = img.height

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.75))
            return
          }
          resolve((e.target?.result as string) || '')
        }
        img.onerror = () => resolve((e.target?.result as string) || '')
        img.src = e.target?.result as string
      }
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result as string) || '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    }
  })
}

const CATEGORIES: { value: EmergencyCategory; label: string; icon: string }[] = [
  { value: 'fire', label: 'Fire Emergency', icon: '🔥' },
  { value: 'road_accident', label: 'Road Accident', icon: '🚗' },
  { value: 'medical', label: 'Medical Emergency', icon: '🏥' },
  { value: 'flood', label: 'Flood', icon: '🌊' },
  { value: 'building_collapse', label: 'Building Collapse', icon: '🏗️' },
  { value: 'natural_disaster', label: 'Natural Disaster', icon: '🌪️' },
  { value: 'other', label: 'Other Emergency', icon: '⚠️' },
]

function ReportForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategory = (searchParams.get('category') as EmergencyCategory) || 'fire'
  const { firebaseUser, appUser, loading: authLoading } = useAuth()

  // Form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<EmergencyCategory>(initialCategory)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [peopleAffected, setPeopleAffected] = useState<number>(1)
  const [contactPhone, setContactPhone] = useState('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [files, setFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<{ name: string; size: number; dataUrl: string }[]>([])

  // UI state
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [classifyingSeverity, setClassifyingSeverity] = useState(false)
  const [aiSeverityResult, setAiSeverityResult] = useState<{
    severity: Severity
    reason: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedIncidentId, setSubmittedIncidentId] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login?redirect=/report')
    }
  }, [authLoading, firebaseUser, router])

  // Try auto-detect location on load
  useEffect(() => {
    handleDetectLocation()
  }, [])

  function handleDetectLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setDetectingLocation(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLatitude(lat)
        setLongitude(lng)
        setDetectingLocation(false)
        // Reverse geocode via free Nominatim API
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          )
          const data = await res.json()
          if (data?.display_name) {
            setLocation(data.display_name)
          } else {
            setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
          }
        } catch {
          setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
      },
      (err) => {
        setDetectingLocation(false)
        if (err.code === 1) {
          setLocationError('Location access was denied. Please enter manually.')
        } else {
          setLocationError('Could not retrieve GPS coordinates. Please enter manually.')
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // AI severity classification
  async function handleAiClassify() {
    if (!description.trim()) {
      toast.error('Please enter a description first to analyze severity.')
      return
    }
    setClassifyingSeverity(true)
    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, peopleAffected }),
      })
      const data = await res.json()
      if (data.severity) {
        setAiSeverityResult({ severity: data.severity, reason: data.reason })
        setSeverity(data.severity)
        toast.success(`AI suggested severity: ${SEVERITY_LABELS[data.severity as Severity]}`)
      } else {
        toast.error('Could not determine severity. Please select manually.')
      }
    } catch {
      toast.error('AI classification unavailable. Please select severity manually.')
    } finally {
      setClassifyingSeverity(false)
    }
  }

  // Handle local file select and generate immediate local previews
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    const combined = [...files, ...selected].slice(0, 4) // max 4 files
    setFiles(combined)

    const previews: { name: string; size: number; dataUrl: string }[] = []
    for (const f of combined) {
      const dataUrl = await fileToLocalDataUrl(f)
      previews.push({ name: f.name, size: f.size, dataUrl })
    }
    setFilePreviews(previews)
  }

  function handleRemoveFile(index: number) {
    const updatedFiles = files.filter((_, i) => i !== index)
    const updatedPreviews = filePreviews.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    setFilePreviews(updatedPreviews)
  }

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firebaseUser) return

    if (!title.trim()) {
      toast.error('Please provide an incident title.')
      return
    }
    if (!description.trim()) {
      toast.error('Please provide an incident description.')
      return
    }
    if (!location.trim()) {
      toast.error('Please specify the location.')
      return
    }

    setSubmitting(true)
    try {
      // Use locally processed image data URLs (no Firebase Storage network upload needed)
      const evidenceUrls: string[] = filePreviews
        .map((p) => p.dataUrl)
        .filter(Boolean)

      const now = nowISO()
      const incidentData: Omit<Incident, 'incidentId'> = {
        reporterId: firebaseUser.uid,
        reporterName: appUser?.name || firebaseUser.displayName || 'Anonymous',
        reporterEmail: firebaseUser.email || undefined,
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        aiSuggestedSeverity: aiSeverityResult?.severity,
        aiSeverityReason: aiSeverityResult?.reason,
        location: location.trim(),
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        peopleAffected: Number(peopleAffected) || 1,
        evidenceUrls,
        status: 'reported',
        verified: false,
        createdAt: now,
        updatedAt: now,
      }

      const newId = await createIncident(incidentData)
      setSubmittedIncidentId(newId)
      toast.success('Emergency incident reported successfully!')
    } catch (err: unknown) {
      console.error(err)
      toast.error('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedIncidentId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={36} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#101b2d] mb-2">Report Submitted</h1>
        <p className="text-slate-600 mb-2">
          Your emergency report has been saved and logged with administrators.
        </p>
        <div className="inline-block bg-slate-100 rounded-lg px-4 py-2 font-mono text-sm text-slate-700 mb-6">
          Incident ID: <strong className="text-slate-900">{submittedIncidentId}</strong>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push('/my-reports')}>
            View My Reports
          </Button>
          <Button variant="primary" onClick={() => router.push(`/my-reports/${submittedIncidentId}`)}>
            View Incident Details
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#101b2d]">Report an Emergency</h1>
        <p className="text-sm text-slate-500 mt-1">
          Provide accurate details to help emergency coordinators respond quickly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[#101b2d] text-base">1. Emergency Category</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-sm transition-all ${
                    category === cat.value
                      ? 'border-[#3182ce] bg-blue-50 text-blue-900 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Incident Details */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[#101b2d] text-base">2. Incident Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Incident Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Structure fire on 3rd floor of commercial complex"
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Detailed Description *
                </label>
                <button
                  type="button"
                  onClick={handleAiClassify}
                  disabled={classifyingSeverity || !description.trim()}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer font-medium"
                >
                  {classifyingSeverity ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  {classifyingSeverity ? 'Analyzing...' : 'AI Severity Check'}
                </button>
              </div>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened: current situation, visible hazards, number of people trapped or injured, road blockage..."
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* AI Recommendation Alert */}
            {aiSeverityResult && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">
                    AI Severity Recommendation:
                  </span>
                  <SeverityBadge severity={aiSeverityResult.severity} />
                </div>
                <p className="text-xs text-blue-800">{aiSeverityResult.reason}</p>
                <p className="text-[11px] text-blue-600">
                  * AI recommendations assist classification and do not replace professional judgment.
                </p>
              </div>
            )}

            {/* Severity Manual Override */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Severity Level *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'critical'] as Severity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium capitalize text-center transition-all ${
                      severity === sev
                        ? sev === 'critical'
                          ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                          : sev === 'high'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold'
                          : 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {SEVERITY_LABELS[sev]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="people" className="block text-sm font-medium text-slate-700 mb-1">
                  People Affected (Estimate)
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="people"
                    type="number"
                    min={0}
                    value={peopleAffected}
                    onChange={(e) => setPeopleAffected(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contact" className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Phone (Optional)
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="contact"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Aadhaar Family Quick-Safety Selection */}
            {appUser?.familyMembers && appUser.familyMembers.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Linked Aadhaar Family Members at/near Incident Location (Optional):</span>
                  <span className="text-[10px] text-blue-600 font-normal">Check if any family member is in this vicinity</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {appUser.familyMembers.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        className="rounded accent-blue-600"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDescription((prev) =>
                              prev ? `${prev}\n[Family Alert]: ${m.name} (${m.relation}) is in this incident area.` : `[Family Alert]: ${m.name} (${m.relation}) is in this incident area.`
                            )
                            toast.info(`Appended ${m.name} to incident notes`)
                          }
                        }}
                      />
                      <span className="truncate">
                        <strong>{m.name}</strong> ({m.relation})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-[#101b2d] text-base">3. Incident Location</h2>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {detectingLocation ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Navigation size={13} />
              )}
              {detectingLocation ? 'Detecting...' : 'Detect GPS'}
            </button>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                Location Address or Landmark *
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Street address, landmark, intersection..."
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {latitude !== null && longitude !== null && (
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600">
                <Navigation size={13} className="text-green-600" />
                <span>GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                <span className="text-green-600 font-medium">✓ Acquired</span>
              </div>
            )}

            {locationError && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle size={13} /> {locationError}
              </p>
            )}
          </CardBody>
        </Card>

        {/* Evidence Upload */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[#101b2d] text-base">4. Evidence / Photos (Optional)</h2>
          </CardHeader>
          <CardBody>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-slate-300 transition-colors">
              <Upload size={24} className="text-slate-400 mx-auto mb-2" />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                <span className="text-sm font-semibold text-blue-600 hover:underline">
                  Click to choose photos
                </span>
                <input
                  id="evidence-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-slate-400 mt-1">
                Images are processed locally and attached directly to your report (max 4 photos)
              </p>
            </div>

            {/* Thumbnail previews */}
            {filePreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-blue-600" /> Attached Photos ({filePreviews.length}/4)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filePreviews.map((p, i) => (
                    <div
                      key={i}
                      className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-video"
                    >
                      {p.dataUrl ? (
                        <img
                          src={p.dataUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          {p.name}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs shadow transition-colors"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white truncate">
                        {p.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            For imminent danger, call <strong>112</strong> immediately.
          </p>
          <Button
            type="submit"
            variant={severity === 'critical' ? 'danger' : 'primary'}
            size="lg"
            loading={submitting}
          >
            <AlertTriangle size={16} />
            Submit Incident Report
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Loading reporting form...</div>}>
      <ReportForm />
    </Suspense>
  )
}

