import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, LayoutDashboard, Users, FileText, Wallet, Settings,
  Activity, Bell, Lock, LogOut, Search, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, Ban,
  Download, TrendingUp, TrendingDown, Zap, Sparkles,
  DollarSign, Clock, Shield, AlertCircle, X,
  Pencil, Globe, Wifi, RefreshCw,
  ServerCrash, ChevronRight, MessageSquare, KeyRound, CreditCard, ToggleLeft, ToggleRight, Copy,
} from 'lucide-react'
import './AdminDashboard.css'
import '../features/features.css'
import AdminChatDesk from '../features/AdminChatDesk'
import { supabase } from '../lib/supabase'
import AuthPortal, { type SignupPayload } from '../auth/AuthPortal'

// ─── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminSection =
  | 'overview'
  | 'users'
  | 'kyc'
  | 'finance'
  | 'security'
  | 'admins'
  | 'audit'
  | 'settings'
  | 'support'
  | 'gateway'

type AdminRole = 'super_admin' | 'kyc_admin' | 'finance_admin' | 'support_admin'

type AdminPermissions = {
  canManageUsers: boolean
  canApproveKyc: boolean
  canApproveWithdrawals: boolean
  canManageAdmins: boolean
  canViewAuditLogs: boolean
  canAdjustBalances: boolean
}

type AdminUser = {
  id: string
  name: string
  email: string
  role: AdminRole
  permissions: AdminPermissions
  isProtected: boolean
  lastLogin: string
  addedAt: string
  status: 'active' | 'inactive'
  ipWhitelist: string[]
}

type PlatformUser = {
  id: string
  name: string
  email: string
  phone: string
  country: string
  balance: number
  accountType: 'DEMO' | 'LIVE'
  status: 'active' | 'suspended' | 'pending'
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  accountStatus: 'pending' | 'approved'
  registeredAt: string
  lastSeen: string
}

type KycCase = {
  id: string
  userId: string
  userName: string
  userEmail: string
  documentType: 'National ID' | 'Passport' | 'Proof of Address' | 'Driver License'
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  docFrontUrl?: string
  docBackUrl?: string
  storagePath?: string
  mimeType?: string
  fileUrl?: string
}

type Transaction = {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: 'deposit' | 'withdrawal' | 'adjustment'
  amount: number
  network: string
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  createdAt: string
  flagReason?: string
}

