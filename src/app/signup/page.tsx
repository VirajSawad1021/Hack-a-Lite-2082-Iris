'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mail, Lock, User, ArrowRight, Github, Chrome } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, workspace_name: workspaceName },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: '#0A0A0F' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb w-96 h-96 top-0 right-0 opacity-15" style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
        <div className="orb w-80 h-80 bottom-0 left-0 opacity-15" style={{ background: 'radial-gradient(circle, #06B6D4, transparent)', animationDelay: '-3s' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-md">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl gradient-text">NexOS</span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">Create your workspace</h2>
        <p className="mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>Get your AI team up and running in minutes</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { icon: User, value: fullName, setter: setFullName, placeholder: 'Full name', type: 'text' },
            { icon: Mail, value: email, setter: setEmail, placeholder: 'Work email', type: 'email' },
            { icon: Brain, value: workspaceName, setter: setWorkspaceName, placeholder: 'Company / workspace name', type: 'text' },
            { icon: Lock, value: password, setter: setPassword, placeholder: 'Password (8+ chars)', type: 'password' },
          ].map(({ icon: Icon, value, setter, placeholder, type }) => (
            <div key={placeholder} className="relative">
              <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={type} value={value} onChange={e => setter(e.target.value)} required
                placeholder={placeholder}
                className="w-full glass rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500/60 border border-white/10 transition-all"
              />
            </div>
          ))}

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="text-sm text-rose-400 px-1">{error}</motion.p>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <> Launch My Workspace <ArrowRight className="w-4 h-4" /> </>
            )}
          </motion.button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([{ provider: 'google' as const, icon: Chrome, label: 'Google' }, { provider: 'github' as const, icon: Github, label: 'GitHub' }] as const).map(({ provider, icon: Icon, label }) => (
            <motion.button key={provider} onClick={() => handleOAuth(provider)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="glass flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
              style={{ color: 'rgba(255,255,255,0.8)' }}>
              <Icon className="w-4 h-4" /> {label}
            </motion.button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
