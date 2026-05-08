import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { CLF } from '../../../engine/constants.js';

/* ─── Piece SVGs (Lichess Alpha set) ───────────────────────────────────────── */
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

const WOOD_DARK  = '#b58863'; // Classic Wood Dark
const WOOD_LIGHT = '#f0d9b5'; // Classic Wood Light

/* Arrow colour cycle on repeated right-click drags */
const ARROW_COLORS = [
  'rgba(255, 170, 0, 0.85)', // standard orange arrow
];

function sq(r, c) { return FILES[c] + RANKS[r]; }
function coords(square) {
  return { c: FILES.indexOf(square[0]), r: RANKS.indexOf(square[1]) };
}

/* ─── SVG Arrow ─────────────────────────────────────────────────────────────── */
function Arrow({ from, to, color, squarePct, isFlipped }) {
  const f_raw = coords(from);
  const t_raw = coords(to);
  const f = isFlipped ? { r: 7 - f_raw.r, c: 7 - f_raw.c } : f_raw;
  const t = isFlipped ? { r: 7 - t_raw.r, c: 7 - t_raw.c } : t_raw;

  const cx = (c) => (c + 0.5) * squarePct;
  const cy = (r) => (r + 0.5) * squarePct;

  const x1 = cx(f.c), y1 = cy(f.r);
  const x2 = cx(t.c), y2 = cy(t.r);

  const dx = x2 - x1, dy = y2 - y1;
  const diffC = t.c - f.c;
  const diffR = t.r - f.r;

  const isKnight = (Math.abs(diffC) === 1 && Math.abs(diffR) === 2) || 
                   (Math.abs(diffC) === 2 && Math.abs(diffR) === 1);

  const w = squarePct * 0.16;
  const headSize = squarePct * 0.35;

  if (isKnight) {
    // Knight L-shape: "7-digit" style
    // Long leg first
    let p;
    if (Math.abs(diffR) === 2) {
      // 2 vertical, 1 horizontal
      p = { c: f.c, r: t.r };
    } else {
      // 2 horizontal, 1 vertical
      p = { c: t.c, r: f.r };
    }
    const xp = cx(p.c), yp = cy(p.r);

    // Direction of the final segment to orient the head
    const fdx = x2 - xp, fdy = y2 - yp;
    const flen = Math.sqrt(fdx * fdx + fdy * fdy);
    const fux = fdx / flen, fuy = fdy / flen;

    const shaftEnd = flen - headSize;
    const xEnd = xp + fux * shaftEnd;
    const yEnd = yp + fuy * shaftEnd;

    return (
      <g style={{ pointerEvents: 'none' }}>
        <path
          d={`M ${x1} ${y1} L ${xp} ${yp} L ${xEnd} ${yEnd}`}
          fill="none"
          stroke={color}
          strokeWidth={w}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          points={`
            ${xEnd - fuy * w * 1.6},${yEnd + fux * w * 1.6}
            ${x2},${y2}
            ${xEnd + fuy * w * 1.6},${yEnd - fux * w * 1.6}
          `}
          fill={color}
        />
      </g>
    );
  }

  // Standard straight arrow
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const shaftEnd = len - headSize;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <line
        x1={x1} y1={y1}
        x2={x1 + ux * shaftEnd} y2={y1 + uy * shaftEnd}
        stroke={color} strokeWidth={w}
        strokeLinecap="round"
      />
      <polygon
        points={`
          ${x1 + ux * shaftEnd - uy * w * 1.6},${y1 + uy * shaftEnd + ux * w * 1.6}
          ${x2},${y2}
          ${x1 + ux * shaftEnd + uy * w * 1.6},${y1 + uy * shaftEnd - ux * w * 1.6}
        `}
        fill={color}
      />
    </g>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function ChessBoard({ 
  position, 
  onPieceDrop, 
  customSquareStyles = {}, 
  suggestionArrows = [],
  classificationBadge = null, // { type: 'best', square: 'e4' }
  animationDuration = 300, 
  isFlipped = false 
}) {
  const boardRef    = useRef(null);
  const [pieces, setPieces]     = useState([]);
  const [selected, setSelected] = useState(null);          // sq string | null
  const [legalDests, setLegalDests] = useState([]);        // sq strings
  const [arrows, setArrows]     = useState([]);            // [{from,to,color}]
  const [arrowStart, setArrowStart] = useState(null);      // sq | null (right-drag)
  const [arrowColorIdx, setArrowColorIdx] = useState(0);
  const [dragging, setDragging] = useState(null);          // {sq, piece, x, y}
  const [hoverSq, setHoverSq]   = useState(null);
  const idCounter = useRef(0);
  const prevPos   = useRef(null);
  const chessRef  = useRef(null);                           // live Chess instance
  
  /* ─── Flip helper ──────────────────────────────────────────────────────── */
  const getDisplayCoords = (r, c) => {
    if (isFlipped) {
      return { r: 7 - r, c: 7 - c };
    }
    return { r, c };
  };

  const lastDragTime = useRef(0);

  /* ── Sync pieces to FEN ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (position === prevPos.current) return;
    prevPos.current = position;
    try {
      const g = new Chess(position);
      chessRef.current = g;
      const board = g.board();
      const current = [];
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          if (board[r][c]) current.push({ sq: sq(r, c), type: board[r][c].type, color: board[r][c].color });

      setPieces((old) => {
        const next = [], unmOld = [...old], unmNew = [...current];
        // exact match
        for (let i = unmNew.length - 1; i >= 0; i--) {
          const np = unmNew[i];
          const oi = unmOld.findIndex(o => o.sq === np.sq && o.type === np.type && o.color === np.color);
          if (oi !== -1) { next.push({ ...unmOld[oi] }); unmOld.splice(oi, 1); unmNew.splice(i, 1); }
        }
        // moved piece
        for (let i = unmNew.length - 1; i >= 0; i--) {
          const np = unmNew[i];
          const oi = unmOld.findIndex(o => o.type === np.type && o.color === np.color);
          if (oi !== -1) { next.push({ ...unmOld[oi], sq: np.sq }); unmOld.splice(oi, 1); unmNew.splice(i, 1); }
        }
        for (const np of unmNew) next.push({ id: `p${idCounter.current++}`, ...np });
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

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const squareSize = useCallback(() => {
    if (!boardRef.current) return 60;
    return boardRef.current.getBoundingClientRect().width / 8;
  }, []);

  const sqFromPoint = useCallback((clientX, clientY) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const c = Math.floor((clientX - rect.left) / (rect.width  / 8));
    const r = Math.floor((clientY - rect.top)  / (rect.height / 8));
    if (c < 0 || c > 7 || r < 0 || r > 7) return null;
    const finalR = isFlipped ? 7 - r : r;
    const finalC = isFlipped ? 7 - c : c;
    return sq(finalR, finalC);
  }, [isFlipped]);

  const getLegal = useCallback((fromSq) => {
    if (!chessRef.current) return [];
    try {
      return chessRef.current.moves({ square: fromSq, verbose: true }).map(m => m.to);
    } catch { return []; }
  }, []);

  const tryMove = useCallback((fromSq, toSq) => {
    if (!fromSq || !toSq || fromSq === toSq) return false;
    if (onPieceDrop) return onPieceDrop(fromSq, toSq) !== false;
    return false;
  }, [onPieceDrop]);

  const selectedAtStart = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  /* ── Click-to-select / click-to-move (left click on squares) ────────────── */
  const handleSquareClick = useCallback((targetSq) => {
    if (selected && legalDests.includes(targetSq)) {
      tryMove(selected, targetSq);
      setSelected(null); setLegalDests([]);
      return;
    }
    // select own piece
    const piece = pieces.find(p => p.sq === targetSq);
    if (piece) {
      // If it was already selected before the click started, deselect it.
      // If it was NOT selected before the click (meaning it was just selected by pointerdown), KEEP it selected.
      if (selectedAtStart.current === targetSq) { 
        setSelected(null); setLegalDests([]); 
        return; 
      }
      setSelected(targetSq);
      setLegalDests(getLegal(targetSq));
    } else {
      setSelected(null); setLegalDests([]);
    }
  }, [selected, legalDests, pieces, getLegal, tryMove]);

  /* ── Left-button pointer drag ───────────────────────────────────────────── */
  const handlePiecePointerDown = useCallback((e, piece) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Capture state to detect click vs drag and prevent selection toggle loops
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    selectedAtStart.current = selected;

    // If clicking a piece that is a legal destination, execute capture!
    if (selected && legalDests.includes(piece.sq)) {
      tryMove(selected, piece.sq);
      setSelected(null); setLegalDests([]);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const sz = squareSize();
    setDragging({ sq: piece.sq, piece, x: e.clientX, y: e.clientY, sz });
    setSelected(piece.sq);
    setLegalDests(getLegal(piece.sq));
    setArrows([]); 
  }, [squareSize, getLegal, selected, legalDests, tryMove]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : null);
      setHoverSq(sqFromPoint(e.clientX, e.clientY));
    };
    const onUp = (e) => {
      if (!dragging || e.button !== 0) return;
      
      const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.current.x, 2) + Math.pow(e.clientY - dragStartPos.current.y, 2));
      const target = sqFromPoint(e.clientX, e.clientY);
      const isClick = dist < 5;

      if (isClick) {
        // Handle as a click
        if (target) handleSquareClick(target);
      } else {
        // Handle as a drag-drop
        if (target && target !== dragging.sq && legalDests.includes(target)) {
          tryMove(dragging.sq, target);
          setSelected(null); setLegalDests([]);
        } else if (target === dragging.sq) {
          // kept same square — leave selected
        } else {
          setSelected(null); setLegalDests([]);
        }
        lastDragTime.current = Date.now();
      }
      
      setDragging(null); setHoverSq(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [dragging, legalDests, sqFromPoint, tryMove, handleSquareClick]);

  /* ── Right-click arrow drawing ──────────────────────────────────────────── */
  const handleRightDown = useCallback((e) => {
    e.preventDefault();
    const s = sqFromPoint(e.clientX, e.clientY);
    if (s) setArrowStart(s);
  }, [sqFromPoint]);

  const handleRightUp = useCallback((e) => {
    e.preventDefault();
    if (!arrowStart) return;
    const end = sqFromPoint(e.clientX, e.clientY);
    if (!end) { setArrowStart(null); return; }

    if (end === arrowStart) {
      // Single square highlight — toggle
      setArrowStart(null); return;
    }
    setArrows(prev => {
      const exists = prev.findIndex(a => a.from === arrowStart && a.to === end);
      if (exists !== -1) return prev.filter((_, i) => i !== exists); // toggle off
      const color = ARROW_COLORS[arrowColorIdx % ARROW_COLORS.length];
      setArrowColorIdx(i => (i + 1) % ARROW_COLORS.length);
      return [...prev, { from: arrowStart, to: end, color }];
    });
    setArrowStart(null);
  }, [arrowStart, sqFromPoint, arrowColorIdx]);

  /* ── Check detection ────────────────────────────────────────────────────── */
  const inCheckSq = (() => {
    try {
      const g = new Chess(position);
      if (!g.isCheck()) return null;
      const turn = g.turn();
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
          const p = g.board()[r][c];
          if (p && p.type === 'k' && p.color === turn) return sq(r, c);
        }
    } catch {
      return null;
    }
    return null;
  })();

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        width: '100%', height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { if (e.button === 2) handleRightDown(e); }}
      onPointerUp={(e) => { if (e.button === 2) handleRightUp(e); }}
    >
      {/* ── Inner board grid ──────────────────────────────────────────────── */}
      <div
        ref={boardRef}
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 0 0 2px rgba(0,0,0,0.5)',
          userSelect: 'none',
          cursor: dragging ? 'grabbing' : 'default',
        }}
        onClick={(e) => {
          if (Date.now() - lastDragTime.current < 200) return;
          const s = sqFromPoint(e.clientX, e.clientY);
          if (s) handleSquareClick(s);
        }}
      >
          {Array.from({ length: 64 }).map((_, idx) => {
            const r = Math.floor(idx / 8), c = idx % 8;
            const displayCoords = getDisplayCoords(r, c);
            const isDark  = (r + c) % 2 === 1;
            const sqName  = sq(r, c);
            const isSelected  = selected === sqName;
            const isLegal     = legalDests.includes(sqName);
            const isHovered   = hoverSq === sqName;
            const isInCheck   = inCheckSq === sqName;
            const customStyle = customSquareStyles[sqName] || {};

            let bg = isDark ? WOOD_DARK : WOOD_LIGHT;
            if (isSelected) bg = isDark ? '#aac240' : '#cdd44e';
            if (isInCheck)  bg = 'radial-gradient(circle, #ff4d4d 0%, #b22222 100%)';

            const { backgroundColor: customBg, ...restCustomStyle } = customStyle;

            const hasPiece = pieces.some(p => p.sq === sqName);

            return (
              <div
                key={sqName}
                style={{
                  position: 'absolute',
                  width: '12.5%', height: '12.5%',
                  top: `${displayCoords.r * 12.5}%`, left: `${displayCoords.c * 12.5}%`,
                  background: bg,
                  transition: 'background 0.15s',
                  cursor: (hasPiece || isLegal) ? 'pointer' : 'default',
                  ...restCustomStyle,
                  ...(isHovered && dragging && isLegal ? { filter: 'brightness(1.15)' } : {}),
                }}
              >
                {/* Highlight Overlay Layer */}
                {customBg && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: customBg, pointerEvents: 'none' }} />
                )}
                
                {/* Rank label */}
                {displayCoords.c === 0 && (
                  <span style={{ position: 'absolute', top: 3, left: 4, fontSize: 11, fontWeight: 700, lineHeight: 1,
                    color: isDark ? WOOD_LIGHT : WOOD_DARK, userSelect: 'none', pointerEvents: 'none' }}>
                    {RANKS[r]}
                  </span>
                )}
                {/* File label */}
                {displayCoords.r === 7 && (
                  <span style={{ position: 'absolute', bottom: 3, right: 4, fontSize: 11, fontWeight: 700, lineHeight: 1,
                    color: isDark ? WOOD_LIGHT : WOOD_DARK, userSelect: 'none', pointerEvents: 'none' }}>
                    {FILES[c]}
                  </span>
                )}
                {/* Legal move dot / ring */}
                {isLegal && (() => {
                  const hasPiece = pieces.some(p => p.sq === sqName);
                  return hasPiece ? (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
                      boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
                  ) : (
                    <div style={{ position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      width: '28%', height: '28%', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.28)', pointerEvents: 'none' }} />
                  );
                })()}
              </div>
            );
          })}

        {/* Pieces layer */}
        {pieces.map((p) => {
          const { r, c } = coords(p.sq);
          const displayCoords = getDisplayCoords(r, c);
          const char = p.color === 'w' ? p.type.toUpperCase() : p.type;
          const isDragged = dragging?.sq === p.sq;
          return (
            <div
              key={p.id}
              onPointerDown={(e) => handlePiecePointerDown(e, p)}
              style={{
                position: 'absolute',
                width: '12.5%', height: '12.5%',
                top: `${displayCoords.r * 12.5}%`, left: `${displayCoords.c * 12.5}%`,
                transition: isDragged ? 'none' : `top ${animationDuration}ms ease-in-out, left ${animationDuration}ms ease-in-out`,
                backgroundImage: `url(${PIECE_URLS[char]})`,
                backgroundSize: '88% 88%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                cursor: isDragged ? 'grabbing' : 'grab',
                zIndex: isDragged ? 0 : 10,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
                opacity: isDragged ? 0.25 : 1,
                touchAction: 'none',
              }}
            />
          );
        })}

        {/* Arrow SVG overlay */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Suggestion arrows (Engine) */}
          {suggestionArrows.map((a, i) => (
            <Arrow key={`sug-${i}`} from={a.from} to={a.to} color={a.color || 'rgba(129, 182, 76, 0.7)'} squarePct={12.5} isFlipped={isFlipped} />
          ))}
          
          {/* User arrows (Right-click) */}
          {arrows.map((a, i) => (
            <Arrow key={`user-${i}`} from={a.from} to={a.to} color={a.color} squarePct={12.5} isFlipped={isFlipped} />
          ))}
        </svg>

        {/* Classification Badge on Board */}
        {(() => {
          if (!classificationBadge || !CLF[classificationBadge.type]) return null;
          const data = CLF[classificationBadge.type];
          const sq = classificationBadge.square;
          const file = sq.charCodeAt(0) - 97;
          const rankNum = parseInt(sq[1], 10);
          const fileIdx = isFlipped ? 7 - file : file;
          const rankIdx = isFlipped ? rankNum - 1 : 8 - rankNum;
          
          return (
            <div style={{
              position: 'absolute',
              left: `${(fileIdx + 0.75) * 12.5}%`,
              top: `${(rankIdx - 0.15) * 12.5}%`,
              width: '4.5%', height: '4.5%',
              minWidth: '18px', minHeight: '18px',
              background: data.color,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 'min(12px, 2.5cqw)', fontWeight: 900,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              zIndex: 100,
              pointerEvents: 'none',
              border: '1.5px solid rgba(0,0,0,0.2)',
              transform: 'translate(-20%, 20%)'
            }}>
               <span style={{ 
                  display: 'block', 
                  transform: (data.sym === '📖' || data.sym === '★') ? 'translateY(-0.5px)' : 'none',
                  lineHeight: 1 
               }}>
                 {data.sym}
               </span>
            </div>
          );
        })()}
      </div>

      {/* Floating dragged piece — full size, follows cursor */}
      {dragging && dragging.piece && (() => {
        const sz2 = dragging.sz || 60;
        const char = dragging.piece.color === 'w' ? dragging.piece.type.toUpperCase() : dragging.piece.type;
        return (
          <div style={{
            position: 'fixed',
            left: dragging.x - sz2 / 2,
            top:  dragging.y - sz2 / 2,
            width: sz2, height: sz2,
            backgroundImage: `url(${PIECE_URLS[char]})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            zIndex: 9999,
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.7))',
          }} />
        );
      })()}
    </div>
  );
}
