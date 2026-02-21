'use client'
import { useState, useEffect } from 'react'
import { X, Building2, Save, Loader2 } from 'lucide-react'

interface CompanyProfile {
  company_name: string
  tagline: string
  industry: string
  stage: string
  product_description: string
  target_customers: string
  team_size: string
  key_differentiators: string
  competitors: string
  revenue_model: string
}

const EMPTY: CompanyProfile = {
  company_name: '',
  tagline: '',
  industry: '',
  stage: '',
  product_description: '',
  target_customers: '',
  team_size: '',
  key_differentiators: '',
  competitors: '',
  revenue_model: '',
}

const STAGE_OPTIONS = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Bootstrapped', 'Growth', 'Public']

interface Props {
  open: boolean
  onClose: () => void
}

export default function CompanyProfileModal({ open, onClose }: Props) {
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('http://localhost:8001/api/company-profile')
      .then(r => r.json())
      .then(data => setProfile({ ...EMPTY, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const set = (key: keyof CompanyProfile, val: string) =>
    setProfile(p => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('http://localhost:8001/api/company-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      alert('Failed to save. Is the backend running?')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card, #1a1a2e)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        width: '100%', maxWidth: 560,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={17} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #fff)', letterSpacing: '-0.02em' }}>
                Company Profile
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                Agents use this context in every response
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: 'none',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', transition: 'background 0.12s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 10, color: 'rgba(255,255,255,0.4)' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Loading profile…</span>
            </div>
          ) : (
            <>
              <Row label="Company Name" required>
                <Input
                  value={profile.company_name}
                  onChange={v => set('company_name', v)}
                  placeholder="e.g. Engram"
                />
              </Row>

              <Row label="Tagline">
                <Input
                  value={profile.tagline}
                  onChange={v => set('tagline', v)}
                  placeholder="e.g. The AI operating system for startups"
                />
              </Row>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Row label="Industry">
                  <Input
                    value={profile.industry}
                    onChange={v => set('industry', v)}
                    placeholder="e.g. B2B SaaS"
                  />
                </Row>
                <Row label="Stage">
                  <select
                    value={profile.stage}
                    onChange={e => set('stage', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select stage…</option>
                    {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Row>
              </div>

              <Row label="What does your product do?">
                <Textarea
                  value={profile.product_description}
                  onChange={v => set('product_description', v)}
                  placeholder="Describe your core product, how it works, and the problem it solves…"
                  rows={3}
                />
              </Row>

              <Row label="Target Customers">
                <Input
                  value={profile.target_customers}
                  onChange={v => set('target_customers', v)}
                  placeholder="e.g. Early-stage startup founders, Series A SaaS companies"
                />
              </Row>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Row label="Team Size">
                  <Input
                    value={profile.team_size}
                    onChange={v => set('team_size', v)}
                    placeholder="e.g. 8 people"
                  />
                </Row>
                <Row label="Revenue Model">
                  <Input
                    value={profile.revenue_model}
                    onChange={v => set('revenue_model', v)}
                    placeholder="e.g. Monthly SaaS subscription"
                  />
                </Row>
              </div>

              <Row label="Key Differentiators">
                <Textarea
                  value={profile.key_differentiators}
                  onChange={v => set('key_differentiators', v)}
                  placeholder="What makes you different from competitors? What's your unfair advantage?"
                  rows={2}
                />
              </Row>

              <Row label="Key Competitors">
                <Input
                  value={profile.competitors}
                  onChange={v => set('competitors', v)}
                  placeholder="e.g. Notion AI, Lindy, Zapier (in the AI ops space)"
                />
              </Row>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Saved to <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>company_profile.json</code>
          </p>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: saved ? '#10B981' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'background 0.3s, opacity 0.15s',
            }}
          >
            {saving
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Save size={14} />
            }
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function Row({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.03em' }}>
        {label}{required && <span style={{ color: '#F43F5E', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  color: 'rgba(255,255,255,0.9)', fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
    />
  )
}
