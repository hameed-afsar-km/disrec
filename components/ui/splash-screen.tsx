'use client'

import { useEffect, useState } from 'react'
import { GlassIconReveal } from '@/components/ui/liquid-glass-logo-reveal'

const DISREC_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 200"><text x="380" y="150" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" letter-spacing="-7"><tspan fill="#ffffff">Dis</tspan><tspan fill="#f59e0b">rec</tspan></text></svg>`

export function SplashScreen() {
  const [exiting, setExiting] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const exitDelay = reduceMotion ? 900 : 2200
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const exitTimer = window.setTimeout(() => setExiting(true), exitDelay)
    const removeTimer = window.setTimeout(() => {
      document.body.style.overflow = previousOverflow
      setDismissed(true)
    }, exitDelay + 500)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(removeTimer)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (dismissed) return null

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-[#0a1120] transition-opacity duration-500 ${
        exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <GlassIconReveal
        logo={DISREC_LOGO}
        look="dark"
        background="#0a1120"
        logoColor="#ffffff"
        plateColor="#101b2d"
        iconPlate
        originalColors
        tileSize={760}
        logoScale={1}
        finalScale={0.92}
        loop={false}
        speed={1.45}
        tuning={{
          present: 1.7,
          glide: 1.5,
          response: 0.36,
          startZoom: 2.2,
          opticalDepth: 0.9,
          dispersion: 1.2,
          colorBleed: 0.7,
          sheen: 1.2,
          lightTurn: 1.1,
        }}
        className="pointer-events-none h-full w-full"
        label="Disrec"
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-10 text-center transition-opacity duration-500 ${
          exiting ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
          Emergency response platform
        </p>
        <div className="mx-auto mt-4 h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#e53945]" />
        </div>
      </div>
    </div>
  )
}
