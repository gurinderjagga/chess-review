import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Detects if a move allows the opponent to profitably capture material (a sacrifice).
 * @param {string} fenBefore - The board FEN before the move
 * @param {string} playedUci - The move played in UCI format (e.g. "e2e4")
 * @returns {boolean} True if the move leaves material hanging or offers an unprofitable trade.
 */
export function isMoveSacrifice(fenBefore, playedUci) {
  try {
    if (!playedUci) return false;
    const g = new Chess(fenBefore);
    const moveObj = { from: playedUci.slice(0, 2), to: playedUci.slice(2, 4), promotion: playedUci[4] };
    const mv = g.move(moveObj);
    if (!mv) return false;

    let immediateGain = 0;
    if (mv.captured) immediateGain = PIECE_VALUES[mv.captured] || 0;

    const oppMoves = g.moves({ verbose: true });
    let maxMatLoss = 0;

    for (const oppMv of oppMoves) {
      if (!oppMv.captured) continue;

      let capturedVal = PIECE_VALUES[oppMv.captured] || 0;
      if (oppMv.to === mv.to && mv.promotion) {
        capturedVal = 1;
      }
      
      const attackingVal = PIECE_VALUES[oppMv.piece] || 0;

      g.move(oppMv.san);
      const myRecaptures = g.moves({ verbose: true }).filter(m => m.to === oppMv.to);
      g.undo();

      let netLoss = capturedVal;
      if (myRecaptures.length > 0) {
        netLoss = capturedVal - attackingVal;
      }

      if (netLoss > maxMatLoss) {
        maxMatLoss = netLoss;
      }
    }

    return (maxMatLoss - immediateGain) >= 2;
  } catch {
    return false;
  }
}

