import { useMemo, useState } from 'react';
import { ArrowRight, Sparkles, Target } from 'lucide-react';
import { Chess } from 'chess.js';
import { CLF } from '../../../engine/constants.js';
import { getCoachMessage, getCoachReason, buildPvData } from '../../../engine/analysis.js';
import { ClassificationIcon } from './icons.jsx';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function fenAtIndex(hist, idx) {
  if (idx < 0) return START_FEN;
  const game = new Chess();
  for (let i = 0; i <= idx; i += 1) game.move(hist[i]);
  return game.fen();
}

function formatEval(cp) {
  if (cp === undefined || cp === null) return '--';
  const value = cp / 100;
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

export default function SummaryPanelV2({ engine }) {
  const {
    moveHistory,
    moveIndex,
    analysing,
    moveClassifs,
    posEvals,
    batchPvs,
    setFen,
    sendLive,
    settings,
    playerNames,
  } = engine;

  const [showPv, setShowPv] = useState(false);

  const currentClf = moveIndex >= 0 ? moveClassifs[moveIndex] : null;
  const currentClfData = currentClf ? CLF[currentClf] : null;

  const { cpBefore, cpAfter, pvData } = useMemo(() => {
    if (moveIndex < 0 || moveHistory.length === 0) return {};
    const before = posEvals[moveIndex];
    const after = posEvals[moveIndex + 1];
    const fenBefore = fenAtIndex(moveHistory, moveIndex - 1);
    const pv = buildPvData(fenBefore, batchPvs[moveIndex]);
    return { cpBefore: before, cpAfter: after, pvData: pv };
  }, [batchPvs, moveHistory, moveIndex, posEvals]);

  if (!settings.showCoach) return null;

  if (analysing) {
    return (
      <section className="glass-panel coach-panel coach-panel-loading">
        <div className="spinner small-spinner" />
        <div>
          <div className="coach-title">Coach is preparing your review</div>
          <div className="coach-subtitle">Move classifications and follow-up lines will appear here.</div>
        </div>
      </section>
    );
  }

  if (moveHistory.length === 0) return null;

  if (moveIndex < 0 || !currentClfData) {
    return (
      <section className="glass-panel coach-panel coach-panel-idle">
        <div className="coach-icon coach-icon-neutral">
          <Sparkles size={18} />
        </div>
        <div className="coach-copy">
          <div className="coach-title">Step through the game to unlock move coaching</div>
          <div className="coach-subtitle">
            Use the move list or playback controls to jump to a position and see why each move was classified that way.
          </div>
        </div>
      </section>
    );
  }

  const moveColor = moveIndex % 2 === 0 ? 'w' : 'b';
  const movePrefix = moveIndex % 2 === 0
    ? `${Math.floor(moveIndex / 2) + 1}.`
    : `${Math.floor(moveIndex / 2) + 1}...`;
  const actor = moveColor === 'w' ? playerNames.white : playerNames.black;
  const san = moveHistory[moveIndex];
  const evalSwing = cpBefore !== undefined && cpAfter !== undefined
    ? Math.abs((cpAfter - cpBefore) / 100).toFixed(1)
    : null;

  return (
    <section
      className="glass-panel coach-panel"
      style={{
        borderColor: `${currentClfData.color}55`,
        boxShadow: `0 18px 48px ${currentClfData.color}18`,
      }}
    >
      <div className="coach-header">
        <div className="coach-badge-row">
          <div
            className="coach-icon"
            style={{ background: currentClfData.color }}
          >
            <ClassificationIcon type={currentClf} size={18} />
          </div>

          <div>
            <div className="section-kicker">Coach insight</div>
            <div className="coach-move-line">
              <span>{movePrefix}</span>
              <strong>{san}</strong>
              <span className="coach-move-player">{actor}</span>
            </div>
          </div>
        </div>

        <div
          className="classification-pill"
          style={{
            background: currentClfData.bg,
            color: currentClfData.color,
            borderColor: `${currentClfData.color}45`,
          }}
        >
          {currentClfData.label}
        </div>
      </div>

      <div className="coach-message">
        {getCoachMessage(currentClf, cpBefore, cpAfter, moveColor, san)}
      </div>

      <div className="coach-subtitle">
        {getCoachReason(currentClf, cpBefore, cpAfter, moveColor, currentClf === 'book', san)}
      </div>

      <div className="coach-metrics">
        <div className="coach-metric">
          <span className="coach-metric-label">Eval</span>
          <span className="coach-metric-value">
            {formatEval(cpBefore)}
            <ArrowRight size={12} />
            {formatEval(cpAfter)}
          </span>
        </div>

        <div className="coach-metric">
          <span className="coach-metric-label">Swing</span>
          <span className="coach-metric-value">{evalSwing ? `${evalSwing} pawns` : '--'}</span>
        </div>
      </div>

      {pvData && pvData.length > 0 && (
        <div className="pv-panel">
          {!showPv ? (
            <button
              className="ghost-action"
              onClick={() => setShowPv(true)}
            >
              <Target size={14} />
              Show best continuation
            </button>
          ) : (
            <div className="pv-line-block">
              <div className="pv-line-header">
                <span className="section-kicker">Best line</span>
                <button className="ghost-link" onClick={() => setShowPv(false)}>
                  Hide
                </button>
              </div>

              <div className="pv-line-buttons">
                {pvData.slice(0, 8).map((step, index) => (
                  <button
                    key={`${step.label}-${index}`}
                    className="pv-step-btn"
                    onClick={() => {
                      setFen(step.fen);
                      sendLive(step.fen);
                    }}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
