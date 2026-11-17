import React, { useEffect, useMemo, useState } from 'react';
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
  Inbox,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Award,
  Camera,
  Music,
  Tag,
  Pencil,
  Search,
  Users,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import {
  ANONYMOUS_DISPLAY_NAME,
  NoticeRequestRecord,
  SPIRIT_CHARACTER_OPTIONS,
  getHongKongDateString,
  getMsUntilHongKongMidnight,
  useFirebase,
} from '../contexts/FirebaseContext';
import { soundFx } from '../utils/audio';
import { compressNoticePhoto } from '../utils/imageCompress';

export type AdminTab = 'requests' | 'scheduled' | 'birthday' | 'confession' | 'names' | 'visitors' | 'admins';

interface AdminNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AdminTab;
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

function formatExactHkTime(ms: number): string {
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ms));
}

export const AdminNoticeModal: React.FC<AdminNoticeModalProps> = ({ isOpen, onClose, initialTab }) => {
  const {
    user,
    isAdmin,
    isSuperAdmin,
    gameDisplayName,
    todayHkDate,
    todayBirthdayNotice,
    todayConfessionNotice,
    saveDailyNotice,
    clearDailyNotice,
    adminUsers,
    addAuthorizedAdmin,
    removeAuthorizedAdmin,
    pendingNoticeRequests,
    scheduledNotices,
    isDateSlotBooked,
    approveNoticeRequest,
    rejectNoticeRequest,
    cancelScheduledNotice,
    leaderboardEntries,
    updateMyGameDisplayName,
    adminUpdateLeaderboardDisplayName,
    adminDeleteLeaderboardEntry,
    currentDeviceId,
    visitors,
    visitorsError,
    anonAuthDisabled,
    adminRenameVisitor,
    adminDeleteVisitor,
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<AdminTab>('birthday');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyReqId, setBusyReqId] = useState<string | null>(null);
  const [isPreviewingSong, setIsPreviewingSong] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [msLeft, setMsLeft] = useState<number>(() => getMsUntilHongKongMidnight());

  const [myNameInput, setMyNameInput] = useState('');
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryName, setEditingEntryName] = useState('');
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);

  const [visitorSearchQuery, setVisitorSearchQuery] = useState('');
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'signed_in' | 'guest'>('all');
  const [editingVisitorId, setEditingVisitorId] = useState<string | null>(null);
  const [editingVisitorName, setEditingVisitorName] = useState('');
  const [confirmDeleteVisitorId, setConfirmDeleteVisitorId] = useState<string | null>(null);
  const [busyVisitorId, setBusyVisitorId] = useState<string | null>(null);

  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminNote, setNewAdminNote] = useState('');
  const [copiedSelfUid, setCopiedSelfUid] = useState(false);

  // Open requested tab (e.g. 'visitors') or auto-switch to 'requests' when pending items exist
  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    if (initialTab) {
      if ((initialTab === 'visitors' || initialTab === 'requests' || initialTab === 'scheduled' || initialTab === 'admins') && !isSuperAdmin) {
        setActiveTab('birthday');
      } else {
        setActiveTab(initialTab);
      }
      return;
    }
    if (isSuperAdmin && pendingNoticeRequests.length > 0) {
      setActiveTab('requests');
    } else {
      setActiveTab('birthday');
    }
  }, [isOpen, isAdmin, isSuperAdmin, initialTab]); // intentional: only on open/tab target change

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    setMsLeft(getMsUntilHongKongMidnight());
    const id = setInterval(() => setMsLeft(getMsUntilHongKongMidnight()), 1000);
    return () => clearInterval(id);
  }, [isOpen, isAdmin]);

  useEffect(() => {
    if (!isOpen) {
      if (isPreviewingSong) {
        soundFx.stopHappyBirthday();
        setIsPreviewingSong(false);
      }
      return;
    }
    setFeedback(null);
    if (activeTab === 'birthday') {
      setRecipientName(todayBirthdayNotice?.recipientName ?? '');
      setSenderName(todayBirthdayNotice?.senderName ?? '');
      setMessage(todayBirthdayNotice?.message ?? '');
      setPhotoDataUrl(todayBirthdayNotice?.photoDataUrl ?? '');
    } else if (activeTab === 'confession') {
      setRecipientName(todayConfessionNotice?.recipientName ?? '');
      setSenderName(todayConfessionNotice?.senderName ?? '');
      setMessage(todayConfessionNotice?.message ?? '');
      setPhotoDataUrl(todayConfessionNotice?.photoDataUrl ?? '');
    } else if (activeTab === 'names') {
      setMyNameInput(gameDisplayName);
      setEditingEntryId(null);
      setConfirmDeleteEntryId(null);
    } else if (activeTab === 'visitors') {
      setEditingVisitorId(null);
      setConfirmDeleteVisitorId(null);
    }
  }, [isOpen, activeTab, todayBirthdayNotice, todayConfessionNotice, gameDisplayName]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessingPhoto(true);
    setFeedback(null);
    try {
      const compressed = await compressNoticePhoto(file);
      setPhotoDataUrl(compressed);
      soundFx.playClick();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : '相片處理失敗，請換另一張相片再試。',
      });
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Group pending requests by (targetDate, type) and rank chronologically so the 1st person is unmistakable
  const groupedPending = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        targetDate: string;
        type: 'birthday' | 'confession';
        items: NoticeRequestRecord[];
      }
    >();

    for (const req of pendingNoticeRequests) {
      const key = `${req.targetDate}__${req.type}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, targetDate: req.targetDate, type: req.type, items: [] };
        groups.set(key, g);
      }
      g.items.push(req);
    }

    const list = Array.from(groups.values());
    list.sort((a, b) => a.key.localeCompare(b.key));
    list.forEach((g) => g.items.sort((a, b) => a.createdAtMs - b.createdAtMs));
    return list;
  }, [pendingNoticeRequests]);

  if (!isOpen || !isAdmin) return null;

  const activeNotice =
    activeTab === 'birthday'
      ? todayBirthdayNotice
      : activeTab === 'confession'
      ? todayConfessionNotice
      : null;

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'birthday' && activeTab !== 'confession') return;

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
        photoDataUrl: photoDataUrl || undefined,
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
    if (activeTab !== 'birthday' && activeTab !== 'confession') return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await clearDailyNotice(activeTab);
      setRecipientName('');
      setSenderName('');
      setMessage('');
      setPhotoDataUrl('');
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

  const handleApproveRequest = async (req: NoticeRequestRecord) => {
    setBusyReqId(req.id);
    setFeedback(null);
    try {
      await approveNoticeRequest(req);
      soundFx.playClick();
      setFeedback({
        type: 'ok',
        text:
          req.targetDate === todayHkDate
            ? `已允許並即時置頂發佈給「${req.recipientName}」的${
                req.type === 'birthday' ? '生日祝福' : '表白'
              }！`
            : `已允許！系統已為 ${req.targetDate} 自動排期，當日 00:00 會自動置頂發佈。`,
      });
    } catch {
      setFeedback({
        type: 'err',
        text: '允許發佈時發生錯誤，請稍後再試。',
      });
    } finally {
      setBusyReqId(null);
    }
  };

  const handleRejectRequest = async (req: NoticeRequestRecord) => {
    setBusyReqId(req.id);
    setFeedback(null);
    try {
      await rejectNoticeRequest(req.id);
      setFeedback({
        type: 'ok',
        text: `已標記婉拒給「${req.recipientName}」的 ${req.targetDate} 申請。`,
      });
    } catch {
      setFeedback({
        type: 'err',
        text: '操作失敗，請稍後再試。',
      });
    } finally {
      setBusyReqId(null);
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

  const handleApplyMyGameName = async (targetName: string, successText?: string) => {
    const cleanName = targetName.trim() || ANONYMOUS_DISPLAY_NAME;
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateMyGameDisplayName(cleanName);
      setMyNameInput(cleanName);
      soundFx.playClick();
      setFeedback({
        type: 'ok',
        text: successText || `已將你嘅遊戲名稱更新為「${cleanName}」，並同步至戰績榜！`,
      });
    } catch {
      setFeedback({ type: 'err', text: '更新遊戲名稱失敗，請稍後再試。' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameLeaderboardEntry = async (entryId: string, nextName: string, successText?: string) => {
    const cleanName = nextName.trim() || ANONYMOUS_DISPLAY_NAME;
    setBusyEntryId(entryId);
    setFeedback(null);
    try {
      await adminUpdateLeaderboardDisplayName(entryId, cleanName);
      setEditingEntryId(null);
      soundFx.playClick();
      setFeedback({
        type: 'ok',
        text: successText || `已將該玩家戰績榜名稱修改為「${cleanName}」！`,
      });
    } catch {
      setFeedback({ type: 'err', text: '修改名稱失敗，請確認你擁有管理員權限並連線正常。' });
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleDeleteLeaderboardEntry = async (entryId: string) => {
    setBusyEntryId(entryId);
    setFeedback(null);
    try {
      await adminDeleteLeaderboardEntry(entryId);
      setConfirmDeleteEntryId(null);
      soundFx.playClick();
      setFeedback({
        type: 'ok',
        text: '已從全服戰績榜永久刪除該項紀錄！',
      });
    } catch {
      setFeedback({ type: 'err', text: '刪除紀錄失敗，請稍後再試。' });
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleRenameVisitor = async (deviceId: string, nextName: string) => {
    const cleanName = nextName.trim() || ANONYMOUS_DISPLAY_NAME;
    setBusyVisitorId(deviceId);
    setFeedback(null);
    try {
      await adminRenameVisitor(deviceId, cleanName);
      setEditingVisitorId(null);
      soundFx.playClick();
      setFeedback({
        type: 'ok',
        text: `已為該裝置訪客標註名稱為「${cleanName}」！`,
      });
    } catch {
      setFeedback({ type: 'err', text: '修改訪客備註名稱失敗，請稍後再試。' });
    } finally {
      setBusyVisitorId(null);
    }
  };

  const handleDeleteVisitor = async (deviceId: string) => {
    setBusyVisitorId(deviceId);
    setFeedback(null);
    try {
      await adminDeleteVisitor(deviceId);
      setConfirmDeleteVisitorId(null);
      soundFx.playClick();
      setFeedback({
        type: 'ok',
        text: '已移除該裝置的訪客統計紀錄！',
      });
    } catch {
      setFeedback({ type: 'err', text: '刪除訪客紀錄失敗，請稍後再試。' });
    } finally {
      setBusyVisitorId(null);
    }
  };

  const visitorSummary = useMemo(() => {
    let signedInCount = 0;
    let guestCount = 0;
    let todayActiveCount = 0;
    let totalVisits = 0;

    for (const v of visitors) {
      if (v.isSignedInUser) signedInCount += 1;
      else guestCount += 1;
      totalVisits += v.visitCount;
      if (getHongKongDateString(new Date(v.lastSeenAtMs)) === todayHkDate) {
        todayActiveCount += 1;
      }
    }
    return {
      uniqueDevices: visitors.length,
      signedInCount,
      guestCount,
      todayActiveCount,
      totalVisits,
    };
  }, [visitors, todayHkDate]);

  const filteredVisitors = useMemo(() => {
    const q = visitorSearchQuery.trim().toLowerCase();
    return visitors.filter((v) => {
      if (visitorFilter === 'signed_in' && !v.isSignedInUser) return false;
      if (visitorFilter === 'guest' && v.isSignedInUser) return false;
      if (!q) return true;
      return (
        v.displayName.toLowerCase().includes(q) ||
        v.deviceLabel.toLowerCase().includes(q) ||
        v.deviceId.toLowerCase().includes(q)
      );
    });
  }, [visitors, visitorFilter, visitorSearchQuery]);

  const filteredLeaderboardForAdmin = useMemo(() => {
    const q = nameSearchQuery.trim().toLowerCase();
    return [...leaderboardEntries]
      .sort((a, b) => b.highScore - a.highScore)
      .filter((entry) => {
        if (!q) return true;
        return (
          entry.displayName.toLowerCase().includes(q) ||
          entry.themeName.toLowerCase().includes(q) ||
          entry.difficultyId.toLowerCase().includes(q)
        );
      });
  }, [leaderboardEntries, nameSearchQuery]);

  const upcomingScheduled = scheduledNotices.filter((s) => s.targetDate >= todayHkDate);

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">管理員控制中心（告示 · 名稱 · 訪客）</h2>
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
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-rose-700 shrink-0">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>距離今晚 00:00 自動換日／歸零：</span>
          </span>
          <span className="font-mono font-black text-rose-600 tabular-nums">
            {formatCountdown(msLeft)}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-pink-100/70 rounded-2xl border border-pink-200 shrink-0">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab('requests');
              }}
              className={`flex-1 min-w-[110px] py-2 px-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                  : 'text-slate-700 hover:text-pink-600'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>預約審核</span>
              {pendingNoticeRequests.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] leading-none rounded-md font-black ${
                    activeTab === 'requests'
                      ? 'bg-white text-rose-600'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {pendingNoticeRequests.length}
                </span>
              )}
            </button>
          )}

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab('scheduled');
              }}
              className={`flex-1 min-w-[95px] py-2 px-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-700 hover:text-pink-600'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>已排期 ({upcomingScheduled.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('birthday');
            }}
            className={`flex-1 min-w-[90px] py-2 px-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'birthday'
                ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-white shadow-sm'
                : 'text-slate-700 hover:text-pink-600'
            }`}
          >
            <Cake className="w-3.5 h-3.5" />
            <span>生日欄</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('confession');
            }}
            className={`flex-1 min-w-[90px] py-2 px-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'confession'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                : 'text-slate-700 hover:text-pink-600'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>表白板</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('names');
            }}
            className={`flex-1 min-w-[90px] py-2 px-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'names'
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm'
                : 'text-slate-700 hover:text-pink-600'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>名稱管理</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab('visitors');
              }}
              className={`flex-1 min-w-[95px] py-2 px-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'visitors'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm'
                  : 'text-slate-700 hover:text-pink-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>訪客 ({visitors.length})</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab('admins');
              }}
              className={`flex-1 min-w-[85px] py-2 px-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-700 hover:text-pink-600'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>授權</span>
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

          {/* TAB 1: Pending Submission Queue */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {groupedPending.length === 0 ? (
                <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-8 text-center space-y-2">
                  <Inbox className="w-8 h-8 text-pink-300 mx-auto" />
                  <p className="text-sm font-black text-slate-700">暫時未有新的玩家預約申請</p>
                  <p className="text-xs text-slate-500 font-medium">
                    當有人喺首頁點擊「免費預約生日欄／投稿表白」填寫後，系統會第一時間通知你並按投稿先後排序。
                  </p>
                </div>
              ) : (
                groupedPending.map((group) => {
                  const alreadyBooked = isDateSlotBooked(group.type, group.targetDate);
                  return (
                    <div
                      key={group.key}
                      className="border-2 border-pink-200 rounded-2xl overflow-hidden bg-pink-50/30"
                    >
                      {/* Date + Type Group Header */}
                      <div className="bg-pink-100/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-pink-200">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900">
                          <span>{group.type === 'birthday' ? '🎂 生日祝福欄' : '💌 表白告示板'}</span>
                          <span className="font-mono text-pink-700 bg-white px-2 py-0.5 rounded-lg border border-pink-200">
                            {group.targetDate}
                          </span>
                          {group.targetDate === todayHkDate && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px]">
                              今日即登
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                            alreadyBooked
                              ? 'bg-rose-500 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {alreadyBooked ? '該日已有排期 (1/1)' : '該日尚有空缺 (0/1)'}
                        </span>
                      </div>

                      {/* Chronologically Sorted Applicants */}
                      <div className="p-3 space-y-3">
                        {group.items.map((req, idx) => {
                          const isBusy = busyReqId === req.id;
                          return (
                            <div
                              key={req.id}
                              className={`bg-white rounded-2xl p-3.5 border space-y-2.5 shadow-xs ${
                                idx === 0
                                  ? 'border-amber-300 ring-2 ring-amber-200/70'
                                  : 'border-pink-100'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {idx === 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[11px] font-black shadow-xs">
                                      <Award className="w-3 h-3" />
                                      <span>🥇 第 1 位最早申請</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-black">
                                      第 {idx + 1} 位候補
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono font-bold text-slate-500">
                                    提交：{formatExactHkTime(req.createdAtMs)}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs bg-pink-50/50 rounded-xl p-2.5 border border-pink-100">
                                <p className="font-bold text-slate-700">
                                  致對象：
                                  <strong className="text-rose-600 font-black">
                                    {req.recipientName}
                                  </strong>
                                </p>
                                <p className="font-bold text-slate-700">
                                  署名：
                                  <strong className="text-pink-700 font-black">
                                    {req.senderName}
                                  </strong>
                                </p>
                                {req.contactNote && (
                                  <p className="sm:col-span-2 font-bold text-slate-600">
                                    💬 聯絡備註：<span className="text-slate-900">{req.contactNote}</span>
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2.5 items-start">
                                {req.photoDataUrl && (
                                  <div className="shrink-0">
                                    <img
                                      src={req.photoDataUrl}
                                      alt={`${req.recipientName} 附帶相片`}
                                      className="w-24 h-24 rounded-xl object-cover border-2 border-amber-200 shadow-xs"
                                    />
                                    <span className="block text-[10px] font-bold text-center text-amber-700 mt-0.5">
                                      📷 附帶相片
                                    </span>
                                  </div>
                                )}
                                <p className="flex-1 w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs sm:text-sm text-slate-800 font-medium whitespace-pre-wrap break-words leading-relaxed">
                                  {req.message}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleApproveRequest(req)}
                                  className="flex-1 py-2 px-3 text-xs font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>
                                    {isBusy
                                      ? '處理中...'
                                      : req.targetDate === todayHkDate
                                      ? '允許並立即置頂發佈'
                                      : `允許並排期於 ${req.targetDate}`}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleRejectRequest(req)}
                                  className="py-2 px-3 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>婉拒</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Scheduled & Booked List */}
          {activeTab === 'scheduled' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600">
                以下係已獲你允許並排期嘅日期（該日香港時間 00:00 自動置頂展示，無須手動再按）：
              </p>
              {upcomingScheduled.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs font-bold text-slate-500">
                  今日及未來暫無已排期告示。
                </div>
              ) : (
                upcomingScheduled.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-pink-200 rounded-2xl p-3.5 space-y-2 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                        <span>{item.type === 'birthday' ? '🎂 生日' : '💌 表白'}</span>
                        <span className="font-mono text-pink-700 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200">
                          {item.targetDate}
                        </span>
                        {item.targetDate === todayHkDate && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px]">
                            今日展示中
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playClick();
                          void cancelScheduledNotice(item.type, item.targetDate);
                        }}
                        className="px-2.5 py-1 text-[11px] font-black text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>取消並釋放名額</span>
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      致 <span className="text-rose-600">{item.recipientName}</span> · 來自{' '}
                      <span className="text-pink-700">{item.senderName}</span>
                    </p>
                    <div className="flex items-start gap-2.5">
                      {item.photoDataUrl && (
                        <img
                          src={item.photoDataUrl}
                          alt="已排期相片"
                          className="w-16 h-16 rounded-xl object-cover border border-pink-200 shrink-0"
                        />
                      )}
                      <p className="flex-1 text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 whitespace-pre-wrap break-words">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3 & 4: Manual Birthday / Confession Editor */}
          {(activeTab === 'birthday' || activeTab === 'confession') && (
            <form onSubmit={handleSaveNotice} className="space-y-3">
              {/* Slot status & Quick Demo Fill */}
              <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
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

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      if (activeTab === 'birthday') {
                        setRecipientName('Fish');
                        setSenderName('糖果王國好友團');
                        setMessage(
                          '祝今日全場主角 Fish 生日快樂！🎂✨ 願你日日都咁甜美開心，翻牌連擊場場破紀錄、心想事成！🎈💖'
                        );
                      } else {
                        setRecipientName('成日同我一齊玩配對嘅你');
                        setSenderName(ANONYMOUS_DISPLAY_NAME);
                        setMessage(
                          '其實每次同你測 MBTI 同星座合盤我都偷偷 cap 低咗圖，今日終於鼓起勇氣講一句：好鍾意同你一齊玩嘅感覺 💕🌹'
                        );
                      }
                    }}
                    className="flex-1 py-1.5 px-3 text-[11px] font-black text-pink-700 bg-white hover:bg-pink-100 border border-pink-200 rounded-xl transition-colors cursor-pointer"
                  >
                    ✨ 一鍵填入{activeTab === 'birthday' ? '「生日祝福」' : '「浪漫表白」'}示範例子
                  </button>

                  {activeTab === 'birthday' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isPreviewingSong) {
                          soundFx.stopHappyBirthday();
                          setIsPreviewingSong(false);
                          return;
                        }
                        void soundFx
                          .playHappyBirthday(() => setIsPreviewingSong(false))
                          .then((res) => {
                            if (res === 'played') {
                              setIsPreviewingSong(true);
                            } else if (res === 'muted') {
                              setFeedback({
                                type: 'err',
                                text: '目前音效設為靜音，請先點右上角喇叭圖示解除靜音再試聽。',
                              });
                            }
                          });
                      }}
                      className={`py-1.5 px-3 text-[11px] font-black rounded-xl border transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                        isPreviewingSong
                          ? 'text-white bg-rose-500 border-rose-500'
                          : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-300'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>{isPreviewingSong ? '停止試聽' : '試聽生日歌'}</span>
                    </button>
                  )}
                </div>
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
                      ? '✍️ 想同壽星講啲乜？（字數不限）'
                      : '✍️ 表白心底話（字數不限）'}
                  </label>
                  <span className="text-[11px] font-mono font-bold text-pink-600">
                    已寫 {message.length} 字 · 字數不限
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={10000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    activeTab === 'birthday'
                      ? '寫低對方想同今日壽星講嘅生日祝福⋯⋯'
                      : '寫低今日唯一一則浪漫告白內容⋯⋯'
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 resize-y min-h-[96px]"
                />
              </div>

              {/* Optional Photo Upload */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>上載相片（選填 · 壽星人像／寵物／合照）</span>
                  </span>
                  {photoDataUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setPhotoDataUrl('');
                      }}
                      className="text-[11px] font-black text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>移除相片</span>
                    </button>
                  )}
                </div>

                {photoDataUrl ? (
                  <div className="flex items-center gap-3 bg-white border border-amber-200 rounded-xl p-2">
                    <img
                      src={photoDataUrl}
                      alt="預覽相片"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-pink-200 shrink-0"
                    />
                    <span className="text-[11px] font-bold text-emerald-700">
                      ✅ 已附帶相片，發佈後會以「主角相框」一齊顯示喺置頂欄！
                    </span>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-amber-50 border border-dashed border-amber-300 rounded-xl text-xs font-black text-amber-700 cursor-pointer transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>{isProcessingPhoto ? '壓縮處理中...' : '從相簿揀選相片上載'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isProcessingPhoto}
                      onChange={(e) => void handlePhotoSelect(e)}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isSaving || isProcessingPhoto}
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
          )}

          {/* TAB 5: Name Management (Self Spirit Name + Admin Edit/Delete Player Names) */}
          {activeTab === 'names' && (
            <div className="space-y-4">
              {/* Section 1: My In-Game Spirit Name */}
              <div className="bg-gradient-to-br from-pink-50/90 to-violet-50/70 border-2 border-pink-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      🐰 我的遊戲精靈角色稱呼
                    </h3>
                    <p className="text-[11px] font-bold text-slate-600">
                      目前遊戲內顯示名稱：<span className="text-pink-600 font-black">{gameDisplayName}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      void handleApplyMyGameName(
                        ANONYMOUS_DISPLAY_NAME,
                        `已刪除你嘅遊戲顯示名稱，現已改為匿名「${ANONYMOUS_DISPLAY_NAME}」！`
                      )
                    }
                    className="px-2.5 py-1.5 text-[11px] font-black text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>刪除名稱（變匿名）</span>
                  </button>
                </div>

                {/* 12 Candy Spirit Quick Picker */}
                <div>
                  <p className="text-[11px] font-black text-pink-700 mb-1.5">
                    一鍵切換成 12 位糖果小精靈角色名：
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {SPIRIT_CHARACTER_OPTIONS.map((spirit) => {
                      const isCurrent = gameDisplayName === spirit.name;
                      return (
                        <button
                          key={spirit.id}
                          type="button"
                          disabled={isSaving}
                          onClick={() => void handleApplyMyGameName(spirit.name)}
                          className={`p-1.5 rounded-xl border text-left flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
                            isCurrent
                              ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
                              : 'bg-white hover:bg-pink-50 border-pink-200 text-slate-800'
                          }`}
                        >
                          {spirit.imageUrl ? (
                            <img
                              src={spirit.imageUrl}
                              alt={spirit.name}
                              className="w-6 h-6 rounded-lg object-cover shrink-0 border border-pink-200"
                            />
                          ) : (
                            <span className="text-sm shrink-0">{spirit.symbol}</span>
                          )}
                          <span className="text-[11px] font-black truncate">{spirit.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Name Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleApplyMyGameName(myNameInput);
                  }}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    maxLength={60}
                    value={myNameInput}
                    onChange={(e) => setMyNameInput(e.target.value)}
                    placeholder="輸入你想顯示嘅精靈或自訂名稱（留空即變匿名）"
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-60 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>修改我的名稱</span>
                  </button>
                </form>
              </div>

              {/* Section 2: Admin Leaderboard Name Management */}
              <div className="bg-white border-2 border-pink-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      🛠️ 全服戰績榜名稱管理（修改／刪除）
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500">
                      共 {leaderboardEntries.length} 筆公開戰績 · 可將玩家名稱改名、清成匿名或刪除紀錄
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nameSearchQuery}
                    onChange={(e) => setNameSearchQuery(e.target.value)}
                    placeholder="搜尋玩家名稱、關卡或主題..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>

                {filteredLeaderboardForAdmin.length === 0 ? (
                  <p className="text-xs text-slate-500 font-bold bg-slate-50 rounded-xl p-4 text-center">
                    找不到符合的戰績榜紀錄
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filteredLeaderboardForAdmin.map((entry) => {
                      const isEditing = editingEntryId === entry.id;
                      const isConfirmDelete = confirmDeleteEntryId === entry.id;
                      const isBusy = busyEntryId === entry.id;
                      return (
                        <div
                          key={entry.id}
                          className="border border-pink-100 rounded-xl p-2.5 bg-pink-50/30 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-900 truncate">
                                  {entry.displayName}
                                </span>
                                {user?.uid === entry.userId && (
                                  <span className="text-[10px] font-black bg-pink-500 text-white px-1.5 py-0.5 rounded-md">
                                    我
                                  </span>
                                )}
                                <span className="text-[11px] font-mono font-black text-rose-600">
                                  {entry.highScore} 分
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-500">
                                {entry.gameMode === 'flip' ? '翻牌記憶' : '連連看'} · {entry.themeName} · {entry.difficultyId}
                              </p>
                            </div>

                            {!isEditing && !isConfirmDelete && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    soundFx.playClick();
                                    setEditingEntryId(entry.id);
                                    setEditingEntryName(entry.displayName);
                                    setConfirmDeleteEntryId(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-black text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>修改</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleRenameLeaderboardEntry(
                                      entry.id,
                                      ANONYMOUS_DISPLAY_NAME,
                                      `已將該玩家名字刪除並改為「${ANONYMOUS_DISPLAY_NAME}」！`
                                    )
                                  }
                                  className="px-2 py-1 text-[11px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer disabled:opacity-50"
                                >
                                  刪除名字
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    soundFx.playClick();
                                    setConfirmDeleteEntryId(entry.id);
                                    setEditingEntryId(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>刪紀錄</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing && (
                            <div className="space-y-1.5 pt-1 border-t border-pink-100">
                              <div className="flex flex-wrap gap-1">
                                {SPIRIT_CHARACTER_OPTIONS.slice(0, 6).map((sp) => (
                                  <button
                                    key={sp.id}
                                    type="button"
                                    onClick={() => setEditingEntryName(sp.name)}
                                    className="px-1.5 py-0.5 text-[10px] font-bold bg-white hover:bg-pink-100 border border-pink-200 rounded-md text-slate-700 cursor-pointer"
                                  >
                                    {sp.symbol} {sp.name}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  maxLength={60}
                                  value={editingEntryName}
                                  onChange={(e) => setEditingEntryName(e.target.value)}
                                  placeholder="輸入修改後名稱"
                                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-bold bg-white border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleRenameLeaderboardEntry(entry.id, editingEntryName)
                                  }
                                  className="px-2.5 py-1.5 text-[11px] font-black text-white bg-violet-600 hover:bg-violet-700 rounded-lg cursor-pointer disabled:opacity-50"
                                >
                                  儲存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEntryId(null)}
                                  className="px-2 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          )}

                          {isConfirmDelete && (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-100 bg-rose-50/70 rounded-lg px-2.5 py-1.5">
                              <span className="text-[11px] font-black text-rose-700">
                                確定要永久刪除「{entry.displayName}」此項戰績？
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleDeleteLeaderboardEntry(entry.id)}
                                  className="px-2.5 py-1 text-[11px] font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
                                >
                                  確認刪除
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteEntryId(null)}
                                  className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Unique-Device Visitors Analytics */}
          {activeTab === 'visitors' && isSuperAdmin && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-3">
                  <span className="text-[11px] font-black text-sky-700 block">獨立裝置人數</span>
                  <span className="text-2xl font-black font-mono text-sky-800 tabular-nums">
                    {visitorSummary.uniqueDevices}
                  </span>
                  <span className="text-[10px] font-bold text-sky-600 block">
                    同裝置只計 1 人
                  </span>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-3">
                  <span className="text-[11px] font-black text-pink-700 block">已登入 / 訪客</span>
                  <span className="text-2xl font-black font-mono text-pink-700 tabular-nums">
                    {visitorSummary.signedInCount}
                    <span className="text-xs text-slate-400 mx-1">/</span>
                    <span className="text-lg text-slate-600">{visitorSummary.guestCount}</span>
                  </span>
                  <span className="text-[10px] font-bold text-pink-600 block">
                    玩家帳號 vs 未登入
                  </span>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3">
                  <span className="text-[11px] font-black text-emerald-700 block">今日活躍 / 總瀏覽</span>
                  <span className="text-2xl font-black font-mono text-emerald-700 tabular-nums">
                    {visitorSummary.todayActiveCount}
                    <span className="text-xs text-slate-400 mx-1">/</span>
                    <span className="text-lg text-teal-600">{visitorSummary.totalVisits}</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 block">
                    今日人流 · 累積次數
                  </span>
                </div>
              </div>

              {visitorsError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{visitorsError}</span>
                </div>
              )}

              {anonAuthDisabled && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    未登入訪客目前未啟用 Firebase 匿名登入（Anonymous Auth），所以暫只統計已 Google 登入玩家；如要連未登入訪客都統計，請於 Firebase Console 啟用「匿名 (Anonymous)」。
                  </span>
                </div>
              )}

              {/* Filter & Search Controls */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ['all', `全部 (${visitorSummary.uniqueDevices})`],
                      ['signed_in', `已登入玩家 (${visitorSummary.signedInCount})`],
                      ['guest', `未登入訪客 (${visitorSummary.guestCount})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setVisitorFilter(key);
                      }}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                        visitorFilter === key
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white text-slate-600 border-pink-200 hover:bg-pink-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={visitorSearchQuery}
                    onChange={(e) => setVisitorSearchQuery(e.target.value)}
                    placeholder="搜尋訪客名稱或裝置（例如：iPhone、Mac、Safari）..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Visitor Device List */}
              {filteredVisitors.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-1">
                  <Users className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-black text-slate-600">暫時未有符合條件的訪客紀錄</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredVisitors.map((v) => {
                    const isSelfDevice = v.deviceId === currentDeviceId;
                    const isEditing = editingVisitorId === v.id;
                    const isConfirmDelete = confirmDeleteVisitorId === v.id;
                    const isBusy = busyVisitorId === v.id;
                    const matchedSpirit = SPIRIT_CHARACTER_OPTIONS.find((s) => s.name === v.displayName);

                    return (
                      <div
                        key={v.id}
                        className={`border rounded-2xl p-3 space-y-2 transition-all ${
                          isSelfDevice
                            ? 'bg-sky-50/70 border-sky-300'
                            : 'bg-white border-pink-100 hover:border-pink-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {matchedSpirit?.imageUrl ? (
                              <img
                                src={matchedSpirit.imageUrl}
                                alt={v.displayName}
                                className="w-9 h-9 rounded-xl object-cover border border-pink-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                {v.deviceType === 'mobile' ? (
                                  <Smartphone className="w-4 h-4" />
                                ) : v.deviceType === 'tablet' ? (
                                  <Tablet className="w-4 h-4" />
                                ) : (
                                  <Monitor className="w-4 h-4" />
                                )}
                              </div>
                            )}

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                  {v.displayName}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-black rounded-md ${
                                    v.isSignedInUser
                                      ? 'bg-pink-100 text-pink-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {v.isSignedInUser ? '已登入玩家' : '訪客'}
                                </span>
                                {isSelfDevice && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-sky-600 text-white">
                                    本機裝置
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] font-bold text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span>📱 {v.deviceLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-indigo-600 font-black">
                                  到訪 {v.visitCount} 次
                                </span>
                              </p>

                              <p className="text-[10px] font-mono font-bold text-slate-500">
                                最後到訪：{formatExactHkTime(v.lastSeenAtMs)} · 首次：{formatExactHkTime(v.firstSeenAtMs)}
                              </p>
                            </div>
                          </div>

                          {!isEditing && !isConfirmDelete && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  soundFx.playClick();
                                  setEditingVisitorId(v.id);
                                  setEditingVisitorName(v.displayName);
                                  setConfirmDeleteVisitorId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-black text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>備註改名</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  soundFx.playClick();
                                  setConfirmDeleteVisitorId(v.id);
                                  setEditingVisitorId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>移除</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditing && (
                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-pink-100">
                            <input
                              type="text"
                              maxLength={60}
                              value={editingVisitorName}
                              onChange={(e) => setEditingVisitorName(e.target.value)}
                              placeholder="輸入備註名稱（例如：小明嘅 iPhone）"
                              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-bold bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleRenameVisitor(v.id, editingVisitorName)}
                              className="px-2.5 py-1.5 text-[11px] font-black text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer disabled:opacity-50"
                            >
                              儲存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVisitorId(null)}
                              className="px-2 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        )}

                        {isConfirmDelete && (
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-rose-100 bg-rose-50/70 rounded-lg px-2.5 py-1.5">
                            <span className="text-[11px] font-black text-rose-700">
                              確定移除「{v.displayName}」（{v.deviceLabel}）的訪客紀錄？
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDeleteVisitor(v.id)}
                                className="px-2.5 py-1 text-[11px] font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
                              >
                                確認移除
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVisitorId(null)}
                                className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: Delegated Admin UIDs */}
          {activeTab === 'admins' && (
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

