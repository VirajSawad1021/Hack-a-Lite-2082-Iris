'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Brain, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
        if (error) throw error
        setSent(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-landing)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Back */}
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}>
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 380 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, background: '#1A1A1A', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={18} color="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>engram</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Welcome back</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px' }}>Sign in to your workspace</p>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg-landing-card)', borderRadius: 10, padding: 4 }}>
          {(['password', 'magic'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: mode === m ? 'var(--bg-white)' : 'transparent',
              color: mode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s'
            }}>
              {m === 'password' ? 'Password' : 'Magic link'}
            </button>
          ))}
        </div>

        {/* OAuth */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { id: 'google' as const, label: 'Google', bg: '#FFFFFF' },
            { id: 'github' as const, label: 'GitHub', bg: '#1A1A1A' },
          ].map(({ id, label, bg }) => (
            <button key={id} onClick={() => handleOAuth(id)} style={{
              flex: 1, padding: '9px', border: '1px solid var(--border-input)', borderRadius: 9,
              background: bg, color: id === 'github' ? '#FFFFFF' : 'var(--text-primary)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.12s'
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
        </div>

        {/* Form */}
        {sent ? (
          <div style={{ padding: '20px', background: 'var(--bg-white)', border: '1px solid var(--border-default)', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}></div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Check your email</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>We sent a magic link to {email}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, fontSize: 13, color: '#DC2626' }}>
                {error}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@company.com"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--border-input)',
                  borderRadius: 9, fontSize: 14, background: 'var(--bg-white)', color: 'var(--text-primary)',
                  outline: 'none', transition: 'border-color 0.12s'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-input)')}
              />
            </div>
            {mode === 'password' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder=""
                    style={{
                      width: '100%', padding: '10px 40px 10px 12px', border: '1px solid var(--border-input)',
                      borderRadius: 9, fontSize: 14, background: 'var(--bg-white)', color: 'var(--text-primary)',
                      outline: 'none', transition: 'border-color 0.12s'
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-input)')}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0
                  }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', borderRadius: 9, border: 'none',
              background: '#1A1A1A', color: '#FFFFFF', fontSize: 14, fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer', marginTop: 4, transition: 'opacity 0.12s',
              opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Signing in...' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
            </button>
          </form>
        )}

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 24 }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--text-primary)', fontWeight: 500, textDecoration: 'none' }}>Create workspace</Link>
        </p>
      </motion.div>
    </div>
  )
}
