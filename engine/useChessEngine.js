import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { detectOpening, bookLength } from './openings.js';
import { START_FEN } from './constants.js';
import { normalise, classifyMove } from './analysis.js';


const MIN_POSITION_TIME_MS = 150;
const DEFAULT_ANALYSIS_TIME_SECONDS = 20;


export function useChessEngine() {
  const [fen, setFen] = useState(START_FEN);
  const [moveHistory, setMoveHistory] = useState([]);
  const [moveIndex, setMoveIndex] = useState(-1);
  const [liveEval, setLiveEval] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [posEvals, setPosEvals] = useState([]);
  const [bestMoves, setBestMoves] = useState([]);
  const [batchPvs, setBatchPvs] = useState([]);
  const [moveClassifs, setMoveClassifs] = useState([]);
  const [analysisFen, setAnalysisFen] = useState(null);
  const [variationFen, setVariationFen] = useState(null);
  const [opening, setOpening] = useState(null);

  const [settings, setSettings] = useState({
    showArrows: true,
    showBadges: true,
    showCoach: true,
    analysisTime: 20,
    enginePath: '/stockfish-18-lite-single.js'
  });

  const updateSetting = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val !== undefined ? val : !prev[key] }));
  };

  const [playerNames, setPlayerNames] = useState({ white: 'White', black: 'Black' });
  const [liveBestMove, setLiveBestMove] = useState(null);
  const [livePv, setLivePv] = useState([]);


  // ── Live / Batch analysis worker ──────────────────────────────────────────
  const workerRef = useRef(null);
  const liveTimer = useRef(null);
  const currentFenRef = useRef(START_FEN);
  const currentHistoryRef = useRef([]);
  const variationFenRef = useRef(null);
  const latestEngineRef = useRef({});
  const analResolve = useRef(null);
  const analEval = useRef(0);
  const analMove = useRef('');
  const analPv = useRef([]);
  const analMode = useRef('live');
  const abortAnalysis = useRef(false);


  const initLiveWorker = (path) => {
    if (workerRef.current) workerRef.current.terminate();
    const w = new Worker(path);
    workerRef.current = w;
    w.postMessage('uci');
    w.postMessage('setoption name Hash value 128');
    w.postMessage('isready');
    w.onmessage = ({ data }) => {
      if (typeof data !== 'string') return;

      // Batch Analysis Mode
      if (analMode.current === 'batch') {
        if (data.includes('score cp')) {
          const m = data.match(/score cp (-?\d+)/);
          if (m) analEval.current = parseInt(m[1], 10);
        } else if (data.includes('score mate')) {
          const m = data.match(/score mate (-?\d+)/);
          if (m) analEval.current = parseInt(m[1], 10) > 0 ? 9999 : -9999;
        }
        if (data.includes(' pv ')) {
          const m = data.match(/ pv (.*)/);
          if (m) analPv.current = m[1].split(' ');
        }
        if (data.startsWith('bestmove')) {
          const m = data.match(/bestmove (\S+)/);
          if (m && m[1] !== '(none)' && m[1] !== '0000') analMove.current = m[1];
          const cb = analResolve.current;
          analResolve.current = null;
          cb?.();
        }
        return;
      }

      // Live Analysis Mode
      if (data.includes('score cp')) {
        const m = data.match(/score cp (-?\d+)/);
        if (m) {
          const c = new Chess(currentFenRef.current);
          setLiveEval(normalise(parseInt(m[1], 10), c.turn() === 'w') / 100);
          setLiveLoading(false);
        }
      } else if (data.includes('score mate')) {
        const m = data.match(/score mate (-?\d+)/);
        if (m) {
          const c = new Chess(currentFenRef.current);
          let v = parseInt(m[1], 10); if (c.turn() === 'b') v = -v;
          setLiveEval(v > 0 ? 99 : -99); setLiveLoading(false);
        }
      }
      if (data.includes(' pv ')) {
        const m = data.match(/ pv (.*)/);
        if (m) setLivePv(m[1].split(' '));
      }
      if (data.startsWith('bestmove')) {
        const m = data.match(/bestmove (\S+)/);
        if (m && m[1] !== '(none)' && m[1] !== '0000') setLiveBestMove(m[1]);
      }
    };
    return w;
  };

  // Init live worker; re-runs only when enginePath changes
  useEffect(() => {
    const w = initLiveWorker(settings.enginePath);
    return () => {
      if (liveTimer.current) clearTimeout(liveTimer.current);
      w.terminate();
    };
  }, [settings.enginePath]);

  const sendLive = (newFen) => {
    currentFenRef.current = newFen;
    if (liveTimer.current) clearTimeout(liveTimer.current);
    setLiveLoading(true); setLiveBestMove(null); setLivePv([]);
    liveTimer.current = setTimeout(() => {
      if (!workerRef.current || analMode.current === 'batch') return;
      workerRef.current.postMessage('stop');
      workerRef.current.postMessage(`position fen ${newFen}`);
      workerRef.current.postMessage('go depth 20');
    }, 200);
  };



  const fenAtIndex = (hist, idx) => {
    if (idx < 0) return START_FEN;
    const g = new Chess();
    for (let i = 0; i <= idx; i++) g.move(hist[i]);
    return g.fen();
  };

  // ── Batch Analysis ────────────────────────────────────────────────────────
  const analyzeGameWith = async (hist, totalTimeSeconds = DEFAULT_ANALYSIS_TIME_SECONDS) => {
    if (!hist.length || analysing) return;
    setAnalysing(true); setProgress(0);
    analMode.current = 'batch';
    abortAnalysis.current = false;
    if (liveTimer.current) clearTimeout(liveTimer.current);
    workerRef.current.postMessage('stop');
    await new Promise(r => setTimeout(r, 150));
    analResolve.current = null;

    const total = hist.length + 1;
    const evals = [], bests = [], pvs = [];
    const totalBudgetMs = totalTimeSeconds * 1000;
    const startedAt = performance.now();

    const analysePos = (fenStr, moveTimeMs) => new Promise((resolve) => {
      analEval.current = 0; analMove.current = ''; analPv.current = [];
      let settled = false;

      const safetyId = setTimeout(() => {
        if (!settled) { settled = true; analResolve.current = null; resolve(); }
      }, moveTimeMs + 3000);

      // Set resolver BEFORE posting go — fast bestmoves are never missed
      analResolve.current = () => {
        if (!settled) { clearTimeout(safetyId); settled = true; resolve(); }
      };

      workerRef.current.postMessage(`position fen ${fenStr}`);
      workerRef.current.postMessage(`go movetime ${moveTimeMs}`);
    });

    const bookLen = bookLength(hist);
    for (let i = 0; i < total; i++) {
      if (abortAnalysis.current) {
        setAnalysing(false); analMode.current = 'live'; return;
      }
      const pf = fenAtIndex(hist, i - 1);
      const elapsedMs = performance.now() - startedAt;
      const positionsLeft = total - i;
      const remainingBudgetMs = Math.max(MIN_POSITION_TIME_MS, totalBudgetMs - elapsedMs);
      const moveTimeMs = Math.max(MIN_POSITION_TIME_MS, Math.floor(remainingBudgetMs / positionsLeft));
      setAnalysisFen(pf);
      await analysePos(pf, moveTimeMs);
      const c = new Chess(pf);
      evals.push(normalise(analEval.current, c.turn() === 'w'));
      bests.push(analMove.current);
      pvs.push(analPv.current);
      if (i % 3 === 0 || i === total - 1)
        setProgress(Math.round(((i + 1) / total) * 100));
    }

    setPosEvals(evals); setBestMoves(bests); setBatchPvs(pvs);
    const classifs = [];
    const gClassif = new Chess();

    for (let i = 0; i < hist.length; i++) {
      if (abortAnalysis.current) {
        setAnalysing(false); analMode.current = 'live'; return;
      }
      setProgress(Math.round(95 + (i / hist.length) * 5));

      const pf = fenAtIndex(hist, i - 1);
      const gLegal = new Chess(pf);
      const legalMoves = gLegal.moves().length;

      const mv = gClassif.move(hist[i]);
      if (!mv) break;

      const playedUci = mv.from + mv.to + (mv.promotion || '');
      const topMoveUci = bests[i] || '';

      classifs.push(classifyMove(
        pf,
        evals[i], evals[i + 1],
        topMoveUci, playedUci,
        mv.color,
        i < bookLen,
        legalMoves
      ));
    }

    setProgress(100);
    setMoveClassifs(classifs);
    analMode.current = 'live';
    setAnalysing(false); setAnalysisFen(null);
    setMoveIndex(-1);
    setFen(START_FEN);
    sendLive(START_FEN);
  };

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval;
    if (isPlaying && moveIndex < moveHistory.length - 1) {
      interval = setInterval(() => {
        setMoveIndex(prev => {
          if (prev < moveHistory.length - 1) {
            const next = prev + 1;
            const f = fenAtIndex(moveHistory, next);
            setFen(f);
            sendLive(f);
            return next;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 1000);
    } else if (moveIndex >= moveHistory.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, moveIndex, moveHistory]);

  const handleDrop = (sourceSquare, targetSquare) => {
    try {
      if (isPlaying) setIsPlaying(false);
      if (analysing) abortAnalysis.current = true;

      const baseFen = variationFen || fenAtIndex(moveHistory, moveIndex);
      const g = new Chess(baseFen);

      const moveObj = { from: sourceSquare, to: targetSquare };
      const piece = g.get(sourceSquare);
      if (piece && piece.type === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1')) {
        moveObj.promotion = 'q';
      }
      const mv = g.move(moveObj);
      if (!mv) return false;

      const newFen = g.fen();

      if (moveHistory.length > 0 && moveIndex < moveHistory.length - 1) {
        variationFenRef.current = newFen;
        setVariationFen(newFen);
        sendLive(newFen);
        return true;
      }

      const newHistory = [...moveHistory, mv.san];
      currentHistoryRef.current = newHistory;

      variationFenRef.current = null;
      setMoveHistory(newHistory);
      setMoveIndex(newHistory.length - 1);
      setFen(newFen);
      setVariationFen(null);

      setPosEvals([]); setBestMoves([]); setBatchPvs([]); setMoveClassifs([]);
      setOpening(detectOpening(newHistory));
      sendLive(newFen);

      return true;
    } catch { return false; }
  };

  const handleLoadPgn = (pgn) => {
    try {
      if (isPlaying) setIsPlaying(false);
      if (analysing) abortAnalysis.current = true;
      const g = new Chess(); g.loadPgn(pgn);
      const hist = g.history();
      if (!hist.length) return false;
      const headers = g.header();
      setPlayerNames({
        white: headers.White || 'White',
        black: headers.Black || 'Black',
      });
      setOpening(detectOpening(hist, headers));
      setMoveHistory(hist);
      currentHistoryRef.current = hist;
      setMoveIndex(-1);
      setFen(START_FEN);
      setPosEvals([]); setBestMoves([]); setBatchPvs([]); setMoveClassifs([]); setAnalysisFen(null);
      sendLive(START_FEN);
      setTimeout(() => analyzeGameWith(hist), 100);
      return true;
    } catch { return false; }
  };



  const handleReset = () => {
    if (isPlaying) setIsPlaying(false);
    if (analysing) abortAnalysis.current = true;
    analMode.current = 'live';
    if (workerRef.current) workerRef.current.postMessage('stop');

    variationFenRef.current = null;
    setMoveHistory([]);
    currentHistoryRef.current = [];
    setMoveIndex(-1); setFen(START_FEN);
    setPosEvals([]); setBestMoves([]); setBatchPvs([]); setMoveClassifs([]);
    setOpening(null); setAnalysisFen(null);
    sendLive(START_FEN);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0) return;

    let popCount = 1;

    const newHistory = moveHistory.slice(0, moveHistory.length - popCount);
    currentHistoryRef.current = newHistory;
    variationFenRef.current = null;

    setMoveHistory(newHistory);
    setMoveIndex(newHistory.length - 1);

    const newFen = fenAtIndex(newHistory, newHistory.length - 1);
    setFen(newFen);
    setVariationFen(null);
    setOpening(detectOpening(newHistory));

    setPosEvals(prev => prev.slice(0, newHistory.length + 1));
    setBestMoves(prev => prev.slice(0, newHistory.length + 1));
    setBatchPvs(prev => prev.slice(0, newHistory.length + 1));
    setMoveClassifs(prev => prev.slice(0, newHistory.length));

    sendLive(newFen);
  };



  const goTo = (idx) => {
    if (isPlaying) setIsPlaying(false);
    if (idx < -1 || idx >= moveHistory.length) return;
    setVariationFen(null);
    const f = fenAtIndex(moveHistory, idx);
    setMoveIndex(idx); setFen(f); sendLive(f);
  };

  const lastMove = (() => {
    if (moveIndex < 0 || moveIndex >= moveHistory.length) return null;
    try {
      const g = new Chess();
      for (let i = 0; i <= moveIndex; i++) g.move(moveHistory[i]);
      const hist = g.history({ verbose: true });
      const mv = hist[hist.length - 1];
      if (!mv) return null;
      return { from: mv.from, to: mv.to };
    } catch { return null; }
  })();

  useEffect(() => {
    latestEngineRef.current = {
      moveHistory, moveIndex, settings, fen, variationFen,
      sendLive, handleDrop, handleReset,
      setFen, setMoveHistory, setMoveIndex, setVariationFen, setPosEvals,
      setBestMoves, setBatchPvs, setMoveClassifs, setOpening
    };
  });

  return {
    fen, setFen,
    moveHistory, moveIndex,
    liveEval, liveLoading,
    analysing, progress,
    posEvals, bestMoves, batchPvs, moveClassifs,
    analysisFen, variationFen, setVariationFen,
    opening, playerNames,
    liveBestMove, livePv,
    lastMove,
    isPlaying, setIsPlaying,
    settings, updateSetting,
    handleDrop, handleLoadPgn, handleReset, goTo, sendLive,
    handleUndo
  };
}
