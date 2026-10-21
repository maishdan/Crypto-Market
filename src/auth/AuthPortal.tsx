import { useState, useEffect, type FormEvent } from 'react'
import {
  Eye, EyeOff, CheckCircle2, XCircle, ArrowRight,
  Shield, ShieldCheck, Mail, Phone, User, Globe, Gift, AlertCircle,
  BarChart2, Activity, Lock, LogIn, Sparkles, AtSign,
} from 'lucide-react'
import './AuthPortal.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthTab = 'login' | 'signup'
type AccountMode = 'real' | 'demo'

export type SignupPayload = {
  fullName: string
  username: string
  email: string
  phone: string
  countryCode: string
  country: string
  password: string
  referralCode: string
  accountMode: AccountMode
}

type LoginForm  = { identifier: string; password: string }
type SignupForm = SignupPayload & {
  confirmPassword: string
  agreeTerms: boolean
  agreeRisk: boolean
}

// type FailedAttempt = { count: number; lockedUntil: number | null }

// ─── Data ─────────────────────────────────────────────────────────────────────

const TICKER_BASE = [
  { symbol: 'BTC/USD',  price: 92450.80, change: +3.40 },
  { symbol: 'ETH/USD',  price: 3420.15,  change: +2.10 },
  { symbol: 'XAU/USD',  price: 4154.90,  change: +0.33 },
  { symbol: 'EUR/USD',  price: 1.3650,   change: +0.12 },
  { symbol: 'GBP/USD',  price: 1.2840,   change: +0.18 },
  { symbol: 'NAS100',   price: 20450.60, change: +0.92 },
  { symbol: 'US500',    price: 5850.20,  change: +0.55 },
  { symbol: 'XAG/USD',  price: 31.45,    change: +0.82 },
  { symbol: 'USD/JPY',  price: 154.20,   change: -0.05 },
  { symbol: 'CRASH 500',price: 4890.10,  change: -0.90 },
]

const COUNTRIES = [
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pwStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: 'Weak',   color: '#ff1744' }
  if (s <= 2) return { score: s, label: 'Fair',   color: '#f2b94b' }
  if (s <= 3) return { score: s, label: 'Good',   color: '#00e5ff' }
  return           { score: s, label: 'Strong', color: '#00e676' }
}

