// components/layout/AdminTopbar.tsx
// Top navigation bar for the Admin Command Center
'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Bell, LogOut, ChevronDown, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { cn } from '@/lib/utils'

const PATH_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/incidents': 'Incidents',
  '/admin/sos': 'SOS Management',
  '/admin/alerts': 'Alerts',
  '/admin/heatmap': 'Incident Heatmap',
  '/admin/ai-intelligence': 'AI Intelligence',
  '/admin/analytics': 'Analytics',
  '/admin/users': 'Users',
  '/admin/administrators': 'Administrators',
  '/admin/settings': 'Settings',
  '/admin/notifications': 'Notifications',
}

function deriveTitle(pathname: string): string {
  // Try exact match first
  if (PATH_TITLES[pathname]) return PATH_TITLES[pathname]
  // Try prefix match for nested routes (e.g. /admin/incidents/[id])
  for (const [path, label] of Object.entries(PATH_TITLES)) {
    if (pathname.startsWith(path + '/')) return label
  }
  return 'Admin'
}

interface AdminTopbarProps {
  onToggle: () => void
  onToggleCollapse: () => void
  collapsed: boolean
  unreadCount?: number
}

export function AdminTopbar({
  onToggle,
  onToggleCollapse,
  collapsed,
  unreadCount = 0,
}: AdminTopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { appUser, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const pageTitle = deriveTitle(pathname)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 z-20 sticky top-0">
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
        onClick={onToggle}
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Collapse / expand — desktop only */}
      <button
        className="hidden md:inline-flex p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-[#101b2d] truncate">{pageTitle}</h1>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          onClick={() => router.push('/admin/notifications')}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* User avatar / dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors',
              dropdownOpen && 'bg-slate-100'
            )}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-[#101b2d] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">
                {appUser?.name?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-[#101b2d] leading-none">{appUser?.name ?? 'Admin'}</p>
              <p className="text-xs text-slate-500 capitalize leading-tight mt-0.5">
                {appUser?.role?.replace('_', ' ') ?? 'admin'}
              </p>
            </div>
            <ChevronDown size={14} className={cn('text-slate-400 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-[#101b2d] truncate">{appUser?.name}</p>
                <p className="text-xs text-slate-500 truncate">{appUser?.email}</p>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => { setDropdownOpen(false); router.push('/admin/settings') }}
              >
                <User size={14} />
                Profile & Settings
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={handleSignOut}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
