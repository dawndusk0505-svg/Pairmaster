import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Trophy,
  Crown,
  Clock,
  Cloud,
  Sparkles,
  LogIn,
  Medal,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { CANDY_SPIRIT_ITEMS, MATCH_THEMES } from '../data/matchThemes';
import {
  GAME_MODE_LABELS,
  GameModeKey,
  VALID_GAME_MODES,
  formatDifficultyLabel,
} from '../data/spiritPairings';
import { soundFx } from '../utils/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'global' | 'mine';
  onOpenProfile?: () => void;
}

type LeaderboardFilterMode = 'all' | GameModeKey | 'daily';

interface PersonalBestRecord {
  id: string;
  gameMode: GameModeKey;
  themeId: string;
  themeName: string;
  difficultyId: string;
  highScore: number;
  bestTimeSec?: number;
  maxCombo?: number;
  stars?: number;
  isCloudSynced: boolean;
}

const DIFFICULTY_FILTERS_BY_MODE: Record<LeaderboardFilterMode, { id: string; label: string }[]> = {
  all: [
    { id: 'all', label: '全部難度' },
    { id: 'daily', label: '每日挑戰' },
  ],
  flip: [
    { id: 'all', label: '全部難度' },
    { id: 'easy', label: '輕鬆 4×3' },
    { id: 'medium', label: '標準 4×4' },
    { id: 'hard', label: '進階 6×4' },
    { id: 'expert', label: '大師 6×6' },
    { id: 'daily', label: '每日挑戰' },
  ],
  link: [
    { id: 'all', label: '全部難度' },
    { id: 'relaxed', label: '輕鬆 6×4' },
    { id: 'standard', label: '標準 8×6' },
    { id: 'master', label: '大師 10×6' },
    { id: 'daily', label: '每日挑戰' },
  ],
  merge: [{ id: 'all', label: '標準合成罐' }],
  cpstack: [
    { id: 'all', label: '全部組別' },
    { id: 'relaxed', label: '甜蜜 6 組 CP' },
    { id: 'standard', label: '熱戀 9 組 CP' },
    { id: 'master', label: '全王國 11 組 CP' },
  ],
  conveyor: [{ id: 'all', label: '45秒出餐挑戰' }],
  tower: [{ id: 'all', label: '無盡高塔' }],
  duel: [{ id: 'all', label: '60秒對戰' }],
  daily: [
    { id: 'all', label: '全部挑戰' },
    { id: 'flip', label: '翻牌今日盤' },
    { id: 'link', label: '連連看今日盤' },
  ],
};

const THEME_NAME_MAP = new Map<string, string>([
  ...MATCH_THEMES.map((t): [string, string] => [t.id, t.name]),
  ['custom-theme', '自訂糖果隊'],
  ['candy-merge', '糖果盲盒罐'],
  ['candy-cpstack', '命定 CP 疊疊塔'],
  ['candy-conveyor', '奇蹟甜品屋'],
  ['candy-tower', '無盡糖果高塔'],
  ['candy-duel', '同盤好友 PK'],
]);

function resolveThemeName(themeId: string, storedName?: string): string {
  if (storedName) return storedName;
  if (themeId.startsWith('daily-')) {
    return `每日挑戰 ${themeId.slice(6)}`;
  }
  return THEME_NAME_MAP.get(themeId) || themeId;
}

function resolveSpiritByAvatarOrName(avatarSpiritId?: string, displayName?: string) {
  if (avatarSpiritId) {
    const byId = CANDY_SPIRIT_ITEMS.find((s) => s.id === avatarSpiritId);
    if (byId) return byId;
  }
  if (displayName) {
    return CANDY_SPIRIT_ITEMS.find((s) => s.name === displayName);
  }
  return undefined;
}

