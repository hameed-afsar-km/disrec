// app/(public)/my-reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, Filter, Plus, FileText, ChevronRight, MapPin, Calendar } from 'lucide-react'
import { getUserIncidents } from '@/lib/firestore'
import { formatDate, timeAgo, categoryIcons } from '@/lib/utils'
import type { Incident, EmergencyCategory, Severity, IncidentStatus } from '@/lib/types'
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/lib/types'

export default function MyReportsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login?redirect=/my-reports')
    }
  }, [authLoading, firebaseUser, router])

  useEffect(() => {
    if (!firebaseUser) return

    async function fetchReports() {
      try {
        const data = await getUserIncidents(firebaseUser!.uid)
        setIncidents(data)
      } catch (err) {
        console.error('Failed to fetch user reports:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [firebaseUser])

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.incidentId.toLowerCase().includes(search.toLowerCase()) ||
      inc.location.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || inc.category === categoryFilter
    const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter
    const matchesStatus = statusFilter === 'all' || inc.status === statusFilter

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101b2d]">My Emergency Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track status, official response, and resolution history of your reported incidents
          </p>
        </div>
        <Link href="/report">
          <Button variant="danger" size="md">
            <Plus size={16} />
            Report New Incident
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, ID, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Severities</option>
            {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Reports List */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={5} />
        </Card>
      ) : filteredIncidents.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={40} />}
            title={incidents.length === 0 ? 'No reports yet' : 'No matching reports found'}
            description={
              incidents.length === 0
                ? 'You have not submitted any emergency reports yet.'
                : 'Try adjusting your search criteria or filters.'
            }
            action={
              incidents.length === 0 ? (
                <Link href="/report">
                  <Button variant="primary" size="sm">
                    Report an Emergency
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('all')
                    setSeverityFilter('all')
                    setStatusFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((inc) => (
            <Link key={inc.incidentId} href={`/my-reports/${inc.incidentId}`}>
              <Card hover className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="text-2xl p-2.5 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
                    {categoryIcons[inc.category] || '⚠️'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 font-medium">
                        #{inc.incidentId}
                      </span>
                      <SeverityBadge severity={inc.severity} />
                      <StatusBadge status={inc.status} />
                      {inc.verified && (
                        <span className="text-[11px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                          Verified Official
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-[#101b2d]">{inc.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{inc.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {inc.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {formatDate(inc.createdAt)} ({timeAgo(inc.createdAt)})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <span className="text-xs text-blue-600 font-medium hidden md:inline">View Timeline</span>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

