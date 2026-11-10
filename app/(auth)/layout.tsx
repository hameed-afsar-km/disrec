// app/(auth)/layout.tsx
'use client'

// Auth layout — the login route supplies its own immersive presentation.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Radio } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') return <>{children}</>

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#101b2d] via-[#16243a] to-[#1e3151] flex flex-col">
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-lg">
          <div className="w-8 h-8 bg-[#e53945] rounded-lg flex items-center justify-center">
            <Radio size={16} className="text-white" />
          </div>
          <span>Dis<span className="bg-gradient-to-r from-[#e53945] to-orange-500 bg-clip-text text-transparent">rec</span></span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </div>
      <p className="text-center text-xs text-slate-500 pb-6">
        For life-threatening emergencies, call your local emergency services immediately.
      </p>
    </div>
  )
}
