import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Lightbulb,
  Shuffle,
  Clock,
  Palette,
  Trophy,
  Cloud,
  Volume2,
  VolumeX,
  Pause,
  Play,
  CalendarDays,
  EyeOff,
} from 'lucide-react';
import { MATCH_THEMES, MatchTheme } from '../data/matchThemes';
import { CustomThemeModal } from './CustomThemeModal';
import { soundFx } from '../utils/audio';
import { Grid, Point, findLinkPath, findAvailablePair } from '../utils/linkPathfinder';
import { useFirebase } from '../contexts/FirebaseContext';
import { usePreloadedThemeImages } from '../utils/imagePreload';
import { seededShuffle } from '../utils/seededRandom';
import { useKingdomProgress } from '../hooks/useKingdomProgress';

interface LinkDifficulty {
  id: 'relaxed' | 'standard' | 'master';
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
  {
    id: 'master',
    label: '大師 10×6',
    innerRows: 6,
    innerCols: 10,
    starSecondsThreshold: [130, 210],
  },
];

function shuffleGridValues(
  g: Grid,
  innerRows: number,
  innerCols: number,
  seedStr?: string
): Grid {
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

  const orderedValues = seedStr
    ? seededShuffle(remainingValues, seedStr)
    : [...remainingValues].sort(() => Math.random() - 0.5);
  const nextGrid = g.map((row) => [...row]);
  positions.forEach((pos, idx) => {
    nextGrid[pos.r][pos.c] = orderedValues[idx];
  });
  return nextGrid;
}

interface FloatingLinkEmoji {
  id: string;
  xPct: number;
  yPct: number;
  emoji: string;
  animClass: 'animate-float-emoji-left' | 'animate-float-emoji-center' | 'animate-float-emoji-right';
}

const CUTE_LINK_EMOJIS = ['💖', '✨', '🌟', '💕', '🌸', '🎀', '💫', '🍭'];
const LINK_TRAJECTORY_CLASSES: FloatingLinkEmoji['animClass'][] = [
  'animate-float-emoji-left',
  'animate-float-emoji-center',
  'animate-float-emoji-right',
];

interface LinkMatchGameProps {
  customTheme?: MatchTheme | null;
  onUpdateCustomTheme?: (theme: MatchTheme) => void;
  onOpenMyRecords?: () => void;
  isActiveTab?: boolean;
}

