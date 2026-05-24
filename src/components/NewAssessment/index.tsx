import { useState, useEffect, useRef } from 'react'
import { useData } from '../../data/DataProvider'
import { evaluate } from '../../rules/riskEngine'
import type { ClientRecord, Branch, ClientType, KycStatus, SourceOfFunds } from '../../types/onboarding'
import { RiskBadge } from '../shared/RiskBadge'
import { CheckCircle2, AlertTriangle, Clock, ChevronRight, ChevronLeft, Play } from 'lucide-react'

const BRANCHES: Branch[] = ['Canary Wharf', 'Edinburgh', 'Mayfair', 'Manchester']
const RMS = ['R. Patel', 'M. Ferrara', 'S. Beaumont', 'A. Kovacs', 'J. Morrison', 'T. Nakamura', 'L. Okonkwo', 'H. Lindqvist']
const SOURCES: SourceOfFunds[] = ['Employment', 'Business Income', 'Investment Returns', 'Inheritance', 'Property Sale', 'Pension', 'Gift', 'Other']

// Ordered: HIGH-risk first, then MEDIUM-risk, then alphabetical rest — canonical casing must match sentinelRules.ts
const COUNTRIES = [
  'Russia', 'Belarus', 'Venezuela',
  'Brazil', 'Turkey', 'South Africa', 'Mexico', 'UAE', 'China',
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belgium', 'Bosnia and Herzegovina',
  'Botswana', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'Colombia', 'Croatia',
  'Cyprus', 'Czech Republic', 'Denmark', 'Ecuador', 'Egypt', 'Estonia',
  'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece',
  'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kosovo', 'Kuwait', 'Latvia', 'Lebanon', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Malaysia', 'Malta', 'Mauritius', 'Moldova',
  'Monaco', 'Morocco', 'Myanmar', 'Netherlands', 'New Zealand', 'Nigeria',
  'North Korea', 'Norway', 'Oman', 'Pakistan', 'Panama', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'Somalia', 'Spain',
  'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vietnam',
  'Yemen', 'Zimbabwe',
]

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  padding: '28px',
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
  letterSpacing: '0.01em',
}

const fieldInput: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '7px',
  border: '1px solid #D1D5DB',
  fontSize: '14px',
  color: '#111827',
  boxSizing: 'border-box',
  minHeight: '42px',
  background: '#fff',
  transition: 'border-color 0.15s',
}

function generateId(): string {
  const num = Math.floor(Math.random() * 900) + 100
  return `CLT-N${num}`
}

const emptyForm = {
  client_name: '',
  client_type: 'INDIVIDUAL' as ClientType,
  branch: 'Canary Wharf' as Branch,
  relationship_manager: '',
  country_of_tax_residence: '',
  annual_income: '',
  source_of_funds: 'Employment' as SourceOfFunds,
  pep_status: false,
  sanctions_screening_match: false,
  adverse_media_flag: false,
  id_verification_date: '',
  kyc_status: 'PENDING' as KycStatus,
  documentation_complete: false,
}

