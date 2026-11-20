import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Heart,
  Clock,
  Sparkles,
  Trophy,
  Coins,
  Cloud,
  Shuffle,
  EyeOff,
  Pause,
  Play,
} from 'lucide-react';
import { CANDY_SPIRIT_ITEMS, ThemeItem } from '../../data/matchThemes';
import { SPIRIT_PROP_PAIRINGS, getSpiritById } from '../../data/spiritPairings';
import { soundFx } from '../../utils/audio';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useKingdomProgress } from '../../hooks/useKingdomProgress';

interface SpiritTowerGameProps {
  isActiveTab?: boolean;
  onOpenMyRecords?: () => void;
}

type FloorModifier = 'classic' | 'cp' | 'mist' | 'boss';

interface TowerCard {
  uid: string;
  matchKey: string;
  item: ThemeItem;
  isFlipped: boolean;
  isMatched: boolean;
}

interface BlessingChoice {
  id: 'time' | 'score' | 'heal' | 'reveal';
  title: string;
  desc: string;
  emoji: string;
}

const ALL_BLESSINGS: BlessingChoice[] = [
  { id: 'time', title: '時間砂漏祝福', desc: '之後每層額外獲得 +6 秒通關時間', emoji: '⏳' },
  { id: 'score', title: '王國皇冠祝福', desc: '消除得分永久額外 +35%', emoji: '👑' },
  { id: 'heal', title: '粉紅護盾祝福', desc: '回復 1 顆愛心生命（上限 4 顆）', emoji: '💖' },
  { id: 'reveal', title: '星眼透視祝福', desc: '每層開局自動配對好 1 組精靈', emoji: '🔮' },
];

function getFloorModifier(floor: number): FloorModifier {
  if (floor >= 5 && floor % 5 === 0) return 'boss';
  if (floor >= 4 && floor % 4 === 2) return 'cp';
  if (floor >= 3 && floor % 3 === 0) return 'mist';
  return 'classic';
}

function getFloorModifierMeta(mod: FloorModifier): { label: string; desc: string; badge: string } {
  switch (mod) {
    case 'boss':
      return {
        label: '👑 魔王洗牌 Boss 層',
        desc: '每消除 3 對，未消除的卡牌會重新洗牌！',
        badge: 'bg-rose-500 text-white',
      };
    case 'cp':
      return {
        label: '🪄 命定 CP 配對層',
        desc: '精靈 × 專屬魔法用具才能配對消除！',
        badge: 'bg-amber-500 text-white',
      };
    case 'mist':
      return {
        label: '🌫️ 甜夢迷霧層',
        desc: '開局先預覽 2 秒記憶位置，之後全盤蓋牌速戰！',
        badge: 'bg-violet-500 text-white',
      };
    default:
      return {
        label: '🌸 標準精靈層',
        desc: '找出相同糖果精靈配對，速度越快加分越多！',
        badge: 'bg-pink-500 text-white',
      };
  }
}

function generateTowerFloorDeck(floor: number, autoSolveOnePair: boolean): TowerCard[] {
  const mod = getFloorModifier(floor);
  const pairCount = floor <= 2 ? 6 : floor <= 6 ? 8 : 10;

  let rawCards: Array<{ matchKey: string; item: ThemeItem }> = [];

  if (mod === 'cp') {
    const chosen = [...SPIRIT_PROP_PAIRINGS]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(pairCount, SPIRIT_PROP_PAIRINGS.length));
    chosen.forEach((cp) => {
      const sp = getSpiritById(cp.spiritId);
      const pr = getSpiritById(cp.propId);
      if (sp && pr) {
        rawCards.push({ matchKey: cp.id, item: sp });
        rawCards.push({ matchKey: cp.id, item: pr });
      }
    });
  } else {
    const chosen = [...CANDY_SPIRIT_ITEMS]
      .sort(() => Math.random() - 0.5)
      .slice(0, pairCount);
    chosen.forEach((it) => {
      rawCards.push({ matchKey: it.id, item: it });
      rawCards.push({ matchKey: it.id, item: it });
    });
  }

  rawCards = rawCards.sort(() => Math.random() - 0.5);

  const preMatchedKey = autoSolveOnePair && rawCards.length >= 2 ? rawCards[0].matchKey : null;
  const previewStart = mod === 'mist';

  return rawCards.map((entry, idx) => ({
    uid: `fl${floor}_${idx}_${entry.item.id}`,
    matchKey: entry.matchKey,
    item: entry.item,
    isFlipped: previewStart || entry.matchKey === preMatchedKey,
    isMatched: entry.matchKey === preMatchedKey,
  }));
}

