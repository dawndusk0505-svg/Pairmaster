import React, { useState, useEffect, useRef } from 'react';
import {
  Cake,
  HeartHandshake,
  ShieldCheck,
  Settings,
  Sparkles,
  Crown,
  Pin,
  BellRing,
  CalendarPlus,
  ZoomIn,
  X,
  Music,
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { soundFx } from '../utils/audio';

interface DailyNoticeBoardProps {
  onOpenAdmin?: () => void;
  onOpenSubmit?: (defaultType?: 'birthday' | 'confession') => void;
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

export const DailyNoticeBoard: React.FC<DailyNoticeBoardProps> = ({
  onOpenAdmin,
  onOpenSubmit,
}) => {
  const {
    todayBirthdayNotice,
    todayConfessionNotice,
    todayHkDate,
    isAdmin,
    isSuperAdmin,
    pendingNoticeRequests,
  } = useFirebase();

  const [zoomedPhoto, setZoomedPhoto] = useState<{ src: string; caption: string } | null>(null);
  const [songState, setSongState] = useState<'idle' | 'waiting_tap' | 'playing' | 'muted_hint'>('idle');
  const hasPlayedBirthdayRef = useRef<string | null>(null);

  const hasAnyNotice = Boolean(todayBirthdayNotice || todayConfessionNotice);
  const pendingCount = isSuperAdmin ? pendingNoticeRequests.length : 0;

  useEffect(() => {
    if (!todayBirthdayNotice) {
      soundFx.stopHappyBirthday();
      setSongState('idle');
      return;
    }

    const noticeKey = `${todayBirthdayNotice.activeDate}_${todayBirthdayNotice.recipientName}`;
    if (hasPlayedBirthdayRef.current === noticeKey) return;

    let cancelled = false;
    let isTrying = false;
    let removeListeners: (() => void) | null = null;

    const attachGestureFallback = () => {
      if (cancelled || removeListeners) return;

      const handleFirstGesture = (event: Event) => {
        if (cancelled || isTrying || hasPlayedBirthdayRef.current === noticeKey) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('[data-birthday-replay="true"]')) {
          return;
        }

        isTrying = true;
        // Call playHappyBirthday synchronously in the gesture call stack before any await
        void soundFx
          .playHappyBirthday(() => {
            if (!cancelled) setSongState('idle');
          })
          .then((res) => {
            isTrying = false;
            if (cancelled) {
              soundFx.stopHappyBirthday();
              return;
            }
            if (res === 'played') {
              hasPlayedBirthdayRef.current = noticeKey;
              setSongState('playing');
              removeListeners?.();
              removeListeners = null;
            } else if (res === 'muted') {
              hasPlayedBirthdayRef.current = noticeKey;
              setSongState('idle');
              removeListeners?.();
              removeListeners = null;
            }
            // If still 'blocked' (e.g. a scroll drag rather than a tap), keep listeners active!
          });
      };

      const opts: AddEventListenerOptions = { capture: true, passive: true };
      window.addEventListener('touchend', handleFirstGesture, opts);
      window.addEventListener('click', handleFirstGesture, opts);
      window.addEventListener('keydown', handleFirstGesture, { capture: true });

      removeListeners = () => {
        window.removeEventListener('touchend', handleFirstGesture, { capture: true });
        window.removeEventListener('click', handleFirstGesture, { capture: true });
        window.removeEventListener('keydown', handleFirstGesture, { capture: true });
      };
    };

    const triggerInitialAutoplay = () => {
      if (cancelled || hasPlayedBirthdayRef.current === noticeKey) return;
      void soundFx
        .playHappyBirthday(() => {
          if (!cancelled) setSongState('idle');
        })
        .then((status) => {
          if (cancelled) {
            soundFx.stopHappyBirthday();
            return;
          }
          if (status === 'played') {
            hasPlayedBirthdayRef.current = noticeKey;
            setSongState('playing');
          } else if (status === 'muted') {
            hasPlayedBirthdayRef.current = noticeKey;
            setSongState('idle');
          } else {
            setSongState('waiting_tap');
            attachGestureFallback();
          }
        });
    };

    triggerInitialAutoplay();

    return () => {
      cancelled = true;
      removeListeners?.();
      removeListeners = null;
      soundFx.stopHappyBirthday();
      setSongState('idle');
    };
  }, [todayBirthdayNotice]);

  return (
    <section
      aria-label="全服置頂今日限定生日祝福欄與表白告示板"
      className="bg-gradient-to-b from-pink-100/85 via-rose-50/75 to-[#FFF5F8] border-b border-pink-200/80 py-3.5 sm:py-4 px-4 sm:px-6"
    >
      <div className="max-w-6xl mx-auto space-y-2.5">
        {/* Super Admin Real-time Notification Strip */}
        {isSuperAdmin && pendingCount > 0 && onOpenAdmin && (
          <div
            role="status"
            className="bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 text-white rounded-2xl px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
              <span className="w-7 h-7 rounded-xl bg-white/25 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4 animate-bounce" />
              </span>
              <span>
                收到 {pendingCount} 份新的「生日祝福／表白」預約投稿，按時間排序等你允許即刻發佈！
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onOpenAdmin();
              }}
              className="px-3.5 py-1.5 text-xs font-black bg-white text-rose-600 hover:bg-rose-50 rounded-xl shadow-xs cursor-pointer transition-transform active:scale-95 shrink-0"
            >
              立即審核並發佈 →
            </button>
          </div>
        )}

        {!hasAnyNotice ? (
          <div className="bg-white/95 border-2 border-pink-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Pin className="w-4 h-4" />
              </span>
              <div>
                <span className="text-rose-600 font-black">
                  🎂 每日免費生日祝福欄 × 💌 浪漫表白置頂板
                </span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span>
                  今日（{todayHkDate}）名額尚餘免費預約，字數不限！想同壽星慶祝或向心儀對象表白？即時揀日子投稿！
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onOpenSubmit && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onOpenSubmit('birthday');
                    }}
                    className="px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-amber-400 to-rose-500 hover:from-amber-500 hover:to-rose-600 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Cake className="w-3.5 h-3.5" />
                    <span>免費預約生日欄</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onOpenSubmit('confession');
                    }}
                    className="px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>投稿表白</span>
                  </button>
                </>
              )}

              {isAdmin && onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    onOpenAdmin();
                  }}
                  className="px-3 py-1.5 text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  <span>管理員設定</span>
                </button>
              )}
            </div>
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

              <div className="flex flex-wrap items-center gap-2">
                {onOpenSubmit && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onOpenSubmit('birthday');
                    }}
                    className="px-2.5 py-1 text-[11px] font-black text-white bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95"
                  >
                    <CalendarPlus className="w-3 h-3" />
                    <span>我想預約生日／投稿表白</span>
                  </button>
                )}

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
                    <span>管理員編輯{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>
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

                      {todayBirthdayNotice.photoDataUrl ? (
                        <div className="flex flex-col sm:flex-row gap-3.5 items-center sm:items-stretch">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playClick();
                              setZoomedPhoto({
                                src: todayBirthdayNotice.photoDataUrl!,
                                caption: `🎂 祝「${todayBirthdayNotice.recipientName}」生日快樂！`,
                              });
                            }}
                            className="group relative bg-white p-1.5 pb-2 rounded-2xl shadow-lg ring-2 ring-amber-300 hover:ring-rose-400 transition-all shrink-0 cursor-pointer hover:-rotate-1 active:scale-95"
                            title="點擊放大睇相片"
                          >
                            <img
                              src={todayBirthdayNotice.photoDataUrl}
                              alt={`${todayBirthdayNotice.recipientName} 生日寫真`}
                              className="w-36 h-36 sm:w-40 sm:h-40 object-cover rounded-xl"
                            />
                            <span className="absolute -top-2 -left-2 px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-rose-500 text-white text-[10px] font-black shadow-sm">
                              👑 主角寫真
                            </span>
                            <span className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-black text-rose-600">
                              <ZoomIn className="w-3 h-3" />
                              <span>點擊放大睇全圖</span>
                            </span>
                          </button>

                          <p className="flex-1 w-full bg-white border-2 border-amber-200/80 rounded-2xl p-3.5 text-sm sm:text-[15px] text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words shadow-xs">
                            {todayBirthdayNotice.message}
                          </p>
                        </div>
                      ) : (
                        <p className="bg-white border-2 border-amber-200/80 rounded-2xl p-3.5 text-sm sm:text-[15px] text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words shadow-xs">
                          {todayBirthdayNotice.message}
                        </p>
                      )}
                    </div>

                    {/* Built-in Birthday Song Player Bar (only inside active Birthday Post) */}
                    <div className="bg-gradient-to-r from-amber-100/90 via-rose-100/80 to-pink-100/90 border border-amber-200 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-xl bg-white text-rose-500 flex items-center justify-center shadow-xs shrink-0 ${
                            songState === 'playing' ? 'animate-bounce' : ''
                          }`}
                        >
                          <Music className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-rose-800 truncate">
                            🎶 今日壽星專屬生日歌 · Happy Birthday
                          </p>
                          {songState !== 'idle' && (
                            <p className="text-[10px] font-bold text-rose-600/90">
                              {songState === 'playing'
                                ? '正在為壽星播放生日快樂歌⋯'
                                : songState === 'waiting_tap'
                                ? '輕觸畫面任何位置或右方掣即播'
                                : '目前已設為靜音，請先開啟右上角喇叭'}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        data-birthday-replay="true"
                        onClick={() => {
                          const noticeKey = `${todayBirthdayNotice.activeDate}_${todayBirthdayNotice.recipientName}`;
                          void soundFx
                            .playHappyBirthday(() => setSongState('idle'))
                            .then((res) => {
                              if (res === 'played') {
                                hasPlayedBirthdayRef.current = noticeKey;
                                setSongState('playing');
                              } else if (res === 'muted') {
                                setSongState('muted_hint');
                                window.setTimeout(() => {
                                  setSongState((prev) => (prev === 'muted_hint' ? 'idle' : prev));
                                }, 2500);
                              } else {
                                setSongState('waiting_tap');
                              }
                            });
                        }}
                        className={`px-3 py-1.5 text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border shrink-0 ${
                          songState === 'playing'
                            ? 'text-white bg-gradient-to-r from-rose-500 to-pink-500 border-rose-400 shadow-rose-200'
                            : songState === 'waiting_tap'
                            ? 'text-white bg-gradient-to-r from-amber-500 to-rose-500 border-amber-400 animate-pulse'
                            : songState === 'muted_hint'
                            ? 'text-slate-700 bg-white border-slate-300'
                            : 'text-rose-700 bg-white hover:bg-rose-50 border-rose-200'
                        }`}
                        title="播放生日快樂歌"
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>
                          {songState === 'playing'
                            ? '播放中 ♫'
                            : songState === 'waiting_tap'
                            ? '點一下播生日歌'
                            : songState === 'muted_hint'
                            ? '靜音中'
                            : '播放生日歌'}
                        </span>
                      </button>
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

                    {todayConfessionNotice.photoDataUrl ? (
                      <div className="flex flex-col sm:flex-row gap-3.5 items-center sm:items-stretch">
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playClick();
                            setZoomedPhoto({
                              src: todayConfessionNotice.photoDataUrl!,
                              caption: `💌 致「${todayConfessionNotice.recipientName}」的紀念相片`,
                            });
                          }}
                          className="group relative bg-white p-1.5 pb-2 rounded-2xl shadow-md ring-2 ring-rose-200 hover:ring-pink-400 transition-all shrink-0 cursor-pointer hover:rotate-1 active:scale-95"
                          title="點擊放大睇相片"
                        >
                          <img
                            src={todayConfessionNotice.photoDataUrl}
                            alt={`${todayConfessionNotice.recipientName} 紀念相片`}
                            className="w-32 h-32 sm:w-36 sm:h-36 object-cover rounded-xl"
                          />
                          <span className="absolute -top-2 -left-2 px-2 py-0.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black shadow-sm">
                            💕 紀念相片
                          </span>
                          <span className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-black text-pink-600">
                            <ZoomIn className="w-3 h-3" />
                            <span>點擊放大</span>
                          </span>
                        </button>

                        <p className="flex-1 w-full bg-white border-2 border-pink-200 rounded-2xl p-3.5 text-sm sm:text-[15px] text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words shadow-xs">
                          {todayConfessionNotice.message}
                        </p>
                      </div>
                    ) : (
                      <p className="bg-white border-2 border-pink-200 rounded-2xl p-3.5 text-sm sm:text-[15px] text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words shadow-xs">
                        {todayConfessionNotice.message}
                      </p>
                    )}
                  </div>
                </article>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tap-to-Enlarge Photo Lightbox */}
      {zoomedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-3xl p-3 sm:p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-black text-slate-900">{zoomedPhoto.caption}</p>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                aria-label="關閉大圖預覽"
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-pink-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={zoomedPhoto.src}
              alt={zoomedPhoto.caption}
              className="w-full max-h-[75vh] object-contain rounded-2xl bg-pink-50/40"
            />
          </div>
        </div>
      )}
    </section>
  );
};
