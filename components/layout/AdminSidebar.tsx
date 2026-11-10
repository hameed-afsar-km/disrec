// components/layout/AdminSidebar.tsx
// Dark navy sidebar for the Admin Command Center
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  AlertOctagon,
  Radio,
  Map,
  Brain,
  BarChart2,
  Users,
  ShieldCheck,
  Settings,
  Bell,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavSection {
  section: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    section: 'Emergency Response',
    items: [
      { label: 'Incidents', href: '/admin/incidents', icon: <FileText size={16} /> },
      { label: 'SOS Management', href: '/admin/sos', icon: <AlertOctagon size={16} /> },
      { label: 'Alerts', href: '/admin/alerts', icon: <Radio size={16} /> },
      { label: 'Heatmap', href: '/admin/heatmap', icon: <Map size={16} /> },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { label: 'AI Intelligence', href: '/admin/ai-intelligence', icon: <Brain size={16} /> },
      { label: 'Analytics', href: '/admin/analytics', icon: <BarChart2 size={16} /> },
    ],
  },
  {
    section: 'Administration',
    items: [
      { label: 'Users', href: '/admin/users', icon: <Users size={16} /> },
      { label: 'Administrators', href: '/admin/administrators', icon: <ShieldCheck size={16} /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings size={16} /> },
    ],
  },
]

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
  unreadCount?: number
}

export function AdminSidebar({ open, onClose, unreadCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname()
  const { signOut, appUser } = useAuth()

  function isActive(href: string) {
    if (href === '/admin/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-[240px] bg-[#101b2d] flex flex-col transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Radio size={16} className="text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-sm leading-none">RespondAI</span>
              <div className="mt-0.5">
                <span className="text-[10px] font-semibold bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  Admin
                </span>
              </div>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            className="md:hidden text-slate-400 hover:text-white p-1 rounded"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.section}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-1.5">
                {section.section}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn('admin-sidebar-link', isActive(item.href) && 'active')}
                      onClick={onClose}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/10 px-3 py-3 space-y-1 shrink-0">
          {/* Notifications link */}
          <Link
            href="/admin/notifications"
            className={cn('admin-sidebar-link', isActive('/admin/notifications') && 'active')}
            onClick={onClose}
          >
            <Bell size={16} className="shrink-0" />
            <span className="flex-1">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User + sign out */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">
                {appUser?.name?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{appUser?.name ?? 'Admin'}</p>
              <p className="text-[10px] text-slate-500 truncate capitalize">{appUser?.role ?? 'admin'}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
