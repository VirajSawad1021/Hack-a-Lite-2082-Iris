'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, Save, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'

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

const FIELDS: {
  key: keyof CompanyProfile
  label: string
  placeholder: string
  type?: 'input' | 'textarea' | 'select'
  rows?: number
  half?: boolean
  options?: string[]
}[] = [
  {
    key: 'company_name',
    label: 'Company Name',
    placeholder: 'e.g. Engram',
  },
  {
    key: 'tagline',
    label: 'Tagline',
    placeholder: 'e.g. The AI operating system for startups',
  },
  {
    key: 'industry',
    label: 'Industry',
    placeholder: 'e.g. B2B SaaS, Fintech, HealthTech',
    half: true,
  },
  {
    key: 'stage',
    label: 'Funding Stage',
    placeholder: 'Select stage…',
    type: 'select',
    options: STAGE_OPTIONS,
    half: true,
  },
  {
    key: 'product_description',
    label: 'What does your product do?',
    placeholder: 'Describe your core product, how it works, and the problem it solves. The more detail here, the better agents will contextualise their answers…',
    type: 'textarea',
    rows: 4,
  },
  {
    key: 'target_customers',
    label: 'Target Customers',
    placeholder: 'e.g. Early-stage startup founders, seed-stage B2B SaaS companies with 1–20 employees',
  },
  {
    key: 'team_size',
    label: 'Team Size',
    placeholder: 'e.g. 8 people (3 engineering, 2 product, 2 growth, 1 ops)',
    half: true,
  },
  {
    key: 'revenue_model',
    label: 'Revenue Model',
    placeholder: 'e.g. Monthly SaaS subscription, $99–$499/mo',
    half: true,
  },
  {
    key: 'key_differentiators',
    label: 'Key Differentiators',
    placeholder: 'What makes you different from competitors? What\'s your unfair advantage or unique insight?',
    type: 'textarea',
    rows: 3,
  },
  {
    key: 'competitors',
    label: 'Key Competitors',
    placeholder: 'e.g. Notion AI, Lindy, Zapier (in the AI ops space)',
  },
]

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:8001/api/company-profile')
      .then(r => r.json())
      .then(data => setProfile({ ...EMPTY, ...data }))
      .catch(() => setError('Could not connect to backend. Make sure it\'s running on port 8001.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof CompanyProfile, val: string) =>
    setProfile(p => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('http://localhost:8001/api/company-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const filled = Object.values(profile).filter(Boolean).length
  const pct = Math.round((filled / Object.keys(EMPTY).length) * 100)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', padding: '40px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Back nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              <ArrowLeft size={15} />
            </motion.button>
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>
              Company Profile
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: 2 }}>
              This context is injected into every agent response — the more you fill in, the smarter the agents.
            </p>
          </div>
        </div>

        {/* Completeness bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 16,
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={17} color="#6366F1" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                Profile completeness
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#10B981' : '#6366F1' }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%', borderRadius: 999,
                  background: pct === 100
                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                    : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(99,102,241,0.12)',
              border: '1.5px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={16} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                Startup Details
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                Shared with all 8 Engram agents on every request
              </div>
            </div>
          </div>

          {/* Fields */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {loading ? (
              <div style={{
                height: 200, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.3)',
              }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 14 }}>Loading profile…</span>
              </div>
            ) : (
              <>
                {/* Render fields — pair halves into rows */}
                {renderFields(FIELDS, profile, set)}

                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                    fontSize: 13, color: '#F43F5E',
                  }}>
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              Saved to <code style={{
                fontSize: 11, background: 'rgba(255,255,255,0.07)',
                padding: '2px 6px', borderRadius: 5,
              }}>company_profile.json</code> on the backend
            </p>

            <motion.button
              onClick={handleSave}
              disabled={saving || loading}
              whileHover={{ scale: saving ? 1 : 1.03 }}
              whileTap={{ scale: saving ? 1 : 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: saved
                  ? '#10B981'
                  : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.75 : 1,
                transition: 'background 0.3s',
                boxShadow: saved ? '0 0 20px rgba(16,185,129,0.3)' : '0 0 20px rgba(99,102,241,0.25)',
              }}
            >
              {saving
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : saved
                ? <CheckCircle2 size={14} />
                : <Save size={14} />
              }
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Profile'}
            </motion.button>
          </div>
        </motion.div>

        {/* Agent context preview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          style={{
            marginTop: 20,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '18px 24px',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Live context preview — what agents see
          </div>
          <pre style={{
            fontSize: 12, color: 'rgba(255,255,255,0.55)',
            background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 14px',
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          }}>
            {buildPreview(profile)}
          </pre>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input, textarea, select { color-scheme: dark; }
      `}</style>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

type FieldDef = typeof FIELDS[number]

function renderFields(
  fields: FieldDef[],
  profile: CompanyProfile,
  set: (k: keyof CompanyProfile, v: string) => void
) {
  const output: React.ReactNode[] = []
  let i = 0
  while (i < fields.length) {
    const f = fields[i]
    if (f.half && fields[i + 1]?.half) {
      // Pair two half-width fields into one row
      const g = fields[i + 1]
      output.push(
        <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FieldRow field={f} value={profile[f.key]} onChange={v => set(f.key, v)} />
          <FieldRow field={g} value={profile[g.key]} onChange={v => set(g.key, v)} />
        </div>
      )
      i += 2
    } else {
      output.push(<FieldRow key={f.key} field={f} value={profile[f.key]} onChange={v => set(f.key, v)} />)
      i += 1
    }
  }
  return output
}

function FieldRow({
  field, value, onChange,
}: {
  field: FieldDef
  value: string
  onChange: (v: string) => void
}) {
  const base: React.CSSProperties = {
    width: '100%', padding: '9px 13px', borderRadius: 9, boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.88)', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s',
  }
  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
    e.currentTarget.style.background = 'rgba(99,102,241,0.05)'
  }
  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em' }}>
        {field.label}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          style={{ ...base, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={onFocus as React.FocusEventHandler<HTMLTextAreaElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLTextAreaElement>}
        />
      ) : field.type === 'select' ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...base, appearance: 'none', cursor: 'pointer' }}
          onFocus={onFocus as React.FocusEventHandler<HTMLSelectElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLSelectElement>}
        >
          <option value="">Select stage…</option>
          {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={base}
          onFocus={onFocus as React.FocusEventHandler<HTMLInputElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLInputElement>}
        />
      )}
    </div>
  )
}

const LABELS: Record<string, string> = {
  company_name:        'Company',
  tagline:             'Tagline',
  industry:            'Industry',
  stage:               'Stage',
  product_description: 'Product',
  target_customers:    'Target Customers',
  team_size:           'Team Size',
  key_differentiators: 'Key Differentiators',
  competitors:         'Competitors',
  revenue_model:       'Revenue Model',
}

function buildPreview(p: CompanyProfile): string {
  const lines = Object.entries(LABELS)
    .filter(([k]) => p[k as keyof CompanyProfile])
    .map(([k, label]) => `${label}: ${p[k as keyof CompanyProfile]}`)
  if (!lines.length) return '(no profile set — agents will work without startup context)'
  return (
    '=== YOUR STARTUP CONTEXT ===\n' +
    lines.join('\n') +
    '\n=== USE THIS CONTEXT IN EVERY RESPONSE ==='
  )
}
