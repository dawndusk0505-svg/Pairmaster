import React, { Suspense, lazy, useState } from 'react';
import { Coins, Sparkles, Gamepad2 } from 'lucide-react';
import { ARCADE_GAMES_META, GameModeKey } from '../data/spiritPairings';
import { MatchTheme } from '../data/matchThemes';
import { useKingdomProgress } from '../hooks/useKingdomProgress';
import { soundFx } from '../utils/audio';

const FlipMatchGame = lazy(() =>
  import('./FlipMatchGame').then((m) => ({ default: m.FlipMatchGame }))
);
const LinkMatchGame = lazy(() =>
  import('./LinkMatchGame').then((m) => ({ default: m.LinkMatchGame }))
);
const SpiritMergeGame = lazy(() => import('./games/SpiritMergeGame'));
const CoupleStackGame = lazy(() => import('./games/CoupleStackGame'));
const ConveyorRushGame = lazy(() => import('./games/ConveyorRushGame'));
const SpiritTowerGame = lazy(() => import('./games/SpiritTowerGame'));
const FriendDuelGame = lazy(() => import('./games/FriendDuelGame'));

interface ArcadeHubProps {
  customTheme?: MatchTheme | null;
  onUpdateCustomTheme?: (theme: MatchTheme) => void;
  onOpenMyRecords?: () => void;
  onOpenCollection?: () => void;
  isActiveTab?: boolean;
}

function getInitialSelectedGame(): GameModeKey {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('duelSeed')) return 'duel';
  }
  return 'flip';
}

export const ArcadeHub: React.FC<ArcadeHubProps> = ({
  customTheme = null,
  onUpdateCustomTheme,
  onOpenMyRecords,
  onOpenCollection,
  isActiveTab = true,
}) => {
  const [selectedGame, setSelectedGame] = useState<GameModeKey>(getInitialSelectedGame);
  const { progress } = useKingdomProgress();

  const currentMeta = ARCADE_GAMES_META.find((g) => g.id === selectedGame) || ARCADE_GAMES_META[0];

  return (
    <div className="space-y-3">
      {/* Compact Arcade Game Selector Bar */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3">
        <div className="bg-white/90 border border-pink-200 rounded-3xl p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-pink-500 to-violet-500 text-white flex items-center justify-center shadow-xs">
                <Gamepad2 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  🎮 糖果王國遊戲廳（按需載入 · 7 大精選玩法）
                </h2>
                <p className="text-[11px] font-bold text-slate-500">
                  每次只運作你正在玩的 1 款遊戲，輕盈流暢唔發熱！每局完結即賺星幣解鎖閃卡～
                </p>
              </div>
            </div>

            {onOpenCollection && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onOpenCollection();
                }}
                className="px-3 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-black text-amber-800 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono">{progress.candyCoins}</span>
                <span>星幣 · 圖鑑 {progress.unlockedCardIds.length}/36 →</span>
              </button>
            )}
          </div>

          {/* 7-Game Horizontal Scroll / Grid Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {ARCADE_GAMES_META.map((game) => {
              const isSelected = selectedGame === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedGame(game.id);
                  }}
                  className={`relative p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                    isSelected
                      ? 'bg-pink-50/90 border-pink-500 ring-2 ring-pink-200 shadow-sm'
                      : 'bg-white border-pink-100 hover:border-pink-300 hover:bg-pink-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xl leading-none">{game.iconEmoji}</span>
                    {game.isNew && (
                      <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-rose-500 to-amber-400 text-white text-[9px] font-black">
                        NEW
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-black truncate ${
                        isSelected ? 'text-pink-700' : 'text-slate-800'
                      }`}
                    >
                      {game.shortTitle}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{game.badge}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-50 via-white to-violet-50 border border-pink-100 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <span>
                正在遊玩：<strong className="text-pink-700">{currentMeta.title}</strong> —{' '}
                {currentMeta.tagline}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Only mount the active selected game inside Suspense so idle games cost zero CPU/RAM */}
      <div data-protect-media="true">
        <Suspense
          fallback={
            <div className="max-w-3xl mx-auto my-8 p-10 rounded-3xl bg-white/90 border border-pink-200 text-center space-y-2 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-500 flex items-center justify-center mx-auto animate-bounce text-xl">
                {currentMeta.iconEmoji}
              </div>
              <p className="text-sm font-black text-slate-700">正在載入《{currentMeta.title}》...</p>
              <p className="text-xs font-bold text-slate-400">按需分包加速載入中，請稍候～</p>
            </div>
          }
        >
          {selectedGame === 'flip' && (
            <FlipMatchGame
              customTheme={customTheme}
              onUpdateCustomTheme={onUpdateCustomTheme}
              onOpenMyRecords={onOpenMyRecords}
              isActiveTab={isActiveTab}
            />
          )}
          {selectedGame === 'link' && (
            <LinkMatchGame
              customTheme={customTheme}
              onUpdateCustomTheme={onUpdateCustomTheme}
              onOpenMyRecords={onOpenMyRecords}
              isActiveTab={isActiveTab}
            />
          )}
          {selectedGame === 'merge' && (
            <SpiritMergeGame isActiveTab={isActiveTab} onOpenMyRecords={onOpenMyRecords} />
          )}
          {selectedGame === 'cpstack' && (
            <CoupleStackGame isActiveTab={isActiveTab} onOpenMyRecords={onOpenMyRecords} />
          )}
          {selectedGame === 'conveyor' && (
            <ConveyorRushGame isActiveTab={isActiveTab} onOpenMyRecords={onOpenMyRecords} />
          )}
          {selectedGame === 'tower' && (
            <SpiritTowerGame isActiveTab={isActiveTab} onOpenMyRecords={onOpenMyRecords} />
          )}
          {selectedGame === 'duel' && (
            <FriendDuelGame isActiveTab={isActiveTab} onOpenMyRecords={onOpenMyRecords} />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default ArcadeHub;
