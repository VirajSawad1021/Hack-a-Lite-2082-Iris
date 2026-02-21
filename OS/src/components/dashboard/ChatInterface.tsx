'use client'
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Plus, ArrowUp, Paperclip, Mic, MoreHorizontal,
  TrendingUp, PenLine, BarChart3, Calendar, Code2,
  Globe, MessageSquare, Brain, Users, Zap, Link2,
  Search, AlertCircle, CheckCircle2, Loader2, Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore, AGENTS } from '@/store/agentStore'
import { useChatStore } from '@/store/chatStore'
import type { StreamEvent } from '@/types'

const AGENT_QUICK_ACTIONS: Record<string, { icon: React.ElementType; label: string }[]> = {
  orchestrator:       [{ icon: Brain, label: 'Strategic overview' }, { icon: Zap, label: 'Run all agents' }, { icon: BarChart3, label: 'Weekly report' }, { icon: MoreHorizontal, label: 'More' }],
  sales:              [{ icon: TrendingUp, label: 'Pipeline status' }, { icon: PenLine, label: 'Draft email' }, { icon: BarChart3, label: 'Deal analysis' }, { icon: MoreHorizontal, label: 'More' }],
  customer_service:   [{ icon: MessageSquare, label: 'Ticket summary' }, { icon: BarChart3, label: 'NPS trends' }, { icon: PenLine, label: 'Reply template' }, { icon: MoreHorizontal, label: 'More' }],
  technical:          [{ icon: Code2, label: 'System health' }, { icon: Zap, label: 'Deploy status' }, { icon: BarChart3, label: 'Error rates' }, { icon: MoreHorizontal, label: 'More' }],
  market_intelligence:[{ icon: Globe, label: 'Competitor moves' }, { icon: TrendingUp, label: 'Trend radar' }, { icon: PenLine, label: 'Market brief' }, { icon: MoreHorizontal, label: 'More' }],
  meeting:            [{ icon: Calendar, label: "Today's schedule" }, { icon: PenLine, label: 'Meeting notes' }, { icon: Zap, label: 'Action items' }, { icon: MoreHorizontal, label: 'More' }],
  hr_ops:             [{ icon: Users, label: 'Team overview' }, { icon: PenLine, label: 'Job description' }, { icon: BarChart3, label: 'Hiring funnel' }, { icon: MoreHorizontal, label: 'More' }],
  deep_research:      [{ icon: Search, label: 'Research a topic' }, { icon: Globe, label: 'Industry deep dive' }, { icon: BarChart3, label: 'Competitor analysis' }, { icon: Brain, label: 'Technology landscape' }],
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator:        '#6366F1',
  sales:               '#06B6D4',
  customer_service:    '#10B981',
  technical:           '#F59E0B',
  market_intelligence: '#8B5CF6',
  meeting:             '#F43F5E',
  hr_ops:              '#EC4899',
  deep_research:       '#0EA5E9',
}

