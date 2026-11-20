import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Lightbulb,
  Shuffle,
  Lock,
  Sparkles,
  Trophy,
  Clock,
  Coins,
  Cloud,
  Pause,
  Play,
} from 'lucide-react';
import {
  SPIRIT_PROP_PAIRINGS,
  SpiritPropPairing,
  getSpiritById,
  getCpPartnerId,
} from '../../data/spiritPairings';
import { ThemeItem } from '../../data/matchThemes';
import { soundFx } from '../../utils/audio';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useKingdomProgress } from '../../hooks/useKingdomProgress';

interface StackTile {
  uid: string;
  item: ThemeItem;
  pairId: string;
  role: 'spirit' | 'prop';
  layer: number;
  xPct: number;
  yPct: number;
  cleared: boolean;
}

interface CoupleStackGameProps {
  isActiveTab?: boolean;
  onOpenMyRecords?: () => void;
}

const CP_STAGE_PRESETS = [
  { id: 'relaxed', label: '甜蜜 6 組 CP (12張)', pairCount: 6 },
  { id: 'standard', label: '熱戀 9 組 CP (18張)', pairCount: 9 },
  { id: 'master', label: '全王國 11 組 CP (22張×2層)', pairCount: 11, doubleUp: true },
] as const;

type CpDifficultyId = (typeof CP_STAGE_PRESETS)[number]['id'];

function buildLayeredBoard(pairCount: number, doubleUp = false): StackTile[] {
  const chosenPairs = [...SPIRIT_PROP_PAIRINGS]
    .sort(() => Math.random() - 0.5)
    .slice(0, pairCount);

  const deckUnits: Array<{ item: ThemeItem; pairId: string; role: 'spirit' | 'prop' }> = [];
  const rounds = doubleUp ? 2 : 1;

  for (let r = 0; r < rounds; r++) {
    for (const pair of chosenPairs) {
      const sp = getSpiritById(pair.spiritId);
      const pr = getSpiritById(pair.propId);
      if (sp && pr) {
        deckUnits.push({ item: sp, pairId: pair.id, role: 'spirit' });
        deckUnits.push({ item: pr, pairId: pair.id, role: 'prop' });
      }
    }
  }

  const shuffled = [...deckUnits].sort(() => Math.random() - 0.5);

  // Distribute neatly into overlapping layers inside a mobile-safe 5-col coordinate space
  const cols = 5;
  const total = shuffled.length;
  const layer0Cap = total <= 14 ? 8 : total <= 20 ? 10 : 15;
  const layer1Cap = total <= 20 ? total : 30;
  const slots: Array<{ layer: number; xPct: number; yPct: number }> = [];
  for (let idx = 0; idx < total; idx++) {
    const layer = idx < layer0Cap ? 0 : idx < layer1Cap ? 1 : 2;
    const localIdx = layer === 0 ? idx : layer === 1 ? idx - layer0Cap : idx - layer1Cap;
    const col = localIdx % cols;
    const row = Math.floor(localIdx / cols) % 3;
    const offsetPct = layer === 1 ? 2.5 : layer === 2 ? -2.5 : 0;
    const xPct = Math.min(76, Math.max(4, 6 + col * 17 + offsetPct));
    const yPct = Math.min(73, Math.max(5, 7 + row * 24 + layer * 4.5));
    slots.push({ layer, xPct, yPct });
  }

  return shuffled.map((unit, idx) => ({
    uid: `tile_${idx}_${unit.pairId}_${unit.role}`,
    item: unit.item,
    pairId: unit.pairId,
    role: unit.role,
    layer: slots[idx].layer,
    xPct: slots[idx].xPct,
    yPct: slots[idx].yPct,
    cleared: false,
  }));
}

