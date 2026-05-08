import { useState, useMemo } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { Chess } from 'chess.js';
import { CLF } from '../../../engine/constants.js';
import { getCoachMessage, getCoachReason, buildPvData } from '../../../engine/analysis.js';
import { ClassificationIcon } from './icons.jsx';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function fenAtIndex(hist, idx) {
  if (idx < 0) return START_FEN;
  const g = new Chess();
  for (let i = 0; i <= idx; i++) g.move(hist[i]);
  return g.fen();
}

export default function SummaryPanel({ engine, isMobile }) {
  const {
    moveHistory, moveIndex, analysing,
    moveClassifs, posEvals, batchPvs,
    setFen, sendLive
  } = engine;

  const [showPv, setShowPv] = useState(false);
  const [prevMoveIndex, setPrevMoveIndex] = useState(moveIndex);

  if (moveIndex !== prevMoveIndex) {
    setPrevMoveIndex(moveIndex);
    setShowPv(false);
  }

  const currentClf = moveIndex >= 0 ? moveClassifs[moveIndex] : null;

  const { cpBefore, cpAfter, pvData } = useMemo(() => {
    if (moveIndex < 0 || moveHistory.length === 0) return {};
    const before = posEvals[moveIndex];
    const after = posEvals[moveIndex + 1];
    const fenBefore = fenAtIndex(moveHistory, moveIndex - 1);
    const pv = buildPvData(fenBefore, batchPvs[moveIndex]);
    return { cpBefore: before, cpAfter: after, pvData: pv };
  }, [moveIndex, moveHistory, posEvals, batchPvs]);

  const moveColor = moveIndex % 2 === 0 ? 'w' : 'b';
  const isBook = currentClf === 'book';
  const san = moveIndex >= 0 ? moveHistory[moveIndex] : '';

  if (analysing) {
    return (
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Analyzing…</span>
      </div>
    );
  }

  if (moveIndex < 0 || !currentClf || !CLF[currentClf]) return null;

  return (
    <div className="glass-panel animate-slide-up" style={{ padding: '12px', background: `linear-gradient(135deg, ${CLF[currentClf].color}15 0%, transparent 100%)`, borderLeft: `4px solid ${CLF[currentClf].color}`, borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: CLF[currentClf].color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ClassificationIcon type={currentClf} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: CLF[currentClf].color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{CLF[currentClf].label}</h4>
            {cpBefore !== undefined && cpAfter !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: '10px' }}>
                <span>{(cpBefore / 100).toFixed(1)}</span><ArrowRight size={9} /><span style={{ color: 'var(--text-main)' }}>{(cpAfter / 100).toFixed(1)}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-main)', fontWeight: 500 }}>{getCoachMessage(currentClf, cpBefore, cpAfter, moveColor, san)}</div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{getCoachReason(currentClf, cpBefore, cpAfter, moveColor, isBook, san)}</div>
        </div>
      </div>
      {pvData && pvData.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {!showPv ? (
            <button onClick={() => setShowPv(true)} style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', background: 'rgba(212,163,115,0.1)', borderRadius: '4px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(212,163,115,0.2)', cursor: 'pointer' }}>
              <Target size={10} /> SHOW FOLLOW UP
            </button>
          ) : (
            <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>LINE:</span>
                {pvData.slice(0, 8).map((step, i) => (
                  <button key={i} onClick={() => { setFen(step.fen); sendLive(step.fen); }}
                    style={{ fontSize: '11px', color: i % 2 === 0 ? 'var(--text-main)' : 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>
                    {step.label}
                  </button>
                ))}
                <button onClick={() => setShowPv(false)} style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Hide</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
