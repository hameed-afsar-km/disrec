// app/(public)/LandingPage.tsx
// The main landing page component — imported by both app/page.tsx
// This component renders inside the root layout (which has AuthProvider)
// but needs Navbar/Footer since app/page.tsx doesn't go through (public)/layout.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Radio, Map, MessageSquare, Shield, Zap, Users, Clock,
  ArrowRight, CheckCircle, Flame, Car, Heart, Waves, Building2, Cloud,
  Bell, ChevronRight, Phone
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { subscribeToAllIncidents } from '@/lib/firestore'
import type { Incident } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'

const CATEGORIES = [
  { key: 'fire', label: 'Fire Emergency', icon: Flame, color: 'text-red-500', bg: 'bg-red-50', desc: 'Structure fires, wildfires, gas leaks' },
  { key: 'road_accident', label: 'Road Accident', icon: Car, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Vehicle collisions, pedestrian incidents' },
  { key: 'medical', label: 'Medical Emergency', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50', desc: 'Cardiac events, trauma, unconscious persons' },
  { key: 'flood', label: 'Flood', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Flash floods, water logging, dam overflow' },
  { key: 'building_collapse', label: 'Building Collapse', icon: Building2, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Structural failure, cave-ins, avalanche' },
  { key: 'natural_disaster', label: 'Natural Disaster', icon: Cloud, color: 'text-purple-500', bg: 'bg-purple-50', desc: 'Earthquake, cyclone, landslide' },
]

const HOW_IT_WORKS = [
  { step: 1, icon: AlertTriangle, title: 'Report', desc: 'Submit a detailed incident report with location, photos, and AI-assisted severity classification', color: 'text-red-500', bg: 'bg-red-50' },
  { step: 2, icon: Zap, title: 'Analyze', desc: 'AI processes the report, classifies severity, identifies hotspots, and alerts administrators', color: 'text-amber-500', bg: 'bg-amber-50' },
  { step: 3, icon: Shield, title: 'Respond', desc: 'Administrators coordinate response, track incidents, and issue emergency broadcasts to affected areas', color: 'text-blue-500', bg: 'bg-blue-50' },
]

const SAFETY_TOPICS = [
  { href: '/safety#fire', emoji: '🔥', title: 'Fire Safety', desc: 'Evacuation plans and fire prevention' },
  { href: '/safety#flood', emoji: '🌊', title: 'Flood Safety', desc: 'Flood preparedness and evacuation routes' },
  { href: '/safety#medical', emoji: '🏥', title: 'First Aid', desc: 'Basic first aid and emergency medical guidance' },
  { href: '/safety#earthquake', emoji: '🏗️', title: 'Earthquake Safety', desc: 'What to do during and after an earthquake' },
]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay },
  }
}

export default function LandingPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 })

  useEffect(() => {
    const unsub = subscribeToAllIncidents((incidents: Incident[]) => {
      setStats({
        total: incidents.length,
        active: incidents.filter((i) => i.status !== 'resolved').length,
        resolved: incidents.filter((i) => i.status === 'resolved').length,
      })
    })
    return () => unsub()
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#101b2d] via-[#16243a] to-[#1e3151] text-white overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <motion.div {...fadeUp()} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium text-blue-200 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              AI-Powered Emergency Response Platform
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-5">
              When Every{' '}
              <span className="text-[#e53945]">Second</span> Matters
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 max-w-xl mb-8 leading-relaxed">
              A centralized emergency coordination system for rapid incident reporting,
              real-time monitoring, AI-powered analysis, and community safety.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/report">
                <Button variant="danger" size="lg" className="w-full sm:w-auto">
                  <AlertTriangle size={18} />
                  Report an Emergency
                </Button>
              </Link>
              <Link href="/live-map">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto border border-white/30 text-white hover:bg-white/10"
                >
                  <Map size={18} />
                  View Live Emergencies
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            {...fadeUp(0.3)}
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: '24/7 Active', value: 'Always On', icon: Clock },
              { label: 'Live Incidents', value: stats.active || '—', icon: AlertTriangle },
              { label: 'Total Reports', value: stats.total || '—', icon: Radio },
              { label: 'AI-Assisted', value: 'Real-time', icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <Icon size={20} className="text-blue-300 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="font-bold text-white">{value}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Emergency Categories ──────────────────────────────────────── */}
      <section className="py-16 bg-[#f4f6fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#101b2d] mb-3">Report Any Emergency</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Select the emergency type and our AI will help classify severity and guide appropriate response.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(({ key, label, icon: Icon, color, bg, desc }, i) => (
              <motion.div key={key} {...fadeUp(i * 0.07)}>
                <Link
                  href={`/report?category=${key}`}
                  className="flex flex-col items-center gap-3 p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-150 group text-center"
                >
                  <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Icon size={24} className={color} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#101b2d] leading-tight">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#101b2d] mb-3">How It Works</h2>
            <p className="text-slate-500">From incident report to coordinated response in minutes</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color, bg }, i) => (
              <motion.div key={step} {...fadeUp(i * 0.1)} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-8 -translate-x-4 z-10">
                    <ChevronRight size={24} className="text-slate-300" />
                  </div>
                )}
                <div className="flex flex-col items-start gap-4 p-6 bg-[#f4f6fa] rounded-2xl h-full">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon size={20} className={color} />
                    </div>
                    <span className="text-3xl font-black text-slate-100">0{step}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#101b2d] mb-1">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Statistics ───────────────────────────────────────────── */}
      <section className="py-14 bg-[#101b2d] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Platform Statistics</h2>
            <p className="text-slate-400 text-sm">Real-time data from the RespondAI network</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Incidents Reported', value: stats.total, suffix: '' },
              { label: 'Currently Active', value: stats.active, suffix: '' },
              { label: 'Successfully Resolved', value: stats.resolved, suffix: '' },
            ].map(({ label, value }, i) => (
              <motion.div key={label} {...fadeUp(i * 0.1)} className="text-center">
                <p className="text-4xl sm:text-5xl font-black text-white mb-2">
                  {value === 0 ? '0' : value || <span className="text-slate-500 text-2xl">Loading…</span>}
                </p>
                <p className="text-sm text-slate-400">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Assistant teaser ───────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={20} className="text-blue-200" />
                <span className="text-sm font-medium text-blue-200">AI Emergency Assistant</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Get Instant Emergency Guidance</h2>
              <p className="text-blue-100 leading-relaxed mb-6">
                Our AI assistant, powered by advanced language models, provides real-time guidance for
                any emergency situation — safety procedures, disaster preparedness, and incident reporting help.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'What to do during a fire',
                  'First aid for road accidents',
                  'Flood evacuation guidance',
                  'Earthquake safety procedures',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-blue-100">
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/assistant">
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  <MessageSquare size={16} />
                  Open AI Assistant
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
            <div className="hidden md:flex flex-col gap-3 w-72">
              {/* Mock chat UI */}
              <div className="bg-white/10 rounded-xl p-4 space-y-3">
                <div className="chat-bubble-ai p-3 text-sm">
                  Hello! I&apos;m your Emergency AI Assistant. How can I help you stay safe today?
                </div>
                <div className="chat-bubble-user p-3 text-sm ml-auto max-w-[80%]">
                  What should I do during a flood?
                </div>
                <div className="chat-bubble-ai p-3 text-sm">
                  During a flood: 1. Move to higher ground immediately. 2. Avoid walking in moving water...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOS Section ──────────────────────────────────────────────── */}
      <section className="py-14 bg-[#e53945]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp()}>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Emergency SOS</h2>
            <p className="text-red-100 max-w-lg mx-auto mb-6">
              In a life-threatening emergency, activate SOS to immediately alert our emergency coordinators
              with your location and situation details. For immediate police/fire/ambulance, call{' '}
              <strong>112</strong>.
            </p>
            <Link href="/sos">
              <Button className="bg-white text-[#e53945] hover:bg-red-50 font-bold text-lg px-8 py-3 h-auto">
                Access SOS Center
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Safety Topics ─────────────────────────────────────────────── */}
      <section className="py-16 bg-[#f4f6fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#101b2d] mb-2">Safety Center</h2>
            <p className="text-slate-500">Emergency preparedness guides for every situation</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {SAFETY_TOPICS.map(({ href, emoji, title, desc }, i) => (
              <motion.div key={href} {...fadeUp(i * 0.07)}>
                <Link
                  href={href}
                  className="flex flex-col gap-2 p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <span className="text-3xl">{emoji}</span>
                  <h3 className="font-semibold text-[#101b2d] text-sm">{title}</h3>
                  <p className="text-xs text-slate-400">{desc}</p>
                  <span className="text-xs text-blue-600 group-hover:underline mt-1 flex items-center gap-1">
                    Learn more <ArrowRight size={11} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/safety">
              <Button variant="outline">View All Safety Guides</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

