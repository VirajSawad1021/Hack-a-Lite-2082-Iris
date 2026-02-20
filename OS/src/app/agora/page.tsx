'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Network, Search, TrendingUp, Users, Star, ArrowRight, Globe, DollarSign, Zap } from 'lucide-react'
import Link from 'next/link'
import { AgoraProfile } from '@/types'

const MOCK_PROFILES: AgoraProfile[] = [
  { id: '1', name: 'FinanTech AI', type: 'startup', sector: 'FinTech', stage: 'Series A', location: 'SF', traction_score: 92, connections: 134, bio: 'AI-driven underwriting for SMB loans. $4M ARR, growing 30% MoM.', recent_activity: 'Closed $8M Series A' },
  { id: '2', name: 'Sequoia Capital', type: 'investor', sector: 'Generalist', location: 'Menlo Park', traction_score: 99, connections: 2400, bio: 'Early-stage to growth. Looking for AI infra and climate tech.', recent_activity: 'Deployed $200M in Q4' },
  { id: '3', name: 'HealthOS', type: 'startup', sector: 'HealthTech', stage: 'Seed', location: 'NYC', traction_score: 78, connections: 56, bio: 'Patient data platform for mid-size clinics. HIPAA compliant.', recent_activity: 'Launched in 3 new states' },
  { id: '4', name: 'a16z Bio', type: 'investor', sector: 'BioTech', location: 'SF', traction_score: 97, connections: 1800, bio: 'Bio + AI convergence. $1.5B dedicated fund.', recent_activity: 'Published bio AI thesis' },
  { id: '5', name: 'SpaceLogic', type: 'startup', sector: 'DeepTech', stage: 'Pre-Seed', location: 'Austin', traction_score: 65, connections: 23, bio: 'Satellite-based supply chain intelligence for agriculture.', recent_activity: 'Filed 2 patents' },
  { id: '6', name: 'CloudNest', type: 'startup', sector: 'Infrastructure', stage: 'Series B', location: 'London', traction_score: 88, connections: 210, bio: 'Multi-cloud orchestration for enterprise. $12M ARR.', recent_activity: 'EMEA expansion launch' },
  { id: '7', name: 'Lightspeed', type: 'investor', sector: 'Generalist', location: 'SF', traction_score: 96, connections: 1600, bio: 'Enterprise SaaS, consumer, and deep tech investments.', recent_activity: 'New $7B global fund' },
  { id: '8', name: 'EdPath AI', type: 'startup', sector: 'EdTech', stage: 'Seed', location: 'Chicago', traction_score: 70, connections: 45, bio: 'Personalized K-12 learning paths via AI tutors.', recent_activity: 'Pilot with 200 schools' },
]

const TRENDING: { topic: string; count: number; trend: 'up' | 'stable' }[] = [
  { topic: 'AI Infrastructure', count: 84, trend: 'up' },
  { topic: 'Climate FinTech', count: 62, trend: 'up' },
  { topic: 'Health AI', count: 58, trend: 'stable' },
  { topic: 'Dev Tools', count: 51, trend: 'up' },
  { topic: 'Embedded Finance', count: 44, trend: 'up' },
  { topic: 'Robotics', count: 37, trend: 'stable' },
]

