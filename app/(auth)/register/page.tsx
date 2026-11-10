// app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { setDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, AlertCircle, Mail, Lock, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import type { AppUser } from '@/lib/types'
import { nowISO } from '@/lib/firestore'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      await updateProfile(user, { displayName: form.name.trim() })

      // Create user document in Firestore — role is ALWAYS 'user'
      const now = nowISO()
      const appUser: AppUser = {
        uid: user.uid,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        role: 'user', // Cannot be changed from registration form
        preferredLanguage: 'en',
        emergencyContacts: [],
        notificationPreferences: {
          email: true,
          push: true,
          nearby: true,
          radius: 10,
        },
        createdAt: now,
        updatedAt: now,
      }

      await setDoc(doc(db, 'users', user.uid), appUser)

      // Set auth cookies for middleware
      document.cookie = `auth-token=1; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `user-role=user; path=/; max-age=86400; SameSite=Lax`

      toast.success('Account created! Welcome to Disrec.')
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.')
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address.')
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 8 characters.')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#101b2d]">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Join the emergency response network</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Your full name"
                required
                autoComplete="name"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

