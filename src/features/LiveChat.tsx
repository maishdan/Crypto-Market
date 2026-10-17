import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, X, Send, Paperclip, CheckCheck, Check, Circle, Minimize2, Maximize2 } from 'lucide-react'

export type ChatMessage = {
  id: string
  sessionId: string
  sender: 'user' | 'agent'
  senderName: string
  text: string
  timestamp: number
  status: 'sent' | 'delivered' | 'read'
  attachmentName?: string
}

export type ChatSession = {
  id: string
  userId: string
  userName: string
  userEmail: string
  userBalance: number
  userKycStatus: string
  userAccountType: string
  createdAt: number
  status: 'open' | 'resolved'
  messages: ChatMessage[]
  unreadByAdmin: number
}

// Shared in-memory store simulating a real-time socket (single-tab)
const SESSION_STORE_KEY = '__nexsmarkets_chat_sessions__'

function getSessions(): ChatSession[] {
  try { return JSON.parse(sessionStorage.getItem(SESSION_STORE_KEY) ?? '[]') }
  catch { return [] }
}

function saveSessions(sessions: ChatSession[]) {
  sessionStorage.setItem(SESSION_STORE_KEY, JSON.stringify(sessions))
}

export function getSessionsForAdmin(): ChatSession[] { return getSessions() }

