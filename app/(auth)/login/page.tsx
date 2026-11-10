'use client'

import { useState, Suspense, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUser } from '@/lib/firestore'
import { GlassInputWrapper, SignInPage, type Testimonial } from '@/components/ui/sign-in'
import { AlertCircle, Eye, EyeOff, Fingerprint, KeyRound, Lock, Mail, Sparkles, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { MOCK_USERS, SAMPLE_AADHAAR, SAMPLE_AADHAAR_OTP, SAMPLE_AADHAAR_USER, setMockSession } from '@/lib/mock-auth'

type LoginMode = 'quick' | 'aadhaar' | 'email'
const ADMIN_ROLES = ['admin', 'super_admin', 'incident_manager', 'monitoring_admin', 'alert_manager']
const testimonials: Testimonial[] = [
  { avatarSrc: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80', name: 'Anita Rao', handle: 'Community volunteer', text: 'Disrec makes reporting and coordinating emergencies feel clear and immediate.' },
  { avatarSrc: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80', name: 'Rohan Mehta', handle: 'Response coordinator', text: 'Our teams get the critical context they need when every second matters.' },
]
const inputClass = 'w-full rounded-2xl bg-transparent px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none'
const iconInputClass = `${inputClass} pl-11`
const submitClass = 'flex w-full items-center justify-center rounded-2xl bg-[#101b2d] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-[#1e3151] disabled:cursor-not-allowed disabled:opacity-60'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [mode, setMode] = useState<LoginMode>('quick')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickUsername, setQuickUsername] = useState('')
  const [quickPassword, setQuickPassword] = useState('')
  const [aadhaarInput, setAadhaarInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function finishSignIn(role: string) {
    router.push(ADMIN_ROLES.includes(role) ? '/admin/dashboard' : redirect.startsWith('/admin') ? '/dashboard' : redirect)
  }
  async function handleQuickLogin(event: FormEvent) {
    event.preventDefault(); setError('')
    const username = quickUsername.trim().toLowerCase(); const pass = quickPassword.trim()
    if (!MOCK_USERS[username] || MOCK_USERS[username].pass !== pass) { setError('Invalid credentials. Use “user” / “user” or “admin” / “admin”.'); return }
    setLoading(true); const session = MOCK_USERS[username].user; setMockSession(session); toast.success(`Signed in successfully as ${session.name}!`); finishSignIn(session.role)
  }
  function handleSendOtp(event: FormEvent) {
    event.preventDefault(); setError('')
    if (aadhaarInput.replace(/\D/g, '') === SAMPLE_AADHAAR) { setOtpSent(true); toast.info('OTP sent! Demo OTP is 123456.') } else setError(`Invalid sample Aadhaar. Please enter: ${SAMPLE_AADHAAR}`)
  }
  function handleVerifyOtp(event: FormEvent) {
    event.preventDefault(); setError('')
    if (otpInput.trim() !== SAMPLE_AADHAAR_OTP) { setError(`Invalid OTP. Use sample OTP: ${SAMPLE_AADHAAR_OTP}`); return }
    setLoading(true); setMockSession(SAMPLE_AADHAAR_USER); toast.success('Aadhaar OTP verified! Signed in.'); finishSignIn('user')
  }
  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
      const role = (await getUser(user.uid))?.role || 'user'
      document.cookie = 'auth-token=1; path=/; max-age=86400; SameSite=Lax'; document.cookie = `user-role=${role}; path=/; max-age=86400; SameSite=Lax`
      toast.success('Signed in successfully!'); finishSignIn(role)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      setError(code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential' ? 'Invalid email or password.' : 'Authentication failed. Please check your credentials or use Quick Login.')
    } finally { setLoading(false) }
  }
  function selectMode(nextMode: LoginMode) { setMode(nextMode); setError('') }

  return <SignInPage title={<>Welcome to Dis<span className="bg-gradient-to-r from-[#e53945] to-orange-500 bg-clip-text text-transparent">rec</span><span className="text-[#e53945]">.</span></>} description="Sign in to access the Emergency Response Command System." testimonials={testimonials} footer={<p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs leading-5 text-amber-900">For life-threatening emergencies, call <strong>112</strong> or <strong>108</strong> immediately.</p>}>
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-6">
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1.5">
        {([['quick', KeyRound, 'Quick'], ['aadhaar', Fingerprint, 'Aadhaar'], ['email', Mail, 'Email']] as const).map(([value, Icon, label]) => <button key={value} type="button" onClick={() => selectMode(value)} className={`flex items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-xs font-semibold transition ${mode === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Icon size={14} /> {label}</button>)}
      </div>
      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {mode === 'quick' && <form onSubmit={handleQuickLogin} className="space-y-4">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3"><div className="mb-2 flex items-center justify-between text-xs font-bold text-orange-950"><span className="flex items-center gap-1"><Sparkles size={14} /> Demo presets</span><span className="font-normal text-orange-600">Click to fill</span></div><div className="grid grid-cols-2 gap-2">{(['user', 'admin'] as const).map((kind) => <button key={kind} type="button" onClick={() => { setQuickUsername(kind); setQuickPassword(kind); setError('') }} className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-left text-xs font-semibold capitalize text-slate-800 transition hover:bg-orange-100">{kind === 'user' ? 'Public user' : 'Admin center'}<span className="mt-0.5 block font-mono text-[10px] font-normal text-slate-400">{kind} / {kind}</span></button>)}</div></div>
        <label className="block text-sm font-medium text-slate-700">Username / Role ID<GlassInputWrapper><span className="relative block"><UserIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={quickUsername} onChange={(e) => setQuickUsername(e.target.value)} placeholder="user OR admin" required className={iconInputClass} /></span></GlassInputWrapper></label>
        <label className="block text-sm font-medium text-slate-700">Password<GlassInputWrapper><span className="relative block"><Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" value={quickPassword} onChange={(e) => setQuickPassword(e.target.value)} placeholder="user OR admin" required className={iconInputClass} /></span></GlassInputWrapper></label>
        <button type="submit" disabled={loading} className={submitClass}>{loading ? 'Signing in…' : 'Sign in with Quick ID'}</button>
      </form>}
      {mode === 'aadhaar' && <div className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><div className="flex items-center justify-between font-bold"><span className="flex items-center gap-1"><Fingerprint size={14} /> Sample Aadhaar credentials</span><button type="button" onClick={() => { setAadhaarInput(SAMPLE_AADHAAR); setOtpInput(SAMPLE_AADHAAR_OTP); setError('') }} className="font-medium text-orange-700 underline">Auto-fill</button></div><p className="mt-1 font-mono text-[11px]">Aadhaar: 123321456654 · OTP: 123456</p></div>
        {!otpSent ? <form onSubmit={handleSendOtp} className="space-y-4"><label className="block text-sm font-medium text-slate-700">12-digit Aadhaar Number<GlassInputWrapper><span className="relative block"><Fingerprint size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input maxLength={14} value={aadhaarInput} onChange={(e) => setAadhaarInput(e.target.value)} placeholder="123321456654" required className={`${iconInputClass} font-mono tracking-wider`} /></span></GlassInputWrapper></label><button type="submit" className={submitClass}>Generate OTP</button></form> : <form onSubmit={handleVerifyOtp} className="space-y-4"><div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">OTP dispatched for Aadhaar <strong>{aadhaarInput}</strong>. Enter sample OTP: <strong>123456</strong>.</div><label className="block text-sm font-medium text-slate-700">Enter 6-digit OTP<GlassInputWrapper><input maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="123456" required className={`${inputClass} text-center font-mono text-lg tracking-widest`} /></GlassInputWrapper></label><div className="flex gap-3"><button type="button" className="w-1/3 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => { setOtpSent(false); setOtpInput('') }}>Back</button><button type="submit" disabled={loading} className={`${submitClass} w-2/3`}>{loading ? 'Verifying…' : 'Verify & Sign In'}</button></div></form>}</div>}
      {mode === 'email' && <form onSubmit={handleEmailSubmit} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Email address<GlassInputWrapper><span className="relative block"><Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" className={iconInputClass} /></span></GlassInputWrapper></label><label className="block text-sm font-medium text-slate-700"><span className="mb-1 flex items-center justify-between">Password<Link href="/forgot-password" className="text-xs font-medium text-orange-600 hover:underline">Forgot password?</Link></span><GlassInputWrapper><span className="relative block"><Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" className={`${iconInputClass} pr-12`} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((shown) => !shown)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></GlassInputWrapper></label><button type="submit" disabled={loading} className={submitClass}>{loading ? 'Signing in…' : 'Sign in with Email'}</button></form>}
      <p className="mt-6 text-center text-sm text-slate-500">Need a fresh account? <Link href="/register" className="font-semibold text-orange-600 hover:underline">Register new account</Link></p>
    </div>
  </SignInPage>
}

export default function LoginPage() { return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-600">Loading sign in…</div>}><LoginForm /></Suspense> }
