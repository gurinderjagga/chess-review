import { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Upload, Target, Info } from 'lucide-react';
import { CLF } from '../../../engine/constants.js';
import { calculateAccuracy } from '../../../engine/accuracy.js';
import { ClassificationIcon } from './icons.jsx';

export default function AnalysisPanel({ engine, isMobile }) {
  const {
    moveHistory, moveIndex, analysing, progress,
    moveClassifs, posEvals,
    handleLoadPgn, handleReset, goTo,
    isPlaying, setIsPlaying, settings,
    playerNames, opening
  } = engine;

  const [pgnInput, setPgnInput] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'analysis'
  const [navCounts, setNavCounts] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [moveIndex]);

  const onRun = () => { if (pgnInput.trim()) handleLoadPgn(pgnInput, settings.analysisTime); };
  const canPrev = moveIndex > -1;
  const canNext = moveHistory.length > 0 && moveIndex < moveHistory.length - 1;
  const currentClf = moveIndex >= 0 ? moveClassifs[moveIndex] : null;

  const accuracy = useMemo(() => calculateAccuracy(moveClassifs, posEvals), [moveClassifs, posEvals]);
  const currentAccuracy = accuracy;
  const currentPlayers = playerNames;
  const currentOpening = opening;

  const stats = useMemo(() => {
    const s = {};
    Object.keys(CLF).forEach(k => s[k] = { w: 0, b: 0 });
    moveClassifs.forEach((c, i) => { if (s[c]) { if (i % 2 === 0) s[c].w++; else s[c].b++; } });
    return s;
  }, [moveClassifs]);

  const handleStatClick = (key, side) => {
    const indices = [];
    moveClassifs.forEach((c, i) => {
      if (c === key) { if (side === 'w' && i % 2 === 0) indices.push(i); if (side === 'b' && i % 2 !== 0) indices.push(i); }
    });
    if (!indices.length) return;
    const navKey = `${key}_${side}`;
    const curr = navCounts[navKey] || 0;
    setNavCounts({ ...navCounts, [navKey]: curr + 1 });
    goTo(indices[curr % indices.length]);
  };

  /* ── Nav Controls (shared, always locked at bottom) ─────────────── */
  const NavControls = () => (
    <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.12)', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
        {[
          { icon: <ChevronsLeft size={20} />, onClick: () => goTo(-1), disabled: !canPrev || analysing, title: 'Start' },
          { icon: <ChevronLeft size={20} />, onClick: () => goTo(moveIndex - 1), disabled: !canPrev || analysing, title: 'Prev' },
          { icon: isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />, onClick: () => setIsPlaying(!isPlaying), disabled: analysing || moveHistory.length === 0, title: isPlaying ? 'Pause' : 'Play', accent: true },
          { icon: <ChevronRight size={20} />, onClick: () => goTo(moveIndex + 1), disabled: !canNext || analysing, title: 'Next' },
          { icon: <ChevronsRight size={20} />, onClick: () => goTo(moveHistory.length - 1), disabled: !canNext || analysing, title: 'End' },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} disabled={btn.disabled} title={btn.title}
            className="nav-btn-minimal"
            style={{ color: btn.accent ? 'var(--accent-primary)' : undefined }}>
            {btn.icon}
          </button>
        ))}
      </div>
      {moveHistory.length > 0 && (
        <div style={{ marginTop: '7px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((moveIndex + 1) / moveHistory.length) * 100}%`, background: 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.2s ease' }} />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
            {Math.max(0, moveIndex + 1)}/{moveHistory.length}
          </span>
        </div>
      )}
    </div>
  );

  /* ── Empty state ─────────────────────────────────────────────────── */
  if (moveHistory.length === 0) {
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', textAlign: 'center', padding: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(212,163,115,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', boxShadow: '0 0 40px rgba(212,163,115,0.15)' }}>
            <Upload size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Game Analysis</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '90%', margin: '0 auto', lineHeight: 1.6 }}>
              Paste your PGN to generate a full engine review with accuracy scores and move classifications.
            </p>
          </div>
          <textarea value={pgnInput} onChange={e => setPgnInput(e.target.value)}
            placeholder={'[Event "..."]\n...\n1. e4 e5 2. Nf3 Nc6'}
            style={{ width: '100%', height: '150px', fontSize: '13px', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', resize: 'none' }}
          />
          <button onClick={onRun} disabled={!pgnInput.trim()} className="btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Play size={18} fill="currentColor" /> Start Engine Review
          </button>
        </div>
        <NavControls />
      </div>
    );
  }

  /* ── Accuracy Header ─────────────────────────────────────────────────── */
  const AccuracyHeader = () => (
    <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
      {/* Player Accuracy Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* White */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>White</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '1px' }}>{currentPlayers.white}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', color: 'var(--accent-primary)' }}>
            <Target size={11} />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{currentAccuracy.white}%</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '36px', background: 'var(--border-color)' }} />

        {/* Black */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Black</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '1px' }}>{currentPlayers.black}</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', marginTop: '3px', color: 'var(--accent-primary)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{currentAccuracy.black}%</span>
            <Target size={11} />
          </div>
        </div>
      </div>

      {/* Opening pill */}
      {currentOpening?.name && (() => {
        let baseName = currentOpening.name.split(':')[0].trim();
        const defenses = ['Indian', 'Sicilian', 'French', 'Caro-Kann', 'Slav', 'Alekhine', 'Pirc', 'Dutch', 'Scandinavian', 'Nimzowitsch', 'Grunfeld', 'Benoni'];
        if (defenses.includes(baseName)) baseName += ' Defence';
        baseName = baseName.replace(/Defense/g, 'Defence');

        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {baseName}
            </span>
          </div>
        );
      })()}
    </div>
  );

  /* ── Tabs ────────────────────────────────────────────────────────── */
  const TABS = [{ id: 'summary', label: 'Game Summary' }, { id: 'analysis', label: 'Move History' }];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Accuracy Header — full top, above everything */}
      <AccuracyHeader />

      {/* Tab Bar */}
      <div style={{ display: 'flex', padding: '0 10px', gap: '4px', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '7px 0', fontSize: '12px', fontWeight: 700,
              borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(212,163,115,0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ height: '1px', background: 'var(--border-color)', flexShrink: 0 }} />

      {/* ── GAME SUMMARY TAB ── */}
      {activeTab === 'summary' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {analysing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse-soft 1s infinite', display: 'inline-block' }} />
                  Analyzing {progress}%
                </span>
              ) : 'Classification Breakdown'}
            </span>
            <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }}>
              <RotateCcw size={10} /> New Game
            </button>
          </div>

          {/* W / B column labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 32px 30px', gap: '0 8px', marginBottom: '4px', padding: '0 2px' }}>
            <span />
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right', paddingRight: '2px' }}>W</span>
            <span />
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '2px' }}>B</span>
          </div>

          {Object.entries(CLF).map(([key, data]) => {
            if (key === 'forced') return null;
            const wCount = stats[key]?.w || 0;
            const bCount = stats[key]?.b || 0;
            const hasW = wCount > 0, hasB = bCount > 0;
            const isActive = currentClf === key;
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 30px 32px 30px', gap: '0 8px', alignItems: 'center', padding: '4px 2px', borderRadius: '6px', background: isActive ? `${data.color}12` : 'transparent', border: isActive ? `1px solid ${data.color}30` : '1px solid transparent', transition: 'all 0.2s' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isActive ? data.color : 'var(--text-main)', paddingLeft: '4px' }}>{data.label}</span>
                
                <span onClick={() => hasW && !analysing && handleStatClick(key, 'w')}
                  style={{ fontSize: '15px', fontWeight: 800, textAlign: 'right', paddingRight: '2px', color: hasW ? data.color : 'rgba(255,255,255,0.07)', cursor: hasW && !analysing ? 'pointer' : 'default', transition: 'transform 0.15s' }}
                  onMouseEnter={e => { if (hasW && !analysing) e.currentTarget.style.transform = 'scale(1.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                  {wCount}
                </span>
                
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: data.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: isActive ? `0 0 8px ${data.color}60` : 'none', transition: 'box-shadow 0.2s' }}>
                  <ClassificationIcon type={key} size={17} />
                </div>
                
                <span onClick={() => hasB && !analysing && handleStatClick(key, 'b')}
                  style={{ fontSize: '15px', fontWeight: 800, textAlign: 'left', paddingLeft: '2px', color: hasB ? data.color : 'rgba(255,255,255,0.07)', cursor: hasB && !analysing ? 'pointer' : 'default', transition: 'transform 0.15s' }}
                  onMouseEnter={e => { if (hasB && !analysing) e.currentTarget.style.transform = 'scale(1.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                  {bCount}
                </span>
              </div>
            );
          })}

          {engine.variationFen && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(212,163,115,0.08)', border: '1px solid rgba(212,163,115,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-main)' }}>EXPLORING VARIATION</span>
              </div>
              <button onClick={() => engine.setVariationFen(null)} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RotateCcw size={10} /> RESYNC
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYSIS / MOVE HISTORY TAB ── */}
      {activeTab === 'analysis' && (
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {analysing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse-soft 1s infinite', display: 'inline-block' }} />
                  Analyzing {progress}%
                </span>
              ) : 'Move History'}
            </span>
            <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }}>
              <RotateCcw size={10} /> New Game
            </button>
          </div>

          {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
            const wi = i * 2, bi = i * 2 + 1;
            const wc = moveClassifs[wi], bc = moveClassifs[bi];
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr', gap: '2px', marginBottom: '2px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right', paddingRight: '4px' }}>{i + 1}.</span>
                {/* White */}
                {moveHistory[wi] ? (
                  <div data-active={moveIndex === wi} onClick={() => goTo(wi)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 7px', borderRadius: '5px', cursor: 'pointer', background: moveIndex === wi ? 'rgba(212,163,115,0.15)' : 'transparent', border: moveIndex === wi ? '1px solid rgba(212,163,115,0.3)' : '1px solid transparent', transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (moveIndex !== wi) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (moveIndex !== wi) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', color: moveIndex === wi ? 'var(--accent-primary)' : 'var(--text-main)' }}>{moveHistory[wi]}</span>
                    {wc && CLF[wc] && <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: CLF[wc].color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ClassificationIcon type={wc} size={11} /></div>}
                  </div>
                ) : <div />}
                {/* Black */}
                {moveHistory[bi] ? (
                  <div data-active={moveIndex === bi} onClick={() => goTo(bi)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 7px', borderRadius: '5px', cursor: 'pointer', background: moveIndex === bi ? 'rgba(212,163,115,0.15)' : 'transparent', border: moveIndex === bi ? '1px solid rgba(212,163,115,0.3)' : '1px solid transparent', transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (moveIndex !== bi) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (moveIndex !== bi) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', color: moveIndex === bi ? 'var(--accent-primary)' : 'var(--text-main)' }}>{moveHistory[bi]}</span>
                    {bc && CLF[bc] && <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: CLF[bc].color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ClassificationIcon type={bc} size={11} /></div>}
                  </div>
                ) : <div />}
              </div>
            );
          })}
        </div>
      )}

      {/* Nav controls — always locked at bottom */}
      <NavControls />
    </div>
  );
}
