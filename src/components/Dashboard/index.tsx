import { useState, useMemo, useRef, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useData } from '../../data/DataProvider'
import type { Branch, RiskTier } from '../../types/onboarding'
import { RiskBadge } from '../shared/RiskBadge'
import { StatusPill } from '../shared/StatusPill'
import {
  AlertTriangle, Search, ShieldCheck, TrendingUp,
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
const RISK_TIERS: RiskTier[] = ['HIGH', 'MEDIUM', 'LOW']
const KYC_STATUSES = ['APPROVED', 'PENDING', 'REJECTED', 'ENHANCED_DUE_DILIGENCE']
const KYC_LABELS: Record<string, string> = {
  APPROVED: 'Approved', PENDING: 'Pending', REJECTED: 'Rejected', ENHANCED_DUE_DILIGENCE: 'EDD',
}

const RISK_COLORS = { HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981' }

const card: React.CSSProperties = {
  background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

type SortField = 'client_id' | 'client_name' | 'branch' | 'onboarding_date' | 'computed_risk' | 'risk_classification' | 'kyc_status'
type SortDir = 'asc' | 'desc'
type FilterKey = 'branch' | 'risk' | 'kyc' // used for openFilter state

const RISK_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
const KYC_ORDER: Record<string, number> = { REJECTED: 0, PENDING: 1, ENHANCED_DUE_DILIGENCE: 2, APPROVED: 3 }

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown size={10} style={{ opacity: 0.3, flexShrink: 0 }} />
  return sortDir === 'asc'
    ? <ArrowUp size={10} style={{ color: '#1B2A4A', flexShrink: 0 }} />
    : <ArrowDown size={10} style={{ color: '#1B2A4A', flexShrink: 0 }} />
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11.5px' }}>
      <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: p.fill }} />
          <span style={{ color: '#6B7280' }}>{p.name}</span>
          <span style={{ fontWeight: 600, color: '#111827', marginLeft: 'auto', paddingLeft: '10px' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '6px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11.5px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.payload.color }} />
        <span style={{ color: '#6B7280' }}>{p.name}</span>
        <span style={{ fontWeight: 700, color: '#111827', marginLeft: '3px' }}>{p.value}</span>
      </div>
    </div>
  )
}

function FilterBtn({
  label, open, onToggle, count,
}: { label: string; open: boolean; onToggle: () => void; count: number }) {
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
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '160px', padding: '4px',
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

export function Dashboard() {
  const { records } = useData()
  const [search, setSearch] = useState('')
  const [selBranches, setSelBranches] = useState<Branch[]>([])
  const [selRisks, setSelRisks] = useState<RiskTier[]>([])
  const [selStatuses, setSelStatuses] = useState<string[]>([])
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

  const kpi = useMemo(() => ({
    total: records.length,
    high: records.filter((r) => r.computed_risk === 'HIGH').length,
    medium: records.filter((r) => r.computed_risk === 'MEDIUM').length,
    low: records.filter((r) => r.computed_risk === 'LOW').length,
    pending: records.filter((r) => r.kyc_status === 'PENDING').length,
  }), [records])

  const mismatches = useMemo(() =>
    records.filter((r) => r.findings?.includes('classification_mismatch')), [records])

  const branchChartData = useMemo(() =>
    BRANCHES.map((b) => {
      const br = records.filter((r) => r.branch === b)
      return {
        name: BRANCH_SHORT[b],
        HIGH: br.filter((r) => r.computed_risk === 'HIGH').length,
        MEDIUM: br.filter((r) => r.computed_risk === 'MEDIUM').length,
        LOW: br.filter((r) => r.computed_risk === 'LOW').length,
      }
    }), [records])

  const riskDistData = useMemo(() => [
    { name: 'HIGH', value: kpi.high, color: RISK_COLORS.HIGH },
    { name: 'MEDIUM', value: kpi.medium, color: RISK_COLORS.MEDIUM },
    { name: 'LOW', value: kpi.low, color: RISK_COLORS.LOW },
  ], [kpi])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const base = records.filter((r) => {
      if (q && !r.client_name.toLowerCase().includes(q) && !r.client_id.toLowerCase().includes(q)) return false
      if (selBranches.length > 0 && !selBranches.includes(r.branch)) return false
      if (selRisks.length > 0 && r.computed_risk && !selRisks.includes(r.computed_risk)) return false
      if (selStatuses.length > 0 && !selStatuses.includes(r.kyc_status)) return false
      return true
    })
    return [...base].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'client_id': cmp = a.client_id.localeCompare(b.client_id); break
        case 'client_name': cmp = a.client_name.localeCompare(b.client_name); break
        case 'branch': cmp = a.branch.localeCompare(b.branch); break
        case 'onboarding_date': cmp = a.onboarding_date.localeCompare(b.onboarding_date); break
        case 'computed_risk': cmp = (RISK_ORDER[a.computed_risk ?? ''] ?? 9) - (RISK_ORDER[b.computed_risk ?? ''] ?? 9); break
        case 'risk_classification': cmp = (RISK_ORDER[a.risk_classification] ?? 9) - (RISK_ORDER[b.risk_classification] ?? 9); break
        case 'kyc_status': cmp = (KYC_ORDER[a.kyc_status] ?? 9) - (KYC_ORDER[b.kyc_status] ?? 9); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [records, search, selBranches, selRisks, selStatuses, sortField, sortDir])

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
    { label: 'Date', field: 'onboarding_date', key: 'date' },
    { label: 'Computed', field: 'computed_risk', key: 'comp', tooltip: "Sentinel's computed risk tier from screening data: PEP, sanctions, adverse media, jurisdiction, source of funds." },
    { label: 'Stored', field: 'risk_classification', key: 'stored', tooltip: 'Risk classification recorded at onboarding. Mismatch with Computed requires compliance review.' },
    { label: 'KYC', field: 'kyc_status', key: 'kyc', tooltip: 'KYC verification status. EDD is mandatory for HIGH-risk clients before approval.' },
    { label: '!', field: null, key: 'alert', tooltip: 'Classification mismatch — stored tier contradicts computed screening result.' },
  ]

  const hasChips = selBranches.length > 0 || selRisks.length > 0 || selStatuses.length > 0

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* KPI row — compact, no icon badge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', flexShrink: 0 }}>
        {[
          { label: 'Total Clients', value: kpi.total, border: '#C7D2FE', valColor: '#111827', sub: null },
          { label: 'HIGH Risk', value: kpi.high, border: '#EF4444', valColor: '#DC2626', sub: mismatches.length > 0 ? `${mismatches.length} mismatch${mismatches.length > 1 ? 'es' : ''}` : null },
          { label: 'MEDIUM Risk', value: kpi.medium, border: '#F59E0B', valColor: '#B45309', sub: null },
          { label: 'LOW Risk', value: kpi.low, border: '#10B981', valColor: '#059669', sub: null },
          { label: 'Pending KYC', value: kpi.pending, border: '#E5E7EB', valColor: '#111827', sub: null },
        ].map(({ label, value, border, valColor, sub }) => (
          <div key={label} style={{ ...card, padding: '12px 14px', borderTop: `3px solid ${border}` }}>
            <div style={{ fontSize: '26px', fontWeight: 700, color: valColor, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', fontWeight: 500 }}>{label}</div>
            {sub && (
              <div style={{ fontSize: '10px', color: '#DC2626', marginTop: '3px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <AlertTriangle size={9} /> {sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', flexShrink: 0, height: '186px' }}>
        {/* Branch bar chart */}
        <div style={{ ...card, padding: '14px 18px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexShrink: 0 }}>
            <TrendingUp size={13} color="#9CA3AF" />
            <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#111827', margin: 0 }}>Risk by Branch</h2>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChartData} barSize={9} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} width={18} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="HIGH" name="HIGH" fill={RISK_COLORS.HIGH} radius={[2, 2, 0, 0]} />
                <Bar dataKey="MEDIUM" name="MEDIUM" fill={RISK_COLORS.MEDIUM} radius={[2, 2, 0, 0]} />
                <Bar dataKey="LOW" name="LOW" fill={RISK_COLORS.LOW} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '4px', flexShrink: 0 }}>
            {(Object.entries(RISK_COLORS) as [string, string][]).map(([tier, color]) => (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#6B7280' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: color }} />{tier}
              </div>
            ))}
          </div>
        </div>

        {/* Risk distribution donut */}
        <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexShrink: 0 }}>
            <ShieldCheck size={13} color="#9CA3AF" />
            <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#111827', margin: 0 }}>Distribution</h2>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', minHeight: 0 }}>
            <div style={{ flexShrink: 0, width: '100px', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {riskDistData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
              {riskDistData.map(({ name, value, color }) => {
                const pct = kpi.total > 0 ? Math.round((value / kpi.total) * 100) : 0
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: '#6B7280', flex: 1 }}>{name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{value}</span>
                    <span style={{ fontSize: '10px', color: '#9CA3AF', width: '26px', textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Table — fills remaining height */}
      <div style={{ ...card, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Search name or ID…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '4px 10px 4px 26px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px', color: '#111827', background: '#fff', minHeight: '30px' }}
              />
            </div>

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

              {/* Risk */}
              <div style={{ position: 'relative' }}>
                <FilterBtn label="Risk" open={openFilter === 'risk'} count={selRisks.length} onToggle={() => setOpenFilter(openFilter === 'risk' ? null : 'risk')} />
                {openFilter === 'risk' && (
                  <Popper>
                    {RISK_TIERS.map((t) => (
                      <PopperOption key={t} label={t} checked={selRisks.includes(t)} onChange={() => toggle(selRisks, setSelRisks, t)} />
                    ))}
                  </Popper>
                )}
              </div>

              {/* KYC */}
              <div style={{ position: 'relative' }}>
                <FilterBtn label="KYC Status" open={openFilter === 'kyc'} count={selStatuses.length} onToggle={() => setOpenFilter(openFilter === 'kyc' ? null : 'kyc')} />
                {openFilter === 'kyc' && (
                  <Popper>
                    {KYC_STATUSES.map((s) => (
                      <PopperOption key={s} label={KYC_LABELS[s]} checked={selStatuses.includes(s)} onChange={() => toggle(selStatuses, setSelStatuses, s)} />
                    ))}
                  </Popper>
                )}
              </div>
            </div>

            <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              {filtered.length} of {records.length}
            </span>
          </div>

          {/* Applied chips */}
          {hasChips && (
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '7px' }}>
              {selBranches.map((b) => (
                <ActiveChip key={b} label={BRANCH_SHORT[b]} onRemove={() => setSelBranches(selBranches.filter((x) => x !== b))} />
              ))}
              {selRisks.map((t) => (
                <ActiveChip key={t} label={t} onRemove={() => setSelRisks(selRisks.filter((x) => x !== t))} />
              ))}
              {selStatuses.map((s) => (
                <ActiveChip key={s} label={KYC_LABELS[s]} onRemove={() => setSelStatuses(selStatuses.filter((x) => x !== s))} />
              ))}
            </div>
          )}
        </div>

        {/* Scrollable table body with sticky header */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
                const hasMismatch = r.findings?.includes('classification_mismatch')
                return (
                  <tr
                    key={r.client_id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                      background: hasMismatch ? '#FFF8F8' : '#fff',
                      borderLeft: hasMismatch ? '3px solid #EF4444' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (!hasMismatch) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = hasMismatch ? '#FFF8F8' : '#fff' }}
                  >
                    <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: '10.5px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{r.client_id}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', fontSize: '12.5px' }}>{r.client_name}</td>
                    <td style={{ padding: '8px 12px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: '12px' }}>{r.branch}</td>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF', whiteSpace: 'nowrap', fontSize: '11px' }}>{r.onboarding_date}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {r.computed_risk && <RiskBadge tier={r.computed_risk} compact />}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <RiskBadge tier={r.risk_classification} compact />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <StatusPill status={r.kyc_status} compact />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {hasMismatch && <AlertTriangle size={13} color="#DC2626" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
              <Search size={22} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
              No records match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
