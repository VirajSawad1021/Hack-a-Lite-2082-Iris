'use client'

import { motion } from 'framer-motion'
import { Brain, User, Bell, Shield, Key, Palette, ArrowLeft, Building2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const SECTIONS = [
  {
    icon: Building2,
    label: 'Company Profile',
    desc: 'Startup details shared with all agents',
    href: '/settings/company',
    accent: '#6366F1',
    highlight: true,
  },
  { icon: User,    label: 'Profile',       desc: 'Name, email, avatar',          href: '#', accent: '#6366F1' },
  { icon: Brain,   label: 'Agents',        desc: 'Configure agent behaviors',    href: '#', accent: '#8B5CF6' },
  { icon: Bell,    label: 'Notifications', desc: 'Alerts and updates',           href: '#', accent: '#F59E0B' },
  { icon: Key,     label: 'API Keys',      desc: 'Manage integrations',          href: '#', accent: '#0EA5E9' },
  { icon: Palette, label: 'Appearance',    desc: 'Theme and display',            href: '#', accent: '#EC4899' },
  { icon: Shield,  label: 'Security',      desc: 'Password, 2FA, sessions',      href: '#', accent: '#10B981' },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen px-6 py-10" style={{ background: '#0A0A0F' }}>
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-4 mb-10">
          <Link href="/dashboard">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="glass w-9 h-9 rounded-xl flex items-center justify-center border border-white/10">
              <ArrowLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage your workspace and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map(({ icon: Icon, label, desc, href, accent, highlight }, i) => (
            <Link key={label} href={href} style={{ textDecoration: 'none', gridColumn: highlight ? 'span 2' : undefined }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                style={{
                  borderRadius: 16, padding: highlight ? '20px 24px' : '22px 24px',
                  border: highlight ? `1px solid ${accent}30` : '1px solid rgba(255,255,255,0.06)',
                  background: highlight
                    ? `linear-gradient(135deg, ${accent}0D 0%, rgba(139,92,246,0.05) 100%)`
                    : 'rgba(255,255,255,0.03)',
                  cursor: href === '#' ? 'default' : 'pointer',
                  transition: 'border-color 0.18s, background 0.18s',
                  display: highlight ? 'flex' : 'block',
                  alignItems: highlight ? 'center' : undefined,
                  gap: highlight ? 16 : undefined,
                  opacity: href === '#' ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${accent}18`,
                  border: `1.5px solid ${accent}30`,
                  marginBottom: highlight ? 0 : 16,
                }}>
                  <Icon size={20} color={accent} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                      {label}
                    </h3>
                    {highlight && href !== '#' && <ExternalLink size={14} color={`${accent}80`} />}
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>{desc}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
