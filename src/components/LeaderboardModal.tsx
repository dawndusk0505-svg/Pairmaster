import React, { useEffect, useState, useMemo } from 'react';
import { X, Trophy, Crown, Clock, Cloud, Sparkles, LogIn } from 'lucide-react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CloudLeaderboardEntry, useFirebase } from '../contexts/FirebaseContext';
import { soundFx } from '../utils/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '輕鬆 4×3',
  medium: '標準 4×4',
  hard: '進階 6×4',
  expert: '大師 6×6',
  relaxed: '輕鬆 6×4',
  standard: '標準 8×6',
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const { user, signInWithGoogle, isAuthBusy, scoresMap } = useFirebase();
  const [entries, setEntries] = useState<CloudLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'flip' | 'link'>('all');

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const lbPath = 'leaderboard';
    const lbQuery = query(
      collection(db, lbPath),
      where('isPublic', '==', true),
      limit(60)
    );

    const unsub = onSnapshot(
      lbQuery,
      (snapshot) => {
        const list: CloudLeaderboardEntry[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.userId ?? ''),
            displayName: String(data.displayName ?? '糖果玩家'),
            gameMode: data.gameMode === 'link' ? 'link' : 'flip',
            themeId: String(data.themeId ?? ''),
            themeName: String(data.themeName ?? '糖果萌星'),
            difficultyId: String(data.difficultyId ?? 'medium'),
            highScore: Number(data.highScore ?? 0),
            bestTimeSec: Number(data.bestTimeSec ?? 0),
            stars: Number(data.stars ?? 1),
            isPublic: Boolean(data.isPublic),
          };
        });
        setEntries(list);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, lbPath);
      }
    );

    return () => unsub();
  }, [isOpen]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => (filterMode === 'all' ? true : e.gameMode === filterMode))
      .sort((a, b) => {
        if (b.highScore !== a.highScore) return b.highScore - a.highScore;
        return a.bestTimeSec - b.bestTimeSec;
      })
      .slice(0, 20);
  }, [entries, filterMode]);

  const myBestCount = Object.keys(scoresMap).length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/45 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 text-white flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                <span>雲端榮譽榜</span>
                <Cloud className="w-4 h-4 text-pink-500" />
              </h2>
              <p className="text-xs text-pink-500 font-bold">
                Firestore 即時同步全服高分紀錄
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="關閉排行榜"
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth / Personal Summary Strip */}
        <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || '玩家頭像'}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl border border-pink-300 object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-pink-200 text-pink-700 font-black flex items-center justify-center text-sm">
                  {(user.displayName || '玩')[0]}
                </div>
              )}
              <div>
                <p className="text-xs font-black text-slate-800">
                  {user.displayName || '糖果玩家'}
                </p>
                <p className="text-[11px] font-bold text-pink-600">
                  已雲端保存 {myBestCount} 項關卡最佳紀錄
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="text-xs text-slate-700 font-bold">
                登入 Google 帳號即可把你的高分與自訂公仔同步到雲端！
              </div>
              <button
                type="button"
                disabled={isAuthBusy}
                onClick={() => {
                  soundFx.playClick();
                  signInWithGoogle();
                }}
                className="px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-xl shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google 登入</span>
              </button>
            </div>
          )}
        </div>

        {/* Mode Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-pink-50 rounded-2xl border border-pink-200/80 shrink-0">
          {(
            [
              ['all', '全部模式'],
              ['flip', '翻牌記憶'],
              ['link', '連連看'],
            ] as const
          ).map(([modeKey, label]) => (
            <button
              key={modeKey}
              type="button"
              onClick={() => {
                soundFx.playClick();
                setFilterMode(modeKey);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterMode === modeKey
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-bold text-pink-500">
              正在讀取雲端榮譽榜...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-pink-300 mx-auto" />
              <p className="text-sm font-black text-slate-700">暫時未有上榜紀錄</p>
              <p className="text-xs text-slate-500 font-medium">
                登入並完成一局配對遊戲，成為第一位榮譽榜冠軍吧！
              </p>
            </div>
          ) : (
            filteredEntries.map((entry, idx) => {
              const isMe = user?.uid === entry.userId;
              const rank = idx + 1;
              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isMe
                      ? 'bg-pink-50 border-pink-400 ring-1 ring-pink-300'
                      : 'bg-white border-pink-100 hover:border-pink-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        rank === 1
                          ? 'bg-amber-400 text-white shadow-xs'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : rank === 3
                          ? 'bg-amber-700/80 text-white'
                          : 'bg-pink-50 text-pink-600'
                      }`}
                    >
                      {rank === 1 ? <Crown className="w-4 h-4" /> : rank}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-800 truncate">
                          {entry.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-black text-pink-600">（我）</span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 truncate">
                        <span>{entry.gameMode === 'flip' ? '翻牌記憶' : '連連看'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.themeName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{DIFFICULTY_LABELS[entry.difficultyId] || entry.difficultyId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black font-mono text-rose-600 tabular-nums">
                      {entry.highScore}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center justify-end gap-1.5">
                      <span className="text-amber-400">
                        {'★'.repeat(Math.min(3, Math.max(1, entry.stars)))}
                      </span>
                      <span className="flex items-center gap-0.5 font-mono tabular-nums">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(entry.bestTimeSec)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
