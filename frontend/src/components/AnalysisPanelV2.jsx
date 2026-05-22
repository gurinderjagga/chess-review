import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { CLF } from '../../../engine/constants.js';
import { calculateAccuracy } from '../../../engine/accuracy.js';
import { ClassificationIcon } from './icons.jsx';

function formatOpeningName(opening) {
  if (!opening?.name) return null;
  return opening.name.split(':')[0].trim().replace(/Defense/g, 'Defence');
}

function formatEval(cp) {
  if (cp === undefined || cp === null) return '--';
  const value = cp / 100;
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function moveNotation(moveIndex, moveHistory) {
  if (moveIndex < 0 || !moveHistory[moveIndex]) return 'Start';
  return moveIndex % 2 === 0
    ? `${Math.floor(moveIndex / 2) + 1}. ${moveHistory[moveIndex]}`
    : `${Math.floor(moveIndex / 2) + 1}... ${moveHistory[moveIndex]}`;
}

export default function AnalysisPanelV2({ engine, forcedTab = 'overview' }) {
  const {
    moveHistory,
    moveIndex,
    analysing,
    progress,
    moveClassifs,
    posEvals,
    handleLoadPgn,
    handleReset,
    goTo,
    isPlaying,
    setIsPlaying,
    settings,
    playerNames,
    opening,
    variationFen,
    setVariationFen,
  } = engine;

  const [pgnInput, setPgnInput] = useState('');
  const [activeTab, setActiveTab] = useState(forcedTab);
  const [navCounts, setNavCounts] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const activeRow = scrollRef.current.querySelector('[data-active="true"]');
    if (activeRow) activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [moveIndex]);

  const onRun = () => {
    if (pgnInput.trim()) handleLoadPgn(pgnInput, settings.analysisTime);
  };

  const canPrev = moveIndex > -1;
  const canNext = moveHistory.length > 0 && moveIndex < moveHistory.length - 1;
  const currentClf = moveIndex >= 0 ? moveClassifs[moveIndex] : null;
  const currentClfData = currentClf ? CLF[currentClf] : null;
  const accuracy = useMemo(() => calculateAccuracy(moveClassifs, posEvals), [moveClassifs, posEvals]);
  const openingName = formatOpeningName(opening);

  const stats = useMemo(() => {
    const summary = {};
    Object.keys(CLF).forEach((key) => {
      summary[key] = { w: 0, b: 0 };
    });

    moveClassifs.forEach((classification, index) => {
      if (!summary[classification]) return;
      if (index % 2 === 0) summary[classification].w += 1;
      else summary[classification].b += 1;
    });

    return summary;
  }, [moveClassifs]);

  const handleStatClick = (key, side) => {
    const indices = [];
    moveClassifs.forEach((classification, index) => {
      if (classification !== key) return;
      if (side === 'w' && index % 2 === 0) indices.push(index);
      if (side === 'b' && index % 2 !== 0) indices.push(index);
    });

    if (!indices.length) return;
    const navKey = `${key}_${side}`;
    const currentCount = navCounts[navKey] || 0;
    setNavCounts((previous) => ({ ...previous, [navKey]: currentCount + 1 }));
    goTo(indices[currentCount % indices.length]);
  };

  const navButtons = [
    { icon: <ChevronsLeft size={20} />, onClick: () => goTo(-1), disabled: !canPrev || analysing, title: 'Start' },
    { icon: <ChevronLeft size={20} />, onClick: () => goTo(moveIndex - 1), disabled: !canPrev || analysing, title: 'Previous' },
    {
      icon: isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />,
      onClick: () => setIsPlaying(!isPlaying),
      disabled: analysing || moveHistory.length === 0,
      title: isPlaying ? 'Pause' : 'Play',
      accent: true,
    },
    { icon: <ChevronRight size={20} />, onClick: () => goTo(moveIndex + 1), disabled: !canNext || analysing, title: 'Next' },
    { icon: <ChevronsRight size={20} />, onClick: () => goTo(moveHistory.length - 1), disabled: !canNext || analysing, title: 'End' },
  ];

  if (moveHistory.length === 0) {
    return (
      <section className="glass-panel analysis-panel-root">
        <div className="empty-review-panel">
          <div className="empty-review-copy">
            <h2>Paste a PGN to launch the review</h2>
            <p>
              Get move classifications, accuracy scores, coach feedback, and engine follow-up lines in one place.
            </p>
          </div>

          <textarea
            value={pgnInput}
            onChange={(event) => setPgnInput(event.target.value)}
            placeholder={'[Event "..."]\n...\n1. e4 e5 2. Nf3 Nc6'}
            className="review-textarea"
          />

          <button onClick={onRun} disabled={!pgnInput.trim()} className="btn-primary primary-cta">
            <Play size={18} fill="currentColor" />
            <span>Start engine review</span>
          </button>
        </div>

        <NavFooter buttons={navButtons} moveHistory={moveHistory} moveIndex={moveIndex} />
      </section>
    );
  }

  return (
    <section className="glass-panel analysis-panel-root">
      <div className="analysis-header compact-header">
        <div className="compact-header-row">
          <div className="compact-scores">
            <div className="compact-score-item">
              <span className="compact-player-name">{playerNames.white}</span>
              <span className="compact-accuracy">{accuracy.white}%</span>
            </div>
            <div className="compact-score-divider" />
            <div className="compact-score-item">
              <span className="compact-player-name">{playerNames.black}</span>
              <span className="compact-accuracy">{accuracy.black}%</span>
            </div>
          </div>

          <button className="ghost-action" onClick={handleReset} style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
            <RotateCcw size={13} />
            <span>New game</span>
          </button>
        </div>

        {(openingName || analysing) && (
          <div className="analysis-meta-row" style={{ paddingTop: 0 }}>
            {openingName && (
              <div className="status-chip" style={{ minHeight: 28, fontSize: '0.78rem' }}>
                <BookOpen size={12} />
                <span>{openingName}</span>
              </div>
            )}
            {analysing && (
              <div className="status-chip status-chip-live" style={{ minHeight: 28, fontSize: '0.78rem' }}>
                <span>Analyzing {progress}%</span>
              </div>
            )}
          </div>
        )}

        {analysing && (
          <div className="panel-progress-bar">
            <div className="panel-progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="panel-tab-row">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'moves', label: 'Moves' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`panel-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="panel-scroll-area">
          <CurrentMoveCard
            moveIndex={moveIndex}
            moveHistory={moveHistory}
            currentClf={currentClf}
            currentClfData={currentClfData}
            playerNames={playerNames}
          />

          <div className="list-section-heading">Classification breakdown</div>

          <div className="classification-table">
            <div className="classification-table-head">
              <span />
              <span>White</span>
              <span>Black</span>
            </div>

            {Object.entries(CLF).map(([key, data]) => {
              if (key === 'forced') return null;

              const wCount = stats[key]?.w || 0;
              const bCount = stats[key]?.b || 0;
              const isActive = currentClf === key;

              return (
                <div
                  key={key}
                  className={`classification-row${isActive ? ' active' : ''}`}
                  style={{
                    borderColor: isActive ? `${data.color}55` : undefined,
                    background: isActive ? `${data.color}12` : undefined,
                  }}
                >
                  <div className="classification-main">
                    <div className="classification-icon" style={{ background: data.color }}>
                      <ClassificationIcon type={key} size={15} />
                    </div>
                    <span style={{ color: isActive ? data.color : undefined }}>{data.label}</span>
                  </div>

                  <button
                    className="count-button"
                    style={{ color: wCount ? data.color : undefined }}
                    disabled={!wCount || analysing}
                    onClick={() => handleStatClick(key, 'w')}
                  >
                    {wCount}
                  </button>

                  <button
                    className="count-button"
                    style={{ color: bCount ? data.color : undefined }}
                    disabled={!bCount || analysing}
                    onClick={() => handleStatClick(key, 'b')}
                  >
                    {bCount}
                  </button>
                </div>
              );
            })}
          </div>

          {variationFen && (
            <div className="variation-banner">
              <div>
                <div className="section-kicker">Variation mode</div>
                <div className="variation-copy">You are exploring a side line on the board.</div>
              </div>
              <button className="ghost-action" onClick={() => setVariationFen(null)}>
                <RotateCcw size={14} />
                <span>Return to review</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="panel-scroll-area">
          <div className="list-section-heading">Move list</div>

          {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, index) => {
            const whiteIndex = index * 2;
            const blackIndex = index * 2 + 1;
            const whiteClf = moveClassifs[whiteIndex];
            const blackClf = moveClassifs[blackIndex];

            return (
              <div key={index} className="move-row">
                <div className="move-number">{index + 1}.</div>
                <MoveCell
                  isActive={moveIndex === whiteIndex}
                  move={moveHistory[whiteIndex]}
                  classification={whiteClf}
                  evaluation={posEvals[whiteIndex + 1]}
                  onClick={() => goTo(whiteIndex)}
                />
                <MoveCell
                  isActive={moveIndex === blackIndex}
                  move={moveHistory[blackIndex]}
                  classification={blackClf}
                  evaluation={posEvals[blackIndex + 1]}
                  onClick={() => goTo(blackIndex)}
                />
              </div>
            );
          })}
        </div>
      )}

      <NavFooter buttons={navButtons} moveHistory={moveHistory} moveIndex={moveIndex} />
    </section>
  );
}

