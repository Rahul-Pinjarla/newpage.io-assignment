import { useState, useMemo, useRef, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useData } from '../../data/DataProvider'
import type { Branch, FindingType } from '../../types/onboarding'
import { RiskBadge } from '../shared/RiskBadge'
import { StatusPill } from '../shared/StatusPill'
import { FindingBadge } from '../shared/FindingBadge'
import {
  AlertTriangle, CheckCircle, Shield, FileSearch, ClipboardList,
  ArrowUp, ArrowDown, ChevronsUpDown, ChevronDown, X,
} from 'lucide-react'
import { InfoTooltip } from '../shared/InfoTooltip'

const BRANCHES: Branch[] = ['Canary Wharf', 'Edinburgh', 'Mayfair', 'Manchester']
const BRANCH_SHORT: Record<Branch, string> = {
  'Canary Wharf': 'Canary W.',
  Edinburgh: 'Edinburgh',
  Mayfair: 'Mayfair',
  Manchester: 'Manchester',
}
const FINDING_TYPES: { value: FindingType; label: string; short: string }[] = [
  { value: 'classification_mismatch', label: 'Classification mismatch', short: 'Class. mismatch' },
  { value: 'missing_id_verification', label: 'Missing ID verification', short: 'No ID verif.' },
  { value: 'missing_rm', label: 'Missing RM', short: 'No RM' },
  { value: 'documentation_incomplete', label: 'Docs incomplete', short: 'Docs incomplete' },
  { value: 'kyc_status_conflict', label: 'KYC conflict', short: 'KYC conflict' },
]

const card: React.CSSProperties = {
  background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

type SortField = 'client_id' | 'client_name' | 'branch' | 'relationship_manager' | 'onboarding_date' | 'computed_risk' | 'risk_classification' | 'kyc_status'
type SortDir = 'asc' | 'desc'
type FilterKey = 'branch' | 'finding' | 'rm'

const RISK_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
const KYC_ORDER: Record<string, number> = { REJECTED: 0, PENDING: 1, ENHANCED_DUE_DILIGENCE: 2, APPROVED: 3 }

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown size={10} style={{ opacity: 0.3, flexShrink: 0 }} />
  return sortDir === 'asc'
    ? <ArrowUp size={10} style={{ color: '#1B2A4A', flexShrink: 0 }} />
    : <ArrowDown size={10} style={{ color: '#1B2A4A', flexShrink: 0 }} />
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11.5px' }}>
      <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: '3px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: payload[0].fill }} />
        <span style={{ color: '#6B7280' }}>Records</span>
        <span style={{ fontWeight: 700, color: '#111827', marginLeft: '4px' }}>{payload[0].value}</span>
      </div>
    </div>
  )
}

function FilterBtn({ label, open, count, onToggle }: { label: string; open: boolean; count: number; onToggle: () => void }) {
  const active = count > 0
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
        borderRadius: '6px', minHeight: '30px', cursor: 'pointer',
        border: active ? '1.5px solid #1B2A4A' : '1px solid #D1D5DB',
        background: active ? '#EEF2FF' : '#fff',
        color: active ? '#1B2A4A' : '#6B7280',
        fontSize: '12px', fontWeight: active ? 600 : 400,
      }}
    >
      {label}
      {active && (
        <span style={{ background: '#1B2A4A', color: '#fff', borderRadius: '10px', fontSize: '9px', padding: '1px 5px', fontWeight: 700, lineHeight: '14px' }}>
          {count}
        </span>
      )}
      <ChevronDown size={11} style={{ opacity: 0.45, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
    </button>
  )
}

function Popper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '170px', padding: '4px',
    }}>
      {children}
    </div>
  )
}

function PopperOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
      borderRadius: '5px', cursor: 'pointer', fontSize: '12.5px', color: '#374151',
      background: checked ? '#F0F4FF' : 'transparent',
    }}>
      <input type="checkbox" checked={checked} onChange={onChange}
        style={{ cursor: 'pointer', accentColor: '#1B2A4A', width: '13px', height: '13px', flexShrink: 0 }} />
      {label}
    </label>
  )
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      padding: '2px 5px 2px 8px', borderRadius: '999px',
      background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE',
      fontSize: '11px', fontWeight: 500,
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '1px', color: '#6366F1', lineHeight: 1 }}
      >
        <X size={9} />
      </button>
    </span>
  )
}