export default function ChatInterface() {
  const { activeAgentId } = useAgentStore()
  const { messages, isTyping, inputValue, addMessage, setTyping, setInputValue, clearMessages } = useChatStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeAgent = AGENTS.find(a => a.id === activeAgentId) ?? AGENTS[0]
  const agentMessages = messages[activeAgentId] ?? []
  const color = AGENT_COLORS[activeAgent.type] ?? '#6366F1'
  const actions = AGENT_QUICK_ACTIONS[activeAgent.type] ?? []
  const typing = isTyping[activeAgentId] ?? false

  // Streaming state — lives in component so it auto-clears per agent switch
  interface StreamState {
    events: StreamEvent[]
    finalText: string
    isDone: boolean
  }
  const [streamingState, setStreamingState] = useState<StreamState | null>(null)

  // Reset streaming when switching agents
  useEffect(() => { setStreamingState(null) }, [activeAgentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentMessages, typing, streamingState])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [inputValue])

  const send = async (text?: string) => {
    const content = (text ?? inputValue).trim()
    if (!content) return
    setInputValue('')
    addMessage(activeAgentId, { role: 'user', content, content_type: 'text' })
    setTyping(activeAgentId, true)
    setStreamingState({ events: [], finalText: '', isDone: false })

    try {
      // ── SSE streaming to NexOS backend ────────────────────
      const res = await fetch('http://localhost:8001/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_type: activeAgent.type, message: content }),
      })

      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let finalAnswer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: StreamEvent = JSON.parse(line.slice(6))
            if (event.type === 'final_answer') finalAnswer = event.content ?? ''
            if (event.type === 'done') {
              setStreamingState(prev => prev ? { ...prev, isDone: true } : null)
              continue
            }
            if (event.type === 'text_chunk') {
              // Append chunk to finalText for live typewriter effect
              setStreamingState(prev => prev
                ? { ...prev, finalText: prev.finalText + (event.content ?? '') }
                : null
              )
              continue
            }
            setStreamingState(prev => prev
              ? { ...prev, events: [...prev.events, event] }
              : null
            )
          } catch { /* ignore malformed events */ }
        }
      }

      setTyping(activeAgentId, false)
      setStreamingState(null)
      addMessage(activeAgentId, {
        role: 'agent',
        content: finalAnswer || 'Task complete.',
        content_type: 'text',
      })
    } catch (err) {
      // ── Fallback — backend offline ─────────────────────────
      console.warn('[NexOS] Stream unavailable, using simulation:', err)
      setStreamingState(null)
      await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
      setTyping(activeAgentId, false)
      addMessage(activeAgentId, {
        role: 'agent',
        content: getSimulatedReply(activeAgent.type, content),
        content_type: 'text',
      })
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const hasMessages = agentMessages.length > 0 || streamingState !== null

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-landing)', overflow: 'hidden', position: 'relative'
    }}>

      {/*  Empty state: centered Manus-style  */}
      <AnimatePresence mode="wait">
        {!hasMessages && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '40px 24px 120px'
            }}
          >
            {/* Agent name badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '11px 22px', borderRadius: 9999,
              background: color + '12', border: `1.5px solid ${color}35`,
              marginBottom: 24, boxShadow: `0 0 0 6px ${color}08`
            }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{
                fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em',
                color: color, fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)'
              }}>
                {activeAgent.name}
              </span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: 'clamp(24px, 3.5vw, 38px)',
              fontWeight: 400, color: 'var(--text-primary)',
              textAlign: 'center', lineHeight: 1.2,
              letterSpacing: '-0.02em', margin: '0 0 32px'
            }}>
              What can I do for you?
            </h2>

            {/* Quick action pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
              {actions.map(({ icon: Icon, label }) => (
                <button key={label} className="action-pill" onClick={() => send(label)}>
                  <Icon size={13} color={color} />{label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*  Message list  */}
      {hasMessages && (
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px 0',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Clear chat button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => clearMessages(activeAgentId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11.5, color: 'var(--text-muted)', background: 'transparent',
                  border: '1px solid var(--border-default)', borderRadius: 9999,
                  padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = '#EF444440' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
              >
                <Trash2 size={11} />
                Clear conversation
              </button>
            </div>
            <AnimatePresence initial={false}>
              {agentMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-end', gap: 10
                  }}
                >
                  {msg.role === 'agent' && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginBottom: 2,
                      background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{activeAgent.name[0]}</span>
                    </div>
                  )}
                  {msg.role === 'user' ? (
                    <div className="bubble-user">{msg.content}</div>
                  ) : (
                    <div className="bubble-agent">
                      <MarkdownMessage content={msg.content} color={color} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming live agent panel */}
            <AnimatePresence>
              {streamingState && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{activeAgent.name[0]}</span>
                  </div>
                  <StreamingAgentMessage
                    state={streamingState}
                    color={color}
                    agentName={activeAgent.name}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Classic typing dots (used only when NOT streaming) */}
            <AnimatePresence>
              {typing && !streamingState && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{activeAgent.name[0]}</span>
                  </div>
                  <div className="bubble-agent" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/*  Bottom input bar  */}
      <div style={{
        flexShrink: 0, padding: '12px 24px 20px',
        background: 'var(--bg-landing)',
        borderTop: hasMessages ? '1px solid var(--border-default)' : 'none'
      }}>
        {/* Connect tools bar */}
        <div style={{
          maxWidth: 720, margin: '0 auto 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 14px', borderRadius: 9999,
          border: '1px solid var(--border-default)', background: 'var(--bg-white)',
          fontSize: 12, color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={12} />
            Connect your tools to {activeAgent.name}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['CRM', 'Slack', 'Calendar', 'GitHub'].map(t => (
              <button key={t} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 9999,
                border: '1px solid var(--border-default)', background: 'transparent',
                cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.12s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Main input */}
        <div className="manus-input-box" style={{ maxWidth: 720, margin: '0 auto', padding: '14px 14px 10px' }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask ${activeAgent.name} anything...`}
            style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none',
              background: 'transparent', fontSize: 14.5, color: 'var(--text-primary)',
              fontFamily: 'inherit', lineHeight: 1.5, minHeight: 24, maxHeight: 160
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-input)',
                background: 'transparent', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                color: 'var(--text-secondary)', transition:'background 0.12s'
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-landing-card)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                <Plus size={15} />
              </button>
              <button style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-input)',
                background: 'transparent', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                color: 'var(--text-secondary)', transition:'background 0.12s'
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-landing-card)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                <Paperclip size={15} />
              </button>
            </div>
            <button onClick={() => send()} style={{
              width: 32, height: 32, borderRadius: 9,
              background: inputValue.trim() ? '#1A1A1A' : 'var(--bg-landing-card)',
              border: 'none', cursor: inputValue.trim() ? 'pointer' : 'default',
              display:'flex', alignItems:'center', justifyContent:'center',
              color: inputValue.trim() ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'background 0.12s'
            }}>
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Markdown renderer for agent responses ──────────────────────

import React from 'react'
const _ListCtx = React.createContext(false) // false = ul, true = ol

function MarkdownMessage({ content, color }: { content: string; color: string }) {
  return (
    <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.72, fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', margin: '18px 0 8px', color: 'var(--text-primary)', lineHeight: 1.3 }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em', margin: '16px 0 6px', color: 'var(--text-primary)', lineHeight: 1.3 }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '12px 0 4px', color: 'var(--text-primary)' }}>{children}</h3>
          ),
          // Paragraph
          p: ({ children }) => (
            <p style={{ margin: '0 0 10px', lineHeight: 1.72 }}>{children}</p>
          ),
          // Bold
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{children}</strong>
          ),
          // Em
          em: ({ children }) => (
            <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{children}</em>
          ),
          // Unordered list
          ul: ({ children }) => (
            <_ListCtx.Provider value={false}>
              <ul style={{ margin: '6px 0 10px', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>{children}</ul>
            </_ListCtx.Provider>
          ),
          // Ordered list
          ol: ({ children }) => (
            <_ListCtx.Provider value={true}>
              <ol style={{ margin: '6px 0 10px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 5 }}>{children}</ol>
            </_ListCtx.Provider>
          ),
          // List item — dot for ul, number for ol
          li: ({ children }) => {
            const isOrdered = React.useContext(_ListCtx)
            if (isOrdered) return (
              <li style={{ lineHeight: 1.6, paddingLeft: 2, color: 'var(--text-primary)' }}>
                <span style={{ fontWeight: 600, color }}>{/* number from browser */}</span>
                {children}
              </li>
            )
            return (
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.6, listStyle: 'none' }}>
                <span style={{ marginTop: 8, width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span>{children}</span>
              </li>
            )
          },
          // Horizontal rule
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-default)', margin: '14px 0' }} />
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote style={{
              margin: '10px 0', padding: '8px 14px',
              borderLeft: `3px solid ${color}`,
              background: color + '08', borderRadius: '0 8px 8px 0',
              color: 'var(--text-secondary)', fontStyle: 'italic',
            }}>{children}</blockquote>
          ),
          // Inline code
          code: ({ children, className }) => {
            const isBlock = (className ?? '').startsWith('language-')
            if (isBlock) return (
              <pre style={{
                margin: '10px 0', padding: '12px 14px', borderRadius: 10,
                background: 'var(--bg-landing-card)',
                border: '1px solid var(--border-default)',
                overflowX: 'auto', fontSize: 12.5, lineHeight: 1.6,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                color: 'var(--text-primary)',
              }}>
                <code>{children}</code>
              </pre>
            )
            return (
              <code style={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: 12.5, padding: '1.5px 6px', borderRadius: 5,
                background: color + '14', color,
              }}>{children}</code>
            )
          },
          // Table
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '10px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: color + '10' }}>{children}</thead>
          ),
          th: ({ children }) => (
            <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, borderBottom: `2px solid ${color}30`, fontSize: 12, letterSpacing: '0.03em', textTransform: 'uppercase', color }}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={{ padding: '7px 12px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>{children}</td>
          ),
          // Links
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color, textDecoration: 'underline', textUnderlineOffset: 3 }}>{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ── Streaming agent panel ───────────────────────────────────────

interface StreamState { events: StreamEvent[]; finalText: string; isDone: boolean }

function StreamingAgentMessage({ state, color, agentName }: {
  state: StreamState; color: string; agentName: string
}) {
  return (
    <div className="bubble-agent" style={{
      maxWidth: 560, padding: 0, overflow: 'hidden',
      border: `1px solid ${color}25`, borderRadius: 14,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `1px solid ${color}18`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: color + '07',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {agentName}
        </span>
        {!state.isDone && (
          <span style={{
            fontSize: 10.5, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            <Loader2 size={10} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
            working…
          </span>
        )}
        {state.isDone && <CheckCircle2 size={13} color={color} />}
      </div>

      {/* Steps */}
      {state.events.length > 0 && (
        <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {state.events.map((ev, i) => <EventRow key={i} event={ev} color={color} />)}
        </div>
      )}

      {/* Final answer */}
      {state.finalText && (
        <div style={{
          padding: '10px 14px 12px',
          borderTop: `1px solid ${color}18`,
        }}>
          <MarkdownMessage content={state.finalText} color={color} />
        </div>
      )}
    </div>
  )
}

function EventRow({ event, color }: { event: StreamEvent; color: string }) {
  if (event.type === 'agent_started') return null  // header already shows this

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 7,
    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
  }
  const iconStyle: React.CSSProperties = { flexShrink: 0, marginTop: 1, opacity: 0.75 }

  if (event.type === 'tool_used') return (
    <div style={rowStyle}>
      <Search size={12} color={color} style={iconStyle} />
      <span>
        <span style={{ fontWeight: 600, color }}>Using </span>
        <span style={{ fontFamily: 'monospace' }}>{event.tool}</span>
        {event.input && (
          <span style={{ color: 'var(--text-muted)' }}>{' '}— {event.input.slice(0, 100)}{event.input.length > 100 ? '…' : ''}</span>
        )}
      </span>
    </div>
  )

  if (event.type === 'thinking') return (
    <div style={{ ...rowStyle, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
      <span>{(event.content ?? '').slice(0, 200)}{(event.content ?? '').length > 200 ? '…' : ''}</span>
    </div>
  )

  if (event.type === 'step') return (
    <div style={rowStyle}>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0, marginTop: 6 }} />
      <span style={{ color: 'var(--text-muted)' }}>{(event.content ?? '').slice(0, 200)}</span>
    </div>
  )

  if (event.type === 'error') return (
    <div style={{ ...rowStyle, color: '#EF4444' }}>
      <AlertCircle size={12} style={iconStyle} />
      <span>{event.content}</span>
    </div>
  )

  return null
}

// ── Simulated replies (fallback when backend offline) ──────────

function getSimulatedReply(type: string, input: string): string {
  const lc = input.toLowerCase()

  // Handle write/create/report prompts universally
  if (lc.includes('write') || lc.includes('create') || lc.includes('draft') || lc.includes('report') || lc.includes('article') || lc.includes('future')) {
    const topic = input.length > 60 ? input.slice(0, 60) + '…' : input
    return `Got it! Here's a draft on **"${topic}"**:\n\nThe landscape is shifting rapidly. Forward-thinking teams are now leveraging AI not just to automate tasks, but to make better decisions at scale — surfacing insights that would take weeks to uncover manually.\n\nKey themes to explore:\n• **Near-term change** — where incumbents are already being disrupted\n• **Infrastructure needs** — what needs to be true for this to work at scale\n• **Risk factors** — regulatory, technical, and adoption headwinds\n• **Opportunity map** — where the biggest whitespaces remain\n\nWant me to expand any section, add data, or adjust the tone?`
  }

  const replies: Record<string, string[]> = {
    orchestrator: ["I've reviewed that across all agents. Here's the strategic summary: your sales pipeline has 3 hot deals this week, customer support tickets are up 12% (likely from the new product launch), and the engineering team completed 94% of sprint goals. Want me to prioritize anything specific?", "Coordinating with Sales and Market Intelligence now. I'll have a consolidated brief ready in 2 minutes.", "Got it. I'll delegate this to the appropriate specialist agents and synthesize the results."],
    sales: ["Based on your CRM data, you have 3 deals in the negotiation stage totaling $184K ARR. Acme Corp is the highest-priority — they've been in the pipeline for 23 days and opened your last email twice. Want me to draft a follow-up?", "Pipeline is looking healthy this week. 2 new SQLs came in from the product-led motion. I've scheduled follow-ups for Monday."],
    customer_service: ["Ticket volume is up 18% over the last 7 days, mostly related to the new onboarding flow. I've identified the top 3 recurring issues and drafted KB articles for each. NPS is holding steady at 58.", "I'll draft a response template for that. Here's what I suggest based on your brand voice…"],
    technical: ["System health is green across all services. Latency P95 is 142ms (down 8% from last week). One issue: the auth service memory usage has been climbing since Tuesday's deploy — recommend a review.", "Last deploy went out 2 hours ago. All 47 tests passed. Zero error spike in Datadog."],
    market_intelligence: ["Competitor Acme raised a $40M Series B yesterday. Their job postings show 8 new ML engineer roles — likely expanding their recommendation engine. This aligns with the trend I flagged last month.", "Here's this week's fintech digest: 3 notable product launches, 2 funding rounds, and 1 acquisition that could impact your positioning."],
    meeting: ["You have 4 meetings tomorrow: 9am standup, 11am investor sync (prep notes attached), 2pm product review, 4pm 1-on-1 with head of sales. Want me to prepare an agenda for any of them?", "I've transcribed the meeting and extracted 6 action items. Sending summaries to all participants now."],
    hr_ops: ["Your team is at 87% capacity this sprint. Two open roles (Senior BE Engineer, Product Designer) have 12 and 8 applicants respectively. The BE pipeline is moving slowly — top candidate hasn't heard back in 5 days.", "Here's a job description draft for the role. I've tailored it based on your best-performing job posts."],
  }
  const pool = replies[type] ?? replies.orchestrator
  return pool[Math.floor(Math.random() * pool.length)]
}
