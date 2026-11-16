import React, { useEffect, useState } from 'react';
import {
  X,
  Cake,
  HeartHandshake,
  ShieldCheck,
  Clock,
  Trash2,
  Send,
  UserPlus,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  ANONYMOUS_DISPLAY_NAME,
  getMsUntilHongKongMidnight,
  useFirebase,
} from '../contexts/FirebaseContext';
import { soundFx } from '../utils/audio';

interface AdminNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'birthday' | 'confession' | 'admins';

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}`;
}

export const AdminNoticeModal: React.FC<AdminNoticeModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    isAdmin,
    isSuperAdmin,
    todayHkDate,
    todayBirthdayNotice,
    todayConfessionNotice,
    saveDailyNotice,
    clearDailyNotice,
    adminUsers,
    addAuthorizedAdmin,
    removeAuthorizedAdmin,
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<AdminTab>('birthday');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [msLeft, setMsLeft] = useState<number>(() => getMsUntilHongKongMidnight());

  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminNote, setNewAdminNote] = useState('');
  const [copiedSelfUid, setCopiedSelfUid] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    setMsLeft(getMsUntilHongKongMidnight());
    const id = setInterval(() => setMsLeft(getMsUntilHongKongMidnight()), 1000);
    return () => clearInterval(id);
  }, [isOpen, isAdmin]);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    if (activeTab === 'birthday') {
      setRecipientName(todayBirthdayNotice?.recipientName ?? '');
      setSenderName(todayBirthdayNotice?.senderName ?? '');
      setMessage(todayBirthdayNotice?.message ?? '');
    } else if (activeTab === 'confession') {
      setRecipientName(todayConfessionNotice?.recipientName ?? '');
      setSenderName(todayConfessionNotice?.senderName ?? '');
      setMessage(todayConfessionNotice?.message ?? '');
    }
  }, [isOpen, activeTab, todayBirthdayNotice, todayConfessionNotice]);

  if (!isOpen || !isAdmin) return null;

  const activeNotice =
    activeTab === 'birthday'
      ? todayBirthdayNotice
      : activeTab === 'confession'
      ? todayConfessionNotice
      : null;

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'admins') return;

    const cleanRecipient = recipientName.trim();
    const cleanSender = senderName.trim();
    const cleanMessage = message.trim();

    if (!cleanRecipient || !cleanSender || !cleanMessage) {
      setFeedback({
        type: 'err',
        text: '請填寫收件對象、留言署名同埋內容！',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await saveDailyNotice({
        type: activeTab,
        recipientName: cleanRecipient,
        senderName: cleanSender,
        message: cleanMessage,
      });
      setFeedback({
        type: 'ok',
        text:
          activeTab === 'birthday'
            ? `已發佈今日（${todayHkDate}）生日祝福欄！今晚 00:00 會自動消失。`
            : `已發佈今日（${todayHkDate}）表白告示板！今晚 00:00 會自動消失。`,
      });
    } catch {
      setFeedback({
        type: 'err',
        text: '儲存失敗，請確認你已登入授權管理員 Google 帳號並連線正常。',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearNotice = async () => {
    if (activeTab === 'admins') return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await clearDailyNotice(activeTab);
      setRecipientName('');
      setSenderName('');
      setMessage('');
      setFeedback({
        type: 'ok',
        text: '已立即手動撤下該欄告示（今日名額已釋放為 0/1）。',
      });
    } catch {
      setFeedback({
        type: 'err',
        text: '撤下失敗，請稍後再試。',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUid = newAdminUid.trim();
    if (!cleanUid) {
      setFeedback({ type: 'err', text: '請輸入要授權的 Google 帳號 UID。' });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await addAuthorizedAdmin(cleanUid, newAdminNote.trim() || '授權管理員');
      setNewAdminUid('');
      setNewAdminNote('');
      setFeedback({ type: 'ok', text: '已成功新增授權管理員！該帳號重新載入後即可設定告示。' });
    } catch {
      setFeedback({ type: 'err', text: '新增授權管理員失敗，請檢查 UID 格式（只限英數、底線或連字號）。' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySelfUid = async () => {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiedSelfUid(true);
      setTimeout(() => setCopiedSelfUid(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">管理員每日告示設定</h2>
              <p className="text-xs font-bold text-pink-600">
                只有管理員可見 · 今日香港日期 {todayHkDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="關閉管理員設定"
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Countdown Banner */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-rose-700 shrink-0">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>距離午夜 12:00 自動歸零消失：</span>
          </span>
          <span className="font-mono font-black text-rose-600 tabular-nums">
            {formatCountdown(msLeft)}
          </span>
        </div>

        {/* Tabs */}
        <div
          className={`grid gap-1.5 p-1 bg-pink-100/70 rounded-2xl border border-pink-200 shrink-0 ${
            isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('birthday');
            }}
            className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'birthday'
                ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-white shadow-sm'
                : 'text-slate-600 hover:text-pink-600'
            }`}
          >
            <Cake className="w-3.5 h-3.5" />
            <span>生日祝福欄</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('confession');
            }}
            className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'confession'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-pink-600'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>表白告示板</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab('admins');
              }}
              className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>授權帳號</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
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
              <span>{feedback.text}</span>
            </div>
          )}

          {activeTab !== 'admins' ? (
            <form onSubmit={handleSaveNotice} className="space-y-3">
              {/* Slot status */}
              <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-black text-slate-800">
                    {activeTab === 'birthday'
                      ? '🎂 生日祝福欄（每日免費 1 位）'
                      : '💌 表白告示板（每日限定 1 則）'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {activeNotice
                      ? '今日名額已使用 (1/1)，以下可修改或提前撤下'
                      : '今日名額空缺中 (0/1)，發佈後所有人首頁即見'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                    activeNotice
                      ? 'bg-rose-500 text-white'
                      : 'bg-white border border-pink-200 text-pink-600'
                  }`}
                >
                  {activeNotice ? '今日 1/1' : '今日 0/1'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  {activeTab === 'birthday'
                    ? '🎂 今日壽星係邊個？（致／對方稱呼）'
                    : '💌 想同邊個表白？（對方稱呼）'}
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={
                    activeTab === 'birthday' ? '例如：Fish / 小美' : '例如：阿明 / K小姐'
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">
                    {activeTab === 'birthday'
                      ? '🎁 邊個送出祝福？（署名）'
                      : '✨ 表白者署名（可填匿名）'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setSenderName(ANONYMOUS_DISPLAY_NAME);
                    }}
                    className="text-[11px] font-bold text-pink-600 hover:underline cursor-pointer"
                  >
                    一鍵填入「{ANONYMOUS_DISPLAY_NAME}」
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={40}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={
                    activeTab === 'birthday'
                      ? `例如：一班好友 / ${ANONYMOUS_DISPLAY_NAME}`
                      : `例如：一直暗戀你嘅人 / ${ANONYMOUS_DISPLAY_NAME}`
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">
                    {activeTab === 'birthday'
                      ? '✍️ 想同壽星講啲乜？'
                      : '✍️ 表白心底話'}
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {message.length}/300
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={300}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    activeTab === 'birthday'
                      ? '寫低對方想同今日壽星講嘅生日祝福⋯⋯'
                      : '寫低今日唯一一則浪漫告白內容⋯⋯'
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl shadow-md shadow-pink-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? '儲存中...'
                      : activeNotice
                      ? '更新今日告示'
                      : '發佈今日唯一名額'}
                  </span>
                </button>

                {activeNotice && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      soundFx.playClick();
                      void handleClearNotice();
                    }}
                    className="py-2.5 px-3.5 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>撤下</span>
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-3.5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-xs">
                <p className="font-black text-slate-800">主管理員帳號（自動擁有最高權限）</p>
                <p className="font-bold text-pink-600">{user?.email}</p>
                <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <span className="font-mono text-[11px] text-slate-600 truncate">
                    UID: {user?.uid}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopySelfUid()}
                    className="text-[11px] font-bold text-pink-600 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedSelfUid ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600">已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>複製</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-2.5 bg-pink-50/60 border border-pink-200 rounded-2xl p-3.5">
                <p className="text-xs font-black text-slate-800">
                  授權其他 Google 帳號管理每日告示（例如你部 iPad 用緊嘅另一個帳號）
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  先用該 Google 帳號登入 PairMaster，喺「戰績榜」頂部按「複製 UID」，再貼入下面授權即可：
                </p>
                <input
                  type="text"
                  maxLength={128}
                  value={newAdminUid}
                  onChange={(e) => setNewAdminUid(e.target.value)}
                  placeholder="貼上對方帳號 UID"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <input
                  type="text"
                  maxLength={60}
                  value={newAdminNote}
                  onChange={(e) => setNewAdminNote(e.target.value)}
                  placeholder="備註名稱（例如：我的 iPad 帳號）"
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2 text-xs font-black text-white bg-slate-800 hover:bg-slate-900 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>新增授權管理員</span>
                </button>
              </form>

              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700">
                  已授權管理員名單（{adminUsers.length}）
                </p>
                {adminUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium bg-slate-50 rounded-xl p-3 text-center">
                    暫時未有額外授權帳號
                  </p>
                ) : (
                  adminUsers.map((adm) => (
                    <div
                      key={adm.uid}
                      className="flex items-center justify-between gap-2 bg-white border border-pink-100 rounded-xl px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 truncate">{adm.note}</p>
                        <p className="font-mono text-[10px] text-slate-500 truncate">{adm.uid}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playClick();
                          void removeAuthorizedAdmin(adm.uid);
                        }}
                        className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                      >
                        移除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