export function AuditView() {
  const { records } = useData()
  const [selBranches, setSelBranches] = useState<Branch[]>([])
  const [selRMs, setSelRMs] = useState<string[]>([])
  const [selFindings, setSelFindings] = useState<FindingType[]>([])
  const [showOnlyFindings, setShowOnlyFindings] = useState(false)
  const [sortField, setSortField] = useState<SortField>('onboarding_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)

  const filterBarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = <T extends string>(arr: T[], set: (v: T[]) => void, val: T) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const allRMs = useMemo(() => {
    const rms = new Set(records.map((r) => r.relationship_manager).filter(Boolean) as string[])
    return Array.from(rms).sort()
  }, [records])

  const withFindings = useMemo(() => records.filter((r) => r.findings && r.findings.length > 0), [records])
  const mismatches = useMemo(() => records.filter((r) => r.findings?.includes('classification_mismatch')), [records])

  const findingChartData = useMemo(() =>
    FINDING_TYPES.map(({ value, short }) => ({
      name: short,
      count: records.filter((r) => r.findings?.includes(value)).length,
    })).sort((a, b) => b.count - a.count), [records])

  const filtered = useMemo(() => {
    const base = records.filter((r) => {
      if (selBranches.length > 0 && !selBranches.includes(r.branch)) return false
      if (selRMs.length > 0 && (!r.relationship_manager || !selRMs.includes(r.relationship_manager))) return false
      if (selFindings.length > 0 && !selFindings.some((f) => r.findings?.includes(f))) return false
      if (showOnlyFindings && (!r.findings || r.findings.length === 0)) return false
      return true
    })
    return [...base].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'client_id': cmp = a.client_id.localeCompare(b.client_id); break
        case 'client_name': cmp = a.client_name.localeCompare(b.client_name); break
        case 'branch': cmp = a.branch.localeCompare(b.branch); break
        case 'relationship_manager': cmp = (a.relationship_manager ?? '').localeCompare(b.relationship_manager ?? ''); break
        case 'onboarding_date': cmp = a.onboarding_date.localeCompare(b.onboarding_date); break
        case 'computed_risk': cmp = (RISK_ORDER[a.computed_risk ?? ''] ?? 9) - (RISK_ORDER[b.computed_risk ?? ''] ?? 9); break
        case 'risk_classification': cmp = (RISK_ORDER[a.risk_classification] ?? 9) - (RISK_ORDER[b.risk_classification] ?? 9); break
        case 'kyc_status': cmp = (KYC_ORDER[a.kyc_status] ?? 9) - (KYC_ORDER[b.kyc_status] ?? 9); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [records, selBranches, selRMs, selFindings, showOnlyFindings, sortField, sortDir])

  const thStyle = (field: SortField): React.CSSProperties => ({
    padding: '8px 12px', textAlign: 'left', fontWeight: 600,
    color: sortField === field ? '#1B2A4A' : '#9CA3AF', fontSize: '10px',
    textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
    cursor: 'pointer', userSelect: 'none', background: '#F9FAFB',
    position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid #E5E7EB',
  })

  const COLS: { label: string; field: SortField | null; key: string; tooltip?: string }[] = [
    { label: 'ID', field: 'client_id', key: 'id' },
    { label: 'Client', field: 'client_name', key: 'name' },
    { label: 'Branch', field: 'branch', key: 'branch' },
    { label: 'RM', field: 'relationship_manager', key: 'rm' },
    { label: 'Date', field: 'onboarding_date', key: 'date' },
    { label: 'Calc', field: 'computed_risk', key: 'comp', tooltip: "Sentinel's real-time risk tier, calculated from screening data: PEP, sanctions, adverse media, jurisdiction, source of funds." },
    { label: 'Rec', field: 'risk_classification', key: 'stored', tooltip: 'Risk classification recorded at onboarding by the RM. A mismatch with Calc indicates a compliance gap requiring review.' },
    { label: 'KYC', field: 'kyc_status', key: 'kyc', tooltip: 'KYC verification status. EDD is mandatory for HIGH-risk clients before approval.' },
    { label: 'Findings', field: null, key: 'findings', tooltip: 'Compliance findings: missing data, screening gaps, KYC conflicts, classification discrepancies.' },
  ]

  const hasChips = selBranches.length > 0 || selRMs.length > 0 || selFindings.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          { value: withFindings.length, label: 'Records with findings', icon: <AlertTriangle size={16} color="#DC2626" />, iconBg: '#FEF2F2', border: '#EF4444', valColor: '#DC2626' },
          { value: mismatches.length, label: 'Classification mismatches', icon: <Shield size={16} color="#B45309" />, iconBg: '#FFFBEB', border: '#F59E0B', valColor: '#B45309' },
          { value: records.filter((r) => !r.findings || r.findings.length === 0).length, label: 'Clean records', icon: <CheckCircle size={16} color="#059669" />, iconBg: '#ECFDF5', border: '#10B981', valColor: '#059669' },
        ].map(({ value, label, icon, iconBg, border, valColor }) => (
          <div key={label} style={{ ...card, padding: '18px 20px', borderTop: `3px solid ${border}` }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              {icon}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: valColor, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
            <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '5px', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Findings breakdown chart */}
      <div style={{ ...card, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <ClipboardList size={14} color="#9CA3AF" />
          <h2 style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827', margin: 0 }}>Findings by Type</h2>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9CA3AF' }}>{withFindings.length} records affected</span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={findingChartData} layout="vertical" barSize={14} margin={{ left: 8, right: 20, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={105} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="count" name="Records" fill="#EF4444" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Filter poppers */}
            <div ref={filterBarRef} style={{ display: 'flex', gap: '6px' }}>
              {/* Branch */}
              <div style={{ position: 'relative' }}>
                <FilterBtn label="Branch" open={openFilter === 'branch'} count={selBranches.length} onToggle={() => setOpenFilter(openFilter === 'branch' ? null : 'branch')} />
                {openFilter === 'branch' && (
                  <Popper>
                    {BRANCHES.map((b) => (
                      <PopperOption key={b} label={b} checked={selBranches.includes(b)} onChange={() => toggle(selBranches, setSelBranches, b)} />
                    ))}
                  </Popper>
                )}
              </div>

              {/* Finding */}
              <div style={{ position: 'relative' }}>
                <FilterBtn label="Finding" open={openFilter === 'finding'} count={selFindings.length} onToggle={() => setOpenFilter(openFilter === 'finding' ? null : 'finding')} />
                {openFilter === 'finding' && (
                  <Popper>
                    {FINDING_TYPES.map(({ value, label }) => (
                      <PopperOption key={value} label={label} checked={selFindings.includes(value)} onChange={() => toggle(selFindings, setSelFindings, value)} />
                    ))}
                  </Popper>
                )}
              </div>

              {/* RM */}
              <div style={{ position: 'relative' }}>
                <FilterBtn label="RM" open={openFilter === 'rm'} count={selRMs.length} onToggle={() => setOpenFilter(openFilter === 'rm' ? null : 'rm')} />
                {openFilter === 'rm' && (
                  <Popper>
                    {allRMs.map((rm) => (
                      <PopperOption key={rm} label={rm} checked={selRMs.includes(rm)} onChange={() => toggle(selRMs, setSelRMs, rm)} />
                    ))}
                  </Popper>
                )}
              </div>
            </div>

            {/* Findings only checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer', userSelect: 'none', marginLeft: '4px' }}>
              <input type="checkbox" checked={showOnlyFindings} onChange={(e) => setShowOnlyFindings(e.target.checked)} style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: '#1B2A4A' }} />
              Findings only
            </label>

            <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              {filtered.length} records
            </span>
          </div>

          {/* Applied chips */}
          {hasChips && (
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '7px' }}>
              {selBranches.map((b) => (
                <ActiveChip key={b} label={BRANCH_SHORT[b]} onRemove={() => setSelBranches(selBranches.filter((x) => x !== b))} />
              ))}
              {selFindings.map((f) => {
                const ft = FINDING_TYPES.find((t) => t.value === f)
                return ft ? <ActiveChip key={f} label={ft.short} onRemove={() => setSelFindings(selFindings.filter((x) => x !== f))} /> : null
              })}
              {selRMs.map((rm) => (
                <ActiveChip key={rm} label={rm} onRemove={() => setSelRMs(selRMs.filter((x) => x !== rm))} />
              ))}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {COLS.map(({ label, field, key, tooltip }) => (
                  <th
                    key={key}
                    onClick={() => field && handleSort(field)}
                    style={{ ...thStyle(field as SortField), cursor: field ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {label}
                      {field && <SortIcon field={field} sortField={sortField} sortDir={sortDir} />}
                      {tooltip && <InfoTooltip text={tooltip} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const hasFindings = r.findings && r.findings.length > 0
                const hasMismatch = r.findings?.includes('classification_mismatch')
                return (
                  <tr
                    key={r.client_id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                      background: hasMismatch ? '#FFF8F8' : hasFindings ? '#FFFEF5' : '#fff',
                      borderLeft: hasMismatch ? '3px solid #EF4444' : hasFindings ? '3px solid #F59E0B' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (!hasMismatch && !hasFindings) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = hasMismatch ? '#FFF8F8' : hasFindings ? '#FFFEF5' : '#fff' }}
                  >
                    <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: '10.5px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{r.client_id}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', fontSize: '12.5px' }}>{r.client_name}</td>
                    <td style={{ padding: '8px 12px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: '12px' }}>{r.branch}</td>
                    <td style={{ padding: '8px 12px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {r.relationship_manager ?? <span style={{ color: '#DC2626', fontWeight: 500 }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF', whiteSpace: 'nowrap', fontSize: '11px' }}>{r.onboarding_date}</td>
                    <td style={{ padding: '8px 12px' }}>{r.computed_risk && <RiskBadge tier={r.computed_risk} compact />}</td>
                    <td style={{ padding: '8px 12px' }}><RiskBadge tier={r.risk_classification} compact /></td>
                    <td style={{ padding: '8px 12px' }}><StatusPill status={r.kyc_status} compact /></td>
                    <td style={{ padding: '8px 12px', maxWidth: '260px' }}>
                      {r.findings && r.findings.length > 0
                        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>{r.findings.map((f) => <FindingBadge key={f} type={f} />)}</div>
                        : <span style={{ color: '#059669', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}><CheckCircle size={12} /> Clean</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
              <FileSearch size={22} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
              No records match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
