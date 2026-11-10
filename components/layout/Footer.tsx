// components/layout/Footer.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Radio, Phone, Mail, MapPin } from 'lucide-react'

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | string>(2026)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="bg-[#101b2d] text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-700">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <div className="w-8 h-8 bg-[#e53945] rounded-lg flex items-center justify-center">
                <Radio size={16} className="text-white" />
              </div>
              RespondAI
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI-powered Emergency Response & Disaster Management Platform. When every second matters.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Platform</h3>
            <ul className="space-y-2">
              {[
                { href: '/report', label: 'Report Emergency' },
                { href: '/live-map', label: 'Live Map' },
                { href: '/nearby-alerts', label: 'Nearby Alerts' },
                { href: '/sos', label: 'SOS Center' },
                { href: '/assistant', label: 'AI Assistant' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Safety */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Safety Resources</h3>
            <ul className="space-y-2">
              {[
                { href: '/safety#fire', label: 'Fire Safety' },
                { href: '/safety#flood', label: 'Flood Safety' },
                { href: '/safety#medical', label: 'Medical Emergency' },
                { href: '/safety#earthquake', label: 'Earthquake Safety' },
                { href: '/safety#preparedness', label: 'Disaster Preparedness' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency contacts */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Emergency Contacts</h3>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Phone size={13} className="text-red-400 shrink-0" />
                Police: <span className="text-white font-medium">100</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Phone size={13} className="text-red-400 shrink-0" />
                Fire: <span className="text-white font-medium">101</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Phone size={13} className="text-red-400 shrink-0" />
                Ambulance: <span className="text-white font-medium">108</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Phone size={13} className="text-red-400 shrink-0" />
                Disaster Mgmt: <span className="text-white font-medium">1070</span>
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              * These are standard emergency numbers. Verify the correct numbers for your jurisdiction.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {currentYear} RespondAI. Built for emergency coordination and disaster management.
          </p>
          <p className="text-xs text-slate-500">
            For life-threatening emergencies, always call your{' '}
            <strong className="text-slate-400">local emergency services first</strong>.
          </p>
        </div>
      </div>
    </footer>
  )
}

