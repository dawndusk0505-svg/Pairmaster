import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Lightbulb, Shuffle, Clock, Palette, Trophy, Cloud } from 'lucide-react';
import { MATCH_THEMES, MatchTheme } from '../data/matchThemes';
import { CustomThemeModal } from './CustomThemeModal';
import { soundFx } from '../utils/audio';
import { Grid, Point, findLinkPath, findAvailablePair } from '../utils/linkPathfinder';
import { useFirebase } from '../contexts/FirebaseContext';

interface LinkDifficulty {
  id: 'relaxed' | 'standard';
  label: string;
  innerRows: number;
  innerCols: number;
  starSecondsThreshold: [number, number];
}

const LINK_DIFFICULTIES: LinkDifficulty[] = [
  {
    id: 'relaxed',
    label: '輕鬆 6×4',
    innerRows: 4,
    innerCols: 6,
    starSecondsThreshold: [40, 75],
  },
  {
    id: 'standard',
    label: '標準 8×6',
    innerRows: 6,
    innerCols: 8,
    starSecondsThreshold: [85, 140],
  },
];

function shuffleGridValues(g: Grid, innerRows: number, innerCols: number): Grid {
  const remainingValues: string[] = [];
  const positions: Point[] = [];

  for (let r = 1; r <= innerRows; r++) {
    for (let c = 1; c <= innerCols; c++) {
      const val = g[r]?.[c];
      if (val !== null && val !== undefined) {
        remainingValues.push(val);
        positions.push({ r, c });
      }
    }
  }

  remainingValues.sort(() => Math.random() - 0.5);
  const nextGrid = g.map((row) => [...row]);
  positions.forEach((pos, idx) => {
    nextGrid[pos.r][pos.c] = remainingValues[idx];
  });
  return nextGrid;
}

interface LinkMatchGameProps {
  customTheme?: MatchTheme | null;
  onUpdateCustomTheme?: (theme: MatchTheme) => void;
  onOpenMyRecords?: () => void;
}

