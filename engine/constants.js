export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const piecePart = (fen) => fen.split(' ')[0];

// Chess.com-style move classification map
export const CLF = {
  brilliant:  { label: 'Brilliant',  sym: '!!',   color: '#1baca6', bg: 'rgba(27,172,166,.15)'  },
  great:      { label: 'Great',      sym: '!',    color: '#5c8bb0', bg: 'rgba(92,139,176,.13)'  },
  best:       { label: 'Best',       sym: '★',    color: '#81b64c', bg: 'rgba(129,182,76,.13)'  },
  excellent:  { label: 'Excellent',  sym: '!',    color: '#96bc4b', bg: 'rgba(150,188,75,.12)'  },
  good:       { label: 'Good',       sym: '✔',    color: '#9ba162', bg: 'rgba(155,161,98,.12)'  },
  book:       { label: 'Book',       sym: '📖',   color: '#d5a47d', bg: 'rgba(213,164,125,.12)' },
  forced:     { label: 'Forced',     sym: '□',    color: '#8a8a8a', bg: 'rgba(138,138,138,.1)'  },
  inaccuracy: { label: 'Inaccuracy', sym: '?!',   color: '#f6c443', bg: 'rgba(246,196,67,.12)'  },
  mistake:    { label: 'Mistake',    sym: '?',    color: '#eca320', bg: 'rgba(236,163,32,.12)'  },
  miss:       { label: 'Miss',       sym: '✕',    color: '#ff7769', bg: 'rgba(255,119,105,.12)' },
  blunder:    { label: 'Blunder',    sym: '??',   color: '#fa412d', bg: 'rgba(250,65,45,.13)'   },
};
