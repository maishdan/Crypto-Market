import { useState, useEffect, useRef } from 'react'
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Copy, CheckCircle2, AlertCircle, Smartphone,
  DollarSign, RefreshCw, ChevronDown, EyeOff, Eye,
  Zap, Sparkles,
} from 'lucide-react'

export type WalletBalances = {
  main: number
  synthetic: number
  liveMarket: number
}

type DepositAddress = {
  id: string
  network: string
  assetName: string
  address: string
  note: string
  enabled: boolean
}

type Props = {
  wallets: WalletBalances
  onTransfer: (from: keyof WalletBalances, to: keyof WalletBalances, amount: number) => void
  onDepositRequest: (amount: number, network: string, reference?: string) => void
  onWithdrawalRequest?: (amount: number, gateway: string, address: string) => void
  adminAddresses: DepositAddress[]
  showNotice: (msg: string) => void
  minDepositUSD?: number
  minDepositKES?: number
  minWithdrawalUSD?: number
}

const WALLET_META: Record<keyof WalletBalances, { label: string; sub: string; color: string }> = {
  main:       { label: 'Main',        sub: 'Primary',   color: '#00e5ff' },
  synthetic:  { label: 'Synthetic',   sub: 'Synthetic', color: '#00e676' },
  liveMarket: { label: 'Live Market', sub: 'Live trade', color: '#f2b94b' },
}