export function sendAdminReply(sessionId: string, text: string, agentName: string) {
  const sessions = getSessions()
  const session = sessions.find(s => s.id === sessionId)
  if (!session) return
  const msg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random()}`,
    sessionId,
    sender: 'agent',
    senderName: agentName,
    text,
    timestamp: Date.now(),
    status: 'delivered',
  }
  session.messages.push(msg)
  saveSessions(sessions)
}

// ── User-side chat widget ────────────────────────────────────────────────────

type UserChatProps = {
  userId: string
  userName: string
  userEmail: string
  userBalance: number
  userKycStatus: string
  userAccountType: string
}

const AGENT_REPLIES = [
  'Thanks for reaching out! I\'ll look into that right away.',
  'I can see your account details — let me check this for you.',
  'Could you provide more details about the issue you\'re experiencing?',
  'Your request has been escalated to our finance team.',
  'That\'s been resolved on our end. Please refresh and try again.',
  'Your KYC documents are under review — typically takes 24 hours.',
  'I\'ve credited your account as requested. Please allow a few minutes.',
  'Is there anything else I can help you with today?',
]

export default function LiveChat(props: UserChatProps) {
  const { userId, userName, userEmail, userBalance, userKycStatus, userAccountType } = props
  const [open, setOpen] = useState(false)
  const [minimised, setMinimised] = useState(false)
  const [text, setText] = useState('')
  const [session, setSession] = useState<ChatSession | null>(null)
  const [agentTyping, setAgentTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Find or create session
  const getOrCreateSession = useCallback((): ChatSession => {
    const existing = getSessions().find(s => s.userId === userId && s.status === 'open')
    if (existing) return existing
    const newSession: ChatSession = {
      id: `sess-${userId}-${Date.now()}`,
      userId,
      userName,
      userEmail,
      userBalance,
      userKycStatus,
      userAccountType,
      createdAt: Date.now(),
      status: 'open',
      messages: [],
      unreadByAdmin: 0,
    }
    const sessions = getSessions()
    sessions.push(newSession)
    saveSessions(sessions)
    return newSession
  }, [userId, userName, userEmail, userBalance, userKycStatus, userAccountType])

  // Poll for new agent replies every 2s
  useEffect(() => {
    if (!open) return
    if (!session) {
      setSession(getOrCreateSession())
    }
    pollRef.current = setInterval(() => {
      const sessions = getSessions()
      const current = sessions.find(s => s.id === session?.id || s.userId === userId)
      if (current) {
        const prevCount = session?.messages.length ?? 0
        const newCount = current.messages.length
        if (newCount > prevCount && minimised) {
          setUnread(u => u + (newCount - prevCount))
        }
        setSession({ ...current })
      }
    }, 1500)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [open, session, getOrCreateSession, userId, minimised])

  useEffect(() => {
    if (open && !minimised) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setUnread(0)
    }
  }, [session?.messages.length, open, minimised])

  const sendMessage = (messageText: string, attachmentName?: string) => {
    const current = getOrCreateSession()
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sessionId: current.id,
      sender: 'user',
      senderName: userName,
      text: messageText,
      timestamp: Date.now(),
      status: 'sent',
    }
    if (attachmentName) msg.attachmentName = attachmentName
    current.messages.push(msg)
    current.unreadByAdmin += 1
    const sessions = getSessions().filter(s => s.id !== current.id)
    sessions.push(current)
    saveSessions(sessions)
    setSession({ ...current })
    setText('')

    // Simulate delivered + agent typing + auto-reply
    setTimeout(() => {
      const s2 = getSessions().find(s => s.id === current.id)
      if (!s2) return
      const m = s2.messages.find(m => m.id === msg.id)
      if (m) m.status = 'delivered'
      const updated = [...getSessions().filter(s => s.id !== current.id), s2]
      saveSessions(updated)
      setSession({ ...s2 })
    }, 800)

    setAgentTyping(true)
    setTimeout(() => {
      setAgentTyping(false)
      const reply: ChatMessage = {
        id: `msg-agent-${Date.now()}`,
        sessionId: current.id,
        sender: 'agent',
        senderName: 'Support Agent',
        text: AGENT_REPLIES[Math.floor(Math.random() * AGENT_REPLIES.length)],
        timestamp: Date.now(),
        status: 'read',
      }
      const s3 = getSessions().find(s => s.id === current.id)
      if (!s3) return
      // Mark user msg as read
      s3.messages = s3.messages.map(m => m.sender === 'user' ? { ...m, status: 'read' } : m)
      s3.messages.push(reply)
      const updated2 = [...getSessions().filter(s => s.id !== current.id), s3]
      saveSessions(updated2)
      setSession({ ...s3 })
    }, 2200 + Math.random() * 2000)
  }

  const handleSend = () => {
    if (!text.trim()) return
    sendMessage(text.trim())
  }

  const handleFile = (file: File | null | undefined) => {
    if (!file) return
    sendMessage(`[Attachment: ${file.name}]`, file.name)
  }

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const agentOnline = true // Simulated

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button className="chat-fab" onClick={() => { setOpen(true); setMinimised(false); setUnread(0) }}>
          <MessageSquare size={20} />
          {unread > 0 && <span className="chat-fab-badge">{unread}</span>}
          <span className="chat-fab-label">Live Support</span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className={`chat-window ${minimised ? 'chat-window-min' : ''}`}>
          {/* Header */}
          <div className="chat-header">
            <div className="chat-agent-info">
              <div className="chat-agent-avatar">S</div>
              <div>
                <strong>NexsMarkets Support</strong>
                <span className={`chat-agent-status ${agentOnline ? 'chat-online' : ''}`}>
                  <Circle size={7} fill={agentOnline ? '#00e676' : '#9aa7b8'} />
                  {agentOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button className="chat-icon-btn" onClick={() => setMinimised(p => !p)}>
                {minimised ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button className="chat-icon-btn" onClick={() => { setOpen(false); setSession(null) }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimised && (
            <>
              {/* Messages */}
              <div className="chat-messages">
                {/* Welcome */}
                <div className="chat-system-msg">
                  Welcome to NexsMarkets Live Support. Describe your issue and an agent will respond shortly.
                </div>

                {(session?.messages ?? []).map(msg => (
                  <div key={msg.id} className={`chat-bubble-wrap ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-agent'}`}>
                    <div className="chat-bubble">
                      {msg.text}
                      {msg.attachmentName && (
                        <div className="chat-attachment">
                          <Paperclip size={11} /> {msg.attachmentName}
                        </div>
                      )}
                    </div>
                    <div className="chat-bubble-meta">
                      {fmtTime(msg.timestamp)}
                      {msg.sender === 'user' && (
                        <span className="chat-status-icon">
                          {msg.status === 'read' ? <CheckCheck size={12} color="#00e5ff" />
                            : msg.status === 'delivered' ? <CheckCheck size={12} />
                            : <Check size={12} />}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {agentTyping && (
                  <div className="chat-bubble-wrap chat-bubble-agent">
                    <div className="chat-bubble chat-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="chat-input-bar">
                <button className="chat-attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
                  <Paperclip size={15} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => { handleFile(e.currentTarget.files?.[0]); e.currentTarget.value = '' }}
                />
                <input
                  className="chat-text-input"
                  placeholder="Type your message…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                />
                <button className="chat-send-btn" onClick={handleSend} disabled={!text.trim()}>
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
