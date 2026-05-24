import type { FindingType } from '../../types/onboarding'

const labels: Record<FindingType, string> = {
  classification_mismatch: 'Classification mismatch',
  missing_id_verification: 'No ID verification date',
  missing_rm: 'No relationship manager',
  documentation_incomplete: 'Docs incomplete',
  kyc_status_conflict: 'KYC conflict',
}

const config: Record<FindingType, { bg: string; text: string; border: string }> = {
  classification_mismatch: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  missing_id_verification: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  missing_rm: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  documentation_incomplete: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  kyc_status_conflict: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
}

export function FindingBadge({ type }: { type: FindingType }) {
  const c = config[type]
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      padding: '2px 7px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500,
      display: 'inline-block',
      whiteSpace: 'nowrap',
      marginRight: '4px',
      marginBottom: '3px',
    }}>
      {labels[type]}
    </span>
  )
}
