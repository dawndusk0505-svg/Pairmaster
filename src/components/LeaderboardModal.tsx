import React, { useEffect, useState, useMemo } from 'react';
import { X, Trophy, Crown, Clock, Cloud, Sparkles, LogIn, Medal, Smartphone, Copy, Check, AlertCircle } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { CANDY_SPIRIT_ITEMS, MATCH_THEMES } from '../data/matchThemes';
import { soundFx } from '../utils/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'global' | 'mine';
}

interface PersonalBestRecord {
  id: string;
  gameMode: 'flip' | 'link';
  themeId: string;
  themeName: string;
  difficultyId: string;
  highScore: number;
  bestTimeSec?: number;
  maxCombo?: number;
  stars?: number;
  isCloudSynced: boolean;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '輕鬆 4×3',
  medium: '標準 4×4',
  hard: '進階 6×4',
  expert: '大師 6×6',
  relaxed: '輕鬆 6×4',
  standard: '標準 8×6',
};

const THEME_NAME_MAP = new Map<string, string>([
  ...MATCH_THEMES.map((t): [string, string] => [t.id, t.name]),
  ['custom-theme', '自訂糖果隊'],
]);

function readLocalPersonalRecords(): PersonalBestRecord[] {
  const results: PersonalBestRecord[] = [];
  if (typeof window === 'undefined') return results;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      let gameMode: 'flip' | 'link' | null = null;
      let rest = '';

      if (key.startsWith('pairmaster_link_high_')) {
        gameMode = 'link';
        rest = key.slice('pairmaster_link_high_'.length);
      } else if (key.startsWith('pairmaster_high_')) {
        gameMode = 'flip';
        rest = key.slice('pairmaster_high_'.length);
      }

      if (!gameMode || !rest) continue;

      const sepIdx = rest.indexOf('_');
      if (sepIdx <= 0) continue;

      const difficultyId = rest.slice(0, sepIdx);
      const themeId = rest.slice(sepIdx + 1);
      const rawScore = localStorage.getItem(key);
      const score = rawScore ? parseInt(rawScore, 10) : 0;

      if (!Number.isFinite(score) || score <= 0) continue;

      results.push({
        id: `${gameMode}_${difficultyId}_${themeId}`,
        gameMode,
        themeId,
        themeName: THEME_NAME_MAP.get(themeId) || themeId,
        difficultyId,
        highScore: score,
        isCloudSynced: false,
      });
    }
  } catch {
    // ignore localStorage access errors
  }

  return results;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'global',
}) => {
  const {
    user,
    isVerifiedGoogleUser,
    gameDisplayName,
    signInWithGoogle,
    isAuthBusy,
    scoresMap,
    leaderboardEntries,
    leaderboardLoading,
    leaderboardError,
    anonAuthDisabled,
  } = useFirebase();
  const matchedSpirit = CANDY_SPIRIT_ITEMS.find((s) => s.name === gameDisplayName);
  const [activeTab, setActiveTab] = useState<'global' | 'mine'>(initialTab);
  const [filterMode, setFilterMode] = useState<'all' | 'flip' | 'link'>('all');
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyUid = async () => {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const personalRecords = useMemo(() => {
    if (!isOpen) return [];
    const merged = new Map<string, PersonalBestRecord>();

    // 1. Seed from localStorage high scores
    for (const localRec of readLocalPersonalRecords()) {
      merged.set(localRec.id, localRec);
    }

    // 2. Merge with cloud scoresMap (takes higher score & enriches with time/stars/combo)
    for (const cloudRec of Object.values(scoresMap)) {
      const id = `${cloudRec.gameMode}_${cloudRec.difficultyId}_${cloudRec.themeId}`;
      const existing = merged.get(id);
      const bestScore = Math.max(existing?.highScore ?? 0, cloudRec.highScore);
      merged.set(id, {
        id,
        gameMode: cloudRec.gameMode,
        themeId: cloudRec.themeId,
        themeName: cloudRec.themeName || THEME_NAME_MAP.get(cloudRec.themeId) || cloudRec.themeId,
        difficultyId: cloudRec.difficultyId,
        highScore: bestScore,
        bestTimeSec: cloudRec.bestTimeSec,
        maxCombo: cloudRec.maxCombo,
        stars: cloudRec.stars,
        isCloudSynced: true,
      });
    }

    return Array.from(merged.values())
      .filter((r) => (filterMode === 'all' ? true : r.gameMode === filterMode))
      .sort((a, b) => b.highScore - a.highScore);
  }, [isOpen, scoresMap, filterMode]);

  const filteredEntries = useMemo(() => {
    return leaderboardEntries
      .filter((e) => (filterMode === 'all' ? true : e.gameMode === filterMode))
      .sort((a, b) => {
        if (b.highScore !== a.highScore) return b.highScore - a.highScore;
        return a.bestTimeSec - b.bestTimeSec;
      })
      .slice(0, 50);
  }, [leaderboardEntries, filterMode]);

  const allPersonalCount = useMemo(() => {
    if (!isOpen) return Object.keys(scoresMap).length;
    const keys = new Set<string>([
      ...readLocalPersonalRecords().map((r) => r.id),
      ...Object.values(scoresMap).map((c) => `${c.gameMode}_${c.difficultyId}_${c.themeId}`),
    ]);
    return keys.size;
  }, [isOpen, scoresMap]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/45 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 text-white flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                <span>戰績與最高紀錄榜</span>
                <Cloud className="w-4 h-4 text-pink-500" />
              </h2>
              <p className="text-xs text-pink-500 font-bold">
                隨時查看個人歷史最高分與全服高手榜
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

        {/* Primary View Tabs: Global vs Personal Best */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-pink-100/70 rounded-2xl border border-pink-200 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('mine');
            }}
            className={`py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'mine'
                ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-sm'
                : 'text-slate-600 hover:text-pink-600'
            }`}
          >
            <Medal className="w-3.5 h-3.5" />
            <span>我的最高紀錄 ({allPersonalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('global');
            }}
            className={`py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'global'
                ? 'bg-gradient-to-r from-amber-400 to-pink-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-pink-600'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>全服榮譽榜</span>
          </button>
        </div>

        {/* Auth / Personal Summary Strip */}
        <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {isVerifiedGoogleUser && user ? (
            <div className="flex items-center justify-between w-full gap-2.5 flex-wrap">
              <div className="flex items-center gap-2.5">
                {matchedSpirit?.imageUrl ? (
                  <img
                    src={matchedSpirit.imageUrl}
                    alt={gameDisplayName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl border border-pink-300 object-cover"
                  />
                ) : user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={gameDisplayName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl border border-pink-300 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-pink-200 text-pink-700 font-black flex items-center justify-center text-sm">
                    {(gameDisplayName || '玩')[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {gameDisplayName}
                  </p>
                  <p className="text-[11px] font-bold text-pink-600">
                    已累積 {allPersonalCount} 項關卡最高紀錄（雲端已保存 {Object.keys(scoresMap).length} 項）
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  void handleCopyUid();
                }}
                title="複製個人帳號 UID（供管理員授權用）"
                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 bg-white hover:text-pink-600 hover:border-pink-300 border border-pink-200 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
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
          ) : (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-pink-200/80 text-pink-700 font-black flex items-center justify-center text-sm shrink-0">
                  ？
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800">唔知邊個(unknown)</p>
                  <p className="text-[11px] text-slate-600 font-bold leading-snug">
                    未登入會以「唔知邊個(unknown)」登上全服榜；登入可同步跨裝置！
                  </p>
                </div>
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

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {activeTab === 'mine' ? (
            personalRecords.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Medal className="w-8 h-8 text-pink-300 mx-auto" />
                <p className="text-sm font-black text-slate-700">暫時未有個人通關紀錄</p>
                <p className="text-xs text-slate-500 font-medium">
                  完成任何一局「翻牌記憶」或「連連看」，你嘅最高分就會即刻顯示喺呢度！
                </p>
              </div>
            ) : (
              personalRecords.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-2xl border bg-pink-50/45 border-pink-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-gradient-to-tr from-amber-400 to-rose-400 text-white shadow-xs'
                          : 'bg-white border border-pink-200 text-pink-600'
                      }`}
                    >
                      {idx === 0 ? <Trophy className="w-4 h-4" /> : idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-slate-800 truncate">
                          {rec.themeName}
                        </span>
                        <span className="text-[10px] font-bold text-pink-600 bg-white border border-pink-200 px-1.5 py-0.5 rounded-md">
                          {rec.gameMode === 'flip' ? '翻牌記憶' : '連連看'}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                        <span>{DIFFICULTY_LABELS[rec.difficultyId] || rec.difficultyId}</span>
                        {rec.maxCombo && rec.maxCombo > 1 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>最高連擊 x{rec.maxCombo}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-0.5 text-pink-500">
                          {rec.isCloudSynced ? (
                            <>
                              <Cloud className="w-2.5 h-2.5" />
                              <span>雲端</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-2.5 h-2.5" />
                              <span>本機</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black font-mono text-rose-600 tabular-nums">
                      {rec.highScore}
                    </div>
                    {(rec.stars || rec.bestTimeSec !== undefined) && (
                      <div className="text-[10px] font-bold text-slate-500 flex items-center justify-end gap-1.5">
                        {rec.stars && (
                          <span className="text-amber-400">
                            {'★'.repeat(Math.min(3, Math.max(1, rec.stars)))}
                          </span>
                        )}
                        {rec.bestTimeSec !== undefined && (
                          <span className="flex items-center gap-0.5 font-mono tabular-nums">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(rec.bestTimeSec)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          ) : leaderboardLoading ? (
            <div className="py-12 text-center text-xs font-bold text-pink-500">
              正在讀取雲端榮譽榜...
            </div>
          ) : leaderboardError ? (
            <div className="py-10 px-4 text-center space-y-2 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
              <p className="text-sm font-black text-rose-700">{leaderboardError}</p>
              <p className="text-xs text-slate-500 font-medium">
                個人本地分數仍安全保存於「我的最高紀錄」分頁。
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-pink-300 mx-auto" />
              <p className="text-sm font-black text-slate-700">暫時未有上榜紀錄</p>
              <p className="text-xs text-slate-500 font-medium">
                完成任何一局配對遊戲，即可自動登上全服榮譽榜！
              </p>
            </div>
          ) : (
            <>
              {anonAuthDisabled && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    未登入訪客目前只會保存於本機；如要讓未登入玩家亦以「唔知邊個(unknown)」登上全服榜，請於 Firebase Console 啟用「匿名 (Anonymous)」登入方式。
                  </span>
                </div>
              )}
              {filteredEntries.map((entry, idx) => {
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
            }</>
          )}
        </div>
      </div>
    </div>
  );
};