function CurrentMoveCard({ moveIndex, moveHistory, currentClf, currentClfData, playerNames }) {
  if (moveIndex < 0 || !currentClfData) {
    return (
      <div className="current-move-card idle">
        <div className="section-kicker">Current move</div>
        <div className="current-move-title">No move selected yet</div>
        <div className="current-move-copy">
          Start playback or click a move in the list to focus the review on one moment.
        </div>
      </div>
    );
  }

  const actor = moveIndex % 2 === 0 ? playerNames.white : playerNames.black;

  return (
    <div
      className="current-move-card"
      style={{
        borderColor: `${currentClfData.color}55`,
        boxShadow: `0 12px 30px ${currentClfData.color}14`,
      }}
    >
      <div className="current-move-header">
        <div>
          <div className="section-kicker">Current move</div>
          <div className="current-move-title">{moveNotation(moveIndex, moveHistory)}</div>
        </div>

        <div
          className="classification-pill"
          style={{
            background: currentClfData.bg,
            color: currentClfData.color,
            borderColor: `${currentClfData.color}45`,
          }}
        >
          <ClassificationIcon type={currentClf} size={14} />
          <span>{currentClfData.label}</span>
        </div>
      </div>

      <div className="current-move-copy">
        {actor} played this move. The engine marked it as {currentClfData.label.toLowerCase()}.
      </div>


    </div>
  );
}

