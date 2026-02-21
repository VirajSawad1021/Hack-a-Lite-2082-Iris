'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, LayoutGrid, Phone, Calendar, CheckCircle2,
  RefreshCw, ChevronDown, X, Loader2, PhoneCall,
  Users, Clock, ExternalLink, AlertCircle, CheckSquare,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface TrelloMember { fullName?: string; username: string; avatarUrl?: string }
interface TrelloCard {
  id: string
  name: string
  desc: string
  due: string | null
  shortUrl: string
  listName: string
  idList: string
  members: TrelloMember[]
  labels: { color: string; name: string }[]
}
interface TrelloList { id: string; name: string }
interface TrelloBoard { id: string; name: string; url: string }

const API = 'http://localhost:8001'

const LABEL_COLORS: Record<string, string> = {
  red: '#ef4444', orange: '#f97316', yellow: '#eab308',
  green: '#22c55e', blue: '#3b82f6', purple: '#a855f7',
  pink: '#ec4899', sky: '#0ea5e9', lime: '#84cc16', null: '#6b7280',
}

// ── Modal: Schedule Call ────────────────────────────────────────
function ScheduleModal({
  card, onClose,
}: {
  card: TrelloCard
  onClose: () => void
}) {
  const [emails, setEmails] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(30)
  const [withVoice, setWithVoice] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async () => {
    if (!emails.trim() || !time.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const resp = await fetch(`${API}/trello/schedule-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card.id,
          card_title: card.name,
          card_description: card.desc,
          attendee_emails: emails,
          proposed_time: time,
          duration_minutes: duration,
          also_voice_call: withVoice && !!phone,
          phone_number: phone,
        }),
      })
      const data = await resp.json()
      setResult({ ok: data.success, text: data.meeting + (data.voice_call ? `\n\nVoice call: ${data.voice_call}` : '') })
    } catch (e) {
      setResult({ ok: false, text: String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ width: '100%', maxWidth: 520, background: '#111118', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Schedule a Meeting</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{card.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2 }}><X size={18} /></button>
        </div>

        {result ? (
          <div style={{ background: result.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, padding: '14px 16px' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12, color: result.ok ? '#6ee7b7' : '#fca5a5', lineHeight: 1.6, fontFamily: 'inherit' }}>{result.text}</pre>
          </div>
        ) : (
          <>
            <label style={lbl}>Attendee emails (comma-separated)</label>
            <input value={emails} onChange={e => setEmails(e.target.value)} placeholder="alice@co.com, bob@co.com"
              style={inp} onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')} />

            <label style={lbl}>Proposed date & time</label>
            <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. Feb 25, 2026 at 3:00 PM NPT"
              style={inp} onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')} />

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Duration</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                  style={{ ...inp, cursor: 'pointer' }}>
                  {[15, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                <input type="checkbox" checked={withVoice} onChange={e => setWithVoice(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#6366F1' }} />
                <PhoneCall size={14} style={{ color: '#6366F1' }} /> Also place a voice call
              </label>
              {withVoice && (
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+9779820742195"
                  style={{ ...inp, marginTop: 0 }} onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')} />
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13 }}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={submit} disabled={loading || !emails.trim() || !time.trim()}
              style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: (emails.trim() && time.trim()) ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scheduling…</> : <><Calendar size={13} /> Schedule</>}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Modal: Voice Call ───────────────────────────────────────────
function VoiceCallModal({ card, onClose }: { card: TrelloCard; onClose: () => void }) {
  const [phone, setPhone] = useState('')
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const call = async () => {
    if (!phone.trim()) return
    setLoading(true)
    try {
      const resp = await fetch(`${API}/trello/voice-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, task_title: card.name, urgency }),
      })
      const data = await resp.json()
      setResult({ ok: data.success, text: data.result })
    } catch (e) {
      setResult({ ok: false, text: String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ width: '100%', maxWidth: 420, background: '#111118', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Voice Call</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{card.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
        </div>

        {result ? (
          <div style={{ background: result.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, padding: '12px 14px' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12, color: result.ok ? '#6ee7b7' : '#fca5a5', lineHeight: 1.6, fontFamily: 'inherit' }}>{result.text}</pre>
          </div>
        ) : (
          <>
            <div>
              <label style={lbl}>Phone number (E.164 format)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+9779820742195"
                style={inp} onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')} />
            </div>
            <div>
              <label style={lbl}>Urgency</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['normal', 'urgent'] as const).map(u => (
                  <button key={u} onClick={() => setUrgency(u)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                    background: urgency === u ? (u === 'urgent' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)') : 'rgba(255,255,255,0.04)',
                    outline: urgency === u ? `1.5px solid ${u === 'urgent' ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}` : '1.5px solid transparent',
                    color: urgency === u ? (u === 'urgent' ? '#f87171' : '#818cf8') : 'rgba(255,255,255,0.4)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  }}>{u}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13 }}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={call} disabled={loading || !phone.trim()}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: phone.trim() ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Calling…</> : <><Phone size={13} /> Call Now</>}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Shared input styles ────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
}
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.88)',
  fontSize: 13, outline: 'none', fontFamily: 'inherit',
}

// ── Card component ─────────────────────────────────────────────
function CardItem({
  card, idx,
  onSchedule, onCall,
}: {
  card: TrelloCard; idx: number
  onSchedule: (c: TrelloCard) => void
  onCall: (c: TrelloCard) => void
}) {
  const isOverdue = card.due && new Date(card.due) < new Date()
  const dueDate = card.due
    ? new Date(card.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.28 }}
      style={{
        background: 'rgba(255,255,255,0.03)', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
      {/* Labels */}
      {card.labels?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {card.labels.map((l, i) => (
            <span key={i} style={{ width: 32, height: 5, borderRadius: 3, background: LABEL_COLORS[l.color] ?? '#6b7280' }} title={l.name} />
          ))}
        </div>
      )}

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.4 }}>{card.name}</div>

      {/* Description preview */}
      {card.desc && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {card.desc}
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {dueDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {isOverdue ? <AlertCircle size={11} /> : <Clock size={11} />}
            {dueDate}
          </span>
        )}
        {card.members?.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            <Users size={11} />
            {card.members.map(m => m.fullName || m.username).join(', ')}
          </span>
        )}
        <a href={card.shortUrl} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, textDecoration: 'none' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(99,102,241,0.8)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)')}>
          <ExternalLink size={10} /> Trello
        </a>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => onSchedule(card)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Calendar size={12} /> Schedule Call
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => onCall(card)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Phone size={12} /> Call
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function TrelloPage() {
  const [boards, setBoards] = useState<TrelloBoard[]>([])
  const [selectedBoard, setSelectedBoard] = useState<string>('')
  const [cards, setCards] = useState<TrelloCard[]>([])
  const [lists, setLists] = useState<TrelloList[]>([])
  const [filterList, setFilterList] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [boardsLoading, setBoardsLoading] = useState(false)
  const [error, setError] = useState('')
  const [scheduleCard, setScheduleCard] = useState<TrelloCard | null>(null)
  const [callCard, setCallCard] = useState<TrelloCard | null>(null)
  const [showBoards, setShowBoards] = useState(false)

  const loadBoards = useCallback(async () => {
    setBoardsLoading(true)
    setError('')
    try {
      const resp = await fetch(`${API}/trello/boards`)
      if (!resp.ok) throw new Error(await resp.text())
      setBoards(await resp.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load boards')
    } finally {
      setBoardsLoading(false)
    }
  }, [])

  const loadCards = useCallback(async (boardId: string) => {
    setLoading(true)
    setFilterList('all')
    setCards([])
    setError('')
    try {
      const resp = await fetch(`${API}/trello/boards/${boardId}/cards`)
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      setCards(data.cards)
      setLists(data.lists)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBoards() }, [loadBoards])
  useEffect(() => { if (selectedBoard) loadCards(selectedBoard) }, [selectedBoard, loadCards])

  const selectedBoardName = boards.find(b => b.id === selectedBoard)?.name ?? 'Select a board'
  const filteredCards = filterList === 'all' ? cards : cards.filter(c => c.idList === filterList)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <ArrowLeft size={15} />
            </button>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #0052CC 0%, #0079BF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutGrid size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Trello Calls</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Schedule meetings & voice calls from cards</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cards.length > 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}
            </div>
          )}
          <button onClick={() => selectedBoard ? loadCards(selectedBoard) : loadBoards()} disabled={loading || boardsLoading}
            style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={14} style={{ animation: (loading || boardsLoading) ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </header>

      {/* Board selector */}
      <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', minWidth: 220 }}>
          <button onClick={() => setShowBoards(v => !v)} disabled={boardsLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: selectedBoard ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, fontWeight: 500, minWidth: 220 }}>
            {boardsLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <LayoutGrid size={14} />}
            <span style={{ flex: 1, textAlign: 'left' }}>{boardsLoading ? 'Loading boards…' : selectedBoardName}</span>
            <ChevronDown size={13} />
          </button>
          <AnimatePresence>
            {showBoards && boards.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%', minWidth: 260, background: '#17171f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                {boards.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBoard(b.id); setShowBoards(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', background: b.id === selectedBoard ? 'rgba(99,102,241,0.1)' : 'transparent', color: b.id === selectedBoard ? '#818cf8' : 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer' }}
                    onMouseEnter={e => { if (b.id !== selectedBoard) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (b.id !== selectedBoard) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    {b.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* List filters */}
        {lists.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ id: 'all', name: 'All' }, ...lists].map(lst => (
              <button key={lst.id} onClick={() => setFilterList(lst.id)}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: filterList === lst.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', color: filterList === lst.id ? '#818cf8' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500, cursor: 'pointer', outline: filterList === lst.id ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid transparent', transition: 'all 0.12s' }}>
                {lst.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ margin: '14px 24px 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
          {error.includes('TRELLO') ? '🔑 TRELLO_API_KEY / TRELLO_TOKEN not set in backend .env' : error}
        </div>
      )}

      {/* Cards grid */}
      <main style={{ flex: 1, padding: '20px 24px 40px', overflowY: 'auto' }}>
        {!selectedBoard && !boardsLoading && boards.length === 0 && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,82,204,0.12)', border: '1.5px solid rgba(0,82,204,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutGrid size={24} color="#0052CC" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Connect Trello</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, maxWidth: 340 }}>
                Add <code style={{ color: '#818cf8' }}>TRELLO_API_KEY</code> and <code style={{ color: '#818cf8' }}>TRELLO_TOKEN</code> to your backend <code style={{ color: '#818cf8' }}>.env</code> file.<br /><br />
                Get them at <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>trello.com/app-key</a>
              </div>
            </div>
          </div>
        )}

        {!selectedBoard && boards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 10 }}>
            <CheckSquare size={28} color="rgba(255,255,255,0.2)" />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Select a board to view cards</div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 200 }}>
            <Loader2 size={22} color="#6366F1" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading cards…</span>
          </div>
        )}

        {!loading && filteredCards.length > 0 && (
          <div style={{ columns: 'auto minmax(280px, 1fr)', columnGap: 14 }}>
            {filteredCards.map((card, idx) => (
              <div key={card.id} style={{ breakInside: 'avoid', marginBottom: 12 }}>
                <CardItem card={card} idx={idx} onSchedule={setScheduleCard} onCall={setCallCard} />
              </div>
            ))}
          </div>
        )}

        {!loading && selectedBoard && filteredCards.length === 0 && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 10 }}>
            <CheckCircle2 size={28} color="rgba(255,255,255,0.15)" />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>No cards in this list</div>
          </div>
        )}
      </main>

      {/* Modals */}
      {scheduleCard && <ScheduleModal card={scheduleCard} onClose={() => setScheduleCard(null)} />}
      {callCard && <VoiceCallModal card={callCard} onClose={() => setCallCard(null)} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        code { font-size: 12px; }
      `}</style>
    </div>
  )
}
