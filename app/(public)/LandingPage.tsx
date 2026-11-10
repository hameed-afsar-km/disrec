// app/(public)/LandingPage.tsx
// The main landing page component — imported by both app/page.tsx
// This component renders inside the root layout (which has AuthProvider)
// but needs Navbar/Footer since app/page.tsx doesn't go through (public)/layout.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Radio, Map, MessageSquare, Shield, Zap, Users, Clock,
  ArrowRight, CheckCircle, Flame, Car, Heart, Waves, Building2, Cloud,
  Bell, ChevronRight, Phone, Activity, Sparkles, Navigation, ShieldCheck,
  Compass, RadioTower, PhoneCall
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { TiltedGridHero, type TiltedGridImage } from '@/components/ui/tilted-grid-hero'
import { useAuth } from '@/components/auth/AuthProvider'
import { subscribeToAllIncidents } from '@/lib/firestore'
import type { Incident } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'

export const HERO_INCIDENT_IMAGES: TiltedGridImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
    alt: 'Emergency response vehicle siren dispatch',
  },
  {
    src: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=800&q=80',
    alt: 'Firefighters battling structural fire emergency',
  },
  {
    src: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=800&q=80',
    alt: 'Trauma medical first responders',
  },
  {
    src: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
    alt: 'Flood disaster water rescue operations',
  },
  {
    src: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?auto=format&fit=crop&w=800&q=80',
    alt: 'Emergency coordination operations command center',
  },
  {
    src: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    alt: 'Search and rescue tactical deployment',
  },
  {
    src: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
    alt: 'Structural collapse disaster relief',
  },
  {
    src: 'https://images.unsplash.com/photo-1602980085566-4c40b6e4e891?auto=format&fit=crop&w=800&q=80',
    alt: 'Wildfire airborne emergency services',
  },
]

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
  const { firebaseUser } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 })

  useEffect(() => {
    // Incident data is restricted to authenticated users by Firestore rules.
    // Skip the listener for signed-out visitors instead of triggering a
    // permission-denied snapshot error.
    if (!firebaseUser) return

    const unsub = subscribeToAllIncidents(
      (incidents: Incident[]) => {
        setStats({
          total: incidents.length,
          active: incidents.filter((i) => i.status !== 'resolved').length,
          resolved: incidents.filter((i) => i.status === 'resolved').length,
        })
      },
      [],
      (err) => console.warn('Unable to load live incident stats:', err.code, err.message)
    )
    return () => unsub()
  }, [firebaseUser])

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      {/* ── Entire Hero Section powered by TiltedGridHero ──────────────── */}
      <TiltedGridHero
        images={HERO_INCIDENT_IMAGES}
        speed={3.5}
        curve={80}
        tileHeight={22}
        aspectRatio={16 / 9}
        gap={6}
        axis={52}
        fade={12}
        className="relative w-full h-[740px] sm:h-[800px] lg:h-[840px] bg-gradient-to-b from-[#060a14] via-[#091120] to-[#0d1628] text-white overflow-hidden border-b border-slate-800/80"
      >
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 -right-28 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Soft edge gradients */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#060a14]/90 to-transparent pointer-events-none z-[5]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#060a14]/95 to-transparent pointer-events-none z-[5]" />

        {/* Foreground Content Stack */}
        <div className="relative z-10 flex h-full flex-col items-center justify-between py-8 sm:py-10 px-4 sm:px-6 lg:px-8 text-center pointer-events-none">
          
          {/* Top Block: Status Badge, Headline & Subtitle */}
          <motion.div {...fadeUp()} className="pointer-events-auto max-w-4xl mx-auto flex flex-col items-center">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2.5 bg-slate-950/80 border border-slate-700/80 shadow-lg rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-200 mb-3 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-slate-300 font-semibold tracking-wide uppercase text-[11px]">System Online</span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1.5 text-blue-300">
                <Sparkles size={13} className="text-blue-400" />
                AI-Powered Emergency Response Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-balance drop-shadow-lg mb-3">
              When Every{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">
                Second
              </span>{' '}
              Counts, Precision Saves Lives.
            </h1>

            {/* Subtitle positioned directly with the headline */}
            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl font-normal text-balance">
              Centralized emergency coordination network for rapid incident reporting, live responder telemetry, and sub-second AI severity triage.
            </p>
          </motion.div>

          {/* Bottom Block: CTAs & Capability Badges (positioned cleanly below the 3D cylinder) */}
          <motion.div {...fadeUp(0.2)} className="pointer-events-auto max-w-3xl mx-auto flex flex-col items-center pb-2">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-4">
              <Link href="/report">
                <Button
                  variant="danger"
                  size="lg"
                  className="shadow-xl shadow-red-600/35 hover:shadow-red-600/60 hover:scale-[1.03] transition-all px-7 py-3 text-sm sm:text-base font-semibold group flex items-center gap-2"
                >
                  <AlertTriangle size={18} className="text-white group-hover:rotate-12 transition-transform" />
                  Report an Emergency
                  <ArrowRight size={16} className="text-white/80 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link href="/live-map">
                <Button
                  variant="ghost"
                  size="lg"
                  className="border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md px-6 py-3 text-sm sm:text-base font-medium flex items-center gap-2 shadow-lg"
                >
                  <Map size={18} className="text-blue-400" />
                  View Live Map
                </Button>
              </Link>

              <a
                href="tel:112"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-rose-300 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-800/70 backdrop-blur-md transition-colors shadow-lg"
              >
                <PhoneCall size={15} className="text-rose-400" />
                <span>SOS: 112 / 911</span>
              </a>
            </div>

            {/* Capability Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] sm:text-xs font-medium text-slate-300 bg-slate-950/80 backdrop-blur-md px-5 py-2 rounded-full border border-slate-800/80 shadow-md">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Sub-second AI Classification</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Navigation size={14} className="text-blue-400 shrink-0" />
                <span>GPS Telemetry & Geo-fence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioTower size={14} className="text-amber-400 shrink-0" />
                <span>Real-time Community Alerts</span>
              </div>
            </div>
          </motion.div>

        </div>
      </TiltedGridHero>

      {/* ── Elevated Live Stats Strip ──────────────────────────────────── */}
      <section className="bg-[#0b1322] border-b border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp(0.2)}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              {
                label: '24/7 Operations',
                value: 'Zero Downtime',
                icon: Clock,
                color: 'text-emerald-400',
                badge: 'Active Grid',
                badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
              },
              {
                label: 'Live Incidents',
                value: stats.active > 0 ? `${stats.active} Active` : 'All Clear',
                icon: AlertTriangle,
                color: 'text-amber-400',
                badge: 'Real-time',
                badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
              },
              {
                label: 'Total Processed',
                value: stats.total > 0 ? `${stats.total} Reports` : 'Verified',
                icon: Shield,
                color: 'text-blue-400',
                badge: 'Encrypted',
                badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
              },
              {
                label: 'AI Triage Latency',
                value: '< 1.8 Seconds',
                icon: Zap,
                color: 'text-rose-400',
                badge: 'Sub-second',
                badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
              },
            ].map(({ label, value, icon: Icon, color, badge, badgeColor }) => (
              <div
                key={label}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 shadow-lg backdrop-blur-md flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badgeColor}`}>
                    {badge}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
                  <p className="text-lg font-bold text-white tracking-tight">{value}</p>
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

