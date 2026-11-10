'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Radio } from 'lucide-react'
import { EmergencyMapContainer } from '@/components/map/MapContainer'

export interface Testimonial {
  avatarSrc: string
  name: string
  handle: string
  text: string
}

interface SignInPageProps {
  title: ReactNode
  description: ReactNode
  children: ReactNode
  footer?: ReactNode
  showMap?: boolean
  testimonials?: Testimonial[]
}

export function GlassInputWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur-sm transition-colors focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
      {children}
    </div>
  )
}

function TestimonialCard({ testimonial, delay }: { testimonial: Testimonial; delay: string }) {
  return (
    <article className={`animate-testimonial ${delay} flex w-64 items-start gap-3 rounded-3xl border border-white/40 bg-slate-950/45 p-5 text-white shadow-xl backdrop-blur-xl`}>
      <img src={testimonial.avatarSrc} className="h-10 w-10 rounded-2xl object-cover" alt="" />
      <div className="text-sm leading-snug">
        <p className="font-medium">{testimonial.name}</p>
        <p className="text-slate-300">{testimonial.handle}</p>
        <p className="mt-1 text-slate-100">{testimonial.text}</p>
      </div>
    </article>
  )
}

export function SignInPage({ title, description, children, footer, showMap = true, testimonials = [] }: SignInPageProps) {
  return (
    <main className="min-h-[100dvh] w-full bg-slate-50 font-sans md:grid md:grid-cols-2">
      <section className="flex min-h-[100dvh] items-center justify-center px-5 py-10 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          <Link href="/" className="animate-element animate-delay-100 mb-10 inline-flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e53945] text-white shadow-lg shadow-red-200">
              <Radio size={18} />
            </span>
            <span>Dis<span className="bg-gradient-to-r from-[#e53945] to-orange-500 bg-clip-text text-transparent">rec</span></span>
          </Link>
          <header className="mb-7">
            <h1 className="animate-element animate-delay-200 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
            <p className="animate-element animate-delay-300 mt-3 text-sm leading-6 text-slate-500">{description}</p>
          </header>
          <div className="animate-element animate-delay-400">{children}</div>
          {footer && <div className="animate-element animate-delay-500 mt-6">{footer}</div>}
        </div>
      </section>

      {showMap && (
        <section className="relative hidden min-h-[100dvh] p-4 md:block">
          <div className="animate-slide-right animate-delay-200 absolute inset-4 overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl">
            <div className="absolute inset-0 opacity-95">
              <EmergencyMapContainer incidents={[]} center={[20.5937, 78.9629]} zoom={5} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/70" />
            <div className="absolute inset-x-0 top-0 p-10 text-white">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-orange-100">Emergency response, connected</p>
              <p className="mt-4 max-w-lg text-3xl font-semibold leading-tight">Prepared communities begin with a faster way to ask for help.</p>
            </div>
          </div>
          {testimonials.length > 0 && (
            <div className="absolute inset-x-0 bottom-10 flex justify-center gap-4 px-8">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-600" />
              {testimonials[1] && <div className="hidden xl:block"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-700" /></div>}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