export const CoupleStackGame: React.FC<CoupleStackGameProps> = ({
  isActiveTab = true,
  onOpenMyRecords,
}) => {
  const { getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();
  const { earnCoins, recordCpPairCleared, unlockCardFree } = useKingdomProgress();

  const [diffId, setDiffId] = useState<CpDifficultyId>('standard');
  const [tiles, setTiles] = useState<StackTile[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [hintPairUids, setHintPairUids] = useState<[string, string] | null>(null);
  const [lastMatchedPair, setLastMatchedPair] = useState<SpiritPropPairing | null>(null);
  const [mismatchShake, setMismatchShake] = useState(false);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [timeSec, setTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [hintCharges, setHintCharges] = useState(3);
  const [shuffleCharges, setShuffleCharges] = useState(2);
  const [highScore, setHighScore] = useState(0);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);

  const activePreset = CP_STAGE_PRESETS.find((p) => p.id === diffId) || CP_STAGE_PRESETS[1];

  const startNewGame = useCallback(
    (targetDiffId: CpDifficultyId = diffId) => {
      const preset = CP_STAGE_PRESETS.find((p) => p.id === targetDiffId) || CP_STAGE_PRESETS[1];
      const doubleUp = 'doubleUp' in preset ? Boolean(preset.doubleUp) : false;
      setTiles(buildLayeredBoard(preset.pairCount, doubleUp));
      setSelectedUid(null);
      setHintPairUids(null);
      setLastMatchedPair(null);
      setMismatchShake(false);
      setScore(0);
      setCombo(1);
      setMaxCombo(1);
      setTimeSec(0);
      setIsPlaying(false);
      setIsPaused(false);
      setIsVictory(false);
      setHintCharges(3);
      setShuffleCharges(2);
      setCoinsAwarded(0);
      setSyncStatus(null);
    },
    [diffId]
  );

  useEffect(() => {
    startNewGame(diffId);
  }, [diffId, startNewGame]);

  useEffect(() => {
    const key = `pairmaster_cpstack_high_${diffId}_candy-cpstack`;
    let localBest = 0;
    try {
      localBest = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    } catch {
      localBest = 0;
    }
    const cloudBest = getCloudHighScore('cpstack', diffId, 'candy-cpstack');
    setHighScore(Math.max(localBest, cloudBest));
  }, [diffId, getCloudHighScore]);

  useEffect(() => {
    if (!isActiveTab || !isPlaying || isPaused || isVictory) return;
    const timer = setInterval(() => {
      setTimeSec((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isActiveTab, isPaused, isPlaying, isVictory]);

  // Compute which un-cleared tiles are blocked by higher-layer overlapping tiles
  const blockedUidSet = useMemo(() => {
    const blocked = new Set<string>();
    const active = tiles.filter((t) => !t.cleared);
    for (const lower of active) {
      for (const upper of active) {
        if (upper.layer > lower.layer) {
          if (Math.abs(upper.xPct - lower.xPct) < 11.5 && Math.abs(upper.yPct - lower.yPct) < 17) {
            blocked.add(lower.uid);
            break;
          }
        }
      }
    }
    return blocked;
  }, [tiles]);

  const handleTileClick = (tile: StackTile) => {
    if (isPaused || tile.cleared || blockedUidSet.has(tile.uid) || isVictory) return;
    if (!isPlaying) setIsPlaying(true);
    setHintPairUids(null);

    if (selectedUid === tile.uid) {
      soundFx.playClick();
      setSelectedUid(null);
      return;
    }

    if (!selectedUid) {
      soundFx.playCardFlip();
      setSelectedUid(tile.uid);
      return;
    }

    const first = tiles.find((t) => t.uid === selectedUid);
    if (!first) {
      setSelectedUid(tile.uid);
      return;
    }

    // Check if first + tile form a matching Spirit x Prop CP (same pairId, opposite roles!)
    if (first.pairId === tile.pairId && first.role !== tile.role) {
      const nextCombo = combo + 1;
      const gained = 120 * combo;
      const nextScore = score + gained;

      soundFx.playMatchSuccess(combo);
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setScore(nextScore);
      setSelectedUid(null);

      const matchedInfo = getCpPartnerId(first.item.id)?.pair || null;
      setLastMatchedPair(matchedInfo);
      if (matchedInfo) {
        recordCpPairCleared(matchedInfo.id);
        unlockCardFree(matchedInfo.propId);
      }

      const nextTiles = tiles.map((t) =>
        t.uid === first.uid || t.uid === tile.uid ? { ...t, cleared: true } : t
      );
      setTiles(nextTiles);

      if (nextTiles.every((t) => t.cleared)) {
        const timeBonus = Math.max(0, 600 - timeSec * 4);
        const finalScore = nextScore + timeBonus;
        setScore(finalScore);
        setIsVictory(true);
        setIsPlaying(false);

        const stars = timeSec <= 38 ? 3 : timeSec <= 75 ? 2 : 1;
        const reward = 18 + stars * 10;
        setCoinsAwarded(reward);
        earnCoins(reward);

        const key = `pairmaster_cpstack_high_${diffId}_candy-cpstack`;
        if (finalScore > highScore) {
          setHighScore(finalScore);
          try {
            localStorage.setItem(key, String(finalScore));
          } catch {
            // ignore
          }
        }

        void saveGameScore({
          gameMode: 'cpstack',
          themeId: 'candy-cpstack',
          themeName: '命定 CP 疊疊塔',
          difficultyId: diffId,
          score: finalScore,
          timeSec,
          maxCombo: Math.max(maxCombo, nextCombo),
          stars,
        }).then((status) => setSyncStatus(status));

        soundFx.playVictory();
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      }
    } else {
      soundFx.playMismatch();
      setCombo(1);
      setSelectedUid(null);
      setMismatchShake(true);
      setTimeout(() => setMismatchShake(false), 320);
    }
  };

  const handleHint = () => {
    if (isPaused || hintCharges <= 0 || isVictory) return;
    const openTiles = tiles.filter((t) => !t.cleared && !blockedUidSet.has(t.uid));
    for (let i = 0; i < openTiles.length; i++) {
      for (let j = i + 1; j < openTiles.length; j++) {
        if (
          openTiles[i].pairId === openTiles[j].pairId &&
          openTiles[i].role !== openTiles[j].role
        ) {
          soundFx.playPowerUp();
          setHintCharges((c) => c - 1);
          setHintPairUids([openTiles[i].uid, openTiles[j].uid]);
          return;
        }
      }
    }
  };

  const handleShuffleOpen = () => {
    if (isPaused || shuffleCharges <= 0 || isVictory) return;
    soundFx.playPowerUp();
    setShuffleCharges((c) => c - 1);
    setSelectedUid(null);
    setHintPairUids(null);

    const remaining = tiles.filter((t) => !t.cleared);
    const items = remaining.map((t) => ({ item: t.item, pairId: t.pairId, role: t.role }));
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    let idx = 0;
    setTiles((prev) =>
      prev.map((t) => {
        if (t.cleared) return t;
        const picked = shuffled[idx++];
        return { ...t, ...picked };
      })
    );
  };

  const remainingPairs = Math.floor(tiles.filter((t) => !t.cleared).length / 2);
  const selectedTile = selectedUid ? tiles.find((t) => t.uid === selectedUid) : null;
  const selectedPartnerHint = selectedTile ? getCpPartnerId(selectedTile.item.id) : null;
  const publicBest = getPublicStageBest('cpstack', diffId, 'candy-cpstack');

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4">
      <div className="bg-white/95 border border-pink-200 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              🪄 命定 CP 疊疊消：精靈 × 用具層疊塔
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              將糖果精靈配對專屬「魔法用具／水果」即可消除！壓喺下層有鎖頭嘅卡要等上面解開先揀得～
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {CP_STAGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setDiffId(preset.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                  diffId === preset.id
                    ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
                    : 'bg-pink-50 text-slate-700 border-pink-200 hover:border-pink-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 block">目前分數</span>
            <span className="text-base font-black font-mono text-pink-600">{score}</span>
          </div>
          <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 block">餘下 CP</span>
            <span className="text-base font-black font-mono text-rose-600">{remainingPairs} 組</span>
          </div>
          <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 block">連擊倍率</span>
            <span className="text-base font-black font-mono text-amber-500">x{combo}</span>
          </div>
          <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 block">用時</span>
            <span className="text-base font-black font-mono text-slate-700 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              {timeSec}s
            </span>
          </div>
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-2 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-amber-700 block">最高紀錄</span>
            <span className="text-base font-black font-mono text-amber-600">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Active CP Hint or Match Banner */}
      <div className="min-h-[44px] flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 border border-pink-200 rounded-2xl px-4 py-2 text-xs font-bold">
        {selectedTile && selectedPartnerHint ? (
          <div className="flex items-center gap-2 text-pink-700">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              已選「<strong>{selectedTile.item.name}</strong>」— 佢嘅命定拍檔係「
              <strong className="text-rose-600">{getSpiritById(selectedPartnerHint.partnerId)?.name}</strong>
              」（{selectedPartnerHint.pair.groupName}）！
            </span>
          </div>
        ) : lastMatchedPair ? (
          <div className="flex items-center gap-2 text-emerald-700">
            <span>
              💖 消除成功【{lastMatchedPair.groupName}】！解鎖稱號「{lastMatchedPair.title}」— {lastMatchedPair.story}
            </span>
          </div>
        ) : (
          <span className="text-slate-600">
            💡 揀選一隻精靈再揀佢專屬嘅魔法用具／水果（例如：香芋星喵 × 星願魔法杖）！
          </span>
        )}

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={!isPlaying || isVictory}
            onClick={() => {
              soundFx.playClick();
              setIsPaused((p) => !p);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-pink-200 text-slate-700 hover:bg-pink-50 flex items-center gap-1 cursor-pointer disabled:opacity-45"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? '繼續' : '暫停'}</span>
          </button>
          <button
            type="button"
            disabled={isPaused || hintCharges <= 0 || isVictory}
            onClick={handleHint}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 flex items-center gap-1 cursor-pointer disabled:opacity-45"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>提示 ({hintCharges})</span>
          </button>
          <button
            type="button"
            disabled={isPaused || shuffleCharges <= 0 || isVictory}
            onClick={handleShuffleOpen}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 flex items-center gap-1 cursor-pointer disabled:opacity-45"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>重洗 ({shuffleCharges})</span>
          </button>
          <button
            type="button"
            onClick={() => startNewGame(diffId)}
            className="px-2.5 py-1.5 rounded-xl bg-pink-500 text-white hover:bg-pink-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重開</span>
          </button>
        </div>
      </div>

      {/* Stacked Mahjong-style Tile Board */}
      <div
        className={`relative w-full h-[430px] sm:h-[490px] rounded-3xl border-2 border-pink-200 bg-gradient-to-b from-white via-pink-50/40 to-rose-50/70 shadow-inner overflow-hidden ${
          mismatchShake ? 'animate-pulse ring-2 ring-rose-400' : ''
        }`}
      >
        {tiles.map((tile) => {
          if (tile.cleared) return null;
          const isBlocked = blockedUidSet.has(tile.uid);
          const isSelected = selectedUid === tile.uid;
          const isHinted =
            hintPairUids !== null && (hintPairUids[0] === tile.uid || hintPairUids[1] === tile.uid);

          return (
            <button
              key={tile.uid}
              type="button"
              disabled={isBlocked}
              onClick={() => handleTileClick(tile)}
              style={{
                left: `${tile.xPct}%`,
                top: `${tile.yPct}%`,
                zIndex: tile.layer * 10 + (isSelected ? 5 : 1),
              }}
              className={`absolute w-[15%] min-w-[50px] max-w-[80px] aspect-[4/5] rounded-2xl border-2 p-1 flex flex-col items-center justify-between transition-all select-none ${
                isBlocked
                  ? 'bg-slate-100/95 border-slate-300 opacity-60 grayscale-[35%] cursor-not-allowed shadow-xs'
                  : isSelected
                  ? 'bg-white border-pink-500 ring-4 ring-pink-300/70 -translate-y-1.5 scale-105 shadow-xl cursor-pointer'
                  : isHinted
                  ? 'bg-amber-50 border-amber-400 ring-4 ring-amber-300 animate-bounce shadow-lg cursor-pointer'
                  : 'bg-white border-pink-200 hover:border-pink-400 hover:-translate-y-0.5 shadow-md cursor-pointer'
              }`}
            >
              <div className="w-full flex items-center justify-between px-0.5">
                <span
                  className={`text-[9px] font-black px-1 rounded ${
                    tile.role === 'spirit'
                      ? 'bg-pink-100 text-pink-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {tile.role === 'spirit' ? '精靈' : '用具'}
                </span>
                {isBlocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </div>

              {tile.item.imageUrl ? (
                <img
                  src={tile.item.imageUrl}
                  alt={tile.item.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-pink-100 pointer-events-none"
                />
              ) : (
                <span className="text-2xl">{tile.item.symbol}</span>
              )}

              <span className="text-[9px] sm:text-[10px] font-black text-slate-800 truncate w-full text-center leading-tight">
                {tile.item.name}
              </span>
            </button>
          );
        })}

        {isPaused && !isVictory && (
          <div className="absolute inset-0 z-40 bg-pink-950/55 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
            <span className="text-4xl">🪄</span>
            <h3 className="text-xl font-black text-white">疊疊消暫停中</h3>
            <p className="text-xs font-bold text-pink-100">卡牌已遮蓋，按下方按鈕繼續配對 CP！</p>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setIsPaused(false);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black text-sm shadow-lg cursor-pointer"
            >
              繼續配對 CP
            </button>
          </div>
        )}

        {isVictory && (
          <div className="absolute inset-0 z-50 bg-white/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in">
            <span className="text-4xl">👑</span>
            <h3 className="text-2xl font-black text-slate-900">命定 CP 全數配對通關！</h3>
            <p className="text-3xl font-black font-mono text-pink-600">{score} 分</p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />+{coinsAwarded} 王國星幣
              </span>
              <span className="px-3 py-1 rounded-xl bg-pink-100 text-pink-700">
                通關時間 {timeSec}s · 最高連擊 x{maxCombo}
              </span>
            </div>
            {syncStatus && (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-pink-500" />
                {syncStatus === 'cloud' ? '已同步至雲端榮譽榜' : '已保存分數紀錄'}
              </p>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => startNewGame(diffId)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black text-sm shadow-md cursor-pointer"
              >
                再挑戰一局
              </button>
              {onOpenMyRecords && (
                <button
                  type="button"
                  onClick={onOpenMyRecords}
                  className="px-4 py-2.5 rounded-2xl bg-pink-50 text-pink-700 border border-pink-200 font-black text-sm cursor-pointer"
                >
                  查看戰績
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reference Cheat Sheet for the 11 Official CP Pairings */}
      <div className="bg-white/95 border border-pink-200 rounded-3xl p-4 space-y-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-black text-slate-800">
            💞 官方 11 組命定 CP 配對速查表（邊玩邊記，解鎖圖鑑徽章！）
          </h3>
          {publicBest && (
            <span className="text-xs font-black text-amber-600 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              全服最高：{publicBest.displayName} ({publicBest.highScore}分)
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {SPIRIT_PROP_PAIRINGS.slice(0, activePreset.pairCount).map((cp) => {
            const sp = getSpiritById(cp.spiritId);
            const pr = getSpiritById(cp.propId);
            return (
              <div
                key={cp.id}
                className="p-2 rounded-2xl bg-pink-50/50 border border-pink-100 flex items-center gap-2 text-[11px]"
              >
                {sp?.imageUrl && (
                  <img
                    src={sp.imageUrl}
                    alt={sp.name}
                    className="w-7 h-7 rounded-lg object-cover border border-pink-200 shrink-0"
                  />
                )}
                <span className="font-black text-pink-400">×</span>
                {pr?.imageUrl && (
                  <img
                    src={pr.imageUrl}
                    alt={pr.name}
                    className="w-7 h-7 rounded-lg object-cover border border-amber-200 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-black text-slate-800 truncate">{sp?.name}</p>
                  <p className="font-bold text-amber-700 truncate">{pr?.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CoupleStackGame;
