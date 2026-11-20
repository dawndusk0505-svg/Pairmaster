import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Flame,
  Clock,
  Trophy,
  Coins,
  Cloud,
  Pause,
  Play,
  Utensils,
} from 'lucide-react';
import { CANDY_SPIRIT_ITEMS, ThemeItem } from '../../data/matchThemes';
import { soundFx } from '../../utils/audio';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useKingdomProgress } from '../../hooks/useKingdomProgress';

interface ConveyorRushGameProps {
  isActiveTab?: boolean;
  onOpenMyRecords?: () => void;
}

interface OrderTicket {
  id: number;
  customer: ThemeItem;
  needIds: string[];
  filledCount: number;
  bonusLabel: string;
}

const COUNTER_ITEM_IDS = [
  'cs2',
  'cs6',
  'cs7',
  'cs8',
  'cs13',
  'cs15',
  'sp1',
  'sp2',
  'sp5',
  'sp7',
  'sp8',
  'sp11',
];

const MENU_ITEMS = COUNTER_ITEM_IDS.map(
  (id) => CANDY_SPIRIT_ITEMS.find((i) => i.id === id)!
).filter(Boolean);

const CUSTOMER_POOL = CANDY_SPIRIT_ITEMS.filter((i) => i.id.startsWith('cs'));

const ITEM_MAP = new Map(CANDY_SPIRIT_ITEMS.map((i) => [i.id, i]));

const GAME_SECONDS = 45;

function createOrderTicket(id: number): OrderTicket {
  const customer = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
  const len = Math.random() < 0.42 ? 3 : 2;
  const needIds: string[] = [];
  for (let i = 0; i < len; i++) {
    const pick = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
    needIds.push(pick.id);
  }
  return {
    id,
    customer,
    needIds,
    filledCount: 0,
    bonusLabel: len === 3 ? '豪華 3 拼' : '經典雙拼',
  };
}

