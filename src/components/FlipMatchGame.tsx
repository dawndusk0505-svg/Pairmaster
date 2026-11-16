import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Eye, Zap, Shuffle, Trophy, Clock, Flame, Palette, Cloud, Volume2, VolumeX } from 'lucide-react';
import { MATCH_THEMES, DIFFICULTY_PRESETS, DifficultyConfig, MatchTheme } from '../data/matchThemes';
import { CustomThemeModal } from './CustomThemeModal';
import { soundFx } from '../utils/audio';
import { useFirebase } from '../contexts/FirebaseContext';

interface CardItem {
  uid: string;
  id: string;
  name: string;
  symbol: string;
  color: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface FloatingMatchEmoji {
  id: string;
  cardIndex: number;
  emoji: string;
  animClass: 'animate-float-emoji-left' | 'animate-float-emoji-center' | 'animate-float-emoji-right';
}

const CUTE_MATCH_EMOJIS = ['💖', '✨', '🌟', '💕', '🌸', '🎀', '💫', '🍬'];
const TRAJECTORY_CLASSES: FloatingMatchEmoji['animClass'][] = [
  'animate-float-emoji-left',
  'animate-float-emoji-center',
  'animate-float-emoji-right',
];

interface FlipMatchGameProps {
  customTheme?: MatchTheme | null;
  onUpdateCustomTheme?: (theme: MatchTheme) => void;
  onOpenMyRecords?: () => void;
}

export const FlipMatchGame: React.FC<FlipMatchGameProps> = ({
  customTheme = null,
  onUpdateCustomTheme,
  onOpenMyRecords,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<MatchTheme>(MATCH_THEMES[0]);
  const [difficulty, setDifficulty] = useState<DifficultyConfig>(DIFFICULTY_PRESETS[1]); // Default 4x4 (16 cards)
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [score, setScore] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [freezeSeconds, setFreezeSeconds] = useState(0);

  // Power-up charges
  const [peekCharges, setPeekCharges] = useState(1);
  const [freezeCharges, setFreezeCharges] = useState(1);
  const [shuffleCharges, setShuffleCharges] = useState(1);

  // High score
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingMatchEmoji[]>([]);
  const [isMuted, setIsMuted] = useState(() => soundFx.getIsMuted());
  const { getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();

  useEffect(() => {
    return soundFx.subscribe(setIsMuted);
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flippedIndicesRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const secondsRef = useRef(0);
  const movesRef = useRef(0);
  const maxComboRef = useRef(1);
  const matchedPairsRef = useRef(0);

  const availableThemes = customTheme ? [...MATCH_THEMES, customTheme] : MATCH_THEMES;
  const cloudHigh = getCloudHighScore('flip', difficulty.id, selectedTheme.id);
  const displayedHighScore = Math.max(highScore, cloudHigh);
  const publicStageBest = getPublicStageBest('flip', difficulty.id, selectedTheme.id);
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
      const key = `pairmaster_high_${difficulty.id}_${selectedTheme.id}`;
      const saved = localStorage.getItem(key);
      setHighScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setHighScore(0);
    }
  }, [difficulty.id, selectedTheme.id]);

  const initGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    clearAllTimeouts();

    const neededPairs = difficulty.totalCards / 2;
    const shuffledThemeItems = [...selectedTheme.items].sort(() => Math.random() - 0.5);
    const chosenItems = Array.from(
      { length: neededPairs },
      (_, i) => shuffledThemeItems[i % shuffledThemeItems.length]
    );

    const deck: CardItem[] = [];
    chosenItems.forEach((item, index) => {
      deck.push({
        uid: `${item.id}_a_${index}`,
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        color: item.color,
        imageUrl: item.imageUrl,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        uid: `${item.id}_b_${index}`,
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        color: item.color,
        imageUrl: item.imageUrl,
        isFlipped: false,
        isMatched: false,
      });
    });

    const shuffledDeck = deck.sort(() => Math.random() - 0.5);

    flippedIndicesRef.current = [];
    scoreRef.current = 0;
    secondsRef.current = 0;
    movesRef.current = 0;
    maxComboRef.current = 1;
    matchedPairsRef.current = 0;

    setCards(shuffledDeck);
    setFlippedIndices([]);
    setMoves(0);
    setMatchedPairs(0);
    setCombo(1);
    setMaxCombo(1);
    setScore(0);
    setSecondsElapsed(0);
    setIsGameActive(false);
    setIsVictory(false);
    setIsNewRecord(false);
    setSyncStatus(null);
    setFloatingEmojis([]);
    setIsPeeking(false);
    setIsResolving(false);
    setFreezeSeconds(0);
    setPeekCharges(1);
    setFreezeCharges(1);
    setShuffleCharges(1);
  }, [difficulty, selectedTheme, clearAllTimeouts]);

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearAllTimeouts();
    };
  }, [initGame, clearAllTimeouts]);

  useEffect(() => {
    if (isGameActive && !isVictory) {
      timerRef.current = setInterval(() => {
        setFreezeSeconds((prevFreeze) => {
          if (prevFreeze > 0) {
            return prevFreeze - 1;
          }
          setSecondsElapsed((s) => {
            const next = s + 1;
            secondsRef.current = next;
            return next;
          });
          return 0;
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
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f472b6', '#fb7185', '#fbbf24', '#a78bfa', '#38bdf8'],
        });
        scheduleTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }, 250);
      } catch {
        // ignore
      }

      const prevBest = displayedHighScoreRef.current;
      setIsNewRecord(finalScore > 0 && finalScore > prevBest);

      const key = `pairmaster_high_${difficulty.id}_${selectedTheme.id}`;
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

      const finalMoves = movesRef.current;
      const stars =
        finalMoves <= difficulty.starMovesThreshold[0]
          ? 3
          : finalMoves <= difficulty.starMovesThreshold[1]
          ? 2
          : 1;
      void saveGameScore({
        gameMode: 'flip',
        themeId: selectedTheme.id,
        themeName: selectedTheme.name,
        difficultyId: difficulty.id,
        score: finalScore,
        timeSec: secondsRef.current,
        maxCombo: maxComboRef.current,
        stars,
      }).then((status) => {
        setSyncStatus(status);
      });
    },
    [difficulty.id, difficulty.starMovesThreshold, selectedTheme.id, selectedTheme.name, scheduleTimeout, saveGameScore]
  );

  const handleCardClick = (index: number) => {
    if (isPeeking || isResolving || isVictory) return;
    const clickedCard = cards[index];
    if (!clickedCard || clickedCard.isMatched || clickedCard.isFlipped) return;
    if (flippedIndicesRef.current.length >= 2) return;

    if (!isGameActive) {
      setIsGameActive(true);
    }

    const newFlipped = [...flippedIndicesRef.current, index];
    flippedIndicesRef.current = newFlipped;
    setFlippedIndices(newFlipped);
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, isFlipped: true } : c)));

    if (newFlipped.length === 1) {
      soundFx.playCardFlip();
      return;
    }

    if (newFlipped.length === 2) {
      setIsResolving(true);
      movesRef.current += 1;
      setMoves(movesRef.current);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[index];

      if (!firstCard || !secondCard) {
        flippedIndicesRef.current = [];
        setFlippedIndices([]);
        setIsResolving(false);
        return;
      }

      if (firstCard.id === secondCard.id) {
        const currentCombo = combo;
        soundFx.playMatchSuccess(currentCombo);

        const comboBonus = (currentCombo - 1) * 75;
        const speedBonus = Math.max(100 - secondsElapsed * 2, 20);
        const addedScore = 150 + comboBonus + speedBonus;
        const nextTotalScore = scoreRef.current + addedScore;
        scoreRef.current = nextTotalScore;
        setScore(nextTotalScore);

        setCombo((c) => {
          const next = c + 1;
          maxComboRef.current = Math.max(maxComboRef.current, next);
          setMaxCombo(maxComboRef.current);
          return next;
        });

        // Spawn floating cute stars/hearts on both matched cards
        const burstPool = currentCombo >= 2 ? ['🌟', '💖', '👑', '✨', '💕', '🌸'] : CUTE_MATCH_EMOJIS;
        const burstIdPrefix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const spawned: FloatingMatchEmoji[] = [firstIdx, secondIdx].flatMap((cardIndex, cardPos) =>
          TRAJECTORY_CLASSES.map((animClass, tIdx) => ({
            id: `${burstIdPrefix}_${cardPos}_${tIdx}`,
            cardIndex,
            emoji: burstPool[Math.floor(Math.random() * burstPool.length)],
            animClass,
          }))
        );
        const spawnedIds = new Set(spawned.map((s) => s.id));
        setFloatingEmojis((prev) => [...prev, ...spawned]);
        scheduleTimeout(() => {
          setFloatingEmojis((prev) => prev.filter((item) => !spawnedIds.has(item.id)));
        }, 950);

        scheduleTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, isMatched: true, isFlipped: true } : c
            )
          );
          flippedIndicesRef.current = [];
          setFlippedIndices([]);
          setIsResolving(false);

          const nextMatched = matchedPairsRef.current + 1;
          matchedPairsRef.current = nextMatched;
          setMatchedPairs(nextMatched);
          if (nextMatched === difficulty.totalCards / 2) {
            handleVictory(scoreRef.current);
          }
        }, 300);
      } else {
        soundFx.playMismatch();
        setCombo(1);

        scheduleTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c
            )
          );
          flippedIndicesRef.current = [];
          setFlippedIndices([]);
          setIsResolving(false);
        }, 800);
      }
    }
  };

  const handlePeekPowerUp = () => {
    if (peekCharges <= 0 || isPeeking || isResolving || isVictory) return;
    soundFx.playPowerUp();
    setPeekCharges((p) => p - 1);
    setIsPeeking(true);

    setCards((prev) => prev.map((c) => (!c.isMatched ? { ...c, isFlipped: true } : c)));

    scheduleTimeout(() => {
      setCards((prev) =>
        prev.map((c, idx) =>
          !c.isMatched && !flippedIndicesRef.current.includes(idx)
            ? { ...c, isFlipped: false }
            : c
        )
      );
      setIsPeeking(false);
    }, 1300);
  };

  const handleFreezePowerUp = () => {
    if (freezeCharges <= 0 || isVictory || freezeSeconds > 0) return;
    soundFx.playPowerUp();
    setFreezeCharges((f) => f - 1);
    setFreezeSeconds(8);
  };

  const handleShufflePowerUp = () => {
    if (shuffleCharges <= 0 || isVictory || isResolving || flippedIndicesRef.current.length > 0) return;
    soundFx.playPowerUp();
    setShuffleCharges((s) => s - 1);

    const unmatched = cards.filter((c) => !c.isMatched);
    const shuffledUnmatched = [...unmatched].sort(() => Math.random() - 0.5);

    let uIdx = 0;
    setCards((prev) =>
      prev.map((c) => {
        if (!c.isMatched) {
          const rep = shuffledUnmatched[uIdx++];
          return { ...rep, isFlipped: false };
        }
        return c;
      })
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStars = () => {
    if (moves <= difficulty.starMovesThreshold[0]) return 3;
    if (moves <= difficulty.starMovesThreshold[1]) return 2;
    return 1;
  };

  const totalPairs = difficulty.totalCards / 2;
  const accuracy = moves > 0 ? Math.min(Math.round((totalPairs / moves) * 100), 100) : 100;

  const getGridColsClass = () => {
    if (difficulty.cols === 4) return 'grid-cols-4 gap-3 sm:gap-4';
    if (difficulty.cols === 6) {
      return difficulty.totalCards >= 36
        ? 'grid-cols-6 gap-1.5 sm:gap-3'
        : 'grid-cols-4 sm:grid-cols-6 gap-2.5 sm:gap-3.5';
    }
    return 'grid-cols-4 gap-3 sm:gap-4';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner & Control Deck with Sweet Pink Style */}
      <div className="bg-white/90 border-2 border-pink-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl shadow-pink-100/50">
        {/* Row 1: Theme & Difficulty Selectors */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pink-100 pb-4">
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
                    ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-sm shadow-pink-200'
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

          <div className="flex items-center gap-1 p-1 bg-pink-50/70 rounded-2xl border border-pink-200/60 overflow-x-auto max-w-full">
            {DIFFICULTY_PRESETS.map((d) => (
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
                {d.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Live HUD - Score, Moves, Combo, Timer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <span className="text-xs text-pink-600 font-bold block">配對進度</span>
            <span className="text-2xl font-black font-mono tabular-nums text-pink-700">
              {matchedPairs} <span className="text-xs font-normal text-pink-400">/ {totalPairs}</span>
            </span>
          </div>

          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <div className="flex items-center justify-center gap-1 text-xs text-pink-600 font-bold">
              <Clock className="w-3.5 h-3.5 text-pink-500" />
              <span>計時時間</span>
            </div>
            <span className="text-2xl font-black font-mono tabular-nums text-slate-800">
              {formatTime(secondsElapsed)}
              {freezeSeconds > 0 && (
                <span className="text-xs text-cyan-500 ml-1 font-sans">凍結中 {freezeSeconds}s</span>
              )}
            </span>
          </div>

          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <span className="text-xs text-pink-600 font-bold block">翻牌次數</span>
            <span className="text-2xl font-black font-mono tabular-nums text-slate-800">
              {moves}
            </span>
          </div>

          <div className="bg-pink-50/60 rounded-2xl p-3 border border-pink-100">
            <div className="flex items-center justify-center gap-1 text-xs text-pink-600 font-bold">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>積分與連擊</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-rose-600">
                {score}
              </span>
              {combo > 1 && (
                <span className="text-xs font-black text-rose-600">
                  x{combo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stage Public Best & Personal Best Strip (Visible above board) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-pink-50/80 to-rose-50/70 border border-amber-200/80 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span>全服本關最高：</span>
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

        {/* Row 3: Power-ups Toolbar & Restart */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-pink-500 font-bold hidden sm:inline">🌸 萌趣錦囊：</span>
            <button
              type="button"
              onClick={handlePeekPowerUp}
              disabled={peekCharges <= 0 || isPeeking || isResolving || isVictory}
              title="透視卡片 (1.3秒)"
              className={`px-3 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                peekCharges > 0 && !isPeeking && !isResolving
                  ? 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-pink-500" />
              <span>靈視一瞥 ({peekCharges})</span>
            </button>

            <button
              type="button"
              onClick={handleFreezePowerUp}
              disabled={freezeCharges <= 0 || isVictory || freezeSeconds > 0}
              title="時鐘暫停8秒"
              className={`px-3 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                freezeCharges > 0 && freezeSeconds === 0
                  ? 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              <span>時光凍結 ({freezeCharges})</span>
            </button>

            <button
              type="button"
              onClick={handleShufflePowerUp}
              disabled={shuffleCharges <= 0 || isVictory || isResolving || flippedIndices.length > 0}
              title="重洗未配對卡牌（須先完成當前翻牌）"
              className={`px-3 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                shuffleCharges > 0 && flippedIndices.length === 0
                  ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-500" />
              <span>幻境重排 ({shuffleCharges})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!isGameActive && !isVictory && moves === 0 && (
              <span className="text-[11px] text-pink-500 font-bold">點擊任意卡片開始計時 ✨</span>
            )}
            <button
              type="button"
              onClick={() => {
                const muted = soundFx.toggleMute();
                if (!muted) soundFx.playClick();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                isMuted
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
              }`}
              title={isMuted ? '目前為靜音狀態，點擊開啟遊戲音效' : '遊戲音效開啟中，點擊可靜音'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                  <span>已靜音 · 點此開聲</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>音效開</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                initGame();
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-pink-700 bg-pink-100/80 hover:bg-pink-200/80 border border-pink-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新洗牌</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Arena Grid with Cute Rounded Pink Cards */}
      <div
        className={`grid ${getGridColsClass()} select-none p-2.5 sm:p-5 bg-white/70 rounded-3xl border-2 border-pink-200/70 shadow-lg shadow-pink-100 min-h-[320px] sm:min-h-[420px]`}
      >
        {cards.map((card, index) => {
          const isFaceUp = card.isFlipped || card.isMatched;
          const isCompactGrid = difficulty.totalCards >= 36;

          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardClick(index)}
              disabled={card.isMatched}
              aria-label={isFaceUp ? `${card.name}${card.isMatched ? '（已配對）' : ''}` : `未翻開卡片 ${index + 1}`}
              className={`relative aspect-square rounded-xl sm:rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 transition-transform duration-150 ${
                card.isMatched
                  ? 'opacity-80 scale-95 cursor-default'
                  : isFaceUp
                  ? 'cursor-default'
                  : 'cursor-pointer hover:-translate-y-0.5 active:scale-95'
              }`}
            >
              {!isFaceUp ? (
                /* Back Face (Lightweight - no backdrop-blur or hidden GPU image layers) */
                <div className="w-full h-full rounded-xl sm:rounded-3xl border-2 flex flex-col items-center justify-center shadow-sm bg-gradient-to-br from-pink-400 via-rose-300 to-pink-300 border-pink-200">
                  <div
                    className={`${
                      isCompactGrid ? 'w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm' : 'w-9 h-9 text-base'
                    } rounded-full bg-white/35 border border-white/60 flex items-center justify-center text-white shadow-inner`}
                  >
                    💖
                  </div>
                  <span
                    className={`${
                      isCompactGrid ? 'hidden sm:block text-[10px]' : 'text-[11px]'
                    } text-white font-black mt-1 tracking-wider`}
                  >
                    PAIR
                  </span>
                </div>
              ) : (
                /* Front Face (Mounted only when face-up to eliminate VRAM bloat in 6x6) */
                <div
                  className={`w-full h-full rounded-xl sm:rounded-3xl border-2 flex flex-col items-center justify-center shadow-md overflow-hidden animate-in zoom-in-95 duration-150 ${
                    card.isMatched
                      ? 'bg-rose-50/90 border-pink-400 ring-2 ring-pink-300 text-pink-700'
                      : 'bg-white border-pink-300 text-slate-800'
                  } ${card.imageUrl ? (isCompactGrid ? 'p-1 sm:p-1.5' : 'p-1.5 sm:p-2') : ''}`}
                >
                  {card.imageUrl ? (
                    <>
                      <div className="relative w-full flex-1 min-h-0 rounded-lg sm:rounded-2xl overflow-hidden bg-pink-50 flex items-center justify-center">
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {card.isMatched && (
                          <div className="absolute inset-0 bg-pink-500/15 flex items-center justify-center">
                            <span className="text-[10px] sm:text-xs font-black text-white bg-pink-500/90 w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shadow-xs">
                              ✓
                            </span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`${
                          isCompactGrid ? 'hidden sm:block text-[10px]' : 'text-[11px] sm:text-xs'
                        } text-slate-700 font-extrabold mt-0.5 sm:mt-1 tracking-tight truncate max-w-full px-0.5`}
                      >
                        {card.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`${isCompactGrid ? 'text-xl sm:text-3xl' : 'text-3xl sm:text-4xl'} filter drop-shadow-sm`}>
                        {card.symbol}
                      </span>
                      <span
                        className={`${
                          isCompactGrid ? 'hidden sm:block text-[10px]' : 'text-xs sm:text-sm'
                        } text-slate-700 font-extrabold mt-0.5 tracking-tight`}
                      >
                        {card.name}
                      </span>
                      {card.isMatched && (
                        <span className="text-[10px] text-pink-600 font-extrabold mt-0.5">
                          ✓
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
              {floatingEmojis
                .filter((fx) => fx.cardIndex === index)
                .map((fx) => (
                  <span
                    key={fx.id}
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-1/2 top-1/2 z-30 select-none text-xl sm:text-2xl drop-shadow-sm ${fx.animClass}`}
                  >
                    {fx.emoji}
                  </span>
                ))}
            </button>
          );
        })}
      </div>

      {/* Spirit Collection Preview Strip (when Candy Spirits theme is active) */}
      {selectedTheme.id === 'candy-spirits' && (
        <div className="bg-white/80 border-2 border-pink-200/70 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-pink-600">🍬 糖果萌星全圖鑑（12 位小精靈）</span>
              <span className="text-xs text-slate-500 font-bold">海報 3 大主角 × 9 位全新原創夥伴</span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
            {selectedTheme.items.map((spirit) => (
              <div
                key={spirit.id}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-pink-200 bg-pink-50 shadow-xs group-hover:scale-105 group-hover:border-pink-400 transition-transform duration-150">
                  {spirit.imageUrl ? (
                    <img
                      src={spirit.imageUrl}
                      alt={spirit.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {spirit.symbol}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-700 mt-1 truncate w-full">
                  {spirit.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Info Strip */}
      <div className="flex flex-wrap items-center justify-between text-xs text-pink-600 font-bold px-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span>主題：{selectedTheme.name}</span>
          <span aria-hidden="true">·</span>
          <span>難度：{difficulty.label}</span>
          <span aria-hidden="true">·</span>
          <span>最高連擊紀錄：x{maxCombo}</span>
        </div>

        {displayedHighScore > 0 && (
          <div className="flex items-center gap-1 text-rose-500">
            <Trophy className="w-3.5 h-3.5" />
            <span>歷史最高分：{displayedHighScore}</span>
          </div>
        )}
      </div>

      {/* Victory Celebration Modal */}
      {isVictory && (
        <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-100 border border-pink-300 flex items-center justify-center text-3xl shadow-sm">
              👑
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-pink-600 tracking-tight">配對大獲全勝！🎉</h2>
              <p className="text-sm text-slate-600 font-medium">太厲害了！你的記憶力與專注度簡直滿分</p>
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

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 bg-pink-50/70 rounded-2xl p-3 border border-pink-200 text-left">
              <div>
                <span className="text-[11px] text-pink-500 font-bold block">通關時間</span>
                <span className="text-base font-black font-mono text-slate-800 tabular-nums">
                  {formatTime(secondsElapsed)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-pink-500 font-bold block">總翻牌</span>
                <span className="text-base font-black font-mono text-slate-800 tabular-nums">
                  {moves} 次
                </span>
              </div>
              <div>
                <span className="text-[11px] text-pink-500 font-bold block">準確率</span>
                <span className="text-base font-black font-mono text-rose-500 tabular-nums">
                  {accuracy}%
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-400 to-rose-400 rounded-2xl p-3 text-white shadow-md shadow-pink-200 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-bold opacity-90">終局積分</span>
                {isNewRecord && (
                  <span className="text-[11px] font-black bg-amber-300 text-rose-900 px-2 py-0.5 rounded-lg">
                    ✨ 新最高紀錄！
                  </span>
                )}
              </div>
              <span className="text-3xl font-black font-mono tabular-nums block">
                {score}
              </span>
              <span className="text-[11px] font-bold opacity-90 block">
                個人最高紀錄：{Math.max(displayedHighScore, score)} 分
              </span>
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
                initGame();
              }}
              className="w-full py-3 px-4 text-sm font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl transition-all shadow-md shadow-pink-200 cursor-pointer active:scale-95"
            >
              再來一局 🌸
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
