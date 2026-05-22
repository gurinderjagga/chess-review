import { Cpu, Settings2, X, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export default function HeaderV2({ engine, isMobile = false, isOpen = false, onClose }) {
  const [showSettings, setShowSettings] = useState(false);

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <>
        <div className="drawer-backdrop" onClick={onClose}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="mobile-brand">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="mobile-logo">
                  <path d="M12 2.75a2.35 2.35 0 0 1 2.35 2.35c0 .54-.18 1.02-.47 1.43h2.18c.7 0 1.26.56 1.26 1.26 0 .34-.13.65-.35.88l-1.62 1.67 2.4 6.48a1.2 1.2 0 0 1-1.13 1.62H7.38a1.2 1.2 0 0 1-1.13-1.62l2.4-6.48-1.62-1.67a1.25 1.25 0 0 1 .9-2.14h2.18a2.3 2.3 0 0 1-.46-1.43A2.35 2.35 0 0 1 12 2.75Zm-2.37 7.01 1.49 4.1h1.9l1.41-4.1H9.63Zm-1.3 6.43h7.34l-.41-1.16h-6.5l-.43 1.16Z" />
                </svg>
                <span className="mobile-title">Menu</span>
              </div>
              <button className="icon-close-btn" style={{ position: 'static' }} onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-menu-list">
              <div className="drawer-menu-item" onClick={() => { engine.updateSetting('flipped'); onClose(); }}>
                <ArrowRightLeft size={18} />
                <span>Flip Board</span>
              </div>
              <div className="drawer-menu-item" onClick={() => setShowSettings(true)}>
                <Settings2 size={18} />
                <span>Review Settings</span>
              </div>
              <div className="drawer-menu-item" onClick={onClose}>
                <Cpu size={18} />
                <span>Stockfish 18</span>
              </div>
              <div className="drawer-menu-item" onClick={() => { engine.handleReset(); onClose(); }} style={{ borderLeft: '3px solid var(--color-blunder)' }}>
                <RotateCcw size={18} />
                <span>New Game</span>
              </div>
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="modal-backdrop" style={{ zIndex: 3000 }}>
            <div className="glass-panel settings-modal">
              <button className="icon-close-btn" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>

              <div className="section-kicker">Review settings</div>
              <h3 className="settings-title">Tune the board experience</h3>

              <div className="settings-stack">
                <SettingRow
                  label="Engine arrows"
                  description="Show the best move arrow directly on the board."
                  active={engine.settings.showArrows}
                  onClick={() => engine.updateSetting('showArrows')}
                />

                <SettingRow
                  label="Classification badges"
                  description="Display review icons on the destination square."
                  active={engine.settings.showBadges}
                  onClick={() => engine.updateSetting('showBadges')}
                />

                <div className="analysis-time-card">
                  <div className="analysis-time-header">
                    <span className="analysis-time-label">Analysis time</span>
                    <span className="analysis-time-value">{engine.settings.analysisTime || 20}s</span>
                  </div>

                  <div className="analysis-time-grid">
                    {[10, 20, 40].map((time) => (
                      <button
                        key={time}
                        className={`analysis-time-btn${(engine.settings.analysisTime || 20) === time ? ' active' : ''}`}
                        onClick={() => engine.updateSetting('analysisTime', time)}
                      >
                        {time === 10 ? 'Fast' : time === 20 ? 'Standard' : 'Deep'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <aside className="sidebar">
        {!isMobile && (
          <div className="sidebar-top">
            <div className="brand-mark" title="CLF Review">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M12 2.75a2.35 2.35 0 0 1 2.35 2.35c0 .54-.18 1.02-.47 1.43h2.18c.7 0 1.26.56 1.26 1.26 0 .34-.13.65-.35.88l-1.62 1.67 2.4 6.48a1.2 1.2 0 0 1-1.13 1.62H7.38a1.2 1.2 0 0 1-1.13-1.62l2.4-6.48-1.62-1.67a1.25 1.25 0 0 1 .9-2.14h2.18a2.3 2.3 0 0 1-.46-1.43A2.35 2.35 0 0 1 12 2.75Zm-2.37 7.01 1.49 4.1h1.9l1.41-4.1H9.63Zm-1.3 6.43h7.34l-.41-1.16h-6.5l-.43 1.16Z" />
              </svg>
            </div>
          </div>
        )}

        <div className="sidebar-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="sidebar-icon-btn" onClick={() => engine.updateSetting('flipped')} title="Flip Board">
            <ArrowRightLeft size={20} />
          </div>
          <div className="sidebar-icon-btn" onClick={() => setShowSettings(true)} title="Review Settings">
            <Settings2 size={20} />
          </div>
          <div className="sidebar-icon-btn" title="Stockfish 18">
            <Cpu size={20} />
          </div>
        </div>
      </aside>

      {showSettings && (
        <div className="modal-backdrop">
          <div className="glass-panel settings-modal">
            <button className="icon-close-btn" onClick={() => setShowSettings(false)}>
              <X size={18} />
            </button>

            <div className="section-kicker">Review settings</div>
            <h3 className="settings-title">Tune the board experience</h3>

            <div className="settings-stack">
              <SettingRow
                label="Engine arrows"
                description="Show the best move arrow directly on the board."
                active={engine.settings.showArrows}
                onClick={() => engine.updateSetting('showArrows')}
              />

              <SettingRow
                label="Classification badges"
                description="Display review icons on the destination square."
                active={engine.settings.showBadges}
                onClick={() => engine.updateSetting('showBadges')}
              />

              <div className="analysis-time-card">
                <div className="analysis-time-header">
                  <span className="analysis-time-label">Analysis time</span>
                  <span className="analysis-time-value">{engine.settings.analysisTime || 20}s</span>
                </div>

                <div className="analysis-time-grid">
                  {[10, 20, 40].map((time) => (
                    <button
                      key={time}
                      className={`analysis-time-btn${(engine.settings.analysisTime || 20) === time ? ' active' : ''}`}
                      onClick={() => engine.updateSetting('analysisTime', time)}
                    >
                      {time === 10 ? 'Fast' : time === 20 ? 'Standard' : 'Deep'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SettingRow({ label, description, active, onClick }) {
  return (
    <button className="setting-row" onClick={onClick}>
      <div>
        <div className="setting-label">{label}</div>
        <div className="setting-description">{description}</div>
      </div>

      <div className={`setting-toggle${active ? ' active' : ''}`}>
        <div className="setting-toggle-thumb" />
      </div>
    </button>
  );
}
