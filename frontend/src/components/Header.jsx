import { Cpu } from 'lucide-react';

export default function Header({ children }) {
  return (
    <header className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      height: '56px',
      margin: '10px 12px 0 12px',
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(212,163,115,0.3), rgba(212,163,115,0.05))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(212,163,115,0.3)',
        }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--accent-primary)">
            <path d="M3 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 9l2.5 7h11L20 9l-4.5 4.5L12 6l-3.5 7.5L4 9zm-1 9v2h18v-2H3z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-main)' }}>
          Elo<span style={{ color: 'var(--accent-primary)' }}>Engine</span>
        </h1>
      </div>

      {children && <div>{children}</div>}

      {/* Engine badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600,
        background: 'rgba(212,163,115,0.08)',
        padding: '5px 12px', borderRadius: '20px',
        border: '1px solid rgba(212,163,115,0.15)',
      }}>
        <Cpu size={13} />
        <span>Stockfish 18</span>
      </div>
    </header>
  );
}
