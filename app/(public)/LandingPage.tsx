// app/(public)/LandingPage.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Radio, Map, MessageSquare, Shield, Zap, Users, Clock,
  ArrowRight, CheckCircle, Flame, Car, Heart, Waves, Building2, Cloud,
  Bell, ChevronRight, Phone, Activity, Sparkles, Navigation, ShieldCheck,
  RadioTower, PhoneCall, MapPin, TrendingUp, Lock, ChevronDown,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/Button'
import { TiltedGridHero, type TiltedGridImage } from '@/components/ui/tilted-grid-hero'
import { useAuth } from '@/components/auth/AuthProvider'
import { subscribeToAllIncidents } from '@/lib/firestore'
import type { Incident } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ─── Hero images ───────────────────────────────────────────── */
export const HERO_INCIDENT_IMAGES: TiltedGridImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=800&q=80',
    alt: 'Wildfire inferno containment and disaster rescue',
  },
  {
    src: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
    alt: 'Devastating urban flood disaster and submerged vehicles',
  },
  {
    src: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=800&q=80',
    alt: 'Severe tornado cyclone storm disaster warning',
  },
  {
    src: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
    alt: 'Earthquake rubble and structural collapse search operations',
  },
  {
    src: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    alt: 'Industrial explosion and hazardous chemical fire suppression',
  },
  {
    src: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
    alt: 'Emergency tactical rescue helicopter disaster airlift',
  },
  {
    src: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80',
    alt: 'Severe torrential rain deluge and flash flood inundation',
  },
  {
    src: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=800&q=80',
    alt: 'Critical emergency trauma ambulance dispatch',
  },
]