export const ConveyorRushGame: React.FC<ConveyorRushGameProps> = ({
  isActiveTab = true,
  onOpenMyRecords,
}) => {
  const { getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();
  const { earnCoins } = useKingdomProgress();

  const orderIdRef = useRef(1);
  const scoreRef = useRef(0);
  const maxComboRef = useRef(1);
  const finishedRef = useRef(false);

  const [orders, setOrders] = useState<OrderTicket[]>(() => [
    createOrderTicket(1),
    createOrderTicket(2),
    createOrderTicket(3),
  ]);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feverSec, setFeverSec] = useState(0);
  const [servedCount, setServedCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);

  const localKey = 'pairmaster_conveyor_high_blitz_candy-conveyor';

  useEffect(() => {
    let localBest = 0;
    try {
      localBest = parseInt(localStorage.getItem(localKey) || '0', 10) || 0;
    } catch {
      localBest = 0;
    }
    const cloudBest = getCloudHighScore('conveyor', 'blitz', 'candy-conveyor');
    setHighScore(Math.max(localBest, cloudBest));
  }, [getCloudHighScore]);

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsFinished(true);
    setIsPlaying(false);

    const finalScore = scoreRef.current;
    const reward = Math.max(12, Math.min(110, Math.round(finalScore / 45)));
    setCoinsAwarded(reward);
    earnCoins(reward);

    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem(localKey, String(finalScore));
      } catch {
        // ignore
      }
    }

    const stars = finalScore >= 2400 ? 3 : finalScore >= 1200 ? 2 : 1;
    void saveGameScore({
      gameMode: 'conveyor',
      themeId: 'candy-conveyor',
      themeName: '奇蹟甜品屋',
      difficultyId: 'blitz',
      score: finalScore,
      timeSec: GAME_SECONDS,
      maxCombo: maxComboRef.current,
      stars,
    }).then((s) => setSyncStatus(s));

    soundFx.playVictory();
    if (finalScore >= 1200) {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    }
  }, [earnCoins, highScore, saveGameScore]);

  const resetGame = useCallback(() => {
    orderIdRef.current = 4;
    scoreRef.current = 0;
    maxComboRef.current = 1;
    finishedRef.current = false;

    setOrders([createOrderTicket(1), createOrderTicket(2), createOrderTicket(3)]);
    setTimeLeft(GAME_SECONDS);
    setScore(0);
    setStreak(0);
    setFeverSec(0);
    setServedCount(0);
    setIsPlaying(false);
    setIsPaused(false);
    setIsFinished(false);
    setWrongFlash(false);
    setCoinsAwarded(0);
    setSyncStatus(null);
  }, []);

  useEffect(() => {
    if (!isActiveTab || !isPlaying || isPaused || isFinished) return;
    const timer = setInterval(() => {
      setFeverSec((f) => (f > 0 ? f - 1 : 0));
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finishRound, isActiveTab, isFinished, isPaused, isPlaying]);

  const handleServeItem = (itemId: string) => {
    if (!isActiveTab || isPaused || isFinished) return;
    if (!isPlaying) setIsPlaying(true);

    const frontOrder = orders[0];
    if (!frontOrder) return;

    const expectedId = frontOrder.needIds[frontOrder.filledCount];
    if (itemId === expectedId) {
      const nextFilled = frontOrder.filledCount + 1;
      const isOrderDone = nextFilled >= frontOrder.needIds.length;
      const isFever = feverSec > 0;
      const mult = isFever ? 3 : 1;

      if (isOrderDone) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        maxComboRef.current = Math.max(maxComboRef.current, nextStreak);
        setServedCount((c) => c + 1);

        const orderPoints = (frontOrder.needIds.length === 3 ? 190 : 120) * mult;
        scoreRef.current += orderPoints;
        setScore(scoreRef.current);

        if (nextStreak % 5 === 0) {
          setFeverSec(9);
          setTimeLeft((t) => Math.min(GAME_SECONDS + 10, t + 2));
          soundFx.playPowerUp();
        } else {
          soundFx.playMatchSuccess(Math.min(5, nextStreak));
        }

        const nextTicket = createOrderTicket(orderIdRef.current++);
        setOrders((prev) => [...prev.slice(1), nextTicket]);
      } else {
        scoreRef.current += 30 * mult;
        setScore(scoreRef.current);
        soundFx.playCardFlip();
        setOrders((prev) =>
          prev.map((o, idx) => (idx === 0 ? { ...o, filledCount: nextFilled } : o))
        );
      }
    } else {
      soundFx.playMismatch();
      setStreak(0);
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 260);
    }
  };

  const publicBest = getPublicStageBest('conveyor', 'blitz', 'candy-conveyor');
  const activeOrder = orders[0];

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="bg-white/95 border border-pink-200 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <span>🧁 奇蹟甜品屋：極速出餐輸送帶</span>
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            按順序遞出最前排精靈顧客要嘅甜品與道具！每出滿 5 張單開啟 🔥 FEVER ×3（+2秒）！
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFinished || !isPlaying}
            onClick={() => {
              soundFx.playClick();
              setIsPaused((p) => !p);
            }}
            className="px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-45"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? '繼續' : '暫停'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              resetGame();
            }}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新開店</span>
          </button>
        </div>
      </div>

      {/* HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          className={`rounded-2xl border p-3 text-center transition-colors ${
            timeLeft <= 10 && isPlaying
              ? 'bg-rose-50 border-rose-300 animate-pulse'
              : 'bg-white border-pink-200'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500 block">剩餘營業秒數</span>
          <span className="text-2xl font-black font-mono text-rose-600 flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            {timeLeft}s
          </span>
        </div>

        <div className="bg-white border border-pink-200 rounded-2xl p-3 text-center">
          <span className="text-[11px] font-bold text-slate-500 block">營業額分數</span>
          <span className="text-2xl font-black font-mono text-pink-600">{score}</span>
        </div>

        <div
          className={`rounded-2xl border p-3 text-center ${
            feverSec > 0
              ? 'bg-gradient-to-r from-amber-100 to-rose-100 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-pink-200'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500 block">連擊 / FEVER</span>
          <span className="text-xl font-black font-mono text-amber-600 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-rose-500" />
            {feverSec > 0 ? `×3 (${feverSec}s)` : `${streak} 單`}
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-center">
          <span className="text-[11px] font-bold text-amber-700 block">最高營業額</span>
          <span className="text-2xl font-black font-mono text-amber-600">{highScore}</span>
        </div>
      </div>

      {/* Conveyor Belt Queue */}
      <div
        className={`relative bg-gradient-to-r from-pink-100/80 via-rose-50 to-amber-50/80 border-2 border-pink-300 rounded-3xl p-4 space-y-3 transition-all ${
          wrongFlash ? 'ring-4 ring-rose-400 bg-rose-100/70' : ''
        }`}
      >
        <div className="flex items-center justify-between text-xs font-black text-pink-700">
          <span className="flex items-center gap-1.5">
            <Utensils className="w-4 h-4" />
            輸送帶訂單排隊中（請優先完成 1 號單！）
          </span>
          <span>已出餐：{servedCount} 份</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {orders.map((ord, idx) => {
            const isFront = idx === 0;
            return (
              <div
                key={ord.id}
                className={`rounded-2xl p-3 border-2 transition-all flex flex-col justify-between gap-2.5 ${
                  isFront
                    ? 'bg-white border-pink-500 shadow-lg ring-4 ring-pink-200/60'
                    : 'bg-white/75 border-pink-200 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {ord.customer.imageUrl && (
                      <img
                        src={ord.customer.imageUrl}
                        alt={ord.customer.name}
                        className="w-9 h-9 rounded-full object-cover border border-pink-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 truncate block">
                        {ord.customer.name}
                      </span>
                      <span className="text-[10px] font-bold text-pink-500">{ord.bonusLabel}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                      isFront ? 'bg-pink-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isFront ? '出餐中' : `排第 ${idx + 1}`}
                  </span>
                </div>

                {/* Required items sequence */}
                <div className="flex items-center justify-center gap-2 bg-pink-50/70 rounded-xl p-2 border border-pink-100">
                  {ord.needIds.map((nid, slotIdx) => {
                    const item = ITEM_MAP.get(nid);
                    const done = slotIdx < ord.filledCount;
                    const isNextTarget = isFront && slotIdx === ord.filledCount;
                    return (
                      <div
                        key={`${ord.id}_${slotIdx}`}
                        className={`w-13 h-14 rounded-xl border-2 p-1 flex flex-col items-center justify-center transition-all ${
                          done
                            ? 'bg-emerald-100 border-emerald-400 opacity-55 scale-90'
                            : isNextTarget
                            ? 'bg-white border-amber-400 ring-2 ring-amber-300 scale-105 shadow-sm'
                            : 'bg-white border-pink-200'
                        }`}
                      >
                        {item?.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <span>{item?.symbol}</span>
                        )}
                        <span className="text-[9px] font-black text-slate-700 truncate w-full text-center">
                          {done ? '✅' : item?.name.slice(0, 4)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Counter Pad (12 clickable items) */}
        <div className="bg-white/95 border border-pink-200 rounded-2xl p-3 space-y-2">
          <p className="text-[11px] font-black text-slate-600 text-center">
            {activeOrder
              ? `👇 快速點擊下方餐檯對應食材（目前需要：${
                  ITEM_MAP.get(activeOrder.needIds[activeOrder.filledCount])?.name
                }）`
              : '準備接單...'}
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={isPaused || isFinished}
                onClick={() => handleServeItem(item.id)}
                className="p-2 rounded-2xl bg-pink-50/70 hover:bg-pink-100 active:scale-95 border-2 border-pink-200 hover:border-pink-400 flex flex-col items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-pink-200 pointer-events-none"
                  />
                ) : (
                  <span className="text-2xl">{item.symbol}</span>
                )}
                <span className="text-[10px] font-black text-slate-800 truncate w-full text-center">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isPaused && !isFinished && (
          <div className="absolute inset-0 z-20 rounded-3xl bg-pink-950/40 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <p className="text-xl font-black text-white">甜品屋暫停營業中</p>
            <button
              type="button"
              onClick={() => setIsPaused(false)}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-lg cursor-pointer"
            >
              恢復營業繼續出餐
            </button>
          </div>
        )}

        {isFinished && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-white/94 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in">
            <span className="text-4xl">🧁</span>
            <h3 className="text-2xl font-black text-slate-900">45 秒極速收銀結算！</h3>
            <p className="text-3xl font-black font-mono text-emerald-600">{score} 分</p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />+{coinsAwarded} 王國星幣
              </span>
              <span className="px-3 py-1 rounded-xl bg-pink-100 text-pink-700">
                共完成 {servedCount} 份訂單 · 最高 {maxComboRef.current} 連單
              </span>
            </div>
            {syncStatus && (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-pink-500" />
                {syncStatus === 'cloud' ? '已同步至雲端榮譽榜' : '已保存分數紀錄'}
              </p>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={resetGame}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm shadow-md cursor-pointer"
              >
                再衝一輪 45 秒
              </button>
              {onOpenMyRecords && (
                <button
                  type="button"
                  onClick={onOpenMyRecords}
                  className="px-4 py-2.5 rounded-2xl bg-pink-50 text-pink-700 border border-pink-200 font-black text-sm cursor-pointer"
                >
                  查看戰績
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {publicBest && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-amber-800">
            <Trophy className="w-4 h-4 text-amber-500" />
            全服最強甜品店長：<strong>{publicBest.displayName}</strong>
          </span>
          <span className="font-mono font-black text-rose-600">{publicBest.highScore} 分</span>
        </div>
      )}
    </div>
  );
};

export default ConveyorRushGame;
