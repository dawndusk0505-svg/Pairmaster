import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Swords,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Trophy,
  Coins,
  Cloud,
  Sparkles,
  RefreshCw,
  Pause,
  Play,
} from 'lucide-react';
import { CANDY_SPIRIT_ITEMS, ThemeItem } from '../../data/matchThemes';
import { seededShuffle } from '../../utils/seededRandom';
import { soundFx } from '../../utils/audio';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useKingdomProgress } from '../../hooks/useKingdomProgress';

interface FriendDuelGameProps {
  isActiveTab?: boolean;
  onOpenMyRecords?: () => void;
}

interface DuelCard {
  uid: string;
  id: string;
  item: ThemeItem;
  isFlipped: boolean;
  isMatched: boolean;
}

const DUEL_SECONDS = 60;

function makeRandomSeed(): string {
  return `PK${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function buildSeededBoard(seedStr: string, roundIndex: number): DuelCard[] {
  const fullSeed = `${seedStr}_r${roundIndex}`;
  const chosen = seededShuffle(CANDY_SPIRIT_ITEMS, `${fullSeed}_pick`).slice(0, 8);
  const doubled = [...chosen, ...chosen];
  const shuffled = seededShuffle(doubled, `${fullSeed}_pos`);
  return shuffled.map((item, idx) => ({
    uid: `${fullSeed}_${idx}_${item.id}`,
    id: item.id,
    item,
    isFlipped: false,
    isMatched: false,
  }));
}

export const FriendDuelGame: React.FC<FriendDuelGameProps> = ({
  isActiveTab = true,
  onOpenMyRecords,
}) => {
  const { gameDisplayName, getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();
  const { earnCoins } = useKingdomProgress();

  const initialUrlInfo = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return { seed: makeRandomSeed(), challenger: '', targetScore: 0 };
    }
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('duelSeed')?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || makeRandomSeed();
    const challenger = params.get('challenger')?.slice(0, 32) || '';
    const targetScore = Math.max(0, Math.min(999999, parseInt(params.get('targetScore') || '0', 10) || 0));
    return { seed, challenger, targetScore };
  }, []);

  const [duelSeed, setDuelSeed] = useState(initialUrlInfo.seed);
  const [challengerName] = useState(initialUrlInfo.challenger);
  const [challengerScore] = useState(initialUrlInfo.targetScore);

  const [roundIdx, setRoundIdx] = useState(1);
  const [cards, setCards] = useState<DuelCard[]>(() => buildSeededBoard(initialUrlInfo.seed, 1));
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const [timeLeft, setTimeLeft] = useState(DUEL_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);

  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const maxComboRef = useRef(1);
  const finishedRef = useRef(false);
  const nextBoardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mismatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localKey = 'pairmaster_duel_high_duel_candy-duel';

  useEffect(() => {
    let localBest = 0;
    try {
      localBest = parseInt(localStorage.getItem(localKey) || '0', 10) || 0;
    } catch {
      localBest = 0;
    }
    const cloudBest = getCloudHighScore('duel', 'duel', 'candy-duel');
    const best = Math.max(localBest, cloudBest);
    highScoreRef.current = best;
    setHighScore(best);
  }, [getCloudHighScore]);

  const clearDuelTimeouts = useCallback(() => {
    if (nextBoardTimeoutRef.current) {
      clearTimeout(nextBoardTimeoutRef.current);
      nextBoardTimeoutRef.current = null;
    }
    if (mismatchTimeoutRef.current) {
      clearTimeout(mismatchTimeoutRef.current);
      mismatchTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearDuelTimeouts();
  }, [clearDuelTimeouts]);

  const finishDuel = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearDuelTimeouts();
    setIsFinished(true);
    setIsPlaying(false);
    setIsPaused(false);

    const finalScore = scoreRef.current;
    const peakCombo = maxComboRef.current;
    const beatChallenger = challengerScore > 0 ? finalScore >= challengerScore : finalScore >= 1200;
    const reward = beatChallenger ? 45 : 22;
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

    const stars = finalScore >= 2400 ? 3 : finalScore >= 1300 ? 2 : 1;
    void saveGameScore({
      gameMode: 'duel',
      themeId: 'candy-duel',
      themeName: '同盤好友 PK',
      difficultyId: 'duel',
      score: finalScore,
      timeSec: DUEL_SECONDS,
      maxCombo: peakCombo,
      stars,
    }).then((s) => setSyncStatus(s));

    soundFx.playVictory();
    if (beatChallenger) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  }, [challengerScore, clearDuelTimeouts, earnCoins, saveGameScore]);

  const restartSameSeed = useCallback(
    (seedOverride?: string) => {
      clearDuelTimeouts();
      const activeSeed = seedOverride || duelSeed;
      finishedRef.current = false;
      scoreRef.current = 0;
      maxComboRef.current = 1;
      setRoundIdx(1);
      setCards(buildSeededBoard(activeSeed, 1));
      setFlippedIndices([]);
      setIsResolving(false);
      setTimeLeft(DUEL_SECONDS);
      setScore(0);
      setCombo(1);
      setMaxCombo(1);
      setIsPlaying(false);
      setIsPaused(false);
      setIsFinished(false);
      setCoinsAwarded(0);
      setSyncStatus(null);
    },
    [clearDuelTimeouts, duelSeed]
  );

  const handleGenerateNewSeed = () => {
    soundFx.playClick();
    const nextSeed = makeRandomSeed();
    setDuelSeed(nextSeed);
    restartSameSeed(nextSeed);
  };

  useEffect(() => {
    if (!isActiveTab || !isPlaying || isPaused || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishDuel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finishDuel, isActiveTab, isFinished, isPaused, isPlaying]);

  const handleCardClick = (idx: number) => {
    if (isPaused || isResolving || isFinished) return;
    const card = cards[idx];
    if (!card || card.isFlipped || card.isMatched) return;

    if (!isPlaying) setIsPlaying(true);
    soundFx.playCardFlip();

    const nextFlipped = [...flippedIndices, idx];
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, isFlipped: true } : c)));
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length < 2) return;

    setIsResolving(true);
    const [i1, i2] = nextFlipped;
    const c1 = cards[i1];
    const c2 = card;

    if (c1.id === c2.id) {
      const gained = 110 * combo;
      const nextCombo = combo + 1;
      scoreRef.current += gained;
      maxComboRef.current = Math.max(maxComboRef.current, nextCombo);
      setScore(scoreRef.current);
      setCombo(nextCombo);
      setMaxCombo(maxComboRef.current);
      setFlippedIndices([]);
      soundFx.playMatchSuccess(Math.min(5, combo));

      const nextCards = cards.map((c, i) =>
        i === i1 || i === i2 ? { ...c, isFlipped: true, isMatched: true } : c
      );

      if (nextCards.every((c) => c.isMatched)) {
        // Clear full board bonus + instant next seeded board!
        scoreRef.current += 250;
        setScore(scoreRef.current);
        const nextR = roundIdx + 1;
        setRoundIdx(nextR);
        nextBoardTimeoutRef.current = setTimeout(() => {
          setCards(buildSeededBoard(duelSeed, nextR));
          setIsResolving(false);
        }, 260);
      } else {
        setCards(nextCards);
        setIsResolving(false);
      }
    } else {
      soundFx.playMismatch();
      setCombo(1);
      mismatchTimeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) => (i === i1 || i === i2 ? { ...c, isFlipped: false } : c))
        );
        setFlippedIndices([]);
        setIsResolving(false);
      }, 420);
    }
  };

  const handleCopyChallengeLink = async () => {
    if (typeof window === 'undefined') return;
    soundFx.playClick();
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('duelSeed', duelSeed);
    url.searchParams.set('challenger', gameDisplayName || '神秘糖果玩家');
    url.searchParams.set('targetScore', String(scoreRef.current > 0 ? scoreRef.current : highScore || 1400));

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const rivalTarget = challengerScore > 0 ? challengerScore : 1500;
  const elapsedFraction = (DUEL_SECONDS - timeLeft) / DUEL_SECONDS;
  const rivalLivePace = Math.round(rivalTarget * elapsedFraction);
  const myPct = Math.min(100, Math.round((score / Math.max(rivalTarget, score, 1000)) * 100));
  const rivalPct = Math.min(100, Math.round((rivalLivePace / Math.max(rivalTarget, score, 1000)) * 100));
  const publicBest = getPublicStageBest('duel', 'duel', 'candy-duel');

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
      <div className="bg-white/95 border border-pink-200 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Swords className="w-5 h-5 text-pink-500" />
              <span>同盤好友 PK 挑戰賽（60 秒無限連盤）</span>
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              對戰碼 <span className="font-mono text-pink-600 font-black">#{duelSeed}</span> · 相同牌面種子！清完一盤秒開下一盤！
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateNewSeed}
              className="px-3 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-xs font-bold text-pink-700 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>換新對戰種子</span>
            </button>
            <button
              type="button"
              onClick={() => void handleCopyChallengeLink()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-pink-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '已複製 PK 戰書連結！' : '複製 PK 戰書約朋友戰'}</span>
            </button>
          </div>
        </div>

        {/* Live VS Race Meter */}
        <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-pink-600">
              💖 我 ({gameDisplayName})：{score} 分 · 第 {roundIdx} 盤
            </span>
            <span className="text-rose-600 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {timeLeft}s
            </span>
            <span className="text-sky-700">
              ⚔️ {challengerName ? `${challengerName} 戰書` : '王國守擂目標'}：{rivalTarget} 分
            </span>
          </div>

          <div className="space-y-1">
            <div className="h-2.5 rounded-full bg-white border border-pink-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-200"
                style={{ width: `${myPct}%` }}
              />
            </div>
            <div className="h-2 rounded-full bg-white border border-sky-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all duration-500"
                style={{ width: `${rivalPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4x4 Speed Duel Board */}
      <div className="relative bg-white/95 border-2 border-pink-200 rounded-3xl p-4 sm:p-6 shadow-inner">
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 max-w-lg mx-auto">
          {cards.map((card, idx) => (
            <button
              key={card.uid}
              type="button"
              disabled={card.isFlipped || card.isMatched || isResolving}
              onClick={() => handleCardClick(idx)}
              className={`aspect-square rounded-2xl border-2 p-1.5 flex flex-col items-center justify-center transition-all select-none ${
                card.isMatched
                  ? 'bg-emerald-50/70 border-emerald-300 opacity-50 scale-92'
                  : card.isFlipped
                  ? 'bg-white border-pink-400 shadow-md'
                  : 'bg-gradient-to-br from-sky-400 via-pink-400 to-rose-400 border-white shadow-md hover:scale-103 cursor-pointer'
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
                <Sparkles className="w-5 h-5 text-white/90" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <button
            type="button"
            disabled={!isPlaying || isFinished}
            onClick={() => {
              soundFx.playClick();
              setIsPaused((p) => !p);
            }}
            className="px-4 py-2 rounded-xl bg-white hover:bg-pink-50 border border-pink-200 text-xs font-black text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-45"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? '繼續對戰' : '暫停'}</span>
          </button>
          <button
            type="button"
            onClick={() => restartSameSeed()}
            className="px-4 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-xs font-black text-pink-700 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>同種子重打挑戰</span>
          </button>
          <span className="text-xs font-bold text-slate-500">個人最佳：{highScore} 分</span>
        </div>

        {isPaused && !isFinished && (
          <div className="absolute inset-0 z-25 rounded-3xl bg-pink-950/55 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
            <span className="text-4xl">⚔️</span>
            <h3 className="text-xl font-black text-white">PK 對戰暫停中</h3>
            <p className="text-xs font-bold text-pink-100">卡牌已遮蓋，準備好再繼續搶分！</p>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsPaused(false);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-pink-500 text-white font-black text-sm shadow-lg cursor-pointer"
            >
              繼續 PK 對戰
            </button>
          </div>
        )}

        {isFinished && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-white/94 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in">
            <span className="text-4xl">{score >= rivalTarget ? '🏆' : '⚔️'}</span>
            <h3 className="text-2xl font-black text-slate-900">
              {score >= rivalTarget ? 'PK 勝利！成功超越目標！' : '60 秒對戰結束！差少少就反超！'}
            </h3>
            <p className="text-3xl font-black font-mono text-pink-600">
              {score} 分{' '}
              <span className="text-base text-slate-500 font-bold">vs {rivalTarget} 分</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />+{coinsAwarded} 王國星幣
              </span>
              <span className="px-3 py-1 rounded-xl bg-sky-100 text-sky-700">
                完成 {roundIdx - 1} 整盤 · 最高連擊 x{maxCombo}
              </span>
            </div>
            {syncStatus && (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-pink-500" />
                {syncStatus === 'cloud' ? '已同步至雲端 PK 榜' : '已保存戰績紀錄'}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => void handleCopyChallengeLink()}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-pink-500 text-white font-black text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedLink ? '已複製戰書！' : '用此分數下戰書給朋友'}</span>
              </button>
              <button
                type="button"
                onClick={() => restartSameSeed()}
                className="px-4 py-2.5 rounded-2xl bg-pink-50 text-pink-700 border border-pink-200 font-black text-sm cursor-pointer"
              >
                再戰一局
              </button>
              {onOpenMyRecords && (
                <button
                  type="button"
                  onClick={onOpenMyRecords}
                  className="px-4 py-2.5 rounded-2xl bg-white text-slate-700 border border-slate-200 font-black text-sm cursor-pointer"
                >
                  排行榜
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {publicBest && (
        <div className="bg-sky-50/70 border border-sky-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-sky-900">
            <Trophy className="w-4 h-4 text-amber-500" />
            全服 60 秒 PK 擂台主：<strong>{publicBest.displayName}</strong>
          </span>
          <span className="font-mono font-black text-rose-600">{publicBest.highScore} 分</span>
        </div>
      )}
    </div>
  );
};

export default FriendDuelGame;
