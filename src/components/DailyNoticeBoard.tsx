import React, { useEffect, useState } from 'react';
import { Cake, HeartHandshake, Clock, ShieldCheck, Settings, Sparkles } from 'lucide-react';
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
      aria-label="今日限定生日祝福欄與表白告示板"
      className="max-w-6xl mx-auto px-4 sm:px-6 mt-4"
    >
      {!hasAnyNotice && isAdmin ? (
        <div className="bg-white/85 border border-pink-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
            <span className="w-7 h-7 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <span className="text-pink-600 font-black">管理員專區</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span>
                今日（{todayHkDate}）生日祝福欄 (0/1) 及表白告示板 (0/1) 暫未設定，過今晚 12:00 自動歸零
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
              className="px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>設定今日告示</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm border-2 border-pink-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <h2 className="text-sm sm:text-base font-black text-slate-800">
                今日限定雙欄告示
              </h2>
              <span className="text-[11px] font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-lg font-mono">
                {todayHkDate}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3 h-3" />
                <span>今晚 00:00 自動消失 · 剩 {formatCountdown(msLeft)}</span>
              </span>

              {isAdmin && onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    onOpenAdmin();
                  }}
                  className="px-2.5 py-1 text-[11px] font-black text-pink-700 bg-pink-100 hover:bg-pink-200 border border-pink-300 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  <span>管理員編輯</span>
                </button>
              )}
            </div>
          </div>

          {/* Two-Part Notice Cards */}
          <div
            className={`grid gap-3.5 ${
              todayBirthdayNotice && todayConfessionNotice
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1'
            }`}
          >
            {todayBirthdayNotice && (
              <article className="bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50/70 border border-pink-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-400 text-white flex items-center justify-center shadow-xs">
                      <Cake className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        🎂 今日壽星生日祝福欄
                      </h3>
                      <p className="text-[10px] font-bold text-rose-500">
                        每日免費 1 位專屬祝福 · 午夜自動撤下
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-700 bg-white/75 border border-pink-100 rounded-xl px-3 py-2">
                  <span>
                    致今日壽星：
                    <strong className="text-rose-600 font-black ml-1">
                      {todayBirthdayNotice.recipientName}
                    </strong>
                  </span>
                  <span className="text-slate-300" aria-hidden="true">|</span>
                  <span>
                    祝福人：
                    <strong className="text-pink-700 font-black ml-1">
                      {todayBirthdayNotice.senderName}
                    </strong>
                  </span>
                </div>

                <p className="bg-white/90 border border-pink-200/70 rounded-xl p-3 text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words">
                  {todayBirthdayNotice.message}
                </p>
              </article>
            )}

            {todayConfessionNotice && (
              <article className="bg-gradient-to-br from-pink-50 via-fuchsia-50/70 to-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-xs">
                      <HeartHandshake className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        💌 今日表白告示板
                      </h3>
                      <p className="text-[10px] font-bold text-pink-600">
                        每日限定 1 則心動告白 · 午夜自動撤下
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-700 bg-white/75 border border-rose-100 rounded-xl px-3 py-2">
                  <span>
                    給：
                    <strong className="text-rose-600 font-black ml-1">
                      {todayConfessionNotice.recipientName}
                    </strong>
                  </span>
                  <span className="text-slate-300" aria-hidden="true">|</span>
                  <span>
                    來自：
                    <strong className="text-pink-700 font-black ml-1">
                      {todayConfessionNotice.senderName}
                    </strong>
                  </span>
                </div>

                <p className="bg-white/90 border border-rose-200/70 rounded-xl p-3 text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words">
                  {todayConfessionNotice.message}
                </p>
              </article>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
