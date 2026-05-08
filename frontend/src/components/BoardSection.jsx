import { useMemo, useState, useEffect, useRef } from 'react';
import { RotateCw, Settings, X, Check } from 'lucide-react';
import ChessBoard from './ChessBoard.jsx';
import { CLF } from '../../../engine/constants.js';

export default function BoardSection({ engine, isMobile }) {
  const {
    fen, analysisFen, variationFen,
    liveEval, handleDrop, lastMove, settings, updateSetting
  } = engine;

  const EVAL_BAR_W = isMobile ? 12 : 28;
  const GAP = isMobile ? 4 : 8;

  const [boardSize, setBoardSize] = useState(isMobile ? 300 : 480);
  const [localFlip, setLocalFlip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef(null);

  const isFlipped = localFlip;

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Board is height-driven (subtract gap + eval bar from width as max)
      const size = Math.floor(Math.min(width - EVAL_BAR_W - GAP - 44, height));
      setBoardSize(Math.max(200, size));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [EVAL_BAR_W, GAP]);

  const toggleSetting = (key) => {
    updateSetting(key);
  };

  const displayFen = variationFen ?? (analysisFen ?? fen);
  const isExploring = !!variationFen;

  const { moveIndex, moveClassifs } = engine;
  const customSquareStyles = useMemo(() => {
    const styles = {};
    if (lastMove) {
      const type = (moveIndex >= 0 && moveClassifs[moveIndex]) ? moveClassifs[moveIndex] : null;
      const clfData = type ? CLF[type] : null;

      const getHighlightColor = () => {
        if (!clfData) return 'rgba(212, 163, 115, 0.4)';
        return `${clfData.color}66`;
      };

      const color = getHighlightColor();
      styles[lastMove.from] = { backgroundColor: color };
      styles[lastMove.to] = { backgroundColor: color };
    }
    return styles;
  }, [lastMove, moveIndex, moveClassifs]);

  const currentEval = useMemo(() => {
    const { moveIndex, posEvals } = engine;
    if (posEvals && posEvals.length > 0) {
      const val = posEvals[moveIndex + 1];
      if (val !== undefined) return val / 100;
    }
    return liveEval;
  }, [engine, liveEval]);

  const evalPercent = ((Math.max(-5, Math.min(5, currentEval)) + 5) / 10) * 100;
  const isMate = Math.abs(currentEval) >= 99;
  const evalStr = isMate ? 'M' : Math.abs(currentEval).toFixed(2);

  const suggestionArrows = useMemo(() => {
    if (!settings.showArrows) return [];
    const { bestMoves, moveIndex, analysing, liveBestMove } = engine;
    if (analysing) return [];

    let bestMoveUci = null;
    if (moveIndex < bestMoves.length - 1) {
      bestMoveUci = bestMoves[moveIndex + 1];
    } else if (liveBestMove) {
      bestMoveUci = liveBestMove;
    }

    if (!bestMoveUci || bestMoveUci.length < 4) return [];

    return [{
      from: bestMoveUci.slice(0, 2),
      to: bestMoveUci.slice(2, 4),
      color: 'rgba(212, 163, 115, 0.7)'
    }];
  }, [engine, settings.showArrows]);

  const classificationBadge = useMemo(() => {
    if (!settings.showBadges) return null;
    const { moveIndex, moveClassifs, lastMove, analysing } = engine;
    if (analysing || moveIndex < 0 || !lastMove || !moveClassifs[moveIndex]) return null;
    return {
      type: moveClassifs[moveIndex],
      square: lastMove.to
    };
  }, [engine, settings.showBadges]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        gap: `${GAP}px`,
      }}
    >
      {/* Eval Bar */}
      <div
        style={{
          width: `${EVAL_BAR_W}px`,
          height: `${boardSize}px`,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          background: '#3a2010',
          border: '1px solid rgba(212,163,115,0.15)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          position: 'absolute',
          bottom: isFlipped ? 'auto' : 0,
          top: isFlipped ? 0 : 'auto',
          left: 0,
          width: '100%',
          height: `${isMate && currentEval > 0 ? 100 : isMate && currentEval < 0 ? 0 : evalPercent}%`,
          background: isFlipped ? 'linear-gradient(to bottom, #f0d9b5, #d4a96a)' : 'linear-gradient(to top, #f0d9b5, #d4a96a)',
          transition: 'height 0.4s cubic-bezier(.4,0,.2,1)',
          borderRadius: isFlipped ? '6px 6px 0 0' : '0 0 6px 6px',
        }} />
        <div style={{
          position: 'absolute',
          width: '100%',
          textAlign: 'center',
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '0.5px',
          color: evalPercent >= 50 ? '#5c3d1e' : '#f0d9b5',
          top: (isFlipped ? evalPercent >= 50 : evalPercent < 50) ? '6px' : 'auto',
          bottom: (isFlipped ? evalPercent < 50 : evalPercent >= 50) ? '6px' : 'auto',
          zIndex: 10,
          userSelect: 'none',
        }}>
          {evalStr}
        </div>
      </div>

      {/* Board */}
      <div style={{
        position: 'relative',
        width: `${boardSize}px`,
        height: `${boardSize}px`,
        flexShrink: 0,
        boxShadow: isExploring
          ? '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(212,163,115,0.3)'
          : '0 20px 60px rgba(0,0,0,0.6), 0 0 20px rgba(212,163,115,0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        border: isExploring ? '2px solid var(--accent-primary)' : '1px solid rgba(212,163,115,0.1)',
        transition: 'all 0.3s ease'
      }}>
        <ChessBoard
          position={displayFen}
          onPieceDrop={handleDrop}
          animationDuration={engine.analysing ? 100 : 300}
          customSquareStyles={customSquareStyles}
          suggestionArrows={suggestionArrows}
          classificationBadge={classificationBadge}
          isFlipped={isFlipped}
        />
      </div>

      {/* Right Controls Column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', paddingTop: '8px', gap: '8px' }}>
        <button
          onClick={() => setLocalFlip(f => !f)}
          style={{
            width: '36px', height: '36px', borderRadius: '6px',
            background: 'rgba(212, 163, 115, 0.1)',
            border: '1px solid rgba(212,163,115,0.2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', color: 'var(--accent-primary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212, 163, 115, 0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212, 163, 115, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
          title="Flip Board"
        >
          <RotateCw size={18} />
        </button>

        <button
          style={{
            width: '36px', height: '36px', borderRadius: '6px',
            background: 'rgba(212, 163, 115, 0.1)',
            border: '1px solid rgba(212,163,115,0.2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', color: 'var(--text-muted)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212, 163, 115, 0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212, 163, 115, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: isMobile ? '90%' : '400px', maxWidth: '400px', padding: isMobile ? '20px' : '24px', position: 'relative', border: '1px solid rgba(212,163,115,0.2)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 20px', color: 'var(--accent-primary)', fontSize: '20px', fontWeight: 800 }}>EloEngine Settings</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingRow label="Engine Suggestion Arrows" desc="Shows the engine's best move as an arrow on the board." active={settings.showArrows} onClick={() => toggleSetting('showArrows')} />
              <SettingRow label="Move Classification Badges" desc="Displays symbols (!!, ?, etc.) directly on the board." active={settings.showBadges} onClick={() => toggleSetting('showBadges')} />
              <SettingRow label="Coach Advice" desc="Show the analytical coach feedback panel." active={settings.showCoach} onClick={() => toggleSetting('showCoach')} />

              <div style={{ height: '1px', background: 'rgba(212,163,115,0.1)', margin: '8px 0' }} />

              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>Analysis Intensity</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[10, 20, 40].map(time => (
                    <button key={time} onClick={() => updateSetting('analysisTime', time)}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: (settings.analysisTime || 20) === time ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: (settings.analysisTime || 20) === time ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {time === 10 ? 'Fast' : time === 20 ? 'Standard' : 'Deep'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                  {(settings.analysisTime || 20)} seconds per game review.
                </div>
              </div>
            </div>

            <button onClick={() => setShowSettings(false)} className="btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px' }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, desc, active, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      <button onClick={onClick} style={{ width: '44px', height: '24px', borderRadius: '12px', background: active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}>
        <div style={{ position: 'absolute', top: '2px', left: active ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          {active && <Check size={12} color="var(--accent-primary)" strokeWidth={4} />}
        </div>
      </button>
    </div>
  );
}
