// app/(public)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { User, Phone, Mail, Globe, Bell, Shield, LogOut, Plus, Trash2 } from 'lucide-react'
import { updateUser } from '@/lib/firestore'
import { isMockAadhaarEmail } from '@/lib/mock-aadhaar'
import type { EmergencyContact } from '@/lib/types'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const { firebaseUser, appUser, signOut, loading: authLoading, refreshUser } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('en')
  const [alertRadius, setAlertRadius] = useState(10)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])

  // New contact draft
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactRel, setNewContactRel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login?redirect=/profile')
    }
  }, [authLoading, firebaseUser, router])

  useEffect(() => {
    if (appUser) {
      setName(appUser.name || '')
      setPhone(appUser.phone || '')
      setLanguage(appUser.preferredLanguage || 'en')
      setAlertRadius(appUser.notificationPreferences?.radius || 10)
      setContacts(appUser.emergencyContacts || [])
    } else if (firebaseUser) {
      setName(firebaseUser.displayName || '')
    }
  }, [appUser, firebaseUser])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!firebaseUser) return
    setSaving(true)

    try {
      await updateUser(firebaseUser.uid, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        preferredLanguage: language,
        notificationPreferences: {
          email: true,
          push: true,
          nearby: true,
          radius: alertRadius,
        },
        emergencyContacts: contacts,
      })
      await refreshUser()
      toast.success('Profile preferences updated!')
    } catch {
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  function addContact() {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast.error('Please provide name and phone number for emergency contact.')
      return
    }
    const updated = [
      ...contacts,
      {
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: newContactRel.trim() || 'Contact',
      },
    ]
    setContacts(updated)
    setNewContactName('')
    setNewContactPhone('')
    setNewContactRel('')
  }

  function removeContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101b2d]">User Profile & Safety Contacts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your emergency identity, contacts, and radius preferences
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:bg-red-50 border-red-200"
          onClick={() => {
            signOut()
            router.push('/')
          }}
        >
          <LogOut size={14} /> Sign Out
        </Button>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Personal Details */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-[#101b2d] flex items-center gap-2">
              <User size={18} className="text-blue-600" /> Personal Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Account)</label>
                <input
                  type="email"
                  value={
                    isMockAadhaarEmail(firebaseUser?.email)
                      ? 'Demo Aadhaar account'
                      : firebaseUser?.email || ''
                  }
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-[#101b2d] flex items-center gap-2">
              <Shield size={18} className="text-[#e53945]" /> Designated Emergency Contacts
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-xs text-slate-500">
              These contacts may be alerted when you activate the SOS feature.
            </p>

            {/* List of existing contacts */}
            <div className="space-y-2">
              {contacts.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    <span className="text-slate-500 ml-2">({c.relationship})</span>
                    <p className="text-slate-600 font-mono mt-0.5">{c.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new contact input fields */}
            <div className="p-3 border border-dashed border-slate-200 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-slate-700">Add Emergency Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Relation (e.g. Spouse)"
                  value={newContactRel}
                  onChange={(e) => setNewContactRel(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addContact} className="text-xs">
                <Plus size={13} /> Add Contact to List
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Proximity Preferences */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-[#101b2d] flex items-center gap-2">
              <Bell size={18} className="text-amber-500" /> Proximity & Alert Preferences
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                <span>Default Alert Radius</span>
                <span className="font-bold">{alertRadius} km</span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                value={alertRadius}
                onChange={(e) => setAlertRadius(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                You will receive priority alerts for high/critical incidents occurring within this radius.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" loading={saving}>
            Save All Preferences
          </Button>
        </div>
      </form>
    </div>
  )
}

