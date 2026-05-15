import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const EXPECTED_POINTS = {
  excellent: 0.02,
  good: 0.05,
  inaccuracy: 0.10,
  mistake: 0.20,
};
const EQUAL_LOW = 0.42;
const EQUAL_HIGH = 0.58;
const LOSING_EP = 0.22;
const WINNING_EP = 0.78;
const COMPLETELY_WINNING_EP = 0.92;

function moverEval(cp, whoMoved) {
  return whoMoved === 'w' ? cp : -cp;
}

function expectedPointsForMover(cp, whoMoved) {
  return cpToExpectedPoints(moverEval(cp, whoMoved));
}

function isEqualChance(ep) {
  return ep >= EQUAL_LOW && ep <= EQUAL_HIGH;
}

function isWinningChance(ep) {
  return ep >= WINNING_EP;
}

function isLosingChance(ep) {
  return ep <= LOSING_EP;
}

function nonPawnMaterial(fen) {
  const board = fen.split(' ')[0];
  let total = 0;
  for (const ch of board) {
    const lower = ch.toLowerCase();
    if (PIECE_VALUES[lower] && lower !== 'p' && lower !== 'k') total += PIECE_VALUES[lower];
  }
  return total;
}

function isEndgamePosition(fen) {
  return nonPawnMaterial(fen) <= 13;
}

function classifyByExpectedLoss(expectedLoss, isExactBest) {
  if (isExactBest || expectedLoss <= 0.005) return 'best';
  if (expectedLoss <= EXPECTED_POINTS.excellent) return 'excellent';
  if (expectedLoss <= EXPECTED_POINTS.good) return 'good';
  if (expectedLoss <= EXPECTED_POINTS.inaccuracy) return 'inaccuracy';
  if (expectedLoss <= EXPECTED_POINTS.mistake) return 'mistake';
  return 'blunder';
}

function getAlternativeSummary(alternatives, whoMoved) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return { top: null, second: null, onlyGoodMove: false };
  }

  const unique = [];
  for (const line of alternatives) {
    if (!line?.uci) continue;
    if (unique.some((entry) => entry.uci === line.uci)) continue;
    unique.push({
      ...line,
      expectedPoints: expectedPointsForMover(line.cp, whoMoved),
    });
  }

  const [top, second] = unique;
  if (!top || !second) {
    return { top: top || null, second: second || null, onlyGoodMove: false };
  }

  const gap = top.expectedPoints - second.expectedPoints;
  const onlyGoodMove = (
    gap >= 0.10
    || (isWinningChance(top.expectedPoints) && second.expectedPoints < EQUAL_HIGH)
    || (isEqualChance(top.expectedPoints) && isLosingChance(second.expectedPoints))
  );

  return { top, second, onlyGoodMove };
}

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
      const myRecaptures = g.moves({ verbose: true }).filter((move) => move.to === oppMv.to);
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

// Win probability proxy used for accuracy and review buckets.
export function cpToWinPct(cp) {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

export function cpToExpectedPoints(cp) {
  return cpToWinPct(cp) / 100;
}

// Normalise: from engine's POV to always-from-white's-POV
export function normalise(rawCp, isWhiteTurn) {
  const v = isWhiteTurn ? rawCp : -rawCp;
  return Math.max(-2000, Math.min(2000, v));
}

// Move Classification tuned to Chess.com's Classification V2 ideas.
export function classifyMove(
  fenBefore,
  cpBefore,
  cpAfter,
  topMoveUci,
  playedUci,
  whoMoved,
  isBook = false,
  legalMoves = 99,
  context = {}
) {
  if (isBook) return 'book';
  if (legalMoves === 1) return 'forced';

  const expectedBefore = expectedPointsForMover(cpBefore, whoMoved);
  const expectedAfter = expectedPointsForMover(cpAfter, whoMoved);
  const expectedLoss = Math.max(0, expectedBefore - expectedAfter);
  const isExactBest = Boolean(playedUci && topMoveUci && playedUci === topMoveUci);
  const nearBest = isExactBest || expectedLoss <= EXPECTED_POINTS.excellent;
  const wasSacrifice = isMoveSacrifice(fenBefore, playedUci);
  const endgame = isEndgamePosition(fenBefore);

  const previousPositionCp = context.previousPositionCp;
  const previousExpected = previousPositionCp === undefined
    ? null
    : expectedPointsForMover(previousPositionCp, whoMoved);

  const { top, second, onlyGoodMove } = getAlternativeSummary(context.alternatives, whoMoved);
  const opponentMistakeCreatedChance = previousExpected !== null && (expectedBefore - previousExpected) >= 0.15;
  const punishedToWinning = opponentMistakeCreatedChance
    && previousExpected !== null
    && isEqualChance(previousExpected)
    && isWinningChance(expectedBefore)
    && expectedAfter >= expectedBefore - EXPECTED_POINTS.excellent;
  const savedFromLosing = opponentMistakeCreatedChance
    && previousExpected !== null
    && isLosingChance(previousExpected)
    && expectedBefore >= EQUAL_LOW
    && expectedAfter >= expectedBefore - EXPECTED_POINTS.excellent;

  if (
    wasSacrifice
    && nearBest
    && expectedAfter >= EQUAL_LOW
    && expectedBefore < COMPLETELY_WINNING_EP
    && (!endgame || onlyGoodMove || punishedToWinning || savedFromLosing)
  ) {
    return 'brilliant';
  }

  if (nearBest && (onlyGoodMove || punishedToWinning || savedFromLosing)) {
    return 'great';
  }

  const missedWinningChance = !nearBest && expectedBefore >= WINNING_EP && expectedAfter < WINNING_EP;
  const failedToPunishMistake = !nearBest
    && opponentMistakeCreatedChance
    && expectedBefore >= EQUAL_LOW
    && expectedAfter <= EQUAL_HIGH;
  if (missedWinningChance || failedToPunishMistake) {
    return 'miss';
  }

  return classifyByExpectedLoss(expectedLoss, isExactBest || (top?.uci && playedUci === top.uci && expectedLoss <= 0.005));
}

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

  switch (classif) {
    case 'book':
      return 'Book move. You stayed inside known opening theory.';
    case 'forced':
      return 'Forced move. There was only one legal option.';
    case 'brilliant':
      return 'Brilliant. You found a strong sacrifice that keeps the position in your favor.';
    case 'great':
      if (isCheckmate) return 'Great move. You found the critical mating finish.';
      if (isCapture) return 'Great move. You punished the position at exactly the right moment.';
      return 'Great move. You found the critical continuation when the position demanded precision.';
    case 'best':
      if (isCheckmate) return 'Best move. This finishes the game immediately.';
      if (isCastle) return 'Best move. Castling was the cleanest way to improve your position.';
      if (isCapture) return "Best move. This was the engine's top tactical choice.";
      if (isPromotion) return 'Best move. Promotion was the strongest continuation.';
      return `Best move. This was the engine's top choice for your ${pieceName}.`;
    case 'excellent':
      return 'Excellent move. Nearly as strong as the best move.';
    case 'good':
      return 'Good move. Solid and practical, even if a stronger option existed.';
    case 'inaccuracy':
      return `Inaccuracy. This ${pieceName} move gave away a bit of your edge.`;
    case 'mistake':
      return `Mistake. This ${pieceName} move let the position slip noticeably.`;
    case 'miss':
      return 'Miss. You had a chance to seize the game and let it go.';
    case 'blunder':
      return `Blunder. This ${pieceName} move severely worsens the position.`;
    default:
      return '';
  }
}