/* ─── Static data ───────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'fire',              label: 'Fire Emergency',    icon: Flame,     color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100',    desc: 'Structure fires & gas leaks' },
  { key: 'road_accident',     label: 'Road Accident',     icon: Car,       color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100',  desc: 'Vehicle crashes & trauma' },
  { key: 'medical',           label: 'Medical Crisis',    icon: Heart,     color: 'text-rose-500',   bg: 'bg-rose-50',   border: 'border-rose-100',    desc: 'Cardiac & severe injury' },
  { key: 'flood',             label: 'Flood & Water',     icon: Waves,     color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100',    desc: 'Waterlogging & evacuation' },
  { key: 'building_collapse', label: 'Collapse Hazard',   icon: Building2, color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100',   desc: 'Cave-ins & structural faults' },
  { key: 'natural_disaster',  label: 'Natural Calamity',  icon: Cloud,     color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100',  desc: 'Earthquake, cyclone, storm' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: AlertTriangle, title: 'Report Incident', desc: 'Citizens lodge emergency with live GPS telemetry, audio descriptions, and media uploads.', accent: '#e53945' },
  { step: '02', icon: Zap,           title: 'AI Prioritization', desc: 'Sub-second classification ranks severity (P1-P4) and selects the nearest capable response squad.', accent: '#f97316' },
  { step: '03', icon: Shield,        title: 'Dispatch & Track', desc: 'Command units mobilize responders, compute route ETAs, and broadcast live geofenced alerts.', accent: '#e53945' },
]

const FEATURES = [
  { icon: Sparkles,   title: 'AI Severity Triage',      desc: 'Sub-second incident classification evaluating victim count, severity, and hazard dynamics.', accent: 'bg-red-100 text-red-600' },
  { icon: MapPin,     title: 'GPS-Precision Dispatch',   desc: 'Haversine distance matching finds the nearest available response unit across fire, police, and EMS.', accent: 'bg-orange-100 text-orange-600' },
  { icon: RadioTower, title: 'Geofenced Broadcasts',    desc: 'Community warning signals dispatched to nearby residents in critical risk perimeters.', accent: 'bg-red-100 text-red-600' },
  { icon: Lock,       title: 'Role-Based Access',       desc: 'Multi-tiered access for citizens, squad captains, and command dispatchers with Firestore audit logs.', accent: 'bg-orange-100 text-orange-600' },
  { icon: Activity,   title: 'Disaster Telemetry',      desc: 'Live telemetry, resolution ratios, responder availability, and category heatmap stats.', accent: 'bg-red-100 text-red-600' },
  { icon: MessageSquare, title: 'Multilingual Voice AI', desc: 'Speech-to-text reporting and guidance in 15+ local languages with intelligent follow-up prompts.', accent: 'bg-orange-100 text-orange-600' },
]

const SAFETY_TOPICS = [
  { href: '/safety#fire',       emoji: '🔥', title: 'Fire Safety',       desc: 'Escape routing, extinguisher drills & smoke hazards' },
  { href: '/safety#flood',      emoji: '🌊', title: 'Flood Preparedness', desc: 'High-ground movement & contaminated water alerts' },
  { href: '/safety#medical',    emoji: '🏥', title: 'First Aid Protocols', desc: 'CPR steps, tourniquet use & trauma containment' },
  { href: '/safety#earthquake', emoji: '🏗️', title: 'Earthquake Action',  desc: 'Drop, cover, and hold on seismic safety rules' },
]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.45, delay, ease: 'easeOut' as const },
  }
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
}

export default function LandingPage() {
  const { firebaseUser } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 })

  useEffect(() => {
    if (!firebaseUser) return
    const unsub = subscribeToAllIncidents(
      (incidents: Incident[]) => {
        setStats({
          total:    incidents.length,
          active:   incidents.filter((i) => i.status !== 'resolved').length,
          resolved: incidents.filter((i) => i.status === 'resolved').length,
        })
      },
      [],
      (err) => console.warn('Unable to load live stats:', err.code),
    )
    return () => unsub()
  }, [firebaseUser])

  return (
    <div className="h-screen w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-white text-[#101b2d]">
      
      {/* Fixed Navbar overlay so it smoothly stays across fullpage 100vh screens */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1: HERO (100vh)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative h-screen min-h-[100dvh] w-full snap-start overflow-hidden flex flex-col justify-between pt-16 pb-4">
        <TiltedGridHero
          images={HERO_INCIDENT_IMAGES}
          speed={3.5}
          curve={80}
          tileHeight={24}
          aspectRatio={16 / 9}
          gap={6}
          axis={52}
          fade={14}
          className="absolute inset-0 w-full h-full"
          style={{ background: 'linear-gradient(160deg, #fff7f5 0%, #fff1ee 35%, #fff5f0 65%, #fff9f6 100%)' }}
        >
          {/* Ambient atmosphere */}
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-[450px] h-[450px] bg-red-200/25 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#fff7f5] via-[#fff7f5]/80 to-transparent pointer-events-none z-[5]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#fff9f6] via-[#fff9f6]/90 to-transparent pointer-events-none z-[5]" />

          {/* Center Stack */}
          <div className="relative z-10 flex h-full flex-col items-center justify-between py-6 px-4 sm:px-6 lg:px-8 text-center pointer-events-none">
            
            {/* Top: Pill & Headline */}
            <motion.div {...fadeUp()} className="pointer-events-auto max-w-4xl mx-auto flex flex-col items-center gap-3 mt-14 sm:mt-12">
              <div className="inline-flex items-center gap-2.5 bg-white/95 border border-orange-200 shadow-sm rounded-full px-4 py-1 backdrop-blur-md">
                <LiveDot />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">System Online</span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-[11px] text-orange-600 font-semibold">
                  <Sparkles size={12} className="text-orange-500" />
                  AI Emergency Platform
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.08] text-balance text-[#101b2d]">
                When Every{' '}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e53945] via-rose-500 to-orange-500">
                    Second
                  </span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" aria-hidden="true">
                    <path d="M2 6 Q50 2 100 5 Q150 8 198 4" stroke="url(#ug-1)" strokeWidth="3" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="ug-1" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#e53945" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>{' '}
                Counts,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Precision</span>
                {' '}Saves Lives.
              </h1>

            </motion.div>

            {/* Bottom: CTAs & Trust Badges */}
            <motion.div {...fadeUp(0.12)} className="pointer-events-auto max-w-3xl mx-auto flex flex-col items-center gap-3 pb-2">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/report">
                  <button className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-2xl bg-gradient-to-r from-[#e53945] to-orange-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-red-200 hover:shadow-red-300 hover:scale-[1.03] transition-all group">
                    <AlertTriangle size={16} className="group-hover:rotate-12 transition-transform" />
                    Report an Emergency
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>

                <Link href="/live-map">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md text-[#101b2d] font-medium text-xs sm:text-sm shadow-sm transition-all">
                    <Map size={15} className="text-orange-500" />
                    View Live Map
                  </button>
                </Link>

                <a
                  href="tel:112"
                  className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-red-50 border border-red-200 hover:border-red-300 hover:bg-red-100 text-red-600 font-semibold text-xs sm:text-sm shadow-sm transition-all"
                >
                  <PhoneCall size={14} />
                  SOS: 112 / 911
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[10px] sm:text-xs font-medium text-slate-500 bg-white/90 backdrop-blur-sm border border-orange-100 px-4 py-1.5 rounded-full shadow-sm">
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-500" /> Sub-second AI Triage</span>
                <span className="hidden sm:block w-px h-3 bg-slate-200" />
                <span className="flex items-center gap-1.5"><Navigation size={13} className="text-orange-500" /> GPS Telemetry</span>
                <span className="hidden sm:block w-px h-3 bg-slate-200" />
                <span className="flex items-center gap-1.5"><RadioTower size={13} className="text-red-500" /> Community Alerts</span>
              </div>

              {/* Scroll down indicator */}
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 animate-bounce pt-1">
                <span>Explore</span>
                <ChevronDown size={13} />
              </div>
            </motion.div>

          </div>
        </TiltedGridHero>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2: EMERGENCY CATEGORIES & METRICS (100vh)
      ══════════════════════════════════════════════════════════ */}
      <section className="h-screen min-h-[100dvh] w-full snap-start flex flex-col justify-center bg-[#fdfaf9] px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="max-w-6xl mx-auto w-full flex flex-col justify-between h-full max-h-[820px] my-auto">
          
          {/* Header */}
          <motion.div {...fadeUp()} className="text-center">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-500 mb-2">Emergency Response Directory</span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#101b2d] mb-2">Report Any Incident with Precision</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Select category for automated severity assessment, squad routing, and nearest team assignment.
            </p>
          </motion.div>

          {/* 6 Category Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 my-auto">
            {CATEGORIES.map(({ key, label, icon: Icon, color, bg, border, desc }, i) => (
              <motion.div key={key} {...fadeUp(i * 0.05)}>
                <Link
                  href={`/report?category=${key}`}
                  className={cn(
                    'flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-2xl border-2 bg-white transition-all duration-200 group text-center hover:shadow-lg hover:-translate-y-1 h-full justify-center',
                    border
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm', bg)}>
                    <Icon size={22} className={color} />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#101b2d] leading-tight">{label}</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">{desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Quick Metrics Strip */}
          <motion.div {...fadeUp(0.15)} className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {[
              { label: 'System Readiness',  value: '24/7 Operations',    icon: Clock,       color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { label: 'Active Incidents',  value: stats.active > 0 ? `${stats.active} Active` : 'All Clear', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
              { label: 'Logged Incidents',  value: stats.total > 0 ? `${stats.total} Reports` : 'Verified', icon: Shield,     color: 'text-red-600 bg-red-50 border-red-200' },
              { label: 'Triage Response',   value: '< 1.8 Seconds',      icon: Zap,         color: 'text-amber-600 bg-amber-50 border-amber-200' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={cn('flex items-center gap-3 p-3.5 rounded-2xl border bg-white shadow-sm', color)}>
                <div className="p-2 rounded-xl bg-white shadow-xs shrink-0">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{label}</p>
                  <p className="text-xs sm:text-sm font-bold text-[#101b2d] truncate">{value}</p>
                </div>
              </div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3: HOW IT WORKS (100vh)
      ══════════════════════════════════════════════════════════ */}
      <section className="h-screen min-h-[100dvh] w-full snap-start flex flex-col justify-center bg-white px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="max-w-6xl mx-auto w-full flex flex-col justify-between h-full max-h-[820px] my-auto">
          
          <motion.div {...fadeUp()} className="text-center">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-red-500 mb-2">Protocol Architecture</span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#101b2d] mb-2">Coordinated Response in Minutes</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              A synchronized 3-step pipeline designed to minimize human error and cut emergency latency.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative my-auto">
            <div className="hidden md:block absolute top-12 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-0.5 bg-gradient-to-r from-[#e53945]/40 via-orange-400 to-[#e53945]/40 z-0" />

            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, accent }, i) => (
              <motion.div key={step} {...fadeUp(i * 0.1)}>
                <div className="relative flex flex-col gap-4 p-6 sm:p-7 rounded-3xl border-2 border-slate-100 bg-[#fffdfd] hover:border-orange-200 hover:shadow-xl transition-all duration-300 h-full group z-10">
                  <span
                    className="absolute top-4 right-5 text-6xl sm:text-7xl font-black leading-none select-none pointer-events-none"
                    style={{ color: accent, opacity: 0.08 }}
                  >
                    {step}
                  </span>

                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: `${accent}18` }}
                    >
                      <Icon size={22} style={{ color: accent }} />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-widest block" style={{ color: accent }}>
                        Step {step}
                      </span>
                      <h3 className="font-black text-lg sm:text-xl text-[#101b2d]">{title}</h3>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{desc}</p>
                  
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-400 group-hover:text-orange-600 transition-colors">
                    <span>Verified Automated Hand-off</span>
                    <ArrowRight size={13} className="ml-auto" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.2)} className="text-center pt-2">
            <Link href="/report">
              <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-semibold text-xs sm:text-sm hover:bg-[#e53945] transition-colors">
                Launch Incident Report Wizard <ArrowRight size={14} />
              </button>
            </Link>
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4: CORE CAPABILITIES (100vh)
      ══════════════════════════════════════════════════════════ */}
      <section className="h-screen min-h-[100dvh] w-full snap-start flex flex-col justify-center bg-[#fdfaf9] px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="max-w-6xl mx-auto w-full flex flex-col justify-between h-full max-h-[820px] my-auto">
          
          <motion.div {...fadeUp()} className="text-center">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-500 mb-2">Technical Telemetry</span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#101b2d] mb-2">Built for Real-World Emergencies</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Robust mission-critical architecture engineered for resilience when regular communications fail.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-auto">
            {FEATURES.map(({ icon: Icon, title, desc, accent }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.06)}>
                <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white border-2 border-slate-100 hover:border-orange-200 hover:shadow-md transition-all duration-200 h-full group">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs', accent)}>
                    <Icon size={19} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#101b2d] mb-1">{title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.18)} className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-500 pt-2">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> 99.98% System Uptime SLA</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Lock size={14} className="text-blue-500" /> End-to-End Encrypted Telemetry</span>
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5: AI EMERGENCY ASSISTANT (100vh)
      ══════════════════════════════════════════════════════════ */}
      <section className="h-screen min-h-[100dvh] w-full snap-start flex flex-col justify-center bg-white px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="max-w-6xl mx-auto w-full flex flex-col justify-between h-full max-h-[820px] my-auto">
          
          <motion.div {...fadeUp()} className="text-center">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-500 mb-2">Cognitive Intelligence</span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#101b2d] mb-2">AI Emergency Guidance, 24 / 7</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Real-time advice for bystanders and first-responders during high-stress scenarios.
            </p>
          </motion.div>

          <div className="bg-gradient-to-br from-slate-900 via-[#101b2d] to-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden my-auto">
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex-1 text-white relative z-10">
              <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1 mb-4">
                <Sparkles size={13} className="text-orange-400" />
                <span className="text-xs font-bold text-orange-300">Intelligent Assistant</span>
              </div>
              
              <h3 className="text-xl sm:text-3xl font-black mb-3 leading-snug">
                Step-by-step guidance when panicked decisions cost lives.
              </h3>
              
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
                Our multimodal LLM assistant provides rapid first aid steps, fire evacuations, flood routes,
                and prepares structured incident logs in over 15 regional languages.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {['Fire containment drills', 'Severe bleeding tourniquet', 'Seismic collapse survival', 'Cardiac CPR rhythm guidance'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/assistant">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-900/50 hover:scale-[1.03] transition-all">
                  <MessageSquare size={15} />
                  Open AI Assistant
                  <ArrowRight size={14} />
                </button>
              </Link>
            </div>

            {/* Simulated Live Chat */}
            <div className="w-full md:w-80 shrink-0 space-y-2.5 relative z-10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5 backdrop-blur-md">
                <div className="bg-white/10 text-slate-200 text-xs p-3 rounded-2xl leading-relaxed">
                  🚨 Emergency Assistant online. State your situation or ask for instant medical steps.
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs p-3 rounded-2xl ml-auto max-w-[85%] leading-relaxed shadow-sm">
                  Someone is unconscious and not breathing after electric shock.
                </div>
                <div className="bg-white/10 text-emerald-300 text-xs p-3 rounded-2xl leading-relaxed border border-emerald-500/20">
                  ⚡ 1. Ensure source is dead before touching. 2. Begin chest compressions at 100-120 bpm. 3. Call 108/112 immediately.
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400">
            Certified knowledge models aligned with NDRF &amp; WHO disaster preparedness protocols.
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 6: EMERGENCY SOS & SAFETY PREPAREDNESS (100vh)
      ══════════════════════════════════════════════════════════ */}
      <section className="h-screen min-h-[100dvh] w-full snap-start flex flex-col justify-center bg-[#fdfaf9] px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="max-w-6xl mx-auto w-full flex flex-col justify-between h-full max-h-[820px] my-auto">
          
          <motion.div {...fadeUp()} className="text-center">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-red-500 mb-2">Distress Operations</span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#101b2d] mb-2">Emergency SOS &amp; Preparedness</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Instant coordinates broadcast for life-threatening crisis situations.
            </p>
          </motion.div>

          {/* SOS Big Card */}
          <motion.div {...fadeUp(0.08)} className="my-auto">
            <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-red-200 p-6 sm:p-8 text-center shadow-xl shadow-red-100 max-w-3xl mx-auto">
              <div className="w-14 h-14 bg-gradient-to-br from-[#e53945] to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
                <AlertTriangle size={26} className="text-white" />
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-[#101b2d] mb-2">
                Broadcast Live Distress Beacon
              </h3>

              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                Activating SOS sends your precise GPS fix, device battery status, and hazard alerts
                directly to central dispatch coordinators.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/sos">
                  <button className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-[#e53945] to-orange-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-200 hover:shadow-red-300 hover:scale-[1.03] transition-all">
                    <AlertTriangle size={16} />
                    Open SOS Command Center
                  </button>
                </Link>

                <a
                  href="tel:112"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold text-xs sm:text-sm hover:bg-red-100 transition-all"
                >
                  <Phone size={15} />
                  Speed Dial 112
                </a>
              </div>
            </div>
          </motion.div>

          {/* Safety Quick Links Row */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center mb-3">Preparedness Playbooks</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SAFETY_TOPICS.map(({ href, emoji, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all text-center group"
                >
                  <span className="text-2xl mb-1 block">{emoji}</span>
                  <p className="font-bold text-xs sm:text-sm text-[#101b2d]">{title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{desc}</p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 7: COMMAND NETWORK & EMERGENCY HELPLINES (100vh)
      ══════════════════════════════════════════════════════════ */}
      <section className="h-screen min-h-[100dvh] w-full snap-start flex flex-col justify-between bg-[#101b2d] text-slate-300 px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="max-w-6xl mx-auto w-full flex flex-col justify-between h-full max-h-[820px] my-auto">
          
          {/* Top: Emergency Helplines Callout */}
          <div className="border-b border-slate-800 pb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400 block mb-2">Emergency Helplines</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">Direct Emergency Numbers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { title: 'Police Control', num: '100', desc: 'Law & Public Safety' },
                { title: 'Fire Services',  num: '101', desc: 'Blazes & Trapped Persons' },
                { title: 'Ambulance / EMS', num: '108', desc: 'Trauma & Medical Emergencies' },
                { title: 'Disaster Relief', num: '1070', desc: 'NDRF Central Helpline' },
              ].map(({ title, num, desc }) => (
                <div key={title} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <p className="text-xs text-slate-400 font-medium">{title}</p>
                  <p className="text-2xl sm:text-3xl font-black text-white my-0.5 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                    {num}
                  </p>
                  <p className="text-[11px] text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Middle: Directory Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 font-black text-xl text-white mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#e53945] to-orange-500 rounded-xl flex items-center justify-center">
                  <Radio size={16} className="text-white" />
                </div>
                <span>Dis<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e53945] to-orange-500">rec</span></span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Next-generation emergency coordination platform connecting citizens, dispatchers,
                and rescue units with AI intelligence.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Quick Navigation</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link href="/report" className="hover:text-orange-400 transition-colors">Report Emergency</Link>
                <Link href="/live-map" className="hover:text-orange-400 transition-colors">Live Map</Link>
                <Link href="/nearby-alerts" className="hover:text-orange-400 transition-colors">Nearby Alerts</Link>
                <Link href="/sos" className="hover:text-orange-400 transition-colors">SOS Beacon</Link>
                <Link href="/assistant" className="hover:text-orange-400 transition-colors">AI Assistant</Link>
                <Link href="/safety" className="hover:text-orange-400 transition-colors">Safety Guides</Link>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Administrative Control</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Authorized first responders and command administrators can access the dispatch portal.
              </p>
              <Link href="/admin/dashboard">
                <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-all">
                  Open Command Center
                </button>
              </Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <p>© 2026 Disrec Emergency Management System. All rights reserved.</p>
            <p className="text-slate-400 font-medium">For life-threatening emergencies, always dial 112 immediately.</p>
          </div>

        </div>
      </section>

    </div>
  )
}
