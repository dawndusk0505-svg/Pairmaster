import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Coins,
  Lock,
  Unlock,
  Gift,
  Heart,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { CANDY_SPIRIT_ITEMS, ThemeItem } from '../data/matchThemes';
import {
  SPIRIT_LORE_MAP,
  SPIRIT_PROP_PAIRINGS,
  getSpiritById,
} from '../data/spiritPairings';
import { useKingdomProgress } from '../hooks/useKingdomProgress';
import { soundFx } from '../utils/audio';

type FilterTab = 'all' | 'spirits' | 'props' | 'cp';

export const SpiritCollectionWall: React.FC = () => {
  const { progress, unlockCardWithCoins, pullGachaCard } = useKingdomProgress();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [gachaResult, setGachaResult] = useState<{
    item: ThemeItem;
    isNew: boolean;
    refundCoins: number;
  } | null>(null);
  const [coinFeedback, setCoinFeedback] = useState<string | null>(null);

  const unlockedSet = new Set(progress.unlockedCardIds);
  const unlockedPairSet = new Set(progress.unlockedPairIds);

  const spiritItems = CANDY_SPIRIT_ITEMS.filter((i) => i.id.startsWith('cs'));
  const propItems = CANDY_SPIRIT_ITEMS.filter((i) => i.id.startsWith('sp'));

  const visibleItems =
    filterTab === 'spirits'
      ? spiritItems
      : filterTab === 'props'
      ? propItems
      : CANDY_SPIRIT_ITEMS;

  const handleUnlockDirect = (item: ThemeItem) => {
    if (unlockedSet.has(item.id)) return;
    if (progress.candyCoins < 80) {
      soundFx.playMismatch();
      setCoinFeedback('星幣不足（需要 80 星幣），快去玩任何一款小遊戲賺取星幣啦！');
      setTimeout(() => setCoinFeedback(null), 3000);
      return;
    }
    const ok = unlockCardWithCoins(item.id, 80);
    if (ok) {
      soundFx.playVictory();
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.65 } });
      setGachaResult({ item, isNew: true, refundCoins: 0 });
    }
  };

  const handlePullGacha = () => {
    if (progress.candyCoins < 60) {
      soundFx.playMismatch();
      setCoinFeedback('扭蛋需要 60 王國星幣，玩一局翻牌或爬塔即刻拎到！');
      setTimeout(() => setCoinFeedback(null), 3000);
      return;
    }
    const res = pullGachaCard(60);
    if (!res) return;
    const item = getSpiritById(res.itemId);
    if (!item) return;

    soundFx.playVictory();
    if (res.isNew) {
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
    }
    setGachaResult({ item, isNew: res.isNew, refundCoins: res.refundCoins });
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header Summary Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-pink-50 to-violet-50 border-2 border-pink-200 rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-pink-600">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>MIRACLE SPIRIT GALLERY · 36 款精靈與魔法用具</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">✨ 星幣精靈閃卡圖鑑牆</h2>
          <p className="text-xs sm:text-sm font-bold text-slate-600">
            玩遍 7 款王國遊戲即可賺取星幣！抽齊 25 位糖果精靈、11 款魔法用具與 11 組命定 CP 徽章～
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-2.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-amber-700 block">持有王國星幣</span>
            <span className="text-xl font-black font-mono text-amber-600 flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" />
              {progress.candyCoins}
            </span>
          </div>
          <div className="bg-white border-2 border-pink-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-pink-600 block">圖鑑收集度</span>
            <span className="text-xl font-black font-mono text-pink-600">
              {progress.unlockedCardIds.length} / {CANDY_SPIRIT_ITEMS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePullGacha}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-violet-500 hover:brightness-105 text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            <Gift className="w-4 h-4" />
            <span>盲盒扭蛋抽卡 (60 星幣)</span>
          </button>
        </div>
      </div>

      {coinFeedback && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl px-4 py-2.5 text-xs font-black text-rose-700 text-center">
          ⚠️ {coinFeedback}
        </div>
      )}

      {/* Gacha / Unlock Showcase Toast */}
      {gachaResult && (
        <div className="bg-white border-2 border-amber-300 rounded-3xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            {gachaResult.item.imageUrl && (
              <img
                src={gachaResult.item.imageUrl}
                alt={gachaResult.item.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-300 shadow-sm"
              />
            )}
            <div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  gachaResult.isNew
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {gachaResult.isNew ? '✨ NEW! 成功解鎖新閃卡' : `重覆精靈 · 退回 +${gachaResult.refundCoins} 星幣`}
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">
                {gachaResult.item.symbol} {gachaResult.item.name}
              </h3>
              <p className="text-xs font-bold text-pink-600">
                {SPIRIT_LORE_MAP[gachaResult.item.id]?.quote}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGachaResult(null)}
            className="px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 text-xs font-black border border-pink-200 cursor-pointer"
          >
            收起卡片
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 p-1 bg-white border border-pink-200 rounded-2xl shadow-xs">
          {(
            [
              ['all', `全部閃卡 (${CANDY_SPIRIT_ITEMS.length})`],
              ['spirits', `糖果精靈 (${spiritItems.length})`],
              ['props', `精靈用具／水果 (${propItems.length})`],
              ['cp', `11 組 CP 雙星徽章 (${progress.unlockedPairIds.length}/11)`],
            ] as [FilterTab, string][]
          ).map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => {
                soundFx.playClick();
                setFilterTab(tabKey);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterTab === tabKey
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>🏰 最高爬塔：第 {progress.bestTowerFloor} 層</span>
          <span>·</span>
          <span>🫧 合成最高：第 {progress.mergedMaxTier + 1} 階</span>
        </div>
      </div>

      {/* CP Badges Grid */}
      {filterTab === 'cp' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SPIRIT_PROP_PAIRINGS.map((cp) => {
            const sp = getSpiritById(cp.spiritId);
            const pr = getSpiritById(cp.propId);
            const isPairCleared = unlockedPairSet.has(cp.id);
            const bothCardsOwned =
              unlockedSet.has(cp.spiritId) && unlockedSet.has(cp.propId);
            const achieved = isPairCleared || bothCardsOwned;

            return (
              <div
                key={cp.id}
                className={`rounded-3xl border-2 p-4 space-y-3 transition-all ${
                  achieved
                    ? 'bg-white border-amber-300 shadow-md ring-2 ring-amber-100'
                    : 'bg-slate-50/80 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black text-white bg-gradient-to-r ${cp.badgeColor}`}
                  >
                    {cp.groupName}
                  </span>
                  {achieved ? (
                    <span className="text-[11px] font-black text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      已達成稱號：{cp.title}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      玩「CP 疊疊消」或集齊雙卡解鎖
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3 py-1">
                  {sp?.imageUrl && (
                    <img
                      src={sp.imageUrl}
                      alt={sp.name}
                      className={`w-16 h-16 rounded-2xl object-cover border-2 ${
                        unlockedSet.has(cp.spiritId) ? 'border-pink-400' : 'border-slate-300 grayscale'
                      }`}
                    />
                  )}
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-400 shrink-0" />
                  {pr?.imageUrl && (
                    <img
                      src={pr.imageUrl}
                      alt={pr.name}
                      className={`w-16 h-16 rounded-2xl object-cover border-2 ${
                        unlockedSet.has(cp.propId) ? 'border-amber-400' : 'border-slate-300 grayscale'
                      }`}
                    />
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-black text-slate-900">
                    {sp?.name} × {pr?.name}
                  </p>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">{cp.story}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 36 Cards Gallery Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visibleItems.map((item) => {
            const unlocked = unlockedSet.has(item.id);
            const lore = SPIRIT_LORE_MAP[item.id];
            const rarity = lore?.rarity || 'R';

            return (
              <div
                key={item.id}
                className={`rounded-3xl border-2 p-2.5 flex flex-col justify-between gap-2 transition-all ${
                  unlocked
                    ? rarity === 'SSR'
                      ? 'bg-gradient-to-b from-amber-50 via-white to-pink-50 border-amber-400 shadow-md ring-2 ring-amber-200/70'
                      : 'bg-white border-pink-200 shadow-sm hover:-translate-y-0.5'
                    : 'bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      rarity === 'SSR'
                        ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-white'
                        : rarity === 'SR'
                        ? 'bg-violet-500 text-white'
                        : 'bg-sky-500 text-white'
                    }`}
                  >
                    {rarity === 'SSR' ? <Crown className="w-2.5 h-2.5 inline mr-0.5" /> : null}
                    {rarity}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {unlocked ? '✨ 已擁有' : '未解鎖'}
                  </span>
                </div>

                <div className="relative flex justify-center py-1">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className={`w-24 h-24 rounded-2xl object-cover border-2 transition-all ${
                        unlocked
                          ? 'border-pink-200'
                          : 'border-slate-300 grayscale opacity-45 brightness-90'
                      }`}
                    />
                  ) : (
                    <span className="text-4xl">{item.symbol}</span>
                  )}
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-8 h-8 rounded-full bg-slate-900/60 text-white flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {item.symbol} {item.name}
                  </p>
                  <p className="text-[10px] font-bold text-pink-500 truncate">
                    {lore?.title || item.category}
                  </p>
                  {unlocked ? (
                    <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 min-h-[28px]">
                      {lore?.quote}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUnlockDirect(item)}
                      className="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>80 星幣指定解鎖</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SpiritCollectionWall;
