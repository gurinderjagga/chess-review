// ECO Opening Database – moves are space-separated SAN as returned by chess.js history()
import { GENERATED_OPENING_ROWS } from './openingBook.generated.js';

// Format: [eco, name, movesString]
const BUILT_IN_OPENINGS = [
  // ── Open Games ───────────────────────────────────────────────────────────
  ['C20','Kings Pawn Game','e4 e5'],
  ['C21','Danish Gambit','e4 e5 d4 exd4 c3'],
  ['C23','Bishops Opening','e4 e5 Bc4'],
  ['C25','Vienna Game','e4 e5 Nc3'],
  ['C26','Vienna Gambit','e4 e5 Nc3 Nf6 f4'],
  ['C30','Kings Gambit','e4 e5 f4'],
  ['C33','Kings Gambit Accepted','e4 e5 f4 exf4'],
  ['C34','Kings Gambit: Kieseritzky','e4 e5 f4 exf4 Nf3 g5 h4'],
  ['C41','Philidor Defense','e4 e5 Nf3 d6'],
  ['C42','Russian Game (Petrov)','e4 e5 Nf3 Nf6'],
  ['C43','Petrov: Modern Attack','e4 e5 Nf3 Nf6 d4'],
  ['C44','Scotch Gambit','e4 e5 Nf3 Nc6 d4'],
  ['C45','Scotch Game','e4 e5 Nf3 Nc6 d4 exd4 Nxd4'],
  ['C46','Three Knights','e4 e5 Nf3 Nc6 Nc3'],
  ['C47','Four Knights: Scotch','e4 e5 Nf3 Nc6 Nc3 Nf6 d4'],
  ['C48','Four Knights: Spanish','e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5'],
  ['C50','Italian Game','e4 e5 Nf3 Nc6 Bc4'],
  ['C51','Evans Gambit','e4 e5 Nf3 Nc6 Bc4 Bc5 b4'],
  ['C53','Italian: Giuoco Piano','e4 e5 Nf3 Nc6 Bc4 Bc5 c3'],
  ['C55','Two Knights Defense','e4 e5 Nf3 Nc6 Bc4 Nf6'],
  ['C57','Two Knights: Fried Liver','e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7'],
  ['C60','Ruy Lopez','e4 e5 Nf3 Nc6 Bb5'],
  ['C63','Ruy Lopez: Schliemann','e4 e5 Nf3 Nc6 Bb5 f5'],
  ['C65','Ruy Lopez: Berlin','e4 e5 Nf3 Nc6 Bb5 Nf6'],
  ['C67','Ruy Lopez: Berlin Endgame','e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6'],
  ['C68','Ruy Lopez: Exchange','e4 e5 Nf3 Nc6 Bb5 a6 Bxc6'],
  ['C70','Ruy Lopez: Morphy','e4 e5 Nf3 Nc6 Bb5 a6 Ba4'],
  ['C77','Ruy Lopez: Morphy Defense','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6'],
  ['C78','Ruy Lopez: Closed','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O'],
  ['C80','Ruy Lopez: Open','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4'],
  ['C84','Ruy Lopez: Closed','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7'],
  ['C88','Ruy Lopez: Closed','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1'],
  ['C92','Ruy Lopez: Closed','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3'],
  // ── Semi-Open Games ───────────────────────────────────────────────────────
  ['B00','Kings Pawn: Nimzowitsch Defense','e4 Nc6'],
  ['B01','Scandinavian Defense','e4 d5'],
  ['B02','Alekhine Defense','e4 Nf6'],
  ['B06','Modern Defense','e4 g6'],
  ['B07','Pirc Defense','e4 d6 d4 Nf6'],
  ['B09','Pirc: Austrian Attack','e4 d6 d4 Nf6 Nc3 g6 f4'],
  ['B10','Caro-Kann Defense','e4 c6'],
  ['B12','Caro-Kann: Advance','e4 c6 d4 d5 e5'],
  ['B13','Caro-Kann: Exchange','e4 c6 d4 d5 exd5 cxd5'],
  ['B14','Caro-Kann: Panov Attack','e4 c6 d4 d5 exd5 cxd5 c4'],
  ['B15','Caro-Kann: Nc3','e4 c6 d4 d5 Nc3'],
  ['B18','Caro-Kann: Classical','e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5'],
  ['B20','Sicilian Defense','e4 c5'],
  ['B21','Sicilian: Grand Prix Attack','e4 c5 Nc3'],
  ['B22','Sicilian: Alapin','e4 c5 c3'],
  ['B23','Sicilian: Closed','e4 c5 Nc3 Nc6'],
  ['B27','Sicilian: Hyperaccelerated Dragon','e4 c5 Nf3 g6'],
  ['B30','Sicilian: Old Sicilian','e4 c5 Nf3 Nc6'],
  ['B32','Sicilian: Open','e4 c5 Nf3 Nc6 d4 cxd4 Nxd4'],
  ['B40','Sicilian Defense','e4 c5 Nf3 e6'],
  ['B41','Sicilian: Kan','e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6'],
  ['B43','Sicilian: Kan','e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3'],
  ['B45','Sicilian: Taimanov','e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6'],
  ['B48','Sicilian: Taimanov','e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7'],
  ['B51','Sicilian: Moscow Variation','e4 c5 Nf3 d6 Bb5+'],
  ['B54','Sicilian: Dragon','e4 c5 Nf3 d6 d4 cxd4 Nxd4'],
  ['B56','Sicilian: Classical','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3'],
  ['B57','Sicilian: Classical','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6'],
  ['B60','Sicilian: Najdorf','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
  ['B67','Sicilian: Richter-Rauzer','e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bg5'],
  ['B70','Sicilian: Dragon','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6'],
  ['B72','Sicilian: Dragon Classical','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3'],
  ['B76','Sicilian: Yugoslav Attack','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2'],
  ['B80','Sicilian: Scheveningen','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6'],
  ['B84','Sicilian: Scheveningen','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 Be2 a6'],
  ['B90','Sicilian: Najdorf','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
  ['B96','Sicilian: Najdorf Poisoned Pawn','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qb6'],
  ['B97','Sicilian: Najdorf English Attack','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Nbd7'],
  // ── French Defense ────────────────────────────────────────────────────────
  ['C00','French Defense','e4 e6'],
  ['C01','French: Exchange','e4 e6 d4 d5 exd5 exd5'],
  ['C02','French: Advance','e4 e6 d4 d5 e5'],
  ['C03','French: Tarrasch','e4 e6 d4 d5 Nd2'],
  ['C06','French: Tarrasch Open','e4 e6 d4 d5 Nd2 Nf6 e5 c5 c3 Nc6 Bd3'],
  ['C10','French: Rubinstein','e4 e6 d4 d5 Nc3 dxe4 Nxe4'],
  ['C11','French: Classical','e4 e6 d4 d5 Nc3 Nf6'],
  ['C12','French: MacCutcheon','e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4'],
  ['C14','French: Classical','e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5'],
  ['C17','French: Winawer','e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3'],
  ['C18','French: Winawer Advance','e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+'],
  // ── Queen's Pawn ──────────────────────────────────────────────────────────
  ['D00','Queens Pawn Game','d4 d5'],
  ['D00','London System','d4 d5 Nf3 Nf6 Bf4'],
  ['D01','Richter-Veresov','d4 d5 Nc3 Nf6 Bg5'],
  ['D02','Queens Pawn: Symmetrical','d4 d5 Nf3 Nf6'],
  ['D06','Queens Gambit','d4 d5 c4'],
  ['D07','Queens Gambit: Chigorin','d4 d5 c4 Nc6'],
  ['D08','Queens Gambit: Albin Countergambit','d4 d5 c4 e5'],
  ['D10','Queens Gambit Declined: Slav','d4 d5 c4 c6'],
  ['D11','Slav Defense','d4 d5 c4 c6 Nf3 Nf6'],
  ['D12','Slav: Czech Variation','d4 d5 c4 c6 Nf3 Nf6 e3 Bf5'],
  ['D15','Slav Defense','d4 d5 c4 c6 Nf3 Nf6 Nc3'],
  ['D16','Slav: Alapin','d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4'],
  ['D20','Queens Gambit Accepted','d4 d5 c4 dxc4'],
  ['D30','Queens Gambit Declined','d4 d5 c4 e6'],
  ['D31','Queens Gambit Declined','d4 d5 c4 e6 Nc3'],
  ['D34','QGD: Tarrasch','d4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3'],
  ['D37','QGD: Classical','d4 d5 c4 e6 Nc3 Nf6 Nf3'],
  ['D38','QGD: Ragozin','d4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4'],
  ['D43','QGD Semi-Slav','d4 d5 c4 e6 Nc3 Nf6 Nf3 c6'],
  ['D44','Semi-Slav: Botvinnik','d4 d5 c4 e6 Nc3 Nf6 Nf3 c6 Bg5 dxc4'],
  ['D45','Semi-Slav: Normal','d4 d5 c4 e6 Nc3 Nf6 Nf3 c6 e3'],
  ['D46','Semi-Slav: Meran','d4 d5 c4 e6 Nc3 Nf6 Nf3 c6 e3 Nbd7'],
  ['D58','QGD: Tartakower','d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6'],
  ['D70','Grunfeld Defense','d4 Nf6 c4 g6 Nc3 d5'],
  ['D80','Grunfeld: Russian','d4 Nf6 c4 g6 Nc3 d5 Bg5'],
  ['D85','Grunfeld: Exchange','d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7'],
  ['D97','Grunfeld: Russian','d4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3'],
  // ── Indian Defenses ───────────────────────────────────────────────────────
  ['A45','Trompowsky Attack','d4 Nf6 Bg5'],
  ['A46','Queens Pawn: Torre Attack','d4 Nf6 Nf3 e6 Bg5'],
  ['A50','Queens Indian','d4 Nf6 c4 b6'],
  ['A57','Benko Gambit','d4 Nf6 c4 c5 d5 b5'],
  ['A60','Benoni Defense','d4 Nf6 c4 c5 d5 e6'],
  ['A80','Dutch Defense','d4 f5'],
  ['A84','Dutch: Classical','d4 f5 c4 Nf6 Nc3 e6'],
  ['E00','Catalan Opening','d4 Nf6 c4 e6 g3'],
  ['E06','Catalan: Open','d4 Nf6 c4 e6 g3 d5 Nf3 dxc4'],
  ['E10','Queens Indian Accelerated','d4 Nf6 c4 e6 Nf3'],
  ['E12','Queens Indian Defense','d4 Nf6 c4 e6 Nf3 b6'],
  ['E15','Queens Indian: Nimzovich','d4 Nf6 c4 e6 Nf3 b6 g3 Ba6'],
  ['E20','Nimzo-Indian Defense','d4 Nf6 c4 e6 Nc3 Bb4'],
  ['E21','Nimzo-Indian: Three Knights','d4 Nf6 c4 e6 Nc3 Bb4 Nf3'],
  ['E30','Nimzo-Indian: Leningrad','d4 Nf6 c4 e6 Nc3 Bb4 Bg5'],
  ['E32','Nimzo-Indian: Classical','d4 Nf6 c4 e6 Nc3 Bb4 Qc2'],
  ['E41','Nimzo-Indian: e3','d4 Nf6 c4 e6 Nc3 Bb4 e3'],
  ['E43','Nimzo-Indian: Fischer','d4 Nf6 c4 e6 Nc3 Bb4 e3 b6'],
  ['E46','Nimzo-Indian: Rubinstein','d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O'],
  ['E60','Kings Indian Defense','d4 Nf6 c4 g6'],
  ['E61','Kings Indian Defense','d4 Nf6 c4 g6 Nc3 Bg7'],
  ['E62','Kings Indian: Fianchetto','d4 Nf6 c4 g6 Nc3 Bg7 Nf3 O-O g3'],
  ['E70','Kings Indian: Averbakh','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6'],
  ['E72','Kings Indian: Averbakh','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 g3'],
  ['E76','Kings Indian: Four Pawns','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4'],
  ['E80','Kings Indian: Samisch','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3'],
  ['E90','Kings Indian: Orthodox','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3'],
  ['E91','Kings Indian: Classical','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2'],
  ['E97','Kings Indian: Classical','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5'],
  ['E99','Kings Indian: Classical','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5'],
  // ── English & Flank ───────────────────────────────────────────────────────
  ['A00','Polish Opening','b4'],
  ['A01','Nimzo-Larsen Attack','b3'],
  ['A02','Bird Opening','f4'],
  ['A04','Reti Opening','Nf3'],
  ['A10','English Opening','c4'],
  ['A20','English: e5','c4 e5'],
  ['A22','English: Two Knights','c4 e5 Nc3 Nf6'],
  ['A25','English: Closed Sicilian','c4 e5 Nc3 Nc6 g3'],
  ['A30','English: Symmetrical','c4 c5'],
  ['A36','English: Symmetrical','c4 c5 Nc3 g6'],
].map(([eco, name, movesStr]) => ({
  eco,
  name,
  moves: movesStr.split(' '),
}));

const GENERATED_OPENINGS = GENERATED_OPENING_ROWS.map(([eco, name, movesStr]) => ({
  eco,
  name,
  moves: movesStr.split(' '),
}));

export const OPENINGS = [...BUILT_IN_OPENINGS, ...GENERATED_OPENINGS];

function normalizeSan(m) {
  if (!m) return '';
  return m.replace(/0-0/g, 'O-O').replace(/[+#?!]/g, '');
}

function matchesPrefix(openingMoves, history, len = openingMoves.length) {
  if (len === 0 || len > history.length || len > openingMoves.length) return false;
  for (let i = 0; i < len; i++) {
    if (normalizeSan(openingMoves[i]) !== normalizeSan(history[i])) return false;
  }
  return true;
}

function openingFromHeaders(headers = {}) {
  let opening = (headers.Opening || '').trim();
  let variation = (headers.Variation || '').trim();
  
  if (opening.endsWith(':')) opening = opening.slice(0, -1).trim();
  
  const defenses = ['Indian', 'Sicilian', 'French', 'Caro-Kann', 'Slav', 'Alekhine', 'Pirc', 'Dutch', 'Scandinavian', 'Nimzowitsch', 'Grunfeld', 'Benoni'];
  const openings = ['English', 'Reti', 'Catalan', 'Bird', 'Polish'];
  const games = ['Italian', 'Vienna', 'Scotch', 'Russian', 'Four Knights', 'Three Knights'];

  if (defenses.includes(opening)) opening += ' Defense';
  else if (openings.includes(opening)) opening += ' Opening';
  else if (games.includes(opening)) opening += ' Game';
  
  let name = '';
  if (opening && variation) {
    if (/^\d+\./.test(variation)) {
      // Ignore variations that are just move notations like "2.Nc3"
      name = opening;
    } else {
      name = `${opening}: ${variation}`;
    }
  } else {
    name = opening || variation;
    // If the only provided name is a move notation, fall back to just ECO
    if (/^\d+\./.test(name)) name = '';
  }
  
  if (!name && !headers.ECO) return null;
  return {
    eco: headers.ECO || '',
    name: name || `ECO ${headers.ECO}`,
    moves: [],
    source: 'pgn',
  };
}

// Find the deepest opening match for a game's move history (SAN array).
export function detectOpening(history, headers = {}) {
  let best = null;
  // DECIDE opening with up to 10 moves (20 half-moves) for better ECO integration.
  const depthLimit = 20;
  const historySubset = history.slice(0, depthLimit);

  for (const op of OPENINGS) {
    const len = op.moves.length;
    if (len === 0 || len > historySubset.length) continue;
    if (matchesPrefix(op.moves, historySubset)) {
      if (!best || len > best.moves.length) best = op;
    }
  }
  
  const fromHeaders = openingFromHeaders(headers);
  if (fromHeaders && fromHeaders.name && !fromHeaders.name.startsWith('ECO')) {
    // If the PGN has a detailed opening name, it is almost always more accurate
    // than a short prefix match. We preserve the known moves length if possible.
    return {
      eco: fromHeaders.eco || (best ? best.eco : ''),
      name: fromHeaders.name,
      moves: best ? best.moves : [],
      source: 'pgn'
    };
  }
  
  return best || fromHeaders;
}

export function bookLength(history) {
  let longest = 0;
  // Limit book moves to up to 10 moves (20 half-moves).
  const depthLimit = 20; 
  for (let len = 1; len <= Math.min(history.length, depthLimit); len++) {
    const hasPrefix = OPENINGS.some((op) => matchesPrefix(op.moves, history, len));
    if (!hasPrefix) break;
    longest = len;
  }
  return longest;
}