export const SpiritTowerGame: React.FC<SpiritTowerGameProps> = ({
  isActiveTab = true,
  onOpenMyRecords,
}) => {
  const { getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();
  const { progress, earnCoins, recordTowerFloor } = useKingdomProgress();

  const [floor, setFloor] = useState(1);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [cards, setCards] = useState<TowerCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40);
  const [totalTimeSec, setTotalTimeSec] = useState(0);
  const [matchedInFloor, setMatchedInFloor] = useState(0);

  // Roguelike Blessings
  const [bonusTimePerFloor, setBonusTimePerFloor] = useState(0);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [autoRevealStart, setAutoRevealStart] = useState(false);
  const [blessingChoices, setBlessingChoices] = useState<BlessingChoice[] | null>(null);

  const [bossShuffledBanner, setBossShuffledBanner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);

  const mistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mismatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bossBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const floorRef = useRef(1);
  const heartsRef = useRef(3);
  const totalTimeSecRef = useRef(0);
  const highScoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const localKey = 'pairmaster_tower_high_endless_candy-tower';

  useEffect(() => {
    let localBest = 0;
    try {
      localBest = parseInt(localStorage.getItem(localKey) || '0', 10) || 0;
    } catch {
      localBest = 0;
    }
    const cloudBest = getCloudHighScore('tower', 'endless', 'candy-tower');
    const best = Math.max(localBest, cloudBest);
    highScoreRef.current = best;
    setHighScore(best);
  }, [getCloudHighScore]);

  const clearPendingTimers = useCallback(() => {
    if (mistTimeoutRef.current) {
      clearTimeout(mistTimeoutRef.current);
      mistTimeoutRef.current = null;
    }
    if (mismatchTimeoutRef.current) {
      clearTimeout(mismatchTimeoutRef.current);
      mismatchTimeoutRef.current = null;
    }
    if (bossBannerTimeoutRef.current) {
      clearTimeout(bossBannerTimeoutRef.current);
      bossBannerTimeoutRef.current = null;
    }
  }, []);

  const setupFloor = useCallback(
    (targetFloor: number, extraTime: number, autoReveal: boolean) => {
      clearPendingTimers();
      const mod = getFloorModifier(targetFloor);
      const deck = generateTowerFloorDeck(targetFloor, autoReveal);
      const baseTime = targetFloor <= 2 ? 36 : targetFloor <= 6 ? 44 : 52;

      setCards(deck);
      setFlippedIndices([]);
      setIsResolving(false);
      setMatchedInFloor(0);
      setBossShuffledBanner(false);
      setTimeLeft(baseTime + extraTime);

      if (mod === 'mist') {
        setIsResolving(true);
        mistTimeoutRef.current = setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.isMatched ? c : { ...c, isFlipped: false }))
          );
          setIsResolving(false);
        }, 2000);
      }
    },
    [clearPendingTimers]
  );

  const startFreshRun = useCallback(() => {
    clearPendingTimers();
    gameOverRef.current = false;
    floorRef.current = 1;
    heartsRef.current = 3;
    scoreRef.current = 0;
    totalTimeSecRef.current = 0;

    setFloor(1);
    setHearts(3);
    setScore(0);
    setTotalTimeSec(0);
    setBonusTimePerFloor(0);
    setScoreMultiplier(1);
    setAutoRevealStart(false);
    setBlessingChoices(null);
    setIsPaused(false);
    setIsGameOver(false);
    setCoinsAwarded(0);
    setSyncStatus(null);
    setupFloor(1, 0, false);
  }, [clearPendingTimers, setupFloor]);

  useEffect(() => {
    startFreshRun();
    return () => {
      clearPendingTimers();
    };
  }, [clearPendingTimers, startFreshRun]);

  const triggerGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    clearPendingTimers();
    setIsGameOver(true);

    const finalScore = scoreRef.current;
    const reachedFloor = floorRef.current;
    const elapsedSec = totalTimeSecRef.current;

    recordTowerFloor(reachedFloor);

    const reward = Math.max(15, reachedFloor * 12);
    setCoinsAwarded(reward);
    earnCoins(reward);

    if (finalScore > highScoreRef.current) {
      highScoreRef.current = finalScore;
      setHighScore(finalScore);
      try {
        localStorage.setItem(localKey, String(finalScore));
      } catch {
        // ignore
      }
    }

    const stars = reachedFloor >= 8 ? 3 : reachedFloor >= 4 ? 2 : 1;
    void saveGameScore({
      gameMode: 'tower',
      themeId: 'candy-tower',
      themeName: '無盡糖果高塔',
      difficultyId: 'endless',
      score: finalScore,
      timeSec: Math.max(5, elapsedSec),
      maxCombo: reachedFloor,
      stars,
    }).then((s) => setSyncStatus(s));

    soundFx.playMismatch();
  }, [clearPendingTimers, earnCoins, recordTowerFloor, saveGameScore]);

  // Countdown tick (stable interval via refs; pauses on tab switch, pause, or blessing modal)
  useEffect(() => {
    if (!isActiveTab || isPaused || isGameOver || blessingChoices !== null) return;
    const id = setInterval(() => {
      totalTimeSecRef.current += 1;
      setTotalTimeSec(totalTimeSecRef.current);
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (heartsRef.current > 1) {
            heartsRef.current -= 1;
            setHearts(heartsRef.current);
            soundFx.playMismatch();
            return 16; // Rescue 16 seconds by consuming 1 shield heart
          } else {
            heartsRef.current = 0;
            setHearts(0);
            triggerGameOver();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [blessingChoices, isActiveTab, isGameOver, isPaused, triggerGameOver]);

  const handleCardClick = (idx: number) => {
    if (isPaused || isResolving || isGameOver || blessingChoices !== null) return;
    const card = cards[idx];
    if (!card || card.isFlipped || card.isMatched) return;

    soundFx.playCardFlip();
    const nextFlipped = [...flippedIndices, idx];
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, isFlipped: true } : c)));
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length < 2) return;

    setIsResolving(true);
    const [i1, i2] = nextFlipped;
    const c1 = cards[i1];
    const c2 = card;

    if (c1.matchKey === c2.matchKey) {
      const mod = getFloorModifier(floor);
      const nextMatches = matchedInFloor + 1;
      const gained = Math.round((100 + floor * 20) * scoreMultiplier);
      const nextScore = scoreRef.current + gained;

      soundFx.playMatchSuccess(Math.min(5, nextMatches));
      scoreRef.current = nextScore;
      setScore(nextScore);
      setMatchedInFloor(nextMatches);
      setFlippedIndices([]);

      let updatedCards = cards.map((c, i) =>
        i === i1 || i === i2 ? { ...c, isFlipped: true, isMatched: true } : c
      );

      // Boss floor triggers shuffle of unmatched cards every 3 matches
      if (mod === 'boss' && nextMatches % 3 === 0 && !updatedCards.every((c) => c.isMatched)) {
        const unmatchedSlots: number[] = [];
        const unmatchedItems: Array<{ matchKey: string; item: ThemeItem }> = [];
        updatedCards.forEach((c, i) => {
          if (!c.isMatched) {
            unmatchedSlots.push(i);
            unmatchedItems.push({ matchKey: c.matchKey, item: c.item });
          }
        });
        unmatchedItems.sort(() => Math.random() - 0.5);
        unmatchedSlots.forEach((slotIdx, k) => {
          updatedCards[slotIdx] = {
            ...updatedCards[slotIdx],
            matchKey: unmatchedItems[k].matchKey,
            item: unmatchedItems[k].item,
          };
        });
        setBossShuffledBanner(true);
        if (bossBannerTimeoutRef.current) clearTimeout(bossBannerTimeoutRef.current);
        bossBannerTimeoutRef.current = setTimeout(() => setBossShuffledBanner(false), 1800);
      }

      setCards(updatedCards);
      setIsResolving(false);

      // Check floor cleared!
      if (updatedCards.every((c) => c.isMatched)) {
        const clearBonus = Math.round((timeLeft * 12 + floor * 80) * scoreMultiplier);
        scoreRef.current = nextScore + clearBonus;
        setScore(scoreRef.current);
        recordTowerFloor(floor);
        soundFx.playVictory();
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.65 } });

        const shuffledBlessings = [...ALL_BLESSINGS].sort(() => Math.random() - 0.5).slice(0, 3);
        setBlessingChoices(shuffledBlessings);
      }
    } else {
      soundFx.playMismatch();
      mismatchTimeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) => (i === i1 || i === i2 ? { ...c, isFlipped: false } : c))
        );
        setFlippedIndices([]);
        setIsResolving(false);
      }, 520);
    }
  };

  const handlePickBlessing = (choice: BlessingChoice) => {
    soundFx.playPowerUp();
    let nextExtraTime = bonusTimePerFloor;
    let nextAutoReveal = autoRevealStart;

    if (choice.id === 'time') {
      nextExtraTime += 6;
      setBonusTimePerFloor(nextExtraTime);
    } else if (choice.id === 'score') {
      setScoreMultiplier((m) => Number((m + 0.35).toFixed(2)));
    } else if (choice.id === 'heal') {
      const healed = Math.min(4, heartsRef.current + 1);
      heartsRef.current = healed;
      setHearts(healed);
    } else if (choice.id === 'reveal') {
      nextAutoReveal = true;
      setAutoRevealStart(true);
    }

    const nextFloor = floor + 1;
    floorRef.current = nextFloor;
    setFloor(nextFloor);
    setBlessingChoices(null);
    setupFloor(nextFloor, nextExtraTime, nextAutoReveal);
  };

  const modMeta = getFloorModifierMeta(getFloorModifier(floor));
  const publicBest = getPublicStageBest('tower', 'endless', 'candy-tower');
  const gridColsClass =
    cards.length >= 20
      ? 'grid-cols-4 sm:grid-cols-5'
      : cards.length >= 16
      ? 'grid-cols-4'
      : 'grid-cols-3 sm:grid-cols-4';

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
      <div className="bg-white/95 border border-pink-200 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            🏰 糖果高塔大冒險：無盡爬塔
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            每爬上一層即可抽王國祝福！小心迷霧層、CP 層與 Boss 洗牌層（目前歷史最高：第{' '}
            {progress.bestTowerFloor} 層）
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isGameOver || blessingChoices !== null}
            onClick={() => {
              soundFx.playClick();
              setIsPaused((p) => !p);
            }}
            className="px-3 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-45"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? '繼續' : '暫停'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              startFreshRun();
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>由第 1 層重爬</span>
          </button>
        </div>
      </div>

      {/* HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-2.5 text-center">
          <span className="text-[10px] font-bold text-indigo-600 block">目前樓層</span>
          <span className="text-xl font-black font-mono text-indigo-700">第 {floor} 層</span>
        </div>
        <div className="bg-white border border-pink-200 rounded-2xl p-2.5 text-center">
          <span className="text-[10px] font-bold text-slate-500 block">護盾愛心</span>
          <span className="text-base font-black text-rose-500 flex items-center justify-center gap-0.5 mt-0.5">
            {Array.from({ length: Math.max(0, hearts) }).map((_, i) => (
              <Heart key={i} className="w-4 h-4 fill-rose-500 text-rose-500" />
            ))}
            {hearts === 0 && '💔'}
          </span>
        </div>
        <div
          className={`border rounded-2xl p-2.5 text-center ${
            timeLeft <= 10 ? 'bg-rose-50 border-rose-300 animate-pulse' : 'bg-white border-pink-200'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 block">本層時限</span>
          <span className="text-xl font-black font-mono text-rose-600 flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            {timeLeft}s
          </span>
        </div>
        <div className="bg-white border border-pink-200 rounded-2xl p-2.5 text-center">
          <span className="text-[10px] font-bold text-slate-500 block">累計爬塔分</span>
          <span className="text-xl font-black font-mono text-pink-600">{score}</span>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-2.5 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-amber-700 block">最高紀錄</span>
          <span className="text-xl font-black font-mono text-amber-600">{highScore}</span>
        </div>
      </div>

      {/* Floor Modifier Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-pink-200 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${modMeta.badge}`}>
            {modMeta.label}
          </span>
          <span className="text-xs font-bold text-slate-600">{modMeta.desc}</span>
        </div>
        <div className="text-[11px] font-black text-indigo-600 flex items-center gap-2">
          <span>積分倍率 ×{scoreMultiplier}</span>
          {bonusTimePerFloor > 0 && <span>· 加時 +{bonusTimePerFloor}s</span>}
        </div>
      </div>

      {bossShuffledBanner && (
        <div className="bg-rose-500 text-white rounded-2xl px-4 py-2 text-xs font-black text-center flex items-center justify-center gap-2 animate-bounce">
          <Shuffle className="w-4 h-4" />
          魔王發動混亂！未消除卡牌已經重洗位置！
        </div>
      )}

      {/* Game Grid */}
      <div className="relative bg-white/90 border-2 border-pink-200 rounded-3xl p-3 sm:p-5 shadow-inner min-h-[340px]">
        <div className={`grid ${gridColsClass} gap-2.5 sm:gap-3 max-w-2xl mx-auto`}>
          {cards.map((card, idx) => (
            <button
              key={card.uid}
              type="button"
              disabled={card.isFlipped || card.isMatched || isResolving}
              onClick={() => handleCardClick(idx)}
              className={`aspect-square rounded-2xl border-2 p-1.5 flex flex-col items-center justify-center transition-all select-none ${
                card.isMatched
                  ? 'bg-emerald-50/70 border-emerald-300 opacity-55 scale-95'
                  : card.isFlipped
                  ? 'bg-white border-pink-400 shadow-md'
                  : 'bg-gradient-to-br from-pink-400 via-rose-400 to-purple-400 border-white shadow-md hover:scale-103 cursor-pointer'
              }`}
            >
              {card.isFlipped || card.isMatched ? (
                <>
                  {card.item.imageUrl ? (
                    <img
                      src={card.item.imageUrl}
                      alt={card.item.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-pink-100"
                    />
                  ) : (
                    <span className="text-2xl">{card.item.symbol}</span>
                  )}
                  <span className="text-[10px] font-black text-slate-700 truncate w-full text-center mt-0.5">
                    {card.item.name}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center text-white/90">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-black mt-0.5">
                    {getFloorModifier(floor) === 'mist' ? (
                      <EyeOff className="w-3.5 h-3.5 inline" />
                    ) : (
                      `F${floor}`
                    )}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Privacy Pause Overlay */}
        {isPaused && !isGameOver && blessingChoices === null && (
          <div className="absolute inset-0 z-25 rounded-3xl bg-pink-950/55 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
            <span className="text-4xl">🏰</span>
            <h3 className="text-xl font-black text-white">爬塔暫停中</h3>
            <p className="text-xs font-bold text-pink-100">卡牌已遮蓋以確保公平計時</p>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsPaused(false);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm shadow-lg cursor-pointer"
            >
              繼續爬塔挑戰
            </button>
          </div>
        )}

        {/* Roguelike Blessing 3-Pick-1 Overlay */}
        {blessingChoices && !isGameOver && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-indigo-950/75 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center space-y-4 animate-in fade-in">
            <div>
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-xs font-black">
                ✨ 第 {floor} 層通關！
              </span>
              <h3 className="text-xl font-black text-white mt-2">揀選一個王國祝福進入第 {floor + 1} 層</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
              {blessingChoices.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handlePickBlessing(b)}
                  className="bg-white hover:bg-pink-50 border-2 border-pink-200 hover:border-amber-400 rounded-2xl p-4 text-left space-y-1.5 shadow-xl transition-transform hover:-translate-y-1 cursor-pointer"
                >
                  <span className="text-2xl block">{b.emoji}</span>
                  <p className="text-sm font-black text-slate-900">{b.title}</p>
                  <p className="text-xs font-bold text-slate-600">{b.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-white/94 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in">
            <span className="text-4xl">🏰</span>
            <h3 className="text-2xl font-black text-slate-900">爬塔止步於第 {floor} 層！</h3>
            <p className="text-3xl font-black font-mono text-indigo-600">{score} 分</p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />+{coinsAwarded} 王國星幣
              </span>
              <span className="px-3 py-1 rounded-xl bg-indigo-100 text-indigo-700">
                抵達層數：第 {floor} 層
              </span>
            </div>
            {syncStatus && (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-pink-500" />
                {syncStatus === 'cloud' ? '已同步至雲端高塔榜' : '已保存戰績紀錄'}
              </p>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={startFreshRun}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm shadow-md cursor-pointer"
              >
                再次挑戰高塔
              </button>
              {onOpenMyRecords && (
                <button
                  type="button"
                  onClick={onOpenMyRecords}
                  className="px-4 py-2.5 rounded-2xl bg-pink-50 text-pink-700 border border-pink-200 font-black text-sm cursor-pointer"
                >
                  查看排行榜
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {publicBest && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-indigo-800">
            <Trophy className="w-4 h-4 text-amber-500" />
            全服高塔登頂王：<strong>{publicBest.displayName}</strong>
          </span>
          <span className="font-mono font-black text-indigo-700">{publicBest.highScore} 分</span>
        </div>
      )}
    </div>
  );
};

export default SpiritTowerGame;