export const LinkMatchGame: React.FC<LinkMatchGameProps> = ({
  customTheme = null,
  onUpdateCustomTheme,
  onOpenMyRecords,
  isActiveTab = true,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<MatchTheme>(MATCH_THEMES[0]);
  const [difficulty, setDifficulty] = useState<LinkDifficulty>(LINK_DIFFICULTIES[1]);
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [grid, setGrid] = useState<Grid>([]);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [connectingPath, setConnectingPath] = useState<Point[] | null>(null);
  const [hintPair, setHintPair] = useState<{ p1: Point; p2: Point } | null>(null);

  const [score, setScore] = useState(0);
  const [timeSec, setTimeSec] = useState(0);
  const [combo, setCombo] = useState(1);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [remainingTiles, setRemainingTiles] = useState(0);
  const [hintCount, setHintCount] = useState(3);
  const [shuffleCount, setShuffleCount] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(() => soundFx.getIsMuted());

  useEffect(() => {
    return soundFx.subscribe(setIsMuted);
  }, []);

  const [isNewRecord, setIsNewRecord] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingLinkEmoji[]>([]);
  const { todayHkDate, getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();
  const { earnCoins } = useKingdomProgress();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);
  const remainingRef = useRef(0);

  const activeTheme = isDailyMode ? MATCH_THEMES[0] : selectedTheme;
  const activeDifficulty = isDailyMode ? LINK_DIFFICULTIES[1] : difficulty;
  const effectiveThemeId = isDailyMode ? `daily-${todayHkDate}` : activeTheme.id;
  const effectiveThemeName = isDailyMode ? `每日挑戰 ${todayHkDate.slice(5)}` : activeTheme.name;
  const effectiveDifficultyId = isDailyMode ? 'daily' : activeDifficulty.id;

  const innerRows = activeDifficulty.innerRows;
  const innerCols = activeDifficulty.innerCols;
  const totalRows = innerRows + 2;
  const totalCols = innerCols + 2;
  const isMasterGrid = innerCols >= 10;

  const availableThemes = customTheme ? [...MATCH_THEMES, customTheme] : MATCH_THEMES;
  const { isImageFailed } = usePreloadedThemeImages(activeTheme.items);
  const cloudHigh = getCloudHighScore('link', effectiveDifficultyId, effectiveThemeId);
  const displayedHighScore = Math.max(highScore, cloudHigh);
  const publicStageBest = getPublicStageBest('link', effectiveDifficultyId, effectiveThemeId);
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
      const key = `pairmaster_link_high_${effectiveDifficultyId}_${effectiveThemeId}`;
      const saved = localStorage.getItem(key);
      setHighScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setHighScore(0);
    }
  }, [effectiveDifficultyId, effectiveThemeId]);

  const initBoard = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    clearAllTimeouts();

    const totalCells = innerRows * innerCols;
    const totalPairs = totalCells / 2;
    const maxKinds = innerRows === 4 ? 8 : innerCols >= 10 ? 15 : 12;
    const candidateItems = isDailyMode
      ? seededShuffle(activeTheme.items, `${todayHkDate}_link_items`)
      : [...activeTheme.items].sort(() => Math.random() - 0.5);
    const sourceItems =
      candidateItems.length >= maxKinds
        ? candidateItems.slice(0, maxKinds)
        : candidateItems;

    const tilePool: string[] = [];
    for (let p = 0; p < totalPairs; p++) {
      const item = sourceItems[p % sourceItems.length];
      tilePool.push(item.id, item.id);
    }

    const orderedPool = isDailyMode
      ? seededShuffle(tilePool, `${todayHkDate}_link_board`)
      : [...tilePool].sort(() => Math.random() - 0.5);

    let newGrid: Grid = Array.from({ length: totalRows }, () => Array(totalCols).fill(null));
    let poolIdx = 0;
    for (let r = 1; r <= innerRows; r++) {
      for (let c = 1; c <= innerCols; c++) {
        newGrid[r][c] = orderedPool[poolIdx++];
      }
    }

    let attempts = 0;
    while (!findAvailablePair(newGrid) && attempts < 10) {
      newGrid = shuffleGridValues(
        newGrid,
        innerRows,
        innerCols,
        isDailyMode ? `${todayHkDate}_link_retry_${attempts}` : undefined
      );
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
    setIsPaused(false);
    setIsResolving(false);
    setIsVictory(false);
    setIsNewRecord(false);
    setSyncStatus(null);
    setFloatingEmojis([]);
    setRemainingTiles(totalCells);
    setHintCount(3);
    setShuffleCount(3);
  }, [activeTheme, innerRows, innerCols, totalRows, totalCols, isDailyMode, todayHkDate, clearAllTimeouts]);

  useEffect(() => {
    initBoard();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearAllTimeouts();
    };
  }, [initBoard, clearAllTimeouts]);

  // Auto-pause on tab switch or browser minimize
  useEffect(() => {
    if (!isActiveTab && isGameActive && !isVictory) {
      setIsPaused(true);
    }
  }, [isActiveTab, isGameActive, isVictory]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && isGameActive && !isVictory) {
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isGameActive, isVictory]);

  useEffect(() => {
    if (isGameActive && !isVictory && !isPaused) {
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
  }, [isGameActive, isVictory, isPaused]);

  const handleVictory = useCallback(
    (finalScore: number) => {
      setIsVictory(true);
      setIsGameActive(false);
      setIsPaused(false);
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

      const key = `pairmaster_link_high_${effectiveDifficultyId}_${effectiveThemeId}`;
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

      const finalTime = timeRef.current;
      const stars =
        finalTime <= activeDifficulty.starSecondsThreshold[0]
          ? 3
          : finalTime <= activeDifficulty.starSecondsThreshold[1]
          ? 2
          : 1;
      earnCoins(10 + stars * 8 + (isDailyMode ? 12 : 0));
      void saveGameScore({
        gameMode: 'link',
        themeId: effectiveThemeId,
        themeName: effectiveThemeName,
        difficultyId: effectiveDifficultyId,
        score: finalScore,
        timeSec: finalTime,
        stars,
      }).then((status) => {
        setSyncStatus(status);
      });
    },
    [
      effectiveDifficultyId,
      effectiveThemeId,
      effectiveThemeName,
      activeDifficulty.starSecondsThreshold,
      isDailyMode,
      earnCoins,
      saveGameScore,
    ]
  );

  const handleManualShuffle = () => {
    if (shuffleCount <= 0 || isVictory || isResolving || isPaused) return;
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
    if (isVictory || isResolving || isPaused || grid[r]?.[c] === null) return;

    if (!isGameActive) {
      setIsGameActive(true);
    }

    setHintPair(null);

    if (!selectedPoint) {
      soundFx.playCardFlip();
      setSelectedPoint({ r, c });
      return;
    }

    if (selectedPoint.r === r && selectedPoint.c === c) {
      soundFx.playCardFlip();
      setSelectedPoint(null);
      return;
    }

    const val1 = grid[selectedPoint.r][selectedPoint.c];
    const val2 = grid[r][c];

    if (val1 === val2) {
      const path = findLinkPath(grid, selectedPoint, { r, c });
      if (path) {
        setIsResolving(true);
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

        const burstPool = currentCombo >= 2 ? ['🌟', '💖', '👑', '✨', '💕', '🌸'] : CUTE_LINK_EMOJIS;
        const burstPrefix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const spawned: FloatingLinkEmoji[] = [p1, p2].flatMap((pt, ptIdx) => {
          const xPct = ((pt.c + 0.5) / totalCols) * 100;
          const yPct = ((pt.r + 0.5) / totalRows) * 100;
          return LINK_TRAJECTORY_CLASSES.map((animClass, tIdx) => ({
            id: `${burstPrefix}_${ptIdx}_${tIdx}`,
            xPct,
            yPct,
            emoji: burstPool[Math.floor(Math.random() * burstPool.length)],
            animClass,
          }));
        });
        const spawnedIds = new Set(spawned.map((s) => s.id));
        setFloatingEmojis((prev) => [...prev, ...spawned]);
        scheduleTimeout(() => {
          setFloatingEmojis((prev) => prev.filter((item) => !spawnedIds.has(item.id)));
        }, 950);

        scheduleTimeout(() => {
          setConnectingPath(null);
          setSelectedPoint(null);
          setIsResolving(false);

          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[p1.r][p1.c] = null;
            next[p2.r][p2.c] = null;

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
    if (hintCount <= 0 || isVictory || isResolving || isPaused) return;
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
    return activeTheme.items.find((i) => i.id === itemId);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getStars = () => {
    if (timeSec <= activeDifficulty.starSecondsThreshold[0]) return 3;
    if (timeSec <= activeDifficulty.starSecondsThreshold[1]) return 2;
    return 1;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top HUD with Sweet Pink Design */}
      <div className="bg-white/90 border-2 border-pink-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl shadow-pink-100/50">
        <div className="space-y-3 border-b border-pink-100 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsDailyMode((prev) => !prev);
              }}
              className={`px-3.5 py-2 text-xs font-black rounded-2xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                isDailyMode
                  ? 'bg-gradient-to-r from-amber-400 via-rose-400 to-pink-500 text-white border-amber-300'
                  : 'bg-amber-50/80 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>
                {isDailyMode ? `🌟 今日每日挑戰 (${todayHkDate})` : '切換「今日每日挑戰 🌟」'}
              </span>
            </button>
          </div>

          {!isDailyMode && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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

              <div className="flex items-center gap-1 p-1 bg-pink-50/70 rounded-2xl border border-pink-200/60 overflow-x-auto max-w-full shrink-0">
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
          )}
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
              {isPaused && (
                <span className="text-xs text-amber-600 ml-1 font-sans">已暫停</span>
              )}
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

        {/* Stage Public Best & Personal Best Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-pink-50/80 to-rose-50/70 border border-amber-200/80 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{isDailyMode ? '今日全服第一：' : '全服本關最高：'}</span>
              <span className="font-mono font-black text-amber-600 text-sm tabular-nums">
                {publicStageBest ? `${publicStageBest.highScore} 分` : '尚無人上榜'}
              </span>
              {publicStageBest && (
                <span className="text-[11px] font-bold text-slate-500">
                  （{publicStageBest.displayName}）
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">|</span>
              <span>我的最高：</span>
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
              disabled={hintCount <= 0 || isVictory || isResolving || isPaused}
              className={`px-3 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                hintCount > 0 && !isResolving && !isPaused
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
              disabled={shuffleCount <= 0 || isVictory || isResolving || isPaused}
              className={`px-3 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                shuffleCount > 0 && !isResolving && !isPaused
                  ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-500" />
              <span>隨機洗牌 ({shuffleCount})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isGameActive && !isVictory && (
              <span className="text-[11px] text-pink-500 font-bold">點擊任意方塊開始計時 ✨</span>
            )}
            {isGameActive && !isVictory && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setIsPaused((p) => !p);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                  isPaused
                    ? 'text-white bg-amber-500 hover:bg-amber-600 border-amber-500'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? '繼續遊戲' : '暫停'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const muted = soundFx.toggleMute();
                if (!muted) soundFx.playClick();
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 ${
                isMuted
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
              }`}
              title={isMuted ? '目前為靜音狀態，點擊開啟遊戲音效' : '遊戲音效開啟中，點擊可靜音'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span className="hidden sm:inline">{isMuted ? '已靜音' : '音效開'}</span>
            </button>
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

      {/* Board Layout Container with Anti-Peek Pause Overlay */}
      <div className="relative bg-white/70 rounded-3xl border-2 border-pink-200/70 p-1.5 sm:p-4 shadow-lg shadow-pink-100 overflow-visible">
        <div className={`relative w-full transition-[filter] duration-200 ${isPaused ? 'blur-xl pointer-events-none' : ''}`}>
          {floatingEmojis.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-40 overflow-visible" aria-hidden="true">
              {floatingEmojis.map((fx) => (
                <span
                  key={fx.id}
                  style={{ left: `${fx.xPct}%`, top: `${fx.yPct}%` }}
                  className={`absolute select-none text-lg sm:text-2xl drop-shadow-sm ${fx.animClass}`}
                >
                  {fx.emoji}
                </span>
              ))}
            </div>
          )}

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
            className={`grid select-none ${isMasterGrid ? 'gap-0.5 sm:gap-1.5' : 'gap-1 sm:gap-2'}`}
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
                    className={`aspect-square rounded-lg sm:rounded-2xl border-2 flex flex-col items-center justify-center transition-transform duration-150 cursor-pointer shadow-xs relative group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                      meta?.imageUrl ? (isMasterGrid ? 'p-0.5' : 'p-0.5 sm:p-1') : ''
                    } ${
                      isSelected
                        ? 'bg-pink-100 border-pink-500 scale-105 shadow-pink-300/50 shadow-md ring-2 ring-pink-400'
                        : isHinted
                        ? 'bg-amber-100 border-amber-400 animate-pulse ring-2 ring-amber-400'
                        : 'bg-white border-pink-200/90 hover:border-pink-400 hover:bg-pink-50/50'
                    }`}
                  >
                    {meta?.imageUrl && !isImageFailed(meta.imageUrl) ? (
                      <>
                        <div className="relative w-full flex-1 min-h-0 rounded-md sm:rounded-xl overflow-hidden bg-pink-50 flex items-center justify-center">
                          <span
                            aria-hidden="true"
                            className={`absolute inset-0 flex items-center justify-center ${
                              isMasterGrid ? 'text-sm sm:text-xl' : 'text-lg sm:text-2xl'
                            } select-none opacity-80`}
                          >
                            {meta.symbol}
                          </span>
                          <img
                            src={meta.imageUrl}
                            alt={meta.name}
                            loading="eager"
                            decoding="sync"
                            referrerPolicy="no-referrer"
                            className="relative z-10 w-full h-full object-cover"
                          />
                        </div>
                        <span
                          className={`${
                            isMasterGrid ? 'hidden sm:block text-[8px]' : 'text-[8px] sm:text-[9px]'
                          } font-extrabold truncate max-w-full px-0.5 mt-0.5 leading-tight ${
                            isSelected ? 'text-pink-700' : 'text-slate-600'
                          }`}
                        >
                          {meta.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className={`${
                            isMasterGrid ? 'text-base sm:text-2xl' : 'text-xl sm:text-2xl md:text-3xl'
                          } filter drop-shadow-xs`}
                        >
                          {meta?.symbol}
                        </span>
                        <span
                          className={`${
                            isMasterGrid ? 'hidden sm:block text-[8px]' : 'text-[9px] sm:text-[10px]'
                          } font-extrabold truncate max-w-full px-0.5 mt-0.5 ${
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

        {/* Frosted Anti-Peek Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-20 rounded-3xl bg-white/80 backdrop-blur-lg border-2 border-pink-300 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <span className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
              <EyeOff className="w-7 h-7" />
            </span>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">連連看已暫停 · 防偷看保護中</h3>
              <p className="text-xs font-bold text-slate-500">
                計時器已暫停，準備好隨時繼續連線消除！
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsPaused(false);
              }}
              className="px-6 py-2.5 text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl shadow-md shadow-pink-200 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4" />
              <span>繼續遊戲</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-pink-600 font-bold px-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span>主題：{effectiveThemeName}</span>
          <span aria-hidden="true">·</span>
          <span>網格規模：{innerCols} × {innerRows} (共 {innerRows * innerCols} 方塊)</span>
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
              <h2 className="text-2xl font-black text-pink-600 tracking-tight">
                {isDailyMode ? '今日連連看挑戰通關！🎉' : '連連看大圓滿通關！🎉'}
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                {isDailyMode
                  ? `已完成 ${todayHkDate} 全服同盤連連看！`
                  : '眼明手快，全部小方塊都消除光光啦～'}
              </p>
            </div>

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

            {syncStatus && (
              <p className="text-[11px] font-bold text-pink-600 flex items-center justify-center gap-1">
                <Cloud className="w-3.5 h-3.5" />
                <span>
                  {syncStatus === 'cloud'
                    ? '已同步儲存至個人雲端與榮譽榜 ✓'
                    : syncStatus === 'anonymous'
                    ? '已以「唔知邊個(unknown)」登上全服榮譽榜 ✨'
                    : '已儲存至本機最高紀錄 ✓'}
                </span>
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
