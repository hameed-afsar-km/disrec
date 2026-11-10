"use client";

import Link from "next/link";
import { AlertTriangle, Map, PhoneCall, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TiltedGridHero } from "@/components/ui/tilted-grid-hero";

export const INCIDENT_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80",
    alt: "Emergency vehicle dispatch with active sirens",
  },
  {
    src: "https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=800&q=80",
    alt: "Fire rescue department responding to structural fire",
  },
  {
    src: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=800&q=80",
    alt: "Medical first responders and trauma team",
  },
  {
    src: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    alt: "Flood and natural disaster emergency response",
  },
  {
    src: "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?auto=format&fit=crop&w=800&q=80",
    alt: "Real-time emergency operations command center",
  },
  {
    src: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
    alt: "Emergency rescue tactical deployment",
  },
  {
    src: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80",
    alt: "Disaster relief and structural safety team",
  },
  {
    src: "https://images.unsplash.com/photo-1602980085566-4c40b6e4e891?auto=format&fit=crop&w=800&q=80",
    alt: "Wildfire and airborne emergency services",
  },
];

export default function TiltedGridHeroDemo() {
  return (
    <TiltedGridHero
      images={INCIDENT_IMAGES}
      speed={3.5}
      curve={78}
      tileHeight={28}
      className="h-[620px] w-full rounded-2xl border border-slate-800 bg-gradient-to-b from-[#080d19] via-[#0d1627] to-[#121f36] text-white shadow-2xl overflow-hidden"
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-between py-12 px-6 text-center">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="uppercase tracking-wider text-[11px] text-red-400 font-bold">Live Stream</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">Continuous Incident Feed</span>
        </div>

        {/* Center Content */}
        <div className="max-w-3xl space-y-4">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            When Every{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">
              Second
            </span>{" "}
            Counts
          </h1>
          <p className="mx-auto max-w-xl text-balance text-sm sm:text-base text-slate-300">
            Real-time emergency intelligence and rapid response coordination. Report active incidents, track emergency units, and monitor live status feeds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link href="/report">
              <Button variant="danger" size="lg" className="w-full sm:w-auto flex items-center gap-2 shadow-lg shadow-red-600/30">
                <AlertTriangle size={18} />
                Report an Emergency
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/live-map">
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 flex items-center gap-2"
              >
                <Map size={18} className="text-blue-400" />
                View Live Map
              </Button>
            </Link>
            <a
              href="tel:112"
              className="inline-flex items-center gap-2 rounded-lg border border-rose-800/60 bg-rose-950/50 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:text-white transition-colors"
            >
              <PhoneCall size={14} className="text-rose-400" />
              <span>SOS: 112</span>
            </a>
          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>AI Incident Triage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />
            <span>Sub-second Dispatch</span>
          </div>
        </div>
      </div>
    </TiltedGridHero>
  );
}