const stepLabels = ['Client Details', 'Screening', 'Review & Submit']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
      {stepLabels.map((label, i) => {
        const num = i + 1
        const done = step > num
        const active = step === num
        return (
          <div key={num} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#059669' : active ? '#111827' : '#E5E7EB',
                transition: 'background 0.2s',
              }}>
                {done
                  ? <CheckCircle2 size={16} color="#fff" />
                  : <span style={{ fontSize: '12px', fontWeight: 700, color: active ? '#fff' : '#9CA3AF' }}>{num}</span>
                }
              </div>
              <span style={{ fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? '#111827' : done ? '#059669' : '#9CA3AF', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: '2px', background: done ? '#059669' : '#E5E7EB', margin: '0 12px', transition: 'background 0.2s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <div
      id={id}
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? '#6366F1' : '#E5E7EB',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </div>
  )
}

export function NewAssessment() {
  const { addRecord } = useData()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState('')
  const [started, setStarted] = useState(false)
  const startTimeRef = useRef<number>(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!started) return
    startTimeRef.current = Date.now()
    setElapsed(0)
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [started])

  const preview = evaluate({
    ...form,
    annual_income: Number(form.annual_income) || 0,
    client_id: '',
    onboarding_date: '',
    risk_classification: 'LOW',
    id_verification_date: form.id_verification_date || null,
    relationship_manager: form.relationship_manager || null,
  } as ClientRecord)

  const handleSubmit = () => {
    const id = generateId()
    const record: ClientRecord = {
      client_id: id,
      branch: form.branch,
      onboarding_date: new Date().toISOString().slice(0, 10),
      client_name: form.client_name,
      client_type: form.client_type,
      country_of_tax_residence: form.country_of_tax_residence,
      annual_income: Number(form.annual_income) || 0,
      source_of_funds: form.source_of_funds,
      pep_status: form.pep_status,
      sanctions_screening_match: form.sanctions_screening_match,
      adverse_media_flag: form.adverse_media_flag,
      risk_classification: preview.tier,
      kyc_status: form.kyc_status,
      id_verification_date: form.id_verification_date || null,
      relationship_manager: form.relationship_manager || null,
      documentation_complete: form.documentation_complete,
    }
    addRecord(record)
    setSubmittedId(id)
    setSubmitted(true)
  }

  const reset = () => {
    setForm(emptyForm)
    setStep(1)
    setSubmitted(false)
    setSubmittedId('')
    setStarted(false)
    setElapsed(0)
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ ...card, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={28} color="#059669" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Assessment Submitted</h2>
          <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', color: '#111827', fontWeight: 600 }}>{submittedId}</span> — saved to records
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
            <RiskBadge tier={preview.tier} />
            <span style={{ fontSize: '13px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={13} /> {elapsed}s
            </span>
          </div>
          {elapsed <= 90 && (
            <div style={{ fontSize: '12px', color: '#059669', background: '#F0FDF4', padding: '8px 14px', borderRadius: '6px', marginBottom: '20px', fontWeight: 500 }}>
              Completed within 90-second target ✓
            </div>
          )}
          <button onClick={reset} style={{ padding: '10px 24px', background: '#1B2A4A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '44px' }}>
            New Assessment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ ...card, position: 'relative' }}>

        {/* Start overlay — covers form until RM clicks Start */}
        {!started && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '8px', zIndex: 10,
            background: 'rgba(17, 24, 39, 0.72)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} color="rgba(255,255,255,0.75)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>New Client Assessment</div>
              <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', maxWidth: '240px', lineHeight: 1.5 }}>
                The 90-second intake timer starts when you click below.
              </div>
            </div>
            <button
              onClick={() => setStarted(true)}
              style={{
                marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '11px 28px', background: '#fff', color: '#1B2A4A',
                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', minHeight: '44px', letterSpacing: '0.01em',
              }}
            >
              <Play size={15} style={{ fill: '#1B2A4A' }} /> Start Assessment
            </button>
          </div>
        )}

        {/* Timer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: elapsed > 90 ? '#DC2626' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: elapsed > 90 ? 600 : 400 }}>
            <Clock size={12} />
            {elapsed}s {elapsed > 90 ? '— over 90s target' : '/ 90s target'}
          </span>
        </div>

        <StepIndicator step={step} />

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Client Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="Full Name *">
                <input style={fieldInput} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="e.g. Sarah Williams" />
              </Field>
              <Field label="Client Type *">
                <select style={fieldInput} value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value as ClientType })}>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ENTITY">Entity</option>
                </select>
              </Field>
              <Field label="Branch *">
                <select style={fieldInput} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value as Branch })}>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Relationship Manager *">
                <select style={fieldInput} value={form.relationship_manager} onChange={(e) => setForm({ ...form, relationship_manager: e.target.value })}>
                  <option value="">Select RM…</option>
                  {RMS.map((rm) => <option key={rm} value={rm}>{rm}</option>)}
                </select>
              </Field>
              <Field label="Country of Tax Residence *">
                <input
                  style={fieldInput}
                  list="country-list"
                  value={form.country_of_tax_residence}
                  onChange={(e) => setForm({ ...form, country_of_tax_residence: e.target.value })}
                  placeholder="e.g. United Kingdom"
                  autoComplete="off"
                />
                <datalist id="country-list">
                  {COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Annual Income (£) *">
                <input style={fieldInput} type="number" value={form.annual_income} onChange={(e) => setForm({ ...form, annual_income: e.target.value })} placeholder="e.g. 150000" />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Source of Funds *">
                  <select style={fieldInput} value={form.source_of_funds} onChange={(e) => setForm({ ...form, source_of_funds: e.target.value as SourceOfFunds })}>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #F3F4F6', marginTop: '4px' }}>
              <button
                onClick={() => setStep(2)}
                disabled={!form.client_name || !form.country_of_tax_residence || !form.relationship_manager}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: !form.client_name || !form.country_of_tax_residence || !form.relationship_manager ? '#E5E7EB' : '#1B2A4A', color: !form.client_name || !form.country_of_tax_residence || !form.relationship_manager ? '#9CA3AF' : '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '44px' }}
              >
                Screening <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Screening</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px' }}>Complete all regulatory screening checks before proceeding.</p>

            {/* Screening flags as toggle rows */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
              {[
                { key: 'pep_status', label: 'Politically Exposed Person (PEP)', desc: 'Client is or has been entrusted with a prominent public function', alert: true },
                { key: 'sanctions_screening_match', label: 'Sanctions Screening Match', desc: 'Matched against HMT / OFSI consolidated sanctions list', alert: true },
                { key: 'adverse_media_flag', label: 'Adverse Media Flag', desc: 'Flagged by negative news or adverse media screening', alert: true },
                { key: 'documentation_complete', label: 'Documentation Complete', desc: 'All required compliance documents collected and verified', alert: false },
              ].map(({ key, label, desc, alert }, i) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderBottom: i < 3 ? '1px solid #E5E7EB' : 'none', background: alert && form[key as keyof typeof form] ? '#FFF9F9' : '#fff' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#111827' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{desc}</div>
                  </div>
                  <Toggle
                    id={key}
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(v) => setForm({ ...form, [key]: v })}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="ID Verification Date">
                <input style={fieldInput} type="date" value={form.id_verification_date} onChange={(e) => setForm({ ...form, id_verification_date: e.target.value })} />
              </Field>
              <Field label="KYC Status *">
                <select style={fieldInput} value={form.kyc_status} onChange={(e) => setForm({ ...form, kyc_status: e.target.value as KycStatus })}>
                  <option value="PENDING">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ENHANCED_DUE_DILIGENCE">Enhanced Due Diligence</option>
                </select>
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #F3F4F6', marginTop: '4px' }}>
              <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', minHeight: '44px' }}>
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#1B2A4A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '44px' }}>
                Review <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Review & Submit</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px' }}>Confirm all details before saving the compliance record.</p>

            {/* Live risk result */}
            <div style={{
              background: preview.tier === 'HIGH' ? '#FEF2F2' : preview.tier === 'MEDIUM' ? '#FFFBEB' : '#F0FDF4',
              border: `1px solid ${preview.tier === 'HIGH' ? '#FECACA' : preview.tier === 'MEDIUM' ? '#FDE68A' : '#BBF7D0'}`,
              borderLeft: `4px solid ${preview.tier === 'HIGH' ? '#DC2626' : preview.tier === 'MEDIUM' ? '#F59E0B' : '#059669'}`,
              borderRadius: '8px', padding: '16px 18px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: preview.reasons.length > 0 ? '10px' : 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Computed Risk Classification</span>
                <RiskBadge tier={preview.tier} />
              </div>
              {preview.reasons.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                  {preview.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#059669' }}>No HIGH or MEDIUM risk triggers detected.</p>
              )}
            </div>

            {/* EDD advisory */}
            {preview.tier === 'HIGH' && form.kyc_status === 'APPROVED' && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '13px', color: '#92400E' }}>
                  <strong>Advisory:</strong> HIGH-risk clients require Enhanced Due Diligence. Consider changing KYC status to ENHANCED_DUE_DILIGENCE before submission.
                </div>
              </div>
            )}

            {/* Summary grid */}
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
              {[
                ['Client', form.client_name],
                ['Type', form.client_type],
                ['Branch', form.branch],
                ['Relationship Manager', form.relationship_manager || '—'],
                ['Country of Tax Residence', form.country_of_tax_residence],
                ['Annual Income', form.annual_income ? `£${Number(form.annual_income).toLocaleString()}` : '—'],
                ['Source of Funds', form.source_of_funds],
                ['KYC Status', form.kyc_status.replace(/_/g, ' ')],
                ['PEP Status', form.pep_status ? 'YES — Politically Exposed Person' : 'No'],
                ['Sanctions Match', form.sanctions_screening_match ? 'YES — Match found' : 'No'],
                ['Adverse Media', form.adverse_media_flag ? 'YES — Flagged' : 'No'],
                ['ID Verification Date', form.id_verification_date || 'Not recorded'],
              ].map(([k, v], i) => {
                const isAlert = (k === 'PEP Status' || k === 'Sanctions Match' || k === 'Adverse Media') && v.toString().startsWith('YES')
                return (
                  <div key={k} style={{ display: 'flex', borderBottom: i < 11 ? '1px solid #F3F4F6' : 'none', background: isAlert ? '#FFF9F9' : 'transparent' }}>
                    <div style={{ width: '180px', flexShrink: 0, padding: '10px 14px', fontSize: '12.5px', fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderRight: '1px solid #F3F4F6' }}>{k}</div>
                    <div style={{ padding: '10px 14px', fontSize: '13.5px', color: isAlert ? '#DC2626' : '#111827', fontWeight: isAlert ? 600 : 400 }}>{v}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', minHeight: '44px' }}>
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px', background: '#1B2A4A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '44px' }}>
                Submit Assessment <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
