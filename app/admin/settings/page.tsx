// app/admin/settings/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Settings, Shield, Bell, Cpu, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [defaultRadius, setDefaultRadius] = useState(25)
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile')
  const [requireVerification, setRequireVerification] = useState(true)
  const [autoClassify, setAutoClassify] = useState(true)
  const [saving, setSaving] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('Admin platform settings updated!')
    }, 400)
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
          <Settings size={26} className="text-slate-700" />
          Command Center Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Operational thresholds, automated AI classifications, and dispatch defaults
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Geographic Defaults */}
        <Card>
          <CardHeader>
            <h2 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <Bell size={16} className="text-blue-600" />
              Proximity Alert Radius Defaults
            </h2>
          </CardHeader>
          <CardBody className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
                <span>Default Dispatch Radius</span>
                <span className="font-mono text-blue-600 font-bold">{defaultRadius} km</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={defaultRadius}
                onChange={(e) => setDefaultRadius(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-slate-400 text-[11px] mt-1">
                Citizens inside this radius will automatically receive proximity push alerts for severe incidents.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* AI & Automation */}
        <Card>
          <CardHeader>
            <h2 className="font-bold text-sm text-[#101b2d] flex items-center gap-2">
              <Cpu size={16} className="text-purple-600" />
              Groq AI Intelligence Configuration
            </h2>
          </CardHeader>
          <CardBody className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary LLM Engine</label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
              >
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Recommended)</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Ultra-fast)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B 32k</option>
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoClassify}
                  onChange={(e) => setAutoClassify(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                Enable Automatic AI Severity Classification for Citizen Submissions
              </label>

              <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireVerification}
                  onChange={(e) => setRequireVerification(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                Require Coordinator Verification Before Public Heatmap Pinning
              </label>
            </div>
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" loading={saving}>
            <Save size={16} /> Save Configuration
          </Button>
        </div>
      </form>
    </div>
  )
}