function fmtPrice(p: number) {
  if (p < 10)   return p.toFixed(4)
  if (p < 1000) return p.toFixed(2)
  return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveTicker() {
  const [items, setItems] = useState(TICKER_BASE)
  useEffect(() => {
    const t = setInterval(() => {
      setItems(curr => curr.map(item => {
        const delta = (Math.random() - 0.48) * item.price * 0.0008
        return { ...item, price: Math.max(0.001, item.price + delta), change: delta >= 0 ? Math.abs(item.change) : -Math.abs(item.change) }
      }))
    }, 1400)
    return () => clearInterval(t)
  }, [])

  const doubled = [...items, ...items]
  return (
    <div className="nx-ticker-rail">
      <div className="nx-ticker-track">
        {doubled.map((item, i) => (
          <div key={i} className="nx-ticker-item">
            <span className="nx-sym">{item.symbol}</span>
            <span className="nx-price">{fmtPrice(item.price)}</span>
            <span className={item.change >= 0 ? 'nx-up' : 'nx-down'}>
              {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NexsLogo() {
  return (
    <img
      src="/global.png"
      alt="Global Pip Logo"
      style={{ width: 38, height: 38, borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(240, 185, 11, 0.5)', boxShadow: '0 0 12px rgba(0, 136, 255, 0.4)' }}
    />
  )
}

function BgGrid() {
  return (
    <svg className="nx-bg-grid" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,229,255,0.06)" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="600" height="700" fill="url(#grid)" />
      {/* Glowing circuit lines */}
      <path d="M 60 150 L 180 150 L 180 300 L 420 300" stroke="rgba(0,229,255,0.12)" strokeWidth="1.2" fill="none" strokeDasharray="4 6" />
      <path d="M 300 80 L 300 220 L 520 220" stroke="rgba(0,230,118,0.1)" strokeWidth="1.2" fill="none" strokeDasharray="4 6" />
      <path d="M 80 500 L 200 500 L 200 420 L 500 420" stroke="rgba(0,229,255,0.08)" strokeWidth="1" fill="none" strokeDasharray="3 8" />
      <circle cx="180" cy="150" r="4" fill="rgba(0,229,255,0.3)" />
      <circle cx="300" cy="220" r="4" fill="rgba(0,230,118,0.3)" />
      <circle cx="200" cy="500" r="3" fill="rgba(0,229,255,0.25)" />
    </svg>
  )
}

function MiniChart({ seed, color }: { seed: number; color: string }) {
  const pts = Array.from({ length: 30 }, (_, i) => {
    const y = 50 + Math.sin(i * 0.35 + seed) * 22 + Math.sin(i * 0.8 + seed * 2) * 10
    return `${i * 13.8},${Math.max(4, Math.min(96, y))}`
  }).join(' ')
  const fill = pts.split(' ').map((p, i) => i === 0 ? `M ${p}` : `L ${p}`).join(' ') + ` L ${29 * 13.8},100 L 0,100 Z`
  return (
    <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="nx-panel-chart">
      <defs>
        <linearGradient id={`g${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#g${seed})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" opacity="0.7" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = {
  onLogin:      (email: string, password: string) => Promise<string | null>
  onSignup:     (payload: SignupPayload) => Promise<string | null>
  onDemo:       () => void
  onGoogle:     () => void
  onForgot:     (email: string) => Promise<void>
  isSubmitting: boolean
  notice:       string
}

export default function AuthPortal({ onLogin, onSignup, onDemo, onGoogle, onForgot, isSubmitting, notice }: Props) {
  const [tab, setTab]         = useState<AuthTab>('login')
  const [step, setStep]       = useState(1)
  const [showPw, setShowPw]   = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailValid, setEmailValid] = useState<boolean | null>(null)

  // Forgot password
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotSubmitting, setForgotSubmitting] = useState(false)

  const [loginForm, setLoginForm]   = useState<LoginForm>({ identifier: '', password: '' })
  const [signupForm, setSignupForm] = useState<SignupForm>({
    fullName: '', username: '', email: '', phone: '', countryCode: '+254', country: 'Kenya',
    password: '', confirmPassword: '', referralCode: '', accountMode: 'real',
    agreeTerms: false, agreeRisk: false,
  })

  const strength = pwStrength(signupForm.password)
  const selectedCountry = COUNTRIES.find(c => c.name === signupForm.country) ?? COUNTRIES[0]

  const switchTab = (t: AuthTab) => { setTab(t); setStep(1); setFormError(''); setEmailValid(null) }

  // Live email validation on signup
  const handleEmailChange = (val: string) => {
    setSignupForm(f => ({ ...f, email: val }))
    setEmailValid(val.length > 4 ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) : null)
  }

  // ── Login — no lockout, clean errors ────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!loginForm.identifier.trim() || !loginForm.password) {
      setFormError('Please enter your email and password.')
      return
    }
    const err = await onLogin(loginForm.identifier.trim(), loginForm.password)
    if (err) setFormError(err)
  }

  // ── Signup validation per step ───────────────────────────────────────────
  const validateStep = (): string | null => {
    if (step === 1) {
      if (!signupForm.fullName.trim()) return 'Full name is required.'
      if (!signupForm.username.trim()) return 'Username is required.'
      if (signupForm.username.length < 3) return 'Username must be at least 3 characters.'
      if (!/^[a-zA-Z0-9_]+$/.test(signupForm.username)) return 'Username can only contain letters, numbers and underscores.'
      if (!signupForm.email.trim() || emailValid === false) return 'Enter a valid email address.'
      if (!signupForm.phone.trim()) return 'Phone number is required.'
      return null
    }
    if (step === 2) {
      if (signupForm.password.length < 8) return 'Password must be at least 8 characters.'
      if (signupForm.password !== signupForm.confirmPassword) return 'Passwords do not match.'
      return null
    }
    if (step === 3) {
      if (!signupForm.agreeTerms || !signupForm.agreeRisk) return 'You must agree to all terms to continue.'
      return null
    }
    return null
  }

  const nextStep = () => {
    const err = validateStep()
    if (err) { setFormError(err); return }
    setFormError('')
    setStep(s => Math.min(3, s + 1) as 1 | 2 | 3)
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    const err = validateStep()
    if (err) { setFormError(err); return }

    const payload: SignupPayload = {
      fullName:    signupForm.fullName,
      username:    signupForm.username,
      email:       signupForm.email,
      phone:       `${signupForm.countryCode}${signupForm.phone}`,
      countryCode: signupForm.countryCode,
      country:     signupForm.country,
      password:    signupForm.password,
      referralCode: signupForm.referralCode,
      accountMode: signupForm.accountMode,
    }
    const result = await onSignup(payload)
    if (result) setFormError(result)
  }

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgot = async (e: FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotSubmitting(true)
    await onForgot(forgotEmail.trim())
    setForgotSent(true)
    setForgotSubmitting(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="nx-shell">
      <BgGrid />

      {/* Live ticker top bar */}
      <LiveTicker />

      <div className="nx-body">
        {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
        <div className="nx-left">
          <div className="nx-left-inner">
            {/* Logo + brand */}
            <div className="nx-brand">
              <NexsLogo />
              <div>
                <div className="nx-brand-name">GLOBAL PIP</div>
                <div className="nx-brand-tag">Next-Generation Global Trading Terminal</div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="nx-headline">
              Trade Smarter.<br />
              <span className="nx-headline-accent">Grow Faster.</span>
            </h1>
            <p className="nx-subline">
              Access global Forex, Crypto, Synthetic Indices &amp; Commodities with institutional-grade tools and AI-powered signals.
            </p>

            {/* Stat pills */}
            <div className="nx-stat-row">
              <div className="nx-stat"><BarChart2 size={14} /><span><strong>18+</strong> Asset Classes</span></div>
              <div className="nx-stat"><Activity size={14} /><span><strong>AI</strong> Entry Scanner</span></div>
              <div className="nx-stat"><Shield size={14} /><span><strong>Bank-Grade</strong> Security</span></div>
            </div>

            {/* Mini charts */}
            <div className="nx-mini-charts">
              <div className="nx-mini-chart-card">
                <div className="nx-mini-chart-label"><span>BTC/USD</span><span className="nx-up">+3.40%</span></div>
                <MiniChart seed={1.2} color="#00e5ff" />
              </div>
              <div className="nx-mini-chart-card">
                <div className="nx-mini-chart-label"><span>XAU/USD</span><span className="nx-up">+0.33%</span></div>
                <MiniChart seed={2.7} color="#00e676" />
              </div>
            </div>

            {/* Demo CTA */}
            <button className="nx-demo-cta" onClick={onDemo}>
              <Sparkles size={16} />
              Try Free Demo — $10,000 Virtual Funds
              <ArrowRight size={15} />
            </button>
            <p className="nx-demo-note">No registration required. Explore AI Scanner, charts &amp; investments instantly.</p>
          </div>
        </div>

        {/* ── RIGHT PANEL (Auth Card) ──────────────────────────────────── */}
        <div className="nx-right">
          <div className="nx-card">

            {/* Tab switcher */}
            <div className="nx-tabs">
              <button className={`nx-tab ${tab === 'login' ? 'nx-tab-active' : ''}`} onClick={() => switchTab('login')}>
                <LogIn size={14} /> Sign In
              </button>
              <button className={`nx-tab ${tab === 'signup' ? 'nx-tab-active' : ''}`} onClick={() => switchTab('signup')}>
                <User size={14} /> Create Account
              </button>
            </div>

            {/* ── LOGIN ─────────────────────────────────────────────────── */}
            {tab === 'login' && (
              <div className="nx-form-wrap">
                <div className="nx-form-head">
                  <div className="nx-form-kicker">WELCOME BACK</div>
                  <h2>Sign in to Global Pip</h2>
                  <p>Access your trading dashboard, portfolio &amp; live positions.</p>
                </div>

                <form onSubmit={handleLogin} className="nx-form" noValidate>
                  <label className="nx-label">
                    <span><Mail size={13} /> Email or Username</span>
                    <input
                      className="nx-input"
                      type="text"
                      placeholder="you@example.com"
                      value={loginForm.identifier}
                      autoComplete="username"
                      onChange={e => { setLoginForm(f => ({ ...f, identifier: e.target.value })); setFormError('') }}
                      required
                    />
                  </label>

                  <label className="nx-label">
                    <span><Lock size={13} /> Password</span>
                    <div className="nx-pw-wrap">
                      <input
                        className="nx-input"
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••••"
                        value={loginForm.password}
                        autoComplete="current-password"
                        onChange={e => { setLoginForm(f => ({ ...f, password: e.target.value })); setFormError('') }}
                        required
                      />
                      <button type="button" className="nx-pw-eye" onClick={() => setShowPw(p => !p)}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </label>

                  <div className="nx-login-meta">
                    <button type="button" className="nx-forgot-link" onClick={() => { setForgotOpen(true); setForgotSent(false) }}>
                      Forgot password?
                    </button>
                  </div>

                  {formError && (
                    <div className="nx-error"><AlertCircle size={13} /> {formError}</div>
                  )}

                  <button type="submit" className="nx-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <><span className="nx-spinner" /> Signing in…</> : <><LogIn size={15} /> Sign In to Terminal</>}
                  </button>
                </form>

                <div className="nx-divider"><span>or</span></div>

                <button className="nx-google-btn" type="button" onClick={onGoogle}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continue with Google
                </button>

                <button className="nx-demo-inline" onClick={onDemo}>
                  <Sparkles size={14} /> Continue with Free Demo ($10,000 Virtual)
                </button>
              </div>
            )}

            {/* ── SIGNUP ────────────────────────────────────────────────── */}
            {tab === 'signup' && (
              <div className="nx-form-wrap">
                <div className="nx-form-head">
                  <div className="nx-form-kicker">NEW ACCOUNT</div>
                  <h2>Join Global Pip</h2>
                  <p>Create your trading account in under 2 minutes.</p>
                </div>

                {/* Account mode toggle */}
                <div className="nx-mode-toggle">
                  <button
                    type="button"
                    className={`nx-mode-btn ${signupForm.accountMode === 'real' ? 'nx-mode-active' : ''}`}
                    onClick={() => setSignupForm(f => ({ ...f, accountMode: 'real' }))}
                  >
                    <Activity size={13} /> Real Account
                  </button>
                  <button
                    type="button"
                    className={`nx-mode-btn nx-mode-demo ${signupForm.accountMode === 'demo' ? 'nx-mode-active-demo' : ''}`}
                    onClick={() => setSignupForm(f => ({ ...f, accountMode: 'demo' }))}
                  >
                    <Sparkles size={13} /> Demo — $10,000 Free
                  </button>
                </div>

                {/* Google signup */}
                <button className="nx-google-btn" type="button" onClick={onGoogle}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Sign up with Google
                </button>

                <div className="nx-divider"><span>or fill in your details</span></div>

                {/* Step progress */}
                <div className="nx-steps">
                  {[1, 2, 3].map(n => (
                    <div key={n} className={`nx-step ${step === n ? 'nx-step-active' : ''} ${step > n ? 'nx-step-done' : ''}`}>
                      {step > n ? <CheckCircle2 size={14} /> : <span>{n}</span>}
                      <span className="nx-step-label">
                        {n === 1 ? 'Your Details' : n === 2 ? 'Set Password' : 'Confirm'}
                      </span>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={step < 3 ? (e) => { e.preventDefault(); nextStep() } : handleSignup}
                  className="nx-form"
                  noValidate
                >
                  {/* Step 1 — Identity */}
                  {step === 1 && (
                    <>
                      <label className="nx-label">
                        <span><User size={13} /> Full Name</span>
                        <input className="nx-input" placeholder="Jane Doe" value={signupForm.fullName}
                          onChange={e => setSignupForm(f => ({ ...f, fullName: e.target.value }))} required />
                      </label>

                      <label className="nx-label">
                        <span><AtSign size={13} /> Username</span>
                        <input className="nx-input" placeholder="jane_trader" value={signupForm.username}
                          autoComplete="username"
                          onChange={e => setSignupForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '_').toLowerCase() }))} required />
                        <span style={{ fontSize: '10.5px', color: 'var(--nx-muted)', marginTop: '2px' }}>
                          Letters, numbers &amp; underscores only. Used to sign in.
                        </span>
                      </label>

                      <label className="nx-label">
                        <span>
                          <Mail size={13} /> Email Address
                          {emailValid === true  && <CheckCircle2 size={12} color="#00e676" style={{ marginLeft: 4 }} />}
                          {emailValid === false && <XCircle size={12} color="#ff1744" style={{ marginLeft: 4 }} />}
                        </span>
                        <input className={`nx-input ${emailValid === false ? 'nx-input-error' : emailValid === true ? 'nx-input-ok' : ''}`}
                          type="email" placeholder="you@example.com"
                          value={signupForm.email} onChange={e => handleEmailChange(e.target.value)} required />
                      </label>

                      <label className="nx-label">
                        <span><Globe size={13} /> Country</span>
                        <select className="nx-input nx-select" value={signupForm.country}
                          onChange={e => {
                            const c = COUNTRIES.find(x => x.name === e.target.value) ?? COUNTRIES[0]
                            setSignupForm(f => ({ ...f, country: c.name, countryCode: c.code }))
                          }}>
                          {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
                        </select>
                      </label>

                      <label className="nx-label">
                        <span><Phone size={13} /> Phone Number</span>
                        <div className="nx-phone-row">
                          <select className="nx-input nx-phone-code" value={signupForm.countryCode}
                            onChange={e => setSignupForm(f => ({ ...f, countryCode: e.target.value }))}>
                            {COUNTRIES.map(c => <option key={c.name} value={c.code}>{c.flag} {c.code}</option>)}
                          </select>
                          <input className="nx-input nx-phone-num" type="tel" placeholder="712 345 678"
                            value={signupForm.phone}
                            onChange={e => setSignupForm(f => ({ ...f, phone: e.target.value }))} required />
                        </div>
                      </label>
                    </>
                  )}

                  {/* Step 2 — Password */}
                  {step === 2 && (
                    <>
                      <label className="nx-label">
                        <span><Lock size={13} /> Create Password</span>
                        <div className="nx-pw-wrap">
                          <input className="nx-input" type={showPw ? 'text' : 'password'}
                            placeholder="Min 8 characters"
                            value={signupForm.password} autoComplete="new-password"
                            onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))} required />
                          <button type="button" className="nx-pw-eye" onClick={() => setShowPw(p => !p)}>
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {/* Strength meter */}
                        {signupForm.password && (
                          <div className="nx-strength">
                            <div className="nx-strength-bars">
                              {[1,2,3,4,5].map(n => (
                                <div key={n} className="nx-strength-bar"
                                  style={{ background: n <= strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
                              ))}
                            </div>
                            <span style={{ color: strength.color, fontSize: '11px', fontWeight: 700 }}>{strength.label}</span>
                          </div>
                        )}
                        <div className="nx-pw-rules">
                          {[
                            { ok: signupForm.password.length >= 8,          text: '8+ characters' },
                            { ok: /[A-Z]/.test(signupForm.password),         text: 'Uppercase letter' },
                            { ok: /[0-9]/.test(signupForm.password),         text: 'Number' },
                            { ok: /[^A-Za-z0-9]/.test(signupForm.password), text: 'Special character' },
                          ].map(r => (
                            <span key={r.text} className={`nx-pw-rule ${r.ok ? 'nx-rule-ok' : ''}`}>
                              {r.ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {r.text}
                            </span>
                          ))}
                        </div>
                      </label>

                      <label className="nx-label">
                        <span><Lock size={13} /> Confirm Password</span>
                        <div className="nx-pw-wrap">
                          <input className="nx-input" type={showPw2 ? 'text' : 'password'}
                            placeholder="Repeat password"
                            value={signupForm.confirmPassword} autoComplete="new-password"
                            onChange={e => setSignupForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
                          <button type="button" className="nx-pw-eye" onClick={() => setShowPw2(p => !p)}>
                            {showPw2 ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {signupForm.confirmPassword && signupForm.password !== signupForm.confirmPassword && (
                          <span className="nx-match-err"><XCircle size={11} /> Passwords don't match</span>
                        )}
                        {signupForm.confirmPassword && signupForm.password === signupForm.confirmPassword && (
                          <span className="nx-match-ok"><CheckCircle2 size={11} /> Passwords match</span>
                        )}
                      </label>

                      <label className="nx-label">
                        <span><Gift size={13} /> Referral Code <em className="nx-optional">(optional)</em></span>
                        <input className="nx-input" placeholder="e.g. NEXS2026" value={signupForm.referralCode}
                          onChange={e => setSignupForm(f => ({ ...f, referralCode: e.target.value }))} />
                      </label>
                    </>
                  )}

                  {/* Step 3 — Confirm & Terms */}
                  {step === 3 && (
                    <>
                      <div className="nx-review-card">
                        <div className="nx-review-row"><span>Name</span><strong>{signupForm.fullName}</strong></div>
                        <div className="nx-review-row"><span>Email</span><strong>{signupForm.email}</strong></div>
                        <div className="nx-review-row"><span>Phone</span><strong>{signupForm.countryCode} {signupForm.phone}</strong></div>
                        <div className="nx-review-row"><span>Country</span><strong>{selectedCountry.flag} {signupForm.country}</strong></div>
                        <div className="nx-review-row">
                          <span>Account</span>
                          <strong style={{ color: signupForm.accountMode === 'demo' ? '#00e676' : '#00e5ff' }}>
                            {signupForm.accountMode === 'demo' ? '🎮 Demo — $10,000 Virtual' : '📈 Real Account'}
                          </strong>
                        </div>
                      </div>

                      <label className="nx-check-label">
                        <input type="checkbox" checked={signupForm.agreeTerms}
                          onChange={e => setSignupForm(f => ({ ...f, agreeTerms: e.target.checked }))} />
                        <span>I agree to the <a href="#terms" className="nx-link">Terms of Service</a> and <a href="#privacy" className="nx-link">Privacy Policy</a></span>
                      </label>
                      <label className="nx-check-label">
                        <input type="checkbox" checked={signupForm.agreeRisk}
                          onChange={e => setSignupForm(f => ({ ...f, agreeRisk: e.target.checked }))} />
                        <span>I acknowledge the <a href="#risk" className="nx-link">Risk Disclosure</a> — trading involves significant risk</span>
                      </label>
                    </>
                  )}

                  {formError && (
                    <div className="nx-error"><AlertCircle size={13} /> {formError}</div>
                  )}

                  <div className="nx-step-actions">
                    {step > 1 && (
                      <button type="button" className="nx-btn-back" onClick={() => { setStep(s => Math.max(1, s - 1) as 1 | 2 | 3); setFormError('') }}>
                        ← Back
                      </button>
                    )}
                    <button type="submit" className="nx-btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
                      {isSubmitting ? <><span className="nx-spinner" /> Creating account…</> :
                        step < 3 ? <>Continue <ArrowRight size={14} /></> :
                        <><CheckCircle2 size={15} /> Create My Account</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notice */}
            {notice && (
              <div className="nx-notice"><Sparkles size={13} /> {notice}</div>
            )}

            {/* Demo badge */}
            <div className="nx-card-footer">
              <Shield size={12} /> Secured with 256-bit TLS encryption
            </div>
          </div>
        </div>

        {/* FULL SCREEN LOADING OVERLAY FOR AUTH ACTIONS */}
        {(isSubmitting || forgotSubmitting) && (
          <div className="global-loading-screen" aria-live="polite">
            <img
              src="/loading.gif"
              alt="Authenticating..."
              className="global-loading-gif"
            />
            <div className="global-loading-text">
              <Sparkles size={18} color="#f0b90b" />
              <span>Connecting to Global Pip...</span>
            </div>
            <div className="global-loading-progress-bar">
              <div className="global-loading-progress-fill" />
            </div>
          </div>
        )}
      </div>

      {/* ── FORGOT PASSWORD MODAL ──────────────────────────────────────── */}
      {forgotOpen && (
        <div className="nx-modal-overlay" onClick={() => setForgotOpen(false)}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <Mail size={20} color="#00e5ff" />
              <h3>Reset Password</h3>
            </div>
            {!forgotSent ? (
              <>
                <p className="nx-modal-desc">Enter your registered email address. We'll send a secure reset link instantly.</p>
                <form onSubmit={handleForgot} className="nx-form">
                  <label className="nx-label">
                    <span>Email Address</span>
                    <input className="nx-input" type="email" placeholder="you@example.com"
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                  </label>
                  <button type="submit" className="nx-btn-primary" disabled={forgotSubmitting}>
                    {forgotSubmitting ? <><span className="nx-spinner" /> Sending…</> : <><Mail size={14} /> Send Reset Link</>}
                  </button>
                </form>
              </>
            ) : (
              <div className="nx-forgot-success">
                <CheckCircle2 size={36} color="#00e676" />
                <strong>Reset link sent!</strong>
                <p>Check your inbox at <em>{forgotEmail}</em> for the password reset link. It expires in 15 minutes.</p>
              </div>
            )}
            <button className="nx-modal-close" onClick={() => setForgotOpen(false)}>✕ Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
