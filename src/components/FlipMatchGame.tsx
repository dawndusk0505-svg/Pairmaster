import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Zap,
  Shuffle,
  Trophy,
  Clock,
  Flame,
  Palette,
  Cloud,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Sparkles,
  Shield,
  CalendarDays,
  EyeOff,
} from 'lucide-react';
import { MATCH_THEMES, DIFFICULTY_PRESETS, DifficultyConfig, MatchTheme } from '../data/matchThemes';
import { CustomThemeModal } from './CustomThemeModal';
import { soundFx } from '../utils/audio';
import { useFirebase } from '../contexts/FirebaseContext';
import { usePreloadedThemeImages } from '../utils/imagePreload';
import { seededShuffle } from '../utils/seededRandom';
import { useKingdomProgress } from '../hooks/useKingdomProgress';

type CardFlipPhase = 'none' | 'opening' | 'mismatch_wait' | 'folding_in' | 'unfolding_back';

interface CardItem {
  uid: string;
  id: string;
  name: string;
  symbol: string;
  color: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
  flipPhase?: CardFlipPhase;
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
  isActiveTab?: boolean;
}

export const FlipMatchGame: React.FC<FlipMatchGameProps> = ({
  customTheme = null,
  onUpdateCustomTheme,
  onOpenMyRecords,
  isActiveTab = true,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<MatchTheme>(MATCH_THEMES[0]);
  const [difficulty, setDifficulty] = useState<DifficultyConfig>(DIFFICULTY_PRESETS[1]); // Default 4x4 (16 cards)
  const [isDailyMode, setIsDailyMode] = useState(false);
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
  const [isPaused, setIsPaused] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [freezeSeconds, setFreezeSeconds] = useState(0);

  // Fair Power-up charges
  const [freezeCharges, setFreezeCharges] = useState(1);
  const [shuffleCharges, setShuffleCharges] = useState(1);
  const [resonanceCharges, setResonanceCharges] = useState(1);
  const [resonanceIndices, setResonanceIndices] = useState<number[]>([]);
  const [shieldCharges, setShieldCharges] = useState(1);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [shieldNotice, setShieldNotice] = useState(false);

  // High score
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingMatchEmoji[]>([]);
  const [isMuted, setIsMuted] = useState(() => soundFx.getIsMuted());
  const { todayHkDate, getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();
  const { earnCoins } = useKingdomProgress();

  useEffect(() => {
    return soundFx.subscribe(setIsMuted);
  }, []);

  const activeTheme = isDailyMode ? MATCH_THEMES[0] : selectedTheme;
  const activeDifficulty = isDailyMode ? DIFFICULTY_PRESETS[1] : difficulty;
  const effectiveThemeId = isDailyMode ? `daily-${todayHkDate}` : activeTheme.id;
  const effectiveThemeName = isDailyMode ? `每日挑戰 ${todayHkDate.slice(5)}` : activeTheme.name;
  const effectiveDifficultyId = isDailyMode ? 'daily' : activeDifficulty.id;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flippedIndicesRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const secondsRef = useRef(0);
  const movesRef = useRef(0);
  const maxComboRef = useRef(1);
  const matchedPairsRef = useRef(0);
  const isShieldActiveRef = useRef(false);
  isShieldActiveRef.current = isShieldActive;

  const availableThemes = customTheme ? [...MATCH_THEMES, customTheme] : MATCH_THEMES;
  const { isImageFailed } = usePreloadedThemeImages(activeTheme.items);
  const cloudHigh = getCloudHighScore('flip', effectiveDifficultyId, effectiveThemeId);
  const displayedHighScore = Math.max(highScore, cloudHigh);
  const publicStageBest = getPublicStageBest('flip', effectiveDifficultyId, effectiveThemeId);
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
      const key = `pairmaster_high_${effectiveDifficultyId}_${effectiveThemeId}`;
      const saved = localStorage.getItem(key);
      setHighScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setHighScore(0);
    }
  }, [effectiveDifficultyId, effectiveThemeId]);

  const initGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    clearAllTimeouts();

    const neededPairs = activeDifficulty.totalCards / 2;
    const shuffledThemeItems = isDailyMode
      ? seededShuffle(activeTheme.items, `${todayHkDate}_flip_items`)
      : [...activeTheme.items].sort(() => Math.random() - 0.5);

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

    const shuffledDeck = isDailyMode
      ? seededShuffle(deck, `${todayHkDate}_flip_deck`)
      : deck.sort(() => Math.random() - 0.5);

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
    setIsPaused(false);
    setIsVictory(false);
    setIsNewRecord(false);
    setSyncStatus(null);
    setFloatingEmojis([]);
    setIsResolving(false);
    setFreezeSeconds(0);
    setFreezeCharges(1);
    setShuffleCharges(1);
    setResonanceCharges(1);
    setResonanceIndices([]);
    setShieldCharges(1);
    setIsShieldActive(false);
    setShieldNotice(false);
  }, [activeDifficulty, activeTheme, isDailyMode, todayHkDate, clearAllTimeouts]);

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearAllTimeouts();
    };
  }, [initGame, clearAllTimeouts]);

  // Auto-pause when switching tabs or minimizing browser/app
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

      const key = `pairmaster_high_${effectiveDifficultyId}_${effectiveThemeId}`;
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
        finalMoves <= activeDifficulty.starMovesThreshold[0]
          ? 3
          : finalMoves <= activeDifficulty.starMovesThreshold[1]
          ? 2
          : 1;
      earnCoins(10 + stars * 8 + (isDailyMode ? 12 : 0));
      void saveGameScore({
        gameMode: 'flip',
        themeId: effectiveThemeId,
        themeName: effectiveThemeName,
        difficultyId: effectiveDifficultyId,
        score: finalScore,
        timeSec: secondsRef.current,
        maxCombo: maxComboRef.current,
        stars,
      }).then((status) => {
        setSyncStatus(status);
      });
    },
    [
      effectiveDifficultyId,
      effectiveThemeId,
      effectiveThemeName,
      activeDifficulty.starMovesThreshold,
      isDailyMode,
      earnCoins,
      scheduleTimeout,
      saveGameScore,
    ]
  );

  const handleCardClick = (index: number) => {
    if (isResolving || isVictory || isPaused) return;
    const clickedCard = cards[index];
    if (!clickedCard || clickedCard.isMatched || clickedCard.isFlipped) return;
    if (flippedIndicesRef.current.length >= 2) return;

    if (!isGameActive) {
      setIsGameActive(true);
    }

    const newFlipped = [...flippedIndicesRef.current, index];
    flippedIndicesRef.current = newFlipped;
    setFlippedIndices(newFlipped);
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isFlipped: true, flipPhase: 'opening' } : c))
    );

    if (newFlipped.length === 1) {
      soundFx.playCardFlip();
      scheduleTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) => (i === index && c.flipPhase === 'opening' ? { ...c, flipPhase: 'none' } : c))
        );
      }, 230);
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
              i === firstIdx || i === secondIdx
                ? { ...c, isMatched: true, isFlipped: true, flipPhase: 'none' }
                : c
            )
          );
          flippedIndicesRef.current = [];
          setFlippedIndices([]);
          setIsResolving(false);

          const nextMatched = matchedPairsRef.current + 1;
          matchedPairsRef.current = nextMatched;
          setMatchedPairs(nextMatched);
          if (nextMatched === activeDifficulty.totalCards / 2) {
            handleVictory(scoreRef.current);
          }
        }, 280);
      } else {
        soundFx.playMismatch();
        if (isShieldActiveRef.current) {
          setIsShieldActive(false);
          setShieldNotice(true);
          scheduleTimeout(() => setShieldNotice(false), 1800);
        } else {
          setCombo(1);
        }

        setCards((prev) =>
          prev.map((c, i) =>
            i === firstIdx || i === secondIdx ? { ...c, flipPhase: 'mismatch_wait' } : c
          )
        );

        scheduleTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, flipPhase: 'folding_in' } : c
            )
          );
        }, 460);

        scheduleTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx
                ? { ...c, isFlipped: false, flipPhase: 'unfolding_back' }
                : c
            )
          );
        }, 670);

        scheduleTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, flipPhase: 'none' } : c
            )
          );
          flippedIndicesRef.current = [];
          setFlippedIndices([]);
          setIsResolving(false);
        }, 880);
      }
    }
  };

  const handleFreezePowerUp = () => {
    if (freezeCharges <= 0 || isVictory || isPaused || freezeSeconds > 0) return;
    soundFx.playPowerUp();
    setFreezeCharges((f) => f - 1);
    setFreezeSeconds(8);
  };

  const handleShufflePowerUp = () => {
    if (shuffleCharges <= 0 || isVictory || isPaused || isResolving || flippedIndicesRef.current.length > 0) return;
    soundFx.playPowerUp();
    setShuffleCharges((s) => s - 1);

    const unmatched = cards.filter((c) => !c.isMatched);
    const shuffledUnmatched = [...unmatched].sort(() => Math.random() - 0.5);

    let uIdx = 0;
    setCards((prev) =>
      prev.map((c) => {
        if (!c.isMatched) {
          const rep = shuffledUnmatched[uIdx++];
          return { ...rep, isFlipped: false, flipPhase: 'none' };
        }
        return c;
      })
    );
  };

  // Fair resonance power-up: highlights card backs of 1 matching pair without revealing their faces
  const handleResonancePowerUp = () => {
    if (resonanceCharges <= 0 || isVictory || isPaused || isResolving || flippedIndicesRef.current.length > 0) return;

    const byId = new Map<string, number[]>();
    cards.forEach((c, idx) => {
      if (!c.isMatched && !c.isFlipped) {
        const arr = byId.get(c.id) || [];
        arr.push(idx);
        byId.set(c.id, arr);
      }
    });

    const candidates = Array.from(byId.values()).filter((pair) => pair.length >= 2);
    if (candidates.length === 0) return;

    if (!isGameActive) setIsGameActive(true);
    soundFx.playPowerUp();
    setResonanceCharges((r) => r - 1);

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setResonanceIndices([picked[0], picked[1]]);
    scheduleTimeout(() => {
      setResonanceIndices([]);
    }, 1700);
  };

  const handleShieldPowerUp = () => {
    if (shieldCharges <= 0 || isShieldActive || isVictory || isPaused) return;
    soundFx.playPowerUp();
    setShieldCharges((s) => s - 1);
    setIsShieldActive(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStars = () => {
    if (moves <= activeDifficulty.starMovesThreshold[0]) return 3;
    if (moves <= activeDifficulty.starMovesThreshold[1]) return 2;
    return 1;
  };

  const totalPairs = activeDifficulty.totalCards / 2;
  const accuracy = moves > 0 ? Math.min(Math.round((totalPairs / moves) * 100), 100) : 100;

  const getGridColsClass = () => {
    if (activeDifficulty.cols === 4) return 'grid-cols-4 gap-3 sm:gap-4';
    if (activeDifficulty.cols === 6) {
      return activeDifficulty.totalCards >= 36
        ? 'grid-cols-6 gap-1.5 sm:gap-3'
        : 'grid-cols-4 sm:grid-cols-6 gap-2.5 sm:gap-3.5';
    }
    return 'grid-cols-4 gap-3 sm:gap-4';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner & Control Deck with Sweet Pink Style */}
      <div className="bg-white/90 border-2 border-pink-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl shadow-pink-100/50">
        {/* Daily Challenge Strip + Theme & Difficulty Selectors */}
        <div className="space-y-3 border-b border-pink-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsDailyMode((prev) => !prev);
              }}
              className={`px-3.5 py-2 text-xs font-black rounded-2xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isDailyMode
                  ? 'bg-gradient-to-r from-amber-400 via-rose-400 to-pink-500 text-white border-amber-300 shadow-amber-200/60'
                  : 'bg-amber-50/80 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>
                {isDailyMode
                  ? `🌟 今日每日挑戰 (${todayHkDate}) · 全服同盤進行中`
                  : `切換「今日每日挑戰 🌟」（全服同盤競技）`}
              </span>
            </button>

            {isDailyMode && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                固定 4×4 糖果萌星盤面 · 每日香港 00:00 更新
              </span>
            )}
          </div>

          {!isDailyMode && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          )}
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
              {isPaused && (
                <span className="text-xs text-amber-600 ml-1 font-sans">已暫停</span>
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

        {shieldNotice && (
          <div
            role="status"
            className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black text-center animate-in fade-in duration-150"
          >
            🛡️ 連擊護盾生效！成功保住目前連擊倍率 x{combo} ✨
          </div>
        )}

        {/* Row 3: Power-ups Toolbar, Pause & Restart */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs text-pink-500 font-bold hidden sm:inline">🌸 萌趣錦囊：</span>
            <button
              type="button"
              onClick={handleResonancePowerUp}
              disabled={resonanceCharges <= 0 || isVictory || isPaused || isResolving || flippedIndices.length > 0}
              title="於卡背閃爍提示一對未配對卡牌位置（唔會偷睇卡面）"
              className={`px-2.5 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                resonanceCharges > 0 && flippedIndices.length === 0 && !isPaused
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>甜蜜共鳴 ({resonanceCharges})</span>
            </button>

            <button
              type="button"
              onClick={handleShieldPowerUp}
              disabled={shieldCharges <= 0 || isShieldActive || isVictory || isPaused}
              title="下一次翻錯牌唔會中斷連擊倍率"
              className={`px-2.5 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isShieldActive
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                  : shieldCharges > 0 && !isPaused
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isShieldActive ? '護盾啟動中' : `連擊護盾 (${shieldCharges})`}</span>
            </button>

            <button
              type="button"
              onClick={handleFreezePowerUp}
              disabled={freezeCharges <= 0 || isVictory || isPaused || freezeSeconds > 0}
              title="時鐘暫停 8 秒"
              className={`px-2.5 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                freezeCharges > 0 && freezeSeconds === 0 && !isPaused
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
              disabled={shuffleCharges <= 0 || isVictory || isPaused || isResolving || flippedIndices.length > 0}
              title="重洗未配對卡牌（須先完成當前翻牌）"
              className={`px-2.5 py-1.5 text-xs rounded-xl border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                shuffleCharges > 0 && flippedIndices.length === 0 && !isPaused
                  ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-500" />
              <span>幻境重排 ({shuffleCharges})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isGameActive && !isVictory && moves === 0 && (
              <span className="text-[11px] text-pink-500 font-bold">點擊任意卡片開始計時 ✨</span>
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

      {/* Card Arena Grid with Anti-Peek Pause Shield */}
      <div className="relative">
        <div
          className={`grid ${getGridColsClass()} select-none p-2.5 sm:p-5 bg-white/70 rounded-3xl border-2 border-pink-200/70 shadow-lg shadow-pink-100 min-h-[320px] sm:min-h-[420px] transition-[filter] duration-200 ${
            isPaused ? 'blur-xl pointer-events-none' : ''
          }`}
        >
          {cards.map((card, index) => {
            const isFaceUp = card.isFlipped || card.isMatched;
            const isCompactGrid = activeDifficulty.totalCards >= 36;
            const imgFailed = isImageFailed(card.imageUrl);
            const showFrontFace = isFaceUp || card.flipPhase === 'folding_in';
            const isResonating = !isFaceUp && resonanceIndices.includes(index);
            const animClass =
              card.flipPhase === 'opening'
                ? 'animate-card-flip-open'
                : card.flipPhase === 'folding_in'
                ? 'animate-card-fold-inward'
                : card.flipPhase === 'unfolding_back'
                ? 'animate-card-unfold-back'
                : '';

            return (
              <button
                key={card.uid}
                type="button"
                onClick={() => handleCardClick(index)}
                disabled={card.isMatched || isPaused}
                aria-label={isFaceUp ? `${card.name}${card.isMatched ? '（已配對）' : ''}` : `未翻開卡片 ${index + 1}`}
                className={`relative aspect-square rounded-xl sm:rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  card.isMatched
                    ? 'opacity-85 cursor-default'
                    : isFaceUp
                    ? 'cursor-default'
                    : 'cursor-pointer'
                }`}
              >
                {showFrontFace ? (
                  <div
                    className={`w-full h-full rounded-xl sm:rounded-3xl border-2 flex flex-col items-center justify-center shadow-md overflow-hidden ${animClass} ${
                      card.isMatched
                        ? 'bg-rose-50/95 border-pink-400 ring-2 ring-pink-300 text-pink-700'
                        : card.flipPhase === 'mismatch_wait' || card.flipPhase === 'folding_in'
                        ? 'bg-white border-rose-400 ring-2 ring-rose-300/80 text-slate-800'
                        : 'bg-white border-pink-300 text-slate-800'
                    } ${card.imageUrl ? (isCompactGrid ? 'p-1 sm:p-1.5' : 'p-1.5 sm:p-2') : ''}`}
                  >
                    {card.imageUrl && !imgFailed ? (
                      <>
                        <div className="relative w-full flex-1 min-h-0 rounded-lg sm:rounded-2xl overflow-hidden bg-pink-50 flex items-center justify-center">
                          <span
                            aria-hidden="true"
                            className={`absolute inset-0 flex items-center justify-center ${
                              isCompactGrid ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-3xl'
                            } select-none opacity-80`}
                          >
                            {card.symbol}
                          </span>
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            loading="eager"
                            decoding="sync"
                            referrerPolicy="no-referrer"
                            className="relative z-10 w-full h-full object-cover"
                          />
                          {card.isMatched && (
                            <div className="absolute inset-0 z-20 bg-pink-500/15 flex items-center justify-center">
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
                ) : (
                  <div
                    className={`w-full h-full rounded-xl sm:rounded-3xl border-2 flex flex-col items-center justify-center shadow-sm bg-gradient-to-br from-pink-400 via-rose-300 to-pink-300 hover:brightness-105 transition-[filter] ${animClass} ${
                      isResonating
                        ? 'border-amber-300 ring-4 ring-amber-400 animate-pulse shadow-amber-300/80 shadow-lg'
                        : 'border-pink-200'
                    }`}
                  >
                    <div
                      className={`${
                        isCompactGrid ? 'w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm' : 'w-9 h-9 sm:w-10 sm:h-10 text-base'
                      } rounded-2xl bg-white/30 flex items-center justify-center text-white shadow-inner`}
                    >
                      {isResonating ? '✨' : '💖'}
                    </div>
                    <span
                      className={`${
                        isCompactGrid ? 'hidden sm:block text-[9px]' : 'text-[10px]'
                      } text-white/95 font-black mt-1 tracking-widest`}
                    >
                      {isResonating ? '共鳴' : 'PAIR'}
                    </span>
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

        {/* Frosted Anti-Peek Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-20 rounded-3xl bg-white/80 backdrop-blur-lg border-2 border-pink-300 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <span className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
              <EyeOff className="w-7 h-7" />
            </span>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">遊戲已暫停 · 防偷看保護中</h3>
              <p className="text-xs font-bold text-slate-500">
                計時器已停止！切換分頁或接聽電話都唔怕漏秒數～
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

      {/* Spirit Collection Preview Strip (when Candy Spirits theme is active) */}
      {activeTheme.id === 'candy-spirits' && (
        <div className="bg-white/80 border-2 border-pink-200/70 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-pink-600">
                🍬 糖果萌星全圖鑑（{activeTheme.items.length} 款精靈與用具）
              </span>
              <span className="text-xs text-slate-500 font-bold">
                25 位精靈 × 11 款精靈用具與水果化身
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-2">
            {activeTheme.items.map((spirit) => (
              <div key={spirit.id} className="flex flex-col items-center text-center group">
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
          <span>主題：{effectiveThemeName}</span>
          <span aria-hidden="true">·</span>
          <span>難度：{isDailyMode ? '每日挑戰 (4x4)' : activeDifficulty.label}</span>
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
              <h2 className="text-2xl font-black text-pink-600 tracking-tight">
                {isDailyMode ? '今日每日挑戰通關！🎉' : '配對大獲全勝！🎉'}
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                {isDailyMode
                  ? `你已完成 ${todayHkDate} 全服同盤挑戰，快去榜單睇下自己排第幾！`
                  : '太厲害了！你的記憶力與專注度簡直滿分'}
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