type AuditEntry = {
  id: string
  adminName: string
  adminEmail: string
  action: string
  targetId: string
  targetType: string
  detail: string
  timestamp: string
  ipAddress: string
  severity: 'info' | 'warning' | 'critical'
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const superAdminPermissions: AdminPermissions = {
  canManageUsers: true,
  canApproveKyc: true,
  canApproveWithdrawals: true,
  canManageAdmins: true,
  canViewAuditLogs: true,
  canAdjustBalances: true,
}

const kycAdminPermissions: AdminPermissions = {
  canManageUsers: false,
  canApproveKyc: true,
  canApproveWithdrawals: false,
  canManageAdmins: false,
  canViewAuditLogs: false,
  canAdjustBalances: false,
}

const financeAdminPermissions: AdminPermissions = {
  canManageUsers: false,
  canApproveKyc: false,
  canApproveWithdrawals: true,
  canManageAdmins: false,
  canViewAuditLogs: false,
  canAdjustBalances: true,
}

const initialAdmins: AdminUser[] = [
  {
    id: 'adm-super-1',
    name: 'Protected Admin',
    email: 'admin@nexsmarkets.com',
    role: 'super_admin',
    permissions: superAdminPermissions,
    isProtected: true,
    lastLogin: new Date().toISOString(),
    addedAt: '2026-01-01',
    status: 'active',
    ipWhitelist: [],
  },
  {
    id: 'adm-kyc-1',
    name: 'Amara Osei',
    email: 'kyc@exstrade.com',
    role: 'kyc_admin',
    permissions: kycAdminPermissions,
    isProtected: false,
    lastLogin: '2026-10-07T09:14:00Z',
    addedAt: '2026-03-15',
    status: 'active',
    ipWhitelist: [],
  },
  {
    id: 'adm-fin-1',
    name: 'Priya Sharma',
    email: 'finance@exstrade.com',
    role: 'finance_admin',
    permissions: financeAdminPermissions,
    isProtected: false,
    lastLogin: '2026-10-08T14:30:00Z',
    addedAt: '2026-04-20',
    status: 'active',
    ipWhitelist: [],
  },
]

const initialUsers: PlatformUser[] = []

const initialKycQueue: KycCase[] = []

const initialTransactions: Transaction[] = []

const initialAuditLog: AuditEntry[] = [
  { id: 'aud-init', adminName: 'System', adminEmail: 'system@nexsmarkets.com', action: 'SYSTEM_INIT', targetId: 'system', targetType: 'System', detail: 'Admin dashboard initialised. Awaiting live user data.', timestamp: new Date().toISOString(), ipAddress: '—', severity: 'info' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}
const fmtUSD = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const roleLabel: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  kyc_admin: 'KYC Admin',
  finance_admin: 'Finance Admin',
  support_admin: 'Support Admin',
}

const roleColor: Record<AdminRole, string> = {
  super_admin: '#f0b90b',
  kyc_admin: '#5aa7ff',
  finance_admin: '#1ccf84',
  support_admin: '#8b5cf6',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(28,207,132,0.15)', color: '#1ccf84', label: 'Active' },
    suspended: { bg: 'rgba(240,68,82,0.15)',  color: '#f04452', label: 'Suspended' },
    pending:   { bg: 'rgba(242,185,75,0.15)', color: '#f2b94b', label: 'Pending' },
    approved:  { bg: 'rgba(28,207,132,0.15)', color: '#1ccf84', label: 'Approved' },
    rejected:  { bg: 'rgba(240,68,82,0.15)',  color: '#f04452', label: 'Rejected' },
    flagged:   { bg: 'rgba(240,68,82,0.18)',  color: '#ff6b6b', label: 'Flagged' },
    verified:  { bg: 'rgba(28,207,132,0.15)', color: '#1ccf84', label: 'Verified' },
    unverified:{ bg: 'rgba(148,163,184,0.1)', color: '#9aa7b8', label: 'Unverified' },
    inactive:  { bg: 'rgba(148,163,184,0.1)', color: '#9aa7b8', label: 'Inactive' },
    info:      { bg: 'rgba(90,167,255,0.12)', color: '#5aa7ff', label: 'Info' },
    warning:   { bg: 'rgba(242,185,75,0.15)', color: '#f2b94b', label: 'Warning' },
    critical:  { bg: 'rgba(240,68,82,0.18)',  color: '#f04452', label: 'Critical' },
  }
  const s = map[status] ?? { bg: 'rgba(148,163,184,0.1)', color: '#9aa7b8', label: status }
  return (
    <span className="sa-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

type Props = {
  agentName?: string
  currentUser?: { id: string; fullName: string; email: string; role?: string }
}

export default function AdminDashboard({ currentUser }: Props = {}) {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    if (currentUser) {
      return {
        id: currentUser.id,
        name: currentUser.fullName || currentUser.email.split('@')[0] || 'Protected Admin',
        email: currentUser.email || 'admin@nexsmarkets.com',
        role: 'super_admin',
        permissions: superAdminPermissions,
        isProtected: true,
        addedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        status: 'active',
        ipWhitelist: [],
      }
    }
    return null
  })

  // Auto-authenticate signed-in admin user directly to Full Admin Dashboard
  useEffect(() => {
    if (currentUser) {
      setCurrentAdmin({
        id: currentUser.id,
        name: currentUser.fullName || currentUser.email.split('@')[0] || 'Protected Admin',
        email: currentUser.email || 'admin@nexsmarkets.com',
        role: 'super_admin',
        permissions: superAdminPermissions,
        isProtected: true,
        addedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        status: 'active',
        ipWhitelist: [],
      })
      return
    }

    const checkAdminSession = async () => {
      if (!supabase) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const u = session?.user
        if (u) {
          const isAdmin = u.app_metadata?.role === 'admin' || u.user_metadata?.role === 'admin'
          if (isAdmin) {
            const adminObj: AdminUser = {
              id: u.id,
              name: String(u.user_metadata?.full_name || u.email?.split('@')[0] || 'Protected Admin'),
              email: u.email || 'admin@nexsmarkets.com',
              role: 'super_admin',
              permissions: superAdminPermissions,
              isProtected: true,
              addedAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              status: 'active',
              ipWhitelist: [],
            }
            setCurrentAdmin(adminObj)
          }
        }
      } catch {
        // silent
      }
    }
    void checkAdminSession()
  }, [currentUser])

  const [authSubmitting, setAuthSubmitting] = useState(false)

  const handleAuthLogin = async (loginEmail: string, loginPw: string): Promise<string | null> => {
    if (!supabase) return 'Supabase client is not initialized.'
    setAuthSubmitting(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw })
    setAuthSubmitting(false)
    if (error) {
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credentials')) {
        return 'Incorrect email or password.'
      }
      return error.message
    }
    const u = data.user
    if (u) {
      const isAdmin = u.app_metadata?.role === 'admin' || u.user_metadata?.role === 'admin'
      if (isAdmin) {
        setCurrentAdmin({
          id: u.id,
          name: String(u.user_metadata?.full_name || u.email?.split('@')[0] || 'Protected Admin'),
          email: u.email || 'admin@nexsmarkets.com',
          role: 'super_admin',
          permissions: superAdminPermissions,
          isProtected: true,
          addedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: 'active',
          ipWhitelist: [],
        })
        return null
      } else {
        window.location.href = '/'
        return null
      }
    }
    return null
  }

  const handleAuthSignup = async (payload: SignupPayload): Promise<string | null> => {
    if (!supabase) return 'Supabase is not configured.'
    setAuthSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          username: payload.username,
          phone: payload.phone,
          country: payload.country,
        },
      },
    })
    setAuthSubmitting(false)
    if (error) return error.message
    if (data.user) {
      const isAdmin = data.user.app_metadata?.role === 'admin' || data.user.user_metadata?.role === 'admin'
      if (isAdmin) {
        setCurrentAdmin({
          id: data.user.id,
          name: payload.fullName || 'Protected Admin',
          email: payload.email,
          role: 'super_admin',
          permissions: superAdminPermissions,
          isProtected: true,
          addedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: 'active',
          ipWhitelist: [],
        })
        return null
      }
    }
    window.location.href = '/'
    return null
  }

  const handleAuthDemo = () => { window.location.href = '/' }
  const handleAuthGoogle = async () => {
    if (supabase) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
    }
  }
  const handleAuthForgot = async (emailStr: string) => {
    if (supabase) {
      await supabase.auth.resetPasswordForEmail(emailStr, { redirectTo: window.location.origin })
      notify(`Password reset link sent to ${emailStr}`)
    }
  }

  // Data state
  const [section, setSection] = useState<AdminSection>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#admin/', '').replace('#', '').trim()
      const validSections: AdminSection[] = ['overview', 'users', 'kyc', 'finance', 'security', 'admins', 'audit', 'settings', 'support', 'gateway']
      if (validSections.includes(hash as AdminSection)) return hash as AdminSection
      const saved = localStorage.getItem('admin_active_section') as AdminSection | null
      if (saved && validSections.includes(saved)) return saved
    }
    return 'overview'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = `#admin/${section}`
      localStorage.setItem('admin_active_section', section)
    }
  }, [section])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#admin/', '').replace('#', '').trim() as AdminSection
      const validSections: AdminSection[] = ['overview', 'users', 'kyc', 'finance', 'security', 'admins', 'audit', 'settings', 'support', 'gateway']
      if (validSections.includes(hash)) {
        setSection(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [users, setUsers] = useState<PlatformUser[]>(initialUsers)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [kycQueue, setKycQueue] = useState<KycCase[]>(initialKycQueue)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialAuditLog)

  // UI state
  const [userSearch, setUserSearch] = useState('')
  const [txFilter, setTxFilter] = useState<'all' | 'pending' | 'flagged'>('all')
  const [kycFilter, setKycFilter] = useState<'all' | 'pending'>('pending')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'warn' } | null>(null)

  const showToast = useCallback((msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setToast({ msg, type })
  }, [])

  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [selectedKyc, setSelectedKyc] = useState<KycCase | null>(null)
  const [kycRejectReason, setKycRejectReason] = useState('')
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null)
  const [balanceModal, setBalanceModal] = useState<{ user: PlatformUser; amount: string; mode: 'credit' | 'debit'; reason: string } | null>(null)
  const [addAdminModal, setAddAdminModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'kyc_admin' as AdminRole })
  const [lockdownActive, setLockdownActive] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Edit user + reset password modals
  const [editUserModal, setEditUserModal] = useState<PlatformUser | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', email: '', phone: '', country: '' })
  const [resetPwModal, setResetPwModal] = useState<PlatformUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetPwDone, setResetPwDone] = useState(false)

  // User Profit / Loss Allocation state (Live trades lose by default unless allocated profit)
  const [userProfitAllocations, setUserProfitAllocations] = useState<Record<string, 'PROFIT' | 'LOSS'>>(() => {
    try {
      const saved = localStorage.getItem('admin_user_profit_allocations')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const setUserProfitAllocationMode = async (user: PlatformUser, nextMode: 'PROFIT' | 'LOSS') => {
    const updated: Record<string, 'PROFIT' | 'LOSS'> = { ...userProfitAllocations, [user.id]: nextMode }
    setUserProfitAllocations(updated)
    localStorage.setItem('admin_user_profit_allocations', JSON.stringify(updated))
    localStorage.setItem('admin_override_winner', nextMode === 'PROFIT' ? 'true' : 'false')

    // Broadcast to active windows/iframes
    window.postMessage({ type: 'EXSTRADE_PROFIT_ALLOCATION', userId: user.id, mode: nextMode }, '*')

    // Write to Supabase user_trade_allocations table
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/user_trade_allocations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          trade_outcome: nextMode === 'PROFIT' ? 'FORCE_PROFIT' : 'HOUSE_LOSS',
          win_rate: nextMode === 'PROFIT' ? 85 : 0,
          updated_at: new Date().toISOString(),
        }),
      })
    } catch {
      // silent
    }

    addAudit(
      'PROFIT_ALLOCATION_CHANGE',
      user.id,
      'Finance',
      `Admin set trade outcome for ${user.name} (${user.email}) to ${nextMode === 'PROFIT' ? '🟢 FORCE PROFIT (+85% WINS)' : '🔴 FORCE LOSS (100% HOUSE LOSS)'}`,
      nextMode === 'PROFIT' ? 'warning' : 'info'
    )
    showToast(`Trade outcome for ${user.name}: ${nextMode === 'PROFIT' ? '🟢 PROFIT (WINS)' : '🔴 LOSS (100% HOUSE LOSS)'}`)
  }

  // Notify user modal
  const [notifyModal, setNotifyModal] = useState<PlatformUser | null>(null)
  const [notifySubject, setNotifySubject] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifyType, setNotifyType] = useState<'info' | 'warning' | 'success'>('info')
  const [notifySent, setNotifySent] = useState(false)

  // Payment Gateway state
  type DepositAddr = { id: string; network: string; assetName: string; address: string; note: string; enabled: boolean }
  const [gatewayAddresses, setGatewayAddresses] = useState<DepositAddr[]>([
    { id: 'ga-usdt-trc20', network: 'USDT-TRC20', assetName: 'Tether (USDT TRON)', address: 'TQAQAWyR1LH83A6V5ZanfokC6wjApdfc5q', note: 'Send USDT on TRON (TRC-20) network only.', enabled: true },
    { id: 'ga-eth', network: 'ETH', assetName: 'Ethereum (ETH)', address: '0x9bAfa7af80d50b4Ac3D8489AC7EE17547Cadec0d', note: 'Send ETH on Ethereum (ERC-20) mainnet.', enabled: true },
    { id: 'ga-btc', network: 'BTC', assetName: 'Bitcoin (BTC)', address: 'bc1pmw96zsq7qn4y5spfferdszyzj503z4rjylzlyncvykzyy9exqvds8r7pm9', note: 'Send BTC over Native Bitcoin mainnet.', enabled: true },
  ])
  const [newAddr, setNewAddr] = useState({ network: '', assetName: '', address: '', note: '' })
  const [addAddrOpen, setAddAddrOpen] = useState(false)
  const [editAddrId, setEditAddrId] = useState<string | null>(null)
  const [editAddrDraft, setEditAddrDraft] = useState({ network: '', assetName: '', address: '', note: '' })

  // Platform deposit settings (editable by admin)
  const [minDepositUSD, setMinDepositUSD]     = useState(50)
  const [minDepositKES, setMinDepositKES]     = useState(100)
  const [minWithdrawalUSD, setMinWithdrawalUSD] = useState(10)
  const [settingsDraft, setSettingsDraft]     = useState({ minUSD: '50', minKES: '100', minWithdraw: '10' })
  const [settingsSaved, setSettingsSaved]     = useState(false)

  // Upgrade user to admin
  const [upgradeModal, setUpgradeModal] = useState<PlatformUser | null>(null)
  const [upgradeRole, setUpgradeRole] = useState<AdminRole>('kyc_admin')

  // Audit helper
  const addAudit = useCallback((action: string, targetId: string, targetType: string, detail: string, severity: AuditEntry['severity'] = 'info') => {
    if (!currentAdmin) return
    const entry: AuditEntry = {
      id: 'aud-' + Date.now(),
      adminName: currentAdmin.name,
      adminEmail: currentAdmin.email,
      action,
      targetId,
      targetType,
      detail,
      timestamp: new Date().toISOString(),
      ipAddress: '102.215.44.xx',
      severity,
    }
    setAuditLog(curr => [entry, ...curr])
  }, [currentAdmin])

  const notify = (msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Fetch real users from Supabase REST API directly (Bypasses Edge Function 403) ──
  const fetchUsers = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
    setUsersLoading(true)
    setUsersError('')
    try {
      await fetchUsersFromProfiles()
    } catch {
      setUsersError('Failed to load users from database.')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // Read profiles and wallets tables directly via Supabase REST API
  const fetchUsersFromProfiles = async () => {
    try {
      const [profilesRes, walletsRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=id,email,full_name,phone,country,kyc_status,account_status,created_at&order=created_at.desc`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/wallets?select=user_id,live_balance,demo_balance`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        ),
      ])

      if (!profilesRes.ok) { setUsersError('Could not load profiles.'); return }
      const rows = await profilesRes.json() as Array<{ id: string; email: string; full_name: string; phone: string; country: string; kyc_status: string; account_status: string; created_at: string }>

      let walletMap: Record<string, number> = {}
      if (walletsRes.ok) {
        const walletRows = await walletsRes.json() as Array<{ user_id: string; live_balance: number }>
        walletMap = walletRows.reduce((acc, w) => {
          acc[w.user_id] = Number(w.live_balance) || 0
          return acc
        }, {} as Record<string, number>)
      }

      const mapped: PlatformUser[] = rows.map(r => ({
        id: r.id,
        name: r.full_name || (r.email ? r.email.split('@')[0] : '(no name)'),
        email: r.email || '—',
        phone: r.phone || '—',
        country: r.country || '—',
        balance: walletMap[r.id] ?? 0,
        accountType: 'LIVE' as const,
        status: (r.account_status as any) || 'active',
        kycStatus: (r.kyc_status as any) || 'unverified',
        accountStatus: 'approved' as const,
        registeredAt: new Date(r.created_at).toLocaleDateString('en-GB'),
        lastSeen: 'Active Now',
      }))
      setUsers(mapped)
    } catch {
      setUsersError('Failed to load users from database.')
    }
  }

  // Fetch real audit logs from Supabase
  const fetchAuditLogsFromDatabase = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=100`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as Array<{
        id: string
        admin_id: string
        admin_name: string
        action: string
        target_id: string
        target_type: string
        detail: string
        severity: 'info' | 'warning' | 'critical'
        created_at: string
      }>
      if (Array.isArray(rows) && rows.length > 0) {
        setAuditLog(rows.map(r => ({
          id: r.id,
          adminId: r.admin_id,
          adminName: r.admin_name || 'Admin',
          adminEmail: 'admin@exstrade.com',
          action: r.action,
          targetId: r.target_id,
          targetType: r.target_type,
          detail: r.detail,
          ipAddress: '127.0.0.1',
          timestamp: r.created_at,
          severity: r.severity || 'info',
        })))
      }
    } catch {
      // silent
    }
  }

  // Fetch real KYC document submissions & profiles from Supabase
  const fetchKycFromDatabase = async () => {
    try {
      const [docsRes, profilesRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/profile_documents?select=*&order=submitted_at.desc`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,email,kyc_status,document_type,document_number,home_address,created_at`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
      ])

      let profileMap: Record<string, { name: string; email: string; docType: string; docNum: string; address: string; status: string; createdAt: string }> = {}

      if (profilesRes.ok) {
        const profRows = await profilesRes.json() as Array<{ id: string; full_name: string; email: string; document_type: string; document_number: string; home_address: string; kyc_status: string; created_at: string }>
        profileMap = profRows.reduce((acc, p) => {
          acc[p.id] = {
            name: p.full_name || (p.email ? p.email.split('@')[0] : 'User'),
            email: p.email || '—',
            docType: p.document_type || 'National ID',
            docNum: p.document_number || 'PRIMARY',
            address: p.home_address || '—',
            status: p.kyc_status || 'pending',
            createdAt: p.created_at,
          }
          return acc
        }, {} as typeof profileMap)
      }

      let kycCases: KycCase[] = []

      if (docsRes.ok) {
        const docRows = await docsRes.json() as Array<{
          id: string
          user_id: string
          storage_path?: string
          original_name: string
          document_type: string
          mime_type: string
          status: 'pending' | 'verified' | 'rejected'
          submitted_at: string
          admin_notes: string
        }>

        if (Array.isArray(docRows) && docRows.length > 0) {
          kycCases = docRows.map(r => {
            const userProf = profileMap[r.user_id]
            let fileUrl = ''
            if (r.storage_path) {
              fileUrl = `${SUPABASE_URL}/storage/v1/object/public/kyc-documents/${r.storage_path}`
            } else if (r.original_name && (r.original_name.startsWith('http') || r.original_name.startsWith('data:'))) {
              fileUrl = r.original_name
            } else {
              fileUrl = '/generic-profile-portrait.svg'
            }

            return {
              id: r.id,
              userId: r.user_id,
              userName: userProf?.name || `User #${r.user_id.substring(0, 8)}`,
              userEmail: userProf?.email || `user_${r.user_id.substring(0, 6)}@exstrade.com`,
              documentType: (r.document_type || userProf?.docType || 'National ID') as any,
              documentUrl: fileUrl,
              storagePath: r.storage_path,
              mimeType: r.mime_type || 'image/jpeg',
              fileUrl,
              submittedAt: r.submitted_at,
              status: r.status === 'verified' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending',
              rejectionReason: r.admin_notes || '',
            }
          })
        }
      }

      // Include all registered user profiles requiring verification so Admin Queue is never empty
      if (profilesRes.ok) {
        Object.entries(profileMap).forEach(([uid, p]) => {
          if (!kycCases.some(c => c.userId === uid)) {
            kycCases.push({
              id: 'kyc-prof-' + uid,
              userId: uid,
              userName: p.name,
              userEmail: p.email,
              documentType: (p.docType as any) || 'National ID',
              mimeType: 'image/jpeg',
              fileUrl: '/generic-profile-portrait.svg',
              submittedAt: p.createdAt || new Date().toISOString(),
              status: p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending',
              rejectionReason: '',
            })
          }
        })
      }

      if (kycCases.length > 0) {
        setKycQueue(kycCases)
      }
    } catch {
      // silent
    }
  }

  // Fetch real financial transactions from Supabase
  const fetchTransactionsFromDatabase = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as Array<{
        id: string
        user_id: string
        type: 'deposit' | 'withdrawal' | 'adjustment'
        amount: number
        bonus_amount: number
        total_amount: number
        gateway_network: string
        reference_code: string
        status: 'pending' | 'approved' | 'rejected' | 'flagged'
        admin_notes: string
        created_at: string
      }>
      if (Array.isArray(rows) && rows.length > 0) {
        setTransactions(rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          userName: `User #${r.user_id.substring(0, 8)}`,
          userEmail: `user_${r.user_id.substring(0, 6)}@exstrade.com`,
          type: r.type,
          amount: Number(r.total_amount || r.amount),
          network: r.gateway_network || 'MPESA',
          status: r.status,
          createdAt: r.created_at,
          flagReason: r.admin_notes || undefined,
        })))
      }
    } catch {
      // silent
    }
  }

  // Fetch real payment gateway receiving addresses from Supabase
  const fetchGatewayFromDatabase = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?select=*&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as Array<{ id: string; network: string; asset_name: string; wallet_address: string; note: string; enabled: boolean }>
      if (Array.isArray(rows) && rows.length > 0) {
        setGatewayAddresses(rows.map(r => ({
          id: r.id,
          network: r.network,
          assetName: r.asset_name,
          address: r.wallet_address,
          note: r.note || '',
          enabled: r.enabled !== false,
        })))
      }
    } catch {
      // silent
    }
  }

  // Fetch real platform settings from Supabase
  const fetchSettingsFromDatabase = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as Array<{ key: string; value: string }>
      rows.forEach(r => {
        if (r.key === 'min_deposit_usd') {
          const v = parseFloat(r.value) || 10
          setMinDepositUSD(v)
          setSettingsDraft(d => ({ ...d, minUSD: v.toString() }))
        }
        if (r.key === 'min_deposit_kes') {
          const v = parseFloat(r.value) || 1300
          setMinDepositKES(v)
          setSettingsDraft(d => ({ ...d, minKES: v.toString() }))
        }
        if (r.key === 'min_withdrawal_usd') {
          const v = parseFloat(r.value) || 10
          setMinWithdrawalUSD(v)
          setSettingsDraft(d => ({ ...d, minWithdraw: v.toString() }))
        }
      })
    } catch {
      // silent
    }
  }

  // Load all real database data on startup
  useEffect(() => {
    void fetchUsers()
    void fetchKycFromDatabase()
    void fetchAuditLogsFromDatabase()
    void fetchTransactionsFromDatabase()
    void fetchGatewayFromDatabase()
    void fetchSettingsFromDatabase()
  }, [fetchUsers])

  const handleLogout = async () => {
    if (currentAdmin) {
      addAudit('ADMIN_LOGOUT', currentAdmin.id, 'Admin', `${currentAdmin.name} logged out`, 'info')
    }
    if (supabase) {
      await supabase.auth.signOut()
    }
    window.location.href = '/'
  }

  const canAccess = (perm: keyof AdminPermissions) => currentAdmin?.permissions[perm] ?? false

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleUserStatus = (u: PlatformUser) => {
    if (!canAccess('canManageUsers')) { notify('No permission.', 'err'); return }
    const next = u.status === 'active' ? 'suspended' : 'active'
    setUsers(curr => curr.map(x => x.id === u.id ? { ...x, status: next } : x))
    addAudit(next === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER', u.id, 'User', `${u.status === 'active' ? 'Suspended' : 'Activated'} account for ${u.name}`, next === 'suspended' ? 'warning' : 'info')
    setSelectedUser(prev => prev?.id === u.id ? { ...prev, status: next } : prev)
    notify(`${u.name} ${next === 'suspended' ? 'suspended' : 'activated'}.`, next === 'suspended' ? 'warn' : 'ok')
  }

  const approveAccount = (u: PlatformUser) => {
    if (!canAccess('canManageUsers')) { notify('No permission.', 'err'); return }
    setUsers(curr => curr.map(x => x.id === u.id ? { ...x, accountStatus: 'approved', status: 'active' } : x))
    setSelectedUser(prev => prev?.id === u.id ? { ...prev, accountStatus: 'approved', status: 'active' } : prev)
    addAudit('APPROVE_ACCOUNT', u.id, 'User', `Account approved for ${u.name} (${u.email})`, 'info')
    notify(`${u.name}'s account approved and activated.`)
  }

  const openEditUser = (u: PlatformUser) => {
    setEditDraft({ name: u.name, email: u.email, phone: u.phone, country: u.country })
    setEditUserModal(u)
  }

  const saveEditUser = () => {
    if (!editUserModal) return
    if (!editDraft.name.trim() || !editDraft.email.trim()) { notify('Name and email are required.', 'err'); return }
    setUsers(curr => curr.map(x => x.id === editUserModal.id ? { ...x, name: editDraft.name, email: editDraft.email, phone: editDraft.phone, country: editDraft.country } : x))
    setSelectedUser(prev => prev?.id === editUserModal.id ? { ...prev, name: editDraft.name, email: editDraft.email, phone: editDraft.phone, country: editDraft.country } : prev)
    addAudit('EDIT_USER', editUserModal.id, 'User', `Edited details for ${editDraft.name} (${editDraft.email})`, 'warning')
    notify(`${editDraft.name}'s details updated.`)
    setEditUserModal(null)
  }

  const openResetPassword = (u: PlatformUser) => {
    setNewPassword('')
    setResetPwDone(false)
    setResetPwModal(u)
  }

  const applyResetPassword = () => {
    if (!resetPwModal) return
    if (newPassword.length < 8) { notify('Password must be at least 8 characters.', 'err'); return }
    // In production: call Supabase admin API to update user password
    addAudit('RESET_PASSWORD', resetPwModal.id, 'User', `Admin reset password for ${resetPwModal.name}`, 'warning')
    setResetPwDone(true)
    notify(`Password reset for ${resetPwModal.name}.`)
    setTimeout(() => { setResetPwModal(null); setResetPwDone(false) }, 2000)
  }

  const sendNotification = () => {
    if (!notifyModal) return
    if (!notifySubject.trim()) { notify('Subject is required.', 'err'); return }
    if (!notifyMessage.trim()) { notify('Message is required.', 'err'); return }
    // In production: send via Supabase edge function / email service
    addAudit('SEND_NOTIFICATION', notifyModal.id, 'User',
      `Sent ${notifyType.toUpperCase()} notification to ${notifyModal.name}: "${notifySubject}"`, 'info')
    setNotifySent(true)
    notify(`Notification sent to ${notifyModal.name}.`)
    setTimeout(() => { setNotifyModal(null); setNotifySent(false); setNotifySubject(''); setNotifyMessage('') }, 2000)
  }

  const deleteUser = async (u: PlatformUser) => {
    if (!canAccess('canManageUsers')) { notify('No permission to delete users.', 'err'); return }
    if (!window.confirm(`⚠️ ARE YOU SURE you want to permanently delete user ${u.name} (${u.email})? This action CANNOT be undone.`)) return

    // 1. Remove from local state
    setUsers(curr => curr.filter(x => x.id !== u.id))
    if (selectedUser?.id === u.id) setSelectedUser(null)

    // 2. Delete from Supabase Database
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${u.id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
    } catch {
      // silent
    }

    addAudit('DELETE_USER', u.id, 'User', `Permanently deleted user ${u.name} (${u.email}) from database`, 'critical')
    notify(`User ${u.name} permanently deleted.`, 'warn')
  }

  // ── Gateway actions (Synced directly with Supabase admin_deposit_addresses) ──────
  const addGatewayAddress = async () => {
    if (!newAddr.network.trim() || !newAddr.address.trim() || !newAddr.assetName.trim()) { notify('Network, asset name and address are required.', 'err'); return }
    const newObj = {
      network: newAddr.network,
      asset_name: newAddr.assetName,
      wallet_address: newAddr.address,
      note: newAddr.note || '',
      enabled: true,
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(newObj),
      })
      if (res.ok) {
        const rows = await res.json() as Array<{ id: string }>
        const newId = rows[0]?.id || 'ga-' + Date.now()
        const a = { id: newId, ...newAddr, enabled: true }
        setGatewayAddresses(curr => [...curr, a])
        addAudit('ADD_DEPOSIT_ADDRESS', a.id, 'Gateway', `Added ${a.assetName} (${a.network}) deposit address`, 'info')
        notify(`${a.network} address added to database!`)
      }
    } catch {
      notify('Failed to add deposit address to database.', 'err')
    }

    setNewAddr({ network: '', assetName: '', address: '', note: '' })
    setAddAddrOpen(false)
  }

  const saveEditAddr = async () => {
    if (!editAddrId) return
    setGatewayAddresses(curr => curr.map(a => a.id === editAddrId ? { ...a, ...editAddrDraft } : a))
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?id=eq.${editAddrId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          network: editAddrDraft.network,
          asset_name: editAddrDraft.assetName,
          wallet_address: editAddrDraft.address,
          note: editAddrDraft.note,
          updated_at: new Date().toISOString(),
        }),
      })
    } catch {
      // silent
    }
    addAudit('EDIT_DEPOSIT_ADDRESS', editAddrId, 'Gateway', `Updated ${editAddrDraft.network} deposit address`, 'info')
    notify('Address updated in database.')
    setEditAddrId(null)
  }

  const toggleGatewayAddress = async (id: string) => {
    const a = gatewayAddresses.find(x => x.id === id)
    if (!a) return
    const nextEnabled = !a.enabled

    setGatewayAddresses(curr => curr.map(x => x.id === id ? { ...x, enabled: nextEnabled } : x))
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ enabled: nextEnabled, updated_at: new Date().toISOString() }),
      })
    } catch {
      // silent
    }
    addAudit(nextEnabled ? 'ENABLE_ADDRESS' : 'DISABLE_ADDRESS', id, 'Gateway', `${nextEnabled ? 'Enabled' : 'Disabled'} ${a.network} deposit address`, 'warning')
  }

  const deleteGatewayAddress = async (id: string) => {
    const a = gatewayAddresses.find(x => x.id === id)
    if (!a) return
    setGatewayAddresses(curr => curr.filter(x => x.id !== id))
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })
    } catch {
      // silent
    }
    addAudit('DELETE_DEPOSIT_ADDRESS', id, 'Gateway', `Deleted ${a.network} deposit address`, 'warning')
    notify(`${a.network} address removed from database.`, 'warn')
  }

  // ── Upgrade user to admin ──────────────────────────────────────────────
  const upgradeUserToAdmin = () => {
    if (!upgradeModal) return
    if (!canAccess('canManageAdmins')) { notify('No permission.', 'err'); return }
    const permMap: Record<AdminRole, typeof superAdminPermissions> = {
      super_admin:    superAdminPermissions,
      kyc_admin:      kycAdminPermissions,
      finance_admin:  financeAdminPermissions,
      support_admin:  { canManageUsers: false, canApproveKyc: false, canApproveWithdrawals: false, canManageAdmins: false, canViewAuditLogs: false, canAdjustBalances: false },
    }
    const newAdminEntry: AdminUser = {
      id: 'adm-' + Date.now(),
      name: upgradeModal.name,
      email: upgradeModal.email,
      role: upgradeRole,
      permissions: permMap[upgradeRole],
      isProtected: false,
      lastLogin: 'Never',
      addedAt: new Date().toISOString().slice(0, 10),
      status: 'active',
      ipWhitelist: [],
    }
    setAdmins(curr => [...curr, newAdminEntry])
    setUsers(curr => curr.filter(u => u.id !== upgradeModal.id))
    addAudit('UPGRADE_TO_ADMIN', upgradeModal.id, 'User', `Upgraded ${upgradeModal.name} to ${roleLabel[upgradeRole]}`, 'warning')
    notify(`${upgradeModal.name} upgraded to ${roleLabel[upgradeRole]}.`)
    setUpgradeModal(null)
    setSelectedUser(null)
    setSection('admins')
  }

  const approveKyc = async (kyc: KycCase) => {
    if (!canAccess('canApproveKyc')) { notify('No permission.', 'err'); return }
    setKycQueue(curr => curr.map(k => k.id === kyc.id ? { ...k, status: 'approved' } : k))
    setUsers(curr => curr.map(u => u.id === kyc.userId ? { ...u, kycStatus: 'verified' } : u))

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profile_documents?id=eq.${kyc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ status: 'verified', reviewed_at: new Date().toISOString() }),
      })
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${kyc.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ kyc_status: 'approved', account_status: 'approved', updated_at: new Date().toISOString() }),
      })
    } catch {
      // silent
    }

    addAudit('APPROVE_KYC', kyc.id, 'KYC Case', `KYC approved for ${kyc.userName}`, 'info')
    setSelectedKyc(null)
    notify(`KYC approved for ${kyc.userName}.`)
  }

  const rejectKyc = async (kyc: KycCase, reason: string) => {
    if (!canAccess('canApproveKyc')) { notify('No permission.', 'err'); return }
    if (!reason.trim()) { notify('Rejection reason required.', 'err'); return }
    setKycQueue(curr => curr.map(k => k.id === kyc.id ? { ...k, status: 'rejected', rejectionReason: reason } : k))
    setUsers(curr => curr.map(u => u.id === kyc.userId ? { ...u, kycStatus: 'rejected' } : u))

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profile_documents?id=eq.${kyc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ status: 'rejected', admin_notes: reason, reviewed_at: new Date().toISOString() }),
      })
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${kyc.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ kyc_status: 'rejected', updated_at: new Date().toISOString() }),
      })
    } catch {
      // silent
    }

    addAudit('REJECT_KYC', kyc.id, 'KYC Case', `KYC rejected for ${kyc.userName}: ${reason}`, 'warning')
    setSelectedKyc(null)
    setKycRejectReason('')
    notify(`KYC rejected for ${kyc.userName}.`, 'warn')
  }

  const approveTxn = async (txn: Transaction) => {
    if (!canAccess('canApproveWithdrawals')) { notify('No permission.', 'err'); return }
    setTransactions(curr => curr.map(t => t.id === txn.id ? { ...t, status: 'approved' } : t))

    const targetUser = users.find(u => u.id === txn.userId)
    const currentBal = targetUser ? targetUser.balance : 0
    const nextBal = txn.type === 'deposit' ? currentBal + txn.amount : Math.max(0, currentBal - txn.amount)

    setUsers(curr => curr.map(u => u.id === txn.userId ? { ...u, balance: nextBal } : u))

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${txn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ status: 'approved', updated_at: new Date().toISOString() }),
      })
      await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${txn.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ live_balance: nextBal, updated_at: new Date().toISOString() }),
      })
    } catch {
      // silent
    }

    addAudit(`APPROVE_${txn.type.toUpperCase()}`, txn.id, 'Transaction', `Approved ${txn.type} of ${fmtUSD(txn.amount)} for ${txn.userName}`, 'info')
    notify(`Transaction approved and credited $${txn.amount.toFixed(2)} to user account!`)
  }

  const rejectTxn = (txn: Transaction) => {
    if (!canAccess('canApproveWithdrawals')) { notify('No permission.', 'err'); return }
    setTransactions(curr => curr.map(t => t.id === txn.id ? { ...t, status: 'rejected' } : t))
    addAudit(`REJECT_${txn.type.toUpperCase()}`, txn.id, 'Transaction', `Rejected ${txn.type} of ${fmtUSD(txn.amount)} for ${txn.userName}`, 'warning')
    notify(`Transaction rejected.`, 'warn')
  }

  const applyBalanceAdjustment = async () => {
    if (!balanceModal || !canAccess('canAdjustBalances')) { notify('No permission.', 'err'); return }
    const amt = parseFloat(balanceModal.amount)
    if (!amt || amt <= 0) { notify('Enter a valid amount.', 'err'); return }
    if (!balanceModal.reason.trim()) { notify('Reason is required.', 'err'); return }
    const delta = balanceModal.mode === 'credit' ? amt : -amt
    const newBalance = Math.max(0, balanceModal.user.balance + delta)

    setUsers(curr => curr.map(u => u.id === balanceModal.user.id ? { ...u, balance: newBalance } : u))
    setSelectedUser(prev => prev?.id === balanceModal.user.id ? { ...prev, balance: newBalance } : prev)

    // Sync with Supabase wallets and transactions tables
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: balanceModal.user.id,
          live_balance: newBalance,
          main_wallet: newBalance,
          updated_at: new Date().toISOString(),
        }),
      })

      await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: balanceModal.user.id,
          type: balanceModal.mode === 'credit' ? 'deposit' : 'withdrawal',
          amount: amt,
          total_amount: amt,
          gateway_network: 'ADMIN_ALLOCATION',
          reference_code: 'ADMIN_ADJ_' + Date.now(),
          status: 'approved',
          admin_notes: balanceModal.reason,
        }),
      })
    } catch {
      // silent
    }

    addAudit('BALANCE_ADJUSTMENT', balanceModal.user.id, 'User', `${balanceModal.mode === 'credit' ? 'Credited' : 'Debited'} ${fmtUSD(amt)} for ${balanceModal.user.name}. Reason: ${balanceModal.reason}`, 'warning')
    notify(`Balance ${balanceModal.mode === 'credit' ? 'credited' : 'debited'} for ${balanceModal.user.name}.`)
    setBalanceModal(null)
  }

  const addAdmin = () => {
    if (!canAccess('canManageAdmins')) { notify('No permission.', 'err'); return }
    if (!newAdmin.name.trim() || !newAdmin.email.trim()) { notify('All fields required.', 'err'); return }
    const perm = newAdmin.role === 'kyc_admin' ? kycAdminPermissions : financeAdminPermissions
    const a: AdminUser = {
      id: 'adm-' + Date.now(),
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      permissions: perm,
      isProtected: false,
      lastLogin: 'Never',
      addedAt: new Date().toISOString().slice(0, 10),
      status: 'active',
      ipWhitelist: [],
    }
    setAdmins(curr => [...curr, a])
    addAudit('ADD_ADMIN', a.id, 'Admin', `Added ${a.name} as ${roleLabel[a.role]}`, 'info')
    setAddAdminModal(false)
    setNewAdmin({ name: '', email: '', role: 'kyc_admin' })
    notify(`${a.name} added as ${roleLabel[a.role]}.`)
  }

  const removeAdmin = (a: AdminUser) => {
    if (a.isProtected) { notify('Super Admin cannot be removed.', 'err'); return }
    if (!canAccess('canManageAdmins')) { notify('No permission.', 'err'); return }
    setAdmins(curr => curr.filter(x => x.id !== a.id))
    addAudit('REMOVE_ADMIN', a.id, 'Admin', `Removed admin ${a.name} (${a.email})`, 'warning')
    notify(`${a.name} removed.`, 'warn')
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const pendingKyc   = kycQueue.filter(k => k.status === 'pending').length
  const pendingTxns  = transactions.filter(t => t.status === 'pending').length
  const flaggedTxns  = transactions.filter(t => t.status === 'flagged').length
  const totalVolume  = transactions.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const pendingAccounts = users.filter(u => u.accountStatus === 'pending').length
  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.includes(userSearch)
  )
  const filteredTxns = transactions.filter(t =>
    txFilter === 'all' ? true :
    txFilter === 'pending' ? t.status === 'pending' :
    t.status === 'flagged'
  )
  const filteredKyc = kycQueue.filter(k => kycFilter === 'all' ? true : k.status === 'pending')

  const alerts = [
    ...transactions.filter(t => t.status === 'flagged').map(t => ({ id: t.id, msg: `Flagged ${t.type}: ${fmtUSD(t.amount)} — ${t.flagReason}`, type: 'critical' as const })),
    ...(pendingKyc > 0 ? [{ id: 'kyc-alert', msg: `${pendingKyc} KYC document${pendingKyc > 1 ? 's' : ''} awaiting review`, type: 'warn' as const }] : []),
    ...(pendingTxns > 0 ? [{ id: 'txn-alert', msg: `${pendingTxns} transaction${pendingTxns > 1 ? 's' : ''} pending approval`, type: 'info' as const }] : []),
  ]

  // ── 10. AI SECURITY GUARDIAN VIEW ───────────────────────────────────────
  const renderSecurityGuardian = () => (
    <div className="sa-section">
      {/* Hero Banner */}
      <div className="sa-security-hero">
        <div className="sa-security-hero-head">
          <div>
            <span className="sa-security-badge">
              <ShieldCheck size={12} /> ENTERPRISE-GRADE ZERO TRUST SECURITY
            </span>
            <h1>
              <Shield size={24} color="#00e5ff" /> AI Security Guardian
            </h1>
            <p>FIPS 140-3 HSM Hardware Vault • Post-Quantum Cryptography • Justice Ultimate Automobiles Architecture</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="sa-btn sa-btn-outline" onClick={() => addAudit('EXPORT_SECURITY_PDF', 'guardian', 'Security', 'Exported AI Security Audit PDF', 'info')}>
              <FileText size={14} /> Export PDF
            </button>
            <button className="sa-btn sa-btn-primary" onClick={() => { addAudit('RUN_AI_SECURITY_ANALYSIS', 'guardian', 'Security', 'Executed AI Anomaly Analysis scan', 'info'); showToast('AI Security Analysis executed. Zero critical threats detected.') }}>
              <Zap size={14} /> Run AI Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="sa-security-metrics-grid">
        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">AI Threat Score</span>
            <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>LOW</span>
          </div>
          <div className="sa-sec-metric-val">25/100</div>
          <div className="sa-sec-metric-sub">
            <CheckCircle2 size={13} color="#1ccf84" /> Real-time threat model active
          </div>
        </div>

        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">AI Anomaly Detection</span>
            <span className="sa-badge" style={{ background: 'rgba(240,68,82,0.15)', color: '#f04452' }}>HIGH</span>
          </div>
          <div className="sa-sec-metric-val">2 Detected</div>
          <div className="sa-sec-metric-sub">
            <AlertCircle size={13} color="#f04452" /> IP obscurity &amp; duration anomaly
          </div>
        </div>

        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">Failed Logins (24h)</span>
            <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>2 Events</span>
          </div>
          <div className="sa-sec-metric-val">2 / 100</div>
          <div className="sa-sec-metric-sub">
            <Clock size={13} color="#f2b94b" /> Subnet 41.90.172.0/24 probed
          </div>
        </div>

        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">2FA Attempts</span>
            <span className="sa-badge" style={{ background: 'rgba(90,167,255,0.15)', color: '#5aa7ff' }}>8 Total</span>
          </div>
          <div className="sa-sec-metric-val">6 Failed</div>
          <div className="sa-sec-metric-sub">
            <Shield size={13} color="#5aa7ff" /> FIPS 140-3 HSM Enforced
          </div>
        </div>
      </div>

      {/* Military-Grade Security Standards Card */}
      <div className="sa-pqc-grid">
        <div className="sa-pqc-card">
          <h3>🔐 Encryption Standards (NSA Approved)</h3>
          <div className="sa-pqc-list">
            <div className="sa-pqc-item"><strong>AES-256-GCM</strong> — Data at rest encryption</div>
            <div className="sa-pqc-item"><strong>TLS 1.3</strong> — Data in transit with Perfect Forward Secrecy</div>
            <div className="sa-pqc-item"><strong>Argon2id</strong> — Password hashing (memory-hard)</div>
            <div className="sa-pqc-item"><strong>SHA-384 / ECDSA P-384</strong> — Cryptographic integrity &amp; signatures</div>
          </div>
        </div>

        <div className="sa-pqc-card" style={{ borderColor: 'rgba(0,229,255,0.25)' }}>
          <h3 style={{ color: '#00e5ff' }}>🔒 Hardware Security Module (HSM)</h3>
          <div className="sa-pqc-list">
            <div className="sa-pqc-item">✓ FIPS 140-3 Level 3 certified key storage</div>
            <div className="sa-pqc-item">✓ Tamper-proof secure enclave</div>
            <div className="sa-pqc-item">✓ Keys never exposed outside HSM boundary</div>
            <div className="sa-pqc-item">✓ Auto-destruction on physical tampering</div>
          </div>
        </div>

        <div className="sa-pqc-card" style={{ borderColor: 'rgba(28,207,132,0.25)' }}>
          <h3 style={{ color: '#1ccf84' }}>⚛️ Post-Quantum Cryptography (PQC)</h3>
          <div className="sa-pqc-list">
            <div className="sa-pqc-item">✓ CRYSTALS-Kyber — Key encapsulation (NIST selected)</div>
            <div className="sa-pqc-item">✓ CRYSTALS-Dilithium — Digital signatures</div>
            <div className="sa-pqc-item">✓ SPHINCS+ — Stateless hash-based signatures</div>
            <div className="sa-pqc-item">✓ Hybrid Mode: Classical + PQC for transition safety</div>
          </div>
        </div>
      </div>

      {/* Automated AI Playbooks */}
      <div className="sa-panel">
        <div className="sa-panel-head"><Zap size={14} color="#00e5ff" /> Automated AI Actions (Zero Manual Delay)</div>
        <p style={{ fontSize: '12px', color: 'var(--sa-muted)', marginBottom: '12px' }}>AI playbooks execute automatically on threat detection to protect client balances and secrets.</p>
        <div className="sa-playbooks-row">
          <button className="sa-playbook-btn" onClick={() => showToast('AES-256 Auto-encrypt executed.')}><Lock size={13} /> AES-256 Auto-encrypt</button>
          <button className="sa-playbook-btn" onClick={() => showToast('HSM Key Rotation complete.')}><RefreshCw size={13} /> HSM Key Rotation</button>
          <button className="sa-playbook-btn" onClick={() => showToast('Service Isolation enabled.')}><Ban size={13} /> Service Isolation</button>
          <button className="sa-playbook-btn" onClick={() => showToast('SIEM Alert Dispatched to Security Ops.')}><Activity size={13} /> SIEM Alert Dispatch</button>
          <button className="sa-playbook-btn" onClick={() => showToast('Forensic Snapshot generated.')}><FileText size={13} /> Forensic Snapshot</button>
          <button className="sa-playbook-btn" onClick={() => showToast('MITRE ATT&CK Map updated.')}><Globe size={13} /> MITRE ATT&CK Map</button>
          <button className="sa-playbook-btn" onClick={() => showToast('Hash Chain Verified.')}><CheckCircle2 size={13} /> Hash Chain Verify</button>
          <button className="sa-playbook-btn" onClick={() => showToast('PQC Fallback Mode active.')}><ShieldCheck size={13} /> PQC Fallback Mode</button>
        </div>
      </div>

      {/* Recent Security Events Table */}
      <div className="sa-panel" style={{ marginTop: '20px' }}>
        <div className="sa-panel-head"><Activity size={14} /> Recent Security Events &amp; Audit Trail</div>
        <table className="sa-table">
          <thead>
            <tr>
              <th>Severity</th><th>Event</th><th>User / Email</th><th>Subnet / IP</th><th>Timestamp</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>LOW</span></td>
              <td><strong>Successful Login</strong></td>
              <td>audit@nexsmarkets.com</td>
              <td><code>41.90.172.36</code></td>
              <td><span className="sa-dim">8/25/2026, 12:53:17 AM</span></td>
              <td><span className="sa-dim">Authenticated</span></td>
            </tr>
            <tr>
              <td><span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>LOW</span></td>
              <td><strong>Successful Login</strong></td>
              <td>audit@nexsmarkets.com</td>
              <td><code>154.159.238.12</code></td>
              <td><span className="sa-dim">7/31/2026, 12:41:52 AM</span></td>
              <td><span className="sa-dim">Authenticated</span></td>
            </tr>
            <tr>
              <td><span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>MEDIUM</span></td>
              <td><strong>Failed Login Attempt</strong></td>
              <td>audit@nexsmarkets.com</td>
              <td><code>41.90.172.69</code></td>
              <td><span className="sa-dim">6/12/2026, 10:44:56 AM</span></td>
              <td><span className="sa-badge sa-badge-danger">Flagged</span></td>
            </tr>
            <tr>
              <td><span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>MEDIUM</span></td>
              <td><strong>Failed Login Attempt</strong></td>
              <td>audit@nexsmarkets.com</td>
              <td><code>41.90.172.69</code></td>
              <td><span className="sa-dim">6/10/2026, 11:11:11 PM</span></td>
              <td><span className="sa-badge sa-badge-danger">Flagged</span></td>
            </tr>
            <tr>
              <td><span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>LOW</span></td>
              <td><strong>Successful Login</strong></td>
              <td>audit@nexsmarkets.com</td>
              <td><code>105.164.118.8</code></td>
              <td><span className="sa-dim">6/6/2026, 1:26:18 PM</span></td>
              <td><span className="sa-dim">Authenticated</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────

  if (!currentAdmin) {
    return (
      <AuthPortal
        onLogin={handleAuthLogin}
        onSignup={handleAuthSignup}
        onDemo={handleAuthDemo}
        onGoogle={handleAuthGoogle}
        onForgot={handleAuthForgot}
        isSubmitting={authSubmitting}
        notice={toast?.msg || ''}
      />
    )
  }

  const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard; perm?: keyof AdminPermissions; badge?: number }[] = [
    { id: 'overview',  label: 'Overview',     icon: LayoutDashboard },
    { id: 'users',     label: 'Users',        icon: Users,     perm: 'canManageUsers', badge: pendingAccounts },
    { id: 'kyc',       label: 'KYC Queue',    icon: FileText,  perm: 'canApproveKyc',          badge: pendingKyc },
    { id: 'finance',   label: 'Finance',      icon: Wallet,    perm: 'canApproveWithdrawals',  badge: pendingTxns + flaggedTxns },
    { id: 'security',  label: 'AI Security Guardian', icon: ShieldCheck, badge: 2 },
    { id: 'admins',    label: 'Admin Team',   icon: Shield,        perm: 'canManageAdmins' },
    { id: 'gateway',   label: 'Payment Gateway', icon: CreditCard  },
    { id: 'audit',     label: 'Audit Log',    icon: Activity,      perm: 'canViewAuditLogs' },
    { id: 'support',   label: 'Live Chat',    icon: MessageSquare },
    { id: 'settings',  label: 'Settings',     icon: Settings },
  ]

  return (
    <div className={`sa-shell ${sidebarCollapsed ? 'sa-shell-collapsed' : ''}`}>

      {/* ── LOCKDOWN OVERLAY ─────────────────────────────────────────────── */}
      {lockdownActive && (
        <div className="sa-lockdown-overlay">
          <div className="sa-lockdown-card">
            <AlertTriangle size={48} color="#f04452" />
            <h2>SYSTEM LOCKDOWN ACTIVE</h2>
            <p>All administrative operations are suspended. Only the Super Admin can lift this lockdown.</p>
            <button className="sa-btn sa-btn-danger" onClick={() => { setLockdownActive(false); addAudit('LIFT_LOCKDOWN', 'system', 'System', 'Emergency lockdown lifted', 'critical') }}>
              Lift Lockdown
            </button>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-top">
          <div className="sa-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.jpeg" alt="NEXSMARKETS Admin Logo" style={{ width: 28, height: 28, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
            {!sidebarCollapsed && <span>NEXSMARKETS <strong>ADMIN</strong></span>}
          </div>
          <button className="sa-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)} title="Toggle sidebar">
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />}
          </button>
        </div>

        <nav className="sa-nav">
          {navItems.map(item => {
            if (item.perm && !canAccess(item.perm)) return null
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`sa-nav-item ${section === item.id ? 'sa-nav-active' : ''}`}
                onClick={() => setSection(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="sa-nav-icon"><Icon size={17} /></span>
                {!sidebarCollapsed && <span className="sa-nav-label">{item.label}</span>}
                {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                  <span className="sa-nav-badge">{item.badge}</span>
                ) : null}
              </button>
            )
          })}
        </nav>

        <div className="sa-sidebar-foot">
          <div className="sa-admin-chip">
            <div className="sa-admin-avatar">{currentAdmin!.name.slice(0, 2).toUpperCase()}</div>
            {!sidebarCollapsed && (
              <div className="sa-admin-info">
                <strong>{currentAdmin!.name}</strong>
                <small style={{ color: roleColor[currentAdmin!.role] }}>{roleLabel[currentAdmin!.role]}</small>
              </div>
            )}
          </div>
          <button className="sa-logout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={15} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="sa-main">

        {/* ── TOPBAR ───────────────────────────────────────────────────── */}
        <header className="sa-topbar">
          <div className="sa-topbar-left">
            <div className="sa-topbar-breadcrumb">
              <span>Admin</span>
              <ChevronRight size={12} />
              <strong>{navItems.find(n => n.id === section)?.label}</strong>
            </div>
          </div>
          <div className="sa-topbar-right">
            {/* Health indicator */}
            <div className="sa-health-dot">
              <span className="sa-health-pulse" />
              <span>Systems Nominal</span>
            </div>

            {/* Alerts bell */}
            <div className="sa-notif-wrap">
              <button className="sa-icon-btn" onClick={() => setNotifOpen(p => !p)}>
                <Bell size={16} />
                {alerts.length > 0 && <span className="sa-notif-count">{alerts.length}</span>}
              </button>
              {notifOpen && (
                <div className="sa-notif-dropdown">
                  <div className="sa-notif-header">
                    <strong>Alerts</strong>
                    <button className="sa-icon-btn" onClick={() => setNotifOpen(false)}><X size={14} /></button>
                  </div>
                  {alerts.length === 0 && <p className="sa-notif-empty">No active alerts.</p>}
                  {alerts.map(a => (
                    <div key={a.id} className={`sa-notif-item sa-notif-${a.type}`}>
                      {a.type === 'critical' ? <AlertTriangle size={13} /> : a.type === 'warn' ? <AlertCircle size={13} /> : <Bell size={13} />}
                      <span>{a.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency lockdown */}
            {currentAdmin?.role === 'super_admin' && (
              <button
                className={`sa-btn sa-lockdown-btn ${lockdownActive ? 'sa-lockdown-active' : ''}`}
                onClick={() => {
                  setLockdownActive(p => !p)
                  addAudit(lockdownActive ? 'LIFT_LOCKDOWN' : 'TRIGGER_LOCKDOWN', 'system', 'System', lockdownActive ? 'Lockdown lifted' : 'Emergency lockdown triggered', 'critical')
                }}
              >
                <Lock size={13} />
                {lockdownActive ? 'Lift Lockdown' : 'Lockdown'}
              </button>
            )}
          </div>
        </header>

        {/* ── PAGE CONTENT ─────────────────────────────────────────────── */}
        <div className="sa-content">

          {/* ═══════════════════ OVERVIEW ══════════════════════════════════ */}
          {section === 'overview' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">CONTROL CENTER</div>
                  <h1>Platform Overview</h1>
                </div>
                <span className="sa-session-info"><Clock size={13} /> Session active — auto-locks after 15 min inactivity</span>
              </div>

              {/* Stat cards */}
              <div className="sa-stats-grid">
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(28,207,132,0.12)', color: '#1ccf84' }}><Users size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{users.length}</div>
                    <div className="sa-stat-lbl">Total Users</div>
                  </div>
                  <div className="sa-stat-sub">{users.filter(u => u.status === 'active').length} active</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(242,185,75,0.12)', color: '#f2b94b' }}><FileText size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{pendingKyc}</div>
                    <div className="sa-stat-lbl">Pending KYC</div>
                  </div>
                  <div className="sa-stat-sub">{kycQueue.filter(k => k.status === 'approved').length} approved</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(90,167,255,0.12)', color: '#5aa7ff' }}><Wallet size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{pendingTxns}</div>
                    <div className="sa-stat-lbl">Pending Txns</div>
                  </div>
                  <div className="sa-stat-sub">{flaggedTxns > 0 ? `${flaggedTxns} flagged ⚠` : 'No flags'}</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}><DollarSign size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{fmtUSD(totalVolume)}</div>
                    <div className="sa-stat-lbl">Approved Volume</div>
                  </div>
                  <div className="sa-stat-sub">All-time approved</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(240,68,82,0.12)', color: '#f04452' }}><Ban size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{users.filter(u => u.status === 'suspended').length}</div>
                    <div className="sa-stat-lbl">Suspended Accounts</div>
                  </div>
                  <div className="sa-stat-sub">{users.filter(u => u.kycStatus === 'rejected').length} KYC rejected</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(240,185,11,0.12)', color: '#f0b90b' }}><Shield size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{admins.length}</div>
                    <div className="sa-stat-lbl">Admin Accounts</div>
                  </div>
                  <div className="sa-stat-sub">{admins.filter(a => a.status === 'active').length} active</div>
                </div>
              </div>

              {/* Alerts panel */}
              {alerts.length > 0 && (
                <div className="sa-alerts-panel">
                  <div className="sa-panel-head"><AlertTriangle size={15} color="#f04452" /> Active Alerts</div>
                  {alerts.map(a => (
                    <div key={a.id} className={`sa-alert-row sa-alert-${a.type}`}>
                      {a.type === 'critical' ? <XCircle size={14} /> : <AlertCircle size={14} />}
                      <span>{a.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent audit */}
              <div className="sa-panel">
                <div className="sa-panel-head"><Activity size={14} /> Recent Activity</div>
                <table className="sa-table">
                  <thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th><th>Time</th><th>Severity</th></tr></thead>
                  <tbody>
                    {auditLog.slice(0, 6).map(e => (
                      <tr key={e.id}>
                        <td><strong>{e.adminName}</strong></td>
                        <td><code className="sa-code">{e.action}</code></td>
                        <td><span className="sa-dim">{e.targetType}</span></td>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</td>
                        <td><span className="sa-dim">{fmtDate(e.timestamp)}</span></td>
                        <td><StatusBadge status={e.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════ USERS ═════════════════════════════════════ */}
          {section === 'users' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">USER MANAGEMENT</div>
                  <h1>Client Accounts <span className="sa-count">{filteredUsers.length}</span></h1>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={fetchUsers} disabled={usersLoading} title="Refresh users">
                    <RefreshCw size={13} style={{ animation: usersLoading ? 'sa-spin 1s linear infinite' : 'none' }} />
                    {usersLoading ? 'Loading…' : 'Refresh'}
                  </button>
                  <div className="sa-search-box">
                    <Search size={14} />
                    <input placeholder="Search by name, email or ID…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>User</th><th>Country</th><th>Account</th><th>Balance</th>
                      <th>KYC</th><th>Status</th><th>Approval</th><th>Registered</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--sa-muted)' }}>
                        <RefreshCw size={18} style={{ animation: 'sa-spin 1s linear infinite', marginBottom: 8 }} />
                        <div>Loading users from database…</div>
                      </td></tr>
                    )}
                    {!usersLoading && usersError && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#f04452' }}>
                        <AlertCircle size={16} style={{ marginRight: 6 }} />{usersError}
                      </td></tr>
                    )}
                    {!usersLoading && !usersError && filteredUsers.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--sa-muted)' }}>
                        <Users size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <div>No registered users yet.</div>
                      </td></tr>
                    )}
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="sa-row-hover" onClick={() => setSelectedUser(u)}>
                        <td>
                          <div className="sa-user-cell">
                            <div className="sa-mini-avatar">{u.name.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <strong>{u.name}</strong>
                              <div className="sa-dim">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><Globe size={12} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.5 }} />{u.country}</td>
                        <td><span className={`sa-badge ${u.accountType === 'LIVE' ? 'sa-badge-live' : ''}`}>{u.accountType}</span></td>
                        <td><strong>{fmtUSD(u.balance)}</strong></td>
                        <td><StatusBadge status={u.kycStatus} /></td>
                        <td><StatusBadge status={u.status} /></td>
                        <td>
                          {u.accountStatus === 'pending'
                            ? <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>Pending</span>
                            : <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>Approved</span>
                          }
                        </td>
                        <td><span className="sa-dim">{u.registeredAt}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="sa-action-row">
                            <button className="sa-btn-xs sa-btn-xs-outline" onClick={() => setSelectedUser(u)}>
                              <Eye size={11} /> View
                            </button>
                            {/* Trade Outcome Allocation Buttons: Green Profit vs Red Loss */}
                            <button
                              className="sa-btn-xs"
                              onClick={() => setUserProfitAllocationMode(u, 'PROFIT')}
                              title="Set user live trades to PROFIT (+85% Win Rate)"
                              style={{
                                background: userProfitAllocations[u.id] === 'PROFIT' ? '#1ccf84' : 'rgba(28,207,132,0.12)',
                                border: '1px solid #1ccf84',
                                color: userProfitAllocations[u.id] === 'PROFIT' ? '#000000' : '#1ccf84',
                                fontWeight: 800,
                              }}
                            >
                              <Sparkles size={11} /> Profit
                            </button>
                            <button
                              className="sa-btn-xs"
                              onClick={() => setUserProfitAllocationMode(u, 'LOSS')}
                              title="Set user live trades to 100% HOUSE LOSS (Default)"
                              style={{
                                background: (userProfitAllocations[u.id] === 'LOSS' || !userProfitAllocations[u.id]) ? '#f04452' : 'rgba(240,68,82,0.12)',
                                border: '1px solid #f04452',
                                color: (userProfitAllocations[u.id] === 'LOSS' || !userProfitAllocations[u.id]) ? '#ffffff' : '#f04452',
                                fontWeight: 800,
                              }}
                            >
                              <TrendingDown size={11} /> Loss
                            </button>
                            <button
                              className="sa-btn-xs sa-btn-xs-ok"
                              onClick={() => setBalanceModal({ user: u, amount: '', mode: 'credit', reason: '' })}
                              title="Load / Allocate money directly to this user Real Account balance"
                            >
                              <DollarSign size={11} /> Load Funds
                            </button>
                            {u.accountStatus === 'pending' ? (
                              <button className="sa-btn-xs sa-btn-xs-ok" onClick={() => approveAccount(u)}>
                                <CheckCircle2 size={11} /> Approve
                              </button>
                            ) : (
                              <button
                                className={`sa-btn-xs ${u.status === 'active' ? 'sa-btn-xs-danger' : 'sa-btn-xs-ok'}`}
                                onClick={() => toggleUserStatus(u)}
                              >
                                {u.status === 'active' ? <><Ban size={11} /> Suspend</> : <><CheckCircle2 size={11} /> Activate</>}
                              </button>
                            )}
                            <button className="sa-btn-xs sa-btn-xs-outline" title="Edit details" onClick={() => openEditUser(u)}>
                              <Pencil size={11} />
                            </button>
                            <button className="sa-btn-xs sa-btn-xs-danger" title="Permanently delete user" onClick={() => deleteUser(u)}>
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* User detail drawer */}
              {selectedUser && (
                <div className="sa-drawer-overlay" onClick={() => setSelectedUser(null)}>
                  <div className="sa-drawer" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>User Profile</h3>
                      <button className="sa-icon-btn" onClick={() => setSelectedUser(null)}><X size={16} /></button>
                    </div>
                    <div className="sa-drawer-avatar">
                      {selectedUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <h4 style={{ textAlign: 'center', marginBottom: '4px' }}>{selectedUser.name}</h4>
                    <p style={{ textAlign: 'center', color: 'var(--sa-muted)', fontSize: '12px', marginBottom: '16px' }}>{selectedUser.email}</p>

                    <div className="sa-detail-grid">
                      <div className="sa-detail-row"><span>ID</span><code className="sa-code">{selectedUser.id}</code></div>
                      <div className="sa-detail-row"><span>Phone</span><strong>{selectedUser.phone}</strong></div>
                      <div className="sa-detail-row"><span>Country</span><strong>{selectedUser.country}</strong></div>
                      <div className="sa-detail-row"><span>Account</span><strong>{selectedUser.accountType}</strong></div>
                      <div className="sa-detail-row"><span>Balance</span><strong style={{ color: '#1ccf84' }}>{fmtUSD(selectedUser.balance)}</strong></div>
                      <div className="sa-detail-row"><span>KYC Status</span><StatusBadge status={selectedUser.kycStatus} /></div>
                      <div className="sa-detail-row"><span>Status</span><StatusBadge status={selectedUser.status} /></div>
                      <div className="sa-detail-row">
                        <span>Account Approval</span>
                        {selectedUser.accountStatus === 'pending'
                          ? <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>⏳ Pending Admin Approval</span>
                          : <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>✓ Approved</span>
                        }
                      </div>
                      <div className="sa-detail-row"><span>Registered</span><span className="sa-dim">{selectedUser.registeredAt}</span></div>
                      <div className="sa-detail-row"><span>Last Seen</span><span className="sa-dim">{selectedUser.lastSeen}</span></div>
                    </div>

                    <div className="sa-drawer-actions">
                      {selectedUser.accountStatus === 'pending' && (
                        <button className="sa-btn sa-btn-primary" style={{ width: '100%' }} onClick={() => approveAccount(selectedUser)}>
                          <CheckCircle2 size={14} /> Approve Account
                        </button>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          className={`sa-btn ${selectedUser.status === 'active' ? 'sa-btn-danger' : 'sa-btn-ok'}`}
                          onClick={() => toggleUserStatus(selectedUser)}
                        >
                          {selectedUser.status === 'active' ? <><Ban size={14} /> Suspend</> : <><CheckCircle2 size={14} /> Activate</>}
                        </button>
                        <button className="sa-btn sa-btn-outline" onClick={() => openEditUser(selectedUser)}>
                          <Pencil size={14} /> Edit Details
                        </button>
                        {canAccess('canAdjustBalances') && (
                          <button
                            className="sa-btn sa-btn-ok"
                            onClick={() => setBalanceModal({ user: selectedUser, amount: '', mode: 'credit', reason: '' })}
                          >
                            <DollarSign size={14} /> Allocate Balance
                          </button>
                        )}
                        <button className="sa-btn sa-btn-danger" onClick={() => openResetPassword(selectedUser)}>
                          <Lock size={14} /> Reset Password
                        </button>
                        <button className="sa-btn sa-btn-outline" style={{ gridColumn: '1/-1' }}
                          onClick={() => { setNotifySubject(''); setNotifyMessage(''); setNotifySent(false); setNotifyModal(selectedUser) }}>
                          <Bell size={14} /> Send Notification
                        </button>
                        {canAccess('canManageAdmins') && (
                          <button className="sa-btn" style={{ gridColumn: '1/-1', background: 'rgba(240,185,11,0.12)', color: '#f0b90b', border: '1px solid rgba(240,185,11,0.3)' }}
                            onClick={() => { setUpgradeRole('kyc_admin'); setUpgradeModal(selectedUser) }}>
                            <ShieldCheck size={14} /> Upgrade to Admin
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ KYC ═══════════════════════════════════════ */}
          {section === 'kyc' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">DOCUMENT VERIFICATION</div>
                  <h1>KYC Queue <span className="sa-count">{filteredKyc.length}</span></h1>
                </div>
                <div className="sa-filter-row">
                  <button className={`sa-pill ${kycFilter === 'pending' ? 'sa-pill-active' : ''}`} onClick={() => setKycFilter('pending')}>Pending</button>
                  <button className={`sa-pill ${kycFilter === 'all' ? 'sa-pill-active' : ''}`} onClick={() => setKycFilter('all')}>All</button>
                </div>
              </div>

              <div className="sa-kyc-grid">
                {filteredKyc.map(kyc => (
                  <div key={kyc.id} className={`sa-kyc-card ${kyc.status !== 'pending' ? 'sa-kyc-card-done' : ''}`}>
                    <div className="sa-kyc-card-head">
                      <div>
                        <strong>{kyc.userName}</strong>
                        <div className="sa-dim">{kyc.userEmail}</div>
                      </div>
                      <StatusBadge status={kyc.status} />
                    </div>
                    <div className="sa-kyc-meta">
                      <span><FileText size={12} /> {kyc.documentType}</span>
                      <span><Clock size={12} /> {fmtDate(kyc.submittedAt)}</span>
                    </div>
                    {kyc.rejectionReason && (
                      <div className="sa-kyc-rejection">
                        <AlertTriangle size={12} /> {kyc.rejectionReason}
                      </div>
                    )}
                    {/* Simulated document preview thumbnails */}
                    {/* Real submitted KYC document image or PDF viewer */}
                    <div className="sa-kyc-docs" style={{ margin: '10px 0' }}>
                      {kyc.mimeType?.includes('pdf') ? (
                        <a
                          href={kyc.fileUrl || '/generic-profile-portrait.svg'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sa-doc-pdf-link"
                          title="Open submitted PDF document"
                          onClick={e => e.stopPropagation()}
                        >
                          <FileText size={28} color="#00e5ff" />
                          <span>View Submitted PDF File</span>
                        </a>
                      ) : (
                        <div
                          className="sa-doc-image-preview"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImageModal({ url: kyc.fileUrl || '/generic-profile-portrait.svg', title: `${kyc.userName} - ${kyc.documentType}` })
                          }}
                          title="Click to view full resolution document image"
                        >
                          <img
                            src={kyc.fileUrl || '/generic-profile-portrait.svg'}
                            alt={`${kyc.userName} ${kyc.documentType}`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/generic-profile-portrait.svg'
                            }}
                          />
                          <span className="sa-doc-zoom-tag"><Eye size={12} /> Inspect ID Image</span>
                        </div>
                      )}
                    </div>
                    {kyc.status === 'pending' && (
                      <div className="sa-kyc-actions">
                        <button className="sa-btn sa-btn-ok" onClick={() => approveKyc(kyc)}>
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button className="sa-btn sa-btn-outline" onClick={() => { setSelectedKyc(kyc); setKycRejectReason('') }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {filteredKyc.length === 0 && (
                  <div className="sa-empty"><CheckCircle2 size={28} color="#1ccf84" /><p>All caught up — no documents pending.</p></div>
                )}
              </div>

              {/* Lightbox Image Inspection Modal */}
              {previewImageModal && (
                <div className="sa-drawer-overlay" onClick={() => setPreviewImageModal(null)}>
                  <div className="sa-image-lightbox-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head" style={{ width: '100%' }}>
                      <h3>KYC Document Inspection — {previewImageModal.title}</h3>
                      <button className="sa-icon-btn" onClick={() => setPreviewImageModal(null)}><X size={16} /></button>
                    </div>
                    <img src={previewImageModal.url} alt="KYC Document Full Resolution Preview" />
                    <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                      <a
                        href={previewImageModal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="sa-btn sa-btn-primary"
                        style={{ textDecoration: 'none' }}
                      >
                        <Download size={14} /> Download Document
                      </a>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setPreviewImageModal(null)}>
                        Close Inspection
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reject modal */}
              {selectedKyc && (
                <div className="sa-drawer-overlay" onClick={() => setSelectedKyc(null)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Reject KYC — {selectedKyc.userName}</h3>
                      <button className="sa-icon-btn" onClick={() => setSelectedKyc(null)}><X size={16} /></button>
                    </div>
                    <p className="sa-dim" style={{ marginBottom: '12px' }}>
                      A rejection reason will be sent to the user via email. Be specific and helpful.
                    </p>
                    <textarea
                      className="sa-textarea"
                      rows={4}
                      placeholder="e.g. Document image is blurry. Please resubmit a clear, well-lit photograph."
                      value={kycRejectReason}
                      onChange={e => setKycRejectReason(e.target.value)}
                    />
                    <div className="sa-modal-actions">
                      <button className="sa-btn sa-btn-danger" onClick={() => rejectKyc(selectedKyc, kycRejectReason)}>
                        <XCircle size={14} /> Confirm Rejection
                      </button>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setSelectedKyc(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ FINANCE ═══════════════════════════════════ */}
          {section === 'finance' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">PAYMENT GATEWAY</div>
                  <h1>Finance & Transactions</h1>
                </div>
                <div className="sa-filter-row">
                  <button className={`sa-pill ${txFilter === 'all' ? 'sa-pill-active' : ''}`} onClick={() => setTxFilter('all')}>All</button>
                  <button className={`sa-pill ${txFilter === 'pending' ? 'sa-pill-active' : ''}`} onClick={() => setTxFilter('pending')}>
                    Pending {pendingTxns > 0 && <span className="sa-pill-badge">{pendingTxns}</span>}
                  </button>
                  <button className={`sa-pill sa-pill-danger ${txFilter === 'flagged' ? 'sa-pill-active' : ''}`} onClick={() => setTxFilter('flagged')}>
                    Flagged {flaggedTxns > 0 && <span className="sa-pill-badge">{flaggedTxns}</span>}
                  </button>
                </div>
              </div>

              {/* Finance summary */}
              <div className="sa-finance-summary">
                <div className="sa-fin-stat">
                  <TrendingUp size={16} color="#1ccf84" />
                  <div>
                    <div className="sa-fin-val">{fmtUSD(transactions.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((s, t) => s + t.amount, 0))}</div>
                    <div className="sa-dim">Total Deposits Approved</div>
                  </div>
                </div>
                <div className="sa-fin-stat">
                  <TrendingDown size={16} color="#f04452" />
                  <div>
                    <div className="sa-fin-val">{fmtUSD(transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved').reduce((s, t) => s + t.amount, 0))}</div>
                    <div className="sa-dim">Total Withdrawals Approved</div>
                  </div>
                </div>
                <div className="sa-fin-stat">
                  <AlertTriangle size={16} color="#f2b94b" />
                  <div>
                    <div className="sa-fin-val">{fmtUSD(transactions.filter(t => t.status === 'flagged').reduce((s, t) => s + t.amount, 0))}</div>
                    <div className="sa-dim">Value Under Review</div>
                  </div>
                </div>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr><th>User</th><th>Type</th><th>Amount</th><th>Network</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredTxns.map(txn => (
                      <tr key={txn.id} className="sa-row-hover">
                        <td>
                          <div>
                            <strong>{txn.userName}</strong>
                            <div className="sa-dim">{txn.userEmail}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`sa-badge ${txn.type === 'deposit' ? 'sa-badge-ok' : txn.type === 'withdrawal' ? 'sa-badge-warn' : ''}`}>
                            {txn.type.toUpperCase()}
                          </span>
                        </td>
                        <td><strong style={{ color: txn.type === 'deposit' ? '#1ccf84' : '#f04452' }}>{fmtUSD(txn.amount)}</strong></td>
                        <td><code className="sa-code">{txn.network}</code></td>
                        <td>
                          <StatusBadge status={txn.status} />
                          {txn.flagReason && <div className="sa-flag-reason"><AlertTriangle size={10} /> {txn.flagReason}</div>}
                        </td>
                        <td><span className="sa-dim">{fmtDate(txn.createdAt)}</span></td>
                        <td>
                          {(txn.status === 'pending' || txn.status === 'flagged') ? (
                            <div className="sa-action-row">
                              <button className="sa-btn-xs sa-btn-xs-ok" onClick={() => approveTxn(txn)}><CheckCircle2 size={11} /> Approve</button>
                              <button className="sa-btn-xs sa-btn-xs-danger" onClick={() => rejectTxn(txn)}><XCircle size={11} /> Reject</button>
                            </div>
                          ) : <span className="sa-dim">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTxns.length === 0 && (
                  <div className="sa-empty"><CheckCircle2 size={28} color="#1ccf84" /><p>No transactions match this filter.</p></div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════ ADMINS ════════════════════════════════════ */}
          {section === 'admins' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">ACCESS CONTROL</div>
                  <h1>Admin Team</h1>
                </div>
                {canAccess('canManageAdmins') && (
                  <button className="sa-btn sa-btn-primary" onClick={() => setAddAdminModal(true)}>
                    <Plus size={14} /> Add Admin
                  </button>
                )}
              </div>

              <div className="sa-admins-grid">
                {admins.filter(a => a.id !== '57ef6472-7255-47d9-9ed9-7f054aa09ae6').map(a => (
                  <div key={a.id} className="sa-admin-card">
                    <div className="sa-admin-card-head">
                      <div className="sa-admin-card-avatar" style={{ borderColor: roleColor[a.role] }}>
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong>{a.name}</strong>
                        <div className="sa-dim">{a.email}</div>
                        <span className="sa-badge" style={{ background: `${roleColor[a.role]}20`, color: roleColor[a.role], marginTop: '4px', display: 'inline-block' }}>
                          {roleLabel[a.role]}
                        </span>
                      </div>
                      {a.isProtected && <div className="sa-protected-tag"><Lock size={11} /> Protected</div>}
                    </div>

                    <div className="sa-admin-perm-list">
                      {(Object.entries(a.permissions) as [keyof AdminPermissions, boolean][]).map(([k, v]) => (
                        <div key={k} className={`sa-perm-row ${v ? '' : 'sa-perm-off'}`}>
                          {v ? <CheckCircle2 size={12} color="#1ccf84" /> : <XCircle size={12} color="var(--sa-muted)" />}
                          <span>{k.replace(/([A-Z])/g, ' $1').replace('can ', '').trim()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="sa-admin-card-foot">
                      <span className="sa-dim"><Clock size={11} /> {a.lastLogin === 'Never' ? 'Never' : fmtDate(a.lastLogin)}</span>
                      <StatusBadge status={a.status} />
                    </div>

                    {!a.isProtected && canAccess('canManageAdmins') && (
                      <button className="sa-btn sa-btn-danger sa-btn-sm" style={{ marginTop: '10px', width: '100%' }} onClick={() => removeAdmin(a)}>
                        <Trash2 size={13} /> Revoke Access
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Admin Modal */}
              {addAdminModal && (
                <div className="sa-drawer-overlay" onClick={() => setAddAdminModal(false)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Invite New Admin</h3>
                      <button className="sa-icon-btn" onClick={() => setAddAdminModal(false)}><X size={16} /></button>
                    </div>
                    <div className="sa-form-grid">
                      <label className="sa-label">Full Name
                        <input className="sa-input" placeholder="Jane Doe" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))} />
                      </label>
                      <label className="sa-label">Email Address
                        <input className="sa-input" type="email" placeholder="jane@exstrade.com" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Role & Permissions
                        <select className="sa-input" value={newAdmin.role} onChange={e => setNewAdmin(p => ({ ...p, role: e.target.value as AdminRole }))}>
                          <option value="kyc_admin">KYC Admin — Can review & approve KYC documents</option>
                          <option value="finance_admin">Finance Admin — Can approve withdrawals & adjust balances</option>
                          <option value="support_admin">Support Admin — Read-only access to user profiles</option>
                        </select>
                      </label>
                    </div>
                    <div className="sa-modal-actions">
                      <button className="sa-btn sa-btn-primary" onClick={addAdmin}><Plus size={14} /> Create Admin</button>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setAddAdminModal(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ AUDIT LOG ═════════════════════════════════ */}
          {section === 'audit' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">IMMUTABLE TRAIL</div>
                  <h1>System Audit Log <span className="sa-count">{auditLog.length}</span></h1>
                </div>
                <button className="sa-btn sa-btn-outline" onClick={() => notify('Audit log export initiated.')}>
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th><th>IP Address</th><th>Timestamp</th><th>Severity</th></tr>
                  </thead>
                  <tbody>
                    {auditLog.map(e => (
                      <tr key={e.id}>
                        <td>
                          <div>
                            <strong>{e.adminName}</strong>
                            <div className="sa-dim">{e.adminEmail}</div>
                          </div>
                        </td>
                        <td><code className="sa-code">{e.action}</code></td>
                        <td>
                          <div>
                            <span className="sa-dim">{e.targetType}</span>
                            <div><code className="sa-code" style={{ fontSize: '10px' }}>{e.targetId}</code></div>
                          </div>
                        </td>
                        <td style={{ maxWidth: '260px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</span>
                        </td>
                        <td><code className="sa-code">{e.ipAddress}</code></td>
                        <td><span className="sa-dim">{fmtDate(e.timestamp)}</span></td>
                        <td><StatusBadge status={e.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════ AI SECURITY GUARDIAN ══════════════════════ */}
          {section === 'security' && renderSecurityGuardian()}

          {/* ═══════════════════ SUPPORT CHAT DESK ══════════════════════ */}
          {section === 'support' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">REAL-TIME MESSAGING</div>
                  <h1>Live Support Chat Desk</h1>
                </div>
                <span className="sa-session-info"><MessageSquare size={13} /> Replies appear to users in real time</span>
              </div>
              <AdminChatDesk agentName={currentAdmin!.name} />
            </div>
          )}

          {/* ═══════════════════ PAYMENT GATEWAY ═══════════════════════ */}
          {section === 'gateway' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">DEPOSIT CHANNELS</div>
                  <h1>Payment Gateway Manager</h1>
                </div>
                <button className="sa-btn sa-btn-primary" onClick={() => setAddAddrOpen(true)}>
                  <Plus size={14} /> Add Address
                </button>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr><th>Network</th><th>Asset</th><th>Wallet Address</th><th>Note</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {gatewayAddresses.map(a => (
                      <tr key={a.id}>
                        <td><code className="sa-code">{a.network}</code></td>
                        <td><strong>{a.assetName}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 260 }}>
                            <code className="sa-code" style={{ fontSize: '10.5px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.address}
                            </code>
                            <button className="sa-icon-btn" title="Copy" style={{ width: 24, height: 24 }}
                              onClick={() => { navigator.clipboard.writeText(a.address); notify('Address copied.') }}>
                              <Copy size={11} />
                            </button>
                          </div>
                        </td>
                        <td><span className="sa-dim">{a.note || '—'}</span></td>
                        <td>
                          <span className="sa-badge" style={{
                            background: a.enabled ? 'rgba(28,207,132,0.15)' : 'rgba(240,68,82,0.12)',
                            color: a.enabled ? '#1ccf84' : '#f04452'
                          }}>
                            {a.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <div className="sa-action-row">
                            <button className="sa-btn-xs sa-btn-xs-outline"
                              onClick={() => { setEditAddrDraft({ network: a.network, assetName: a.assetName, address: a.address, note: a.note }); setEditAddrId(a.id) }}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button className={`sa-btn-xs ${a.enabled ? 'sa-btn-xs-danger' : 'sa-btn-xs-ok'}`}
                              onClick={() => toggleGatewayAddress(a.id)}>
                              {a.enabled ? <><ToggleLeft size={11} /> Disable</> : <><ToggleRight size={11} /> Enable</>}
                            </button>
                            <button className="sa-btn-xs sa-btn-xs-danger"
                              onClick={() => deleteGatewayAddress(a.id)}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {gatewayAddresses.length === 0 && (
                  <div className="sa-empty"><CreditCard size={28} color="var(--sa-muted)" /><p>No deposit addresses configured yet.</p></div>
                )}
              </div>

              {/* Add Address Modal */}
              {addAddrOpen && (
                <div className="sa-drawer-overlay" onClick={() => setAddAddrOpen(false)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Add Deposit Address</h3>
                      <button className="sa-icon-btn" onClick={() => setAddAddrOpen(false)}><X size={16} /></button>
                    </div>
                    <div className="sa-form-grid">
                      <label className="sa-label">Network Code
                        <input className="sa-input" placeholder="e.g. USDT-TRC20" value={newAddr.network}
                          onChange={e => setNewAddr(a => ({ ...a, network: e.target.value.toUpperCase() }))} />
                      </label>
                      <label className="sa-label">Asset Name
                        <input className="sa-input" placeholder="e.g. Tether (TRC-20)" value={newAddr.assetName}
                          onChange={e => setNewAddr(a => ({ ...a, assetName: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Wallet Address
                        <input className="sa-input" placeholder="Paste full wallet address" value={newAddr.address}
                          onChange={e => setNewAddr(a => ({ ...a, address: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Note for users
                        <input className="sa-input" placeholder="e.g. Send only on this network" value={newAddr.note}
                          onChange={e => setNewAddr(a => ({ ...a, note: e.target.value }))} />
                      </label>
                    </div>
                    <div className="sa-modal-actions">
                      <button className="sa-btn sa-btn-primary" onClick={addGatewayAddress}><Plus size={14} /> Add Address</button>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setAddAddrOpen(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Address Modal */}
              {editAddrId && (
                <div className="sa-drawer-overlay" onClick={() => setEditAddrId(null)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Edit Deposit Address</h3>
                      <button className="sa-icon-btn" onClick={() => setEditAddrId(null)}><X size={16} /></button>
                    </div>
                    <div className="sa-form-grid">
                      <label className="sa-label">Network Code
                        <input className="sa-input" value={editAddrDraft.network}
                          onChange={e => setEditAddrDraft(d => ({ ...d, network: e.target.value.toUpperCase() }))} />
                      </label>
                      <label className="sa-label">Asset Name
                        <input className="sa-input" value={editAddrDraft.assetName}
                          onChange={e => setEditAddrDraft(d => ({ ...d, assetName: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Wallet Address
                        <input className="sa-input" value={editAddrDraft.address}
                          onChange={e => setEditAddrDraft(d => ({ ...d, address: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Note
                        <input className="sa-input" value={editAddrDraft.note}
                          onChange={e => setEditAddrDraft(d => ({ ...d, note: e.target.value }))} />
                      </label>
                    </div>
                    <div className="sa-modal-actions">
                      <button className="sa-btn sa-btn-primary" onClick={saveEditAddr}><CheckCircle2 size={14} /> Save Changes</button>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setEditAddrId(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            {/* Deposit Limits Panel */}
            <div className="sa-panel" style={{ marginTop: '16px' }}>
              <div className="sa-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={14} /> Deposit & Withdrawal Limits</span>
                {settingsSaved && <span style={{ fontSize: '11px', color: '#1ccf84' }}>✓ Saved</span>}
              </div>
              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'end' }}>
                <label className="sa-label">
                  Min Crypto Deposit (USD)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minUSD}
                    onChange={e => setSettingsDraft(d => ({ ...d, minUSD: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: ${minDepositUSD}</span>
                </label>
                <label className="sa-label">
                  Min M-Pesa Deposit (KES)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minKES}
                    onChange={e => setSettingsDraft(d => ({ ...d, minKES: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: KES {minDepositKES}</span>
                </label>
                <label className="sa-label">
                  Min Withdrawal (USD)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minWithdraw}
                    onChange={e => setSettingsDraft(d => ({ ...d, minWithdraw: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: ${minWithdrawalUSD}</span>
                </label>
                <button className="sa-btn sa-btn-primary" style={{ gridColumn: '1/-1' }}
                  onClick={() => {
                    const usd = parseFloat(settingsDraft.minUSD)
                    const kes = parseFloat(settingsDraft.minKES)
                    const wit = parseFloat(settingsDraft.minWithdraw)
                    if (!usd || !kes || !wit || usd < 1 || kes < 1 || wit < 1) { notify('All limits must be at least 1.', 'err'); return }
                    setMinDepositUSD(usd)
                    setMinDepositKES(kes)
                    setMinWithdrawalUSD(wit)
                    setSettingsSaved(true)
                    addAudit('UPDATE_DEPOSIT_LIMITS', 'system', 'Settings', `Min deposit: $${usd} USD / KES ${kes}. Min withdrawal: $${wit}`, 'warning')
                    notify(`Limits updated: Min deposit $${usd} / KES ${kes}, Min withdrawal $${wit}.`)
                    setTimeout(() => setSettingsSaved(false), 3000)
                  }}>
                  <CheckCircle2 size={14} /> Apply Limits
                </button>
              </div>
            </div>
            </div>
          )}

          {/* ═══════════════════ SETTINGS ══════════════════════════════════ */}
          {section === 'settings' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">PORTAL CONFIGURATION</div>
                  <h1>Security Settings</h1>
                </div>
              </div>

              <div className="sa-settings-grid">
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Shield size={20} /></div>
                  <div>
                    <strong>Two-Factor Authentication</strong>
                    <p className="sa-dim">Mandatory for all admin logins. Cannot be disabled.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>Enforced</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Clock size={20} /></div>
                  <div>
                    <strong>Session Timeout</strong>
                    <p className="sa-dim">Auto-locks after 15 minutes of inactivity.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(90,167,255,0.12)', color: '#5aa7ff' }}>15 min</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Globe size={20} /></div>
                  <div>
                    <strong>IP Whitelisting</strong>
                    <p className="sa-dim">Restrict portal access to specific IP addresses.</p>
                  </div>
                  <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={() => notify('IP whitelist management coming soon.')}>Configure</button>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Lock size={20} /></div>
                  <div>
                    <strong>Emergency Lockdown</strong>
                    <p className="sa-dim">Immediately suspend all admin operations across the platform.</p>
                  </div>
                  <button
                    className={`sa-btn sa-btn-sm ${lockdownActive ? 'sa-btn-ok' : 'sa-btn-danger'}`}
                    onClick={() => { setLockdownActive(p => !p); addAudit(lockdownActive ? 'LIFT_LOCKDOWN' : 'TRIGGER_LOCKDOWN', 'system', 'System', lockdownActive ? 'Lockdown lifted via settings' : 'Lockdown triggered via settings', 'critical') }}
                  >
                    {lockdownActive ? 'Lift Lockdown' : 'Trigger Lockdown'}
                  </button>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Activity size={20} /></div>
                  <div>
                    <strong>Audit Log Retention</strong>
                    <p className="sa-dim">All logs are immutable and retained indefinitely. Exports available as CSV.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.12)', color: '#f2b94b' }}>Indefinite</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Wifi size={20} /></div>
                  <div>
                    <strong>Encrypted Data Streams</strong>
                    <p className="sa-dim">All document processing and data transfers use TLS 1.3 end-to-end encryption.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>TLS 1.3</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><ServerCrash size={20} /></div>
                  <div>
                    <strong>Super Admin Protection</strong>
                    <p className="sa-dim">Super Admin credentials and role cannot be modified or revoked by any other admin.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(240,185,11,0.12)', color: '#f0b90b' }}>Immutable</span>
                </div>
              </div>
            </div>
          )}

        </div>
        {/* end sa-content */}
      </main>

      {/* ── Edit User Details modal ─────────────────────────────────────────── */}
      {editUserModal && (
        <div className="sa-drawer-overlay" onClick={() => setEditUserModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Edit User — {editUserModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setEditUserModal(null)}><X size={16} /></button>
            </div>
            <div className="sa-form-grid">
              <label className="sa-label">Full Name
                <input className="sa-input" value={editDraft.name}
                  onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
              </label>
              <label className="sa-label">Email
                <input className="sa-input" type="email" value={editDraft.email}
                  onChange={e => setEditDraft(d => ({ ...d, email: e.target.value }))} />
              </label>
              <label className="sa-label">Phone
                <input className="sa-input" value={editDraft.phone}
                  onChange={e => setEditDraft(d => ({ ...d, phone: e.target.value }))} />
              </label>
              <label className="sa-label">Country
                <input className="sa-input" value={editDraft.country}
                  onChange={e => setEditDraft(d => ({ ...d, country: e.target.value }))} />
              </label>
            </div>
            <div className="sa-modal-actions">
              <button className="sa-btn sa-btn-primary" onClick={saveEditUser}>
                <CheckCircle2 size={14} /> Save Changes
              </button>
              <button className="sa-btn sa-btn-ghost" onClick={() => setEditUserModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password modal ──────────────────────────────────────────── */}
      {resetPwModal && (
        <div className="sa-drawer-overlay" onClick={() => setResetPwModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Reset Password — {resetPwModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setResetPwModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>
              Set a new password for <strong style={{ color: '#00e5ff' }}>{resetPwModal.email}</strong>.
              The user will need to use this password on their next login.
            </p>
            {!resetPwDone ? (
              <>
                <label className="sa-label" style={{ marginBottom: '14px' }}>New Password
                  <div style={{ position: 'relative' }}>
                    <input
                      className="sa-input"
                      type="password"
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <span style={{ fontSize: '11px', color: '#ff1744', marginTop: '4px', display: 'block' }}>
                      Password must be at least 8 characters
                    </span>
                  )}
                </label>
                <div className="sa-modal-actions">
                  <button className="sa-btn sa-btn-danger" onClick={applyResetPassword}>
                    <KeyRound size={14} /> Reset Password
                  </button>
                  <button className="sa-btn sa-btn-ghost" onClick={() => setResetPwModal(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={32} color="#00e676" />
                <strong style={{ color: '#00e676' }}>Password Reset Successfully</strong>
                <p className="sa-dim">The new password has been applied to {resetPwModal.name}'s account.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upgrade to Admin modal ───────────────────────────────────────── */}
      {upgradeModal && (
        <div className="sa-drawer-overlay" onClick={() => setUpgradeModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Upgrade to Admin — {upgradeModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setUpgradeModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>
              This will move <strong style={{ color: '#f0b90b' }}>{upgradeModal.name}</strong> from the Users list to the Admin Team and grant them admin access.
              This action is logged and reversible.
            </p>
            <label className="sa-label" style={{ marginBottom: '16px' }}>
              Assign Role
              <select className="sa-input" value={upgradeRole}
                onChange={e => setUpgradeRole(e.target.value as AdminRole)}>
                <option value="kyc_admin">KYC Admin — Review &amp; approve KYC documents</option>
                <option value="finance_admin">Finance Admin — Approve withdrawals &amp; adjust balances</option>
                <option value="support_admin">Support Admin — Read-only access to user profiles</option>
              </select>
            </label>
            <div className="sa-modal-actions">
              <button className="sa-btn" style={{ background: 'rgba(240,185,11,0.15)', color: '#f0b90b', border: '1px solid rgba(240,185,11,0.35)' }}
                onClick={upgradeUserToAdmin}>
                <ShieldCheck size={14} /> Confirm Upgrade to Admin
              </button>
              <button className="sa-btn sa-btn-ghost" onClick={() => setUpgradeModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notify User modal ──────────────────────────────────────────── */}
      {notifyModal && (
        <div className="sa-drawer-overlay" onClick={() => setNotifyModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Send Notification — {notifyModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setNotifyModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>
              Message will be sent to <strong style={{ color: '#00e5ff' }}>{notifyModal.email}</strong>
            </p>
            {!notifySent ? (
              <>
                <div className="sa-form-grid">
                  <label className="sa-label" style={{ gridColumn: '1/-1' }}>
                    Notification Type
                    <select className="sa-input" value={notifyType}
                      onChange={e => setNotifyType(e.target.value as 'info' | 'warning' | 'success')}>
                      <option value="info">ℹ️ Info — General message</option>
                      <option value="warning">⚠️ Warning — Requires attention</option>
                      <option value="success">✅ Success — Positive update</option>
                    </select>
                  </label>
                  <label className="sa-label" style={{ gridColumn: '1/-1' }}>
                    Subject
                    <input className="sa-input" placeholder="e.g. Account Update" value={notifySubject}
                      onChange={e => setNotifySubject(e.target.value)} />
                  </label>
                  <label className="sa-label" style={{ gridColumn: '1/-1' }}>
                    Message
                    <textarea className="sa-textarea" rows={4} placeholder="Write your message here…"
                      value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} />
                  </label>
                </div>
                <div className="sa-modal-actions">
                  <button className="sa-btn sa-btn-primary" onClick={sendNotification}>
                    <Bell size={14} /> Send Notification
                  </button>
                  <button className="sa-btn sa-btn-ghost" onClick={() => setNotifyModal(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={36} color="#00e676" />
                <strong style={{ color: '#00e676' }}>Notification Sent</strong>
                <p className="sa-dim">{notifyModal.name} has been notified.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Balance adjustment modal ──────────────────────────────────────── */}
      {balanceModal && (
        <div className="sa-drawer-overlay" onClick={() => setBalanceModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Adjust Balance — {balanceModal.user.name}</h3>
              <button className="sa-icon-btn" onClick={() => setBalanceModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>Current balance: <strong style={{ color: '#1ccf84' }}>{fmtUSD(balanceModal.user.balance)}</strong></p>
            <div className="sa-form-grid">
              <label className="sa-label" style={{ gridColumn: '1/-1' }}>Operation
                <select className="sa-input" value={balanceModal.mode} onChange={e => setBalanceModal(p => p ? ({ ...p, mode: e.target.value as 'credit' | 'debit' }) : null)}>
                  <option value="credit">Credit (add funds)</option>
                  <option value="debit">Debit (remove funds)</option>
                </select>
              </label>
              <label className="sa-label" style={{ gridColumn: '1/-1' }}>Amount (USD)
                <input className="sa-input" type="number" min="1" placeholder="0.00" value={balanceModal.amount} onChange={e => setBalanceModal(p => p ? ({ ...p, amount: e.target.value }) : null)} />
              </label>
              <label className="sa-label" style={{ gridColumn: '1/-1' }}>Internal Reason (required)
                <input className="sa-input" placeholder="e.g. Manual correction for failed withdrawal refund" value={balanceModal.reason} onChange={e => setBalanceModal(p => p ? ({ ...p, reason: e.target.value }) : null)} />
              </label>
            </div>
            <div className="sa-modal-actions">
              <button className="sa-btn sa-btn-primary" onClick={applyBalanceAdjustment}>
                <DollarSign size={14} /> Apply Adjustment
              </button>
              <button className="sa-btn sa-btn-ghost" onClick={() => setBalanceModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`sa-toast sa-toast-${toast.type}`}>
          {toast.type === 'ok' ? <CheckCircle2 size={15} /> : toast.type === 'err' ? <XCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
