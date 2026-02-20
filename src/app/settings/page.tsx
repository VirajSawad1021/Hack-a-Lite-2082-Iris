'use client'

import { motion } from 'framer-motion'
import { Brain, User, Bell, Shield, Key, Palette, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const SECTIONS = [
  { icon: User, label: 'Profile', desc: 'Name, email, avatar' },
  { icon: Brain, label: 'Agents', desc: 'Configure agent behaviors' },
  { icon: Bell, label: 'Notifications', desc: 'Alerts and updates' },
  { icon: Key, label: 'API Keys', desc: 'Manage integrations' },
  { icon: Palette, label: 'Appearance', desc: 'Theme and display' },
  { icon: Shield, label: 'Security', desc: 'Password, 2FA, sessions' },
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
          {SECTIONS.map(({ icon: Icon, label, desc }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              className="glass-md rounded-2xl p-6 border border-white/5 hover:border-indigo-500/20 transition-all cursor-pointer">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.25)' }}>
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{label}</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