function MoveCell({ isActive, move, classification, evaluation, onClick }) {
  if (!move) return <div />;

  const classificationData = classification ? CLF[classification] : null;

  return (
    <button
      data-active={isActive}
      className={`move-cell${isActive ? ' active' : ''}`}
      onClick={onClick}
    >
      <div className="move-cell-main">
        <span className="move-san">{move}</span>
        {classificationData && (
          <div className="move-classification-inline" style={{ background: classificationData.color }}>
            <ClassificationIcon type={classification} size={11} />
          </div>
        )}
      </div>
      <span className="move-eval">{formatEval(evaluation)}</span>
    </button>
  );
}

function NavFooter({ buttons, moveHistory, moveIndex }) {
  return (
    <div className="nav-footer">
      <div className="nav-button-row">
        {buttons.map((button, index) => (
          <button
            key={`${button.title}-${index}`}
            onClick={button.onClick}
            disabled={button.disabled}
            title={button.title}
            className={`nav-btn-minimal${button.accent ? ' nav-btn-accent' : ''}`}
          >
            {button.icon}
          </button>
        ))}
      </div>

      {moveHistory.length > 0 && (
        <div className="nav-progress-row">
          <div className="nav-progress-track">
            <div
              className="nav-progress-fill"
              style={{ width: `${((moveIndex + 1) / moveHistory.length) * 100}%` }}
            />
          </div>
          <span className="nav-progress-copy">
            {Math.max(0, moveIndex + 1)}/{moveHistory.length}
          </span>
        </div>
      )}
    </div>
  );
}
