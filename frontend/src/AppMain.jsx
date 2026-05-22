import { useEffect, useState } from 'react';
import { useChessEngine } from '../../engine/useChessEngine.js';
import Header from './components/HeaderV2.jsx';
import BoardSection from './components/BoardSectionV2.jsx';
import AnalysisPanel from './components/AnalysisPanelV2.jsx';
import { Menu, Play, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function AppMain() {
  const engine = useChessEngine();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState('review');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="app-shell mobile-shell">
        <header className="mobile-top-bar">
          <div className="mobile-brand">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="mobile-logo">
              <path d="M12 2.75a2.35 2.35 0 0 1 2.35 2.35c0 .54-.18 1.02-.47 1.43h2.18c.7 0 1.26.56 1.26 1.26 0 .34-.13.65-.35.88l-1.62 1.67 2.4 6.48a1.2 1.2 0 0 1-1.13 1.62H7.38a1.2 1.2 0 0 1-1.13-1.62l2.4-6.48-1.62-1.67a1.25 1.25 0 0 1 .9-2.14h2.18a2.3 2.3 0 0 1-.46-1.43A2.35 2.35 0 0 1 12 2.75Zm-2.37 7.01 1.49 4.1h1.9l1.41-4.1H9.63Zm-1.3 6.43h7.34l-.41-1.16h-6.5l-.43 1.16Z" />
            </svg>
            <span className="mobile-title">Elo Engine</span>
          </div>
          <div className="mobile-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {engine.analysing && (
              <span className="mobile-analysis-badge">
                <span className="pulse-dot" />
                Analyzing
              </span>
            )}
            <button
              onClick={() => setSidebarOpen(true)}
              className="sidebar-icon-btn mobile-hamburger-btn"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-muted)'
              }}
              title="Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        <main className="mobile-workspace">
          <section className="mobile-board-panel">
            <BoardSection engine={engine} isMobile />
          </section>

          <div className="mobile-tabs">
            {[
              { id: 'review', label: 'Review' },
              { id: 'moves', label: 'Moves' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`mobile-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section className="mobile-detail-panel">
            {activeTab === 'review' ? (
              <AnalysisPanel key="review-panel" engine={engine} forcedTab="overview" />
            ) : (
              <AnalysisPanel key="moves-panel" engine={engine} forcedTab="moves" />
            )}
          </section>
        </main>

        {/* Pinned Bottom Playback Controls */}
        <div className="mobile-bottom-nav">
          <button
            onClick={() => engine.goTo(-1)}
            disabled={engine.moveIndex <= -1 || engine.analysing}
            className="nav-btn-minimal"
            title="Start"
          >
            <ChevronsLeft size={22} />
          </button>
          <button
            onClick={() => engine.goTo(engine.moveIndex - 1)}
            disabled={engine.moveIndex <= -1 || engine.analysing}
            className="nav-btn-minimal"
            title="Previous"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => engine.setIsPlaying(!engine.isPlaying)}
            disabled={engine.analysing || engine.moveHistory.length === 0}
            className="nav-btn-minimal playback-play-btn"
            style={{
              background: 'linear-gradient(180deg, #96c85f 0%, #7aae43 100%)',
              color: '#1b1b1a',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(129, 182, 76, 0.4)',
              border: 'none',
              flex: 'none'
            }}
            title={engine.isPlaying ? 'Pause' : 'Play'}
          >
            {engine.isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" style={{ marginLeft: engine.isPlaying ? '0' : '2px' }} />}
          </button>
          <button
            onClick={() => engine.goTo(engine.moveIndex + 1)}
            disabled={engine.moveHistory.length === 0 || engine.moveIndex >= engine.moveHistory.length - 1 || engine.analysing}
            className="nav-btn-minimal"
            title="Next"
          >
            <ChevronRight size={22} />
          </button>
          <button
            onClick={() => engine.goTo(engine.moveHistory.length - 1)}
            disabled={engine.moveHistory.length === 0 || engine.moveIndex >= engine.moveHistory.length - 1 || engine.analysing}
            className="nav-btn-minimal"
            title="End"
          >
            <ChevronsRight size={22} />
          </button>
        </div>

        <Header engine={engine} isMobile isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header engine={engine} />

      <main className="workspace-grid">
        <section className="board-column">
          <BoardSection engine={engine} />
        </section>

        <aside className="review-column">
          <AnalysisPanel key="desktop-panel" engine={engine} forcedTab="overview" />
        </aside>
      </main>
    </div>
  );
}
