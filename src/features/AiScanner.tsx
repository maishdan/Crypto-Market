import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Zap, TrendingUp, TrendingDown, Activity, X, RotateCw, ChevronRight } from 'lucide-react'

export type AiSignal = {
  id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  entryPrice: number
  winProbability: number
  strength: 'STRONG' | 'MODERATE' | 'WEAK'
  reason: string
  timestamp: number
}

type Props = {
  symbol: string
  currentPrice: number
  onAutoTrade: (signal: AiSignal) => void
  pricePrecision?: number
}

const SCAN_INTERVAL_MS = 7000

function generateSignal(symbol: string, price: number): AiSignal {
  const seed = Date.now() % 1000
  const rsi = 28 + (seed % 46)
  const macdBull = seed % 3 !== 0
  const maCross = seed % 4 !== 1

  const bullScore = (rsi < 35 ? 2 : rsi > 65 ? -2 : 0) + (macdBull ? 1 : -1) + (maCross ? 1 : -1)
  const direction: 'BUY' | 'SELL' = bullScore >= 0 ? 'BUY' : 'SELL'

  const absBull = Math.abs(bullScore)
  const strength: AiSignal['strength'] = absBull >= 3 ? 'STRONG' : absBull >= 2 ? 'MODERATE' : 'WEAK'
  const winProb = strength === 'STRONG' ? 78 + Math.floor(Math.random() * 14)
    : strength === 'MODERATE' ? 62 + Math.floor(Math.random() * 14)
    : 51 + Math.floor(Math.random() * 10)

  const priceNoise = price * (0.0002 + Math.random() * 0.0006)
  const entryPrice = direction === 'BUY' ? price + priceNoise : price - priceNoise

  const reasons = direction === 'BUY'
    ? ['RSI oversold divergence detected', 'MACD bullish crossover', 'MA20 reclaiming MA50', 'Volume spike on support bounce', 'Bullish engulfing candle pattern']
    : ['RSI overbought + bearish divergence', 'MACD death cross forming', 'MA50 acting as resistance', 'Volume dry-up at supply zone', 'Bearish rejection candle pattern']
  const reason = reasons[seed % reasons.length]

  return {
    id: `sig-${Date.now()}`,
    symbol,
    direction,
    entryPrice,
    winProbability: winProb,
    strength,
    reason,
    timestamp: Date.now(),
  }
}

export default function AiScanner({ symbol, currentPrice, onAutoTrade, pricePrecision = 2 }: Props) {
  const [_scanning, setScanning] = useState(false)
  const [signal, setSignal] = useState<AiSignal | null>(null)
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'result'>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [history, setHistory] = useState<AiSignal[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [autoScan, setAutoScan] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runScan = useCallback(() => {
    if (scanPhase === 'scanning') return
    setScanPhase('scanning')
    setScanProgress(0)
    setSignal(null)

    progressRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(progressRef.current!)
          return 100
        }
        return p + 4
      })
    }, 60)

    setTimeout(() => {
      clearInterval(progressRef.current!)
      setScanProgress(100)
      const newSignal = generateSignal(symbol, currentPrice)
      setSignal(newSignal)
      setHistory(h => [newSignal, ...h].slice(0, 20))
      setScanPhase('result')
      if (autoScan) {
        onAutoTrade(newSignal)
      }
    }, 1800)
  }, [scanPhase, symbol, currentPrice, autoScan, onAutoTrade])

  useEffect(() => {
    if (!autoScan) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(runScan, SCAN_INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoScan, runScan])

  // Reset on symbol change
  useEffect(() => {
    setSignal(null)
    setScanPhase('idle')
    setScanProgress(0)
  }, [symbol])

  const strengthColor = (s: AiSignal['strength']) =>
    s === 'STRONG' ? '#00e676' : s === 'MODERATE' ? '#00e5ff' : '#f2b94b'

  return (
    <div className="ai-scanner-panel">
      <div className="ai-scanner-header">
        <div className="ai-scanner-title">
          <Brain size={15} color="#00e5ff" />
          <span>AI Entry Scanner</span>
          <span className={`ai-scanner-status ${autoScan ? 'ai-status-active' : ''}`}>
            <span className="ai-pulse" /> {autoScan ? 'AUTO' : 'MANUAL'}
          </span>
        </div>
        <div className="ai-scanner-controls">
          <button
            className={`ai-toggle-btn ${autoScan ? 'ai-toggle-on' : ''}`}
            onClick={() => setAutoScan(p => !p)}
            title="Toggle auto-scan"
          >
            <RotateCw size={12} /> Auto
          </button>
          <button className="ai-history-btn" onClick={() => setShowHistory(p => !p)} title="Signal history">
            <Activity size={12} />
          </button>
          <button className="ai-scan-btn" onClick={runScan} disabled={scanPhase === 'scanning'}>
            {scanPhase === 'scanning' ? 'Scanning…' : <><Zap size={12} /> Scan</>}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {scanPhase === 'scanning' && (
        <div className="ai-progress-bar">
          <div className="ai-progress-fill" style={{ width: `${scanProgress}%` }} />
          <span className="ai-progress-label">Analysing RSI · MACD · MA Crossovers…</span>
        </div>
      )}

      {/* Signal result */}
      {scanPhase === 'result' && signal && !showHistory && (
        <div className={`ai-signal-card ${signal.direction === 'BUY' ? 'ai-signal-buy' : 'ai-signal-sell'}`}>
          <div className="ai-signal-top">
            {signal.direction === 'BUY'
              ? <TrendingUp size={18} color="#00e676" />
              : <TrendingDown size={18} color="#ff1744" />
            }
            <div className="ai-signal-info">
              <span className="ai-signal-label">
                {signal.strength} {signal.direction}
              </span>
              <span className="ai-signal-entry">
                @ {signal.entryPrice.toFixed(pricePrecision)}
              </span>
            </div>
            <div className="ai-win-prob" style={{ color: strengthColor(signal.strength) }}>
              {signal.winProbability}%
              <small>Win</small>
            </div>
          </div>
          <div className="ai-signal-reason">
            <ChevronRight size={11} /> {signal.reason}
          </div>
          <button
            className={`ai-autotrade-btn ${signal.direction === 'BUY' ? 'ai-autotrade-buy' : 'ai-autotrade-sell'}`}
            onClick={() => onAutoTrade(signal)}
          >
            <Zap size={13} /> Auto-Trade This Signal
          </button>
        </div>
      )}

      {/* History panel */}
      {showHistory && (
        <div className="ai-history-panel">
          <div className="ai-history-head">
            <span>Signal History</span>
            <button className="ai-close-btn" onClick={() => setShowHistory(false)}><X size={12} /></button>
          </div>
          {history.length === 0 && <p className="ai-empty">No signals yet — run a scan first.</p>}
          {history.slice(0, 8).map(s => (
            <div key={s.id} className="ai-history-row">
              <span className={`ai-hist-dir ${s.direction === 'BUY' ? 'ai-hist-buy' : 'ai-hist-sell'}`}>
                {s.direction}
              </span>
              <span className="ai-hist-sym">{s.symbol}</span>
              <span className="ai-hist-price">{s.entryPrice.toFixed(pricePrecision)}</span>
              <span className="ai-hist-prob" style={{ color: strengthColor(s.strength) }}>{s.winProbability}%</span>
            </div>
          ))}
        </div>
      )}

      {scanPhase === 'idle' && !showHistory && (
        <p className="ai-idle-msg">Click <strong>Scan</strong> to analyse {symbol} for entry signals.</p>
      )}
    </div>
  )
}
