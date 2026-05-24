import { useState } from 'react'
import { DataProvider, useData } from './data/DataProvider'
import { Dashboard } from './components/Dashboard'
import { NewAssessment } from './components/NewAssessment'
import { AuditView } from './components/AuditView'
import { LayoutDashboard, FilePlus, ClipboardList } from 'lucide-react'

type View = 'dashboard' | 'new-assessment' | 'audit'

const navItems: { id: View; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'new-assessment', label: 'New Assessment', short: 'New Asmt', icon: <FilePlus size={18} /> },
  { id: 'audit', label: 'Audit View', short: 'Audit', icon: <ClipboardList size={18} /> },
]

function AppContent() {
  const [view, setView] = useState<View>('dashboard')
  const { isLoading, error } = useData()

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F9FA', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', color: '#111827' }}>
      {/* Sidebar — always collapsed, icon + label below */}
      <aside style={{ width: '68px', background: '#1B2A4A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Brand mark */}
        <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>HCP</span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 4px' }}>
          {navItems.map(({ id, short, icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                width: '100%', padding: '10px 4px', border: 'none', cursor: 'pointer',
                background: view === id ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderRadius: '6px', minHeight: '52px', marginBottom: '2px',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ display: 'flex', opacity: view === id ? 1 : 0.5, color: '#fff' }}>{icon}</span>
              <span style={{
                fontSize: '10px', fontWeight: view === id ? 600 : 400, lineHeight: 1,
                color: view === id ? '#fff' : 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
              }}>
                {short}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
              {navItems.find((n) => n.id === view)?.label}
            </h1>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {error && (
              <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 500 }}>
                CSV error: {error}
              </div>
            )}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700 }}>
              RM
            </div>
          </div>
        </header>

        {/* Content — overflow hidden; each view manages its own scroll */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '18px 22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9CA3AF', fontSize: '14px', gap: '10px' }}>
              <div style={{ width: '18px', height: '18px', border: '2px solid #E5E7EB', borderTopColor: '#1B2A4A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Loading onboarding records…
            </div>
          ) : (
            <>
              {view === 'dashboard' && <Dashboard />}
              {view === 'new-assessment' && (
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <NewAssessment />
                </div>
              )}
              {view === 'audit' && (
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <AuditView />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select, input, button { font-family: inherit; }
        select:focus, input:not([type="checkbox"]):not([type="date"]):focus { outline: 2px solid #3D5A80; outline-offset: 1px; }
        svg:focus, svg *:focus { outline: none; }
        button:hover { opacity: 0.88; }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}
