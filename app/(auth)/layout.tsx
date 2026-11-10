// app/(auth)/layout.tsx
// Auth layout — minimal, centered, no navbar/footer
import Link from 'next/link'
import { Radio } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#101b2d] via-[#16243a] to-[#1e3151] flex flex-col">
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-lg">
          <div className="w-8 h-8 bg-[#e53945] rounded-lg flex items-center justify-center">
            <Radio size={16} className="text-white" />
          </div>
          RespondAI
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
