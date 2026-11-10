// app/admin/teams/page.tsx
// Module 2: Emergency Response Team Management
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  Users,
  MapPin,
  Edit2,
  Trash2,
  ExternalLink,
  RotateCcw,
  Shield,
  Radio,
} from 'lucide-react'
import {
  subscribeToResponseTeams,
  createResponseTeam,
  updateResponseTeam,
  deleteResponseTeam,
  seedInitialResponseTeams,
  logAdminAction,
  nowISO,
} from '@/lib/firestore'
import { useAuth } from '@/components/auth/AuthProvider'
import { teamStatusColors, teamCategoryIcons } from '@/lib/utils'
import type { ResponseTeam, TeamResponseCategory, TeamStatus } from '@/lib/types'
import { TEAM_CATEGORY_LABELS, TEAM_STATUS_LABELS } from '@/lib/types'
import { toast } from 'sonner'

export default function AdminTeamsPage() {
  const { firebaseUser, appUser } = useAuth()
  const [teams, setTeams] = useState<ResponseTeam[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<ResponseTeam | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ResponseTeam | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    callSign: '',
    category: 'fire' as TeamResponseCategory,
    status: 'available' as TeamStatus,
    latitude: 28.6304,
    longitude: 77.2177,
    locationAddress: '',
    memberCount: 6,
    contactPhone: '',
    leaderName: '',
    notes: '',
  })

  useEffect(() => {
    const unsub = subscribeToResponseTeams((data) => {
      setTeams(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  function openCreateModal() {
    setEditingTeam(null)
    setFormData({
      name: '',
      callSign: '',
      category: 'fire',
      status: 'available',
      latitude: 28.6304,
      longitude: 77.2177,
      locationAddress: 'Fire Station, Connaught Circus, New Delhi',
      memberCount: 6,
      contactPhone: '+91 11 2341 0000',
      leaderName: '',
      notes: '',
    })
    setModalOpen(true)
  }

  function openEditModal(team: ResponseTeam) {
    setEditingTeam(team)
    setFormData({
      name: team.name,
      callSign: team.callSign || '',
      category: team.category,
      status: team.status,
      latitude: team.latitude,
      longitude: team.longitude,
      locationAddress: team.locationAddress,
      memberCount: team.memberCount,
      contactPhone: team.contactPhone,
      leaderName: team.leaderName,
      notes: team.notes || '',
    })
    setModalOpen(true)
  }

  async function handleSaveTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.leaderName.trim()) {
      toast.error('Please enter team name and team leader.')
      return
    }

    setSaving(true)
    try {
      if (editingTeam) {
        await updateResponseTeam(editingTeam.teamId, {
          name: formData.name.trim(),
          callSign: formData.callSign.trim() || undefined,
          category: formData.category,
          status: formData.status,
          latitude: Number(formData.latitude) || 0,
          longitude: Number(formData.longitude) || 0,
          locationAddress: formData.locationAddress.trim(),
          memberCount: Number(formData.memberCount) || 1,
          contactPhone: formData.contactPhone.trim(),
          leaderName: formData.leaderName.trim(),
          notes: formData.notes.trim() || undefined,
        })
        await logAdminAction({
          adminId: firebaseUser?.uid || 'admin',
          adminName: appUser?.name || 'Admin',
          action: 'UPDATE_RESPONSE_TEAM',
          targetType: 'admin',
          targetId: editingTeam.teamId,
          details: { name: formData.name },
          createdAt: nowISO(),
        })
        toast.success('Response team updated successfully!')
      } else {
        const newId = await createResponseTeam({
          name: formData.name.trim(),
          callSign: formData.callSign.trim() || undefined,
          category: formData.category,
          status: formData.status,
          latitude: Number(formData.latitude) || 0,
          longitude: Number(formData.longitude) || 0,
          locationAddress: formData.locationAddress.trim(),
          memberCount: Number(formData.memberCount) || 1,
          contactPhone: formData.contactPhone.trim(),
          leaderName: formData.leaderName.trim(),
          notes: formData.notes.trim() || undefined,
        })
        await logAdminAction({
          adminId: firebaseUser?.uid || 'admin',
          adminName: appUser?.name || 'Admin',
          action: 'CREATE_RESPONSE_TEAM',
          targetType: 'admin',
          targetId: newId,
          details: { name: formData.name, category: formData.category },
          createdAt: nowISO(),
        })
        toast.success('Response team registered successfully!')
      }
      setModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save response team.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteResponseTeam(deleteTarget.teamId)
      await logAdminAction({
        adminId: firebaseUser?.uid || 'admin',
        adminName: appUser?.name || 'Admin',
        action: 'DELETE_RESPONSE_TEAM',
        targetType: 'admin',
        targetId: deleteTarget.teamId,
        details: { name: deleteTarget.name },
        createdAt: nowISO(),
      })
      toast.success('Response team removed.')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete team.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleQuickStatusToggle(team: ResponseTeam) {
    const nextStatus: TeamStatus = team.status === 'available' ? 'busy' : 'available'
    try {
      await updateResponseTeam(team.teamId, {
        status: nextStatus,
        assignedIncidentId: nextStatus === 'available' ? null : team.assignedIncidentId,
        assignedIncidentTitle: nextStatus === 'available' ? null : team.assignedIncidentTitle,
      })
      toast.success(`${team.name} marked as ${TEAM_STATUS_LABELS[nextStatus]}`)
    } catch {
      toast.error('Failed to update status.')
    }
  }

  async function handleSeedFleet() {
    try {
      await seedInitialResponseTeams()
      toast.success('Standard fleet of 6 multi-category response teams deployed!')
    } catch {
      toast.error('Failed to seed teams.')
    }
  }

  // Stats
  const totalCount = teams.length
  const availableCount = teams.filter((t) => t.status === 'available').length
  const busyCount = teams.filter((t) => t.status === 'busy').length
  const offlineCount = teams.filter((t) => t.status === 'offline').length

  // Filtered teams
  const filteredTeams = teams.filter((t) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = t.name.toLowerCase().includes(q)
      const matchLeader = t.leaderName.toLowerCase().includes(q)
      const matchCall = t.callSign?.toLowerCase().includes(q)
      const matchLoc = t.locationAddress.toLowerCase().includes(q)
      if (!matchName && !matchLeader && !matchCall && !matchLoc) return false
    }
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <Truck size={26} className="text-blue-600" />
            Emergency Response Team Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dispatch fleet management, availability tracking, and incident assignment telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          {teams.length < 6 && (
            <Button variant="outline" size="sm" onClick={handleSeedFleet}>
              <RotateCcw size={14} /> Seed Standard Fleet
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus size={16} /> Deploy New Team
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Response Fleet"
          value={totalCount}
          icon={<Truck size={20} />}
          color="blue"
          trend="Registered emergency teams"
        />
        <StatCard
          label="Available Standby"
          value={availableCount}
          icon={<CheckCircle2 size={20} />}
          color="green"
          trend="Ready for immediate dispatch"
        />
        <StatCard
          label="Busy / Dispatched"
          value={busyCount}
          icon={<Clock size={20} />}
          color="orange"
          trend="Active emergency missions"
        />
        <StatCard
          label="Offline / Standby"
          value={offlineCount}
          icon={<AlertTriangle size={20} />}
          color="slate"
          trend="Base maintenance or rest"
        />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search team name, callsign, leader or base station..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Disciplines</option>
                <option value="fire">🔥 Fire & Rescue</option>
                <option value="medical">🚑 Medical (EMS)</option>
                <option value="rescue">🛟 NDRF / Disaster Rescue</option>
                <option value="police">🚓 Police / Security</option>
                <option value="hazmat">☣️ HazMat / CBRN</option>
                <option value="general">🛡️ Civil Defense</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="available">🟢 Available</option>
                <option value="busy">🟡 Busy / Dispatched</option>
                <option value="offline">⚪ Offline</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Teams Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
            <Radio size={16} className="text-blue-600" />
            Response Units Directory ({filteredTeams.length})
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Truck size={40} className="text-slate-300" />}
                title="No response teams found"
                description={
                  search || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'No teams match the selected filter criteria.'
                    : 'Get started by creating your first emergency response team or seeding standard teams.'
                }
                action={
                  <Button variant="primary" size="sm" onClick={openCreateModal}>
                    <Plus size={14} /> Add First Team
                  </Button>
                }
              />
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Unit & Callsign</th>
                  <th className="py-3 px-4">Discipline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Personnel & Lead</th>
                  <th className="py-3 px-4">Base Station / GPS</th>
                  <th className="py-3 px-4">Active Mission</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.map((team) => {
                  const statusStyle = teamStatusColors[team.status] || teamStatusColors.offline
                  const emoji = teamCategoryIcons[team.category] || '🛡️'

                  return (
                    <tr key={team.teamId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{emoji}</span>
                          <span>{team.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          ID: {team.teamId} {team.callSign ? `• Call: ${team.callSign}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {TEAM_CATEGORY_LABELS[team.category] || team.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(team)}
                          title="Click to toggle Available / Busy"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-transform active:scale-95 ${statusStyle.bg} ${statusStyle.text} border-current/20 cursor-pointer`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {TEAM_STATUS_LABELS[team.status] || team.status}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1">
                          <Users size={12} className="text-slate-400" />
                          <span>{team.leaderName}</span>
                          <span className="text-[10px] text-slate-400">({team.memberCount} crew)</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={11} className="text-slate-400" />
                          <span>{team.contactPhone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="truncate text-slate-700 font-medium flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{team.locationAddress}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {team.latitude.toFixed(4)}, {team.longitude.toFixed(4)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {team.assignedIncidentId ? (
                          <Link
                            href={`/admin/incidents/${team.assignedIncidentId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-200"
                          >
                            <ExternalLink size={11} />
                            <span>{team.assignedIncidentTitle || team.assignedIncidentId}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None (Standby)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(team)}
                            className="h-8 w-8 p-0"
                            title="Edit Team"
                          >
                            <Edit2 size={13} className="text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(team)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Delete Team"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Create / Edit Team Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeam ? 'Edit Emergency Response Team' : 'Deploy New Emergency Response Team'}
        size="lg"
      >
        <form onSubmit={handleSaveTeam} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Team / Unit Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Central Delhi Fire Squad 3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Callsign / Radio Tag
              </label>
              <input
                type="text"
                value={formData.callSign}
                onChange={(e) => setFormData({ ...formData, callSign: e.target.value })}
                placeholder="e.g. BRAVO-3 or RESCUE-01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Response Discipline *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as TeamResponseCategory })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="fire">🔥 Fire & Rescue</option>
                <option value="medical">🚑 Emergency Medical (EMS)</option>
                <option value="rescue">🛟 Search & Disaster Rescue (NDRF)</option>
                <option value="police">🚓 Law Enforcement & Security</option>
                <option value="hazmat">☣️ HazMat & CBRN Containment</option>
                <option value="general">🛡️ Civil Defense & Logistics</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Initial Availability Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as TeamStatus })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="available">🟢 Available (Ready for Dispatch)</option>
                <option value="busy">🟡 Busy / Dispatched</option>
                <option value="offline">⚪ Offline / Maintenance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Squad Leader Name *
              </label>
              <input
                type="text"
                required
                value={formData.leaderName}
                onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                placeholder="e.g. Capt. Rajesh Sharma"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Crew / Member Count
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.memberCount}
                onChange={(e) => setFormData({ ...formData, memberCount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Direct Contact Phone *
              </label>
              <input
                type="text"
                required
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+91 11 2341 0000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Base Station Address *
            </label>
            <input
              type="text"
              required
              value={formData.locationAddress}
              onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
              placeholder="e.g. Connaught Circus Fire Station, New Delhi"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Latitude Coordinates
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Longitude Coordinates
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Equipment / Deployment Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Special equipment, heavy vehicles, certifications, or operational constraints..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingTeam ? 'Update Team' : 'Deploy Team'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Confirm Team Decommission"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? If this team is assigned to an active emergency, it will be unassigned.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Team'}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

