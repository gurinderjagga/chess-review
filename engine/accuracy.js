import { cpToWinPct, moveAccuracy } from './analysis.js';

/**
 * Calculate game accuracy using chess.com's win-probability formula.
 * Uses posEvals (centipawn evals per position) for precision.
 * Falls back to category weights if posEvals not available.
 */
export function calculateAccuracy(moveClassifs, posEvals) {
  if (posEvals && posEvals.length > 0) {
    let wTotal = 0, wCount = 0, bTotal = 0, bCount = 0;
    for (let i = 0; i < moveClassifs.length; i++) {
      const clf = moveClassifs[i];
      if (!clf || clf === 'book' || clf === 'forced') continue;
      const cpBefore = posEvals[i];
      const cpAfter  = posEvals[i + 1];
      if (cpBefore === undefined || cpAfter === undefined) continue;
      const isWhite = i % 2 === 0;
      const wpB = cpToWinPct(isWhite ? cpBefore : -cpBefore);
      const wpA = cpToWinPct(isWhite ? cpAfter  : -cpAfter);
      const wpLoss = Math.max(0, wpB - wpA);
      const acc = moveAccuracy(wpLoss);
      if (isWhite) { wTotal += acc; wCount++; }
      else         { bTotal += acc; bCount++; }
    }
    return {
      white: wCount > 0 ? (wTotal / wCount).toFixed(1) : null,
      black: bCount > 0 ? (bTotal / bCount).toFixed(1) : null,
    };
  }

  // Fallback: category weights
  const weights = {
    brilliant: 100, best: 100, excellent: 98, good: 90,
    book: 100, forced: 100,
    inaccuracy: 65, mistake: 35, miss: 20, blunder: 5,
  };
  let wTotal = 0, wCount = 0, bTotal = 0, bCount = 0;
  moveClassifs.forEach((clf, i) => {
    if (!clf) return;
    const score = weights[clf] ?? 75;
    if (i % 2 === 0) { wTotal += score; wCount++; }
    else             { bTotal += score; bCount++; }
  });
  return {
    white: wCount > 0 ? (wTotal / wCount).toFixed(1) : null,
    black: bCount > 0 ? (bTotal / bCount).toFixed(1) : null,
  };
}