// ─── Win probability (chess.com formula) ─────────────────────────────────────
export function cpToWinPct(cp) {
  // Clamp to avoid extreme values
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

// Normalise: from engine's POV to always-from-white's-POV
export function normalise(rawCp, isWhiteTurn) {
  const v = isWhiteTurn ? rawCp : -rawCp;
  return Math.max(-2000, Math.min(2000, v));
}

// ─── Move Classification (chess.com style) ───────────────────────────────────
/**
 * @param {string}  fenBefore    - FEN before the move
 * @param {number}  cpBefore     - eval before the move (from white's POV, centipawns)
 * @param {number}  cpAfter      - eval after the move (from white's POV, centipawns)
 * @param {string}  topMoveUci   - engine's best move UCI
 * @param {string}  playedUci    - the UCI of the move that was played
 * @param {string}  whoMoved     - 'w' or 'b'
 * @param {boolean} isBook       - is this a known book position?
 * @param {number}  legalMoves   - number of legal moves in the position
 */
export function classifyMove(
  fenBefore, cpBefore, cpAfter, topMoveUci, playedUci, whoMoved,
  isBook = false, legalMoves = 99
) {
  if (isBook) return 'book';
  if (legalMoves === 1) return 'forced';

  const isTopMove = playedUci && topMoveUci && playedUci === topMoveUci;
  const wasSacrifice = isMoveSacrifice(fenBefore, playedUci);

  // Win% from the perspective of the player who just moved
  const wpBefore = cpToWinPct(whoMoved === 'w' ? cpBefore : -cpBefore);
  const wpAfter  = cpToWinPct(whoMoved === 'w' ? cpAfter  : -cpAfter);
  const wpLoss   = Math.max(0, wpBefore - wpAfter);
  const evalBefore = whoMoved === 'w' ? cpBefore : -cpBefore;

  // ── Brilliant !!
  if (wasSacrifice && wpLoss <= 2 && wpBefore > 45) return 'brilliant';

  // ── Great !!
  // Chess.com awards Great for finding the "only good move" or making a critical sacrifice.
  // Since we cannot run multi-PV locally to check for "only good move", we restrict Great
  // strictly to sound piece sacrifices that don't meet the Brilliant criteria (e.g. played from a losing position).
  if (isTopMove && wasSacrifice && wpLoss <= 2 && wpBefore <= 45) return 'great';

  // ── Best ★
  if (isTopMove) return 'best';

  // ── Excellent !
  if (wpLoss <= 2.0) return 'excellent';

  // ── Good
  if (wpLoss <= 5.0) return 'good';

  // ── Inaccuracy ?!
  if (wpLoss <= 10.0) return 'inaccuracy';

  // ── Mistake ?
  if (wpLoss <= 20.0) return 'mistake';

  // ── Miss ✕
  const wpAfterOpponent = cpToWinPct(whoMoved === 'w' ? -cpAfter : cpAfter);
  if (wpBefore >= 70 && wpLoss >= 15 && wpAfterOpponent < 60) return 'miss';

  // ── Blunder ??
  return 'blunder';
}

// ─── Coach feedback messages ─────────────────────────────────────────────────
export function getCoachMessage(classif, cpBefore, cpAfter, whoMoved, san = '') {
  if (cpBefore === undefined || cpAfter === undefined) return '';

  const isCheckmate = san.includes('#');
  const isCheck = san.includes('+');
  const isCapture = san.includes('x');
  const isCastle = san === 'O-O' || san === 'O-O-O';
  const isPromotion = san.includes('=');
  
  let pieceName = 'pawn';
  if (san[0] === 'N') pieceName = 'knight';
  else if (san[0] === 'B') pieceName = 'bishop';
  else if (san[0] === 'R') pieceName = 'rook';
  else if (san[0] === 'Q') pieceName = 'queen';
  else if (san[0] === 'K') pieceName = 'king';
  if (isCastle) pieceName = 'king';

  const wpBefore = cpToWinPct(whoMoved === 'w' ? cpBefore : -cpBefore);
  const wpAfter  = cpToWinPct(whoMoved === 'w' ? cpAfter  : -cpAfter);

  switch (classif) {
    case 'book':      
      return 'Book move — following established opening theory.';
    case 'forced':    
      return 'Forced move — the only legal option available.';
    case 'brilliant': 
      return `!! Brilliant! A spectacular sacrifice that forces a winning advantage.`;
    case 'great':
      if (isCheckmate) return `! Great Find! You found the critical checkmate.`;
      if (isCapture) return `! Great Find! Capturing this piece was the only way to hold the game.`;
      return `! Great Find! You found the only good move in a difficult position.`;
    case 'best':      
      if (isCheckmate) return `★ Best move — delivering checkmate to win the game!`;
      if (isCastle) return `★ Best move — castling gets the king to safety.`;
      if (isCapture) return `★ Best move — capturing material was the strongest option.`;
      if (isPromotion) return `★ Best move — promoting your pawn is the fastest path to victory.`;
      return `★ Best move — this improves the position of your ${pieceName}.`;
    case 'excellent': 
      if (isCapture) return `! Great move — taking the piece is a very strong choice.`;
      if (isCheck) return `! Great move — checking the opponent creates immediate problems.`;
      return `! Great move — nearly as strong as the engine's top recommendation.`;
    case 'good':      
      if (isCastle) return `Good move — securing the king is always a solid idea.`;
      return `Good move — a solid, accurate choice.`;
    case 'inaccuracy':
      return `?! Inaccuracy — this ${pieceName} move is slightly suboptimal.`;
    case 'mistake':
      return `? Mistake — playing the ${pieceName} here allows your opponent back into the game.`;
    case 'miss':
      return `✕ Miss — you missed an opportunity to play a much stronger sequence.`;
    case 'blunder':
      if (isCapture) return `?? Blunder — capturing this piece is a fatal mistake!`;
      return `?? Blunder — this ${pieceName} move is a critical error that drastically worsens your position.`;
    default: return '';
  }
}

export function getCoachReason(classif, cpBefore, cpAfter, whoMoved, isBook, san = '') {
  if (isBook) return 'A standard move in this opening system.';
  if (cpBefore === undefined || cpAfter === undefined) return '';

  const wpBefore = cpToWinPct(whoMoved === 'w' ? cpBefore : -cpBefore);
  const wpAfter  = cpToWinPct(whoMoved === 'w' ? cpAfter  : -cpAfter);
  const wpLoss   = Math.max(0, wpBefore - wpAfter);
  const diff     = wpLoss.toFixed(1);

  const isCheckmate = san.includes('#');
  if (isCheckmate) return 'The game is over.';

  // Check for missed mate or blundering into mate
  // Mate score is +/- 2000
  const evalBefore = whoMoved === 'w' ? cpBefore : -cpBefore;
  const evalAfter = whoMoved === 'w' ? cpAfter : -cpAfter;
  
  if (evalBefore >= 1900 && evalAfter < 1900) {
    return 'You missed a forced mate sequence!';
  }
  if (evalAfter <= -1900 && evalBefore > -1900) {
    return 'This allows the opponent to deliver a forced checkmate!';
  }

  switch (classif) {
    case 'forced':    return 'No other legal moves were available to play.';
    case 'brilliant': return 'A counter-intuitive sacrifice that creates an unstoppable attack or lasting positional dominance.';
    case 'great':     return 'This was a critical moment, and you found the only continuation that maintains the balance or secures the win.';
    case 'best':      return 'This is exactly the continuation recommended by deep engine analysis.';
    case 'excellent': return 'A very strong continuation that maintains the pressure.';
    case 'good':      return 'A solid alternative that keeps the position steady.';
    case 'inaccuracy':return 'A slightly passive choice. A more accurate move existed that exerted more pressure.';
    case 'mistake':   return 'A significant error. You must be careful of the opponent\'s threats and tactical ideas.';
    case 'miss':      return 'You had a decisive advantage but failed to capitalize on the critical moment.';
    case 'blunder':   return 'A catastrophic mistake that hands the initiative and advantage directly to the opponent.';
    default: return '';
  }
}

// ─── Build PV continuation data ─────────────────────────────────────────────
export function buildPvData(baseFen, uciMoves) {
  if (!uciMoves || uciMoves.length === 0) return [];
  try {
    const g = new Chess(baseFen);
    let moveNum = g.moveNumber();
    let turn = g.turn();
    const result = [];
    for (const uci of uciMoves.slice(0, 10)) {
      if (!uci || uci.length < 4) break;
      const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      if (!mv) break;
      const prefix = turn === 'w' ? `${moveNum}. ` : (result.length === 0 ? `${moveNum}… ` : '');
      if (turn === 'b') moveNum++;
      turn = turn === 'w' ? 'b' : 'w';
      result.push({ label: prefix + mv.san, fen: g.fen() });
    }
    return result;
  } catch { return []; }
}

// ─── Per-move accuracy (chess.com formula) ──────────────────────────────────
export function moveAccuracy(wpLoss) {
  // chess.com's accuracy formula: 103.1668 * exp(-0.04354 * wpLoss) - 3.1668
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * wpLoss) - 3.1668));
}

export function computeAccuracy(posEvals, moveClassifs) {
  let wTotal = 0, wCount = 0, bTotal = 0, bCount = 0;
  for (let i = 0; i < moveClassifs.length; i++) {
    const isWhite = i % 2 === 0;
    const cpBefore = posEvals[i];
    const cpAfter  = posEvals[i + 1];
    if (cpBefore === undefined || cpAfter === undefined) continue;
    if (moveClassifs[i] === 'book' || moveClassifs[i] === 'forced') continue;
    const wpB = cpToWinPct(isWhite ? cpBefore : -cpBefore);
    const wpA = cpToWinPct(isWhite ? cpAfter  : -cpAfter);
    const wpLoss = Math.max(0, wpB - wpA);
    const acc = moveAccuracy(wpLoss);
    if (isWhite) { wTotal += acc; wCount++; }
    else         { bTotal += acc; bCount++; }
  }
  return {
    white: wCount ? (wTotal / wCount).toFixed(1) : null,
    black: bCount ? (bTotal / bCount).toFixed(1) : null,
  };
}
