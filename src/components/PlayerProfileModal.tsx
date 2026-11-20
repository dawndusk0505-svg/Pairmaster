import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Copy, UserCheck, Trash2 } from 'lucide-react';
import {
  ANONYMOUS_DISPLAY_NAME,
  SPIRIT_CHARACTER_OPTIONS,
  useFirebase,
} from '../contexts/FirebaseContext';
import { MBTI_TYPES, MBTI_TYPE_INFO } from '../data/socialAndFortune';
import { soundFx } from '../utils/audio';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    isVerifiedGoogleUser,
    gameDisplayName,
    avatarSpiritId,
    favoriteMbti,
    updateMyProfile,
  } = useFirebase();

  const [displayName, setDisplayName] = useState(gameDisplayName);
  const [selectedSpiritId, setSelectedSpiritId] = useState(avatarSpiritId);
  const [selectedMbti, setSelectedMbti] = useState(favoriteMbti);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(gameDisplayName);
      setSelectedSpiritId(avatarSpiritId);
      setSelectedMbti(favoriteMbti);
      setFeedback(null);
    }
  }, [isOpen, gameDisplayName, avatarSpiritId, favoriteMbti]);

  if (!isOpen || !isVerifiedGoogleUser || !user) return null;

  const currentSpirit = SPIRIT_CHARACTER_OPTIONS.find((s) => s.id === selectedSpiritId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const cleanName = displayName.trim() || ANONYMOUS_DISPLAY_NAME;
      await updateMyProfile({
        displayName: cleanName,
        avatarSpiritId: selectedSpiritId,
        favoriteMbti: selectedMbti || undefined,
      });
      soundFx.playVictory();
      setFeedback({ type: 'ok', text: '已儲存個人檔案並同步至全服榮譽榜！' });
      setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setFeedback({ type: 'err', text: '儲存失敗，請檢查連線後再試。' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      soundFx.playClick();
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-pink-950/45 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-sm">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">玩家個人檔案與精靈頭像</h2>
              <p className="text-xs font-bold text-pink-500">
                自訂排行榜顯示暱稱、專屬精靈頭像與預設 MBTI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="關閉個人檔案設定"
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-4">
          {feedback && (
            <div
              role="status"
              className={`rounded-2xl p-3 text-xs font-black border ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Live Preview Card */}
          <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50/70 border border-pink-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {currentSpirit?.imageUrl ? (
                <img
                  src={currentSpirit.imageUrl}
                  alt={currentSpirit.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-pink-300 shadow-sm shrink-0"
                />
              ) : user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-pink-300 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-pink-200 text-pink-700 font-black flex items-center justify-center text-lg shrink-0">
                  {(displayName || '玩')[0]}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-black text-pink-500 block">
                  排行榜即時預覽
                </span>
                <p className="text-sm font-black text-slate-900 truncate">
                  {displayName.trim() || ANONYMOUS_DISPLAY_NAME}
                </p>
                {selectedMbti && (
                  <span className="text-[11px] font-bold text-rose-600">
                    {selectedMbti} · {MBTI_TYPE_INFO[selectedMbti]?.title}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyUid()}
              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 bg-white hover:text-pink-600 border border-pink-200 rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copiedUid ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600">已複製 UID</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>複製 UID</span>
                </>
              )}
            </button>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-700">
                遊戲與全服榜顯示暱稱
              </label>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setDisplayName(ANONYMOUS_DISPLAY_NAME);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>重設為匿名</span>
              </button>
            </div>
            <input
              type="text"
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="輸入你想喺全服榜顯示嘅暱稱..."
              className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* Spirit Avatar Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-700">
                選擇精靈與魔法用具頭像（共 {SPIRIT_CHARACTER_OPTIONS.length} 款 · 雙擊可套用名稱）
              </span>
              {selectedSpiritId && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedSpiritId('');
                  }}
                  className="text-[11px] font-bold text-pink-600 hover:underline cursor-pointer"
                >
                  用回 Google 頭像
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 rounded-2xl bg-pink-50/30 border border-pink-100">
              {SPIRIT_CHARACTER_OPTIONS.map((spirit) => {
                const isSelected = selectedSpiritId === spirit.id;
                return (
                  <button
                    key={spirit.id}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedSpiritId(spirit.id);
                    }}
                    onDoubleClick={() => {
                      setSelectedSpiritId(spirit.id);
                      setDisplayName(spirit.name);
                    }}
                    className={`p-2 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pink-500 text-white border-pink-500 shadow-sm ring-2 ring-pink-300'
                        : 'bg-white hover:bg-pink-50 border-pink-200 text-slate-700'
                    }`}
                  >
                    {spirit.imageUrl ? (
                      <img
                        src={spirit.imageUrl}
                        alt={spirit.name}
                        className="w-10 h-10 rounded-xl object-cover border border-pink-200"
                      />
                    ) : (
                      <span className="text-2xl">{spirit.symbol}</span>
                    )}
                    <span className="text-[11px] font-black truncate w-full">{spirit.name}</span>
                  </button>
                );
              })}
            </div>

            {currentSpirit && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setDisplayName(currentSpirit.name);
                }}
                className="text-[11px] font-black text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>順便將暱稱改為「{currentSpirit.name}」</span>
              </button>
            )}
          </div>

          {/* Default MBTI */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 block">
              我的預設 MBTI（契合測算會自動帶入）
            </label>
            <select
              value={selectedMbti}
              onChange={(e) => setSelectedMbti(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-pink-50/40 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="">暫不設定</option>
              {MBTI_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} · {MBTI_TYPE_INFO[t]?.title}（{MBTI_TYPE_INFO[t]?.nickname}）
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 px-4 text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl shadow-md shadow-pink-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? '儲存同步中...' : '儲存並同步到戰績榜'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
