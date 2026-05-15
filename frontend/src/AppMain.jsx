import { useEffect, useState } from 'react';
import { useChessEngine } from '../../engine/useChessEngine.js';
import Header from './components/HeaderV2.jsx';
import BoardSection from './components/BoardSectionV2.jsx';
import AnalysisPanel from './components/AnalysisPanelV2.jsx';

export default function AppMain() {
  const engine = useChessEngine();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState('review');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="app-shell mobile-shell">
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

        <Header engine={engine} isMobile />
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
