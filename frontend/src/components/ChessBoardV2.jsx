import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { CLF } from '../../../engine/constants.js';
import { ClassificationIcon } from './icons.jsx';

const PIECE_URLS = {
  p: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/bP.svg',
  n: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/bN.svg',
  b: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/bB.svg',
  r: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/bR.svg',
  q: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/bQ.svg',
  k: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/bK.svg',
  P: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/wP.svg',
  N: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/wN.svg',
  B: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/wB.svg',
  R: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/wR.svg',
  Q: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/wQ.svg',
  K: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/wK.svg',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const BOARD_DARK = '#769656';
const BOARD_LIGHT = '#eeeed2';
const ARROW_COLORS = ['rgba(255, 197, 80, 0.88)'];

function squareName(r, c) {
  return FILES[c] + RANKS[r];
}

function coords(square) {
  return { c: FILES.indexOf(square[0]), r: RANKS.indexOf(square[1]) };
}

function Arrow({ from, to, color, squarePct, isFlipped }) {
  const source = coords(from);
  const target = coords(to);
  const start = isFlipped ? { r: 7 - source.r, c: 7 - source.c } : source;
  const end = isFlipped ? { r: 7 - target.r, c: 7 - target.c } : target;

  const cx = (c) => (c + 0.5) * squarePct;
  const cy = (r) => (r + 0.5) * squarePct;

  const x1 = cx(start.c);
  const y1 = cy(start.r);
  const x2 = cx(end.c);
  const y2 = cy(end.r);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const diffC = end.c - start.c;
  const diffR = end.r - start.r;
  const isKnight = (Math.abs(diffC) === 1 && Math.abs(diffR) === 2)
    || (Math.abs(diffC) === 2 && Math.abs(diffR) === 1);
  const width = squarePct * 0.16;
  const headSize = squarePct * 0.35;

  if (isKnight) {
    const pivot = Math.abs(diffR) === 2
      ? { c: start.c, r: end.r }
      : { c: end.c, r: start.r };
    const xp = cx(pivot.c);
    const yp = cy(pivot.r);
    const fdx = x2 - xp;
    const fdy = y2 - yp;
    const flen = Math.sqrt((fdx * fdx) + (fdy * fdy));
    const fux = fdx / flen;
    const fuy = fdy / flen;
    const shaftEnd = flen - headSize;
    const xEnd = xp + (fux * shaftEnd);
    const yEnd = yp + (fuy * shaftEnd);

    return (
      <g style={{ pointerEvents: 'none' }}>
        <path
          d={`M ${x1} ${y1} L ${xp} ${yp} L ${xEnd} ${yEnd}`}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          points={`
            ${xEnd - (fuy * width * 1.6)},${yEnd + (fux * width * 1.6)}
            ${x2},${y2}
            ${xEnd + (fuy * width * 1.6)},${yEnd - (fux * width * 1.6)}
          `}
          fill={color}
        />
      </g>
    );
  }

  const length = Math.sqrt((dx * dx) + (dy * dy));
  const ux = dx / length;
  const uy = dy / length;
  const shaftEnd = length - headSize;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <line
        x1={x1}
        y1={y1}
        x2={x1 + (ux * shaftEnd)}
        y2={y1 + (uy * shaftEnd)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={`
          ${x1 + (ux * shaftEnd) - (uy * width * 1.6)},${y1 + (uy * shaftEnd) + (ux * width * 1.6)}
          ${x2},${y2}
          ${x1 + (ux * shaftEnd) + (uy * width * 1.6)},${y1 + (uy * shaftEnd) - (ux * width * 1.6)}
        `}
        fill={color}
      />
    </g>
  );
}

export default function ChessBoardV2({
  position,
  onPieceDrop,
  customSquareStyles = {},
  suggestionArrows = [],
  classificationBadge = null,
  animationDuration = 300,
  isFlipped = false,
}) {
  const boardRef = useRef(null);
  const prevPos = useRef(null);
  const chessRef = useRef(null);
  const idCounter = useRef(0);
  const lastDragTime = useRef(0);
  const selectedAtStart = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const [pieces, setPieces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [legalDests, setLegalDests] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [arrowStart, setArrowStart] = useState(null);
  const [arrowColorIdx, setArrowColorIdx] = useState(0);
  const [dragging, setDragging] = useState(null);
  const [hoverSq, setHoverSq] = useState(null);

  const getDisplayCoords = useCallback((r, c) => (
    isFlipped ? { r: 7 - r, c: 7 - c } : { r, c }
  ), [isFlipped]);

  useEffect(() => {
    if (position === prevPos.current) return;
    prevPos.current = position;

    try {
      const game = new Chess(position);
      chessRef.current = game;
      const board = game.board();
      const current = [];

      for (let r = 0; r < 8; r += 1) {
        for (let c = 0; c < 8; c += 1) {
          if (board[r][c]) {
            current.push({
              sq: squareName(r, c),
              type: board[r][c].type,
              color: board[r][c].color,
            });
          }
        }
      }

      setPieces((oldPieces) => {
        const next = [];
        const unmatchedOld = [...oldPieces];
        const unmatchedNew = [...current];

        for (let i = unmatchedNew.length - 1; i >= 0; i -= 1) {
          const incoming = unmatchedNew[i];
          const exactIndex = unmatchedOld.findIndex((piece) => (
            piece.sq === incoming.sq
              && piece.type === incoming.type
              && piece.color === incoming.color
          ));

          if (exactIndex !== -1) {
            next.push({ ...unmatchedOld[exactIndex] });
            unmatchedOld.splice(exactIndex, 1);
            unmatchedNew.splice(i, 1);
          }
        }

        for (let i = unmatchedNew.length - 1; i >= 0; i -= 1) {
          const incoming = unmatchedNew[i];
          const movedIndex = unmatchedOld.findIndex((piece) => (
            piece.type === incoming.type && piece.color === incoming.color
          ));

          if (movedIndex !== -1) {
            next.push({ ...unmatchedOld[movedIndex], sq: incoming.sq });
            unmatchedOld.splice(movedIndex, 1);
            unmatchedNew.splice(i, 1);
          }
        }

        for (const incoming of unmatchedNew) {
          next.push({ id: `p${idCounter.current += 1}`, ...incoming });
        }

        return next;
      });

      setSelected(null);
      setLegalDests([]);
    } catch {
      setPieces([]);
      setSelected(null);
      setLegalDests([]);
    }
  }, [position]);

  const squareSize = useCallback(() => {
    if (!boardRef.current) return 60;
    return boardRef.current.getBoundingClientRect().width / 8;
  }, []);

  const squareFromPoint = useCallback((clientX, clientY) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const c = Math.floor((clientX - rect.left) / (rect.width / 8));
    const r = Math.floor((clientY - rect.top) / (rect.height / 8));
    if (c < 0 || c > 7 || r < 0 || r > 7) return null;
    const finalR = isFlipped ? 7 - r : r;
    const finalC = isFlipped ? 7 - c : c;
    return squareName(finalR, finalC);
  }, [isFlipped]);

  const getLegal = useCallback((fromSquare) => {
    if (!chessRef.current) return [];
    try {
      return chessRef.current.moves({ square: fromSquare, verbose: true }).map((move) => move.to);
    } catch {
      return [];
    }
  }, []);

  const tryMove = useCallback((fromSquare, toSquare) => {
    if (!fromSquare || !toSquare || fromSquare === toSquare) return false;
    if (onPieceDrop) return onPieceDrop(fromSquare, toSquare) !== false;
    return false;
  }, [onPieceDrop]);

  const handleSquareClick = useCallback((targetSquare) => {
    if (selected && legalDests.includes(targetSquare)) {
      tryMove(selected, targetSquare);
      setSelected(null);
      setLegalDests([]);
      return;
    }

    const piece = pieces.find((entry) => entry.sq === targetSquare);
    if (!piece) {
      setSelected(null);
      setLegalDests([]);
      return;
    }

    if (selectedAtStart.current === targetSquare) {
      setSelected(null);
      setLegalDests([]);
      return;
    }

    setSelected(targetSquare);
    setLegalDests(getLegal(targetSquare));
  }, [getLegal, legalDests, pieces, selected, tryMove]);

  const handlePiecePointerDown = useCallback((event, piece) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    dragStartPos.current = { x: event.clientX, y: event.clientY };
    selectedAtStart.current = selected;

    if (selected && legalDests.includes(piece.sq)) {
      tryMove(selected, piece.sq);
      setSelected(null);
      setLegalDests([]);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const size = squareSize();
    setDragging({ sq: piece.sq, piece, x: event.clientX, y: event.clientY, sz: size });
    setSelected(piece.sq);
    setLegalDests(getLegal(piece.sq));
    setArrows([]);
  }, [getLegal, legalDests, selected, squareSize, tryMove]);

  useEffect(() => {
    const onMove = (event) => {
      if (!dragging) return;
      setDragging((dragState) => (dragState ? { ...dragState, x: event.clientX, y: event.clientY } : null));
      setHoverSq(squareFromPoint(event.clientX, event.clientY));
    };

    const onUp = (event) => {
      if (!dragging || event.button !== 0) return;

      const distance = Math.sqrt(
        ((event.clientX - dragStartPos.current.x) ** 2)
        + ((event.clientY - dragStartPos.current.y) ** 2),
      );
      const target = squareFromPoint(event.clientX, event.clientY);
      const isClick = distance < 5;

      if (isClick) {
        if (target) handleSquareClick(target);
      } else if (target && target !== dragging.sq && legalDests.includes(target)) {
        tryMove(dragging.sq, target);
        setSelected(null);
        setLegalDests([]);
      } else if (target !== dragging.sq) {
        setSelected(null);
        setLegalDests([]);
      }

      if (!isClick) lastDragTime.current = Date.now();
      setDragging(null);
      setHoverSq(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, handleSquareClick, legalDests, squareFromPoint, tryMove]);

  const handleRightDown = useCallback((event) => {
    event.preventDefault();
    const start = squareFromPoint(event.clientX, event.clientY);
    if (start) setArrowStart(start);
  }, [squareFromPoint]);

  const handleRightUp = useCallback((event) => {
    event.preventDefault();
    if (!arrowStart) return;
    const end = squareFromPoint(event.clientX, event.clientY);
    if (!end) {
      setArrowStart(null);
      return;
    }

    if (end === arrowStart) {
      setArrowStart(null);
      return;
    }

    setArrows((previous) => {
      const existingIndex = previous.findIndex((arrow) => arrow.from === arrowStart && arrow.to === end);
      if (existingIndex !== -1) {
        return previous.filter((_, index) => index !== existingIndex);
      }

      const color = ARROW_COLORS[arrowColorIdx % ARROW_COLORS.length];
      setArrowColorIdx((index) => (index + 1) % ARROW_COLORS.length);
      return [...previous, { from: arrowStart, to: end, color }];
    });

    setArrowStart(null);
  }, [arrowColorIdx, arrowStart, squareFromPoint]);

  const inCheckSq = (() => {
    try {
      const game = new Chess(position);
      if (!game.isCheck()) return null;
      const turn = game.turn();

      for (let r = 0; r < 8; r += 1) {
        for (let c = 0; c < 8; c += 1) {
          const piece = game.board()[r][c];
          if (piece && piece.type === 'k' && piece.color === turn) {
            return squareName(r, c);
          }
        }
      }
    } catch {
      return null;
    }

    return null;
  })();

  return (
    <div
      className="board-canvas-wrap"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button === 2) handleRightDown(event);
      }}
      onPointerUp={(event) => {
        if (event.button === 2) handleRightUp(event);
      }}
    >
      <div
        ref={boardRef}
        className="board-grid"
        onClick={(event) => {
          if (Date.now() - lastDragTime.current < 200) return;
          const targetSquare = squareFromPoint(event.clientX, event.clientY);
          if (targetSquare) handleSquareClick(targetSquare);
        }}
      >
        {Array.from({ length: 64 }).map((_, index) => {
          const r = Math.floor(index / 8);
          const c = index % 8;
          const display = getDisplayCoords(r, c);
          const isDark = (r + c) % 2 === 1;
          const sq = squareName(r, c);
          const isSelected = selected === sq;
          const isLegal = legalDests.includes(sq);
          const isHovered = hoverSq === sq;
          const isInCheck = inCheckSq === sq;
          const customStyle = customSquareStyles[sq] || {};
          const { backgroundColor: customBg, ...restCustomStyle } = customStyle;
          const hasPiece = pieces.some((piece) => piece.sq === sq);

          let background = isDark ? BOARD_DARK : BOARD_LIGHT;
          if (isSelected) background = isDark ? '#b3c75b' : '#d8e26a';
          if (isInCheck) background = 'radial-gradient(circle, #ff6d62 0%, #cf3726 100%)';

          return (
            <div
              key={sq}
              style={{
                position: 'absolute',
                width: '12.5%',
                height: '12.5%',
                top: `${display.r * 12.5}%`,
                left: `${display.c * 12.5}%`,
                background,
                transition: 'background 0.15s ease',
                cursor: hasPiece || isLegal ? 'pointer' : 'default',
                ...restCustomStyle,
                ...(isHovered && dragging && isLegal ? { filter: 'brightness(1.08)' } : {}),
              }}
            >
              {customBg && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: customBg,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {display.c === 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDark ? BOARD_LIGHT : BOARD_DARK,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {RANKS[r]}
                </span>
              )}

              {display.r === 7 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: isDark ? BOARD_LIGHT : BOARD_DARK,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {FILES[c]}
                </span>
              )}

              {isLegal && (hasPiece ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    boxShadow: 'inset 0 0 0 4px rgba(33, 33, 33, 0.38)',
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '28%',
                    height: '28%',
                    borderRadius: '50%',
                    background: 'rgba(26, 26, 26, 0.28)',
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </div>
          );
        })}

        {pieces.map((piece) => {
          const { r, c } = coords(piece.sq);
          const display = getDisplayCoords(r, c);
          const char = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
          const isDragged = dragging?.sq === piece.sq;

          return (
            <div
              key={piece.id}
              onPointerDown={(event) => handlePiecePointerDown(event, piece)}
              style={{
                position: 'absolute',
                width: '12.5%',
                height: '12.5%',
                top: `${display.r * 12.5}%`,
                left: `${display.c * 12.5}%`,
                transition: isDragged
                  ? 'none'
                  : `top ${animationDuration}ms ease-in-out, left ${animationDuration}ms ease-in-out`,
                backgroundImage: `url(${PIECE_URLS[char]})`,
                backgroundSize: '90% 90%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                cursor: isDragged ? 'grabbing' : 'grab',
                zIndex: isDragged ? 0 : 10,
                opacity: isDragged ? 0.22 : 1,
                touchAction: 'none',
              }}
            />
          );
        })}

        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 20,
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {suggestionArrows.map((arrow, index) => (
            <Arrow
              key={`suggestion-${index}`}
              from={arrow.from}
              to={arrow.to}
              color={arrow.color || 'rgba(129, 182, 76, 0.7)'}
              squarePct={12.5}
              isFlipped={isFlipped}
            />
          ))}

          {arrows.map((arrow, index) => (
            <Arrow
              key={`user-${index}`}
              from={arrow.from}
              to={arrow.to}
              color={arrow.color}
              squarePct={12.5}
              isFlipped={isFlipped}
            />
          ))}
        </svg>

        {classificationBadge && CLF[classificationBadge.type] && (() => {
          const sq = classificationBadge.square;
          const file = sq.charCodeAt(0) - 97;
          const rankNum = parseInt(sq[1], 10);
          const fileIdx = isFlipped ? 7 - file : file;
          const rankIdx = isFlipped ? rankNum - 1 : 8 - rankNum;
          const data = CLF[classificationBadge.type];

          return (
            <div
              style={{
                position: 'absolute',
                left: `${(fileIdx + 0.76) * 12.5}%`,
                top: `${(rankIdx - 0.12) * 12.5}%`,
                width: '4.9%',
                height: '4.9%',
                minWidth: '20px',
                minHeight: '20px',
                background: data.color,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 18px rgba(0, 0, 0, 0.35)',
                zIndex: 100,
                pointerEvents: 'none',
                border: '2px solid rgba(255, 255, 255, 0.88)',
                transform: 'translate(-18%, 18%)',
              }}
            >
              <ClassificationIcon type={classificationBadge.type} size={12} />
            </div>
          );
        })()}
      </div>

      {dragging?.piece && (() => {
        const size = dragging.sz || 60;
        const char = dragging.piece.color === 'w'
          ? dragging.piece.type.toUpperCase()
          : dragging.piece.type;

        return (
          <div
            style={{
              position: 'fixed',
              left: dragging.x - (size / 2),
              top: dragging.y - (size / 2),
              width: size,
              height: size,
              backgroundImage: `url(${PIECE_URLS[char]})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              pointerEvents: 'none',
              zIndex: 9999,
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.55))',
            }}
          />
        );
      })()}
    </div>
  );
}