// Crypto coin icons (inline SVG colours)
const COIN_ICONS: Record<string, { color: string; symbol: string }> = {
  BTC:         { color: '#f7931a', symbol: '₿' },
  ETH:         { color: '#627eea', symbol: 'Ξ' },
  SOL:         { color: '#9945ff', symbol: '◎' },
  DOGE:        { color: '#c2a633', symbol: 'Ð' },
  DOT:         { color: '#e6007a', symbol: '●' },
  'USDT-TRC20':{ color: '#26a17b', symbol: '₮' },
  'USDT-ERC20':{ color: '#26a17b', symbol: '₮' },
  BNB:         { color: '#f0b90b', symbol: 'B' },
  LTC:         { color: '#bfbbbb', symbol: 'Ł' },
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ACTIVITY = [
  'GLOBAL SYNC: Volatility 25 (1s) index → Probability Check [Analyzing…]',
  'Security Audit: Passkey fully enrolled. ✅',
  '**On-boarding Update**: Questionnaire response registered. id_card_front queued for review. ⏳',
]

type StkStep = 'form' | 'pushing' | 'waiting' | 'verify' | 'done' | 'error'

export default function FundsHub({
  wallets, onTransfer, onDepositRequest, onWithdrawalRequest, adminAddresses, showNotice,
  minDepositUSD = 10, minDepositKES = 100, minWithdrawalUSD = 10,
}: Props) {
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit')
  const [selectedWallet, setSelectedWallet] = useState<keyof WalletBalances>('main')
  const [depositMethod, setDepositMethod] = useState<'mpesa' | string>('mpesa')
  const [methodOpen, setMethodOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)

  // Withdraw
  const [wAmt, setWAmt] = useState('')
  const [wAddr, setWAddr] = useState('')
  const [wGateway, setWGateway] = useState('USDT-TRC20')

  // Transfer
  const [tFrom, setTFrom] = useState<keyof WalletBalances>('main')
  const [tTo, setTTo] = useState<keyof WalletBalances>('synthetic')
  const [tAmt, setTAmt] = useState('')

  // M-Pesa
  const [mpPhone, setMpPhone] = useState('')
  const [mpKes, setMpKes] = useState('')
  const [mpCode, setMpCode] = useState('')
  const [stkStep, setStkStep] = useState<StkStep>('form')
  const [stkError, setStkError] = useState('')
  const [_stkCheckoutId, setStkCheckoutId] = useState('')
  const [stkVerifying, setStkVerifying] = useState(false)

  // Activity log
  const [logLines, setLogLines] = useState<string[]>([])
  const logRef = useRef(0)
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Nairobi' })
      setLogLines(prev => [`[${now} EAT] ${ACTIVITY[logRef.current % ACTIVITY.length]}`, ...prev].slice(0, 6))
      logRef.current++
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const total = wallets.main + wallets.synthetic + wallets.liveMarket

  const cryptoNetworks = adminAddresses.filter(a => a.enabled)
  type MethodItem = { id: string; label: string; icon: string; color?: string; isSeparator?: boolean }
  const allMethods: MethodItem[] = [
    { id: 'mpesa', label: 'M-PESA DEPOSIT', icon: '📱' },
    { id: 'CRYPTO', label: 'CRYPTO', icon: '₿', isSeparator: true },
    ...cryptoNetworks.map(a => ({
      id: a.network,
      label: a.network,
      icon: COIN_ICONS[a.network]?.symbol ?? '◈',
      color: COIN_ICONS[a.network]?.color,
    })),
  ]

  const selectedMethodMeta = allMethods.find(m => m.id === depositMethod) ?? allMethods[0]
  const activeAddr = adminAddresses.find(a => a.network === depositMethod && a.enabled)

  const copyAddr = () => {
    if (!activeAddr) return
    navigator.clipboard.writeText(activeAddr.address).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleProceedDeposit = async () => {
    if (depositMethod === 'mpesa') {
      // validate then call STK
      if (!mpPhone.match(/^07\d{8}$|^\+2547\d{8}$/)) { showNotice('Enter a valid M-Pesa number (07XXXXXXXX).'); return }
      const kes = parseFloat(mpKes || amount)
      if (!kes || kes < minDepositKES) { showNotice(`Minimum M-Pesa deposit is KES ${minDepositKES}.`); return }
      setStkStep('pushing')
      try {
        const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
        const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string
        const res = await fetch(`${supabaseUrl}/functions/v1/mpesa-stk-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
          body: JSON.stringify({ phone: mpPhone.trim(), amount: Math.ceil(kes), customerName: 'NEXSMARKETS CLIENT' }),
        })
        const data = await res.json() as { success?: boolean; error?: string; checkoutRequestId?: string }
        if (!res.ok || !data.success) { setStkStep('error'); setStkError(data.error ?? 'STK Push failed.'); return }
        setStkCheckoutId(data.checkoutRequestId ?? '')
        setStkStep('waiting')
      } catch { setStkStep('error'); setStkError('Network error. Check your connection.') }
    } else {
      // Crypto deposit
      const amt = parseFloat(amount)
      if (!amt || amt < minDepositUSD) { showNotice(`Minimum deposit is $${minDepositUSD}.`); return }
      onDepositRequest(amt, depositMethod)
      showNotice(`✅ Crypto deposit of $${fmt(amt)} via ${depositMethod} submitted. Awaiting admin confirmation.`)
      setAmount('')
    }
  }

  const submitMpesaCode = () => {
    if (!mpCode.trim()) { showNotice('Enter the M-Pesa transaction code.'); return }
    setStkVerifying(true)
    onDepositRequest(parseFloat(mpKes || amount) / 130, 'MPESA', mpCode.trim())
    setTimeout(() => { setStkStep('done'); setStkVerifying(false) }, 800)
  }

  const resetMpesa = () => { setStkStep('form'); setStkError(''); setMpPhone(''); setMpKes(''); setMpCode(''); setStkCheckoutId('') }

  const confirmWithdraw = () => {
    const amt = parseFloat(wAmt)
    if (!amt || amt < minWithdrawalUSD) { showNotice(`Minimum withdrawal is $${minWithdrawalUSD}.`); return }
    if (wallets.main < amt) { showNotice('Insufficient main balance.'); return }
    if (!wAddr.trim()) { showNotice('Enter destination wallet address.'); return }
    onWithdrawalRequest?.(amt, wGateway, wAddr)
    setWAmt(''); setWAddr('')
  }

  const confirmTransfer = () => {
    const amt = parseFloat(tAmt)
    if (!amt || amt <= 0) { showNotice('Enter a valid amount.'); return }
    if (tFrom === tTo) { showNotice('Select two different wallets.'); return }
    if (wallets[tFrom] < amt) { showNotice('Insufficient balance.'); return }
    onTransfer(tFrom, tTo, amt)
    showNotice(`✅ Transferred $${fmt(amt)} → ${WALLET_META[tTo].label}`)
    setTAmt('')
  }

  return (
    <div className="th-shell">
      {/* ── TITLE ───────────────────────────────────────────────────────── */}
      <div className="th-hero">
        <div className="th-hero-title">YOUR TREASURY HUB</div>
        <div className="th-hero-sub">Manage Funds</div>
      </div>

      {/* ── TOTAL BALANCE ────────────────────────────────────────────────── */}
      <div className="th-balance-bar">
        <div className="th-balance-left">
          <div className="th-balance-label">Total Balance</div>
          <div className="th-balance-value">
            {hideBalance ? '••••••' : `$${fmt(total)} USD`}
            <button className="th-eye-btn" onClick={() => setHideBalance(p => !p)}>
              {hideBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
        <div className="th-balance-icons">
          <div className="th-bal-icon"><DollarSign size={18} /></div>
          <div className="th-bal-icon" style={{ opacity: 0.5 }}><DollarSign size={18} /></div>
        </div>
      </div>

      {/* ── TAB ROW ──────────────────────────────────────────────────────── */}
      <div className="th-tabs">
        <button className={`th-tab ${tab === 'deposit'  ? 'th-tab-active' : ''}`} onClick={() => setTab('deposit')}>
          <ArrowDownToLine size={14} /> Deposit
        </button>
        <button className={`th-tab ${tab === 'withdraw' ? 'th-tab-active' : ''}`} onClick={() => setTab('withdraw')}>
          <ArrowUpFromLine size={14} /> Withdraw
        </button>
        <button className={`th-tab ${tab === 'transfer' ? 'th-tab-active' : ''}`} onClick={() => setTab('transfer')}>
          <ArrowLeftRight size={14} /> Internal Transfer
        </button>
      </div>

      {/* ════════════════ DEPOSIT ═══════════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div className="th-deposit-grid">
          {/* 50% REAL ACCOUNT DEPOSIT BONUS BANNER */}
          <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15), rgba(0, 229, 255, 0.1))', border: '1px solid rgba(0, 230, 118, 0.35)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Sparkles size={22} color="#00e676" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ color: '#00e676', fontWeight: 800, fontSize: '13px', letterSpacing: '0.4px' }}>🎁 50% INSTANT REAL ACCOUNT DEPOSIT BONUS ACTIVE</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>Every deposit to your Real Account instantly receives a 50% bonus! Example: Deposit $100 &rarr; Receive $150 total trading balance.</div>
            </div>
          </div>

          {/* ── LEFT: CHOOSE WALLET ──────────────────────────────────────── */}
          <div className="th-panel">
            <div className="th-panel-title">CHOOSE WALLET</div>
            <div className="th-wallet-list">
              {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => {
                const m = WALLET_META[k]
                return (
                  <button
                    key={k}
                    className={`th-wallet-item ${selectedWallet === k ? 'th-wallet-selected' : ''}`}
                    onClick={() => setSelectedWallet(k)}
                    style={{ '--wc': m.color } as React.CSSProperties}
                  >
                    <div className="th-wallet-radio">
                      <div className="th-wallet-radio-inner" />
                    </div>
                    {selectedWallet === k && (
                      <div className="th-wallet-check"><CheckCircle2 size={14} color={m.color} /></div>
                    )}
                    <div className="th-wallet-info">
                      <div className="th-wallet-name">{m.label}</div>
                      <div className="th-wallet-sub">{m.sub}</div>
                    </div>
                    <ChevronDown size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── CENTER: SELECT METHOD ────────────────────────────────────── */}
          <div className="th-panel">
            <div className="th-panel-title">SELECT DEPOSIT METHOD</div>

            {/* Dropdown */}
            <div className="th-method-dropdown" onClick={() => setMethodOpen(p => !p)}>
              <span className="th-method-icon">{selectedMethodMeta.icon}</span>
              <span className="th-method-label">{selectedMethodMeta.label}</span>
              <ChevronDown size={14} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: methodOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>

            {methodOpen && (
              <div className="th-method-list">
                {allMethods.map((m, i) => {
                  if (m.isSeparator) return (
                    <div key={i} className="th-method-sep">
                      <CheckCircle2 size={11} /> {m.label}
                    </div>
                  )
                  return (
                    <button key={m.id} className={`th-method-opt ${depositMethod === m.id ? 'th-method-opt-active' : ''}`}
                      onClick={() => { setDepositMethod(m.id); setMethodOpen(false); setStkStep('form') }}>
                      <span className="th-coin-icon" style={{ background: m.color ? m.color + '22' : 'rgba(255,255,255,0.06)', color: m.color ?? '#fff' }}>
                        {m.icon}
                      </span>
                      {m.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* M-Pesa inputs */}
            {depositMethod === 'mpesa' && stkStep === 'form' && (
              <div className="th-mpesa-fields">
                <label className="th-field-label">
                  M-Pesa Phone
                  <div className="th-input-wrap">
                    <span className="th-input-pre">🇰🇪</span>
                    <input className="th-input" type="tel" placeholder="07XXXXXXXX"
                      value={mpPhone} onChange={e => setMpPhone(e.target.value)} />
                  </div>
                </label>
                <label className="th-field-label">
                  Amount (KES)
                  <div className="th-input-wrap">
                    <span className="th-input-pre">KES</span>
                    <input className="th-input" type="number" min={minDepositKES} placeholder={minDepositKES.toString()}
                      value={mpKes} onChange={e => setMpKes(e.target.value)} />
                  </div>
                  <span className="th-hint">
                    Min KES {minDepositKES.toLocaleString()} · ~${(parseFloat(mpKes) > 0 ? (parseFloat(mpKes) / 130) : minDepositUSD).toFixed(2)} USD
                  </span>
                </label>
              </div>
            )}

            {/* STK Push states */}
            {depositMethod === 'mpesa' && stkStep === 'pushing' && (
              <div className="th-stk-status">
                <div className="th-spinner" />
                <strong>Sending STK Push…</strong>
              </div>
            )}

            {depositMethod === 'mpesa' && stkStep === 'waiting' && (
              <div className="th-stk-waiting">
                <Smartphone size={32} color="#00e676" />
                <strong>Check your phone!</strong>
                <p>Prompt sent to <b style={{color:'#00e5ff'}}>{mpPhone}</b> for KES {parseFloat(mpKes).toLocaleString()}</p>
                <label className="th-field-label" style={{width:'100%'}}>
                  M-Pesa Code (from SMS)
                  <input className="th-input th-mono" placeholder="e.g. QJK7WXYZ12"
                    value={mpCode} onChange={e => setMpCode(e.target.value.toUpperCase())} autoFocus />
                </label>
                <button className="th-proceed-btn" onClick={submitMpesaCode} disabled={stkVerifying}>
                  {stkVerifying ? 'Verifying…' : <><DollarSign size={15}/> Confirm Deposit</>}
                </button>
                <button className="th-back-btn" onClick={resetMpesa}>← Try again</button>
              </div>
            )}

            {depositMethod === 'mpesa' && stkStep === 'done' && (
              <div className="th-stk-done">
                <div style={{fontSize:40}}>✅</div>
                <strong>Deposit Submitted!</strong>
                <p>KES {parseFloat(mpKes).toLocaleString()} submitted for admin verification.</p>
                {mpCode && <code className="th-ref-code">{mpCode}</code>}
                <button className="th-proceed-btn" onClick={resetMpesa}>Make Another</button>
              </div>
            )}

            {depositMethod === 'mpesa' && stkStep === 'error' && (
              <div className="th-stk-err">
                <div style={{fontSize:36}}>❌</div>
                <strong>STK Push Failed</strong>
                <p>{stkError}</p>
                <button className="th-proceed-btn" onClick={resetMpesa}>Try Again</button>
              </div>
            )}

            {/* Crypto receiving address card */}
            {depositMethod !== 'mpesa' && stkStep === 'form' && (
              <div className="th-crypto-fields">
                {activeAddr ? (
                  <div style={{ background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--mint-teal)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        🎯 OFFICIAL DEPOSIT ADDRESS ({activeAddr.network})
                      </span>
                      <button
                        type="button"
                        className="th-copy-btn"
                        onClick={copyAddr}
                        style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {copied ? <><CheckCircle2 size={12}/> Copied!</> : <><Copy size={12}/> Copy Address</>}
                      </button>
                    </div>
                    <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '12.5px', color: '#ffffff', fontWeight: 700, letterSpacing: '0.3px', userSelect: 'all' }}>
                      {activeAddr.address}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      💡 {activeAddr.note || `Send only ${activeAddr.assetName} (${activeAddr.network}) to this deposit receiving address.`}
                    </div>
                  </div>
                ) : (
                  <div className="th-addr-bar">
                    <span className="th-addr-text">No active receiving address for {depositMethod}</span>
                  </div>
                )}
                <label className="th-field-label">
                  Amount (USD)
                  <div className="th-input-wrap">
                    <span className="th-input-pre">$</span>
                    <input className="th-input" type="number" min={minDepositUSD} placeholder={minDepositUSD.toFixed(2)}
                      value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <span className="th-hint">
                    Min ${minDepositUSD} USD · ~KES {(parseFloat(amount) > 0 ? (parseFloat(amount) * 130) : (minDepositUSD * 130)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </label>
              </div>
            )}

            {/* Live 50% Real Account Bonus Calculation Card */}
            {((depositMethod === 'mpesa' && parseFloat(mpKes) > 0) || (depositMethod !== 'mpesa' && parseFloat(amount) > 0)) && (
              <div style={{ background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.28)', borderRadius: '10px', padding: '12px 14px', marginTop: '14px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Deposit Amount:</span>
                  <strong>${(depositMethod === 'mpesa' ? (parseFloat(mpKes) || 0) / 130 : (parseFloat(amount) || 0)).toFixed(2)} USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00e676', marginTop: '4px' }}>
                  <span>+ 50% Real Account Bonus:</span>
                  <strong>+${((depositMethod === 'mpesa' ? (parseFloat(mpKes) || 0) / 130 : (parseFloat(amount) || 0)) * 0.5).toFixed(2)} USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffffff', fontWeight: 800, marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span>Total Capital Credited:</span>
                  <span style={{ color: '#00e676', fontSize: '13px' }}>${((depositMethod === 'mpesa' ? (parseFloat(mpKes) || 0) / 130 : (parseFloat(amount) || 0)) * 1.5).toFixed(2)} USD</span>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: INSTRUCTIONS ──────────────────────────────────────── */}
          <div className="th-panel">
            {depositMethod === 'mpesa' ? (
              <>
                <div className="th-panel-title">📱 M-PESA DEPOSIT</div>
                <ol className="th-instructions">
                  <li>ENTER PHONE NUMBER (Left)</li>
                  <li>ENTER KES AMOUNT</li>
                  <li>CLICK PROCEED BELOW</li>
                  <li>ENTER PIN ON YOUR PHONE</li>
                  <li>PASTE SMS CODE TO CONFIRM</li>
                </ol>
              </>
            ) : (
              <>
                <div className="th-panel-title" style={{color: COIN_ICONS[depositMethod]?.color ?? '#00e5ff'}}>
                  {COIN_ICONS[depositMethod]?.symbol ?? '◈'} {depositMethod} DEPOSIT
                  <button className="th-help-btn" title="How to deposit">?</button>
                </div>
                <ol className="th-instructions">
                  <li>SELECT WALLET (Left)</li>
                  <li>SELECT CRYPTO ASSET</li>
                  <li>COPY ADDRESS</li>
                  <li>ENTER AMOUNT BELOW</li>
                </ol>
                <div className="th-panel-title" style={{marginTop:16}}>ENTER AMOUNT BELOW</div>
                {activeAddr && (
                  <div className="th-addr-note">
                    <AlertCircle size={11}/> {activeAddr.note}
                  </div>
                )}
              </>
            )}

            {/* Review line */}
            <div className="th-review-line">
              Review selections: Deposit:{' '}
              <span>{amount ? `$${amount}` : '[amount]'}</span> to{' '}
              <span>{WALLET_META[selectedWallet].label}</span> via{' '}
              <span>{depositMethod === 'mpesa' ? 'M-Pesa' : depositMethod}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PROCEED BUTTON (Deposit) ─────────────────────────────────────── */}
      {tab === 'deposit' && stkStep === 'form' && (
        <button className="th-proceed-btn th-proceed-full" onClick={handleProceedDeposit}>
          <Zap size={16} /> PROCEED TO DEPOSIT
        </button>
      )}

      {/* ════════════════ WITHDRAW ══════════════════════════════════════════ */}
      {tab === 'withdraw' && (
        <div className="th-simple-body">
          <div className="th-avail-row">
            Available Balance: <strong style={{color:'#00e5ff'}}>${fmt(wallets.main)}</strong>
          </div>
          <div className="th-net-chips">
            {['USDT-TRC20','BTC','ETH','BANK_WIRE'].map(g => (
              <button key={g} className={`th-net-chip ${wGateway===g?'th-net-chip-on':''}`} onClick={() => setWGateway(g)}>
                {g === 'BANK_WIRE' ? 'Bank Wire' : g}
              </button>
            ))}
          </div>
          <label className="th-field-label">Destination Address
            <input className="th-input th-mono" placeholder="Paste wallet address…" value={wAddr} onChange={e => setWAddr(e.target.value)}/>
          </label>
          <div className="th-quick-row">
            {[minWithdrawalUSD,50,100,500].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).map(q => (
              <button key={q} className={`th-quick ${wAmt===String(q)?'th-quick-on':''}`} onClick={() => setWAmt(String(q))}>
                ${q}
              </button>
            ))}
            <button className="th-quick" onClick={() => setWAmt(wallets.main.toFixed(2))}>MAX</button>
          </div>
          <div className="th-input-wrap">
            <span className="th-input-pre">$</span>
            <input className="th-input" type="number" min={minWithdrawalUSD} placeholder="0.00" value={wAmt} onChange={e => setWAmt(e.target.value)}/>
          </div>
          <div className="th-hint" style={{marginTop:4}}><AlertCircle size={11}/> Processed within 24 hours after admin review.</div>
          <button className="th-proceed-btn th-proceed-full th-proceed-red" onClick={confirmWithdraw} style={{marginTop:16}}>
            <ArrowUpFromLine size={15}/> SUBMIT WITHDRAWAL
          </button>
        </div>
      )}

      {/* ════════════════ TRANSFER ══════════════════════════════════════════ */}
      {tab === 'transfer' && (
        <div className="th-simple-body">
          <div className="th-transfer-row">
            <label className="th-field-label" style={{flex:1}}>
              From
              <select className="th-input" value={tFrom} onChange={e => setTFrom(e.target.value as keyof WalletBalances)}>
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_META[k].label} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </label>
            <button className="th-swap-btn" onClick={() => { const t=tFrom; setTFrom(tTo); setTTo(t) }}>
              <RefreshCw size={15}/>
            </button>
            <label className="th-field-label" style={{flex:1}}>
              To
              <select className="th-input" value={tTo} onChange={e => setTTo(e.target.value as keyof WalletBalances)}>
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_META[k].label} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="th-quick-row">
            {[10,50,100,500].map(q => (
              <button key={q} className={`th-quick ${tAmt===String(q)?'th-quick-on':''}`} onClick={() => setTAmt(String(q))}>
                ${q}
              </button>
            ))}
            <button className="th-quick" onClick={() => setTAmt(wallets[tFrom].toFixed(2))}>MAX</button>
          </div>
          <div className="th-input-wrap">
            <span className="th-input-pre">$</span>
            <input className="th-input" type="number" min="1" placeholder="0.00" value={tAmt} onChange={e => setTAmt(e.target.value)}/>
          </div>
          <div className="th-hint" style={{marginTop:4,color:'var(--ft-cyan)'}}><ArrowLeftRight size={11}/> Zero fees · Instant settlement.</div>
          <button className="th-proceed-btn th-proceed-full th-proceed-trf" onClick={confirmTransfer} style={{marginTop:16}}>
            <ArrowLeftRight size={15}/> EXECUTE TRANSFER
          </button>
        </div>
      )}

      {/* ── ACTIVITY LOG ─────────────────────────────────────────────────── */}
      <div className="fhub-log">
        {logLines.map((line, i) => (
          <div key={i} className="fhub-log-line" style={{ opacity: 1 - i * 0.18 }}>{line}</div>
        ))}
        {logLines.length === 0 && <div className="fhub-log-line" style={{opacity:0.4}}>Awaiting activity…</div>}
      </div>
    </div>
  )
}
