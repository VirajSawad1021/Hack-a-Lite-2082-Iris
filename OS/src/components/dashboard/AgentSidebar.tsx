'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Brain, PenLine, Bot, Search, Library, Plus,
  ChevronDown, ChevronRight, TrendingUp, MessageSquare,
  Code2, Globe, Calendar, Users, Settings, PanelLeftClose, PanelLeftOpen,
  ChevronLeft, LogOut, Bell
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStore, AGENTS } from '@/store/agentStore'

const AGENT_ICONS: Record<string, React.ElementType> = {
  orchestrator:       Brain,
  sales:              TrendingUp,
  customer_service:   MessageSquare,
  technical:          Code2,
  market_intelligence: Globe,
  meeting:            Calendar,
  hr_ops:             Users,
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

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function AgentSidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter()
  const { activeAgentId, setActiveAgent } = useAgentStore()
  const [agentsExpanded, setAgentsExpanded] = useState(true)

  const sidebarWidth = collapsed ? 56 : 240

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        height: '100vh', background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0,
        position: 'relative'
      }}
    >
      {/*  Header  */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 12px',
        justifyContent: collapsed ? 'center' : 'space-between', gap: 8, flexShrink: 0
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{
              width: 24, height: 24, background: '#FFFFFF10', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Brain size={13} color="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>nexos</span>
          </div>
        )}
        <button onClick={onToggle} style={{
          width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--sidebar-muted)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s, color 0.12s', flexShrink: 0
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-muted)' }}>
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/*  Nav items  */}
      <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        {/* New task */}
        <button onClick={() => router.push('/dashboard')} className="sidebar-item" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <PenLine size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span className="sidebar-item-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>New task</span>}
        </button>

        {/* Agents */}
        <button onClick={() => setAgentsExpanded(!agentsExpanded)} className="sidebar-item" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Bot size={15} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <>
              <span className="sidebar-item-text" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>Agents</span>
              <span className="badge">New</span>
              {agentsExpanded ? <ChevronDown size={12} color="rgba(255,255,255,0.4)" /> : <ChevronRight size={12} color="rgba(255,255,255,0.4)" />}
            </>
          )}
        </button>

        {/* Search */}
        <button className="sidebar-item" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Search size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span className="sidebar-item-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>Search</span>}
        </button>

        {/* Library */}
        <Link href="/agora" style={{ textDecoration: 'none' }}>
          <button className="sidebar-item" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <Library size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <span className="sidebar-item-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>Agora</span>}
          </button>
        </Link>
      </div>

      {/*  Divider  */}
      <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '10px 8px' }} />

      {/*  Agent list  */}
      <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 6px', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sidebar-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your Agents
            </span>
            <button style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--sidebar-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
              <Plus size={12} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {(agentsExpanded || collapsed) && AGENTS.map((agent) => {
            const Icon = AGENT_ICONS[agent.type] ?? Bot
            const color = AGENT_COLORS[agent.type] ?? '#6366F1'
            const isActive = activeAgentId === agent.id

            return (
              <motion.button
                key={agent.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                onClick={() => setActiveAgent(agent.id)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}
              >
                {/* Avatar orb */}
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isActive ? `1px solid ${color}55` : '1px solid transparent',
                  position: 'relative'
                }}>
                  <Icon size={13} color={color} />
                  {/* Status dot */}
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--sidebar-bg)',
                    background: agent.status === 'working' ? '#F59E0B' : agent.status === 'attention' ? '#F43F5E' : '#22C55E'
                  }} />
                </div>

                {!collapsed && (
                  <>
                    <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: isActive ? '#FFFFFF' : 'var(--sidebar-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                        {agent.name}
                      </div>
                      {agent.current_task && (
                        <div style={{ fontSize: 11, color: 'var(--sidebar-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {agent.current_task}
                        </div>
                      )}
                    </div>
                    {agent.unread_count > 0 && (
                      <span className="badge-count">{agent.unread_count}</span>
                    )}
                  </>
                )}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/*  Footer  */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--sidebar-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* User profile row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '6px' : '6px 8px',
          borderRadius: 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: 9999, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px rgba(99,102,241,0.3)',
            position: 'relative'
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>V</span>
            {/* Online indicator */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 8, height: 8, borderRadius: '50%',
              background: '#22C55E', border: '1.5px solid var(--sidebar-bg)'
            }} />
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sidebar-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>Viraj Sawad</div>
                <div style={{ fontSize: 11, color: 'var(--sidebar-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin · Pro</div>
              </div>
              <Link href="/settings" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent',
                  cursor: 'pointer', color: 'var(--sidebar-muted)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'background 0.12s, color 0.12s', flexShrink: 0
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-muted)' }}
                >
                  <Settings size={13} />
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
