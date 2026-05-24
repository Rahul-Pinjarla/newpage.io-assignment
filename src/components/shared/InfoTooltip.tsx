import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

export function InfoTooltip({ text }: { text: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span
      ref={ref}
      style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, cursor: 'help' }}
      onMouseEnter={() => ref.current && setRect(ref.current.getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
    >
      <Info size={11} style={{ color: '#CBD5E1' }} />
      {rect && createPortal(
        <div style={{
          position: 'fixed',
          left: rect.left + rect.width / 2,
          top: rect.top - 8,
          transform: 'translate(-50%, -100%)',
          background: '#1E293B',
          color: '#F1F5F9',
          fontSize: '12px',
          fontWeight: 400,
          lineHeight: 1.5,
          padding: '7px 11px',
          borderRadius: '7px',
          maxWidth: '240px',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          textAlign: 'left',
          whiteSpace: 'normal',
          textTransform: 'none',
          letterSpacing: 'normal',
        }}>
          {text}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            transform: 'translateX(-50%)',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: '#1E293B transparent transparent transparent',
          }} />
        </div>,
        document.body
      )}
    </span>
  )
}
