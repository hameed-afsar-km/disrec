'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, Edit2, MapPin, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, StatCard } from '@/components/ui/Card'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { deleteShelter, saveShelter, subscribeToShelters } from '@/lib/shelters'
import type { Shelter, ShelterStatus } from '@/lib/types'

const DEFAULT_FORM = {
  name: '',
  address: '',
  latitude: 13.0418,
  longitude: 80.2341,
  capacity: 100,
  occupancy: 0,
  status: 'open' as ShelterStatus,
  amenities: '',
  contactPhone: '',
}

const STATUS_STYLES: Record<ShelterStatus, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  full: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-200 text-slate-700',
}

const fieldClassName = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500'

export default function AdminSheltersPage() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [editing, setEditing] = useState<Shelter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Shelter | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => subscribeToShelters(setShelters), [])

  const stats = useMemo(() => ({
    open: shelters.filter((item) => item.status === 'open' && item.occupancy < item.capacity).length,
    capacity: shelters.filter((item) => item.status !== 'closed').reduce((sum, item) => sum + item.capacity, 0),
    available: shelters.filter((item) => item.status === 'open').reduce((sum, item) => sum + Math.max(0, item.capacity - item.occupancy), 0),
  }), [shelters])

  function openCreate() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setModalOpen(true)
  }

  function openEdit(shelter: Shelter) {
    setEditing(shelter)
    setForm({
      name: shelter.name,
      address: shelter.address,
      latitude: shelter.latitude,
      longitude: shelter.longitude,
      capacity: shelter.capacity,
      occupancy: shelter.occupancy,
      status: shelter.status,
      amenities: shelter.amenities.join(', '),
      contactPhone: shelter.contactPhone || '',
    })
    setModalOpen(true)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.address.trim()) {
      toast.error('Enter the shelter name and address.')
      return
    }
    if (!Number.isFinite(form.latitude) || !Number.isFinite(form.longitude) || form.latitude < -90 || form.latitude > 90 || form.longitude < -180 || form.longitude > 180) {
      toast.error('Enter valid latitude and longitude coordinates.')
      return
    }
    if (form.capacity < 1 || form.occupancy < 0 || form.occupancy > form.capacity) {
      toast.error('Occupancy must be between zero and the total capacity.')
      return
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const shelter: Shelter = {
        shelterId: editing?.shelterId || `SHL-${Date.now().toString(36).toUpperCase()}`,
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacity: Number(form.capacity),
        occupancy: Number(form.occupancy),
        status: form.occupancy >= form.capacity ? 'full' : form.status,
        amenities: form.amenities.split(',').map((item) => item.trim()).filter(Boolean),
        contactPhone: form.contactPhone.trim() || undefined,
        updatedAt: now,
      }
      await saveShelter(shelter)
      toast.success(editing ? 'Shelter point updated.' : 'Shelter point published for evacuation guidance.')
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteShelter(deleteTarget.shelterId)
    toast.success('Shelter point removed.')
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Evacuation operations</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-[#101b2d]"><Building2 className="text-emerald-600" /> Shelter points</h1>
          <p className="mt-1 text-sm text-slate-500">Publish safe destinations with live capacity so people can navigate to an available shelter.</p>
        </div>
        <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add shelter point</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available shelters" value={stats.open} icon={<Building2 size={20} />} color="green" trend="Open and accepting arrivals" />
        <StatCard label="Available spaces" value={stats.available} icon={<Users size={20} />} color="blue" trend="Across open shelter points" />
        <StatCard label="Operational capacity" value={stats.capacity} icon={<MapPin size={20} />} color="orange" trend="Open and full locations" />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between border-b border-slate-100 py-4">
          <div><h2 className="font-bold text-slate-900">Shelter directory</h2><p className="text-xs text-slate-500">Status and capacity feed the citizen evacuation recommendations.</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{shelters.length} total</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Shelter</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amenities</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {shelters.map((shelter) => <tr key={shelter.shelterId} className="hover:bg-slate-50/70">
                <td className="px-4 py-3"><p className="font-bold text-slate-900">{shelter.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{shelter.shelterId}</p></td>
                <td className="max-w-[230px] px-4 py-3"><p className="truncate text-xs text-slate-600">{shelter.address}</p><p className="mt-1 text-[10px] text-slate-400">{shelter.latitude.toFixed(4)}, {shelter.longitude.toFixed(4)}</p></td>
                <td className="px-4 py-3"><p className="font-bold text-slate-800">{shelter.occupancy} / {shelter.capacity}</p><p className="text-[11px] text-emerald-700">{Math.max(0, shelter.capacity - shelter.occupancy)} spaces left</p></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${STATUS_STYLES[shelter.status]}`}>{shelter.status}</span></td>
                <td className="max-w-[180px] px-4 py-3 text-xs text-slate-600">{shelter.amenities.length ? shelter.amenities.join(' · ') : '—'}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(shelter)} title="Edit shelter"><Edit2 size={14} /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(shelter)} title="Remove shelter"><Trash2 size={14} /></Button></div></td>
              </tr>)}
              {!shelters.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">No shelter points yet. Add an approved evacuation destination to publish it to people.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Update shelter point' : 'Add shelter point'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Shelter name *"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. North Community Hall" className={fieldClassName} /></Field><Field label="Contact phone"><input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 …" className={fieldClassName} /></Field></div>
          <Field label="Full address *"><input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, area, city" className={fieldClassName} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Latitude *"><input required type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} className={fieldClassName} /></Field><Field label="Longitude *"><input required type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} className={fieldClassName} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Total capacity *"><input required min="1" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className={fieldClassName} /></Field><Field label="Current occupancy *"><input required min="0" type="number" value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: Number(e.target.value) })} className={fieldClassName} /></Field><Field label="Operational status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ShelterStatus })} className={`${fieldClassName} bg-white`}><option value="open">Open</option><option value="full">Full</option><option value="closed">Closed</option></select></Field></div>
          <Field label="Amenities (comma separated)"><input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Water, first aid, accessible entry" className={fieldClassName} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" variant="primary" loading={saving}>{editing ? 'Save changes' : 'Publish shelter point'}</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} title="Remove shelter point?" message={`This will remove ${deleteTarget?.name || 'this shelter'} from evacuation recommendations.`} confirmLabel="Remove shelter" variant="danger" onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-700"><span className="mb-1 block">{label}</span>{children}</label>
}