function readLocalPersonalRecords(): PersonalBestRecord[] {
  const results: PersonalBestRecord[] = [];
  if (typeof window === 'undefined') return results;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      let gameMode: GameModeKey | null = null;
      let rest = '';

      if (key.startsWith('pairmaster_link_high_')) {
        gameMode = 'link';
        rest = key.slice('pairmaster_link_high_'.length);
      } else if (key.startsWith('pairmaster_high_')) {
        gameMode = 'flip';
        rest = key.slice('pairmaster_high_'.length);
      } else {
        for (const m of VALID_GAME_MODES) {
          const prefix = `pairmaster_${m}_high_`;
          if (key.startsWith(prefix)) {
            gameMode = m;
            rest = key.slice(prefix.length);
            break;
          }
        }
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
        themeName: resolveThemeName(themeId),
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
  onOpenProfile,
}) => {
  const {
    user,
    isVerifiedGoogleUser,
    gameDisplayName,
    avatarSpiritId,
    todayHkDate,
    signInWithGoogle,
    isAuthBusy,
    scoresMap,
    leaderboardEntries,
    leaderboardLoading,
    leaderboardError,
    anonAuthDisabled,
  } = useFirebase();

  const mySpirit = resolveSpiritByAvatarOrName(avatarSpiritId, gameDisplayName);
  const [activeTab, setActiveTab] = useState<'global' | 'mine'>(initialTab);
  const [filterMode, setFilterMode] = useState<LeaderboardFilterMode>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
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

  const handleSelectFilterMode = (modeKey: LeaderboardFilterMode) => {
    soundFx.playClick();
    setFilterMode(modeKey);
    setFilterDifficulty('all');
  };

  const personalRecords = useMemo(() => {
    if (!isOpen) return [];
    const merged = new Map<string, PersonalBestRecord>();

    for (const localRec of readLocalPersonalRecords()) {
      merged.set(localRec.id, localRec);
    }

    for (const cloudRec of Object.values(scoresMap)) {
      const id = `${cloudRec.gameMode}_${cloudRec.difficultyId}_${cloudRec.themeId}`;
      const existing = merged.get(id);
      const bestScore = Math.max(existing?.highScore ?? 0, cloudRec.highScore);
      merged.set(id, {
        id,
        gameMode: cloudRec.gameMode,
        themeId: cloudRec.themeId,
        themeName: resolveThemeName(cloudRec.themeId, cloudRec.themeName),
        difficultyId: cloudRec.difficultyId,
        highScore: bestScore,
        bestTimeSec: cloudRec.bestTimeSec,
        maxCombo: cloudRec.maxCombo,
        stars: cloudRec.stars,
        isCloudSynced: true,
      });
    }

    const todayDailyThemeId = `daily-${todayHkDate}`;

    return Array.from(merged.values())
      .filter((r) => {
        if (filterMode === 'daily') {
          if (r.difficultyId !== 'daily' && !r.themeId.startsWith('daily-')) return false;
          if (filterDifficulty === 'flip' || filterDifficulty === 'link') {
            return r.gameMode === filterDifficulty;
          }
          return true;
        }
        if (filterMode !== 'all' && r.gameMode !== filterMode) return false;
        if (filterDifficulty !== 'all' && r.difficultyId !== filterDifficulty) return false;
        return true;
      })
      .sort((a, b) => {
        // Put today's daily challenges first inside Daily tab
        if (filterMode === 'daily') {
          const aToday = a.themeId === todayDailyThemeId ? 1 : 0;
          const bToday = b.themeId === todayDailyThemeId ? 1 : 0;
          if (bToday !== aToday) return bToday - aToday;
        }
        return b.highScore - a.highScore;
      });
  }, [isOpen, scoresMap, filterMode, filterDifficulty, todayHkDate]);

  const sortedAllFilteredEntries = useMemo(() => {
    const todayDailyThemeId = `daily-${todayHkDate}`;
    return leaderboardEntries
      .filter((e) => {
        if (filterMode === 'daily') {
          if (e.difficultyId !== 'daily' || e.themeId !== todayDailyThemeId) return false;
          if (filterDifficulty === 'flip' || filterDifficulty === 'link') {
            return e.gameMode === filterDifficulty;
          }
          return true;
        }
        if (filterMode !== 'all' && e.gameMode !== filterMode) return false;
        if (filterDifficulty !== 'all' && e.difficultyId !== filterDifficulty) return false;
        return true;
      })
      .sort((a, b) => {
        if (b.highScore !== a.highScore) return b.highScore - a.highScore;
        return a.bestTimeSec - b.bestTimeSec;
      });
  }, [leaderboardEntries, filterMode, filterDifficulty, todayHkDate]);

  const filteredEntries = useMemo(
    () => sortedAllFilteredEntries.slice(0, 50),
    [sortedAllFilteredEntries]
  );

  const myBestRankInfo = useMemo(() => {
    if (!user?.uid) return null;
    const idx = sortedAllFilteredEntries.findIndex((e) => e.userId === user.uid);
    if (idx < 0) return null;
    return {
      rank: idx + 1,
      total: sortedAllFilteredEntries.length,
      entry: sortedAllFilteredEntries[idx],
    };
  }, [sortedAllFilteredEntries, user?.uid]);

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

  const subFilters = DIFFICULTY_FILTERS_BY_MODE[filterMode];

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/45 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl space-y-3.5 max-h-[90vh] flex flex-col">
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
                按模式與難度分榜競技 · 查看你的實時全服排名
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
        <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {isVerifiedGoogleUser && user ? (
            <div className="flex items-center justify-between w-full gap-2.5 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                {mySpirit?.imageUrl ? (
                  <img
                    src={mySpirit.imageUrl}
                    alt={gameDisplayName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl border border-pink-300 object-cover shrink-0"
                  />
                ) : user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={gameDisplayName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl border border-pink-300 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-pink-200 text-pink-700 font-black flex items-center justify-center text-sm shrink-0">
                    {(gameDisplayName || '玩')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-black text-slate-800 truncate">{gameDisplayName}</p>
                    {activeTab === 'global' && myBestRankInfo && (
                      <span className="px-1.5 py-0.5 text-[10px] font-black bg-amber-400 text-white rounded-md shadow-xs">
                        目前第 {myBestRankInfo.rank} / {myBestRankInfo.total} 名
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-pink-600">
                    已累積 {allPersonalCount} 項關卡最高紀錄（雲端已保存 {Object.keys(scoresMap).length} 項）
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onOpenProfile();
                    }}
                    className="px-2.5 py-1.5 text-[11px] font-black text-pink-700 bg-white hover:bg-pink-50 border border-pink-200 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>編輯暱稱／頭像</span>
                  </button>
                )}
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
                    登入 Google 可自訂暱稱、糖果精靈頭像並跨裝置同步！
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isAuthBusy}
                onClick={() => {
                  soundFx.playClick();
                  void signInWithGoogle();
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
        <div className="space-y-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-pink-50 rounded-2xl border border-pink-200/80 overflow-x-auto">
            {(
              [
                ['all', '全部'],
                ['flip', '翻牌記憶'],
                ['link', '連連看'],
                ['merge', '合成大精靈'],
                ['cpstack', 'CP 疊疊消'],
                ['conveyor', '甜品輸送帶'],
                ['tower', '百層爬塔'],
                ['duel', '好友 PK'],
                ['daily', '今日挑戰榜'],
              ] as [LeaderboardFilterMode, string][]
            ).map(([modeKey, label]) => (
              <button
                key={modeKey}
                type="button"
                onClick={() => handleSelectFilterMode(modeKey)}
                className={`py-1.5 px-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${
                  filterMode === modeKey
                    ? modeKey === 'daily'
                      ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-white shadow-xs'
                      : 'bg-pink-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                {modeKey === 'daily' && <CalendarDays className="w-3 h-3 shrink-0" />}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Difficulty Sub-filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {subFilters.map((df) => (
              <button
                key={df.id}
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setFilterDifficulty(df.id);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  filterDifficulty === df.id
                    ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                    : 'bg-white text-slate-600 border-pink-200 hover:border-pink-300 hover:text-pink-600'
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[210px]">
          {activeTab === 'mine' ? (
            personalRecords.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Medal className="w-8 h-8 text-pink-300 mx-auto" />
                <p className="text-sm font-black text-slate-700">暫時未有符合條件的個人紀錄</p>
                <p className="text-xs text-slate-500 font-medium">
                  完成任何一局王國遊戲（翻牌、連連看、合成罐、CP 疊疊消、甜品屋、爬塔或 PK），最高分就會即刻顯示喺呢度！
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
                          {GAME_MODE_LABELS[rec.gameMode] || rec.gameMode}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                        <span>{formatDifficultyLabel(rec.gameMode, rec.difficultyId)}</span>
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
              <p className="text-sm font-black text-slate-700">
                {filterMode === 'daily'
                  ? `今日（${todayHkDate}）每日挑戰暫未有上榜紀錄`
                  : '此分類暫時未有上榜紀錄'}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                快去完成一局，成為全服第一個登上此榜嘅冠軍啦！
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
                const displayName = isMe ? gameDisplayName : entry.displayName;
                const spirit = resolveSpiritByAvatarOrName(
                  isMe ? avatarSpiritId || entry.avatarSpiritId : entry.avatarSpiritId,
                  displayName
                );
                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isMe
                        ? 'bg-pink-50 border-pink-400 ring-1 ring-pink-300'
                        : 'bg-white border-pink-100 hover:border-pink-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          rank === 1
                            ? 'bg-amber-400 text-white shadow-xs'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-800'
                            : rank === 3
                            ? 'bg-amber-700/80 text-white'
                            : 'bg-pink-50 text-pink-600'
                        }`}
                      >
                        {rank === 1 ? <Crown className="w-3.5 h-3.5" /> : rank}
                      </div>

                      {spirit?.imageUrl ? (
                        <img
                          src={spirit.imageUrl}
                          alt={displayName}
                          className="w-8 h-8 rounded-xl object-cover border border-pink-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 font-black text-xs flex items-center justify-center shrink-0">
                          {(displayName || '？')[0]}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-800 truncate">
                            {displayName}
                          </span>
                          {isMe && (
                            <span className="text-[10px] font-black text-pink-600">（我）</span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 truncate">
                          <span>{GAME_MODE_LABELS[entry.gameMode] || entry.gameMode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{resolveThemeName(entry.themeId, entry.themeName)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDifficultyLabel(entry.gameMode, entry.difficultyId)}</span>
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
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
