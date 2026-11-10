// app/(auth)/login/page.tsx
'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { setDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { getUser, nowISO } from '@/lib/firestore'
import { Button } from '@/components/ui/Button'
import {
  Eye, EyeOff, AlertCircle, Mail, Lock, User as UserIcon,
  Fingerprint, ShieldCheck, KeyRound, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import type { AppUser } from '@/lib/types'
import {
  MOCK_USERS,
  SAMPLE_AADHAAR,
  SAMPLE_AADHAAR_OTP,
  SAMPLE_AADHAAR_USER,
  setMockSession
} from '@/lib/mock-auth'

type LoginMode = 'quick' | 'aadhaar' | 'email'

const ADMIN_ROLES = ['admin', 'super_admin', 'incident_manager', 'monitoring_admin', 'alert_manager']

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [mode, setMode] = useState<LoginMode>('quick')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 1. Quick Login (user/user or admin/admin)
  const [quickUsername, setQuickUsername] = useState('')
  const [quickPassword, setQuickPassword] = useState('')

  // 2. Sample Aadhaar + OTP
  const [aadhaarInput, setAadhaarInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  // 3. Email/Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function finishSignIn(role: string) {
    if (ADMIN_ROLES.includes(role)) {
      router.push('/admin/dashboard')
    } else {
      router.push(redirect.startsWith('/admin') ? '/dashboard' : redirect)
    }
  }

  // Handle Quick Login (user/user or admin/admin)
  async function handleQuickLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const u = quickUsername.trim().toLowerCase()
    const p = quickPassword.trim()

    if (MOCK_USERS[u] && MOCK_USERS[u].pass === p) {
      setLoading(true)
      const session = MOCK_USERS[u].user
      setMockSession(session)
      toast.success(`Signed in successfully as ${session.name}!`)
      finishSignIn(session.role)
      setLoading(false)
      return
    }

    setError('Invalid credentials. Use "user" / "user" or "admin" / "admin".')
  }

  // Quick fill helper
  function quickFill(u: 'user' | 'admin') {
    setQuickUsername(u)
    setQuickPassword(u)
    setError('')
  }

  // Handle Aadhaar + OTP
  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const sanitized = aadhaarInput.replace(/\D/g, '')

    if (sanitized === SAMPLE_AADHAAR) {
      setOtpSent(true)
      toast.info('OTP Sent! Demo OTP is 123456')
    } else {
      setError(`Invalid sample Aadhaar. Please enter: ${SAMPLE_AADHAAR}`)
    }
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (otpInput.trim() === SAMPLE_AADHAAR_OTP) {
      setLoading(true)
      setMockSession(SAMPLE_AADHAAR_USER)
      toast.success('Aadhaar OTP Verified! Signed in.')
      finishSignIn('user')
      setLoading(false)
    } else {
      setError(`Invalid OTP. Use sample OTP: ${SAMPLE_AADHAAR_OTP}`)
    }
  }

  function fillSampleAadhaar() {
    setAadhaarInput(SAMPLE_AADHAAR)
    setOtpInput(SAMPLE_AADHAAR_OTP)
    setOtpSent(true)
    setError('')
  }

  // Handle Standard Firebase Email / Password
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
      const appUser = await getUser(user.uid)
      const role = appUser?.role || 'user'

      document.cookie = `auth-token=1; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `user-role=${role}; path=/; max-age=86400; SameSite=Lax`

      toast.success('Signed in successfully!')
      finishSignIn(role)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.')
      } else {
        setError('Authentication failed. Please check credentials or use Quick Login.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#101b2d]">Sign In</h1>
          <p className="text-sm text-slate-500 mt-1">
            Access the Emergency Response Command System
          </p>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg mb-5">
          <button
            type="button"
            onClick={() => { setMode('quick'); setError('') }}
            className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'quick' ? 'bg-white text-[#101b2d] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound size={13} /> Quick Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('aadhaar'); setError('') }}
            className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'aadhaar' ? 'bg-white text-[#101b2d] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Fingerprint size={13} /> Aadhaar + OTP
          </button>
          <button
            type="button"
            onClick={() => { setMode('email'); setError('') }}
            className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'email' ? 'bg-white text-[#101b2d] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mail size={13} /> Email
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* 1. QUICK LOGIN MODE */}
        {mode === 'quick' && (
          <form onSubmit={handleQuickLogin} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-900 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles size={13} className="text-blue-600" /> Presets:
                </span>
                <span className="text-[10px] text-blue-600 font-normal">Click to auto-fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('user')}
                  className="py-1.5 px-2 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 text-left transition-colors"
                >
                  👤 Public User
                  <span className="block text-[10px] text-slate-400 font-mono font-normal">user / user</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('admin')}
                  className="py-1.5 px-2 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 text-left transition-colors"
                >
                  🛡️ Admin Center
                  <span className="block text-[10px] text-slate-400 font-mono font-normal">admin / admin</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username / Role ID
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={quickUsername}
                  onChange={(e) => setQuickUsername(e.target.value)}
                  placeholder="user OR admin"
                  required
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  placeholder="user OR admin"
                  required
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Sign In with Quick ID
            </Button>
          </form>
        )}

        {/* 2. SAMPLE AADHAAR + OTP MODE */}
        {mode === 'aadhaar' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                <span className="flex items-center gap-1">
                  <Fingerprint size={13} className="text-amber-600" /> Sample Aadhaar Credentials:
                </span>
                <button
                  type="button"
                  onClick={fillSampleAadhaar}
                  className="text-[10px] text-blue-600 underline"
                >
                  Auto-fill demo
                </button>
              </div>
              <p className="text-[11px] text-amber-800 font-mono">
                Aadhaar: <strong>123321456654</strong> • OTP: <strong>123456</strong>
              </p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    12-digit Aadhaar Number
                  </label>
                  <div className="relative">
                    <Fingerprint size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      maxLength={14}
                      value={aadhaarInput}
                      onChange={(e) => setAadhaarInput(e.target.value)}
                      placeholder="123321456654"
                      required
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full">
                  Generate OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                  OTP dispatched for Aadhaar <strong>{aadhaarInput}</strong>.
                  <span className="block mt-0.5 text-[11px] text-green-700">Enter sample OTP: <strong>123456</strong></span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 6-digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/3"
                    onClick={() => { setOtpSent(false); setOtpInput('') }}
                  >
                    Back
                  </Button>
                  <Button type="submit" variant="primary" loading={loading} className="w-2/3">
                    Verify & Sign In
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 3. EMAIL/PASSWORD MODE */}
        {mode === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Sign In with Email
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500 mt-5">
          Need a fresh account?{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            Register new account
          </Link>
        </p>
      </div>

      <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700/30 rounded-xl text-center">
        <p className="text-xs text-amber-200">
          🚨 For life-threatening emergencies, call <strong>112</strong> or <strong>108</strong> immediately.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-white text-sm">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  )
}
