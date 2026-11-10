// components/layout/Navbar.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import {
  AlertTriangle,
  Map,
  Bell,
  User,
  Menu,
  X,
  Shield,
  MessageSquare,
  Radio,
  LogOut,
  ChevronDown,
  Navigation,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/live-map', label: 'Live Map', icon: Map },
  { href: '/nearby-alerts', label: 'Alerts', icon: Bell },
  { href: '/assistant', label: 'AI Assistant', icon: MessageSquare },
  { href: '/safety', label: 'Safety', icon: Shield },
  { href: '/evacuation', label: 'Shelters', icon: Navigation },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { firebaseUser, appUser, isAdmin, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    function closeUserMenuOnOutsideClick(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeUserMenuOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeUserMenuOnOutsideClick)
  }, [])

  function handleSignOut() {
    setMobileOpen(false)
    setUserMenuOpen(false)
    void signOut()
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-6">
      <nav
        className={cn(
          'relative mx-auto flex h-14 max-w-6xl rounded-[1.75rem] border backdrop-blur-xl transition-all duration-300 sm:h-16',
          scrolled
            ? 'border-slate-200/80 bg-white/95 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.45)]'
            : 'border-white/70 bg-white/80 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]'
        )}
      >
        <div className="flex h-full w-full items-center justify-between gap-2 pl-3 pr-2 sm:pl-4 sm:pr-3">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex shrink-0 items-center gap-2 font-bold text-xl text-[#101b2d]"
          >
            <div className="w-8 h-8 bg-[#e53945] rounded-lg flex items-center justify-center">
              <Radio size={16} className="text-white" />
            </div>
            <span>Dis<span className="bg-gradient-to-r from-[#e53945] to-orange-500 bg-clip-text text-transparent">rec</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {firebaseUser ? (
              <>
                <Link href="/sos">
                  <Button variant="danger" size="sm">
                    <AlertTriangle size={14} />
                    SOS
                  </Button>
                </Link>
                <Link href="/report">
                  <Button variant="primary" size="sm">
                    Report Emergency
                  </Button>
                </Link>
                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#101b2d] text-white flex items-center justify-center text-xs font-bold">
                      {appUser?.name?.[0]?.toUpperCase() || firebaseUser.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <ChevronDown size={14} />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {appUser?.name || 'User'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{firebaseUser.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User size={14} />
                        Dashboard
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin/dashboard"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield size={14} />
                          Admin Center
                        </Link>
                      )}
                      <Link
                        href="/notifications"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Bell size={14} />
                        Notifications
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 space-y-1 rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl md:hidden">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                  pathname === href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {firebaseUser ? (
                <>
                  <Link href="/sos" onClick={() => setMobileOpen(false)}>
                    <Button variant="danger" size="sm" className="w-full">
                      <AlertTriangle size={14} /> SOS Emergency
                    </Button>
                  </Link>
                  <Link href="/report" onClick={() => setMobileOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">Report Emergency</Button>
                  </Link>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">My Dashboard</Button>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}><Button variant="primary" size="sm" className="w-full">Get Started</Button></Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

    </header>
  )
}

