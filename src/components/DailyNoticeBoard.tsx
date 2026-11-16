import React, { useEffect, useState } from 'react';
import {
  Cake,
  HeartHandshake,
  Clock,
  ShieldCheck,
  Settings,
  Sparkles,
  Crown,
  Pin,
} from 'lucide-react';
import { getMsUntilHongKongMidnight, useFirebase } from '../contexts/FirebaseContext';
import { soundFx } from '../utils/audio';

interface DailyNoticeBoardProps {
  onOpenAdmin?: () => void;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}`;
}

const FAIRY_BULBS = [
  { color: 'bg-pink-400 shadow-[0_0_8px_#f472b6]', cls: 'twinkle-bulb-1' },
  { color: 'bg-amber-300 shadow-[0_0_8px_#fcd34d]', cls: 'twinkle-bulb-2' },
  { color: 'bg-emerald-300 shadow-[0_0_8px_#6ee7b7]', cls: 'twinkle-bulb-3' },
  { color: 'bg-sky-300 shadow-[0_0_8px_#7dd3fc]', cls: 'twinkle-bulb-1' },
  { color: 'bg-violet-300 shadow-[0_0_8px_#c4b5fd]', cls: 'twinkle-bulb-2' },
  { color: 'bg-rose-400 shadow-[0_0_8px_#fb7185]', cls: 'twinkle-bulb-3' },
  { color: 'bg-yellow-300 shadow-[0_0_8px_#fde047]', cls: 'twinkle-bulb-1' },
  { color: 'bg-cyan-300 shadow-[0_0_8px_#67e8f9]', cls: 'twinkle-bulb-2' },
  { color: 'bg-fuchsia-400 shadow-[0_0_8px_#e879f9]', cls: 'twinkle-bulb-3' },
];

export const DailyNoticeBoard: React.FC<DailyNoticeBoardProps> = ({ onOpenAdmin }) => {
  const { todayBirthdayNotice, todayConfessionNotice, todayHkDate, isAdmin } = useFirebase();
  const [msLeft, setMsLeft] = useState<number>(() => getMsUntilHongKongMidnight());

  const hasAnyNotice = Boolean(todayBirthdayNotice || todayConfessionNotice);

  useEffect(() => {
    if (!hasAnyNotice && !isAdmin) return;
    const tick = () => setMsLeft(getMsUntilHongKongMidnight());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasAnyNotice, isAdmin]);

  if (!hasAnyNotice && !isAdmin) {
    return null;
  }

  return (
    <section
      aria-label="全服置頂今日限定生日祝福欄與表白告示板"
      className="bg-gradient-to-b from-pink-100/85 via-rose-50/75 to-[#FFF5F8] border-b border-pink-200/80 py-3.5 sm:py-4 px-4 sm:px-6"
    >
      <div className="max-w-6xl mx-auto">
        {!hasAnyNotice && isAdmin ? (
          <div className="bg-white/95 border-2 border-pink-300 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <span className="text-rose-600 font-black">📌 管理員置頂專區</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span>
                  今日（{todayHkDate}）生日祝福欄 (0/1) 及表白告示板 (0/1) 暫未設定，發佈後會即刻置頂顯示！
                </span>
              </div>
            </div>

            {onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onOpenAdmin();
                }}
                className="px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>設定今日生日／表白欄</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pinned Top Bar Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[11px] font-black shadow-xs">
                  <Pin className="w-3 h-3" />
                  <span>全服置頂焦點</span>
                </span>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>今日限定生日祝福 × 表白告示</span>
                </h2>
                <span className="text-[11px] font-bold text-pink-700 bg-white border border-pink-200 px-2 py-0.5 rounded-lg font-mono">
                  {todayHkDate}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-rose-700 bg-white border border-rose-200 px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono tabular-nums shadow-xs">
                  <Clock className="w-3 h-3 text-rose-500" />
                  <span>今晚 00:00 自動消失 · 剩 {formatCountdown(msLeft)}</span>
                </span>

                {isAdmin && onOpenAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onOpenAdmin();
                    }}
                    className="px-2.5 py-1 text-[11px] font-black text-pink-700 bg-white hover:bg-pink-50 border border-pink-300 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Settings className="w-3 h-3" />
                    <span>管理員編輯</span>
                  </button>
                )}
              </div>
            </div>

            {/* Eye-Catching Pinned Dual Cards */}
            <div
              className={`grid gap-4 items-stretch ${
                todayBirthdayNotice && todayConfessionNotice
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1'
              }`}
            >
              {todayBirthdayNotice && (
                /* Flashing Colorful Rainbow Fairy-Light Border Frame */
                <div className="birthday-rainbow-frame rounded-3xl p-[4px] relative flex flex-col">
                  {/* Top & Bottom Twinkling Fairy Light Bulbs */}
                  <div
                    className="flex items-center justify-around px-6 pb-1 pt-0.5 pointer-events-none shrink-0"
                    aria-hidden="true"
                  >
                    {FAIRY_BULBS.map((bulb, i) => (
                      <span
                        key={`top_${i}`}
                        className={`w-2 h-2 rounded-full ${bulb.color} ${bulb.cls}`}
                      />
                    ))}
                  </div>

                  <article className="bg-gradient-to-br from-white via-rose-50/90 to-amber-50/90 rounded-[20px] p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-400 to-pink-500 text-white flex items-center justify-center shadow-md">
                            <Cake className="w-5 h-5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-200/80 border border-amber-300 px-2 py-0.5 rounded-md">
                                <Crown className="w-3 h-3 text-amber-600" />
                                <span>今日主角登場</span>
                              </span>
                              <span className="text-[10px] font-bold text-rose-500">
                                每日免費 1 位
                              </span>
                            </div>
                            <h3 className="text-base font-black text-slate-900 mt-0.5">
                              🎂 HAPPY BIRTHDAY 生日祝福欄 🎉
                            </h3>
                          </div>
                        </div>

                        <span className="text-xl select-none" aria-hidden="true">
                          🎈✨🎁
                        </span>
                      </div>

                      {/* Birthday VIP Superstar Spotlight */}
                      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 rounded-2xl p-3 text-white shadow-md flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👑</span>
                          <span className="text-sm sm:text-base font-black tracking-wide">
                            祝「{todayBirthdayNotice.recipientName}」生日快樂！
                          </span>
                        </div>
                        <span className="text-xs font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-xl">
                          來自：{todayBirthdayNotice.senderName}
                        </span>
                      </div>

                      <p className="bg-white border-2 border-amber-200/80 rounded-2xl p-3.5 text-sm sm:text-[15px] text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words shadow-xs">
                        {todayBirthdayNotice.message}
                      </p>
                    </div>
                  </article>

                  {/* Bottom Twinkling Bulbs */}
                  <div
                    className="flex items-center justify-around px-6 pt-1 pb-0.5 pointer-events-none"
                    aria-hidden="true"
                  >
                    {[...FAIRY_BULBS].reverse().map((bulb, i) => (
                      <span
                        key={`bot_${i}`}
                        className={`w-2 h-2 rounded-full ${bulb.color} ${bulb.cls}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {todayConfessionNotice && (
                <article className="bg-gradient-to-br from-white via-pink-50 to-fuchsia-50/90 border-2 border-rose-300 rounded-3xl p-4 sm:p-5 space-y-3 shadow-lg shadow-rose-200/60 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                          <HeartHandshake className="w-5 h-5" />
                        </span>
                        <div>
                          <span className="inline-block text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
                            💘 每日限定 1 則 · 心動置頂
                          </span>
                          <h3 className="text-base font-black text-slate-900 mt-0.5">
                            💌 今日浪漫表白告示板 ✨
                          </h3>
                        </div>
                      </div>
                      <span className="text-xl select-none" aria-hidden="true">
                        💕🌹
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 bg-rose-50/90 border border-rose-200 rounded-2xl px-3.5 py-2.5">
                      <span>
                        致心儀對象：
                        <strong className="text-rose-600 font-black text-sm ml-1">
                          {todayConfessionNotice.recipientName}
                        </strong>
                      </span>
                      <span>
                        告白人：
                        <strong className="text-pink-700 font-black ml-1">
                          {todayConfessionNotice.senderName}
                        </strong>
                      </span>
                    </div>

                    <p className="bg-white border-2 border-pink-200 rounded-2xl p-3.5 text-sm sm:text-[15px] text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words shadow-xs">
                      {todayConfessionNotice.message}
                    </p>
                  </div>
                </article>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
