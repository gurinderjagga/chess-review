import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, BookOpen, Cpu, Settings2, Target, X } from 'lucide-react';
import { CLF } from '../../../engine/constants.js';
import { ClassificationIcon } from './icons.jsx';
import ChessBoard from './ChessBoardV2.jsx';

function formatOpeningName(opening) {
  if (!opening?.name) return null;
  return opening.name.split(':')[0].trim().replace(/Defense/g, 'Defence');
}

function formatEval(value) {
  if (value === undefined || value === null) return '--';
  // Mate in N: values 99, 98, 97... map to M1, M2, M3...
  if (value >= 99) return '1-0';
  if (value <= -99) return '0-1';
  if (value >= 90) return `M${Math.round(99 - value) + 1}`;
  if (value <= -90) return `M${Math.round(99 + value) + 1}`;
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}`;
}

function buildMoveLabel(moveIndex, moveHistory) {
  if (moveIndex < 0 || !moveHistory[moveIndex]) return 'Start position';
  const turn = moveIndex % 2 === 0
    ? `${Math.floor(moveIndex / 2) + 1}.`
    : `${Math.floor(moveIndex / 2) + 1}...`;
  return `${turn} ${moveHistory[moveIndex]}`;
}

export default function BoardSectionV2({ engine, isMobile = false }) {
  const {
    fen,
    analysisFen,
    variationFen,
    liveEval,
    handleDrop,
    lastMove,
    settings,
    updateSetting,
    moveIndex,
    moveClassifs,
    moveHistory,
    posEvals,
    bestMoves,
    liveBestMove,
    analysing,
    playerNames,
    opening,
    liveLoading,
    setVariationFen,
  } = engine;

  const stageRef = useRef(null);
  const [boardSize, setBoardSize] = useState(isMobile ? 320 : 640);
  const [localFlip, setLocalFlip] = useState(false);

  const evalBarWidth = isMobile ? 14 : 28;
  const stageGap = isMobile ? 4 : 8;
  const displayFen = variationFen ?? analysisFen ?? fen;
  const isExploring = Boolean(variationFen);
  const openingName = formatOpeningName(opening);
  const currentClf = moveIndex >= 0 ? moveClassifs[moveIndex] : null;
  const currentClfData = currentClf ? CLF[currentClf] : null;
  const moveLabel = buildMoveLabel(moveIndex, moveHistory);

  useEffect(() => {
    if (!stageRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const size = Math.floor(Math.min(
        width - evalBarWidth - stageGap - (isMobile ? 8 : 16),
        height - (isMobile ? 60 : 80), // allocate space for player ribbons vertically
      ));
      setBoardSize((prev) => {
        const newSize = Math.max(isMobile ? 260 : 360, size);
        return Math.abs(prev - newSize) > 2 ? newSize : prev;
      });
    });

    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [evalBarWidth, isMobile, stageGap]);

  const currentEval = useMemo(() => {
    if (posEvals && posEvals.length > 0) {
      const value = posEvals[moveIndex + 1];
      if (value !== undefined) return value / 100;
    }
    return liveEval;
  }, [liveEval, moveIndex, posEvals]);

  // Clamp to ±10 pawns; mate scores map to the extremes
  const clampedEval = currentEval >= 90 ? 10 : currentEval <= -90 ? -10 : Math.max(-10, Math.min(10, currentEval));
  const evalPercent = ((clampedEval + 10) / 20) * 100;
  const suggestionArrows = useMemo(() => {
    if (!settings.showArrows || analysing) return [];

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
      color: 'rgba(124, 191, 71, 0.78)',
    }];
  }, [analysing, bestMoves, liveBestMove, moveIndex, settings.showArrows]);

  const classificationBadge = useMemo(() => {
    if (!settings.showBadges || analysing || moveIndex < 0 || !lastMove || !moveClassifs[moveIndex]) {
      return null;
    }
    return {
      type: moveClassifs[moveIndex],
      square: lastMove.to,
    };
  }, [analysing, lastMove, moveClassifs, moveIndex, settings.showBadges]);

  const customSquareStyles = useMemo(() => {
    const styles = {};
    if (!lastMove) return styles;

    const clfData = currentClfData;
    const color = clfData ? `${clfData.color}66` : 'rgba(247, 211, 85, 0.35)';
    styles[lastMove.from] = { backgroundColor: color };
    styles[lastMove.to] = { backgroundColor: color };
    return styles;
  }, [currentClfData, lastMove]);

  return (
    <section className="board-shell-panel">
      <div ref={stageRef} className="board-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flex: 1, minHeight: 0 }}>
        <div className="chess-com-layout" style={{ width: `${boardSize + evalBarWidth + stageGap}px`, display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '8px' }}>

          <div className="player-ribbon player-ribbon-top">
            <span className="player-name">{settings.flipped ? playerNames.white : playerNames.black}</span>
            {!isMobile && <span className="player-caption" style={{ marginLeft: 'auto' }}>{settings.flipped ? 'White' : 'Black'}</span>}
          </div>

          <div style={{ display: 'flex', gap: `${stageGap}px`, alignItems: 'center' }}>
            <div
              className="eval-bar-shell chess-com-eval"
              style={{ width: `${evalBarWidth}px`, height: `${boardSize}px` }}
            >
              <div
                className="eval-bar-fill"
                style={{
                  height: `${evalPercent}%`,
                  bottom: settings.flipped ? 'auto' : 0,
                  top: settings.flipped ? 0 : 'auto',
                }}
              />
              <div
                className="eval-bar-text"
                style={{
                  top: settings.flipped ? (evalPercent >= 50 ? 10 : 'auto') : (evalPercent < 50 ? 10 : 'auto'),
                  bottom: settings.flipped ? (evalPercent < 50 ? 10 : 'auto') : (evalPercent >= 50 ? 10 : 'auto'),
                  fontSize: isMobile ? '0.5rem' : '0.65rem'
                }}
              >
                {formatEval(currentEval)}
              </div>
            </div>

            <div
              className={`board-frame chess-com-board ${isExploring ? 'board-frame-exploring' : ''}`}
              style={{ width: `${boardSize}px`, height: `${boardSize}px` }}
            >
              <ChessBoard
                position={displayFen}
                onPieceDrop={handleDrop}
                animationDuration={analysing ? 100 : 300}
                customSquareStyles={customSquareStyles}
                suggestionArrows={suggestionArrows}
                classificationBadge={classificationBadge}
                isFlipped={settings.flipped}
              />
            </div>
          </div>

          <div className="player-ribbon player-ribbon-bottom">
            <span className="player-name">{settings.flipped ? playerNames.black : playerNames.white}</span>
            {!isMobile && <span className="player-caption" style={{ marginLeft: 'auto' }}>{settings.flipped ? 'Black' : 'White'}</span>}
          </div>
        </div>
      </div>
    </section>
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
