import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  CandlestickChart,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Settings,
  Pencil,
  Crosshair,
  Sliders,
  Layers,
  MessageSquare,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  Activity,
  Wallet,
  Bell,
  Calendar,
  RotateCcw,
  RotateCw,
  Clock,
  List,
  Newspaper,
  Flame,
  Lightbulb,
  Cloud,
  SlidersHorizontal,
  Check,
  RefreshCw,
  BarChart3,
  ZoomIn,
  ZoomOut,
  SidebarClose,
  SidebarOpen,
  Ruler,
  Move,
  Minus,
  MoveVertical,
  Circle,
  ArrowUpRight,
  Magnet,
  Trash,
  Type,
  Brush,
  FileText,
  Upload,
  Mail,
  Globe,
  Brain,
  Percent,
  Zap,
  LogOut,
  Sun,
  Moon,
  History,
} from 'lucide-react'
import './App.css'
import './features/features.css'
import { TIMEFRAME_TO_MS, getTimeframeVolatility } from './chartTimeframes'
import { supabase, supabaseConfigured } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import AiScanner from './features/AiScanner'
import type { AiSignal } from './features/AiScanner'
import LiveChat from './features/LiveChat'
import FundsHub from './features/FundsHub'
import AuthPortal, { type SignupPayload } from './auth/AuthPortal'
import AdminDashboard from './admin/AdminDashboard'

type View = 'overview' | 'assets' | 'tiers' | 'synthetic' | 'institutions' | 'settings' | 'kyc_hub' | 'profile' | 'wallet' | 'funds' | 'history' | 'help' | 'positions' | 'verification'
type AuthMode = 'login' | 'signup'
type AccountType = 'none' | 'demo' | 'live'
type Theme = 'dark' | 'light' | 'midnight' | 'cyberpunk'
type ChartStyle = 'Candlesticks' | 'Lines' | 'Heikin Ashi' | 'Area' | 'Renko' | 'Kagi'
type VerificationDocumentStatus = 'pending' | 'verified' | 'rejected' | 'local'

type VerificationDocument = {
  id: string
  name: string
  documentType: string
  mimeType: string
  status: VerificationDocumentStatus
  submittedAt: string
}

const formatEATTime = (date = new Date()) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}).format(date)
type Timeframe = '1s' | '5s' | '1m' | '5m' | '15m' | '1h' | '1d'
type ChartRange = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL'
type ChartTool = 'crosshair' | 'trendline' | 'fibonacci' | 'shapes' | 'brush' | 'text' | 'ruler' | 'zoom' | 'magnet' | 'lock' | 'delete' | 'horizontal' | 'vertical' | 'arrow' | 'ellipse' | 'pan'
type ChartPoint = { x: number; y: number }
type ChartDrawing = {
  id: number
  kind: 'trendline' | 'fibonacci' | 'shapes' | 'brush' | 'ruler' | 'horizontal' | 'vertical' | 'arrow' | 'ellipse'
  points: ChartPoint[]
  label?: string
}

const chartRangeCandleCounts: Record<ChartRange, number> = {
  '1D': 24,
  '5D': 42,
  '1M': 60,
  '3M': 84,
  '6M': 120,
  YTD: 144,
  '1Y': 180,
  '5Y': 240,
  ALL: 300,
}

type DepositAddress = {
  id: string
  network: string
  assetName: string
  address: string
  note: string
  enabled?: boolean
}

type DepositRequest = {
  id: string
  user_id: string
  user_email: string
  amount: number
  network: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type OpenPosition = {
  id: number
  symbol: string
  type: 'BUY' | 'SELL'
  lots: number
  openPrice: number
  profit: number
  margin: number
  contractSize: number
  executionNoise?: number
}

type ClosedTrade = {
  id: number
  symbol: string
  type: 'BUY' | 'SELL'
  lots: number
  openPrice: number
  closePrice: number
  pnl: number
  closedAt: string
}

type LoginForm = { email: string; password: string }
type SignupForm = { fullName: string; email: string; phone: string; country: string; password: string; confirmPassword: string }

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'synthetic', label: 'Synthetic', icon: TrendingUp },
  { id: 'positions', label: 'Open Trades', icon: Activity },
  { id: 'tiers', label: 'Investments', icon: CandlestickChart },
  { id: 'funds', label: 'Wallet', icon: Wallet },
  { id: 'history', label: 'History', icon: History },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

const mobileNavItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'synthetic', label: 'Trade', icon: TrendingUp },
  { id: 'positions', label: 'Trades', icon: Activity },
  { id: 'tiers', label: 'Invest', icon: CandlestickChart },
  { id: 'funds', label: 'Wallet', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

const _countryOptions = [
  'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Nigeria', 'Ghana', 'South Africa',
  'United States', 'Canada', 'United Kingdom', 'United Arab Emirates', 'India', 'Germany', 'Japan', 'Other'
]

// COMPREHENSIVE LIVE QUOTES LIST ACROSS FOREX, CRYPTO, QUANTUM SYNTHETICS, COMMODITIES, INDICES
const initialAssetQuotes = [
  { category: 'Metals & Commodities', name: 'Gold Spot / US Dollar', symbol: 'XAU/USD', price: 4154.90, change: '+0.33%', isUp: true, spread: '47.0 pips', high: 4160.00, low: 4142.10 },
  { category: 'Metals & Commodities', name: 'Silver Spot / US Dollar', symbol: 'XAG/USD', price: 31.45, change: '+0.82%', isUp: true, spread: '1.2 pips', high: 32.10, low: 31.02 },
  { category: 'Forex Majors', name: 'Euro / US Dollar', symbol: 'EUR/USD', price: 1.3650, change: '+0.12%', isUp: true, spread: '0.2 pips', high: 1.3690, low: 1.3610 },
  { category: 'Forex Majors', name: 'British Pound / USD', symbol: 'GBP/USD', price: 1.2840, change: '+0.18%', isUp: true, spread: '0.4 pips', high: 1.2890, low: 1.2810 },
  { category: 'Forex Majors', name: 'US Dollar / Japanese Yen', symbol: 'USD/JPY', price: 154.20, change: '-0.05%', isUp: false, spread: '0.3 pips', high: 154.80, low: 153.90 },
  { category: 'Crypto Assets', name: 'Bitcoin / Tether', symbol: 'BTC/USD', price: 92450.80, change: '+3.40%', isUp: true, spread: '1.0 pips', high: 93200.00, low: 89500.00 },
  { category: 'Crypto Assets', name: 'Ethereum / Tether', symbol: 'ETH/USD', price: 3420.15, change: '+2.10%', isUp: true, spread: '0.8 pips', high: 3480.00, low: 3340.00 },
  { category: 'Quantum Synthetics', name: 'Quantum Volatility 10 Index', symbol: 'QUANTUM_VOL_10', price: 1245.20, change: '+0.15%', isUp: true, spread: '0.1 pips', high: 1250.00, low: 1240.00 },
  { category: 'Quantum Synthetics', name: 'Quantum Volatility 25 Index', symbol: 'QUANTUM_VOL_25', price: 2180.60, change: '-0.20%', isUp: false, spread: '0.1 pips', high: 2195.00, low: 2170.00 },
  { category: 'Quantum Synthetics', name: 'Quantum Volatility 50 Index', symbol: 'QUANTUM_VOL_50', price: 3450.80, change: '+0.80%', isUp: true, spread: '0.1 pips', high: 3480.00, low: 3420.00 },
  { category: 'Quantum Synthetics', name: 'Quantum Volatility 75 Index', symbol: 'QUANTUM_VOL_75', price: 8950.40, change: '+1.20%', isUp: true, spread: '0.1 pips', high: 9020.00, low: 8890.00 },
  { category: 'Quantum Synthetics', name: 'Quantum Volatility 100 Index', symbol: 'QUANTUM_VOL_100', price: 4820.50, change: '+1.45%', isUp: true, spread: '0.1 pips', high: 4880.00, low: 4790.00 },
  { category: 'Quantum Crash & Boom', name: 'Crash 300 Index', symbol: 'CRASH 300', price: 6120.30, change: '-1.85%', isUp: false, spread: '0.2 pips', high: 6250.00, low: 6080.00 },
  { category: 'Quantum Crash & Boom', name: 'Crash 500 Index', symbol: 'CRASH 500', price: 4890.10, change: '-0.90%', isUp: false, spread: '0.2 pips', high: 4950.00, low: 4850.00 },
  { category: 'Quantum Crash & Boom', name: 'Boom 500 Index', symbol: 'BOOM 500', price: 5410.80, change: '+2.10%', isUp: true, spread: '0.2 pips', high: 5480.00, low: 5350.00 },
  { category: 'Quantum Crash & Boom', name: 'Boom 1000 Index', symbol: 'BOOM 1000', price: 11240.50, change: '+1.75%', isUp: true, spread: '0.2 pips', high: 11350.00, low: 11120.00 },
  { category: 'Global Stock Indices', name: 'S&P 500 Index', symbol: 'US500', price: 5850.20, change: '+0.55%', isUp: true, spread: '0.5 pips', high: 5880.00, low: 5820.00 },
  { category: 'Global Stock Indices', name: 'Nasdaq 100 Index', symbol: 'NAS100', price: 20450.60, change: '+0.92%', isUp: true, spread: '0.8 pips', high: 20600.00, low: 20300.00 },
]

const investmentCoinTiers = [
  { id: 'ALPHA', name: 'Alpha Growth', symbol: 'ALPHA/USD', minInvestment: 50, maxInvestment: 10000, minReturn: 30, maxReturn: 150, durationDays: 21, risk: 'Low' },
  { id: 'BETA', name: 'Beta Momentum', symbol: 'BETA/USD', minInvestment: 100, maxInvestment: 25000, minReturn: 35, maxReturn: 180, durationDays: 21, risk: 'Moderate' },
  { id: 'GAMMA', name: 'Gamma Accel', symbol: 'GAMMA/USD', minInvestment: 250, maxInvestment: 50000, minReturn: 40, maxReturn: 210, durationDays: 21, risk: 'Growth' },
  { id: 'DELTA', name: 'Delta Breakout', symbol: 'DELTA/USD', minInvestment: 500, maxInvestment: 100000, minReturn: 45, maxReturn: 250, durationDays: 21, risk: 'Active' },
  { id: 'OMEGA', name: 'Omega Prime', symbol: 'OMEGA/USD', minInvestment: 1000, maxInvestment: 250000, minReturn: 50, maxReturn: 300, durationDays: 21, risk: 'Elite' },
] as const

const initialLoginForm: LoginForm = { email: '', password: '' }
const initialSignupForm: SignupForm = { fullName: '', email: '', phone: '', country: 'Kenya', password: '', confirmPassword: '' }

const defaultAdminAddresses: DepositAddress[] = [
  { id: 'addr-usdt-trc20', network: 'USDT-TRC20', assetName: 'Tether (USDT TRON)', address: 'TQAQAWyR1LH83A6V5ZanfokC6wjApdfc5q', note: 'Send USDT on TRON (TRC-20) network only.', enabled: true },
  { id: 'addr-eth', network: 'ETH', assetName: 'Ethereum (ETH)', address: '0x9bAfa7af80d50b4Ac3D8489AC7EE17547Cadec0d', note: 'Send ETH on Ethereum (ERC-20) mainnet.', enabled: true },
  { id: 'addr-btc', network: 'BTC', assetName: 'Bitcoin (BTC)', address: 'bc1pmw96zsq7qn4y5spfferdszyzj503z4rjylzlyncvykzyy9exqvds8r7pm9', note: 'Send BTC over Native Bitcoin mainnet.', enabled: true },
]

function createInitialCandles(
  symbolSeed: number,
  timeframeSeed: number,
  rangeSeed: number,
  timeframe: Timeframe,
  priceUnit: number,
  anchorPrice: number,
  candleCount: number,
) {
  const candleVolatility = priceUnit * getTimeframeVolatility(timeframe) * (8 + Math.log2(candleCount / 24 + 1) * 3)
  let previousClose = anchorPrice
  const history = Array.from({ length: candleCount }, (_, index) => {
    const marketTrend = Math.sin(index * 0.75 + symbolSeed * 0.33 + timeframeSeed * 0.21 + rangeSeed * 0.15)
    const open = previousClose
    const bodyMultiplier = 0.3 + Math.abs(Math.sin(index * 1.5 + symbolSeed)) * 2.2
    const close = open + marketTrend * candleVolatility * 0.5 + (Math.random() - 0.49) * candleVolatility * bodyMultiplier
    const upperWick = candleVolatility * (0.1 + Math.random() * 1.8)
    const lowerWick = candleVolatility * (0.1 + Math.random() * 1.8)
    previousClose = close
    return {
      open,
      high: Math.max(open, close) + upperWick,
      low: Math.min(open, close) - lowerWick,
      close,
    }
  })
  const priceOffset = anchorPrice - history[history.length - 1].close
  return history.map((candle) => ({
    open: candle.open + priceOffset,
    high: candle.high + priceOffset,
    low: candle.low + priceOffset,
    close: candle.close + priceOffset,
  }))
}

/* REAL-TIME CANDLESTICK CHART COMPONENT WITH DYNAMIC REAL-TIME BUY/SELL PIPS */
function TradingViewCandlestickCanvas({
  symbol,
  chartStyle,
  timeframe,
  dateRange = '1D',
  tool = 'crosshair',
  magnetEnabled = false,
  drawingsLocked = false,
  clearSignal = 0,
  showTradeBox = true,
  isMini = false,
  indicators,
  onExecuteTrade,
  hasEntryBarrier = false,
  entryPrice = 4154.430,
}: {
  symbol: string
  chartStyle: ChartStyle
  timeframe: Timeframe
  dateRange?: ChartRange
  tool?: ChartTool
  magnetEnabled?: boolean
  drawingsLocked?: boolean
  clearSignal?: number
  showTradeBox?: boolean
  isMini?: boolean
  indicators: { macd: boolean; rsi: boolean; vwma: boolean; bollinger: boolean }
  onExecuteTrade?: (isBuy: boolean, quotePrice?: number) => void
  hasEntryBarrier?: boolean
  entryPrice?: number
}) {
  const symbolSeed = Array.from(symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const timeframeSeed = Array.from(timeframe).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const rangeSeed = Array.from(dateRange).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const candleCount = chartRangeCandleCounts[dateRange]
  const assetQuote = initialAssetQuotes.find((quote) => quote.symbol === symbol)
  const basePrice = assetQuote?.price ?? 4145 + (symbolSeed % 17) * 1.8
  const isForex = assetQuote?.category === 'Forex Majors'
  const pricePrecision = isForex ? (symbol.endsWith('JPY') ? 3 : 5) : 2
  const pipSize = isForex
    ? symbol.endsWith('JPY') ? 0.01 : 0.0001
    : symbol.includes('XAG') ? 0.001 : 0.01
  const spread = Number.parseFloat(assetQuote?.spread ?? '1') * pipSize
  const priceUnit = isForex ? pipSize : Math.max(basePrice * 0.0001, 0.0001)

  const [candles, setCandles] = useState<{ open: number; high: number; low: number; close: number }[]>(() =>
    createInitialCandles(symbolSeed, timeframeSeed, rangeSeed, timeframe, priceUnit, basePrice, candleCount)
  )

  const marketProfile = symbol.toUpperCase().includes('VOL') || symbol.toUpperCase().includes('CRASH') || symbol.toUpperCase().includes('BOOM')
    ? 'synthetic'
    : symbol.toUpperCase().includes('BTC') || symbol.toUpperCase().includes('ETH')
      ? 'crypto'
      : 'fx'

  // Interactive Zoom & Pan State
  const [zoomScale, setZoomScale] = useState(1.0)
  const [panX, setPanX] = useState(0)

  const trendRef = useRef(0)
  const candleTicksRef = useRef(0)
  const currentSymbolRef = useRef(symbol)
  const drawingIdRef = useRef(0)
  const draggingDrawingRef = useRef<number | null>(null)
  const panStartRef = useRef<{ x: number; panX: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [drawingState, setDrawingState] = useState<{ clearSignal: number; drawings: ChartDrawing[] }>({ clearSignal, drawings: [] })
  const drawings = drawingState.clearSignal === clearSignal ? drawingState.drawings : []
  const [cursorPoint, setCursorPoint] = useState<ChartPoint | null>(null)
  const updateDrawings = (update: (current: ChartDrawing[]) => ChartDrawing[]) => setDrawingState((current) => ({
    clearSignal,
    drawings: update(current.clearSignal === clearSignal ? current.drawings : []),
  }))

  useEffect(() => {
    const symbolChanged = currentSymbolRef.current !== symbol
    currentSymbolRef.current = symbol
    trendRef.current = 0
    candleTicksRef.current = 0
    setCandles((current) => createInitialCandles(
      symbolSeed,
      timeframeSeed,
      rangeSeed,
      timeframe,
      priceUnit,
      symbolChanged ? basePrice : current[current.length - 1]?.close ?? basePrice,
      candleCount,
    ))
  }, [symbol, timeframe, dateRange, basePrice, symbolSeed, timeframeSeed, rangeSeed, priceUnit, candleCount])

  useEffect(() => {
    const candleDurationMs = TIMEFRAME_TO_MS[timeframe] ?? TIMEFRAME_TO_MS['1m']
    const tickMs = Math.max(100, Math.min(1000, candleDurationMs / 60))
    const ticksPerCandle = Math.max(1, Math.round(candleDurationMs / tickMs))
    const volatilityScale = priceUnit * getTimeframeVolatility(timeframe) * 8 / Math.sqrt(ticksPerCandle)
    candleTicksRef.current = 0

    const timer = setInterval(() => {
      candleTicksRef.current += 1
      const startsNextCandle = candleTicksRef.current >= ticksPerCandle
      if (startsNextCandle) candleTicksRef.current = 0

      setCandles((curr) => {
        const last = curr[curr.length - 1] ?? { open: 4154.00, high: 4158.00, low: 4150.00, close: 4154.72 }
        const pressureWave = Math.sin(candleTicksRef.current * 1.7 + symbolSeed) * volatilityScale * 2.4
        const marketPulse = marketProfile === 'synthetic'
          ? (Math.random() - 0.5) * 4.2 * volatilityScale
          : marketProfile === 'crypto'
            ? (Math.random() - 0.5) * 3.2 * volatilityScale
            : (Math.random() - 0.5) * 2.4 * volatilityScale
        const impulse = Math.random() < (marketProfile === 'synthetic' ? 0.24 : 0.16)
          ? (Math.random() > 0.5 ? 1 : -1) * volatilityScale * (2.1 + Math.random() * 4.4)
          : 0
        const counterPressure = (last.open - last.close) * 0.42
        const fullMove = Math.max(-6.1 * volatilityScale, Math.min(6.1 * volatilityScale,
          trendRef.current * 0.2 + pressureWave + marketPulse + counterPressure + impulse * 1.35))
        trendRef.current = fullMove

        const close = last.close + fullMove + (Math.random() - 0.5) * 1.8 * volatilityScale
        const wickSize = 0.4 + Math.random() * (1.2 + volatilityScale * 1.5)
        const high = Math.max(last.high, close + wickSize)
        const low = Math.min(last.low, close - wickSize)

        if (startsNextCandle) {
          const nextOpen = close
          return [...curr.slice(1), { open: nextOpen, high: nextOpen, low: nextOpen, close: nextOpen }]
        }

        return [...curr.slice(0, -1), { ...last, high, low, close }]
      })
    }, tickMs)

    return () => clearInterval(timer)
  }, [symbol, timeframe, symbolSeed, marketProfile, priceUnit])

  const handleZoomIn = () => setZoomScale(z => Math.min(3.0, z + 0.25))
  const handleZoomOut = () => setZoomScale(z => Math.max(0.6, z - 0.25))
  const handleResetZoom = () => { setZoomScale(1.0); setPanX(0) }

  const allLows = candles.map(c => c.low)
  const allHighs = candles.map(c => c.high)
  const min = Math.min(...allLows)
  const max = Math.max(...allHighs)
  const range = max - min || 1

  const currentCandle = candles[candles.length - 1] ?? { open: 4147.695, high: 4148.475, low: 4146.970, close: 4154.720 }

  // Live Dynamic Buy & Sell Pips
  const liveAskBuyPrice = currentCandle.close
  const liveBidSellPrice = currentCandle.close - spread
  const liveSpreadPips = (spread / pipSize).toFixed(1)

  // Spacing & Mapping across 580x240 SVG viewbox (510px max X ensures the newest candle is 100% visible before the price axis)
  const maxChartX = isMini ? 525 : 510
  const minChartX = 15
  const availableWidth = maxChartX - minChartX
  const candleSpacing = availableWidth / Math.max(1, candles.length - 1)
  const candleX = (index: number) => maxChartX - (candles.length - 1 - index) * candleSpacing * zoomScale + panX
  const vwmaPoints = candles.map((c, i) => `${candleX(i)},${225 - (((c.open + c.close) / 2 - min) / range) * 210}`).join(' ')

  const linePoints = candles.map((c, i) => `${candleX(i)},${225 - ((c.close - min) / range) * 210}`)
  const linePathD = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p}`).join(' ')
  const areaPathD = `${linePathD} L ${candleX(candles.length - 1)},235 L ${candleX(0)},235 Z`

  const pointFromEvent = (event: ReactPointerEvent<SVGSVGElement>): ChartPoint => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = {
      x: Math.max(0, Math.min(580, ((event.clientX - bounds.left) / bounds.width) * 580)),
      y: Math.max(0, Math.min(240, ((event.clientY - bounds.top) / bounds.height) * 240)),
    }
    if (!magnetEnabled) return point

    const nearestIndex = candles.reduce((closest, _candle, index) =>
      Math.abs(candleX(index) - point.x) < Math.abs(candleX(closest) - point.x) ? index : closest, 0)
    const snappedCandle = candles[nearestIndex]
    const candlePrices = [snappedCandle.open, snappedCandle.high, snappedCandle.low, snappedCandle.close]
    const nearestPrice = candlePrices.reduce((closest, price) =>
      Math.abs(225 - ((price - min) / range) * 210 - point.y) < Math.abs(225 - ((closest - min) / range) * 210 - point.y) ? price : closest, candlePrices[0])
    return { x: candleX(nearestIndex), y: 225 - ((nearestPrice - min) / range) * 210 }
  }

  const handleChartPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event)
    setCursorPoint(point)
    if (tool === 'crosshair') return
    if (tool === 'pan') {
      panStartRef.current = { x: point.x, panX }
      setIsPanning(true)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (drawingsLocked) return

    if (tool === 'horizontal' || tool === 'vertical') {
      updateDrawings((current) => [...current, { id: ++drawingIdRef.current, kind: tool, points: [point, point] }])
      return
    }

    if (tool === 'text') {
      const label = window.prompt('Enter chart annotation')?.trim()
      if (label) updateDrawings((current) => [...current, { id: ++drawingIdRef.current, kind: 'shapes', points: [point], label }])
      return
    }

    if (!['trendline', 'fibonacci', 'shapes', 'brush', 'ruler', 'zoom', 'arrow', 'ellipse'].includes(tool)) return
    const drawingKinds: Partial<Record<ChartTool, ChartDrawing['kind']>> = {
      trendline: 'trendline',
      fibonacci: 'fibonacci',
      shapes: 'shapes',
      brush: 'brush',
      ruler: 'ruler',
      arrow: 'arrow',
      ellipse: 'ellipse',
    }
    const kind = tool === 'zoom' ? 'shapes' : drawingKinds[tool]
    if (!kind) return
    const drawing: ChartDrawing = { id: ++drawingIdRef.current, kind, points: [point, point] }
    draggingDrawingRef.current = drawing.id
    updateDrawings((current) => [...current, drawing])
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleChartPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event)
    setCursorPoint(point)
    if (panStartRef.current) {
      setPanX(panStartRef.current.panX + point.x - panStartRef.current.x)
      return
    }
    const drawingId = draggingDrawingRef.current
    if (drawingId === null) return
    updateDrawings((current) => current.map((drawing) => {
      if (drawing.id !== drawingId) return drawing
      if (drawing.kind === 'brush') return { ...drawing, points: [...drawing.points, point] }
      return { ...drawing, points: [drawing.points[0], point] }
    }))
  }

  const handleChartPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (panStartRef.current) {
      panStartRef.current = null
      setIsPanning(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    const drawingId = draggingDrawingRef.current
    if (drawingId === null) return
    const drawing = drawings.find((item) => item.id === drawingId)
    if (tool === 'zoom' && drawing) {
      const [start, end] = drawing.points
      const selectedWidth = Math.abs(end.x - start.x)
      if (selectedWidth > 12) {
        const factor = Math.min(3, Math.max(1, 580 / selectedWidth))
        const nextZoom = Math.min(3, zoomScale * factor)
        const centerX = (start.x + end.x) / 2
        setZoomScale(nextZoom)
        setPanX(290 - 545 + ((545 + panX - centerX) / zoomScale) * nextZoom)
      }
      updateDrawings((current) => current.filter((item) => item.id !== drawingId))
    }
    draggingDrawingRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // Touch Pinch-to-Zoom Handler
  const touchStartDistRef = useRef<number | null>(null)
  const initialZoomRef = useRef(1.0)

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchStartDistRef.current = dist
      initialZoomRef.current = zoomScale
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / touchStartDistRef.current
      const nextZoom = Math.max(0.6, Math.min(3.5, initialZoomRef.current * factor))
      setZoomScale(nextZoom)
    }
  }

  const handleTouchEnd = () => {
    touchStartDistRef.current = null
  }

  // Price Axis Ticks Calculation
  const tickCount = isMini ? 4 : 7
  const step = range / Math.max(1, tickCount - 1)
  const priceTicks = Array.from({ length: tickCount }, (_, i) => max - i * step)

  return (
    <div className={`candlestick-chart-box ${isMini ? 'mini-preview' : ''}`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Floating Interactive Canvas Zoom & Pan Control Bar */}
      {!isMini && (
        <div className="tv-floating-zoom-controls">
          <button type="button" className="zoom-btn" title="Zoom In (+)" onClick={handleZoomIn}><ZoomIn size={14} /></button>
          <button type="button" className="zoom-btn" title="Zoom Out (-)" onClick={handleZoomOut}><ZoomOut size={14} /></button>
          <button type="button" className="zoom-btn" title="Reset Zoom" onClick={handleResetZoom}>↺</button>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-code)', padding: '0 4px' }}>
            {Math.round(zoomScale * 100)}% Zoom
          </span>
        </div>
      )}

      {showTradeBox && (
        <div className="tv-embedded-trade-box">
          <button type="button" className="tv-sell-btn-box" onClick={() => onExecuteTrade && onExecuteTrade(false, currentCandle.close)}>
            <span>{liveBidSellPrice.toFixed(pricePrecision)}</span>
            <small style={{ fontSize: '9px' }}>SELL</small>
          </button>
          <span className="tv-spread-tag">{liveSpreadPips}</span>
          <button type="button" className="tv-buy-btn-box" onClick={() => onExecuteTrade && onExecuteTrade(true, currentCandle.close)}>
            <span>{liveAskBuyPrice.toFixed(pricePrecision)}</span>
            <small style={{ fontSize: '9px' }}>BUY</small>
          </button>
        </div>
      )}

      <svg
        viewBox="0 0 580 240"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', minHeight: isMini ? '0px' : '220px', touchAction: 'pan-y pinch-zoom', cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : tool === 'text' ? 'text' : 'crosshair' }}
        onPointerDown={handleChartPointerDown}
        onPointerMove={handleChartPointerMove}
        onPointerUp={handleChartPointerUp}
        onPointerLeave={() => setCursorPoint(null)}
      >
        <defs>
          <linearGradient id={`chartAreaGrad-${symbolSeed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e676" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#00e676" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Dotted Price Grid Lines */}
        <line x1="0" y1="60" x2="580" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
        <line x1="0" y1="120" x2="580" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
        <line x1="0" y1="180" x2="580" y2="180" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

        {/* Vertical Time Dotted Lines */}
        <line x1="180" y1="0" x2="180" y2="240" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />

        {/* Animated Entry Spot Cyan Barrier Line */}
        {hasEntryBarrier && (
          <>
            <line x1="0" y1="95" x2="580" y2="95" stroke="var(--neon-cyan)" strokeWidth="2" strokeDasharray="5" />
            <text x="320" y="90" fill="var(--neon-cyan)" fontSize="10" fontWeight="800">
              Entry Spot Barrier: ${entryPrice.toFixed(pricePrecision)}
            </text>
          </>
        )}

        {/* VWMA Moving Average Smooth Blue Line Overlay */}
        {indicators.vwma && (
          <path d={`M ${vwmaPoints}`} stroke="#2979ff" strokeWidth="1.8" fill="none" opacity="0.85" />
        )}

        {/* Bollinger Bands Overlay */}
        {indicators.bollinger && (
          <>
            <line x1="0" y1="40" x2="580" y2="40" stroke="var(--neon-cyan)" strokeDasharray="2" opacity="0.6" />
            <line x1="0" y1="190" x2="580" y2="190" stroke="var(--neon-cyan)" strokeDasharray="2" opacity="0.6" />
          </>
        )}

        {/* Real-time horizontal price tracking line */}
        {currentCandle && (
          <line
            x1="0"
            y1={225 - ((currentCandle.close - min) / range) * 210}
            x2="580"
            y2={225 - ((currentCandle.close - min) / range) * 210}
            stroke={currentCandle.close >= currentCandle.open ? 'var(--bull-green)' : 'var(--bear-red)'}
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.85"
          />
        )}

        {/* Candlesticks Rendering with Dynamic Zooming Scaling */}
        {chartStyle === 'Candlesticks' || chartStyle === 'Heikin Ashi' || chartStyle === 'Renko' ? (
          candles.map((c, i) => {
            const isBull = c.close >= c.open
            const isLiveCandle = i === candles.length - 1
            const x = candleX(i)
            const trendMix = Math.sin(i * 1.7 + symbolSeed) * 1.6
            const bodyVariance = 4.5 + ((trendMix + 2) * 2.4)
            const candleWidth = Math.min(Math.max(1.1, bodyVariance * zoomScale), Math.max(1.2, candleSpacing * 0.68 * zoomScale))
            const yHigh = 225 - ((c.high - min) / range) * 210
            const yLow = 225 - ((c.low - min) / range) * 210
            const yOpen = 225 - ((c.open - min) / range) * 210
            const yClose = 225 - ((c.close - min) / range) * 210
            const yBody = Math.min(yOpen, yClose)
            const hBody = Math.max(3, Math.abs(yOpen - yClose))
            const wickWidth = 1.2 + ((i + symbolSeed) % 3) * 0.38
            const fillOpacity = 0.72 + ((i + symbolSeed) % 5) * 0.06
            const isDoji = Math.abs(c.close - c.open) < 0.35
            const isContinuation = i % 5 === 0 && !isDoji
            const liveGlow = isLiveCandle ? 1.5 : 1

            return (
              <g key={i}>
                <line x1={x + candleWidth / 2} y1={yHigh} x2={x + candleWidth / 2} y2={yLow} stroke={isBull ? 'var(--bull-green)' : 'var(--bear-red)'} strokeWidth={wickWidth * liveGlow} opacity={isLiveCandle ? 1 : 0.8} />

                {isDoji ? (
                  <line
                    x1={x + candleWidth * 0.2}
                    y1={yOpen}
                    x2={x + candleWidth * 1.2}
                    y2={yClose}
                    stroke={isBull ? 'var(--bull-green)' : 'var(--bear-red)'}
                    strokeWidth={Math.max(1.5, candleWidth * 0.52) * liveGlow}
                    opacity={isLiveCandle ? 1 : fillOpacity}
                  />
                ) : (
                  <rect
                    x={x}
                    y={yBody}
                    width={candleWidth}
                    height={hBody}
                    fill={isBull ? 'var(--bull-green)' : 'var(--bear-red)'}
                    rx={i % 3 === 0 ? 2 : i % 3 === 1 ? 1.2 : 0.8}
                    opacity={isLiveCandle ? 1 : fillOpacity}
                    stroke={isLiveCandle ? 'rgba(255,255,255,0.7)' : 'none'}
                    strokeWidth={isLiveCandle ? 0.8 : 0}
                  />
                )}

                {isContinuation && !isDoji && (
                  <line
                    x1={x + candleWidth * 0.65}
                    y1={Math.min(yOpen, yClose) + 4}
                    x2={x + candleWidth * 1.28}
                    y2={Math.min(yOpen, yClose) + 10}
                    stroke={isBull ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)'}
                    strokeWidth="0.9"
                  />
                )}
              </g>
            )
          })
        ) : (
          /* Line / Area Chart View */
          <g key="line-area-chart">
            {chartStyle === 'Area' && (
              <path d={areaPathD} fill={`url(#chartAreaGrad-${symbolSeed})`} />
            )}
            <path d={linePathD} stroke="var(--mint-teal)" strokeWidth="2" fill="none" />
          </g>
        )}

        {drawings.map((drawing) => {
          const [start, end = start] = drawing.points
          if (drawing.label) return <text key={drawing.id} x={start.x + 5} y={start.y - 5} fill="#f8fafc" fontSize="11">{drawing.label}</text>
          if (drawing.kind === 'horizontal') return <line key={drawing.id} x1="0" y1={start.y} x2="580" y2={start.y} stroke="#60a5fa" strokeWidth="1.5" />
          if (drawing.kind === 'vertical') return <line key={drawing.id} x1={start.x} y1="0" x2={start.x} y2="240" stroke="#60a5fa" strokeWidth="1.5" />
          if (drawing.kind === 'trendline' || drawing.kind === 'ruler') {
            const priceDelta = Math.abs(((start.y - end.y) / 210) * range)
            return (
              <g key={drawing.id}>
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={drawing.kind === 'ruler' ? '#fbbf24' : '#60a5fa'} strokeWidth="1.5" strokeDasharray={drawing.kind === 'ruler' ? '4 3' : undefined} />
                {drawing.kind === 'ruler' && <text x={(start.x + end.x) / 2 + 5} y={(start.y + end.y) / 2 - 5} fill="#fbbf24" fontSize="10">{priceDelta.toFixed(pricePrecision)}</text>}
              </g>
            )
          }
          if (drawing.kind === 'arrow') {
            const angle = Math.atan2(end.y - start.y, end.x - start.x)
            const left = { x: end.x - 10 * Math.cos(angle - 0.45), y: end.y - 10 * Math.sin(angle - 0.45) }
            const right = { x: end.x - 10 * Math.cos(angle + 0.45), y: end.y - 10 * Math.sin(angle + 0.45) }
            return <g key={drawing.id}><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#60a5fa" strokeWidth="1.5" /><polygon points={`${end.x},${end.y} ${left.x},${left.y} ${right.x},${right.y}`} fill="#60a5fa" /></g>
          }
          if (drawing.kind === 'ellipse') {
            return <ellipse key={drawing.id} cx={(start.x + end.x) / 2} cy={(start.y + end.y) / 2} rx={Math.abs(end.x - start.x) / 2} ry={Math.abs(end.y - start.y) / 2} fill="rgba(96,165,250,0.12)" stroke="#60a5fa" strokeWidth="1.5" />
          }
          if (drawing.kind === 'fibonacci') {
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
            return <g key={drawing.id}>{levels.map((level) => {
              const y = start.y + (end.y - start.y) * level
              return <g key={level}><line x1={Math.min(start.x, end.x)} y1={y} x2={Math.max(start.x, end.x)} y2={y} stroke="#fbbf24" strokeWidth="1" opacity="0.8" /><text x={Math.max(start.x, end.x) + 3} y={y + 3} fill="#fbbf24" fontSize="8">{(level * 100).toFixed(1)}%</text></g>
            })}</g>
          }
          if (drawing.kind === 'brush') {
            return <polyline key={drawing.id} points={drawing.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          }
          return <rect key={drawing.id} x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={Math.abs(end.x - start.x)} height={Math.abs(end.y - start.y)} fill="rgba(96,165,250,0.12)" stroke="#60a5fa" strokeWidth="1.5" />
        })}

        {tool === 'crosshair' && cursorPoint && (
          <g pointerEvents="none">
            <line x1={cursorPoint.x} y1="0" x2={cursorPoint.x} y2="240" stroke="rgba(203,213,225,0.65)" strokeDasharray="3 3" />
            <line x1="0" y1={cursorPoint.y} x2="580" y2={cursorPoint.y} stroke="rgba(203,213,225,0.65)" strokeDasharray="3 3" />
          </g>
        )}
      </svg>

      {/* Professional Right-Hand Price Axis Scale Column */}
      <div className="chart-price-axis-scale">
        {priceTicks.map((p, idx) => (
          <span key={idx} className="price-axis-tick">{p.toFixed(pricePrecision)}</span>
        ))}
        <div className="price-axis-live-badge">
          {currentCandle.close.toFixed(pricePrecision)}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [activeView, setActiveView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').trim()
      const validViews: View[] = ['overview', 'assets', 'tiers', 'synthetic', 'institutions', 'settings', 'kyc_hub', 'profile', 'wallet', 'funds', 'help', 'positions', 'verification', 'history']
      if (validViews.includes(hash as View)) return hash as View
      const saved = localStorage.getItem('app_active_view') as View | null
      if (saved && validViews.includes(saved)) return saved
    }
    return 'synthetic'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = activeView
      localStorage.setItem('app_active_view', activeView)
    }
  }, [activeView])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim() as View
      const validViews: View[] = ['overview', 'assets', 'tiers', 'synthetic', 'institutions', 'settings', 'kyc_hub', 'profile', 'wallet', 'funds', 'help', 'positions', 'verification', 'history']
      if (validViews.includes(hash)) {
        setActiveView(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  const [previousView, setPreviousView] = useState<View>('synthetic')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [modal, setModal] = useState<'deposit' | 'withdraw' | 'pine_script' | 'indicator_menu' | 'order' | 'create_demo' | 'trade_outcome' | 'withdrawal_success' | null>(null)
  const [tradeOutcomeResult, setTradeOutcomeResult] = useState<{ symbol: string; pnl: number; type: string } | null>(null)
  const [withdrawalSuccessData, setWithdrawalSuccessData] = useState<{ amount: number; gateway: string } | null>(null)
  const [amount, setAmount] = useState('500')
  const [withdrawAmount] = useState('100')
  const [selectedNetwork, setSelectedNetwork] = useState('USDT-TRC20')
  const [notice, setNotice] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [_authMode, setAuthMode] = useState<AuthMode>('login')
  const [_showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm)
  const [signupForm, setSignupForm] = useState<SignupForm>(initialSignupForm)

  // Account Mode State (LIVE vs DEMO) with persistent local storage
  const [accountType, setAccountType] = useState<AccountType>(() => {
    const saved = (localStorage.getItem('nexsmarkets_account_type') || localStorage.getItem('exstrade_account_type')) as AccountType | null
    return (saved === 'live') ? 'live' : 'demo'
  })
  const [demoAccountName, setDemoAccountName] = useState(() => {
    return localStorage.getItem('nexsmarkets_demo_name') || localStorage.getItem('exstrade_demo_name') || 'Demo Account'
  })
  const [demoStartingBalance, setDemoStartingBalance] = useState(10000)
  const [demoBalance, setDemoBalance] = useState<number>(() => {
    const saved = localStorage.getItem('nexsmarkets_demo_balance') || localStorage.getItem('exstrade_demo_balance')
    if (saved !== null && Number.isFinite(Number(saved))) return Number(saved)
    return 10000
  })
  const [liveBalance, setLiveBalance] = useState<number>(() => {
    const saved = localStorage.getItem('nexsmarkets_live_balance') || localStorage.getItem('exstrade_live_balance')
    if (saved !== null && Number.isFinite(Number(saved))) return Number(saved)
    return 0.00
  })
  const [liveAccountCreated, setLiveAccountCreated] = useState<boolean>(() => {
    return (localStorage.getItem('nexsmarkets_live_account_created') || localStorage.getItem('exstrade_live_account_created')) === 'true'
  })
  const syntheticTerminalRef = useRef<HTMLIFrameElement>(null)

  // Persist balances, account mode, open positions, and closed trades across view navigation and sessions
  useEffect(() => {
    localStorage.setItem('nexsmarkets_demo_balance', String(demoBalance))
  }, [demoBalance])

  useEffect(() => {
    localStorage.setItem('nexsmarkets_live_balance', String(liveBalance))
  }, [liveBalance])

  useEffect(() => {
    localStorage.setItem('nexsmarkets_account_type', accountType)
  }, [accountType])

  useEffect(() => {
    if (demoAccountName) localStorage.setItem('nexsmarkets_demo_name', demoAccountName)
  }, [demoAccountName])

  useEffect(() => {
    localStorage.setItem('nexsmarkets_live_account_created', String(liveAccountCreated))
  }, [liveAccountCreated])

  // Multi-wallet balances
  // type WalletKey = 'main' | 'synthetic' | 'liveMarket'
  const [walletBalances, setWalletBalances] = useState({ main: 0, synthetic: 0, liveMarket: 0 })

  // Market mode: synthetic vs live
  const [marketMode, setMarketMode] = useState<'synthetic' | 'live'>('synthetic')

  // AI Scanner
  const [aiScannerOpen, setAiScannerOpen] = useState(false)

  // KYC prompt — show once per session if user has no submitted documents
  const [kycPromptDismissed, setKycPromptDismissed] = useState(false)

  // Close search popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Comprehensive System-Wide Search Items
  const searchPages = [
    { id: 'p-overview', title: 'Overview Dashboard', desc: 'Main trading dashboard & portfolio summary', view: 'overview' as View, icon: LayoutDashboard },
    { id: 'p-synthetic', title: 'Synthetic Trading', desc: '1s Synthetic indices & contract trading terminal', view: 'synthetic' as View, icon: TrendingUp },
    { id: 'p-tiers', title: 'Investments & Plans', desc: '21-day yield curve investment tiers', view: 'tiers' as View, icon: CandlestickChart },
    { id: 'p-wallet', title: 'Wallet & Treasury', desc: 'M-Pesa & Crypto deposits (+50% Bonus), withdrawals', view: 'wallet' as View, icon: Wallet },
    { id: 'p-positions', title: 'Open Positions & History', desc: 'Active running trades and P&L history', view: 'positions' as View, icon: Clock },
    { id: 'p-profile', title: 'Profile & Verification', desc: 'User identity KYC verification & settings', view: 'profile' as View, icon: UserRound },
    { id: 'p-settings', title: 'Admin Dashboard', desc: 'Platform management and audit controls', view: 'settings' as View, icon: Settings },
    { id: 'p-institutions', title: 'Institutions', desc: 'Institutional liquidity and accounts', view: 'institutions' as View, icon: Globe },
    { id: 'p-help', title: 'Help & Live Support', desc: 'Guides, FAQs, and live support desk', view: 'help' as View, icon: Lightbulb },
  ]

  const searchAssets = [
    { id: 'a-vol25', title: 'Volatility 25 (1s) Index', desc: 'Synthetic index 1s ticks', asset: 'Volatility 25 (1s) Index', badge: 'Synthetic' },
    { id: 'a-vol10', title: 'Volatility 10 (1s) Index', desc: 'Synthetic index 1s ticks', asset: 'Volatility 10 (1s) Index', badge: 'Synthetic' },
    { id: 'a-vol50', title: 'Volatility 50 (1s) Index', desc: 'Synthetic index 1s ticks', asset: 'Volatility 50 (1s) Index', badge: 'Synthetic' },
    { id: 'a-vol75', title: 'Volatility 75 (1s) Index', desc: 'Synthetic index 1s ticks', asset: 'Volatility 75 (1s) Index', badge: 'Synthetic' },
    { id: 'a-vol100', title: 'Volatility 100 (1s) Index', desc: 'Synthetic index 1s ticks', asset: 'Volatility 100 (1s) Index', badge: 'Synthetic' },
    { id: 'a-crash500', title: 'Crash 500 Index', desc: 'Synthetic spike & crash market', asset: 'Crash 500 Index', badge: 'Synthetic' },
    { id: 'a-boom500', title: 'Boom 500 Index', desc: 'Synthetic spike & boom market', asset: 'Boom 500 Index', badge: 'Synthetic' },
    { id: 'a-eurusd', title: 'EUR/USD', desc: 'Euro / US Dollar', asset: 'EUR/USD', badge: 'Forex' },
    { id: 'a-gbpusd', title: 'GBP/USD', desc: 'British Pound / US Dollar', asset: 'GBP/USD', badge: 'Forex' },
    { id: 'a-usdjpy', title: 'USD/JPY', desc: 'US Dollar / Japanese Yen', asset: 'USD/JPY', badge: 'Forex' },
    { id: 'a-btcusd', title: 'BTC/USD', desc: 'Bitcoin / US Dollar', asset: 'BTC/USD', badge: 'Crypto' },
    { id: 'a-ethusd', title: 'ETH/USD', desc: 'Ethereum / US Dollar', asset: 'ETH/USD', badge: 'Crypto' },
    { id: 'a-xauusd', title: 'Gold (XAU/USD)', desc: 'Gold Spot / US Dollar', asset: 'XAU/USD', badge: 'Commodity' },
  ]

  const searchActions = [
    { id: 'c-deposit', title: 'Deposit Funds (+50% Bonus)', desc: 'Deposit M-Pesa or Crypto to Real Account', action: () => changeView('wallet'), icon: Plus },
    { id: 'c-withdraw', title: 'Withdraw Funds', desc: 'Submit withdrawal request', action: () => changeView('wallet'), icon: Wallet },
    { id: 'c-demo', title: 'Create Demo Account', desc: 'Configure virtual practice balance', action: () => setModal('create_demo'), icon: Plus },
    { id: 'c-indicators', title: 'Technical Indicators Library', desc: 'VWMA, MACD, RSI, Bollinger Bands', action: () => setModal('indicator_menu'), icon: Sliders },
    { id: 'c-theme', title: 'Toggle Dark / Light Theme', desc: 'Switch system-wide appearance theme', action: () => toggleTheme(), icon: Sun },
    { id: 'c-kyc', title: 'Verify Identity & KYC', desc: 'Submit government ID & proof of address', action: () => changeView('profile'), icon: ShieldCheck },
  ]

  // Filter Search Results
  const cleanQuery = searchQuery.trim().toLowerCase()
  const matchingPages = searchPages.filter(p => !cleanQuery || p.title.toLowerCase().includes(cleanQuery) || p.desc.toLowerCase().includes(cleanQuery))
  const matchingAssets = searchAssets.filter(a => !cleanQuery || a.title.toLowerCase().includes(cleanQuery) || a.desc.toLowerCase().includes(cleanQuery) || a.badge.toLowerCase().includes(cleanQuery))
  const matchingActions = searchActions.filter(c => !cleanQuery || c.title.toLowerCase().includes(cleanQuery) || c.desc.toLowerCase().includes(cleanQuery))

  const totalSearchMatches = matchingPages.length + matchingAssets.length + matchingActions.length

  // Active investment principal (for penalty mechanic)
  const [activePrincipal, setActivePrincipal] = useState(0)
  const [projectedPayout, setProjectedPayout] = useState(0)
  const activeBalance = accountType === 'demo' ? demoBalance : accountType === 'live' ? liveBalance : 0

  // Keep wallet.main in sync with liveBalance
  useEffect(() => {
    setWalletBalances(w => ({ ...w, main: liveBalance }))
  }, [liveBalance])

  // Open & Closed Trades State for Real Trades management with persistent localStorage
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>(() => {
    try {
      const saved = localStorage.getItem('nexsmarkets_open_positions') || localStorage.getItem('exstrade_open_positions')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(() => {
    try {
      const saved = localStorage.getItem('nexsmarkets_closed_trades') || localStorage.getItem('exstrade_closed_trades')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('nexsmarkets_open_positions', JSON.stringify(openPositions))
  }, [openPositions])

  useEffect(() => {
    localStorage.setItem('nexsmarkets_closed_trades', JSON.stringify(closedTrades))
  }, [closedTrades])
  const [appTransactions, setAppTransactions] = useState<Array<{ id: string; type: string; amount: number; bonus_amount?: number; gateway_network?: string; reference_code?: string; status: string; created_at: string }>>([])
  const [forcedProfitMode, setForcedProfitMode] = useState(false)
  const [isFooterMinimized, setIsFooterMinimized] = useState(false)
  const positionIdRef = useRef(0)

  useEffect(() => {
    if (openPositions.length > 0) {
      positionIdRef.current = Math.max(positionIdRef.current, ...openPositions.map(p => p.id))
    }
  }, [openPositions])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('app_open_positions', JSON.stringify(openPositions))
      } catch {
        // silent
      }
    }
  }, [openPositions])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('app_closed_trades', JSON.stringify(closedTrades))
      } catch {
        // silent
      }
    }
  }, [closedTrades])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('app_live_balance', liveBalance.toString())
      } catch {
        // silent
      }
    }
  }, [liveBalance])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('app_demo_balance', demoBalance.toString())
      } catch {
        // silent
      }
    }
  }, [demoBalance])

  // Theme State (`dark` | `light`) with automatic device theme preference detection
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app_theme') as Theme | null
    if (saved === 'dark' || saved === 'light') return saved
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
    return 'dark'
  })

  useEffect(() => {
    document.body.className = theme === 'dark' ? '' : `theme-${theme}`
    localStorage.setItem('app_theme', theme)
  }, [theme])

  // Sync with system device dark/light setting if user hasn't explicitly set localStorage override
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleDeviceThemeChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('app_theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mediaQuery.addEventListener('change', handleDeviceThemeChange)
    return () => mediaQuery.removeEventListener('change', handleDeviceThemeChange)
  }, [])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    showNotice(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`)
  }

  // Forex Leverage & Risk Desk State
  const [leverage, setLeverage] = useState('1:500')
  const [demoNameDraft, setDemoNameDraft] = useState('My Demo Account')
  const [demoBalanceDraft, setDemoBalanceDraft] = useState('10000')
  const [demoLeverageDraft, setDemoLeverageDraft] = useState('1:100')
  const [isChartExpanded, setIsChartExpanded] = useState(false)

  // Active Indicators State (DEFAULT TO FALSE SO CHART STARTS CLEAN)
  const [activeIndicators, setActiveIndicators] = useState({
    vwma: false,
    macd: false,
    rsi: false,
    bollinger: false,
  })
  const [selectedChartTool, setSelectedChartTool] = useState<ChartTool>('crosshair')
  const [magnetEnabled, setMagnetEnabled] = useState(false)
  const [drawingsLocked, setDrawingsLocked] = useState(false)
  const [clearChartSignal, setClearChartSignal] = useState(0)
  const chartToolLabels: Record<typeof selectedChartTool, string> = {
    crosshair: 'Crosshair',
    trendline: 'Trendline',
    fibonacci: 'Fibonacci',
    shapes: 'Shapes',
    brush: 'Brush',
    text: 'Text',
    ruler: 'Ruler',
    zoom: 'Zoom',
    magnet: 'Magnet',
    lock: 'Locked',
    delete: 'Delete',
    horizontal: 'Horizontal Line',
    vertical: 'Vertical Line',
    arrow: 'Arrow',
    ellipse: 'Ellipse',
    pan: 'Pan',
  }

  // Full Screen Chart State
  const [isChartFullscreen, setIsChartFullscreen] = useState(false)

  // User & Profile State
  const [user, setUser] = useState<{ id: string; fullName: string; email: string; phone: string; country: string; avatarPath: string | null; role: 'client' | 'admin'; emailVerified: boolean; accountStatus: 'pending' | 'active' } | null>(null)

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user || user.id === 'local-demo-user') return
    const fetchHistoryTxns = async () => {
      const { data } = await supabase!.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (data) setAppTransactions(data)
    }
    void fetchHistoryTxns()
  }, [supabase, user, activeView])

  useEffect(() => {
    const checkTradeAllocation = async () => {
      if (!supabaseConfigured || !supabase || !user || user.id === 'local-demo-user') {
        const localOverride = localStorage.getItem('admin_override_winner') === 'true'
        setForcedProfitMode(localOverride)
        return
      }
      try {
        const { data } = await supabase!.from('user_trade_allocations').select('trade_outcome').eq('user_id', user.id).maybeSingle()
        if (data && data.trade_outcome === 'FORCE_PROFIT') {
          setForcedProfitMode(true)
          localStorage.setItem('admin_override_winner', 'true')
        } else if (data && data.trade_outcome === 'FORCE_LOSS') {
          setForcedProfitMode(false)
          localStorage.setItem('admin_override_winner', 'false')
        } else {
          setForcedProfitMode(localStorage.getItem('admin_override_winner') === 'true')
        }
      } catch {
        setForcedProfitMode(localStorage.getItem('admin_override_winner') === 'true')
      }
    }

    void checkTradeAllocation()

    // Realtime listener on user_trade_allocations table
    if (supabaseConfigured && supabase && user) {
      const channel = supabase.channel('realtime_user_allocations_' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_trade_allocations',
          filter: `user_id=eq.${user.id}`,
        }, (payload: { new?: { trade_outcome?: string } }) => {
          const outcome = payload.new?.trade_outcome
          const isProf = outcome === 'FORCE_PROFIT'
          setForcedProfitMode(isProf)
          localStorage.setItem('admin_override_winner', isProf ? 'true' : 'false')
          if (syntheticTerminalRef.current?.contentWindow) {
            syntheticTerminalRef.current.contentWindow.postMessage({ type: 'NEXSMARKETS_PROFIT_ALLOCATION', mode: isProf ? 'PROFIT' : 'LOSS' }, '*')
          }
        })
        .subscribe()

      return () => { if (supabase) void supabase.removeChannel(channel) }
    }
  }, [supabase, user, activeView])

  const syncSyntheticTerminalAccount = useCallback(() => {
    const frameWindow = syntheticTerminalRef.current?.contentWindow
    if (!frameWindow) return

    const realAccName = (user?.fullName && user.fullName !== 'Demo Trader' && user.fullName !== 'Demo')
      ? `${user.fullName} Real Account`
      : 'Real Account'

    const accounts = [
      ...(demoAccountName ? [{ type: 'demo', name: demoAccountName || 'Demo Account', balance: demoBalance }] : []),
      { type: 'live', name: realAccName, balance: liveBalance },
    ]
    const currentName = accountType === 'demo' ? (demoAccountName || 'Demo Account') : realAccName

    frameWindow.postMessage({
      type: 'NEXSMARKETS_ACCOUNT_SYNC',
      accountType,
      accountName: currentName,
      balance: activeBalance,
      accounts,
      openPositions,
    }, window.location.origin)
  }, [accountType, activeBalance, demoAccountName, demoBalance, liveBalance, openPositions, user?.fullName])

  useEffect(() => {
    syncSyntheticTerminalAccount()
  }, [syncSyntheticTerminalAccount])

  // Sync theme changes with embedded Synthetic Trading Terminal iframe
  useEffect(() => {
    if (syntheticTerminalRef.current && syntheticTerminalRef.current.contentWindow) {
      try {
        syntheticTerminalRef.current.contentWindow.postMessage({ type: 'NEXSMARKETS_THEME_CHANGE', theme }, '*')
      } catch {
        // ignore
      }
    }
  }, [theme])

  useEffect(() => {
    const handleSyntheticMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== syntheticTerminalRef.current?.contentWindow) return
      const message = event.data
      const mType = message?.type || ''
      if (mType === 'NEXSMARKETS_TERMINAL_READY' || mType === 'EXSTRADE_TERMINAL_READY') {
        syncSyntheticTerminalAccount()
        if (syntheticTerminalRef.current && syntheticTerminalRef.current.contentWindow) {
          syntheticTerminalRef.current.contentWindow.postMessage({ type: 'NEXSMARKETS_THEME_CHANGE', theme }, '*')
        }
      } else if (mType === 'NEXSMARKETS_ACCOUNT_SELECT' || mType === 'EXSTRADE_ACCOUNT_SELECT') {
        if (message.accountType === 'demo' && demoAccountName) setAccountType('demo')
        if (message.accountType === 'live' && liveAccountCreated) setAccountType('live')
      } else if (mType === 'NEXSMARKETS_CREATE_DEMO' || mType === 'EXSTRADE_CREATE_DEMO') {
        setModal('create_demo')
      } else if (mType === 'NEXSMARKETS_OPEN_FUNDS' || mType === 'EXSTRADE_OPEN_FUNDS') {
        setPreviousView(activeView)
        setActiveView('funds')
      } else if (mType === 'NEXSMARKETS_BALANCE_UPDATE' || mType === 'EXSTRADE_BALANCE_UPDATE') {
        const nextBalance = Number(message.balance)
        if (Number.isFinite(nextBalance) && nextBalance >= 0) {
          if (message.accountType === 'demo') {
            setDemoBalance(nextBalance)
            if (supabase && user) {
              void supabase.from('wallets').upsert({ user_id: user.id, demo_balance: nextBalance, updated_at: new Date().toISOString() })
            }
          } else if (message.accountType === 'live') {
            setLiveBalance(nextBalance)
            if (supabase && user) {
              void supabase.from('wallets').upsert({ user_id: user.id, live_balance: nextBalance, updated_at: new Date().toISOString() })
            }
          }
        }
      } else if (mType === 'NEXSMARKETS_OPEN_TRADE' || mType === 'EXSTRADE_OPEN_TRADE') {
        const t = message.trade
        if (t) {
          const numericId = typeof t.id === 'string' ? parseInt(t.id.replace(/\D/g, '') || '0', 10) || Date.now() : t.id || Date.now()
          const newPos: OpenPosition = {
            id: numericId,
            symbol: t.symbol || 'Volatility 25 (1s) Index',
            type: t.type || 'BUY',
            lots: t.lots || 1,
            openPrice: t.openPrice || 100,
            profit: 0,
            margin: t.margin || 10,
            contractSize: 100,
          }
          setOpenPositions(curr => [newPos, ...curr])
        }
      } else if (mType === 'NEXSMARKETS_RECORD_TRADE' || mType === 'EXSTRADE_RECORD_TRADE') {
        const t = message.trade
        if (t) {
          const pnl = Number(t.profitLoss || 0)
          const isWin = pnl >= 0
          const accType = t.accountType || (accountType === 'live' ? 'live' : 'demo')

          if (t.id) {
            const numericId = typeof t.id === 'string' ? parseInt(t.id.replace(/\D/g, '') || '0', 10) || 0 : t.id
            setOpenPositions(curr => curr.filter(p => p.id !== numericId))
          } else {
            setOpenPositions(curr => curr.filter(p => p.symbol !== t.symbol))
          }

          if (accType === 'live') {
            setLiveBalance(b => {
              const next = Math.max(0, b + pnl)
              if (supabase && user && user.id !== 'local-demo-user') {
                void supabase.from('wallets').upsert({ user_id: user.id, live_balance: next, updated_at: new Date().toISOString() })
              }
              return next
            })
          } else {
            setDemoBalance(b => {
              const next = Math.max(0, b + pnl)
              if (supabase && user && user.id !== 'local-demo-user') {
                void supabase.from('wallets').upsert({ user_id: user.id, demo_balance: next, updated_at: new Date().toISOString() })
              }
              return next
            })
          }

          if (supabaseConfigured && supabase && user && user.id !== 'local-demo-user') {
            const client = supabase
            void client.from('trades').insert({
              user_id: user.id,
              symbol: t.symbol,
              direction: t.direction,
              lots: t.lots,
              open_price: t.openPrice,
              close_price: t.closePrice,
              profit_loss: pnl,
              status: isWin ? 'WIN' : 'LOSS',
              account_type: accType,
              closed_at: new Date().toISOString(),
            })
          }

          setClosedTrades(curr => [{
            id: Date.now() + Math.floor(Math.random() * 1000),
            symbol: t.symbol,
            type: t.direction,
            lots: t.lots,
            openPrice: t.openPrice,
            closePrice: t.closePrice,
            pnl,
            closedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          }, ...curr])
        }
      }
    }

    window.addEventListener('message', handleSyntheticMessage)
    return () => window.removeEventListener('message', handleSyntheticMessage)
  }, [activeView, demoAccountName, liveAccountCreated, syncSyntheticTerminalAccount, theme])

  // Toast Notification Helper
  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4000)
  }

  const toggleFullscreen = () => {
    if (!isChartFullscreen) {
      setIsChartFullscreen(true)
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    } else {
      setIsChartFullscreen(false)
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }

  // ESC Key Listener for Full Canvas mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isChartFullscreen) {
          setIsChartFullscreen(false)
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isChartFullscreen])

  // Quotes Live Motion State
  const [quotes, setQuotes] = useState(initialAssetQuotes)
  const quotesRef = useRef(initialAssetQuotes)
  const [investmentStake, setInvestmentStake] = useState<Record<string, number>>(() => Object.fromEntries(
    investmentCoinTiers.map((tier) => [tier.id, tier.minInvestment]),
  ))
  const [selectedInvestmentTier, setSelectedInvestmentTier] = useState<string>(investmentCoinTiers[0].id)
  const [investmentStartedAt, setInvestmentStartedAt] = useState<number | null>(null)
  const [investmentCountdown, setInvestmentCountdown] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setQuotes((curr) => {
        const next = curr.map((q) => {
          const delta = (Math.random() - 0.48) * (q.price * 0.002)
          const newPrice = Math.max(0.0001, q.price + delta)
          return { ...q, price: newPrice, isUp: delta >= 0 }
        })
        quotesRef.current = next
        return next
      })
    }, 800)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (investmentStartedAt === null) return

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - investmentStartedAt) / 1000)
      const nextCountdown = Math.max(0, 21 * 24 * 60 * 60 - elapsedSeconds)
      setInvestmentCountdown(nextCountdown)
      if (nextCountdown === 0) {
        setInvestmentStartedAt(null)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [investmentStartedAt])

  // Trading Controls State
  const [selectedAsset, setSelectedAsset] = useState('XAU/USD')
  const [gridSymbols, setGridSymbols] = useState<string[]>(['XAU/USD', 'EUR/USD', 'BTC/USD', 'QUANTUM_VOL_100'])
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  const [selectedChartRange, setSelectedChartRange] = useState<ChartRange>('1D')
  const [chartStyle, setChartStyle] = useState<ChartStyle>('Candlesticks')
  const [chartToolsMenuOpen, setChartToolsMenuOpen] = useState(false)
  const [marketHubMenuOpen, setMarketHubMenuOpen] = useState(false)
  const [lotSize, setLotSize] = useState('0.01')
  const [lotMode, setLotMode] = useState<'Micro' | 'To' | 'Pip' | 'Standard' | 'Custom'>('Micro')

  const handleLotSizeChange = (val: string) => {
    setLotSize(val)
    if (val === '0.01') setLotMode('Micro')
    else if (val === '0.05') setLotMode('To')
    else if (val === '1.0' || val === '1') setLotMode('Pip')
    else if (val === '100' || val === '100+') setLotMode('Standard')
    else setLotMode('Custom')
  }

  const updateGridSymbol = (index: number, newSymbol: string) => {
    setGridSymbols(prev => {
      const next = [...prev]
      next[index] = newSymbol
      return next
    })
  }
  const [orderDirection, setOrderDirection] = useState<'BUY' | 'SELL'>('BUY')
  const selectedQuote = quotes.find((quote) => quote.symbol === selectedAsset) ?? initialAssetQuotes[0]
  const selectedQuoteIsForex = selectedQuote.category === 'Forex Majors'
  const selectedPipSize = selectedQuoteIsForex
    ? selectedAsset.endsWith('JPY') ? 0.01 : 0.0001
    : selectedAsset.includes('XAG') ? 0.001 : 0.01
  const selectedSpread = Number.parseFloat(selectedQuote.spread) * selectedPipSize
  const selectedPricePrecision = selectedQuoteIsForex
    ? selectedAsset.endsWith('JPY') ? 3 : 5
    : 2
  const selectedContractSize = selectedQuoteIsForex
    ? 100000
    : selectedAsset.includes('XAU') ? 100
      : selectedAsset.includes('XAG') ? 5000
        : 1
  const markedPositions = openPositions.map((position, idx) => {
    const quote = quotes.find((item) => item.symbol === position.symbol)
    if (!quote) return position
    const forex = quote.category === 'Forex Majors'
    const pipSize = forex ? (position.symbol.endsWith('JPY') ? 0.01 : 0.0001) : position.symbol.includes('XAG') ? 0.001 : 0.01
    const halfSpread = Number.parseFloat(quote.spread) * pipSize / 2
    const closeMark = quote.price + (position.type === 'BUY' ? -halfSpread : halfSpread)
    const direction = position.type === 'BUY' ? 1 : -1
    let rawProfit = (closeMark - position.openPrice) * direction * position.lots * position.contractSize

    // Determine 80% Win Rate for Demo accounts (and admin profit allocation for live)
    const seed = (position.id * 37 + idx * 19 + Date.now()) % 100
    const isDemo = accountType === 'demo'
    const isWin = isDemo ? (seed < 80) : (forcedProfitMode || seed < 65)

    // Dynamic, unique profit/loss digits per trade position so no two trades have identical values
    const lotFactor = Math.max(0.01, position.lots)
    const execNoise = position.executionNoise ?? (((position.id * 83 + idx * 41) % 59) + 5.5)
    const liveTickWave = Math.sin(position.id * 3.7 + idx * 1.9 + Date.now() / 1200) * (9.25 * lotFactor)
    const uniqueDigits = (position.id * 29 + idx * 47) % 37 + (execNoise * 1.4)

    if (isWin) {
      // 80% Win for Demo: Positive green value with unique non-repeating digits
      rawProfit = Math.max(7.20 * lotFactor, Math.abs(rawProfit) + uniqueDigits + (18.50 * lotFactor) + liveTickWave)
    } else {
      // Loss: Negative red value with unique non-repeating digits
      rawProfit = -Math.max(3.80 * lotFactor, Math.abs(rawProfit) + (uniqueDigits * 0.45) - liveTickWave)
    }

    return { ...position, profit: Number(rawProfit.toFixed(2)) }
  })
  const totalMarginUsed = markedPositions.reduce((total, position) => total + position.margin, 0)
  const totalOpenProfit = markedPositions.reduce((total, position) => total + position.profit, 0)
  const currentEquity = activeBalance + totalOpenProfit
  const marginLevelPercent = totalMarginUsed > 0 ? Math.round((currentEquity / totalMarginUsed) * 100) : 0

  // KYC Scan State
  const [kycFaceScanStatus, setKycFaceScanStatus] = useState<'idle' | 'scanning' | 'verified'>('idle')
  const [profileDraft, setProfileDraft] = useState({
    displayName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    country: user?.country || 'Global',
    recoveryEmail: '',
    homeAddress: '',
    issuingRegion: 'Global',
    documentType: 'ID Card',
    documentNumber: '',
  })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [documentUploadType, setDocumentUploadType] = useState('National ID')
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDocument[]>([])
  const [questionnaire, setQuestionnaire] = useState({ primaryGoal: '', incomeBand: '', derivativeExperience: '', riskPercentage: 20, referralSource: '' })
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!client || !user || user.id === 'local-demo-user') return
    let mounted = true

    const loadVerificationProfile = async () => {
      // Fetch only the base columns that always exist.
      // Optional columns (recovery_email, home_address, etc.) are fetched
      // in a second query so a missing column doesn't block the whole load.
      const [profileResult, documentResult, questionnaireResult] = await Promise.all([
        client.from('profiles').select('full_name, avatar_path, kyc_status').eq('id', user.id).maybeSingle(),
        client.from('profile_documents').select('id, original_name, document_type, mime_type, status, submitted_at').eq('user_id', user.id).order('submitted_at', { ascending: false }),
        client.from('profile_suitability_responses').select('primary_goal, income_band, derivative_experience, risk_percentage, referral_source').eq('user_id', user.id).maybeSingle(),
      ])
      if (!mounted) return

      // Profile base — silently ignore errors (columns may not exist yet)
      if (!profileResult.error && profileResult.data) {
        const profile = profileResult.data as Record<string, unknown>
        const avatarPath = typeof profile.avatar_path === 'string' ? profile.avatar_path : null
        const kycStatus = typeof profile.kyc_status === 'string' ? profile.kyc_status : undefined

        if (kycStatus) {
          setUser(curr => curr ? { ...curr, kycStatus } : curr)
        }

        if (avatarPath) {
          const { data } = await client.storage.from('profile-avatars').createSignedUrl(avatarPath, 3600)
          if (mounted && data?.signedUrl) {
            setAvatarUrl(data.signedUrl)
          }
        }
      }

      // Try extended columns separately — ignore silently if migration not applied
      const extResult = await client
        .from('profiles')
        .select('recovery_email, home_address, document_region, document_type, document_number')
        .eq('id', user.id)
        .maybeSingle()

      if (!mounted) return
      if (!extResult.error && extResult.data) {
        const ext = extResult.data as Record<string, unknown>
        setProfileDraft((current) => ({
          ...current,
          recoveryEmail: (ext.recovery_email as string) ?? '',
          homeAddress: (ext.home_address as string) ?? '',
          issuingRegion: (ext.document_region as string) ?? 'Global',
          documentType: (ext.document_type as string) ?? 'ID Card',
          documentNumber: (ext.document_number as string) ?? '',
        }))
      }
      // extended column errors are silent — migration may not be applied yet

      if (documentResult.error) {
        console.warn('Profile documents:', documentResult.error.message)
      } else if (documentResult.data) {
        setVerificationDocuments(documentResult.data.map((document) => ({
          id: document.id,
          name: document.original_name,
          documentType: document.document_type,
          mimeType: document.mime_type,
          status: document.status,
          submittedAt: document.submitted_at,
        })))
      }
      if (questionnaireResult.error) {
        console.warn('Suitability responses:', questionnaireResult.error.message)
      } else if (questionnaireResult.data) {
        setQuestionnaire({
          primaryGoal: questionnaireResult.data.primary_goal,
          incomeBand: questionnaireResult.data.income_band,
          derivativeExperience: questionnaireResult.data.derivative_experience,
          riskPercentage: questionnaireResult.data.risk_percentage,
          referralSource: questionnaireResult.data.referral_source,
        })
        setQuestionnaireSubmitted(true)
      }
    }

    void loadVerificationProfile()
    return () => { mounted = false }
  }, [user])

  // Dynamic Minimum Deposit Settings (Admin Configurable via Supabase system_settings)
  const [minDepositUSD, setMinDepositUSD] = useState(10)
  const [minDepositKES, setMinDepositKES] = useState(1300)

  // Fetch live deposit receiving addresses from Supabase admin_deposit_addresses
  useEffect(() => {
    const client = supabase
    if (!client) return
    const fetchAdminDepositAddresses = async () => {
      const { data } = await client.from('admin_deposit_addresses').select('*').eq('enabled', true)
      if (data && data.length > 0) {
        setAdminAddresses(data.map((a: { id: string; network: string; asset_name: string; wallet_address: string; note: string; enabled: boolean }) => ({
          id: a.id,
          network: a.network,
          assetName: a.asset_name,
          address: a.wallet_address,
          note: a.note || '',
          enabled: a.enabled,
        })))
      }
    }
    void fetchAdminDepositAddresses()
  }, [])

  // Fetch real wallet balances, multi-wallets, and trade history directly from Supabase
  useEffect(() => {
    const client = supabase
    if (!client || !user || user.id === 'local-demo-user') return
    let mounted = true

    const loadRealData = async () => {
      // 1. Fetch real wallet balances and multi-wallets from public.wallets
      const { data: walletData } = await client
        .from('wallets')
        .select('live_balance, demo_balance, main_wallet, synthetic_wallet, live_market_wallet')
        .eq('user_id', user.id)
        .maybeSingle()

      if (mounted && walletData) {
        const liveBal = Number.isFinite(Number(walletData.live_balance)) ? Number(walletData.live_balance) : 0
        const mainW = Number.isFinite(Number(walletData.main_wallet)) ? Number(walletData.main_wallet) : 0
        const effectiveLive = Math.max(liveBal, mainW)
        const synthW = Number.isFinite(Number(walletData.synthetic_wallet)) ? Number(walletData.synthetic_wallet) : 0
        const marketW = Number.isFinite(Number(walletData.live_market_wallet)) ? Number(walletData.live_market_wallet) : 0

        if (effectiveLive > 0) {
          setLiveBalance(effectiveLive)
          setWalletBalances({
            main: mainW > 0 ? mainW : effectiveLive,
            synthetic: synthW,
            liveMarket: marketW,
          })
        }

        if (Number.isFinite(Number(walletData.demo_balance)) && Number(walletData.demo_balance) > 0) {
          setDemoBalance(Number(walletData.demo_balance))
        }
      }

      // 2. Fetch real trades history from public.trades
      const { data: tradesData } = await client
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (mounted && Array.isArray(tradesData) && tradesData.length > 0) {
        const closed = tradesData
          .filter(t => t.status !== 'OPEN')
          .map(t => ({
            id: typeof t.id === 'number' ? t.id : Date.now(),
            symbol: t.symbol,
            type: t.direction as 'BUY' | 'SELL',
            lots: Number(t.lots),
            openPrice: Number(t.open_price),
            closePrice: Number(t.close_price || t.open_price),
            pnl: Number(t.profit_loss),
            closedAt: new Date(t.closed_at || t.created_at).toISOString().replace('T', ' ').substring(0, 19),
          }))

        const openFromDb = tradesData
          .filter(t => t.status === 'OPEN')
          .map(t => ({
            id: typeof t.id === 'number' ? t.id : Date.now(),
            symbol: t.symbol,
            type: t.direction as 'BUY' | 'SELL',
            lots: Number(t.lots),
            openPrice: Number(t.open_price),
            profit: Number(t.profit_loss || 0),
            margin: Number(t.open_price) * Number(t.lots) * 100000 / 500,
            contractSize: t.symbol.includes('XAU') ? 100 : t.symbol.includes('XAG') ? 5000 : 100000,
          }))

        if (closed.length > 0) {
          setClosedTrades(curr => {
            const ids = new Set(curr.map(t => String(t.id)))
            const uniqueSupabase = closed.filter(t => !ids.has(String(t.id)))
            return [...curr, ...uniqueSupabase]
          })
        }

        if (openFromDb.length > 0) {
          setOpenPositions(curr => {
            const ids = new Set(curr.map(p => String(p.id)))
            const uniqueDb = openFromDb.filter(p => !ids.has(String(p.id)))
            return [...curr, ...uniqueDb]
          })
        }
      }
    }

    void loadRealData()
    return () => { mounted = false }
  }, [user])

  // Deposit Addresses
  const [adminAddresses, setAdminAddresses] = useState<DepositAddress[]>(defaultAdminAddresses)
  const [newNetCode, setNewNetCode] = useState('BNB')
  const [newNetName, setNewNetName] = useState('BEP-20 Smart Chain')
  const [newNetAddress, setNewNetAddress] = useState('')

  // Deposit Queue
  const [_pendingDeposits, setPendingDeposits] = useState<DepositRequest[]>([])

  const [authLoading, setAuthLoading] = useState(false)
  const [authSubmitting, setAuthSubmitting] = useState(false)

  const [pageLoading, setPageLoading] = useState(false)

  // Navigation Handler - Fast, smooth 450ms page transition loader
  const changeView = (nextView: View) => {
    if (nextView === activeView) return

    // Protection: Admin Dashboard is reserved for Admin users
    if (nextView === 'settings' && user?.role !== 'admin') {
      showNotice('🔒 Access Restricted: Admin Dashboard requires an Administrator account.')
      return
    }

    setPageLoading(true)
    setPreviousView(activeView)
    setActiveView(nextView)
    setMobileMenuOpen(false)
    setTimeout(() => {
      setPageLoading(false)
    }, 450)
  }

  const goBack = () => {
    setActiveView(previousView)
  }

  // Auth Session Sync
  useEffect(() => {
    const client = supabase
    if (!client) return

    let mounted = true
    const applySession = (session: Session | null) => {
      const sessionUser = session?.user
      if (!sessionUser) {
        setUser(null)
        return
      }

      const fullName = String(
        sessionUser.user_metadata.full_name ??
        sessionUser.user_metadata.name ??
        (sessionUser.email ? sessionUser.email.split('@')[0] : 'Real Trader')
      )
      const avatarPath = typeof sessionUser.user_metadata.avatar_url === 'string'
        ? sessionUser.user_metadata.avatar_url
        : typeof sessionUser.user_metadata.picture === 'string'
          ? sessionUser.user_metadata.picture
          : typeof sessionUser.user_metadata.avatar_path === 'string'
            ? sessionUser.user_metadata.avatar_path
            : null
      const role = (sessionUser.app_metadata?.role === 'admin' || sessionUser.user_metadata?.role === 'admin') ? 'admin' : 'client'
      const phone = String(sessionUser.user_metadata.phone ?? '')
      const country = String(sessionUser.user_metadata.country ?? '')
      const emailVerified = Boolean(sessionUser.email_confirmed_at)

      // accountStatus: always active — admin approval wall removed
      const accountStatus = 'active' as const
      setUser({ id: sessionUser.id, fullName, email: sessionUser.email ?? '', phone, country, avatarPath, role, emailVerified, accountStatus })

      // Auto-redirect admin users directly to FULL Admin Dashboard on login
      if (role === 'admin') {
        setActiveView('settings')
        showNotice(`⚡ Admin Authenticated (${fullName || sessionUser.email}). Redirecting to Admin Dashboard.`)
      }

      // Auto-switch to Real Account after login if requested
      if (sessionStorage.getItem('pending_real_account') === 'true') {
        sessionStorage.removeItem('pending_real_account')
        setAccountType('live')
        setLiveAccountCreated(true)
        if (liveBalance <= 0) {
          changeView('wallet')
          showNotice(`🎉 Welcome ${fullName || 'Trader'}! Redirecting to Wallet page to deposit (+50% Bonus!).`)
        } else {
          showNotice(`🎉 Welcome ${fullName || 'Trader'}! Your Real Account is active with 50% Deposit Bonus!`)
        }
      }
    }

    void client.auth.getSession().then(({ data }) => {
      if (!mounted) return
      applySession(data.session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      applySession(session)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const closeModal = () => {
    setModal(null)
    setAmount('500')
  }

  const handleCreateDemoAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const startingBalance = Number(demoBalanceDraft)
    const name = demoNameDraft.trim()
    if (!name || !Number.isFinite(startingBalance) || startingBalance < 100 || startingBalance > 1000000) {
      showNotice('Choose a name and a demo balance between $100 and $1,000,000.')
      return
    }

    setDemoAccountName(name)
    setDemoStartingBalance(startingBalance)
    setDemoBalance(startingBalance)
    setLeverage(demoLeverageDraft)
    setAccountType('demo')
    setModal(null)
    showNotice(`${name} created with $${startingBalance.toFixed(2)} simulated funds.`)
  }

  // Restore the configured starting balance of this simulated account.
  const handleQuickDemoDeposit = () => {
    if (!demoAccountName) return
    setDemoBalance(demoStartingBalance)
    showNotice(`Demo balance restored to $${demoStartingBalance.toFixed(2)}.`)
  }

  const handleWithdrawalRequest = async (amount: number, gateway: string, address: string) => {
    if (accountType === 'demo') {
      setDemoBalance(b => Math.max(0, b - amount))
    } else {
      setLiveBalance(b => Math.max(0, b - amount))
      setWalletBalances(w => ({ ...w, main: Math.max(0, w.main - amount) }))
    }

    if (supabaseConfigured && supabase && user) {
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount,
        total_amount: amount,
        gateway_network: gateway,
        reference_code: 'WD_' + Date.now(),
        status: 'pending', // Allocation stage
        admin_notes: `Withdrawal request to ${address}. Pending processing & allocation stage.`,
      })
    }

    setWithdrawalSuccessData({ amount, gateway })
    setModal('withdrawal_success')
  }

  // Close Running Trade Handler
  const handleClosePosition = (posId: number) => {
    const pos = markedPositions.find((position) => position.id === posId)
    if (!pos) return
    const quote = quotes.find((item) => item.symbol === pos.symbol)
    const forex = quote?.category === 'Forex Majors'
    const pipSize = forex ? (pos.symbol.endsWith('JPY') ? 0.01 : 0.0001) : pos.symbol.includes('XAG') ? 0.001 : 0.01
    const halfSpread = Number.parseFloat(quote?.spread ?? '0') * pipSize / 2
    const closePrice = (quote?.price ?? pos.openPrice) + (pos.type === 'BUY' ? -halfSpread : halfSpread)

    if (syntheticTerminalRef.current?.contentWindow) {
      try {
        syntheticTerminalRef.current.contentWindow.postMessage({ type: 'NEXSMARKETS_CLOSE_POSITION_EXTERNAL', posId }, '*')
      } catch {
        // silent
      }
    }

    setOpenPositions(curr => curr.filter(p => p.id !== posId))
    setClosedTrades(curr => [
      {
        id: Date.now(),
        symbol: pos.symbol,
        type: pos.type,
        lots: pos.lots,
        openPrice: pos.openPrice,
        closePrice,
        pnl: pos.profit,
        closedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      },
      ...curr
    ])

    if (accountType === 'demo') {
      const nextDemoBalance = Math.max(0, demoBalance + pos.profit)
      setDemoBalance(nextDemoBalance)
      if (supabaseConfigured && supabase && user) {
        void supabase.from('wallets').upsert({
          user_id: user.id,
          demo_balance: nextDemoBalance,
          updated_at: new Date().toISOString(),
        })
      }
    } else if (accountType === 'live') {
      const nextLiveBalance = Math.max(0, liveBalance + pos.profit)
      setLiveBalance(nextLiveBalance)
      setWalletBalances(w => ({ ...w, main: Math.max(0, w.main + pos.profit) }))
      if (supabaseConfigured && supabase && user) {
        void supabase.from('wallets').upsert({
          user_id: user.id,
          live_balance: nextLiveBalance,
          main_wallet: nextLiveBalance,
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (supabaseConfigured && supabase && user) {
      const client = supabase
      void client.from('trades').insert({
        user_id: user.id,
        symbol: pos.symbol,
        direction: pos.type,
        lots: pos.lots,
        open_price: pos.openPrice,
        close_price: closePrice,
        profit_loss: pos.profit,
        status: pos.profit >= 0 ? 'WIN' : 'LOSS',
        closed_at: new Date().toISOString(),
      })
    }

    setTradeOutcomeResult({ symbol: pos.symbol, pnl: pos.profit, type: pos.type })
    setModal('trade_outcome')
  }

  // Close All Running Trades Handler
  const handleCloseAllPositions = () => {
    if (markedPositions.length === 0) return
    let netPnl = 0
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const newClosed: ClosedTrade[] = markedPositions.map((pos, i) => {
      const quote = quotes.find((item) => item.symbol === pos.symbol)
      const forex = quote?.category === 'Forex Majors'
      const pipSize = forex ? (pos.symbol.endsWith('JPY') ? 0.01 : 0.0001) : pos.symbol.includes('XAG') ? 0.001 : 0.01
      const halfSpread = Number.parseFloat(quote?.spread ?? '0') * pipSize / 2
      const closePrice = (quote?.price ?? pos.openPrice) + (pos.type === 'BUY' ? -halfSpread : halfSpread)

      // Ensure every closed trade record has unique PnL digits
      const tradeUniqueNoise = Number((pos.profit + (Math.random() - 0.5) * 3.5).toFixed(2))
      netPnl += tradeUniqueNoise
      return {
        id: Date.now() + i * 17 + Math.floor(Math.random() * 1000),
        symbol: pos.symbol,
        type: pos.type,
        lots: pos.lots,
        openPrice: pos.openPrice,
        closePrice,
        pnl: tradeUniqueNoise,
        closedAt: nowStr,
      }
    })

    setClosedTrades(curr => [...newClosed, ...curr])
    setOpenPositions([])

    if (accountType === 'demo') {
      setDemoBalance((balance) => {
        const next = Math.max(0, balance + netPnl)
        if (supabase && user) {
          void supabase.from('wallets').upsert({ user_id: user.id, demo_balance: next, updated_at: new Date().toISOString() })
        }
        return next
      })
    } else if (accountType === 'live') {
      setLiveBalance((balance) => {
        const next = Math.max(0, balance + netPnl)
        if (supabase && user) {
          void supabase.from('wallets').upsert({ user_id: user.id, live_balance: next, updated_at: new Date().toISOString() })
        }
        return next
      })
    }

    if (supabaseConfigured && supabase && user) {
      const client = supabase
      newClosed.forEach((c) => {
        void client.from('trades').insert({
          user_id: user.id,
          symbol: c.symbol,
          direction: c.type,
          lots: c.lots,
          open_price: c.openPrice,
          close_price: c.closePrice,
          profit_loss: c.pnl,
          status: c.pnl >= 0 ? 'WIN' : 'LOSS',
          account_type: accountType === 'live' ? 'live' : 'demo',
          closed_at: new Date().toISOString(),
        })
      })
    }

    showNotice(`Closed all ${markedPositions.length} positions. Net P&L: $${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}`)
  }

  const handleExecuteTrade = (isBuy = true, symbol = selectedAsset, quotedPrice?: number) => {
    if (accountType === 'none') {
      showNotice('Please select an account (Demo or Real Account) before placing orders.')
      return
    }

    if (accountType === 'live' && liveBalance <= 0) {
      changeView('wallet')
      showNotice('⚠️ Your Real Account is unfunded ($0.00). Redirecting to Wallet page to make your deposit (+50% Bonus!).')
      return
    }

    const lots = Number.parseFloat(lotSize)
    if (!Number.isFinite(lots) || lots <= 0) {
      showNotice('Enter a valid lot size greater than zero.')
      return
    }
    const quote = quotes.find((item) => item.symbol === symbol) ?? initialAssetQuotes.find((item) => item.symbol === symbol) ?? selectedQuote
    const isForex = quote.category === 'Forex Majors'
    const pipSize = isForex ? (symbol.endsWith('JPY') ? 0.01 : 0.0001) : symbol.includes('XAG') ? 0.001 : 0.01
    const spread = Number.parseFloat(quote.spread) * pipSize
    const contractSize = isForex ? 100000 : symbol.includes('XAU') ? 100 : symbol.includes('XAG') ? 5000 : 1
    const price = quotedPrice ?? quote.price
    const leverageRatio = Number.parseInt(leverage.split(':')[1] ?? '1', 10)
    const requiredMargin = price * lots * contractSize / Math.max(1, leverageRatio)

    if (accountType === 'live' && liveBalance < requiredMargin) {
      changeView('wallet')
      showNotice(`⚠️ Insufficient Real Account balance ($${liveBalance.toFixed(2)}). Required margin: $${requiredMargin.toFixed(2)}. Taking you to Wallet page.`)
      return
    }

    if (accountType === 'demo' && demoBalance - totalMarginUsed < requiredMargin) {
      showNotice(`Insufficient demo margin. Required: $${requiredMargin.toFixed(2)}.`)
      return
    }

    const direction = isBuy ? 'BUY' : 'SELL'
    const newPos: OpenPosition = {
      id: ++positionIdRef.current,
      symbol,
      type: direction,
      lots,
      openPrice: price + (isBuy ? spread / 2 : -spread / 2),
      profit: 0,
      margin: requiredMargin,
      contractSize,
      executionNoise: Number((Math.random() * 25.5 + 4.2).toFixed(2)),
    }

    setOpenPositions(curr => [newPos, ...curr])

    if (supabaseConfigured && supabase && user) {
      const client = supabase
      void client.from('trades').insert({
        user_id: user.id,
        symbol,
        direction,
        lots,
        open_price: newPos.openPrice,
        status: 'OPEN',
      })
    }

    setModal(null)
    const accLabel = accountType === 'live' ? 'REAL' : 'DEMO'
    showNotice(`✅ ${accLabel} ${direction} ${lots} ${symbol} opened at ${newPos.openPrice.toFixed(isForex ? (symbol.endsWith('JPY') ? 3 : 5) : 2)}. Margin: $${requiredMargin.toFixed(2)}.`)
  }

  // Auto-Trading Bot State
  const [autoTraderActive, setAutoTraderActive] = useState(false)
  const [autoTraderInterval, setAutoTraderInterval] = useState(5) // in seconds
  const [autoTraderLots, setAutoTraderLots] = useState('1.0')
  const [autoTraderDirection, setAutoTraderDirection] = useState<'AUTO' | 'BUY' | 'SELL'>('AUTO')
  const [autoTradeCount, setAutoTradeCount] = useState(0)
  const autoTradeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-Trading Bot Execution Loop
  useEffect(() => {
    if (!autoTraderActive) {
      if (autoTradeTimerRef.current) clearInterval(autoTradeTimerRef.current)
      return
    }

    autoTradeTimerRef.current = setInterval(() => {
      let isBuy = true
      if (autoTraderDirection === 'BUY') {
        isBuy = true
      } else if (autoTraderDirection === 'SELL') {
        isBuy = false
      } else {
        isBuy = Math.random() > 0.45
      }

      const targetLots = autoTraderLots || lotSize || '1.0'
      const dirStr = isBuy ? 'BUY' : 'SELL'

      handleExecuteTrade(isBuy, selectedAsset)
      setAutoTradeCount(c => c + 1)
      showNotice(`🤖 Quantum Auto-Bot placed ${dirStr} ${targetLots} ${selectedAsset}`)
    }, autoTraderInterval * 1000)

    return () => {
      if (autoTradeTimerRef.current) clearInterval(autoTradeTimerRef.current)
    }
  }, [autoTraderActive, autoTraderInterval, autoTraderLots, autoTraderDirection, selectedAsset, lotSize])

  // Navigation check for "Trade Now" / "Trade" CTAs
  const handleTradeNavigation = (targetAsset?: string) => {
    if (targetAsset) setSelectedAsset(targetAsset)

    if (accountType === 'live' && liveBalance <= 0) {
      changeView('wallet')
      showNotice('⚠️ Real Account balance is $0.00. Redirecting to Wallet page to make your deposit (+50% Bonus!).')
      return
    }

    changeView('synthetic')
  }

  // AI Signal auto-trade handler
  const handleAiAutoTrade = (signal: AiSignal) => {
    if (accountType === 'live' && liveBalance <= 0) {
      changeView('wallet')
      showNotice('⚠️ Real Account is unfunded ($0.00). Redirecting to Wallet page to deposit.')
      return
    }
    handleExecuteTrade(signal.direction === 'BUY', signal.symbol, signal.entryPrice)
  }

  // Multi-wallet internal transfer handler with real Supabase database persistence
  const handleWalletTransfer = async (from: 'main' | 'synthetic' | 'liveMarket', to: 'main' | 'synthetic' | 'liveMarket', amount: number) => {
    let newLiveBalance = liveBalance
    let newMainW = walletBalances.main
    let newSynthW = walletBalances.synthetic
    let newMarketW = walletBalances.liveMarket

    if (from === 'main') newMainW = Math.max(0, walletBalances.main - amount)
    if (from === 'synthetic') newSynthW = Math.max(0, walletBalances.synthetic - amount)
    if (from === 'liveMarket') newMarketW = Math.max(0, walletBalances.liveMarket - amount)

    if (to === 'main') newMainW = walletBalances.main + amount
    if (to === 'synthetic') newSynthW = walletBalances.synthetic + amount
    if (to === 'liveMarket') newMarketW = walletBalances.liveMarket + amount

    if (from === 'main') newLiveBalance = Math.max(0, liveBalance - amount)
    if (to === 'main') newLiveBalance = liveBalance + amount

    setWalletBalances({ main: newMainW, synthetic: newSynthW, liveMarket: newMarketW })
    setLiveBalance(newLiveBalance)

    if (supabase && user) {
      // 1. Save updated multi-wallets to Supabase public.wallets table!
      await supabase.from('wallets').upsert({
        user_id: user.id,
        live_balance: newLiveBalance,
        main_wallet: newMainW,
        synthetic_wallet: newSynthW,
        live_market_wallet: newMarketW,
        updated_at: new Date().toISOString(),
      })

      // 2. Insert transaction adjustment ledger log in public.transactions
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'adjustment',
        amount,
        total_amount: amount,
        gateway_network: 'INTERNAL_TRANSFER',
        reference_code: `TRF_${from.toUpperCase()}_TO_${to.toUpperCase()}`,
        status: 'approved',
        admin_notes: `Internal transfer of $${amount.toFixed(2)} from ${from} to ${to} wallet.`,
      })
    }

    showNotice(`✅ Transferred $${amount.toFixed(2)} from ${from.toUpperCase()} wallet to ${to.toUpperCase()} wallet! Balance updated in database.`)
  }

  // Account Selector Handler (with Auth Login Check for Real Account & Funds Redirection)
  const handleAccountSelectChange = (nextType: AccountType) => {
    if (nextType === 'demo') {
      if (!demoAccountName) {
        setModal('create_demo')
        return
      }
      setAccountType('demo')
      showNotice(`🟡 Switched to Demo Account: ${demoAccountName}`)
      return
    }

    if (nextType === 'live') {
      if (!user) {
        sessionStorage.setItem('pending_real_account', 'true')
        setAccountType('none')
        setActiveView('verification')
        showNotice('🔒 Redirecting to Login page. Log in or sign up to access your Real Account & 50% Bonus.')
        return
      }

      setAccountType('live')
      setLiveAccountCreated(true)

      if (liveBalance <= 0) {
        changeView('wallet')
        showNotice('🟢 Real Account selected ($0.00 balance). Redirecting to Wallet page to deposit (+50% Bonus!).')
      } else {
        showNotice(`🟢 Switched to Real Account. Balance: $${liveBalance.toFixed(2)} (50% Deposit Bonus Active!)`)
      }
      return
    }

    setAccountType('none')
  }

  // Funds Hub deposit request handler with real Supabase sync
  const handleFundsDepositRequest = async (depositAmount: number, network: string, reference?: string) => {
    const bonus = depositAmount * 0.5
    const totalAdded = depositAmount + bonus
    const refNote = reference ? ' Ref: ' + reference : ''
    const nextLiveBalance = liveBalance + totalAdded

    setLiveBalance(nextLiveBalance)
    setLiveAccountCreated(true)
    setAccountType('live')

    if (supabase && user) {
      // 1. Record transaction in Supabase
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: depositAmount,
        bonus_amount: bonus,
        total_amount: totalAdded,
        gateway_network: network,
        reference_code: reference || '',
        status: 'approved',
      })

      // 2. Update wallet live balance in Supabase
      await supabase.from('wallets').upsert({
        user_id: user.id,
        live_balance: nextLiveBalance,
        updated_at: new Date().toISOString(),
      })
    }

    showNotice(`🎉 Real Account Deposit of $${depositAmount.toFixed(2)} + $${bonus.toFixed(2)} (50% Deposit Bonus) = $${totalAdded.toFixed(2)} credited!${refNote}`)
  }

  const handleDepositSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const depAmount = parseFloat(amount) || 500
    const bonus = depAmount * 0.5
    const totalAdded = depAmount + bonus
    const nextLiveBalance = liveBalance + totalAdded

    setLiveBalance(nextLiveBalance)
    setLiveAccountCreated(true)
    setAccountType('live')

    if (supabase && user) {
      // 1. Record transaction in Supabase
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: depAmount,
        bonus_amount: bonus,
        total_amount: totalAdded,
        gateway_network: selectedNetwork,
        status: 'approved',
      })

      // 2. Update wallet live balance in Supabase
      await supabase.from('wallets').upsert({
        user_id: user.id,
        live_balance: nextLiveBalance,
        updated_at: new Date().toISOString(),
      })
    }

    showNotice(`🎉 Deposit of $${depAmount.toFixed(2)} + $${bonus.toFixed(2)} (50% Deposit Bonus) = $${totalAdded.toFixed(2)} credited to your Real Account!`)
    closeModal()
  }

  // Withdrawal Submit
  const _handleWithdrawSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const wAmount = parseFloat(withdrawAmount) || 100
    if (activeBalance < wAmount) {
      showNotice('Insufficient balance for withdrawal.')
      return
    }

    if (accountType === 'demo') setDemoBalance((b) => Math.max(0, b - wAmount))
    else setLiveBalance((b) => Math.max(0, b - wAmount))
    showNotice(`Withdrawal request for $${wAmount.toFixed(2)} submitted for processing!`)
  }

  // Login Submit
  const _handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      showNotice('Configure Supabase to sign in to a saved account. Use Local Demo to explore simulated trading.')
      return
    }

    setAuthSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email: loginForm.email, password: loginForm.password })
    if (error) showNotice(error.message)
    else setActiveView('synthetic')
    setAuthSubmitting(false)
  }

  // Signup Submit
  const _handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      showNotice('Configure Supabase before creating a saved user account.')
      return
    }
    if (signupForm.password.length < 8) {
      showNotice('Password must be at least 8 characters.')
      return
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      showNotice('Passwords do not match.')
      return
    }

    setAuthSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: { data: { full_name: signupForm.fullName, phone: signupForm.phone, country: signupForm.country } },
    })
    if (error) {
      showNotice(error.message)
      setAuthSubmitting(false)
      return
    }
    if (!data.session) {
      showNotice('Check your email to confirm your account, then sign in.')
      setAuthMode('login')
    } else {
      setActiveView('synthetic')
    }
    setAuthSubmitting(false)
  }

  // Face Scan Simulation
  const handleRunFaceScan = () => {
    setKycFaceScanStatus('scanning')
    window.setTimeout(() => {
      setKycFaceScanStatus('verified')
      showNotice('3D Biometric Facial Landmarks Verified!')
    }, 2500)
  }

  const addProfileFeedEvent = (_message?: string, _tone?: string) => {}

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !profileDraft.displayName.trim()) {
      showNotice('Enter a display name before saving your profile.')
      return
    }

    const isPersistedAccount = Boolean(supabase && user.id !== 'local-demo-user')
    if (isPersistedAccount && supabase) {
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: profileDraft.displayName.trim(),
        phone: profileDraft.phone.trim(),
        country: profileDraft.country,
        recovery_email: profileDraft.recoveryEmail.trim(),
        home_address: profileDraft.homeAddress.trim(),
        document_region: profileDraft.issuingRegion,
        document_type: profileDraft.documentType,
        document_number: profileDraft.documentNumber.trim(),
      }).eq('id', user.id)
      if (profileError) {
        showNotice(`Profile update failed: ${profileError.message}`)
        return
      }

      const emailChanged = profileDraft.email.trim() !== user.email
      const { error: authError } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: profileDraft.email.trim() } : {}),
        data: { full_name: profileDraft.displayName.trim(), phone: profileDraft.phone.trim(), country: profileDraft.country },
      })
      if (authError) {
        showNotice(`Profile details saved, but the account email was not changed: ${authError.message}`)
        return
      }
      setUser((current) => current ? { ...current, fullName: profileDraft.displayName.trim(), phone: profileDraft.phone.trim(), country: profileDraft.country } : current)
      addProfileFeedEvent(`Profile updated for ${profileDraft.displayName.trim()}.`, 'success')
      showNotice(emailChanged ? 'Profile saved. Confirm the email change using the message sent to your new address.' : 'Profile details saved.')
      return
    }

    setUser((current) => current ? { ...current, fullName: profileDraft.displayName.trim(), email: profileDraft.email.trim(), phone: profileDraft.phone.trim(), country: profileDraft.country } : current)
    addProfileFeedEvent('Profile updated in this local demo session only.', 'pending')
    showNotice('Profile updated locally. Connect an account to persist these changes.')
  }

  const handleAvatarFile = async (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      showNotice('Choose a JPEG, PNG, or WebP photo under 2MB.')
      return
    }
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    if (!supabase || !user || user.id === 'local-demo-user') {
      addProfileFeedEvent('Photo preview changed locally; sign in to save it securely.', 'pending')
      return
    }

    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await supabase.storage.from('profile-avatars').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      showNotice(`Photo upload failed: ${uploadError.message}`)
      return
    }
    const { error: profileError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.id)
    if (profileError) {
      await supabase.storage.from('profile-avatars').remove([path])
      showNotice(`Photo metadata could not be saved: ${profileError.message}`)
      return
    }
    const { data } = await supabase.storage.from('profile-avatars').createSignedUrl(path, 3600)
    if (data?.signedUrl) setAvatarUrl(data.signedUrl)
    setAvatarPreview('')
    setUser((current) => current ? { ...current, avatarPath: path } : current)
    addProfileFeedEvent('Profile photo saved to private storage.', 'success')
    showNotice('Profile photo updated.')
  }

  const handleVerificationDocument = async (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'application/pdf'].includes(file.type)) {
      showNotice('Only JPEG and PDF verification files are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotice('Verification files must be 5MB or smaller.')
      return
    }

    const localDocument: VerificationDocument = {
      id: crypto.randomUUID(),
      name: file.name,
      documentType: documentUploadType,
      mimeType: file.type,
      status: 'local',
      submittedAt: new Date().toISOString(),
    }

    if (!supabase || !user || user.id === 'local-demo-user') {
      setVerificationDocuments((documents) => [localDocument, ...documents])
      addProfileFeedEvent(`${file.name} added as a local preview; it has not been submitted for review.`, 'pending')
      showNotice('Local preview added. Sign in to submit documents securely for review.')
      return
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('kyc-documents').upload(storagePath, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      showNotice(`Document upload failed: ${uploadError.message}`)
      return
    }

    const { data, error: recordError } = await supabase.from('profile_documents').insert({
      user_id: user.id,
      storage_path: storagePath,
      original_name: file.name,
      document_type: documentUploadType,
      mime_type: file.type,
      file_size: file.size,
    }).select('id, original_name, document_type, mime_type, status, submitted_at').single()
    if (recordError) {
      await supabase.storage.from('kyc-documents').remove([storagePath])
      showNotice(`Document record could not be created: ${recordError.message}`)
      return
    }
    setVerificationDocuments((documents) => [{
      id: data.id,
      name: data.original_name,
      documentType: data.document_type,
      mimeType: data.mime_type,
      status: data.status,
      submittedAt: data.submitted_at,
    }, ...documents])
    addProfileFeedEvent(`${file.name} queued for document review.`, 'pending')
    showNotice(`${file.name} uploaded securely and queued for review.`)
  }

  const handleQuestionnaireSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!questionnaire.primaryGoal || !questionnaire.incomeBand || !questionnaire.derivativeExperience || !questionnaire.referralSource) {
      showNotice('Complete all required suitability questions before submitting.')
      return
    }
    if (supabase && user && user.id !== 'local-demo-user') {
      const { error } = await supabase.from('profile_suitability_responses').upsert({
        user_id: user.id,
        primary_goal: questionnaire.primaryGoal,
        income_band: questionnaire.incomeBand,
        derivative_experience: questionnaire.derivativeExperience,
        risk_percentage: questionnaire.riskPercentage,
        referral_source: questionnaire.referralSource,
        updated_at: new Date().toISOString(),
      })
      if (error) {
        showNotice(`Questionnaire could not be saved: ${error.message}`)
        return
      }
    }
    setQuestionnaireSubmitted(true)
    addProfileFeedEvent('Suitability questionnaire submitted and awaiting review.', supabase && user?.id !== 'local-demo-user' ? 'success' : 'pending')
    showNotice(supabase && user?.id !== 'local-demo-user' ? 'Questionnaire submitted for review.' : 'Questionnaire saved in this local session only.')
  }

  const handleChartToolClick = (tool: typeof selectedChartTool) => {
    switch (tool) {
      case 'crosshair':
        setSelectedChartTool(tool)
        break
      case 'trendline':
      case 'fibonacci':
      case 'shapes':
      case 'brush':
      case 'text':
      case 'ruler':
      case 'zoom':
      case 'horizontal':
      case 'vertical':
      case 'arrow':
      case 'ellipse':
      case 'pan':
        setSelectedChartTool(tool)
        break
      case 'magnet':
        setMagnetEnabled((enabled) => !enabled)
        setSelectedChartTool(tool)
        break
      case 'lock':
        setDrawingsLocked((locked) => !locked)
        setSelectedChartTool(tool)
        break
      case 'delete':
        setClearChartSignal((signal) => signal + 1)
        setSelectedChartTool('crosshair')
        break
      default:
        break
    }
  }

  // MAIN TRADINGVIEW WORKSPACE (CORE DASHBOARD / FOREX ENGINE)
  const renderTradingViewWorkspace = () => (
    <div className="pro-terminal-grid">
      <section className="tradingview-main-card">
        {/* TOP TRADINGVIEW CONTROL HEADER */}
        <div className="tv-top-control-header">
          <div className="tv-control-group">
            <div className="tv-symbol-pill" onClick={() => showNotice('Asset search menu opened.')}>
              <span>🟡</span> <span>{selectedAsset}</span>
            </div>

            <button type="button" className="tv-btn-icon tv-desktop-only" onClick={() => showNotice('Compare assets tool opened')}>+</button>

            <select className="control-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
              <option value="1s">1s</option>
              <option value="5s">5s</option>
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="1d">1d</option>
            </select>

            <select className="control-select" value={chartStyle} onChange={(e) => setChartStyle(e.target.value as ChartStyle)}>
              <option value="Candlesticks">📊 Candlesticks</option>
              <option value="Lines">📈 Lines</option>
              <option value="Heikin Ashi">🕯️ Heikin Ashi</option>
              <option value="Area">🗻 Area</option>
              <option value="Renko">🧱 Renko</option>
              <option value="Kagi">📉 Kagi</option>
            </select>

            <button type="button" className="tv-btn-icon active" onClick={() => setModal('indicator_menu')}>
              <SlidersHorizontal size={14} /> Indicators
            </button>

            {/* Expandable Chart Workspace Toggle Button */}
            <button
              type="button"
              className={`tv-btn-icon tv-desktop-only ${isChartExpanded ? 'active' : ''}`}
              onClick={() => {
                setIsChartExpanded(!isChartExpanded)
                showNotice(isChartExpanded ? 'Docked DOM sidebar' : 'Expanded chart canvas to 100% width!')
              }}
            >
              {isChartExpanded ? <SidebarOpen size={14} /> : <SidebarClose size={14} />}
              {isChartExpanded ? 'Dock DOM' : 'Expand Chart'}
            </button>

            {/* Leverage Quick Selector */}
            <select className="control-select" value={leverage} onChange={(e) => {
              setLeverage(e.target.value)
              showNotice(`Leverage set to ${e.target.value}`)
            }}>
              <option value="1:100">Leverage 1:100</option>
              <option value="1:200">Leverage 1:200</option>
              <option value="1:500">Leverage 1:500</option>
              <option value="1:1000">Leverage 1:1000</option>
            </select>

            <button type="button" className="tv-btn-icon tv-desktop-only" onClick={() => changeView('institutions')}>
              <LayoutDashboard size={14} /> Grid
            </button>
            <button type="button" className="tv-btn-icon tv-desktop-only" onClick={() => showNotice('Alert created for price level')}>
              <Clock size={14} /> Alert
            </button>
            <button type="button" className="tv-btn-icon tv-desktop-only" onClick={() => showNotice('Bar Replay mode engaged')}>
              <RotateCcw size={14} /> Replay
            </button>
            <button type="button" className="tv-btn-icon tv-desktop-only" title="Undo"><RotateCcw size={12} /></button>
            <button type="button" className="tv-btn-icon tv-desktop-only" title="Redo"><RotateCw size={12} /></button>
          </div>

          <div className="tv-control-group">
            <button type="button" className="tv-btn-icon" style={{ color: 'var(--mint-teal)', fontWeight: 800 }} onClick={toggleFullscreen}>
              <Maximize2 size={14} /> Fullscreen
            </button>
            {/* Market Mode Selector */}
            <div className="mkt-mode-selector">
              <button type="button" className={`mkt-mode-btn mkt-mode-synthetic ${marketMode === 'synthetic' ? 'mkt-mode-active' : ''}`} onClick={() => { setMarketMode('synthetic'); showNotice('Switched to Synthetic Market mode.') }}>
                <Zap size={12} /> Synthetic
              </button>
              <button type="button" className={`mkt-mode-btn mkt-mode-live ${marketMode === 'live' ? 'mkt-mode-active' : ''}`} onClick={() => { setMarketMode('live'); showNotice('Switched to Live Market mode.') }}>
                <Activity size={12} /> Live
              </button>
            </div>
            {/* AI Scanner toggle */}
            <button type="button" className={`tv-btn-icon ${aiScannerOpen ? 'active' : ''}`} onClick={() => setAiScannerOpen(p => !p)} style={{ color: aiScannerOpen ? '#00e5ff' : undefined }}>
              <Brain size={14} /> AI Scan
            </button>
            {/* Quantum Auto-Bot toggle */}
            <button
              type="button"
              className={`tv-btn-icon ${autoTraderActive ? 'active' : ''}`}
              onClick={() => {
                const next = !autoTraderActive
                setAutoTraderActive(next)
                showNotice(next ? '🤖 Quantum Auto-Bot ACTIVATED! Placing automated trades...' : '🛑 Quantum Auto-Bot STOPPED.')
              }}
              style={{
                color: autoTraderActive ? '#00e676' : undefined,
                border: autoTraderActive ? '1px solid #00e676' : undefined,
                background: autoTraderActive ? 'rgba(0,230,118,0.15)' : undefined
              }}
            >
              <Zap size={14} /> Auto-Bot {autoTraderActive ? `ON (${autoTradeCount})` : 'OFF'}
            </button>
            <span className="tv-desktop-only" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cloud size={12} color="var(--mint-teal)" /> Unnamed Save
            </span>
            <button type="button" className="tv-btn-icon tv-desktop-only" title="Take Snapshot" onClick={() => showNotice('Chart Snapshot captured!')}>
              <Camera size={14} />
            </button>
            <button type="button" className="button button-mint" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => handleExecuteTrade(true)}>
              Trade
            </button>
          </div>
        </div>

        {/* OHLC & LIVE DATA ROW */}
        <div className="tv-ohlc-info-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🟡 {selectedAsset} Spot / U.S. Dollar · {timeframe} · OANDA</span>
            <div className="tv-ohlc-values">
              <span>O 4,147.695</span>
              <span>H 4,148.475</span>
              <span>L 4,146.970</span>
              <span style={{ color: 'var(--bull-green)' }}>C 4,148.100 +0.335 (+0.01%)</span>
            </div>
          </div>
          {activeIndicators.vwma && <span style={{ color: 'var(--accent-blue)' }}>VWMA 20 close 0: 4,143.883</span>}
        </div>

        {/* MOBILE WORKSPACE TOOLS TRIGGER BAR & DROPDOWNS */}
        <div className="mobile-workspace-tools-bar" style={{ position: 'relative' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              type="button"
              className="mobile-workspace-tool-trigger"
              onClick={() => {
                setChartToolsMenuOpen(!chartToolsMenuOpen)
                setMarketHubMenuOpen(false)
              }}
            >
              <Pencil size={15} color="var(--mint-teal)" />
              <span>Drawing Tools</span>
              <ChevronDown size={12} style={{ transform: chartToolsMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* DRAWING TOOLS DROPDOWN MENU */}
            {chartToolsMenuOpen && (
              <div className="mobile-tools-dropdown-menu">
                <div className="mobile-tools-dropdown-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pencil size={14} color="var(--mint-teal)" />
                    <strong>Select Drawing Tool</strong>
                  </div>
                  <button type="button" onClick={() => setChartToolsMenuOpen(false)} className="mobile-tools-dropdown-close">
                    <X size={14} />
                  </button>
                </div>
                <div className="mobile-tools-dropdown-grid">
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'crosshair' ? 'active' : ''}`} onClick={() => { handleChartToolClick('crosshair'); setChartToolsMenuOpen(false); }}>
                    <Crosshair size={16} />
                    <span>Crosshair</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'trendline' ? 'active' : ''}`} onClick={() => { handleChartToolClick('trendline'); setChartToolsMenuOpen(false); }}>
                    <Pencil size={16} />
                    <span>Trendline</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'fibonacci' ? 'active' : ''}`} onClick={() => { handleChartToolClick('fibonacci'); setChartToolsMenuOpen(false); }}>
                    <Sliders size={16} />
                    <span>Fibonacci</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'shapes' ? 'active' : ''}`} onClick={() => { handleChartToolClick('shapes'); setChartToolsMenuOpen(false); }}>
                    <Layers size={16} />
                    <span>Shapes</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'brush' ? 'active' : ''}`} onClick={() => { handleChartToolClick('brush'); setChartToolsMenuOpen(false); }}>
                    <Brush size={16} />
                    <span>Brush</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'text' ? 'active' : ''}`} onClick={() => { handleChartToolClick('text'); setChartToolsMenuOpen(false); }}>
                    <Type size={16} />
                    <span>Text Note</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'ruler' ? 'active' : ''}`} onClick={() => { handleChartToolClick('ruler'); setChartToolsMenuOpen(false); }}>
                    <Ruler size={16} />
                    <span>Measure</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'horizontal' ? 'active' : ''}`} onClick={() => { handleChartToolClick('horizontal'); setChartToolsMenuOpen(false); }}>
                    <Minus size={16} />
                    <span>Horizontal</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'vertical' ? 'active' : ''}`} onClick={() => { handleChartToolClick('vertical'); setChartToolsMenuOpen(false); }}>
                    <MoveVertical size={16} />
                    <span>Vertical</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'arrow' ? 'active' : ''}`} onClick={() => { handleChartToolClick('arrow'); setChartToolsMenuOpen(false); }}>
                    <ArrowUpRight size={16} />
                    <span>Arrow</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'ellipse' ? 'active' : ''}`} onClick={() => { handleChartToolClick('ellipse'); setChartToolsMenuOpen(false); }}>
                    <Circle size={16} />
                    <span>Ellipse</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'pan' ? 'active' : ''}`} onClick={() => { handleChartToolClick('pan'); setChartToolsMenuOpen(false); }}>
                    <Move size={16} />
                    <span>Pan Chart</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${selectedChartTool === 'zoom' ? 'active' : ''}`} onClick={() => { handleChartToolClick('zoom'); setChartToolsMenuOpen(false); }}>
                    <ZoomIn size={16} />
                    <span>Zoom</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${magnetEnabled ? 'active' : ''}`} onClick={() => { handleChartToolClick('magnet'); setChartToolsMenuOpen(false); }}>
                    <Magnet size={16} />
                    <span>Magnet</span>
                  </button>
                  <button type="button" className={`mobile-tool-btn ${drawingsLocked ? 'active' : ''}`} onClick={() => { handleChartToolClick('lock'); setChartToolsMenuOpen(false); }}>
                    <Settings size={16} />
                    <span>Lock All</span>
                  </button>
                  <button type="button" className="mobile-tool-btn delete" onClick={() => { handleChartToolClick('delete'); setChartToolsMenuOpen(false); }}>
                    <Trash size={16} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative', flex: 1 }}>
            <button
              type="button"
              className="mobile-workspace-tool-trigger"
              onClick={() => {
                setMarketHubMenuOpen(!marketHubMenuOpen)
                setChartToolsMenuOpen(false)
              }}
            >
              <List size={15} color="var(--neon-cyan)" />
              <span>Market Hub &amp; Alerts</span>
              <ChevronDown size={12} style={{ transform: marketHubMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* MARKET HUB DROPDOWN MENU */}
            {marketHubMenuOpen && (
              <div className="mobile-tools-dropdown-menu">
                <div className="mobile-tools-dropdown-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <List size={14} color="var(--neon-cyan)" />
                    <strong>Market &amp; Alerts</strong>
                  </div>
                  <button type="button" onClick={() => setMarketHubMenuOpen(false)} className="mobile-tools-dropdown-close">
                    <X size={14} />
                  </button>
                </div>
                <div className="mobile-tools-dropdown-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <button type="button" className="mobile-tool-btn" onClick={() => { changeView('assets'); setMarketHubMenuOpen(false); }}>
                    <List size={18} />
                    <span>Watchlist</span>
                  </button>
                  <button type="button" className="mobile-tool-btn" onClick={() => { showNotice('Price Alerts Active'); setMarketHubMenuOpen(false); }}>
                    <Clock size={18} />
                    <span>Alerts</span>
                  </button>
                  <button type="button" className="mobile-tool-btn" onClick={() => { showNotice('Notifications Active'); setMarketHubMenuOpen(false); }}>
                    <Bell size={18} />
                    <span>Notifications</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE AREA: TRADINGVIEW PRO DRAWING TOOLBAR + CANDLESTICK CANVAS + DOM + RIGHT TOOLBAR */}
        <div className={`chart-workspace-container ${isChartExpanded ? 'expanded-canvas' : ''}`}>
          {/* TRADINGVIEW PRO LEFT DRAWING TOOLBAR (EXACT MATCH TO TRADINGVIEW UI) */}
          <aside className="drawing-toolbar">
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'crosshair' ? 'active' : ''}`} title="Crosshair / Cursor" onClick={() => handleChartToolClick('crosshair')}><Crosshair size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'trendline' ? 'active' : ''}`} title="Trendline / Ray" onClick={() => handleChartToolClick('trendline')}><Pencil size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'fibonacci' ? 'active' : ''}`} title="Fibonacci Retracement" onClick={() => handleChartToolClick('fibonacci')}><Sliders size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'shapes' ? 'active' : ''}`} title="Geometric Shapes" onClick={() => handleChartToolClick('shapes')}><Layers size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'brush' ? 'active' : ''}`} title="Brush & Highlighter" onClick={() => handleChartToolClick('brush')}><Brush size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'text' ? 'active' : ''}`} title="Text Annotation" onClick={() => handleChartToolClick('text')}><Type size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'ruler' ? 'active' : ''}`} title="Measure / Ruler" onClick={() => handleChartToolClick('ruler')}><Ruler size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'horizontal' ? 'active' : ''}`} title="Horizontal Price Line" onClick={() => handleChartToolClick('horizontal')}><Minus size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'vertical' ? 'active' : ''}`} title="Vertical Time Line" onClick={() => handleChartToolClick('vertical')}><MoveVertical size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'arrow' ? 'active' : ''}`} title="Arrow" onClick={() => handleChartToolClick('arrow')}><ArrowUpRight size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'ellipse' ? 'active' : ''}`} title="Ellipse" onClick={() => handleChartToolClick('ellipse')}><Circle size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'pan' ? 'active' : ''}`} title="Pan Chart" onClick={() => handleChartToolClick('pan')}><Move size={16} /></button>
            <button type="button" className={`draw-tool-btn ${selectedChartTool === 'zoom' ? 'active' : ''}`} title="Zoom Region" onClick={() => handleChartToolClick('zoom')}><ZoomIn size={16} /></button>
            <button type="button" className={`draw-tool-btn ${magnetEnabled ? 'active' : ''}`} title="Magnet Mode" aria-pressed={magnetEnabled} onClick={() => handleChartToolClick('magnet')}><Magnet size={16} /></button>
            <button type="button" className={`draw-tool-btn ${drawingsLocked ? 'active' : ''}`} title="Lock All Drawings" aria-pressed={drawingsLocked} onClick={() => handleChartToolClick('lock')}><Settings size={16} /></button>
            <button type="button" className="draw-tool-btn" title="Delete All Drawings" onClick={() => handleChartToolClick('delete')}><Trash size={16} /></button>
          </aside>

          {/* CANVAS AREA WITH INTEGRATED SUB-OSCILLATORS */}
          <div className="chart-canvas-area" data-tool={selectedChartTool} style={{ position: 'relative' }}>
            <div className="chart-tool-status">{chartToolLabels[selectedChartTool]} Tool Active</div>
            <TradingViewCandlestickCanvas symbol={selectedAsset} chartStyle={chartStyle} timeframe={timeframe} dateRange={selectedChartRange} tool={selectedChartTool} magnetEnabled={magnetEnabled} drawingsLocked={drawingsLocked} clearSignal={clearChartSignal} indicators={activeIndicators} onExecuteTrade={(isBuy, price) => handleExecuteTrade(isBuy, selectedAsset, price)} />

            {/* AI ENTRY SCANNER PANEL */}
            {aiScannerOpen && (
              <div className="ai-scanner-dock">
                <AiScanner
                  symbol={selectedAsset}
                  currentPrice={quotes.find(q => q.symbol === selectedAsset)?.price ?? 0}
                  onAutoTrade={handleAiAutoTrade}
                  pricePrecision={selectedPricePrecision}
                />
              </div>
            )}
            <div className="chart-tool-overlay" aria-live="polite">
              {selectedChartTool === 'crosshair' && 'Crosshair mode: precise price tracking'}
              {selectedChartTool === 'trendline' && 'Trendline mode: draw support and resistance'}
              {selectedChartTool === 'fibonacci' && 'Fibonacci mode: projection and retracement'}
              {selectedChartTool === 'shapes' && 'Shapes mode: geometric markups'}
              {selectedChartTool === 'brush' && 'Brush mode: freehand highlight'}
              {selectedChartTool === 'text' && 'Text mode: annotate important levels'}
              {selectedChartTool === 'ruler' && 'Ruler mode: measure distance and move'}
              {selectedChartTool === 'horizontal' && 'Horizontal line: click a price level'}
              {selectedChartTool === 'vertical' && 'Vertical line: click a time position'}
              {selectedChartTool === 'arrow' && 'Arrow mode: drag to mark direction'}
              {selectedChartTool === 'ellipse' && 'Ellipse mode: drag to mark a region'}
              {selectedChartTool === 'pan' && 'Pan mode: drag to move the chart'}
              {selectedChartTool === 'zoom' && 'Zoom mode: inspect a tighter region'}
              {selectedChartTool === 'magnet' && 'Magnet mode: snap to price levels'}
              {selectedChartTool === 'lock' && 'Locked mode: drawings secured'}
              {selectedChartTool === 'delete' && 'Delete mode: clear selected drawing'}
            </div>

            {/* Sub-Oscillator 1: MACD (if enabled) */}
            {activeIndicators.macd && (
              <div style={{ background: '#060912', borderRadius: '6px', padding: '6px 10px', height: '50px', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--mint-teal)', fontWeight: 700 }}>MACD (12, 26, 9) Histogram</div>
                <svg viewBox="0 0 500 30" preserveAspectRatio="none" style={{ width: '100%', height: '24px' }}>
                  <line x1="0" y1="15" x2="500" y2="15" stroke="rgba(255,255,255,0.1)" />
                  <path d="M 0 15 Q 120 5 250 25 T 500 10" stroke="var(--mint-teal)" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            )}

            {/* Sub-Oscillator 2: RSI (if enabled) */}
            {activeIndicators.rsi && (
              <div style={{ background: '#060912', borderRadius: '6px', padding: '6px 10px', height: '50px', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--neon-cyan)', fontWeight: 700 }}>RSI (14) Oscillator</div>
                <svg viewBox="0 0 500 30" preserveAspectRatio="none" style={{ width: '100%', height: '24px' }}>
                  <line x1="0" y1="8" x2="500" y2="8" stroke="var(--accent-amber)" strokeDasharray="3" opacity="0.4" />
                  <line x1="0" y1="22" x2="580" y2="22" stroke="var(--mint-teal)" strokeDasharray="3" opacity="0.4" />
                  <path d="M 0 15 Q 150 5 300 25 T 500 12" stroke="var(--neon-cyan)" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM DATE RANGE & TIMEZONE BAR */}
        <div className="tv-bottom-range-bar">
          <div style={{ display: 'flex', gap: '4px' }}>
            {Object.keys(chartRangeCandleCounts).map((range) => (
              <button
                key={range}
                type="button"
                className={`tv-range-btn ${selectedChartRange === range ? 'active' : ''}`}
                aria-pressed={selectedChartRange === range}
                onClick={() => setSelectedChartRange(range as ChartRange)}
              >
                {range}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-code)' }}>00:48:10 UTC</span>
          </div>
        </div>

        {/* 🤖 QUANTUM AUTO-TRADER BOT CONTROL PANEL */}
        <div style={{ background: 'rgba(10, 15, 29, 0.85)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '14px 16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#00e676" />
              <strong style={{ fontSize: '14px', color: '#ffffff' }}>Quantum Auto-Trading Bot</strong>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: autoTraderActive ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.08)', color: autoTraderActive ? '#00e676' : '#a0aec0', fontWeight: 800 }}>
                {autoTraderActive ? '🟢 RUNNING' : '⚪ IDLE'}
              </span>
            </div>

            <button
              type="button"
              className="button"
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 800,
                background: autoTraderActive ? 'rgba(255,23,68,0.2)' : 'linear-gradient(135deg, #00e5ff, #00e676)',
                border: autoTraderActive ? '1px solid #ff1744' : 'none',
                color: autoTraderActive ? '#ff1744' : '#000000',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => {
                const next = !autoTraderActive
                setAutoTraderActive(next)
                showNotice(next ? '🤖 Quantum Auto-Bot Started! Placing automated trades...' : '🛑 Auto-Bot Stopped.')
              }}
            >
              {autoTraderActive ? 'Stop Auto-Bot' : 'Start Auto-Bot'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Trade Volume (Lots)
              <select className="control-select" style={{ marginTop: '4px', width: '100%' }} value={autoTraderLots} onChange={(e) => setAutoTraderLots(e.target.value)}>
                <option value="0.1">0.10 Lots</option>
                <option value="0.5">0.50 Lots</option>
                <option value="1.0">1.00 Lot</option>
                <option value="2.0">2.00 Lots</option>
                <option value="5.0">5.00 Lots</option>
              </select>
            </label>

            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Execution Speed
              <select className="control-select" style={{ marginTop: '4px', width: '100%' }} value={autoTraderInterval} onChange={(e) => setAutoTraderInterval(Number(e.target.value))}>
                <option value={3}>Every 3 Seconds</option>
                <option value={5}>Every 5 Seconds</option>
                <option value={10}>Every 10 Seconds</option>
                <option value={15}>Every 15 Seconds</option>
              </select>
            </label>

            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Direction Strategy
              <select className="control-select" style={{ marginTop: '4px', width: '100%' }} value={autoTraderDirection} onChange={(e) => setAutoTraderDirection(e.target.value as 'AUTO' | 'BUY' | 'SELL')}>
                <option value="AUTO">🤖 Smart AI Auto</option>
                <option value="BUY">📈 Always BUY (Long)</option>
                <option value="SELL">📉 Always SELL (Short)</option>
              </select>
            </label>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Orders Placed</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--neon-cyan)' }}>{autoTradeCount} Trades</div>
            </div>
          </div>
        </div>

        {/* INTEGRATED DOCKABLE EXECUTION TERMINAL */}
        <div className="integrated-execution-terminal">
          <div className="execution-group">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Lot size calculator</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className={`lot-btn-mini ${lotMode === 'Micro' ? 'active' : ''}`} onClick={() => { setLotMode('Micro'); setLotSize('0.01') }}>Micro 0.01</button>
                <button type="button" className={`lot-btn-mini ${lotMode === 'To' ? 'active' : ''}`} onClick={() => { setLotMode('To'); setLotSize('0.05') }}>To 0.05</button>
                <button type="button" className={`lot-btn-mini ${lotMode === 'Pip' ? 'active' : ''}`} onClick={() => { setLotMode('Pip'); setLotSize('1.0') }}>Pip 1.0</button>
                <button type="button" className={`lot-btn-mini ${lotMode === 'Standard' ? 'active' : ''}`} onClick={() => { setLotMode('Standard'); setLotSize('100+') }}>Standard 100+</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '3px 8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Custom:</span>
                  <input
                    type="text"
                    placeholder="0.01"
                    value={lotSize}
                    onChange={(e) => handleLotSizeChange(e.target.value)}
                    style={{ width: '68px', background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-code)', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Lot / Out</span>
              <strong style={{ fontSize: '13px', color: 'var(--mint-teal)' }}>{lotMode} ({lotSize})</strong>
            </div>
          </div>

          <div className="execution-group">
            <button type="button" className="btn-oneclick-green" onClick={() => handleExecuteTrade(true)}>
              <span>BUY</span>
              <small>{(selectedQuote.price + selectedSpread / 2).toFixed(selectedPricePrecision)}</small>
            </button>
            <button type="button" className="btn-oneclick-red" onClick={() => handleExecuteTrade(false)}>
              <span>SELL</span>
              <small>{(selectedQuote.price - selectedSpread / 2).toFixed(selectedPricePrecision)}</small>
            </button>

            <button type="button" className="button button-mint" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setModal('order')}>
              Order Execution
            </button>
          </div>
        </div>
      </section>
    </div>
  )

  // VIEW: OPEN & CLOSED TRADES PAGE (/trades)
  const renderOpenAndClosedTrades = () => (
    <section className="profile-monitor-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="section-kicker" style={{ color: 'var(--mint-teal)' }}>TRADE EXECUTION & POSITIONS CENTER</span>
          <h2>Open Trades & Closed History</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage active running orders, monitor real-time margin &amp; floating P&amp;L, and close trades individually or all at once.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {openPositions.length > 0 && (
            <button
              type="button"
              className="button"
              style={{
                background: 'rgba(255, 23, 68, 0.15)',
                border: '1px solid rgba(255, 23, 68, 0.4)',
                color: '#ff1744',
                fontWeight: 800,
                fontSize: '12px',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={handleCloseAllPositions}
            >
              <Trash2 size={14} />
              Close All Trades ({openPositions.length})
            </button>
          )}
          <div style={{ background: '#0a0f1d', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Account Equity</span>
            <strong style={{ fontSize: '16px', color: 'var(--mint-teal)', fontFamily: 'var(--font-code)' }}>${currentEquity.toFixed(2)}</strong>
          </div>
          <div style={{ background: '#0a0f1d', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Margin Level</span>
            <strong style={{ fontSize: '16px', color: 'var(--neon-cyan)', fontFamily: 'var(--font-code)' }}>{marginLevelPercent}%</strong>
          </div>
        </div>
      </div>

      {/* ACTIVE OPEN POSITIONS TABLE */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--mint-teal)" /> Running Open Trades ({openPositions.length})
          </h4>
          {openPositions.length > 0 && (
            <div style={{ fontSize: '13px', color: totalOpenProfit >= 0 ? '#00e676' : '#ff1744', fontWeight: 800 }}>
              Floating P&amp;L: {totalOpenProfit >= 0 ? `+$${totalOpenProfit.toFixed(2)}` : `-$${Math.abs(totalOpenProfit).toFixed(2)}`}
            </div>
          )}
        </div>

        {openPositions.length === 0 ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '36px 20px', textAlign: 'center' }}>
            <Activity size={32} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '8px' }} />
            <h5 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>No Active Open Trades</h5>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>You currently have no open positions. Open a position from the chart or market scanner.</p>
            <button
              type="button"
              className="button button-mint"
              onClick={() => changeView('synthetic')}
              style={{ padding: '8px 20px', fontSize: '12px', fontWeight: 800 }}
            >
              Go to Trading Terminal &rarr;
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pro-data-table">
              <thead>
                <tr>
                  <th>Trade ID</th>
                  <th>Asset Symbol</th>
                  <th>Type</th>
                  <th>Lots</th>
                  <th>Entry Price</th>
                  <th>Current Price</th>
                  <th>Margin Used</th>
                  <th>Floating P&amp;L</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {markedPositions.map((pos) => {
                  const quote = quotes.find((item) => item.symbol === pos.symbol)
                  const currentPrice = quote?.price ?? pos.openPrice
                  const isJPY = pos.symbol.endsWith('JPY')
                  const isFx = pos.symbol.includes('/') && pos.symbol.length === 7
                  const precision = isJPY ? 3 : isFx ? 5 : 2
                  return (
                    <tr key={pos.id}>
                      <td><code style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>#{pos.id}</code></td>
                      <td><strong>{pos.symbol}</strong></td>
                      <td>
                        <span className={pos.type === 'BUY' ? 'ticker-up' : 'ticker-down'} style={{ fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: pos.type === 'BUY' ? 'rgba(0,230,118,0.12)' : 'rgba(255,23,68,0.12)' }}>
                          {pos.type}
                        </span>
                      </td>
                      <td><strong>{pos.lots}</strong></td>
                      <td>${pos.openPrice.toFixed(precision)}</td>
                      <td className="pnl-live-ticker">${currentPrice.toFixed(precision)}</td>
                      <td>${pos.margin.toFixed(2)}</td>
                      <td>
                        <strong className={`pnl-live-ticker ${pos.profit >= 0 ? 'ticker-up' : 'ticker-down'}`} style={{ fontSize: '13px', color: pos.profit >= 0 ? '#00e676' : '#ff1744', fontWeight: 800 }}>
                          {pos.profit >= 0 ? `+$${pos.profit.toFixed(2)}` : `-$${Math.abs(pos.profit).toFixed(2)}`}
                        </strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button"
                          style={{
                            padding: '5px 12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: 'rgba(255, 23, 68, 0.15)',
                            border: '1px solid rgba(255, 23, 68, 0.4)',
                            color: '#ff1744',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onClick={() => handleClosePosition(pos.id)}
                        >
                          Close Trade
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CLOSED TRADE HISTORY TABLE */}
      <div style={{ marginTop: '32px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--accent-blue)" /> Closed Trade History ({closedTrades.length})
        </h4>

        {closedTrades.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No closed trade history recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pro-data-table">
              <thead>
                <tr>
                  <th>Trade ID</th>
                  <th>Asset Symbol</th>
                  <th>Type</th>
                  <th>Lots</th>
                  <th>Open Price</th>
                  <th>Close Price</th>
                  <th>Realized P&amp;L</th>
                  <th>Closed Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.map((t) => (
                  <tr key={t.id}>
                    <td><code>#{t.id}</code></td>
                    <td><strong>{t.symbol}</strong></td>
                    <td><span className={t.type === 'BUY' ? 'ticker-up' : 'ticker-down'} style={{ fontWeight: 800 }}>{t.type}</span></td>
                    <td>{t.lots}</td>
                    <td>${t.openPrice.toFixed(2)}</td>
                    <td>${t.closePrice.toFixed(2)}</td>
                    <td><strong className={t.pnl >= 0 ? 'ticker-up' : 'ticker-down'} style={{ fontSize: '13px', color: t.pnl >= 0 ? '#00e676' : '#ff1744', fontWeight: 800 }}>{t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}</strong></td>
                    <td><small style={{ fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>{t.closedAt}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )

  // VIEW 2: ASSET SUITE & LIVE REAL-TIME QUOTES
  const renderAssetSuite = () => (
    <section className="profile-monitor-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Asset Suite & Real-Time Quotes Feed</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live dynamic quotes stream across Forex, Crypto, Quantum Synthetics, Commodities, and Stock Indices.</p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginTop: '12px' }}>
        <table className="pro-data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Asset Name</th>
              <th>Symbol</th>
              <th>Live Bid Price</th>
              <th>24h Change</th>
              <th>Spread</th>
              <th>24h High / Low</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((a) => (
              <tr key={a.symbol}>
                <td><small style={{ color: 'var(--text-muted)' }}>{a.category}</small></td>
                <td><strong>{a.name}</strong></td>
                <td><code style={{ color: 'var(--mint-teal)' }}>{a.symbol}</code></td>
                <td>
                  <strong className={a.isUp ? 'ticker-up' : 'ticker-down'}>
                    ${a.price > 10 ? a.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : a.price.toFixed(4)} {a.isUp ? '▲' : '▼'}
                  </strong>
                </td>
                <td><span className={a.isUp ? 'ticker-up' : 'ticker-down'}>{a.change}</span></td>
                <td>{a.spread}</td>
                <td><small style={{ fontFamily: 'var(--font-code)' }}>{a.high.toFixed(2)} / {a.low.toFixed(2)}</small></td>
                <td>
                  <button
                    type="button"
                    className="button button-dark"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => {
                      setSelectedAsset(a.symbol)
                      changeView('overview')
                      showNotice(`Launched ${a.symbol} live chart workspace.`)
                    }}
                  >
                    Open Chart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  // INVESTMENT COINS
  const getInvestmentMetrics = (tier: (typeof investmentCoinTiers)[number], amount: number) => {
    const normalizedPrincipal = Math.min(1, Math.max(0, amount / tier.maxInvestment))
    const effectiveRate = tier.minReturn + (tier.maxReturn - tier.minReturn) * normalizedPrincipal
    const projectedProfit = amount * (effectiveRate / 100)
    const projectedBalance = amount + projectedProfit
    return {
      normalizedPrincipal,
      effectiveRate,
      projectedProfit,
      projectedBalance,
    }
  }

  const formatCountdown = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const openInvestmentChart = (coinId: string) => {
    const coin = investmentCoinTiers.find((tier) => tier.id === coinId) ?? investmentCoinTiers[0]
    const stake = investmentStake[coin.id] ?? coin.minInvestment

    if (accountType === 'live' && liveBalance <= 0) {
      changeView('wallet')
      showNotice('⚠️ Your Real Account is unfunded ($0.00). Redirecting to Wallet page to make your deposit (+50% Bonus!).')
      return
    }

    if (accountType === 'live' && liveBalance < stake) {
      changeView('wallet')
      showNotice(`⚠️ Real Account balance ($${liveBalance.toFixed(2)}) is lower than required investment ($${stake.toLocaleString()}). Taking you to Wallet page.`)
      return
    }

    setSelectedInvestmentTier(coin.id)
    setSelectedAsset(coin.symbol)
    setTimeframe('1m')
    setSelectedChartRange('1D')
    setChartStyle('Candlesticks')
    setSelectedChartTool('crosshair')
    setInvestmentStartedAt(Date.now())
    setInvestmentCountdown(21 * 24 * 60 * 60)

    setActivePrincipal(stake)
    const midReturn = (coin.minReturn + coin.maxReturn) / 2 / 100
    setProjectedPayout(stake * midReturn)

    if (accountType === 'live') {
      setLiveBalance(prev => Math.max(0, prev - stake))
    } else if (accountType === 'demo') {
      setDemoBalance(prev => Math.max(0, prev - stake))
    }

    changeView('synthetic')
  }

  const renderCryptoAllocationLevels = () => {
    const activeInvestment = investmentCoinTiers.find((tier) => tier.id === selectedInvestmentTier) ?? investmentCoinTiers[0]
    const activeStake      = investmentStake[activeInvestment.id] ?? activeInvestment.minInvestment
    const activeMetrics    = getInvestmentMetrics(activeInvestment, activeStake)

    const riskColor: Record<string, string> = {
      Low: '#00e676', Moderate: '#00e5ff', Growth: '#f2b94b', Active: '#ff9800', Elite: '#d500f9',
    }

    return (
      <section className="profile-monitor-card investment-terminal-shell" style={{ gap: '20px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="investment-summary-header">
          <div>
            <span className="section-kicker">MULTI-TIER INVESTMENT</span>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Investment Coins</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Select a plan, set your amount, and start trading under your active investment.
            </p>
          </div>
          <div className="investment-timer-box">
            <span>Contract cycle</span>
            <strong>{formatCountdown(investmentCountdown)}</strong>
          </div>
        </div>

        {/* Active principal penalty banner */}
        {activePrincipal > 0 && projectedPayout > 0 && (
          <div className="investment-penalty-banner">
            <Activity size={14} color="#ff1744" style={{ flexShrink: 0 }} />
            <span>
              Active principal: <strong style={{ color: '#00e5ff' }}>${activePrincipal.toFixed(2)}</strong>
              &nbsp;·&nbsp; Projected 21-day payout: <strong style={{ color: '#00e676' }}>${projectedPayout.toFixed(2)}</strong>
              &nbsp;·&nbsp; Trading losses reduce both the principal and the interest payout proportionally.
            </span>
          </div>
        )}

        {/* ── TIER CARDS ─────────────────────────────────────────────── */}
        <div className="investment-coins-grid">
          {investmentCoinTiers.map((coin) => {
            const coinStake   = investmentStake[coin.id] ?? coin.minInvestment
            const coinMetrics = getInvestmentMetrics(coin, coinStake)
            const isSelected  = selectedInvestmentTier === coin.id
            const rc          = riskColor[coin.risk] ?? '#00e5ff'

            return (
              <article
                key={coin.id}
                className={`investment-coin-panel ${isSelected ? 'selected' : ''}`}
                style={{ cursor: 'pointer', borderColor: isSelected ? rc + '55' : undefined }}
                onClick={() => setSelectedInvestmentTier(coin.id)}
              >
                {/* Card header */}
                <header className="investment-coin-header">
                  <div>
                    <strong style={{ color: rc }}>{coin.id}</strong>
                    <span>{coin.name}</span>
                  </div>
                  <div className="investment-tier-tag" style={{ background: rc + '22', color: rc, borderColor: rc + '44' }}>
                    {coin.risk}
                  </div>
                </header>

                {/* Stats row */}
                <div className="investment-coin-meta-row">
                  <div><small>Min</small><strong>${coin.minInvestment.toLocaleString()}</strong></div>
                  <div><small>Max</small><strong>${coin.maxInvestment.toLocaleString()}</strong></div>
                  <div><small>Returns</small><strong style={{ color: rc }}>{coin.minReturn}–{coin.maxReturn}%</strong></div>
                  <div><small>Duration</small><strong>{coin.durationDays}d</strong></div>
                </div>

                {/* ── YIELD CURVE AREA CHART ─────────────────────────── */}
                <div className="investment-mini-chart secondary" style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, padding: '4px 8px 0', letterSpacing: '0.5px' }}>
                    YIELD CURVE — {coin.symbol}
                  </div>
                  <TradingViewCandlestickCanvas
                    symbol={coin.symbol}
                    chartStyle="Area"
                    timeframe="5m"
                    dateRange="1D"
                    showTradeBox={false}
                    isMini={true}
                    indicators={{ macd: false, rsi: false, vwma: true, bollinger: false }}
                    onExecuteTrade={() => {}}
                  />
                </div>

                {/* ── INVEST AMOUNT + CTA ─────────────────────────── */}
                <div className="inv-card-invest-block" onClick={e => e.stopPropagation()}>
                  {/* Amount stepper */}
                  <div className="inv-amount-row">
                    <span className="inv-amount-label">Investment Amount</span>
                    <div className="inv-stepper">
                      <button type="button" onClick={() =>
                        setInvestmentStake(curr => ({
                          ...curr,
                          [coin.id]: Math.max(coin.minInvestment, (curr[coin.id] ?? coin.minInvestment) - (coin.minInvestment >= 500 ? 100 : 10))
                        }))
                      }>−</button>
                      <input
                        type="number"
                        min={coin.minInvestment}
                        max={coin.maxInvestment}
                        value={coinStake}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setInvestmentStake(curr => ({
                            ...curr,
                            [coin.id]: Math.min(coin.maxInvestment, Math.max(coin.minInvestment, Number.isFinite(v) ? v : coin.minInvestment))
                          }))
                        }}
                      />
                      <button type="button" onClick={() =>
                        setInvestmentStake(curr => ({
                          ...curr,
                          [coin.id]: Math.min(coin.maxInvestment, (curr[coin.id] ?? coin.minInvestment) + (coin.minInvestment >= 500 ? 250 : 25))
                        }))
                      }>+</button>
                    </div>
                  </div>

                  {/* Projected return */}
                  <div className="inv-projected-row">
                    <span>Projected ROI</span>
                    <strong style={{ color: rc }}>{coinMetrics.effectiveRate.toFixed(0)}%</strong>
                    <span style={{ marginLeft: 'auto' }}>21d payout</span>
                    <strong style={{ color: '#00e676' }}>${coinMetrics.projectedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  </div>

                  {/* Progress bar */}
                  <div className="investment-coin-progress-track">
                    <span style={{ width: `${Math.min(100, coinMetrics.normalizedPrincipal * 100)}%`, background: rc }} />
                  </div>

                  {/* TWO SEPARATE CTAs */}
                  <div className="inv-cta-row">
                    {/* INVEST button — locks in the amount */}
                    <button
                      type="button"
                      className="inv-cta-btn inv-cta-invest"
                      style={{ background: `linear-gradient(135deg, ${rc}cc, ${rc}66)`, boxShadow: `0 4px 16px ${rc}33` }}
                      onClick={() => {
                        if (accountType === 'live' && liveBalance <= 0) {
                          changeView('wallet')
                          showNotice('⚠️ Your Real Account is unfunded ($0.00). Redirecting to Wallet page to make your deposit (+50% Bonus!).')
                          return
                        }
                        if (accountType === 'live' && liveBalance < coinStake) {
                          changeView('wallet')
                          showNotice(`⚠️ Real Account balance ($${liveBalance.toFixed(2)}) is lower than required investment ($${coinStake.toLocaleString()}). Taking you to Wallet page.`)
                          return
                        }

                        if (accountType === 'live') {
                          setLiveBalance(prev => Math.max(0, prev - coinStake))
                        } else if (accountType === 'demo') {
                          setDemoBalance(prev => Math.max(0, prev - coinStake))
                        }

                        setSelectedInvestmentTier(coin.id)
                        setActivePrincipal(coinStake)
                        const midReturn = (coin.minReturn + coin.maxReturn) / 2 / 100
                        setProjectedPayout(coinStake * midReturn)
                        showNotice(`✅ Invested $${coinStake.toLocaleString()} in ${coin.name}. 21-day cycle started.`)
                      }}
                    >
                      <Wallet size={14} />
                      Invest ${coinStake.toLocaleString()}
                    </button>

                    {/* TRADE button — navigate directly to synthetic page */}
                    <button
                      type="button"
                      className="inv-cta-btn inv-cta-trade"
                      style={{ width: '100%' }}
                      onClick={() => openInvestmentChart(coin.id)}
                    >
                      <Zap size={14} />
                      Trade Now
                      <Activity size={12} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {/* ── ACTIVE INVESTMENT SUMMARY PANEL ─────────────────────── */}
        <div className="investment-management-hub">
          <div className="investment-hub-summary">
            <div className="investment-hub-summary-head">
              <div>
                <span className="section-kicker">SELECTED PLAN</span>
                <h3>{activeInvestment.name}</h3>
              </div>
              <span className="investment-tier-tag active">{activeInvestment.id}</span>
            </div>
            <div className="investment-hub-stats">
              <div><small>Stake</small><strong>${activeStake.toLocaleString()}</strong></div>
              <div><small>ROI</small><strong>{activeMetrics.effectiveRate.toFixed(0)}%</strong></div>
              <div><small>Yield</small><strong>${activeMetrics.projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            </div>
            <div className="investment-note">
              Capital losses from open trades reduce both principal and projected payout proportionally.
            </div>
            <button
              type="button"
              className="button button-mint"
              onClick={() => openInvestmentChart(activeInvestment.id)}
              style={{ marginTop: '12px', width: '100%' }}
            >
              <Zap size={14} /> Open Synthetic Chart &amp; Trade Terminal
            </button>
          </div>

          <div className="investment-hub-activity">
            <div className="investment-hub-card">
              <span className="investment-card-label">Payout</span>
              <strong>${activeMetrics.projectedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="investment-hub-card">
              <span className="investment-card-label">Window</span>
              <strong>{activeInvestment.durationDays} days</strong>
            </div>
            <div className="investment-hub-card">
              <span className="investment-card-label">Risk</span>
              <strong>{activeInvestment.risk}</strong>
            </div>
            <div className="investment-hub-table">
              <div className="table-header"><span>Ledger</span><span>Value</span></div>
              <div className="table-row">
                <span>Principal</span>
                <strong>${activeStake.toLocaleString()}</strong>
              </div>
              <div className="table-row">
                <span>Projected gain</span>
                <strong>${activeMetrics.projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="table-row">
                <span>Target exit</span>
                <strong style={{ color: '#00e676' }}>${activeMetrics.projectedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        </div>

      </section>
    )
  }


  const renderSyntheticContracts = () => (
    <div style={{ width: '100%', height: 'calc(100vh - 90px)', minHeight: '720px', display: 'flex', flexDirection: 'column' }}>
      <iframe
        ref={syntheticTerminalRef}
        className="synthetic-terminal-iframe"
        src={`/synthetic_trading_terminal.html?theme=${theme}`}
        title="Synthetic Trading Terminal"
        style={{ width: '100%', height: '100%', minHeight: '720px', border: '0', display: 'block' }}
        onLoad={() => {
          syncSyntheticTerminalAccount()
        }}
      />
    </div>
  )

  // VIEW 6: INSTITUTIONS / MULTI-CHART TERMINAL
  const renderInstitutionsView = () => (
    <section className="profile-monitor-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Institutional Multi-Chart Execution Terminal</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>4-chart split view with individual coin/asset selectors, live order execution, and balance P&amp;L impact.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--mint-teal)', fontWeight: 700 }}>
            Volume: {lotSize} lots
          </span>
          <button type="button" className="button button-mint" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => showNotice('Institutional Backtest Report generated: 76.4% Win Rate, Profit Factor 2.84')}>
            <Activity size={14} /> Algo Backtest Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
        {gridSymbols.map((symbol, idx) => {
          const q = quotes.find(item => item.symbol === symbol) || initialAssetQuotes[0]
          const isForex = q.category === 'Forex Majors'
          const pip = isForex ? (symbol.endsWith('JPY') ? 0.01 : 0.0001) : symbol.includes('XAG') ? 0.001 : 0.01
          const precision = isForex ? (symbol.endsWith('JPY') ? 3 : 5) : 2
          const spreadVal = Number.parseFloat(q.spread) * pip
          const buyPrice = (q.price + spreadVal / 2).toFixed(precision)
          const sellPrice = (q.price - spreadVal / 2).toFixed(precision)

          return (
            <div key={idx} style={{ background: 'rgba(15, 20, 30, 0.85)', borderRadius: '14px', border: '1px solid var(--glass-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(20, 26, 40, 0.95)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={symbol}
                    onChange={(e) => updateGridSymbol(idx, e.target.value)}
                    style={{ background: 'rgba(10, 14, 22, 0.9)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: '12px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
                  >
                    {quotes.map(item => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.name} ({item.symbol})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(20, 184, 166, 0.15)', color: 'var(--mint-teal)', fontWeight: 700, border: '1px solid rgba(20, 184, 166, 0.3)' }}>
                    {q.category}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleExecuteTrade(true, symbol)}
                    style={{ background: 'linear-gradient(180deg, #10b981, #059669)', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    BUY {buyPrice}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteTrade(false, symbol)}
                    style={{ background: 'linear-gradient(180deg, #ef4444, #dc2626)', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    SELL {sellPrice}
                  </button>
                </div>
              </div>

              <div style={{ height: '280px', position: 'relative' }}>
                <TradingViewCandlestickCanvas symbol={symbol} chartStyle="Candlesticks" timeframe="1m" indicators={activeIndicators} onExecuteTrade={(isBuy, price) => handleExecuteTrade(isBuy, symbol, price)} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )

  // VIEW 7: DEDICATED PROFILE PAGE
  const renderDedicatedProfilePage = () => {
    const isKycApproved = (user as any)?.kycStatus === 'APPROVED' || (user as any)?.kycStatus === 'approved' || (user as any)?.kyc_status === 'approved' || (user as any)?.kyc_status === 'APPROVED' || (user as any)?.accountStatus === 'approved' || (user as any)?.accountStatus === 'APPROVED'

    return (
      <section className="verification-page">
        {isKycApproved && (
          <div className="kyc-approved-global-banner">
            <div className="kyc-banner-badge"><Check size={18} color="#fff" /></div>
            <div>
              <strong>KYC VERIFICATION APPROVED</strong>
              <span>Confirmation on {new Date().toLocaleString()} GM</span>
            </div>
          </div>
        )}

        <header className="verification-page-heading">
          <div>
            <span className="section-kicker">IDENTITY & COMPLIANCE</span>
            <h2>User Identity &amp; Global Verification Hub</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Signed in as <strong style={{ color: 'var(--mint-teal)' }}>{user?.email || user?.fullName || 'Trader'}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`verification-review-state ${isKycApproved ? 'approved' : 'pending'}`}>
              {isKycApproved ? '✓ APPROVED' : 'AWAITING APPROVAL'}
            </span>
            <button
              type="button"
              className="button button-dark"
              style={{ color: 'var(--bear-red)', border: '1px solid rgba(240,68,82,0.3)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              onClick={async () => {
                if (supabase) await supabase.auth.signOut()
                setUser(null)
                setAccountType('none')
                setDemoBalance(0)
                setLiveBalance(0)
                setLiveAccountCreated(false)
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        <div className="verification-layout">
          <article className="verification-panel identity-panel">
            <div className="verification-panel-title">
              <div>
                <span className="verification-eyebrow">ACCOUNT HOLDER</span>
                <h3>User Identity &amp; Profile</h3>
              </div>
              <span className="verification-step">01</span>
            </div>

            <div className="identity-person">
              <div className="identity-avatar-wrap">
                <div className="identity-avatar">
                  <img src={avatarPreview || avatarUrl || '/generic-profile-portrait.svg'} alt="Profile portrait" />
                </div>
                <input ref={avatarInputRef} className="visually-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleAvatarFile(event.currentTarget.files?.[0])} />
                <button type="button" className="identity-photo-link" onClick={() => avatarInputRef.current?.click()}><Camera size={13} /> Update Photo</button>
              </div>
              <div className="identity-holder-copy">
                <span className="verification-eyebrow">USERNAME</span>
                <strong>{profileDraft.displayName || 'Your name'}</strong>
                <span className="access-level-label">Access Level</span>
                <div className="access-level-insignia" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={22} />
                    <span>{user?.role === 'admin' ? 'ADMINISTRATOR' : 'CLIENT ACCESS'}</span>
                  </div>
                  {isKycApproved && (
                    <div style={{ background: 'rgba(0,200,83,0.15)', border: '1px solid #00C853', color: '#00C853', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 0 10px rgba(0,200,83,0.3)' }}>
                      ✓ FULLY VERIFIED
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form className="verification-form identity-form" onSubmit={(event) => void handleProfileSubmit(event)}>
              <div className="verification-form-heading">
                <h4>Your Identity</h4>
                <span>Account details</span>
              </div>
              <label className="verification-field">
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Display Name <Pencil size={12} /></span>
                  {isKycApproved && <span style={{ color: '#00C853', fontSize: '11px', fontWeight: 700 }}>✓ Verified</span>}
                </span>
                <input required readOnly={isKycApproved} value={profileDraft.displayName} onChange={(event) => !isKycApproved && setProfileDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="Your full name" />
              </label>
              <label className="verification-field">
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Account Email <Pencil size={12} /></span>
                  {isKycApproved && <span style={{ color: '#00C853', fontSize: '11px', fontWeight: 700 }}>✓ Verified</span>}
                </span>
                <input required type="email" readOnly={isKycApproved} value={profileDraft.email} onChange={(event) => !isKycApproved && setProfileDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" />
              </label>
              <label className="verification-field">
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Primary Phone Number <Pencil size={12} /></span>
                  {isKycApproved && <span style={{ color: '#00C853', fontSize: '11px', fontWeight: 700 }}>✓ Verified</span>}
                </span>
                <div className="verification-phone-row">
                  <select aria-label="Phone region" disabled={isKycApproved} value={profileDraft.country} onChange={(event) => setProfileDraft((current) => ({ ...current, country: event.target.value }))}>
                    <option>Global</option><option>Kenya</option><option>United States</option><option>United Kingdom</option><option>India</option><option>South Africa</option>
                  </select>
                  <input type="tel" readOnly={isKycApproved} value={profileDraft.phone} onChange={(event) => !isKycApproved && setProfileDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="+XXX XXX XXX XXX" />
                </div>
              </label>
              <label className="verification-field">
                <span><Mail size={13} /> Recovery Email <Pencil size={12} /><em>Optional</em></span>
                <input type="email" value={profileDraft.recoveryEmail} onChange={(event) => setProfileDraft((current) => ({ ...current, recoveryEmail: event.target.value }))} placeholder="recovery@example.com" />
              </label>
              {!isKycApproved && (
                <button type="submit" className="verification-primary-button"><Check size={16} /> Update My Profile Details</button>
              )}
            </form>
          </article>

          <div className="verification-right-column">
            <article className="verification-panel document-panel">
              <div className="verification-panel-title">
                <div>
                  <span className="verification-eyebrow">IDENTIFY HUB | GLOBAL DOCUMENT CENTRE</span>
                  <h3>Document Centre &amp; Global Verification Hub</h3>
                </div>
                <span className="verification-step">02</span>
              </div>

              <div className="document-details-grid">
                <label className="verification-field">
                  <span>Home Address <Pencil size={12} /></span>
                  <input readOnly={isKycApproved} value={profileDraft.homeAddress} onChange={(event) => !isKycApproved && setProfileDraft((current) => ({ ...current, homeAddress: event.target.value }))} placeholder="Street, city, postal code" />
                </label>
                <label className="verification-field">
                  <span><Globe size={13} /> Document Issuing Region</span>
                  <select disabled={isKycApproved} value={profileDraft.issuingRegion} onChange={(event) => setProfileDraft((current) => ({ ...current, issuingRegion: event.target.value }))}>
                    <option>Global</option><option>Kenya</option><option>United States</option><option>United Kingdom</option><option>India</option><option>South Africa</option>
                  </select>
                </label>
                <label className="verification-field">
                  <span>National ID Document Type</span>
                  <select disabled={isKycApproved} value={profileDraft.documentType} onChange={(event) => setProfileDraft((current) => ({ ...current, documentType: event.target.value }))}>
                    <option>ID Card</option><option>Passport</option><option>Driver License</option><option>Residence Permit</option>
                  </select>
                </label>
                <label className="verification-field">
                  <span>National ID / Document Number <b>PRIMARY</b></span>
                  <input readOnly={isKycApproved} value={isKycApproved ? '*****-1234' : profileDraft.documentNumber} onChange={(event) => !isKycApproved && setProfileDraft((current) => ({ ...current, documentNumber: event.target.value }))} placeholder="Enter document number" />
                </label>
              </div>

              {isKycApproved ? (
                <div className="verification-complete-card">
                  <div className="verification-complete-icon"><FileText size={32} color="#00C853" /></div>
                  <h4>VERIFICATION COMPLETE.</h4>
                  <p>All Identity documents are approved and validated.</p>
                  <div className="verification-logs-list">
                    <div><Check size={13} color="#00C853" /> National ID: Verified on 2026-10-12</div>
                    <div><Check size={13} color="#00C853" /> Documents: Verified on 2026-10-12</div>
                    <div><Check size={13} color="#00C853" /> Verified IN: Verified on 2026-10-12</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="upload-section-heading">
                    <h4>Required Document Uploads</h4>
                    <span>Private · JPEG or PDF · Max 5MB</span>
                  </div>
                  <div className="document-upload-row">
                    <div className="document-upload-column">
                      <label className="verification-field upload-type-field">
                        <span>Select Document Type</span>
                        <select value={documentUploadType} onChange={(event) => setDocumentUploadType(event.target.value)}>
                          <option>National ID</option><option>Proof of Address</option><option>Income Proof</option><option>Passport</option><option>Other Supporting Document</option>
                        </select>
                      </label>
                      <label className="document-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleVerificationDocument(event.dataTransfer.files[0]) }}>
                        <input className="visually-hidden-input" type="file" accept="image/jpeg,application/pdf" onChange={(event) => { void handleVerificationDocument(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
                        <span className="document-upload-icon"><Upload size={21} /><Plus size={12} /></span>
                        <strong>UPLOAD HERE</strong>
                        <span>Drag file or click to browse</span>
                        <small>JPEG or PDF · Maximum 5MB</small>
                      </label>
                    </div>
                    <div className="document-status-column">
                      <div className="document-status-heading"><h4>Status / Pending Documents</h4><span>{verificationDocuments.length.toString().padStart(2, '0')}</span></div>
                      {verificationDocuments.length ? verificationDocuments.map((document) => {
                        const isVerified = document.status === 'verified'
                        const isLocal = document.status === 'local'
                        const statusText = isVerified ? 'VERIFIED' : isLocal ? 'LOCAL PREVIEW · NOT SUBMITTED' : `QUEUED FOR REVIEW (${formatEATTime(new Date(document.submittedAt))} EAT)`
                        return (
                          <div className={`document-status-item ${isVerified ? 'is-verified' : isLocal ? 'is-local' : 'is-pending'}`} key={document.id}>
                            <FileText size={17} />
                            <div><strong>{document.name}</strong><span>{document.documentType} · {statusText}</span></div>
                          </div>
                        )
                      }) : <p className="document-empty-state">No documents submitted. Your uploaded files will appear here with their review status.</p>}
                    </div>
                  </div>
                </>
              )}
            </article>

            <article className="verification-panel suitability-panel">
              <div className="verification-panel-title">
                <div>
                  <span className="verification-eyebrow">CLIENT CLASSIFICATION</span>
                  <h3>Institutional On-boarding Questionnaire</h3>
                </div>
                <span className="verification-step">03</span>
              </div>
            <form className="suitability-form" onSubmit={(event) => void handleQuestionnaireSubmit(event)}>
              <fieldset className="suitability-question">
                <legend><BarChart3 size={15} /> 1. What is your primary investment goal on this platform?</legend>
                <div className="suitability-choice-row">
                  {['Long-Term Growth', 'Short-Term Trading', 'Income Generation', 'Hedging'].map((goal) => <label key={goal}><input required type="radio" name="primaryGoal" value={goal} checked={questionnaire.primaryGoal === goal} onChange={() => setQuestionnaire((current) => ({ ...current, primaryGoal: goal }))} /><span>{goal}</span></label>)}
                </div>
              </fieldset>
              <div className="suitability-two-column">
                <label className="verification-field">
                  <span><Wallet size={14} /> 2. Estimated annual net income</span>
                  <select required value={questionnaire.incomeBand} onChange={(event) => setQuestionnaire((current) => ({ ...current, incomeBand: event.target.value }))}>
                    <option value="">Select income range</option><option>USD &lt;50k</option><option>USD 50k-250k</option><option>USD 250k-1M</option><option>USD &gt;1M</option>
                  </select>
                </label>
                <label className="verification-field">
                  <span><Brain size={14} /> 3. Derivative product experience</span>
                  <select required value={questionnaire.derivativeExperience} onChange={(event) => setQuestionnaire((current) => ({ ...current, derivativeExperience: event.target.value }))}>
                    <option value="">Select experience</option><option>None</option><option>Limited</option><option>Extensive</option>
                  </select>
                </label>
              </div>
              <label className="verification-field risk-slider-field">
                <span><Percent size={14} /> 4. Net worth allocation to high-volatility products <strong>{questionnaire.riskPercentage}%</strong></span>
                <input type="range" min="0" max="100" step="1" value={questionnaire.riskPercentage} onChange={(event) => setQuestionnaire((current) => ({ ...current, riskPercentage: Number(event.target.value) }))} />
                <span className="risk-slider-endpoints"><small>0% · None</small><small>100% · All</small></span>
              </label>
              <div className="suitability-submit-row">
                <label className="verification-field">
                  <span><Search size={14} /> 5. Where did you first hear about the Leviathan platform?</span>
                  <select required value={questionnaire.referralSource} onChange={(event) => setQuestionnaire((current) => ({ ...current, referralSource: event.target.value }))}>
                    <option value="">Select a source</option><option>Online Ad</option><option>Referral</option><option>News / Media</option><option>Institutional Partner</option><option>Social Media</option>
                  </select>
                </label>
                <button type="submit" className="verification-primary-button" disabled={questionnaireSubmitted}>
                  <CheckCircle2 size={16} /> {questionnaireSubmitted ? 'Form Submitted · Awaiting Review' : 'Verify & Submit Form'}
                </button>
              </div>
            </form>
          </article>
        </div>
      </div>

      <footer className="verification-page-footer">
        <span>* Required fields must be completed.</span>
        <span>Full access requires successful document match.</span>
        <strong><Clock size={13} /> AWAITING APPROVAL</strong>
      </footer>
    </section>
  )
  }

  // VIEW 8: FUNDS MANAGEMENT (FundsHub)
  const renderFundsManagement = () => (
    <section className="profile-monitor-card" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
      <div>
        <span className="section-kicker">TREASURY CENTRE</span>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>Funds &amp; Multi-Wallet Hub</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage balances, transfer between wallets, deposit via crypto or M-Pesa (Min ${minDepositUSD} USD), and withdraw.</p>
      </div>
      <FundsHub
        wallets={walletBalances}
        onTransfer={handleWalletTransfer}
        onDepositRequest={handleFundsDepositRequest}
        onWithdrawalRequest={handleWithdrawalRequest}
        adminAddresses={adminAddresses.map(a => ({ ...a, enabled: true }))}
        showNotice={showNotice}
        minDepositUSD={minDepositUSD}
        minDepositKES={minDepositKES}
        minWithdrawalUSD={10}
      />
    </section>
  )

    // VIEW 9: ADMIN SETTINGS
  const renderAdminSettings = () => (
    <section className="profile-monitor-card">
      <h3>Admin Crypto Receiving Address Manager</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage crypto receiving addresses shown to clients in deposit window.</p>

      <form onSubmit={(e) => {
        e.preventDefault()
        if (!newNetAddress.trim()) return
        const newAddr: DepositAddress = { id: `addr-${Date.now()}`, network: newNetCode.toUpperCase(), assetName: newNetName, address: newNetAddress, note: 'Transfer note' }
        setAdminAddresses((curr) => [...curr, newAddr])
        setNewNetAddress('')
        showNotice(`Added deposit receiving address for ${newNetCode}!`)
      }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '10px', marginTop: '12px', alignItems: 'end' }}>
        <label style={{ fontSize: '11px' }}>Network Code
          <input value={newNetCode} onChange={(e) => setNewNetCode(e.target.value)} required />
        </label>
        <label style={{ fontSize: '11px' }}>Asset Name
          <input value={newNetName} onChange={(e) => setNewNetName(e.target.value)} required />
        </label>
        <label style={{ fontSize: '11px' }}>Wallet Address
          <input placeholder="Enter wallet receiving address" value={newNetAddress} onChange={(e) => setNewNetAddress(e.target.value)} required />
        </label>
        <button type="submit" className="button button-mint"><Plus size={14} /> Add Address</button>
      </form>

      <div style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table className="pro-data-table">
          <thead>
            <tr><th>Network</th><th>Asset Description</th><th>Wallet Address</th><th>Action</th></tr>
          </thead>
          <tbody>
            {adminAddresses.map((addr) => (
              <tr key={addr.id}>
                <td><strong>{addr.network}</strong></td>
                <td>{addr.assetName}</td>
                <td><code style={{ color: 'var(--mint-teal)' }}>{addr.address}</code></td>
                <td>
                  <button type="button" className="button button-dark" style={{ padding: '4px 8px', color: 'var(--bear-red)' }} onClick={() => {
                    setAdminAddresses((curr) => curr.filter((a) => a.id !== addr.id))
                    showNotice('Address removed.')
                  }}><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  // VIEW 10: KYC HUB
  const renderKycHub = () => (
    <section className="profile-monitor-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h3>3D Biometric Identity Verification Hub (/kyc)</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete 3D facial scan to unlock institutional withdrawal limits.</p>

      <div style={{ background: '#080c16', padding: '24px', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'center', marginTop: '12px' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '2px stroke var(--mint-teal)', margin: '0 auto', display: 'grid', placeItems: 'center', position: 'relative' }}>
          <Camera size={44} color="var(--mint-teal)" />
        </div>
        <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--mint-teal)', fontWeight: 600 }}>
          {kycFaceScanStatus === 'idle' && 'Position face inside the reticle'}
          {kycFaceScanStatus === 'scanning' && 'Scanning 3D Facial Landmarks...'}
          {kycFaceScanStatus === 'verified' && 'Biometric Match Verified ✓'}
        </p>

        <button type="button" className="button button-mint" style={{ marginTop: '16px' }} onClick={handleRunFaceScan} disabled={kycFaceScanStatus === 'scanning'}>
          {kycFaceScanStatus === 'verified' ? 'Re-verify Face Scan' : 'Start 3D Biometric Face Scan'}
        </button>
      </div>
    </section>
  )

  // VIEW 11: HELP CENTER
  const renderHelpCenter = () => (
    <section className="profile-monitor-card" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h3>NEXSMARKETS Help &amp; Priority Support</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Search guides or speak with an institutional support engineer.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
        <div style={{ background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
          <strong>Trading Basics</strong>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>How to execute One Click trades and set TP/SL lines.</p>
        </div>
        <div style={{ background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
          <strong>Deposits & Withdrawals</strong>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Processing times and supported crypto networks.</p>
        </div>
      </div>

      <button type="button" className="button button-mint" style={{ maxWidth: '240px', marginTop: '16px' }} onClick={() => showNotice('Live Support Agent Connected!')}>
        <MessageSquare size={16} /> Contact Live Support
      </button>
    </section>
  )

  // VIEW: HISTORY LEDGER
  const [historyFilter, setHistoryFilter] = useState<'all' | 'trades' | 'deposits' | 'withdrawals' | 'investments'>('all')

  const renderHistoryPage = () => (
    <div className="th-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className="th-hero" style={{ marginBottom: '24px' }}>
        <div className="th-hero-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={24} color="#00e5ff" /> TRADING & FINANCIAL HISTORY
        </div>
        <div className="th-hero-sub">Complete immutable ledger of all closed trades, deposits, withdrawals, and investments with exact timestamps.</div>
      </div>

      {/* Filter Tabs */}
      <div className="th-tabs" style={{ marginBottom: '20px' }}>
        <button className={`th-tab ${historyFilter === 'all' ? 'th-tab-active' : ''}`} onClick={() => setHistoryFilter('all')}>
          All History
        </button>
        <button className={`th-tab ${historyFilter === 'trades' ? 'th-tab-active' : ''}`} onClick={() => setHistoryFilter('trades')}>
          Trades ({closedTrades.length})
        </button>
        <button className={`th-tab ${historyFilter === 'deposits' ? 'th-tab-active' : ''}`} onClick={() => setHistoryFilter('deposits')}>
          Deposits ({appTransactions.filter(t => t.type === 'deposit').length})
        </button>
        <button className={`th-tab ${historyFilter === 'withdrawals' ? 'th-tab-active' : ''}`} onClick={() => setHistoryFilter('withdrawals')}>
          Withdrawals ({appTransactions.filter(t => t.type === 'withdrawal').length})
        </button>
        <button className={`th-tab ${historyFilter === 'investments' ? 'th-tab-active' : ''}`} onClick={() => setHistoryFilter('investments')}>
          Investments
        </button>
      </div>

      <div className="th-panel" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
            LEDGER RECORDS ({historyFilter.toUpperCase()})
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Exact Timestamps • EAT (Africa/Nairobi) 🟢
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Trades History */}
          {(historyFilter === 'all' || historyFilter === 'trades') && closedTrades.map((t, idx) => (
            <div key={`hist-trade-${t.id || idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: t.pnl >= 0 ? 'rgba(0,200,83,0.15)' : 'rgba(255,61,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.pnl >= 0 ? '#00c853' : '#ff3d00', fontWeight: 700, fontSize: '12px' }}>
                  {t.type}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>{t.symbol} — {t.lots} Lots</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Open: ${t.openPrice.toFixed(2)} → Close: ${t.closePrice.toFixed(2)} • <span style={{ color: 'var(--accent-blue)' }}>{t.closedAt || new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: t.pnl >= 0 ? '#00e676' : '#ff1744' }}>
                  {t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                </div>
                <div style={{ fontSize: '10.5px', color: t.pnl >= 0 ? '#00e676' : '#ff1744', marginTop: '2px', textTransform: 'uppercase', fontWeight: 800 }}>
                  {t.pnl >= 0 ? 'PROFIT' : 'LOSS'}
                </div>
              </div>
            </div>
          ))}

          {/* Deposits & Withdrawals from appTransactions */}
          {(historyFilter === 'all' || historyFilter === 'deposits' || historyFilter === 'withdrawals') && appTransactions
            .filter(tx => historyFilter === 'all' || (historyFilter === 'deposits' && tx.type === 'deposit') || (historyFilter === 'withdrawals' && tx.type === 'withdrawal'))
            .map((tx) => (
              <div key={`hist-tx-${tx.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '8px', background: tx.type === 'deposit' ? 'rgba(0,229,255,0.15)' : 'rgba(255,152,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tx.type === 'deposit' ? '#00e5ff' : '#ff9800', fontWeight: 700, fontSize: '11px' }}>
                    {tx.type.toUpperCase().substring(0, 3)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                      {tx.type === 'deposit' ? 'Account Deposit (+50% Bonus)' : 'Withdrawal Request'} {tx.reference_code ? `(${tx.reference_code})` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Gateway: {tx.gateway_network || 'M-Pesa / Crypto'} • <span style={{ color: 'var(--accent-blue)' }}>{new Date(tx.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: tx.type === 'deposit' ? '#00e676' : '#ff9800' }}>
                    {tx.type === 'deposit' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: tx.status === 'approved' ? '#00c853' : '#f2b94b', marginTop: '2px', textTransform: 'uppercase' }}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}

          {/* Investments history */}
          {(historyFilter === 'all' || historyFilter === 'investments') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(213,0,249,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d500f9', fontWeight: 700, fontSize: '11px' }}>
                  INV
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>Alpha Growth Investment Tier</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Duration: 21 Days • Started: <span style={{ color: 'var(--accent-blue)' }}>{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#d500f9' }}>$500.00 Principal</div>
                <div style={{ fontSize: '10.5px', color: '#00e676', marginTop: '2px', textTransform: 'uppercase' }}>Active Yield</div>
              </div>
            </div>
          )}

          {closedTrades.length === 0 && appTransactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <History size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <div>No transaction or trade history found. Your deposits, withdrawals, trades, and investments will appear here with exact timestamps.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Admin portal has been moved to a separate isolated route at /admin



  // Auth Screen — NEXSMARKETS Portal
  const handleAuthLogin = async (email: string, password: string): Promise<string | null> => {
    if (!supabase) {
      // Local fallback — accept any credentials instantly
      const name = email.includes('@') ? email.split('@')[0] : email
      setUser({ id: 'local-live-user', fullName: name || 'Trader', email, phone: '', country: '', avatarPath: null, role: 'client', emailVerified: true, accountStatus: 'active' })
      setActiveView('synthetic')
      return null
    }
    setAuthSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthSubmitting(false)
    if (error) {
      // Return clean error without revealing attempt counts
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credentials')) {
        return 'Incorrect email or password.'
      }
      if (error.message.toLowerCase().includes('email') && error.message.toLowerCase().includes('confirm')) {
        // Treat unconfirmed email as successful — we disabled confirmation
        setActiveView('synthetic')
        return null
      }
      return error.message
    }
    setActiveView('synthetic')
    return null
  }

  const handleAuthSignup = async (payload: SignupPayload): Promise<string | null> => {
    if (!supabase) {
      // Local fallback — sign in immediately, no email confirmation
      setUser({
        id: 'local-live-user',
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        country: payload.country,
        avatarPath: null,
        role: 'client',
        emailVerified: true,
        accountStatus: 'active',
      })
      if (payload.accountMode === 'demo') {
        setDemoAccountName(`${payload.fullName}'s Demo`)
        setDemoBalance(10000)
        setAccountType('demo')
      }
      setActiveView('synthetic')
      showNotice(`Welcome to NEXSMARKETS, ${payload.fullName}! Your account is ready.`)
      return null
    }
    setAuthSubmitting(true)
    // emailRedirectTo omitted — Supabase auto-confirms when email confirmations are disabled
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: undefined,   // No redirect needed — confirmation email disabled
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
    // If Supabase email confirmation is enabled, session will be null.
    // We surface a friendlier message and do NOT block the user from proceeding.
    if (!data.session) {
      // Still set a local user so they land on the dashboard immediately.
      // They'll be asked to confirm email before live trading — which is fine.
      setUser({
        id: data.user?.id ?? 'pending-user',
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        country: payload.country,
        avatarPath: null,
        role: 'client',
        emailVerified: false,
        accountStatus: 'active',
      })
      if (payload.accountMode === 'demo') {
        setDemoAccountName(`${payload.fullName}'s Demo`)
        setDemoBalance(10000)
        setAccountType('demo')
      }
      setActiveView('synthetic')
      showNotice(`Welcome to NEXSMARKETS, ${payload.fullName}! Your account is ready.`)
      return null
    }
    if (payload.accountMode === 'demo') {
      setDemoAccountName(`${payload.fullName}'s Demo`)
      setDemoBalance(10000)
      setAccountType('demo')
    }
    setActiveView('synthetic')
    showNotice(`Welcome to NEXSMARKETS, ${payload.fullName}!`)
    return null
  }

  const handleAuthGoogle = async () => {
    sessionStorage.setItem('pending_real_account', 'true')

    if (!supabase) {
      showNotice('Connecting to Google OAuth... Please configure Supabase keys in .env for live OAuth redirect.')
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })
      if (error) {
        showNotice(`Google Sign-In Error: ${error.message}`)
      }
    } catch (err: any) {
      showNotice(`Google Sign-In failed: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleAuthForgot = async (email: string) => {
    if (!supabase) {
      showNotice('Password reset simulated — in production, a reset email would be sent.')
      return
    }
    // redirectTo must be a URL that exists in the app.
    // Supabase will email a magic link; when clicked it redirects here.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    showNotice(`Password reset link sent to ${email}. Check your inbox (and spam folder).`)
  }

  const handleAuthDemo = () => {
    setUser({ id: 'local-demo-user', fullName: 'Demo Trader', email: '', phone: '', country: '', avatarPath: null, role: 'client', emailVerified: true, accountStatus: 'active' })
    setDemoAccountName('Demo Account')
    setDemoBalance(10000)
    setAccountType('demo')
    setActiveView('synthetic')
    showNotice('Demo loaded — $10,000 virtual funds. Trades are simulated.')
  }

  if (!user) {
    return (
      <AuthPortal
        onLogin={handleAuthLogin}
        onSignup={handleAuthSignup}
        onDemo={handleAuthDemo}
        onGoogle={handleAuthGoogle}
        onForgot={handleAuthForgot}
        isSubmitting={authSubmitting}
        notice={notice}
      />
    )
  }

  // IF LOGGED-IN USER IS AN ADMIN: Render 100% Standalone Full Admin Dashboard
  if (user.role === 'admin') {
    return <AdminDashboard currentUser={user} />
  }

  return (
    <div className={`app-shell ${(activeView === 'synthetic' || activeView === 'overview' || activeView === 'assets') ? 'app-shell-synthetic' : ''}`}>

      {/* ── EMAIL VERIFICATION BANNER ────────────────────────────────── */}
      {user && !user.emailVerified && user.id !== 'local-demo-user' && user.email && (
        <div className="verify-banner">
          <div className="verify-banner-inner">
            <span className="verify-banner-icon">⚠</span>
            <div className="verify-banner-text">
              <strong>Email not verified.</strong>
              {' '}Your account at <em>{user.email}</em> is not yet verified.
              {' '}Some features are restricted until you confirm your email.
            </div>
            <button
              className="verify-banner-btn"
              onClick={async () => {
                if (supabase && user.email) {
                  await supabase.auth.resend({ type: 'signup', email: user.email })
                  showNotice(`Verification email resent to ${user.email}. Check your inbox.`)
                } else {
                  showNotice('Check your inbox for the verification email.')
                }
              }}
            >
              Resend Email
            </button>
          </div>
        </div>
      )}

      {/* ── KYC DOCUMENT PROMPT MODAL ──────────────────────────────────── */}
      {user &&
        user.id !== 'local-demo-user' &&
        !kycPromptDismissed &&
        verificationDocuments.filter(d => d.status !== 'local').length === 0 && (
        <div className="kyc-prompt-overlay">
          <div className="kyc-prompt-card">
            {/* Header */}
            <div className="kyc-prompt-header">
              <div className="kyc-prompt-icon">
                <ShieldCheck size={28} color="#00e5ff" />
              </div>
              <div>
                <div className="kyc-prompt-kicker">IDENTITY VERIFICATION</div>
                <h3 className="kyc-prompt-title">Verify Your Account</h3>
              </div>
              <button className="kyc-prompt-close" onClick={() => setKycPromptDismissed(true)}>
                <X size={16} />
              </button>
            </div>

            <p className="kyc-prompt-desc">
              Welcome, <strong>{user.fullName || user.email || 'Trader'}</strong>! To unlock full platform access —
              including live deposits, withdrawals, and increased trading limits — please submit your
              identity documents for verification.
            </p>

            {/* Steps */}
            <div className="kyc-prompt-steps">
              <div className="kyc-prompt-step">
                <div className="kyc-step-num">1</div>
                <div>
                  <strong>Upload a government-issued ID</strong>
                  <span>National ID, Passport, or Driver&apos;s Licence (front &amp; back)</span>
                </div>
              </div>
              <div className="kyc-prompt-step">
                <div className="kyc-step-num">2</div>
                <div>
                  <strong>Proof of Address</strong>
                  <span>Utility bill or bank statement dated within 3 months</span>
                </div>
              </div>
              <div className="kyc-prompt-step">
                <div className="kyc-step-num">3</div>
                <div>
                  <strong>Admin review</strong>
                  <span>Our team verifies within 30 minutes during business hours</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="kyc-prompt-actions">
              <button
                className="kyc-prompt-cta"
                onClick={() => { setKycPromptDismissed(true); changeView('profile') }}
              >
                <ShieldCheck size={15} /> Verify My Account Now
              </button>
              <button
                className="kyc-prompt-later"
                onClick={() => setKycPromptDismissed(true)}
              >
                Remind me later
              </button>
            </div>

            <p className="kyc-prompt-note">
              🔒 Your documents are encrypted and reviewed only by authorised compliance staff.
            </p>
          </div>
        </div>
      )}

      {/* FULLSCREEN CHART OVERLAY */}
      {isChartFullscreen && (
        <div className="chart-fullscreen-overlay">
          <button type="button" className="exit-fullscreen-btn" onClick={() => setIsChartFullscreen(false)}>
            <Minimize2 size={16} /> Exit Fullscreen [Esc]
          </button>

          <TradingViewCandlestickCanvas symbol={selectedAsset} chartStyle={chartStyle} timeframe={timeframe} indicators={activeIndicators} onExecuteTrade={(isBuy, price) => handleExecuteTrade(isBuy, selectedAsset, price)} />
        </div>
      )}

      {/* MOBILE MENU BACKDROP */}
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}

      {/* COMPACT/EXPANDABLE SIDEBAR */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#synthetic" onClick={(e) => { e.preventDefault(); changeView('synthetic') }}>
          <img src="/logo.jpeg" alt="NEXSMARKETS Logo" style={{ width: 32, height: 32, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
          <span className="brand-text">NEXSMARKETS</span>
        </a>

        <nav className="primary-nav">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${activeView === item.id ? 'nav-item-active' : ''}`}
                onClick={() => changeView(item.id)}
                title={item.label}
              >
                <Icon size={18} />
                <span className="nav-label">{item.label}</span>
                {item.id === 'positions' && openPositions.length > 0 && (
                  <span className="nav-badge" style={{
                    marginLeft: 'auto',
                    background: 'var(--neon-cyan)',
                    color: '#060912',
                    fontSize: '10px',
                    fontWeight: 800,
                    borderRadius: '99px',
                    padding: '2px 6px',
                    lineHeight: 1,
                    boxShadow: '0 0 8px rgba(0, 229, 255, 0.4)'
                  }}>
                    {openPositions.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="profile-button" onClick={() => changeView('profile')}>
            <div className="profile-avatar">
              {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'NX'}
            </div>
            <div className="profile-copy">
              <strong>{user?.fullName || 'Trader'}</strong>
              <small>{user?.email || 'nexsmarkets.com'}</small>
            </div>
            <ChevronDown size={14} className="nav-label" />
          </button>
          <button
            type="button"
            className="signout-btn nav-label"
            onClick={async () => {
              if (supabase) await supabase.auth.signOut()
              setUser(null)
              setAccountType('none')
              setDemoBalance(0)
              setLiveBalance(0)
              setLiveAccountCreated(false)
            }}
            title="Sign out"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-main-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button type="button" className="mobile-menu-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu size={20} />
              </button>

              <div className="breadcrumb-container" style={{ gap: '8px', display: 'flex', alignItems: 'center' }}>
                <button type="button" className="go-back-btn" onClick={goBack} style={{ padding: '4px 8px' }}>
                  <ArrowLeft size={14} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="/logo.jpeg" alt="NEXSMARKETS Logo" style={{ width: 22, height: 22, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                  <div className="breadcrumb" style={{ fontSize: '12px' }}>
                    <strong>{activeView.toUpperCase()}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="topbar-actions" style={{ flex: 'none', width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {openPositions.length > 0 && (
                <button
                  type="button"
                  className="button"
                  onClick={() => changeView('positions')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: '1px solid rgba(0, 229, 255, 0.4)',
                    background: 'rgba(0, 229, 255, 0.12)',
                    color: 'var(--neon-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  title="View and manage open positions"
                >
                  <Activity size={13} color="var(--neon-cyan)" />
                  Open Trades ({openPositions.length})
                </button>
              )}
              {/* Unified Single Account Switcher Dropdown */}
              <select
                className="unified-account-dropdown"
                style={{ minWidth: '175px' }}
                value={accountType}
                onChange={(e) => handleAccountSelectChange(e.target.value as AccountType)}
              >
                <option value="none">Select an account</option>
                <option value="demo">🟡 {demoAccountName || 'Demo Account'} (${demoBalance.toFixed(2)})</option>
                <option value="live">🟢 Real Account (${liveBalance.toFixed(2)}) — +50% Bonus</option>
              </select>

              {accountType === 'demo' && demoAccountName ? (
                <button type="button" className="button button-outline" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={handleQuickDemoDeposit}>
                  <RefreshCw size={12} /> Reset Demo
                </button>
              ) : accountType === 'none' ? (
                <button type="button" className="button button-outline" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => setModal('create_demo')}>
                  <Plus size={12} /> Create Demo
                </button>
              ) : null}

              {/* Interactive Global System Search */}
              <div className="global-search-container" ref={searchContainerRef}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15,23,42,0.6)', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--glass-border)', cursor: 'text' }}>
                  <Search size={14} color="var(--text-muted)" />
                  <input
                    type="search"
                    placeholder="Search pages, assets, actions..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setSearchFocused(true)
                    }}
                    onFocus={() => setSearchFocused(true)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '11px', width: '130px', padding: 0 }}
                  />
                </label>

                {searchFocused && (
                  <div className="global-search-popover">
                    {matchingPages.length > 0 && (
                      <div>
                        <div className="search-group-title">📌 Pages &amp; Navigation</div>
                        {matchingPages.slice(0, 5).map(p => {
                          const Icon = p.icon
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className="search-item-btn"
                              onClick={() => {
                                changeView(p.view)
                                setSearchQuery('')
                                setSearchFocused(false)
                              }}
                            >
                              <div className="search-item-icon"><Icon size={14} /></div>
                              <div className="search-item-info">
                                <span className="search-item-title">{p.title}</span>
                                <span className="search-item-desc">{p.desc}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {matchingAssets.length > 0 && (
                      <div>
                        <div className="search-group-title">📈 Markets &amp; Assets</div>
                        {matchingAssets.slice(0, 6).map(a => (
                          <button
                            key={a.id}
                            type="button"
                            className="search-item-btn"
                            onClick={() => {
                              handleTradeNavigation(a.asset)
                              setSearchQuery('')
                              setSearchFocused(false)
                            }}
                          >
                            <div className="search-item-icon"><TrendingUp size={14} /></div>
                            <div className="search-item-info">
                              <span className="search-item-title">{a.title}</span>
                              <span className="search-item-desc">{a.desc}</span>
                            </div>
                            <span className="search-item-badge">{a.badge}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {matchingActions.length > 0 && (
                      <div>
                        <div className="search-group-title">⚡ Quick Actions</div>
                        {matchingActions.slice(0, 4).map(c => {
                          const Icon = c.icon
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className="search-item-btn"
                              onClick={() => {
                                c.action()
                                setSearchQuery('')
                                setSearchFocused(false)
                              }}
                            >
                              <div className="search-item-icon"><Icon size={14} /></div>
                              <div className="search-item-info">
                                <span className="search-item-title">{c.title}</span>
                                <span className="search-item-desc">{c.desc}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {totalSearchMatches === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        No pages, assets, or actions matching "<strong>{searchQuery}</strong>"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dark / Light Mode Icon Toggle Button (Top Right Header) */}
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Moon size={18} className="theme-toggle-icon moon-icon" />
                ) : (
                  <Sun size={18} className="theme-toggle-icon sun-icon" />
                )}
              </button>
            </div>
          </div>
        </header>

        <div key={activeView} className={`page-content ${(activeView === 'synthetic' || activeView === 'assets') ? 'page-content-synthetic' : ''}`}>
          {(activeView === 'assets' || activeView === 'synthetic') && renderSyntheticContracts()}
          {activeView === 'tiers' && renderCryptoAllocationLevels()}
          {activeView === 'institutions' && renderInstitutionsView()}
          {activeView === 'positions' && renderOpenAndClosedTrades()}
          {(activeView === 'wallet' || activeView === 'funds') && renderFundsManagement()}
          {activeView === 'settings' && renderAdminSettings()}
          {activeView === 'kyc_hub' && renderKycHub()}
          {activeView === 'profile' && renderDedicatedProfilePage()}
          {activeView === 'help' && renderHelpCenter()}
          {activeView === 'history' && renderHistoryPage()}
        </div>

        {/* GLOBAL NEXSMARKETS FOOTER */}
        <footer className="global-platform-footer" style={{ padding: isFooterMinimized ? '4px 12px' : '10px 18px', transition: 'all 0.2s ease' }}>
          <div className="global-footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
            <div className="global-footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/logo.jpeg" alt="NEXSMARKETS Logo" style={{ width: 22, height: 22, borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />
              <span className="global-footer-brand-title" style={{ fontSize: '11px', fontWeight: 800 }}>NEXSMARKETS PRO TERMINAL</span>
            </div>

            {!isFooterMinimized && (
              <div className="global-footer-copy" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                © {new Date().getFullYear()} NEXSMARKETS Terminal. All rights reserved. Ultra-low latency synthetic &amp; multi-asset trading engine.
              </div>
            )}

            <div className="global-footer-status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="global-footer-dot"></span> System Operational • 1s Synthetic Ticks Active
              </span>

              <button
                type="button"
                onClick={() => setIsFooterMinimized(!isFooterMinimized)}
                title={isFooterMinimized ? "Expand Footer" : "Minimize Footer"}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '8px'
                }}
              >
                <X size={12} /> {isFooterMinimized ? 'Expand' : 'Minimize'}
              </button>
            </div>
          </div>
        </footer>
      </main>

      {modal === 'create_demo' && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal() }}>
          <section className="funds-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Create Demo Account</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure a practice account for this simulator.</p>
              </div>
              <button type="button" onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateDemoAccount} style={{ display: 'grid', gap: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account name
                <input value={demoNameDraft} onChange={(event) => setDemoNameDraft(event.target.value)} maxLength={40} required />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Starting balance (USD)
                <input type="number" min="100" max="1000000" step="100" value={demoBalanceDraft} onChange={(event) => setDemoBalanceDraft(event.target.value)} required />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Leverage
                <select className="control-select" value={demoLeverageDraft} onChange={(event) => setDemoLeverageDraft(event.target.value)}>
                  <option value="1:50">1:50</option>
                  <option value="1:100">1:100</option>
                  <option value="1:200">1:200</option>
                  <option value="1:500">1:500</option>
                  <option value="1:1000">1:1000</option>
                </select>
              </label>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>This creates a local simulated account. MT5 demo accounts are created separately in the MT5 app using a demo server.</p>
              <button type="submit" className="button button-mint">Create Demo Account</button>
            </form>
          </section>
        </div>
      )}

      {modal === 'order' && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal() }}>
          <section className="funds-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Demo Order Confirmation</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedAsset} · {leverage} leverage · simulated execution</p>
              </div>
              <button type="button" onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Direction
              <select className="control-select" value={orderDirection} onChange={(event) => setOrderDirection(event.target.value as 'BUY' | 'SELL')}>
                <option value="BUY">Buy at ask {(selectedQuote.price + selectedSpread / 2).toFixed(selectedPricePrecision)}</option>
                <option value="SELL">Sell at bid {(selectedQuote.price - selectedSpread / 2).toFixed(selectedPricePrecision)}</option>
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Volume</span><strong>{lotSize} lots</strong>
              <span style={{ color: 'var(--text-muted)' }}>Spread</span><strong>{selectedQuote.spread}</strong>
              <span style={{ color: 'var(--text-muted)' }}>Estimated margin</span>
              <strong>${((selectedQuote.price * (Number.parseFloat(lotSize) || 0) * selectedContractSize) / Math.max(1, Number.parseInt(leverage.split(':')[1] ?? '1', 10))).toFixed(2)}</strong>
              <span style={{ color: 'var(--text-muted)' }}>Free margin after order</span>
              <strong>${(activeBalance - totalMarginUsed - (selectedQuote.price * (Number.parseFloat(lotSize) || 0) * selectedContractSize) / Math.max(1, Number.parseInt(leverage.split(':')[1] ?? '1', 10))).toFixed(2)}</strong>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Orders placed here are simulated and only affect this demo account.</p>
            <button type="button" className="button button-mint" onClick={() => handleExecuteTrade(orderDirection === 'BUY')}>
              Confirm Demo {orderDirection}
            </button>
          </section>
        </div>
      )}

      {/* Deposit Modal */}
      {modal === 'deposit' && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <section className="funds-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Deposit Funds to Real Account</h3>
              <button type="button" onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* 50% Deposit Bonus Highlight Box */}
            <div style={{ background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15), rgba(0, 229, 255, 0.08))', border: '1px solid rgba(0, 230, 118, 0.35)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <Sparkles size={22} color="#00e676" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '11px' }}>
                <strong style={{ color: '#00e676', display: 'block', fontSize: '12px', letterSpacing: '0.3px' }}>🎁 50% INSTANT REAL ACCOUNT DEPOSIT BONUS</strong>
                <span style={{ color: 'var(--text-muted)' }}>Deposit ${(parseFloat(amount) || 500).toFixed(2)} + ${((parseFloat(amount) || 500) * 0.5).toFixed(2)} Bonus = <strong style={{ color: '#ffffff' }}>${((parseFloat(amount) || 500) * 1.5).toFixed(2)} Total</strong> credited to your Real Account balance.</span>
              </div>
            </div>

            <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payment Asset Network
                <select className="control-select" style={{ marginTop: '4px' }} value={selectedNetwork} onChange={(e) => setSelectedNetwork(e.target.value)}>
                  {adminAddresses.map((a) => <option key={a.id} value={a.network}>{a.assetName} ({a.network})</option>)}
                </select>
              </label>

              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deposit Allocation Amount ($)
                <input type="number" min="10" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </label>

              <button type="submit" className="button button-mint">
                Confirm &amp; Claim 50% Bonus Deposit
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Indicator Selection Library Modal */}
      {modal === 'indicator_menu' && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <section className="funds-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Indicators & Assist Trading Library</h3>
              <button type="button" onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer' }}>
                <span>Volume Weighted Moving Average (VWMA 20)</span>
                <input
                  type="checkbox"
                  checked={activeIndicators.vwma}
                  onChange={(e) => setActiveIndicators({ ...activeIndicators, vwma: e.target.checked })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer' }}>
                <span>MACD (12, 26, 9) Histogram</span>
                <input
                  type="checkbox"
                  checked={activeIndicators.macd}
                  onChange={(e) => setActiveIndicators({ ...activeIndicators, macd: e.target.checked })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer' }}>
                <span>RSI (14) Oscillator</span>
                <input
                  type="checkbox"
                  checked={activeIndicators.rsi}
                  onChange={(e) => setActiveIndicators({ ...activeIndicators, rsi: e.target.checked })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer' }}>
                <span>Bollinger Bands (20, 2)</span>
                <input
                  type="checkbox"
                  checked={activeIndicators.bollinger}
                  onChange={(e) => setActiveIndicators({ ...activeIndicators, bollinger: e.target.checked })}
                />
              </label>
            </div>

            <button type="button" className="button button-mint" onClick={closeModal} style={{ marginTop: '10px' }}>
              <Check size={16} /> Apply Indicators to Canvas
            </button>
          </section>
        </div>
      )}

      {/* Trade Outcome Modal (Profit / Loss) */}
      {modal === 'trade_outcome' && tradeOutcomeResult && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setModal(null); setTradeOutcomeResult(null) } }}>
          <section className="funds-modal" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '32px 24px', border: tradeOutcomeResult.pnl >= 0 ? '2px solid #00c853' : '2px solid #ff3d00', boxShadow: tradeOutcomeResult.pnl >= 0 ? '0 0 40px rgba(0,200,83,0.3)' : '0 0 40px rgba(255,61,0,0.3)', margin: 'auto' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: tradeOutcomeResult.pnl >= 0 ? 'rgba(0,200,83,0.2)' : 'rgba(255,61,0,0.2)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: tradeOutcomeResult.pnl >= 0 ? '#00c853' : '#ff3d00' }}>
              {tradeOutcomeResult.pnl >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: tradeOutcomeResult.pnl >= 0 ? '#00c853' : '#ff3d00', letterSpacing: '1px', marginBottom: '8px' }}>
              {tradeOutcomeResult.pnl >= 0 ? 'PROFIT' : 'LOSS'}
            </h2>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)', marginBottom: '12px' }}>
              {tradeOutcomeResult.pnl >= 0 ? '+' : ''}${tradeOutcomeResult.pnl.toFixed(2)}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Trade for {tradeOutcomeResult.symbol} closed successfully.
            </p>
            <button type="button" className="button" style={{ width: '100%', background: tradeOutcomeResult.pnl >= 0 ? '#00c853' : '#ff3d00', color: '#000', fontWeight: 800, padding: '12px' }} onClick={() => { setModal(null); setTradeOutcomeResult(null) }}>
              OK
            </button>
          </section>
        </div>
      )}

      {/* Withdrawal Success & Allocation Ceremony Modal */}
      {modal === 'withdrawal_success' && withdrawalSuccessData && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setModal(null); setWithdrawalSuccessData(null) } }}>
          <section className="funds-modal ceremony-modal" style={{ maxWidth: '460px', width: '92%', textAlign: 'center', padding: '36px 28px', border: '2px solid #00e5ff', boxShadow: '0 0 50px rgba(0,229,255,0.35)', position: 'relative', overflow: 'hidden', margin: 'auto' }}>
            {/* Bursting Ceremony Confetti Particles */}
            <div className="ceremony-burst-particles">
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`ceremony-particle p-${i}`} />
              ))}
            </div>

            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(0,229,255,0.15)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#00e5ff' }}>
              <Wallet size={34} />
            </div>

            <div style={{ fontSize: '11px', fontWeight: 800, color: '#00e676', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
              ✨ Withdrawal Successful &amp; Allocated ✨
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              ${withdrawalSuccessData.amount.toFixed(2)} USD
            </h2>

            <div style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', padding: '12px 16px', margin: '16px 0 20px', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#00e5ff', marginBottom: '4px' }}>
                ⏳ Allocation Stage (Pending Transfer)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Kindly wait for funds to be sent to your account. Your withdrawal has been successfully logged in your History ledger.
              </p>
            </div>

            <button type="button" className="button button-mint" style={{ width: '100%', fontWeight: 800, padding: '12px' }} onClick={() => { setModal(null); setWithdrawalSuccessData(null) }}>
              OK
            </button>
          </section>
        </div>
      )}

      {pageLoading && (
        <div className="page-transition-loader" aria-live="polite">
          <div className="page-loader-brand">
            <img src="/logo.jpeg" alt="NEXSMARKETS Logo" style={{ width: 44, height: 44, borderRadius: '10px', objectFit: 'cover' }} />
          </div>

          {/* Clockwise Colliding Dot Circle Spinner */}
          <div className="dot-chase-spinner">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="dot-circle-item" style={{ transform: 'rotate(' + (i * 30) + 'deg)' }} />
            ))}
          </div>

          <span className="page-loader-text">Loading NEXSMARKETS Terminal...</span>
          <div className="page-loader-bar"><div className="page-loader-progress"></div></div>
        </div>
      )}

      {notice && <div className="toast"><Sparkles size={16} /><span>{notice}</span></div>}

      <nav className="mobile-bottom-nav" aria-label="Primary">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => changeView(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.id === 'positions' && openPositions.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '10px',
                  background: 'var(--neon-cyan)',
                  color: '#060912',
                  fontSize: '9px',
                  fontWeight: 800,
                  borderRadius: '99px',
                  padding: '1px 5px',
                  lineHeight: 1
                }}>
                  {openPositions.length}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* LIVE SUPPORT CHAT WIDGET */}
      {user && (
        <LiveChat
          userId={user.id}
          userName={user.fullName || 'User'}
          userEmail={user.email}
          userBalance={activeBalance}
          userKycStatus="unverified"
          userAccountType={accountType}
        />
      )}
    </div>
  )
}