export const LinkMatchGame: React.FC<LinkMatchGameProps> = ({
  customTheme = null,
  onUpdateCustomTheme,
  onOpenMyRecords,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<MatchTheme>(MATCH_THEMES[0]);
  const [difficulty, setDifficulty] = useState<LinkDifficulty>(LINK_DIFFICULTIES[1]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [grid, setGrid] = useState<Grid>([]);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [connectingPath, setConnectingPath] = useState<Point[] | null>(null);
  const [hintPair, setHintPair] = useState<{ p1: Point; p2: Point } | null>(null);

  const [score, setScore] = useState(0);
  const [timeSec, setTimeSec] = useState(0);
  const [combo, setCombo] = useState(1);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [remainingTiles, setRemainingTiles] = useState(0);
  const [hintCount, setHintCount] = useState(3);
  const [shuffleCount, setShuffleCount] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { user, getCloudHighScore, saveGameScore } = useFirebase();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);
  const remainingRef = useRef(0);

  const innerRows = difficulty.innerRows;
  const innerCols = difficulty.innerCols;
  const totalRows = innerRows + 2;
  const totalCols = innerCols + 2;

  const availableThemes = customTheme ? [...MATCH_THEMES, customTheme] : MATCH_THEMES;
  const cloudHigh = getCloudHighScore('link', difficulty.id, selectedTheme.id);
  const displayedHighScore = Math.max(highScore, cloudHigh);
  const displayedHighScoreRef = useRef(displayedHighScore);
  displayedHighScoreRef.current = displayedHighScore;

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    try {
      const key = `pairmaster_link_high_${difficulty.id}_${selectedTheme.id}`;
      const saved = localStorage.getItem(key);
      setHighScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setHighScore(0);
    }
  }, [difficulty.id, selectedTheme.id]);

  const initBoard = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    clearAllTimeouts();

    const totalCells = innerRows * innerCols;
    const totalPairs = totalCells / 2;
    const maxKinds = innerRows === 4 ? 8 : 12;
    const sourceItems =
      selectedTheme.items.length >= maxKinds
        ? selectedTheme.items.slice(0, maxKinds)
        : selectedTheme.items;

    const tilePool: string[] = [];
    for (let p = 0; p < totalPairs; p++) {
      const item = sourceItems[p % sourceItems.length];
      tilePool.push(item.id, item.id);
    }

    tilePool.sort(() => Math.random() - 0.5);

    let newGrid: Grid = Array.from({ length: totalRows }, () => Array(totalCols).fill(null));
    let poolIdx = 0;
    for (let r = 1; r <= innerRows; r++) {
      for (let c = 1; c <= innerCols; c++) {
        newGrid[r][c] = tilePool[poolIdx++];
      }
    }

    // Guarantee at least one valid move right from start
    let attempts = 0;
    while (!findAvailablePair(newGrid) && attempts < 10) {
      newGrid = shuffleGridValues(newGrid, innerRows, innerCols);
      attempts++;
    }

    scoreRef.current = 0;
    timeRef.current = 0;
    remainingRef.current = totalCells;
    setGrid(newGrid);
    setSelectedPoint(null);
    setConnectingPath(null);
    setHintPair(null);
    setScore(0);
    setTimeSec(0);
    setCombo(1);
    setIsGameActive(false);
    setIsResolving(false);
    setIsVictory(false);
    setIsNewRecord(false);
    setRemainingTiles(totalCells);
    setHintCount(3);
    setShuffleCount(3);
  }, [selectedTheme, innerRows, innerCols, totalRows, totalCols, clearAllTimeouts]);

  useEffect(() => {
    initBoard();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearAllTimeouts();
    };
  }, [initBoard, clearAllTimeouts]);

  useEffect(() => {
    if (isGameActive && !isVictory) {
      timerRef.current = setInterval(() => {
        setTimeSec((t) => {
          const next = t + 1;
          timeRef.current = next;
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameActive, isVictory]);

  const handleVictory = useCallback(
    (finalScore: number) => {
      setIsVictory(true);
      setIsGameActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      soundFx.playVictory();

      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f472b6', '#fb7185', '#fbbf24', '#a78bfa'],
        });
      } catch {
        // ignore
      }

      const prevBest = displayedHighScoreRef.current;
      setIsNewRecord(finalScore > 0 && finalScore > prevBest);

      const key = `pairmaster_link_high_${difficulty.id}_${selectedTheme.id}`;
      setHighScore((prevHigh) => {
        if (finalScore > prevHigh) {
          try {
            localStorage.setItem(key, finalScore.toString());
          } catch {
            // ignore
          }
          return finalScore;
        }
        return prevHigh;
      });

      if (user && user.emailVerified) {
        const finalTime = timeRef.current;
        const stars =
          finalTime <= difficulty.starSecondsThreshold[0]
            ? 3
            : finalTime <= difficulty.starSecondsThreshold[1]
            ? 2
            : 1;
        void saveGameScore({
          gameMode: 'link',
          themeId: selectedTheme.id,
          themeName: selectedTheme.name,
          difficultyId: difficulty.id,
          score: finalScore,
          timeSec: finalTime,
          stars,
        });
      }
    },
    [difficulty.id, difficulty.starSecondsThreshold, selectedTheme.id, selectedTheme.name, user, saveGameScore]
  );

  const handleManualShuffle = () => {
    if (shuffleCount <= 0 || isVictory || isResolving) return;
    soundFx.playPowerUp();
    setShuffleCount((s) => s - 1);
    setGrid((prev) => {
      let next = shuffleGridValues(prev, innerRows, innerCols);
      let tries = 0;
      while (!findAvailablePair(next) && tries < 10) {
        next = shuffleGridValues(next, innerRows, innerCols);
        tries++;
      }
      return next;
    });
    setSelectedPoint(null);
    setHintPair(null);
    setConnectingPath(null);
  };

  const handleTileClick = (r: number, c: number) => {
    if (isVictory || isResolving || grid[r]?.[c] === null) return;

    if (!isGameActive) {
      setIsGameActive(true);
    }

    soundFx.playCardFlip();
    setHintPair(null);

    if (!selectedPoint) {
      setSelectedPoint({ r, c });
      return;
    }

    if (selectedPoint.r === r && selectedPoint.c === c) {
      setSelectedPoint(null);
      return;
    }

    const val1 = grid[selectedPoint.r][selectedPoint.c];
    const val2 = grid[r][c];

    if (val1 === val2) {
      const path = findLinkPath(grid, selectedPoint, { r, c });
      if (path) {
        setIsResolving(true);
        soundFx.playLinkLine();
        soundFx.playMatchSuccess(combo);
        setConnectingPath(path);

        const currentCombo = combo;
        const pts = 120 + (currentCombo - 1) * 50;
        const nextTotalScore = scoreRef.current + pts;
        scoreRef.current = nextTotalScore;
        setScore(nextTotalScore);
        setCombo((cb) => cb + 1);

        const p1 = selectedPoint;
        const p2 = { r, c };

        scheduleTimeout(() => {
          setConnectingPath(null);
          setSelectedPoint(null);
          setIsResolving(false);

          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[p1.r][p1.c] = null;
            next[p2.r][p2.c] = null;

            // Count remaining tiles accurately on the mutated grid
            let rem = 0;
            for (let ri = 1; ri <= innerRows; ri++) {
              for (let ci = 1; ci <= innerCols; ci++) {
                if (next[ri][ci] !== null) rem++;
              }
            }

            if (rem > 0 && !findAvailablePair(next)) {
              let attempts = 0;
              let reshuffled = shuffleGridValues(next, innerRows, innerCols);
              while (!findAvailablePair(reshuffled) && attempts < 10) {
                reshuffled = shuffleGridValues(reshuffled, innerRows, innerCols);
                attempts++;
              }
              return reshuffled;
            }
            return next;
          });

          const nextRem = Math.max(0, remainingRef.current - 2);
          remainingRef.current = nextRem;
          setRemainingTiles(nextRem);
          if (nextRem <= 0) {
            handleVictory(scoreRef.current);
          }
        }, 240);
        return;
      }
    }

    soundFx.playMismatch();
    setSelectedPoint({ r, c });
    setCombo(1);
  };

  const handleHint = () => {
    if (hintCount <= 0 || isVictory || isResolving) return;
    if (!isGameActive) setIsGameActive(true);
    const pair = findAvailablePair(grid);
    if (pair) {
      soundFx.playPowerUp();
      setHintCount((h) => h - 1);
      setHintPair({ p1: pair.p1, p2: pair.p2 });
    } else {
      handleManualShuffle();
    }
  };

  const getItemMeta = (itemId: string | null) => {
    if (!itemId) return null;
    return selectedTheme.items.find((i) => i.id === itemId);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getStars = () => {
    if (timeSec <= difficulty.starSecondsThreshold[0]) return 3;
    if (timeSec <= difficulty.starSecondsThreshold[1]) return 2;
    return 1;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top HUD with Sweet Pink Design */}
      <div className="bg-white/90 border-2 border-pink-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl shadow-pink-100/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pink-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-xl shadow-xs shrink-0">
              🔗
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900">連連看 · 連線消除</h2>
              <span className="text-xs text-pink-500 font-bold">
                連接兩張相同的圖標（最多兩道轉折）即可消除！
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-pink-50/70 rounded-2xl border border-pink-200/60 shrink-0">
            {LINK_DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setDifficulty(d);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  difficulty.id === d.id
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Selector Strip */}
        <div className="flex items-center gap-1.5 p-1 bg-pink-50/70 rounded-2xl border border-pink-200/60 overflow-x-auto max-w-full">
          {availableThemes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                soundFx.playClick();
                setSelectedTheme(theme);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedTheme.id === theme.id
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <span>{theme.icon}</span>
              <span>{theme.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setIsCustomModalOpen(true);
            }}
            title="自訂專屬公仔卡通牌組"
            className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 bg-white border border-pink-300 text-pink-600 hover:bg-pink-100 shadow-xs"
          >
            <Palette className="w-3.5 h-3.5 text-pink-500" />
            <span>{customTheme ? '編輯自訂' : '自訂公仔'}</span>
          </button>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <span className="text-xs text-pink-600 font-bold block">剩餘方塊</span>
            <span className="text-2xl font-black font-mono tabular-nums text-pink-700">
              {remainingTiles}
            </span>
          </div>

          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <div className="flex items-center justify-center gap-1 text-xs text-pink-600 font-bold">
              <Clock className="w-3.5 h-3.5 text-pink-500" />
              <span>計時時間</span>
            </div>
            <span className="text-2xl font-black font-mono tabular-nums text-slate-800">
              {formatTime(timeSec)}
            </span>
          </div>

          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <span className="text-xs text-pink-600 font-bold block">累積得分</span>
            <span className="text-2xl font-black font-mono tabular-nums text-rose-600">
              {score}
            </span>
          </div>

          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <span className="text-xs text-pink-600 font-bold block">連擊倍率</span>
            <span className="text-2xl font-black font-mono tabular-nums text-pink-500">
              x{combo}
            </span>
          </div>
        </div>

        {/* Personal Best Strip (Visible above board) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-50/90 via-pink-50/80 to-rose-50/70 border border-amber-200/80 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <span>本關最高紀錄：</span>
            <span className="font-mono font-black text-rose-600 text-sm tabular-nums">
              {displayedHighScore > 0 ? `${displayedHighScore} 分` : '尚無紀錄'}
            </span>
            {cloudHigh > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-pink-500">
                <Cloud className="w-3 h-3" />
                <span>雲端同步</span>
              </span>
            )}
          </div>
          {onOpenMyRecords && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onOpenMyRecords();
              }}
              className="text-xs font-black text-pink-600 hover:text-pink-700 underline underline-offset-2 cursor-pointer"
            >
              查看我的全部最高紀錄 →
            </button>
          )}
        </div>

        {/* Action Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHint}
              disabled={hintCount <= 0 || isVictory || isResolving}
              className={`px-3 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                hintCount > 0 && !isResolving
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>智能提示 ({hintCount})</span>
            </button>

            <button
              type="button"
              onClick={handleManualShuffle}
              disabled={shuffleCount <= 0 || isVictory || isResolving}
              className={`px-3 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                shuffleCount > 0 && !isResolving
                  ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-500" />
              <span>隨機洗牌 ({shuffleCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!isGameActive && !isVictory && (
              <span className="text-[11px] text-pink-500 font-bold">點擊任意方塊開始計時 ✨</span>
            )}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                initBoard();
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-pink-700 bg-pink-100/80 hover:bg-pink-200/80 border border-pink-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新開局</span>
            </button>
          </div>
        </div>
      </div>

      {/* Board Layout Container */}
      <div className="bg-white/70 rounded-3xl border-2 border-pink-200/70 p-2 sm:p-4 shadow-lg shadow-pink-100 overflow-hidden">
        {/* Tightly wrapped unpadded relative layer so SVG laser coordinates align dead-center with tiles */}
        <div className="relative w-full">
          {connectingPath && (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none z-30"
            >
              <polyline
                points={connectingPath
                  .map((pt) => {
                    const x = ((pt.c + 0.5) / totalCols) * 100;
                    const y = ((pt.r + 0.5) / totalRows) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
              />
            </svg>
          )}

          <div
            className="grid gap-1 sm:gap-2 select-none"
            style={{
              gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, r) =>
              row.map((cellValue, c) => {
                const isOuterBorder = r === 0 || r === totalRows - 1 || c === 0 || c === totalCols - 1;
                const isSelected = selectedPoint?.r === r && selectedPoint?.c === c;
                const isHinted =
                  (hintPair?.p1.r === r && hintPair?.p1.c === c) ||
                  (hintPair?.p2.r === r && hintPair?.p2.c === c);
                const meta = getItemMeta(cellValue);

                if (isOuterBorder || cellValue === null) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      aria-hidden="true"
                      className="aspect-square rounded-xl flex items-center justify-center pointer-events-none opacity-0"
                    />
                  );
                }

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleTileClick(r, c)}
                    aria-label={meta?.name || '方塊'}
                    className={`aspect-square rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center transition-transform duration-150 cursor-pointer shadow-xs relative group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                      meta?.imageUrl ? 'p-0.5 sm:p-1' : ''
                    } ${
                      isSelected
                        ? 'bg-pink-100 border-pink-500 scale-105 shadow-pink-300/50 shadow-md ring-2 ring-pink-400'
                        : isHinted
                        ? 'bg-amber-100 border-amber-400 animate-pulse ring-2 ring-amber-400'
                        : 'bg-white border-pink-200/90 hover:border-pink-400 hover:bg-pink-50/50'
                    }`}
                  >
                    {meta?.imageUrl ? (
                      <>
                        <div className="w-full flex-1 min-h-0 rounded-lg sm:rounded-xl overflow-hidden bg-pink-50">
                          <img
                            src={meta.imageUrl}
                            alt={meta.name}
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span
                          className={`text-[8px] sm:text-[9px] font-extrabold truncate max-w-full px-0.5 mt-0.5 leading-tight ${
                            isSelected ? 'text-pink-700' : 'text-slate-600'
                          }`}
                        >
                          {meta.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl sm:text-2xl md:text-3xl filter drop-shadow-xs">
                          {meta?.symbol}
                        </span>
                        <span
                          className={`text-[9px] sm:text-[10px] font-extrabold truncate max-w-full px-0.5 mt-0.5 ${
                            isSelected ? 'text-pink-700' : 'text-slate-600'
                          }`}
                        >
                          {meta?.name}
                        </span>
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-pink-600 font-bold px-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span>網格規模：{innerCols} × {innerRows} (共 {innerRows * innerCols} 方塊)</span>
          <span aria-hidden="true">·</span>
          <span>最大 2 道折角路徑</span>
          <span aria-hidden="true">·</span>
          <span>無死角自動重排</span>
        </div>

        {displayedHighScore > 0 && (
          <div className="flex items-center gap-1 text-rose-500">
            <Trophy className="w-3.5 h-3.5" />
            <span>歷史最高分：{displayedHighScore}</span>
          </div>
        )}
      </div>

      {/* Victory Celebration */}
      {isVictory && (
        <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-100 border border-pink-300 flex items-center justify-center text-3xl shadow-sm">
              🎀
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-pink-600 tracking-tight">連連看大圓滿通關！🎉</h2>
              <p className="text-sm text-slate-600 font-medium">眼明手快，全部小方塊都消除光光啦～</p>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 text-3xl text-amber-400">
              {[1, 2, 3].map((starIdx) => (
                <span
                  key={starIdx}
                  className={`transition-transform duration-300 ${
                    starIdx <= getStars() ? 'scale-110 text-amber-400 drop-shadow-sm' : 'text-slate-200'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 bg-pink-50/70 rounded-2xl p-3 border border-pink-200 text-left">
              <div>
                <span className="text-xs text-pink-500 font-bold block">通關總耗時</span>
                <span className="text-lg font-black font-mono text-slate-800 tabular-nums">
                  {formatTime(timeSec)}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-pink-500 font-bold">最終得分</span>
                  {isNewRecord && (
                    <span className="text-[10px] font-black bg-amber-300 text-rose-900 px-1.5 py-0.5 rounded-md">
                      新紀錄！
                    </span>
                  )}
                </div>
                <span className="text-lg font-black font-mono text-rose-500 tabular-nums block">
                  {score} 分
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  個人最高：{Math.max(displayedHighScore, score)} 分
                </span>
              </div>
            </div>

            {user && user.emailVerified && (
              <p className="text-[11px] font-bold text-pink-600 flex items-center justify-center gap-1">
                <Cloud className="w-3.5 h-3.5" />
                <span>已同步儲存至個人雲端與榮譽榜 ✓</span>
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                initBoard();
              }}
              className="w-full py-3 px-4 text-sm font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl transition-all shadow-md shadow-pink-200 cursor-pointer active:scale-95"
            >
              再挑戰一局 🌸
            </button>
          </div>
        </div>
      )}

      {/* Custom Theme Creator Modal */}
      <CustomThemeModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        currentCustomTheme={customTheme}
        onApplyCustomTheme={(newCustom) => {
          onUpdateCustomTheme?.(newCustom);
          setSelectedTheme(newCustom);
        }}
      />
    </div>
  );
};
