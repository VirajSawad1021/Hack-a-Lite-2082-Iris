'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, TrendingUp, MessageSquare, Code2, Globe,
  Calendar, Users, Search, Network, ArrowLeft,
  Play, Square, ChevronDown, ChevronUp, Sparkles, CheckCircle2,
  Loader2, Bot, Lightbulb,
} from 'lucide-react'
import Link from 'next/link'

// ── Agent registry ────────────────────────────────────────────
const AGENTS = [
  { type: 'orchestrator',        name: 'Orchestrator',     icon: Brain,         color: '#6366F1', desc: 'Strategy & coordination' },
  { type: 'sales',               name: 'Sales',            icon: TrendingUp,    color: '#06B6D4', desc: 'Pipeline & outreach' },
  { type: 'customer_service',    name: 'Customer Service', icon: MessageSquare, color: '#10B981', desc: 'Support & retention' },
  { type: 'technical',           name: 'Technical',        icon: Code2,         color: '#F59E0B', desc: 'Engineering & systems' },
  { type: 'market_intelligence', name: 'Market Intel',     icon: Globe,         color: '#8B5CF6', desc: 'Trends & competitors' },
  { type: 'meeting',             name: 'Meeting',          icon: Calendar,      color: '#F43F5E', desc: 'Planning & summaries' },
  { type: 'hr_ops',              name: 'HR & Ops',         icon: Users,         color: '#EC4899', desc: 'People & operations' },
  { type: 'deep_research',       name: 'Deep Research',    icon: Search,        color: '#0EA5E9', desc: 'Multi-source research' },
]

const AGENT_MAP = Object.fromEntries(AGENTS.map(a => [a.type, a]))

// ── Preset goals ─────────────────────────────────────────────
const PRESETS = [
  {
    label: 'Go-to-Market Plan',
    goal: 'Create a comprehensive go-to-market plan for our product launch next quarter — covering target segments, outreach strategy, pricing, and success metrics.',
    agents: ['orchestrator', 'sales', 'market_intelligence'],
  },
  {
    label: 'Hiring Strategy',
    goal: 'We need to hire 3 engineers and a growth lead in the next 60 days. Create a full hiring plan: JDs, pipeline, interview process, and offer structure.',
    agents: ['hr_ops', 'orchestrator', 'technical'],
  },
  {
    label: 'Customer Churn Analysis',
    goal: 'We lost 4 enterprise customers last month. Analyze the likely causes, draft a win-back plan, and suggest product/support improvements.',
    agents: ['customer_service', 'sales', 'market_intelligence'],
  },
  {
    label: 'Competitor Deep Dive',
    goal: 'Run a full competitive analysis on our top 3 competitors — product gaps, pricing, recent moves, and how we should position against them.',
    agents: ['market_intelligence', 'deep_research', 'orchestrator'],
  },
  {
    label: 'Sprint Planning',
    goal: 'Plan the next 2-week engineering sprint. Prioritise features, identify blockers, set team capacity, and draft stakeholder update.',
    agents: ['technical', 'meeting', 'hr_ops'],
  },
]

// ── Types ─────────────────────────────────────────────────────
interface Message {
  id: string
  agent: string
  agentName: string
  color: string
  text: string
  streaming: boolean
  complete: boolean
}

interface SessionState {
  status: 'idle' | 'running' | 'complete' | 'error'
  messages: Message[]
  currentAgent: string | null
  error: string
}

