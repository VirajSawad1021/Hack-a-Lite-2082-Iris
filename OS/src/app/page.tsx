'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Brain, ChevronRight, Search, PenLine, Globe, Code2,
  Sparkles, BarChart3, MessageSquare, Calendar, Users,
  TrendingUp, Zap, MoreHorizontal, ArrowUp, Plus,
  Bot, ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AGENT_PILLS = [
  { icon: BarChart3, label: 'Analyze pipeline', color: '#06B6D4' },
  { icon: PenLine,   label: 'Write cold email', color: '#6366F1' },
  { icon: TrendingUp,label: 'Market report',    color: '#8B5CF6' },
  { icon: Calendar,  label: 'Schedule meeting',  color: '#F59E0B' },
  { icon: Code2,     label: 'Tech health check', color: '#10B981' },
]

const SUGGESTIONS = [
  'Summarize my sales pipeline this week',
  'Draft a follow-up email to Acme Corp',
  'What are the top 3 competitor moves in fintech?',
  'Schedule a stand-up with the engineering team',
  'Show me support ticket trends from last month',
  'Put together an investor update report',
]

export default function LandingPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (text?: string) => {
    const q = text ?? query
    if (!q.trim()) return
    router.push(`/dashboard?q=${encodeURIComponent(q.trim())}`)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [query])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-landing)', display: 'flex', flexDirection: 'column' }}>

      {/*  Banner  */}
      <div style={{
        background: '#F0F0EC', borderBottom: '1px solid var(--border-default)',
        padding: '9px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)'
      }}>
        <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none', transition: 'color 0.12s' }}
           onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
           onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
          NexOS agents are now live  start orchestrating your startup&apos;s AI workforce
          <ChevronRight size={14} />
        </a>
      </div>

      {/*  Nav  */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 56, background: 'var(--bg-landing)',
        borderBottom: '1px solid var(--border-default)', position: 'sticky', top: 0, zIndex: 50
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, background: '#1A1A1A', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Brain size={16} color="white" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>nexos</span>
        </div>

        {/* Center links */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['Features', 'Agents', 'Pricing', 'Docs'].map(l => (
            <a key={l} href="#" className="nav-link" style={{ padding: '5px 10px', borderRadius: 6 }}
               onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-landing-card)')}
               onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {l}
            </a>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/login" style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none',
            transition: 'background 0.12s'
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#2E2E2E')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#1A1A1A')}>
            Sign in
          </Link>
          <Link href="/signup" style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: '1px solid var(--border-input)', background: 'transparent',
            color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 0.12s'
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-landing-card)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
            Sign up
          </Link>
        </div>
      </nav>

      {/*  Hero  */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px 32px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}
        >
          {/* Serif heading */}
          <h1 style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            What can I do for you?
          </h1>

          {/* Input box */}
          <div className="manus-input-box" style={{ width: '100%', padding: '16px 16px 12px' }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Assign a task or ask anything"
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'none',
                background: 'transparent', fontSize: 15, color: 'var(--text-primary)',
                fontFamily: 'inherit', lineHeight: 1.5, minHeight: 24,
                maxHeight: 200, overflow: 'hidden',
              }}
            />
            {/* Input footer row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <button style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-input)',
                background: 'transparent', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                transition: 'background 0.12s'
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-landing-card)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                <Plus size={16} />
              </button>
              <button
                onClick={() => handleSubmit()}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: query.trim() ? '#1A1A1A' : 'var(--bg-landing-card)',
                  border: 'none', cursor: query.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: query.trim() ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'background 0.12s',
                }}
              >
                <ArrowUp size={15} />
              </button>
            </div>
          </div>

          {/* Action pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {AGENT_PILLS.map(({ icon: Icon, label, color }) => (
              <button key={label} className="action-pill" onClick={() => handleSubmit(label)}>
                <Icon size={14} color={color} />
                {label}
              </button>
            ))}
            <button className="action-pill" onClick={() => router.push('/dashboard')}>
              <MoreHorizontal size={14} />
              More
            </button>
          </div>

          {/* Quick suggestions */}
          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                style={{
                  width: '100%', background: 'var(--bg-white)', border: '1px solid var(--border-input)',
                  borderRadius: 12, boxShadow: 'var(--shadow-md)', overflow: 'hidden'
                }}
              >
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onMouseDown={() => handleSubmit(s)} style={{
                    width: '100%', padding: '11px 16px', textAlign: 'left', background: 'transparent',
                    border: 'none', borderBottom: i < SUGGESTIONS.length - 1 ? '1px solid var(--border-default)' : 'none',
                    cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F8F8F5')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                    <Sparkles size={13} color="var(--text-muted)" />
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </main>

      {/*  Agent cards section  */}
      <section style={{ padding: '48px 32px 64px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          7 specialized agents, one platform
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Master Orchestrator', icon: Brain,          color: '#6366F1', desc: 'Coordinates all agents' },
            { label: 'Sales Agent',          icon: TrendingUp,     color: '#06B6D4', desc: 'Pipeline & CRM' },
            { label: 'Customer Service',     icon: MessageSquare,  color: '#10B981', desc: 'Support & NPS' },
            { label: 'Technical Agent',      icon: Code2,          color: '#F59E0B', desc: 'Deployments & health' },
            { label: 'Market Intelligence',  icon: Globe,          color: '#8B5CF6', desc: 'Competitor tracking' },
            { label: 'Meeting Agent',        icon: Calendar,       color: '#F43F5E', desc: 'Scheduling & transcription' },
            { label: 'HR & Ops',             icon: Users,          color: '#EC4899', desc: 'Team & hiring' },
          ].map(({ label, icon: Icon, color, desc }) => (
            <motion.button
              key={label}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '16px', borderRadius: 12, border: '1px solid var(--border-default)',
                background: 'var(--bg-white)', cursor: 'pointer', textAlign: 'left',
                boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.15s'
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)')}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, marginBottom: 10,
                background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
            </motion.button>
          ))}
        </div>
      </section>

    </div>
  )
}
