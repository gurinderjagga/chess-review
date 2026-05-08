import { useState, useEffect } from 'react';
import { useChessEngine } from '../../engine/useChessEngine.js';
import Header from './components/Header.jsx';
import BoardSection from './components/BoardSection.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import SummaryPanel from './components/SummaryPanel.jsx';

export default function App() {
  const engine = useChessEngine();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState('analysis');

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  /* ── Mobile ───────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', overflow: 'visible' }}>
          <div style={{ width: '100%', aspectRatio: '1/1' }}>
            <BoardSection engine={engine} isMobile={true} />
          </div>
          <div className="mobile-tabs">
            {['analysis', 'summary'].map(tab => (
              <button key={tab} className={`mobile-tab-btn${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'analysis' ? 'Analysis' : 'Summary'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: '400px' }}>
            {activeTab === 'analysis'
              ? <AnalysisPanel engine={engine} isMobile={true} />
              : <SummaryPanel engine={engine} isMobile={true} />}
          </div>
        </main>
      </div>
    );
  }

  /* ── Desktop ──────────────────────────────────────────────────────── */
  const hasGame = engine.moveHistory.length > 0;

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <Header />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        padding: '8px 10px 10px',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* LEFT — Board */}
        <div style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          overflow: 'hidden',
        }}>
          <BoardSection engine={engine} isMobile={false} />
        </div>

        {/* RIGHT — Summary (only when game loaded) + Analysis */}
        <div style={{
          width: '300px',
          minWidth: '300px',
          maxWidth: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: 0,
        }}>
          {/* Summary Panel — only visible after game is loaded */}
          {hasGame && (
            <div style={{ flexShrink: 0 }}>
              <SummaryPanel engine={engine} isMobile={false} />
            </div>
          )}

          {/* Analysis Panel — fills all remaining right-column height */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <AnalysisPanel engine={engine} isMobile={false} />
          </div>
        </div>
      </main>
    </div>
  );
}