export function getCoachReason(classif, cpBefore, cpAfter, whoMoved, isBook, san = '') {
  if (isBook) return 'A standard move from established opening practice.';
  if (cpBefore === undefined || cpAfter === undefined) return '';

  const expectedBefore = expectedPointsForMover(cpBefore, whoMoved);
  const expectedAfter = expectedPointsForMover(cpAfter, whoMoved);
  const expectedLoss = Math.max(0, expectedBefore - expectedAfter);
  const diff = (expectedLoss * 100).toFixed(1);

  if (san.includes('#')) return 'The move ends the game by force.';

  const evalBefore = moverEval(cpBefore, whoMoved);
  const evalAfter = moverEval(cpAfter, whoMoved);
  if (evalBefore >= 1900 && evalAfter < 1900) {
    return 'You let a forced mating sequence disappear.';
  }
  if (evalAfter <= -1900 && evalBefore > -1900) {
    return 'This allows a forced mate against you.';
  }

  switch (classif) {
    case 'forced':
      return 'No alternatives existed in the position.';
    case 'brilliant':
      return 'The sacrifice is sound, difficult to spot, and keeps you out of danger.';
    case 'great':
      return 'This was a critical turning point, and you found the move that preserved or won the game.';
    case 'best':
      return 'Deep engine analysis agrees this is the strongest continuation.';
    case 'excellent':
      return `You lost only about ${diff} expected points compared with the best move.`;
    case 'good':
      return `You lost about ${diff} expected points, but the move still keeps the position playable.`;
    case 'inaccuracy':
      return `You gave away about ${diff} expected points with a slightly weaker continuation.`;
    case 'mistake':
      return `You dropped about ${diff} expected points and gave the opponent a real chance.`;
    case 'miss':
      return 'A stronger move could have turned the position clearly in your favor.';
    case 'blunder':
      return `You dropped about ${diff} expected points and the position changed dramatically.`;
    default:
      return '';
  }
}

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
      const prefix = turn === 'w' ? `${moveNum}. ` : (result.length === 0 ? `${moveNum}... ` : '');
      if (turn === 'b') moveNum++;
      turn = turn === 'w' ? 'b' : 'w';
      result.push({ label: prefix + mv.san, fen: g.fen() });
    }
    return result;
  } catch {
    return [];
  }
}

export function moveAccuracy(wpLoss) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * wpLoss) - 3.1668));
}

export function computeAccuracy(posEvals, moveClassifs) {
  let wTotal = 0;
  let wCount = 0;
  let bTotal = 0;
  let bCount = 0;
  for (let i = 0; i < moveClassifs.length; i++) {
    const isWhite = i % 2 === 0;
    const cpBefore = posEvals[i];
    const cpAfter = posEvals[i + 1];
    if (cpBefore === undefined || cpAfter === undefined) continue;
    if (moveClassifs[i] === 'book' || moveClassifs[i] === 'forced') continue;
    const wpB = cpToWinPct(isWhite ? cpBefore : -cpBefore);
    const wpA = cpToWinPct(isWhite ? cpAfter : -cpAfter);
    const wpLoss = Math.max(0, wpB - wpA);
    const acc = moveAccuracy(wpLoss);
    if (isWhite) {
      wTotal += acc;
      wCount++;
    } else {
      bTotal += acc;
      bCount++;
    }
  }
  return {
    white: wCount ? (wTotal / wCount).toFixed(1) : null,
    black: bCount ? (bTotal / bCount).toFixed(1) : null,
  };
}

