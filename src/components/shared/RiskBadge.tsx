import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ShieldAlert, Shield, ShieldCheck } from 'lucide-react'
import type { RiskTier } from '../../types/onboarding'

const config: Record<RiskTier, { bg: string; text: string; border: string; dot: string }> = {
  HIGH: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  MEDIUM: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
  LOW: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' },
}

const icons: Record<RiskTier, React.ReactNode> = {
  HIGH: <ShieldAlert size={15} color="#DC2626" />,
  MEDIUM: <Shield size={15} color="#B45309" />,
  LOW: <ShieldCheck size={15} color="#059669" />,
}

const labels: Record<RiskTier, string> = {
  HIGH: 'HIGH Risk',
  MEDIUM: 'MEDIUM Risk',
  LOW: 'LOW Risk',
}

export function RiskBadge({ tier, compact }: { tier: RiskTier; compact?: boolean }) {
  const c = config[tier]
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pinned, setPinned] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const pinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pin = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect())
    setPinned(true)
    if (pinTimer.current) clearTimeout(pinTimer.current)
    pinTimer.current = setTimeout(() => {
      setPinned(false)
      setRect(null)
    }, 2000)
  }

  if (compact) {
    return (
      <span
        ref={ref}
        style={{ display: 'inline-flex', cursor: 'default' }}
        onMouseEnter={() => ref.current && setRect(ref.current.getBoundingClientRect())}
        onMouseLeave={() => { if (!pinned) setRect(null) }}
        onClick={(e) => { e.stopPropagation(); pin() }}
      >
        {icons[tier]}
        {rect && createPortal(
          <div style={{
            position: 'fixed', left: rect.left + rect.width / 2, top: rect.top - 6,
            transform: 'translate(-50%, -100%)', background: '#1E293B', color: '#F1F5F9',
            fontSize: '11px', fontWeight: 500, padding: '4px 8px', borderRadius: '5px',
            zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {labels[tier]}
          </div>,
          document.body
        )}
      </span>
    )
  }

  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '2px 8px', borderRadius: '5px', fontSize: '11.5px', fontWeight: 600,
      letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {tier}
    </span>
  )
}
