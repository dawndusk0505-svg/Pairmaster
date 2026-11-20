import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Copy, Check, Clock, Sun, Sparkles, LockOpen } from 'lucide-react';
import { DAILY_FORTUNES, LuckyPairFortune } from '../data/socialAndFortune';
import { soundFx } from '../utils/audio';
import { useFirebase } from '../contexts/FirebaseContext';
import { createSeededRng } from '../utils/seededRandom';

function getDailySeedIndex(dateStr: string, uidKey: string): number {
  const rng = createSeededRng(`${dateStr}_lucky_${uidKey}`);
  return Math.floor(rng() * DAILY_FORTUNES.length);
}

export const DailyLuckyPair: React.FC = () => {
  const { todayHkDate, user } = useFirebase();
  const uidKey = user?.uid || 'guest';
  const storageKey = `pairmaster_lucky_opened_v1_${uidKey}_${todayHkDate}`;

  const [hasOpenedDailyBox, setHasOpenedDailyBox] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });

  const [fortuneIndex, setFortuneIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (Number.isFinite(parsed) && parsed >= 0) return parsed % DAILY_FORTUNES.length;
        }
      } catch {
        // ignore
      }
    }
    return getDailySeedIndex(todayHkDate, uidKey);
  });

  const [isRevealed, setIsRevealed] = useState(true);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        setHasOpenedDailyBox(true);
        setFortuneIndex(
          Number.isFinite(parsed) && parsed >= 0
            ? parsed % DAILY_FORTUNES.length
            : getDailySeedIndex(todayHkDate, uidKey)
        );
      } else {
        setHasOpenedDailyBox(false);
        setFortuneIndex(getDailySeedIndex(todayHkDate, uidKey));
      }
    } catch {
      setHasOpenedDailyBox(false);
      setFortuneIndex(getDailySeedIndex(todayHkDate, uidKey));
    }
  }, [storageKey, todayHkDate, uidKey]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const currentFortune: LuckyPairFortune = DAILY_FORTUNES[fortuneIndex % DAILY_FORTUNES.length];

  const handleOpenDailyBlindBox = () => {
    soundFx.playPowerUp();
    const dailyIdx = getDailySeedIndex(todayHkDate, uidKey);
    setFortuneIndex(dailyIdx);
    setHasOpenedDailyBox(true);
    setIsRevealed(true);

    try {
      localStorage.setItem(storageKey, String(dailyIdx));
    } catch {
      // ignore
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      soundFx.playVictory();
      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#f472b6', '#fb7185', '#fbbf24', '#fbcfe8'],
        });
      } catch {
        // ignore
      }
    }, 180);
  };

  const handleDrawExtra = () => {
    if (!isRevealed) return;
    soundFx.playPowerUp();
    setIsRevealed(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const nextIdx = (fortuneIndex + 1) % DAILY_FORTUNES.length;
      setFortuneIndex(nextIdx);
      setIsRevealed(true);
      soundFx.playVictory();

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f472b6', '#fb7185', '#fbbf24', '#fbcfe8'],
        });
      } catch {
        // ignore
      }
    }, 350);
  };

  const handleCopy = () => {
    soundFx.playClick();
    const text =
      `🌸【PairMaster · ${todayHkDate} 今日幸運配對籤】🌸\n` +
      `色彩搭檔：${currentFortune.luckyColorPair.join(' + ')}\n` +
      `美食搭檔：${currentFortune.luckyFoodPair.join(' + ')}\n` +
      `黃金時段：${currentFortune.goldenHour}\n` +
      `開運建議：${currentFortune.luckyActivity}\n` +
      `今日銘言：${currentFortune.pairingWisdom}`;

    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-pink-600 tracking-tight">每日幸運配對 · 開運盲盒 🎁</h2>
        <p className="text-xs text-slate-500 font-bold">
          香港時間每日 00:00 派發專屬盲盒，揭曉今日好運色彩、美味組合與生活靈感
        </p>
      </div>

      {!hasOpenedDailyBox ? (
        /* Unopened Daily Check-in Blind Box Ritual */
        <div className="bg-gradient-to-br from-white via-pink-50 to-amber-50/80 border-2 border-pink-300 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl shadow-pink-100/70">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{todayHkDate} · 今日專屬盲盒尚未拆封</span>
          </div>

          <button
            type="button"
            onClick={handleOpenDailyBlindBox}
            className="mx-auto w-32 h-32 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-400 text-white flex flex-col items-center justify-center shadow-xl shadow-pink-200 hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
          >
            <span className="text-5xl group-hover:animate-bounce">🎁</span>
            <span className="text-[11px] font-black mt-1 tracking-wider">TAP ME</span>
          </button>

          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-slate-900">領取你今日嘅命定開運指針 ✨</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-bold max-w-md mx-auto">
              每日一抽專屬幸運色彩、味蕾搭檔同埋黃金開運時段，拆開後仲可以額外抽取靈感加碼籤！
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenDailyBlindBox}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl shadow-lg shadow-pink-200 flex items-center justify-center gap-2 mx-auto cursor-pointer active:scale-95"
          >
            <LockOpen className="w-4 h-4" />
            <span>立即拆開今日幸運盲盒 🌸</span>
          </button>
        </div>
      ) : (
        /* Revealed Main Lucky Card in Pastel Pink */
        <div className="bg-white/95 border-2 border-pink-200/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-pink-100/60 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-500 shadow-xs">
                <Sun className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">本日開運配對指針</h3>
                  <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                    ✓ 今日已打卡
                  </span>
                </div>
                <span className="text-xs text-pink-400 font-mono font-bold">
                  {todayHkDate} · 籤詩 {(fortuneIndex % DAILY_FORTUNES.length) + 1} / {DAILY_FORTUNES.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-1.5 text-xs text-pink-700 font-bold bg-pink-100 hover:bg-pink-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製' : '分享籤文'}</span>
            </button>
          </div>

          {/* Revealed Content Deck */}
          <div className={`space-y-5 transition-all duration-300 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {/* Section 1: Color Pair */}
            <div className="space-y-2">
              <span className="text-xs text-slate-600 font-bold">幸運色彩搭檔</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-pink-50/60 border border-pink-200 rounded-2xl flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border border-pink-200/80 shrink-0 shadow-sm"
                    style={{ backgroundColor: currentFortune.luckyColorHex[0] }}
                    aria-label={currentFortune.luckyColorPair[0]}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 block truncate">{currentFortune.luckyColorPair[0]}</span>
                    <span className="text-[10px] text-pink-500 font-mono font-bold uppercase">
                      {currentFortune.luckyColorHex[0]}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border border-rose-200/80 shrink-0 shadow-sm"
                    style={{ backgroundColor: currentFortune.luckyColorHex[1] }}
                    aria-label={currentFortune.luckyColorPair[1]}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 block truncate">{currentFortune.luckyColorPair[1]}</span>
                    <span className="text-[10px] text-rose-500 font-mono font-bold uppercase">
                      {currentFortune.luckyColorHex[1]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Culinary Synergy */}
            <div className="p-4 bg-pink-50/60 border border-pink-200 rounded-2xl space-y-2">
              <span className="text-xs text-pink-600 font-black block">☕ 味蕾絕配搭檔</span>
              <div className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-900">
                <span>{currentFortune.luckyFoodPair[0]}</span>
                <span className="text-pink-500">＋</span>
                <span>{currentFortune.luckyFoodPair[1]}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-bold">
                兩種層次的風味在舌尖碰撞，能帶來放鬆心神與喚醒靈感的雙重好狀態～
              </p>
            </div>

            {/* Section 3: Lucky Activity */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-black">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>今日開運推薦行動</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 font-bold leading-relaxed">
                {currentFortune.luckyActivity}
              </p>
            </div>

            {/* Section 4: Golden Hour & Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-pink-50/40 border border-pink-200/80 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-pink-600 font-bold">
                  <Clock className="w-3.5 h-3.5 text-pink-500" />
                  <span>開運黃金時段</span>
                </div>
                <span className="text-sm font-black text-slate-800 font-mono block">
                  {currentFortune.goldenHour}
                </span>
              </div>

              <div className="p-3.5 bg-pink-50/40 border border-pink-200/80 rounded-2xl space-y-1">
                <span className="text-xs text-pink-600 font-bold block">靈魂同頻關鍵字</span>
                <p className="text-sm font-black text-pink-700">
                  {currentFortune.soulmateKeywords.join(' · ')}
                </p>
              </div>
            </div>

            {/* Section 5: Daily Wisdom Quote */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-100/70 via-rose-50 to-pink-50 border border-pink-200">
              <span className="text-[10px] text-pink-600 font-black uppercase tracking-wider block mb-1">
                DAILY PAIRING WISDOM
              </span>
              <p className="text-sm text-slate-800 font-extrabold italic">
                「{currentFortune.pairingWisdom}」
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleDrawExtra}
              disabled={!isRevealed}
              className="w-full py-3 px-4 text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 disabled:opacity-70 rounded-2xl transition-all shadow-md shadow-pink-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Gift className="w-4 h-4" />
              <span>再抽靈感加碼籤 🌸</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
