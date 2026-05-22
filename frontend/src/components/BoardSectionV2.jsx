import { useEffect, useMemo, useRef, useState } from 'react';
import { CLF } from '../../../engine/constants.js';
import ChessBoard from './ChessBoardV2.jsx';
import { calculateAccuracy } from '../../../engine/accuracy.js';

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

export default function BoardSectionV2({ engine, isMobile = false }) {
  const {
    fen,
    analysisFen,
    variationFen,
    liveEval,
    handleDrop,
    lastMove,
    settings,
    moveIndex,
    moveClassifs,
    posEvals,
    bestMoves,
    liveBestMove,
    analysing,
    playerNames,
  } = engine;

  const stageRef = useRef(null);
  const [boardSize, setBoardSize] = useState(isMobile ? 320 : 640);

  const evalBarWidth = isMobile ? 22 : 36;
  const stageGap = isMobile ? 6 : 10;
  const displayFen = variationFen ?? analysisFen ?? fen;
  const isExploring = Boolean(variationFen);
  const currentClf = moveIndex >= 0 ? moveClassifs[moveIndex] : null;
  const currentClfData = currentClf ? CLF[currentClf] : null;

  const accuracy = useMemo(() => calculateAccuracy(moveClassifs, posEvals), [moveClassifs, posEvals]);

  useEffect(() => {
    if (!stageRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const size = Math.floor(
        isMobile
          ? width - evalBarWidth - stageGap - 8
          : Math.min(
              width - evalBarWidth - stageGap - 16,
              height - 80 // allocate space for player ribbons vertically
            )
      );
      setBoardSize((prev) => {
        const newSize = Math.max(isMobile ? 240 : 360, size);
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

  // Clamp to ±5 pawns (total range 10); mate scores map to the extremes
  const clampedEval = currentEval >= 90 ? 5 : currentEval <= -90 ? -5 : Math.max(-5, Math.min(5, currentEval));
  const evalPercent = ((clampedEval + 5) / 10) * 100;
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
            {(settings.flipped ? accuracy.white : accuracy.black) && (
              <span className="player-accuracy-badge" style={{ marginLeft: '8px', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(150, 200, 95, 0.12)', color: '#96c85f', fontWeight: '800', border: '1px solid rgba(150, 200, 95, 0.25)', letterSpacing: '0.5px' }}>
                {settings.flipped ? accuracy.white : accuracy.black}%
              </span>
            )}
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
            {(settings.flipped ? accuracy.black : accuracy.white) && (
              <span className="player-accuracy-badge" style={{ marginLeft: '8px', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(150, 200, 95, 0.12)', color: '#96c85f', fontWeight: '800', border: '1px solid rgba(150, 200, 95, 0.25)', letterSpacing: '0.5px' }}>
                {settings.flipped ? accuracy.black : accuracy.white}%
              </span>
            )}
            {!isMobile && <span className="player-caption" style={{ marginLeft: 'auto' }}>{settings.flipped ? 'Black' : 'White'}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}