// ── Main page ─────────────────────────────────────────────────
export default function AgoraPage() {
  const [goal, setGoal] = useState('')
  const [selected, setSelected] = useState<string[]>(['orchestrator', 'market_intelligence', 'sales'])
  const [session, setSession] = useState<SessionState>({
    status: 'idle', messages: [], currentAgent: null, error: '',
  })
  const [showPresets, setShowPresets] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [session.messages, scrollToBottom])

  const toggleAgent = (type: string) => {
    setSelected(prev =>
      prev.includes(type)
        ? prev.length > 2 ? prev.filter(t => t !== type) : prev
        : prev.length < 4 ? [...prev, type] : prev
    )
  }

  const applyPreset = (p: typeof PRESETS[0]) => {
    setGoal(p.goal)
    setSelected(p.agents)
    setShowPresets(false)
  }

  const stop = useCallback(() => {
    setSession(s => ({
      ...s,
      status: s.status === 'running' ? 'complete' : s.status,
      currentAgent: null,
    }))
  }, [])

  const handleEvent = useCallback((evt: Record<string, unknown>) => {
    switch (evt.type) {
      case 'agent_start': {
        const at = evt.agent as string
        const msgId = `${at}-${Date.now()}`
        setSession(s => ({
          ...s,
          currentAgent: at,
          messages: [...s.messages, {
            id: msgId, agent: at,
            agentName: evt.agent_name as string,
            color: evt.avatar_color as string,
            text: '', streaming: true, complete: false,
          }],
        }))
        break
      }
      case 'text_chunk': {
        const at = evt.agent as string
        setSession(s => ({
          ...s,
          messages: s.messages.map(m =>
            m.agent === at && m.streaming ? { ...m, text: m.text + (evt.content as string) } : m
          ),
        }))
        break
      }
      case 'agent_complete': {
        const at = evt.agent as string
        setSession(s => ({
          ...s,
          messages: s.messages.map(m =>
            m.agent === at && m.streaming ? { ...m, streaming: false, complete: true } : m
          ),
        }))
        break
      }
      case 'session_complete':
        setSession(s => ({ ...s, status: 'complete', currentAgent: null }))
        break
      case 'error':
        setSession(s => ({ ...s, status: 'error', error: evt.content as string, currentAgent: null }))
        break
      case 'done':
        setSession(s => ({ ...s, status: s.status === 'running' ? 'complete' : s.status, currentAgent: null }))
        break
    }
  }, [])

  const run = useCallback(async () => {
    if (!goal.trim() || selected.length < 2) return
    setSession({ status: 'running', messages: [], currentAgent: null, error: '' })

    try {
      const response = await fetch('http://localhost:8001/agora/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim(), agent_types: selected }),
      })
      if (!response.ok) {
        const err = await response.text()
        setSession(s => ({ ...s, status: 'error', error: err }))
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          try { handleEvent(JSON.parse(line.slice(5).trim())) } catch { /* skip */ }
        }
      }
    } catch (e: unknown) {
      setSession(s => ({
        ...s, status: 'error',
        error: e instanceof Error ? e.message : 'Connection failed — is the backend running?',
      }))
    }
  }, [goal, selected, handleEvent])

  const isRunning = session.status === 'running'

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button style={{
              width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)',
            }}>
              <ArrowLeft size={15} />
            </button>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Network size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Agora</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Multi-agent collaboration</div>
            </div>
          </div>
        </div>
        {/* Live agent pulse indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selected.map(type => {
            const a = AGENT_MAP[type]; const Icon = a.icon; const active = session.currentAgent === type
            return (
              <motion.div key={type}
                animate={active ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={active ? { repeat: Infinity, duration: 1.1 } : {}}
                title={a.name}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: active ? a.color + '25' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${active ? a.color + '70' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                }}>
                <Icon size={13} color={active ? a.color : 'rgba(255,255,255,0.3)'} />
              </motion.div>
            )
          })}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{
          width: 310, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', padding: 20, gap: 20, overflowY: 'auto',
        }}>

          {/* Goal */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Collaboration Goal
            </label>
            <textarea
              value={goal} onChange={e => setGoal(e.target.value)} disabled={isRunning} rows={5}
              placeholder="What should the agents work on together? Be specific — describe the problem, context, and desired output…"
              style={{
                width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px',
                color: 'rgba(255,255,255,0.88)', fontSize: 13, resize: 'none', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.6, opacity: isRunning ? 0.5 : 1,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
            <button onClick={() => setShowPresets(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'none',
              border: 'none', color: '#6366F1', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
            }}>
              <Lightbulb size={12} />
              Example scenarios
              {showPresets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
              {showPresets && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {PRESETS.map(p => (
                      <button key={p.label} onClick={() => applyPreset(p)} style={{
                        textAlign: 'left', background: 'rgba(99,102,241,0.06)',
                        border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8,
                        padding: '8px 11px', color: 'rgba(255,255,255,0.75)', fontSize: 12, cursor: 'pointer',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                      >
                        <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: 2 }}>{p.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{p.agents.map(t => AGENT_MAP[t]?.name).join(' → ')}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agent picker */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Select Agents <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none' }}>(2–4)</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {AGENTS.map(a => {
                const Icon = a.icon; const on = selected.includes(a.type); const active = session.currentAgent === a.type
                return (
                  <button key={a.type} onClick={() => !isRunning && toggleAgent(a.type)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
                    border: 'none', background: on ? a.color + '15' : 'rgba(255,255,255,0.03)',
                    outline: on ? `1.5px solid ${a.color}40` : '1.5px solid transparent',
                    cursor: isRunning ? 'default' : 'pointer', transition: 'all 0.12s', textAlign: 'left',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: on ? a.color + '20' : 'rgba(255,255,255,0.06)',
                      border: active ? `1.5px solid ${a.color}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active
                        ? <Loader2 size={13} color={a.color} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Icon size={13} color={on ? a.color : 'rgba(255,255,255,0.3)'} />
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: on ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: '-0.01em' }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: on ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)' }}>{a.desc}</div>
                    </div>
                    {on && <CheckCircle2 size={14} color={a.color} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Flow preview */}
          {selected.length >= 2 && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Execution Flow
              </label>
              {selected.map((type, i) => {
                const a = AGENT_MAP[type]; const Icon = a.icon
                return (
                  <div key={type}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: a.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={12} color={a.color} />
                      </div>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{a.name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
                        {i === 0 ? 'leads' : i === selected.length - 1 ? 'finalises' : 'builds on above'}
                      </span>
                    </div>
                    {i < selected.length - 1 && (
                      <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', marginLeft: 13 }} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel: conversation */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Run/Stop bar */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {session.status === 'idle' && 'Pick a goal and 2–4 agents, then start the session'}
              {session.status === 'running' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#818cf8' }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  {session.currentAgent ? `${AGENT_MAP[session.currentAgent]?.name} is working…` : 'Starting…'}
                </span>
              )}
              {session.status === 'complete' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981' }}>
                  <CheckCircle2 size={13} />
                  Session complete — {session.messages.length} agents contributed
                </span>
              )}
              {session.status === 'error' && <span style={{ color: '#F43F5E' }}>{session.error}</span>}
            </div>
            {isRunning ? (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={stop} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8,
                background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                color: '#F43F5E', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                <Square size={12} /> Stop
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: goal.trim() && selected.length >= 2 ? 1.03 : 1 }}
                whileTap={{ scale: goal.trim() && selected.length >= 2 ? 0.97 : 1 }}
                onClick={run} disabled={!goal.trim() || selected.length < 2}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', borderRadius: 8,
                  background: goal.trim() && selected.length >= 2
                    ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                    : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: goal.trim() && selected.length >= 2 ? '#fff' : 'rgba(255,255,255,0.25)',
                  fontSize: 13, fontWeight: 600,
                  cursor: goal.trim() && selected.length >= 2 ? 'pointer' : 'not-allowed',
                  boxShadow: goal.trim() && selected.length >= 2 ? '0 0 20px rgba(99,102,241,0.25)' : 'none',
                  transition: 'all 0.15s',
                }}>
                {session.status === 'complete' ? <><Sparkles size={13} /> Run Again</> : <><Play size={13} /> Start Session</>}
              </motion.button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {session.messages.length === 0 && session.status === 'idle' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 300 }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Network size={26} color="#6366F1" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Agent collaboration</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, maxWidth: 340 }}>
                    Each agent reads the previous agents&apos; output and builds on it — giving you a layered, multi-perspective answer.<br /><br />
                    Pick a goal, choose 2–4 agents, and hit Start.
                  </div>
                </div>
                <button onClick={() => setShowPresets(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  <Lightbulb size={13} /> See example scenarios
                </button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {session.messages.map((msg, idx) => {
                const a = AGENT_MAP[msg.agent] ?? { icon: Bot, color: '#6366F1', name: msg.agentName, desc: '' }
                const Icon = a.icon
                const nextMsg = session.messages[idx + 1]
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    {/* Agent header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: msg.color + '20', border: `1.5px solid ${msg.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {msg.streaming
                          ? <Loader2 size={14} color={msg.color} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Icon size={14} color={msg.color} />
                        }
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{msg.agentName}</span>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: msg.color + '15', color: msg.color, fontWeight: 500 }}>
                        {idx === 0 ? 'Leads' : `Step ${idx + 1}`}
                      </span>
                      {msg.complete && <CheckCircle2 size={13} color="#10B981" />}
                    </div>

                    {/* Bubble */}
                    <div style={{
                      marginLeft: 42, background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${msg.color}20`, borderRadius: 12, borderTopLeftRadius: 4,
                      padding: '14px 18px',
                    }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, fontFamily: 'inherit' }}>
                        {msg.text}
                        {msg.streaming && (
                          <motion.span
                            animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.55 }}
                            style={{ display: 'inline-block', width: 2, height: '1em', background: msg.color, marginLeft: 2, verticalAlign: 'text-bottom' }}
                          />
                        )}
                      </pre>
                    </div>

                    {/* Handoff line */}
                    {nextMsg && (
                      <div style={{ marginLeft: 58, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ height: 1, width: 20, background: 'rgba(255,255,255,0.07)' }} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
                          hands off to {AGENT_MAP[nextMsg.agent]?.name ?? '…'}
                        </span>
                        <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {session.status === 'complete' && session.messages.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  All {session.messages.length} agents completed — layered, multi-perspective output ready.
                </span>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(255,255,255,0.18); }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
      `}</style>
    </div>
  )
}
