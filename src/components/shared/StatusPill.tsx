import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Clock, XCircle, ShieldAlert } from 'lucide-react'
import type { KycStatus } from '../../types/onboarding'

const config: Record<KycStatus, { bg: string; text: string }> = {
  APPROVED: { bg: '#ECFDF5', text: '#059669' },
  PENDING: { bg: '#FFFBEB', text: '#B45309' },
  REJECTED: { bg: '#FEF2F2', text: '#DC2626' },
  ENHANCED_DUE_DILIGENCE: { bg: '#EEF2FF', text: '#4F46E5' },
}

const labels: Record<KycStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  ENHANCED_DUE_DILIGENCE: 'EDD',
}

const fullLabels: Record<KycStatus, string> = {
  APPROVED: 'KYC Approved',
  PENDING: 'KYC Pending',
  REJECTED: 'KYC Rejected',
  ENHANCED_DUE_DILIGENCE: 'Enhanced Due Diligence',
}

const icons: Record<KycStatus, React.ReactNode> = {
  APPROVED: <CheckCircle2 size={15} color="#059669" />,
  PENDING: <Clock size={15} color="#B45309" />,
  REJECTED: <XCircle size={15} color="#DC2626" />,
  ENHANCED_DUE_DILIGENCE: <ShieldAlert size={15} color="#4F46E5" />,
}

export function StatusPill({ status, compact }: { status: KycStatus; compact?: boolean }) {
  const c = config[status]
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  if (compact) {
    return (
      <span
        ref={ref}
        style={{ display: 'inline-flex', cursor: 'default' }}
        onMouseEnter={() => ref.current && setRect(ref.current.getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
      >
        {icons[status]}
        {rect && createPortal(
          <div style={{
            position: 'fixed', left: rect.left + rect.width / 2, top: rect.top - 6,
            transform: 'translate(-50%, -100%)', background: '#1E293B', color: '#F1F5F9',
            fontSize: '11px', fontWeight: 500, padding: '4px 8px', borderRadius: '5px',
            zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {fullLabels[status]}
          </div>,
          document.body
        )}
      </span>
    )
  }

  return (
    <span style={{
      background: c.bg, color: c.text, padding: '2px 9px', borderRadius: '999px',
      fontSize: '11.5px', fontWeight: 600, display: 'inline-block',
      whiteSpace: 'nowrap', letterSpacing: '0.01em',
    }}>
      {labels[status]}
    </span>
  )
}