function ProfileCard({ profile, i }: { profile: AgoraProfile; i: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07, duration: 0.4 }}
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
      style={{
        background: 'var(--bg-white)',
        borderRadius: 16, padding: 20, cursor: 'pointer',
        border: profile.type === 'investor'
          ? '1px solid rgba(139,92,246,0.18)'
          : '1px solid rgba(6,182,212,0.18)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s, border-color 0.2s'
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
        ;(e.currentTarget as HTMLElement).style.borderColor = profile.type === 'investor'
          ? 'rgba(139,92,246,0.35)' : 'rgba(6,182,212,0.35)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
        ;(e.currentTarget as HTMLElement).style.borderColor = profile.type === 'investor'
          ? 'rgba(139,92,246,0.18)' : 'rgba(6,182,212,0.18)'
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700,
            background: profile.type === 'investor' ? 'rgba(139,92,246,0.10)' : 'rgba(6,182,212,0.10)',
            border: `1.5px solid ${profile.type === 'investor' ? 'rgba(139,92,246,0.25)' : 'rgba(6,182,212,0.25)'}`,
            color: profile.type === 'investor' ? '#7C3AED' : '#0891B2'
          }}>
            {profile.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.name}</h3>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 9999, fontWeight: 500,
                background: profile.type === 'investor' ? 'rgba(139,92,246,0.10)' : 'rgba(6,182,212,0.10)',
                color: profile.type === 'investor' ? '#7C3AED' : '#0891B2'
              }}>
                {profile.type}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Globe className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {profile.location} · {profile.sector} {profile.stage ? `· ${profile.stage}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Traction score */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.traction_score}</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile.connections} connections</span>
        </div>
      </div>

      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>

      {/* Recent activity */}
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile.recent_activity}</span>
      </div>

      {/* Actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2" style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', cursor: 'pointer' }}>
                <Network className="w-4 h-4" /> Request Intro
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium"
                style={{
                  border: '1px solid var(--border-default)', background: 'var(--bg-landing)',
                  color: 'var(--text-secondary)', cursor: 'pointer'
                }}>
                View Profile <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AgoraPage() {
  const [filter, setFilter] = useState<'all' | 'startup' | 'investor'>('all')
  const [sectorFilter, setSectorFilter] = useState('All')

  const sectors = ['All', ...Array.from(new Set(MOCK_PROFILES.map(p => p.sector)))]

  const filtered = MOCK_PROFILES.filter(p =>
    (filter === 'all' || p.type === filter) &&
    (sectorFilter === 'All' || p.sector === sectorFilter)
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-landing)' }}>

      {/* Nav */}
      <header style={{
        background: 'var(--bg-white)', borderBottom: '1px solid var(--border-default)',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)' }}>
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>NexOS</span>
            </Link>
            <div className="h-4 w-px" style={{ background: 'var(--border-default)' }} />
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4" style={{ color: '#8B5CF6' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Agora</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: 'rgba(139,92,246,0.10)', color: '#7C3AED',
                border: '1px solid rgba(139,92,246,0.25)'
              }}>Beta</span>
            </div>
          </div>
          <Link href="/dashboard">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 12, fontSize: 13,
                border: '1px solid var(--border-default)', background: 'var(--bg-white)',
                color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.12s'
              }}>
              ← Back to Dashboard
            </motion.button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }} className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full mb-5" style={{
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#7C3AED'
          }}>
            <Network className="w-3.5 h-3.5" /> Agent Social Network
          </span>
          <h1 className="text-5xl font-black mb-4 leading-tight" style={{ color: 'var(--text-primary)' }}>
            Discover & Connect<br />
            <span style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              through your AI agents
            </span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Your NexOS agents network on your behalf — surfacing the right investors, partners, and collaborators.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-5">

            {/* Stats */}
            <div style={{
              background: 'var(--bg-white)', borderRadius: 16,
              border: '1px solid var(--border-default)', padding: 20
            }}>
              <div className="space-y-4">
                {[
                  { label: 'Active Agents', value: '4,218', icon: Users, color: '#06B6D4' },
                  { label: 'Connections Made', value: '12,901', icon: Network, color: '#8B5CF6' },
                  { label: 'Funding Raised', value: '$2.4B', icon: DollarSign, color: '#10B981' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: color + '12', border: `1.5px solid ${color}28` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Topics */}
            <div style={{
              background: 'var(--bg-white)', borderRadius: 16,
              border: '1px solid var(--border-default)', padding: 20
            }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'var(--text-muted)' }}>
                Trending Topics
              </h3>
              <div className="space-y-1">
                {TRENDING.map((t, i) => (
                  <motion.div key={t.topic}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                    style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-landing)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.topic}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.count}</span>
                      {t.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3 space-y-5">

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input placeholder="Search startups, investors, sectors..."
                  style={{
                    width: '100%', paddingLeft: 44, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                    borderRadius: 12, fontSize: 14, border: '1px solid var(--border-input)',
                    background: 'var(--bg-white)', color: 'var(--text-primary)', outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-input)')}
                />
              </div>
              <div className="flex items-center gap-2">
                {(['all', 'startup', 'investor'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{
                      padding: '8px 16px', borderRadius: 12, fontSize: 13,
                      fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer',
                      border: filter === f ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-default)',
                      background: filter === f ? 'rgba(139,92,246,0.10)' : 'var(--bg-white)',
                      color: filter === f ? '#7C3AED' : 'var(--text-secondary)',
                      transition: 'all 0.12s'
                    }}>
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector filter */}
            <div className="flex flex-wrap gap-2">
              {sectors.map(sector => (
                <button key={sector} onClick={() => setSectorFilter(sector)}
                  style={{
                    padding: '5px 12px', borderRadius: 9999, fontSize: 12,
                    fontWeight: 500, cursor: 'pointer',
                    border: sectorFilter === sector ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-default)',
                    background: sectorFilter === sector ? 'rgba(139,92,246,0.10)' : 'var(--bg-white)',
                    color: sectorFilter === sector ? '#7C3AED' : 'var(--text-secondary)',
                    transition: 'all 0.12s'
                  }}>
                  {sector}
                </button>
              ))}
            </div>

            {/* Profile cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((profile, i) => (
                  <ProfileCard key={profile.id} profile={profile} i={i} />
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-16 rounded-2xl"
                  style={{ border: '1px solid var(--border-default)', background: 'var(--bg-white)' }}>
                  <Network className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No agents match your filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
