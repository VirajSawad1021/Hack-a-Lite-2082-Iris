'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Plus, ArrowUp, Paperclip, Mic, MoreHorizontal,
  TrendingUp, PenLine, BarChart3, Calendar, Code2,
  Globe, MessageSquare, Brain, Users, Zap, Link2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore, AGENTS } from '@/store/agentStore'
import { useChatStore } from '@/store/chatStore'

const AGENT_QUICK_ACTIONS: Record<string, { icon: React.ElementType; label: string }[]> = {
  orchestrator:       [{ icon: Brain, label: 'Strategic overview' }, { icon: Zap, label: 'Run all agents' }, { icon: BarChart3, label: 'Weekly report' }, { icon: MoreHorizontal, label: 'More' }],
  sales:              [{ icon: TrendingUp, label: 'Pipeline status' }, { icon: PenLine, label: 'Draft email' }, { icon: BarChart3, label: 'Deal analysis' }, { icon: MoreHorizontal, label: 'More' }],
  customer_service:   [{ icon: MessageSquare, label: 'Ticket summary' }, { icon: BarChart3, label: 'NPS trends' }, { icon: PenLine, label: 'Reply template' }, { icon: MoreHorizontal, label: 'More' }],
  technical:          [{ icon: Code2, label: 'System health' }, { icon: Zap, label: 'Deploy status' }, { icon: BarChart3, label: 'Error rates' }, { icon: MoreHorizontal, label: 'More' }],
  market_intelligence:[{ icon: Globe, label: 'Competitor moves' }, { icon: TrendingUp, label: 'Trend radar' }, { icon: PenLine, label: 'Market brief' }, { icon: MoreHorizontal, label: 'More' }],
  meeting:            [{ icon: Calendar, label: "Today's schedule" }, { icon: PenLine, label: 'Meeting notes' }, { icon: Zap, label: 'Action items' }, { icon: MoreHorizontal, label: 'More' }],
  hr_ops:             [{ icon: Users, label: 'Team overview' }, { icon: PenLine, label: 'Job description' }, { icon: BarChart3, label: 'Hiring funnel' }, { icon: MoreHorizontal, label: 'More' }],
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator:        '#6366F1',
  sales:               '#06B6D4',
  customer_service:    '#10B981',
  technical:           '#F59E0B',
  market_intelligence: '#8B5CF6',
  meeting:             '#F43F5E',
  hr_ops:              '#EC4899',
}

export default function ChatInterface() {
  const { activeAgentId } = useAgentStore()
  const { messages, isTyping, inputValue, addMessage, setTyping, setInputValue } = useChatStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeAgent = AGENTS.find(a => a.id === activeAgentId) ?? AGENTS[0]
  const agentMessages = messages[activeAgentId] ?? []
  const color = AGENT_COLORS[activeAgent.type] ?? '#6366F1'
  const actions = AGENT_QUICK_ACTIONS[activeAgent.type] ?? []
  const typing = isTyping[activeAgentId] ?? false

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentMessages, typing])

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
    try {
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
      setTyping(activeAgentId, false)
      addMessage(activeAgentId, {
        role: 'agent',
        content: getSimulatedReply(activeAgent.type, content),
        content_type: 'text',
      })
    } catch (err) {
      setTyping(activeAgentId, false)
      addMessage(activeAgentId, {
        role: 'agent',
        content: 'Something went wrong on my end. Please try again.',
        content_type: 'text',
      })
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const hasMessages = agentMessages.length > 0

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
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 9999,
              background: color + '12', border: `1.5px solid ${color}35`,
              marginBottom: 24, boxShadow: `0 0 0 4px ${color}08`
            }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{
                fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em',
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
                  <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-agent'}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {typing && (
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
