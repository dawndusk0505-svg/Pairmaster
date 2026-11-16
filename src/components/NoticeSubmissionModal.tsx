import React, { useEffect, useState } from 'react';
import {
  X,
  Cake,
  HeartHandshake,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Sparkles,
  LogIn,
} from 'lucide-react';
import {
  ANONYMOUS_DISPLAY_NAME,
  addDaysToHkDate,
  useFirebase,
} from '../contexts/FirebaseContext';
import { soundFx } from '../utils/audio';

interface NoticeSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'birthday' | 'confession';
}

function formatSubmitTime(ms: number): string {
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms));
}

export const NoticeSubmissionModal: React.FC<NoticeSubmissionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'birthday',
}) => {
  const {
    todayHkDate,
    isDateSlotBooked,
    submitNoticeRequest,
    myNoticeRequests,
    signInWithGoogle,
    isVerifiedGoogleUser,
    isAuthBusy,
  } = useFirebase();

  const [noticeType, setNoticeType] = useState<'birthday' | 'confession'>(defaultType);
  const [targetDate, setTargetDate] = useState<string>(todayHkDate);
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needGoogleSignIn, setNeedGoogleSignIn] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNoticeType(defaultType);
    setTargetDate((prev) => (prev < todayHkDate ? todayHkDate : prev || todayHkDate));
    setFeedback(null);
    setNeedGoogleSignIn(false);
  }, [isOpen, defaultType, todayHkDate]);

  if (!isOpen) return null;

  const maxBookingDate = addDaysToHkDate(todayHkDate, 60);
  const tomorrowDate = addDaysToHkDate(todayHkDate, 1);
  const dayAfterDate = addDaysToHkDate(todayHkDate, 2);
  const isSlotTaken = isDateSlotBooked(noticeType, targetDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRecipient = recipientName.trim();
    const cleanSender = senderName.trim() || ANONYMOUS_DISPLAY_NAME;
    const cleanMessage = message.trim();

    if (!cleanRecipient || !cleanMessage) {
      setFeedback({
        type: 'err',
        text: '請填寫「對方稱呼」同埋你想寫嘅內容！',
      });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || targetDate < todayHkDate) {
      setFeedback({
        type: 'err',
        text: '請揀選今日或之後嘅有效日期。',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setNeedGoogleSignIn(false);
    try {
      const outcome = await submitNoticeRequest({
        type: noticeType,
        targetDate,
        recipientName: cleanRecipient,
        senderName: cleanSender,
        message: cleanMessage,
        contactNote: contactNote.trim(),
      });

      if (outcome === 'need_google') {
        setNeedGoogleSignIn(true);
        setFeedback({
          type: 'err',
          text: '請先按下方「Google 登入」驗證身份，即可立即送出免費預約申請！',
        });
        return;
      }

      soundFx.playClick();
      setRecipientName('');
      setSenderName('');
      setMessage('');
      setContactNote('');
      setFeedback({
        type: 'ok',
        text: `已成功送出 ${targetDate} 的${
          noticeType === 'birthday' ? '🎂 生日祝福' : '💌 浪漫表白'
        }預約！系統已記低你的提交時間並通知版主，版主允許後就會直接發佈！`,
      });
    } catch {
      setFeedback({
        type: 'err',
        text: '提交時出現連線問題，請稍後再試一次。',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">免費預約置頂生日欄／表白板</h2>
              <p className="text-xs font-bold text-pink-600">
                揀選日子・即時查名額・字數不限・版主確認即登全服置頂
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="關閉預約視窗"
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-pink-100/70 rounded-2xl border border-pink-200">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setNoticeType('birthday');
              }}
              className={`py-2.5 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                noticeType === 'birthday'
                  ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-white shadow-sm'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <Cake className="w-4 h-4" />
              <span>🎂 預約生日祝福欄</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setNoticeType('confession');
              }}
              className={`py-2.5 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                noticeType === 'confession'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>💌 預約表白告示板</span>
            </button>
          </div>

          {/* Date Picker + Live Quota Checker */}
          <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="booking-target-date"
                className="text-xs font-black text-slate-800 flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-pink-500" />
                <span>想邊一日登出？（香港日期）</span>
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                每日免費各 1 個名額 · 先到先得
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                id="booking-target-date"
                type="date"
                min={todayHkDate}
                max={maxBookingDate}
                value={targetDate}
                onChange={(e) => {
                  if (e.target.value) setTargetDate(e.target.value);
                }}
                className="px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-800 bg-white border border-pink-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: '今日', date: todayHkDate },
                  { label: '明日', date: tomorrowDate },
                  { label: '後日', date: dayAfterDate },
                ].map((chip) => {
                  const chipTaken = isDateSlotBooked(noticeType, chip.date);
                  const isSelected = targetDate === chip.date;
                  return (
                    <button
                      key={chip.date}
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setTargetDate(chip.date);
                      }}
                      className={`px-2.5 py-1.5 text-[11px] font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
                          : 'bg-white text-slate-700 border-pink-200 hover:bg-pink-100/60'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          chipTaken
                            ? isSelected
                              ? 'bg-rose-200'
                              : 'bg-rose-500'
                            : isSelected
                            ? 'bg-emerald-200'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-time Availability Badge */}
            <div
              className={`rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 border ${
                isSlotTaken
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {isSlotTaken ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span>
                  {isSlotTaken
                    ? `${targetDate} ${
                        noticeType === 'birthday' ? '生日欄' : '表白欄'
                      }已有預約／正在展示 (1/1 已滿額)`
                    : `${targetDate} ${
                        noticeType === 'birthday' ? '生日欄' : '表白欄'
                      }尚餘 1 個免費名額 (0/1 空缺中)`}
                </span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                  isSlotTaken ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}
              >
                {isSlotTaken ? '已滿 1/1' : '可用 0/1'}
              </span>
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-2xl p-3 text-xs font-bold flex items-start gap-2 border ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p>{feedback.text}</p>
                {needGoogleSignIn && !isVerifiedGoogleUser && (
                  <button
                    type="button"
                    disabled={isAuthBusy}
                    onClick={() => {
                      soundFx.playClick();
                      void signInWithGoogle();
                    }}
                    className="px-3 py-1.5 text-xs font-black text-white bg-pink-500 hover:bg-pink-600 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Google 登入後送出</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  {noticeType === 'birthday' ? '🎂 壽星稱呼（給邊個睇？）' : '💘 心儀對象稱呼'}
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={noticeType === 'birthday' ? '例如：Fish / 阿文' : '例如：K小姐 / 成日玩配對嘅你'}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">
                    {noticeType === 'birthday' ? '🎁 你的署名' : '✨ 告白署名'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setSenderName(ANONYMOUS_DISPLAY_NAME);
                    }}
                    className="text-[11px] font-bold text-pink-600 hover:underline cursor-pointer"
                  >
                    一鍵匿名
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={40}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={`留空將顯示 ${ANONYMOUS_DISPLAY_NAME}`}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-700">
                  {noticeType === 'birthday'
                    ? '✍️ 想送出嘅生日祝福（字數不限）'
                    : '✍️ 想講嘅表白內容（字數不限）'}
                </label>
                <span className="text-[11px] font-mono font-bold text-pink-600">
                  已寫 {message.length} 字 · 字數不限
                </span>
              </div>
              <textarea
                rows={5}
                maxLength={10000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  noticeType === 'birthday'
                    ? '隨心寫長寫短都得，盡情寫低你想同壽星講嘅說話、回憶或者祝福⋯⋯'
                    : '隨心寫低你想表白嘅心情、想同對方講嘅故事，字數不限，版主確認後就會為你置頂展示⋯⋯'
                }
                className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 resize-y min-h-[112px]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                💬 聯絡備註（選填 · 例如你的 IG／Threads 名稱，只有版主睇到）
              </label>
              <input
                type="text"
                maxLength={80}
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                placeholder="例如：IG @candy_fan（方便版主有需要時聯絡你，唔公開顯示）"
                className="w-full px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 text-sm font-black text-white bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-rose-600 rounded-2xl shadow-md shadow-pink-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-all active:scale-99"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? '傳送給版主中...'
                  : isSlotTaken
                  ? `送出候補申請（${targetDate}）`
                  : `免費送出預約申請（${targetDate}）`}
              </span>
            </button>
          </form>

          {/* My Submitted Requests Status List */}
          {myNoticeRequests.length > 0 && (
            <div className="border-t border-pink-100 pt-3.5 space-y-2">
              <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-pink-500" />
                <span>我的預約申請紀錄（{myNoticeRequests.length}）</span>
              </p>
              <div className="space-y-2">
                {myNoticeRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-pink-50/50 border border-pink-100 rounded-2xl p-3 text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-black text-slate-800">
                        <span>{req.type === 'birthday' ? '🎂 生日' : '💌 表白'}</span>
                        <span className="font-mono text-pink-700">{req.targetDate}</span>
                        <span>· 給「{req.recipientName}」</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          req.status === 'approved'
                            ? 'bg-emerald-500 text-white'
                            : req.status === 'rejected'
                            ? 'bg-slate-400 text-white'
                            : 'bg-amber-400 text-slate-900'
                        }`}
                      >
                        {req.status === 'approved'
                          ? '✅ 已允許並安排發佈'
                          : req.status === 'rejected'
                          ? '名額已由其他人搶先／未採用'
                          : '⏳ 等待版主審核通知中'}
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium line-clamp-2 whitespace-pre-wrap">
                      {req.message}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      送出時間：{formatSubmitTime(req.createdAtMs)}（系統已排隊記序）
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
