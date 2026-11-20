import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sparkles, RotateCcw } from 'lucide-react';
import { MatchTheme, ThemeItem, CANDY_SPIRIT_ITEMS } from '../data/matchThemes';
import { soundFx } from '../utils/audio';

interface CustomThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCustomTheme: (theme: MatchTheme) => void;
  currentCustomTheme?: MatchTheme | null;
}

const EXTRA_SUGGESTIONS: { name: string; symbol: string; color: string; imageUrl?: string }[] = [
  { name: '甜甜圈犬', symbol: '🐶', color: 'text-amber-500' },
  { name: '彩虹夢馬', symbol: '🦄', color: 'text-violet-400' },
  { name: '星空水母', symbol: '🪼', color: 'text-pink-400' },
  { name: '蜜桃水豚', symbol: '🦫', color: 'text-amber-700' },
  { name: '棒棒糖浣', symbol: '🦝', color: 'text-purple-400' },
  { name: '向日葵精', symbol: '🌻', color: 'text-yellow-500' },
];

const PRESET_SUGGESTIONS: { name: string; symbol: string; color: string; imageUrl?: string }[] = [
  ...CANDY_SPIRIT_ITEMS.map((item) => ({
    name: item.name,
    symbol: item.symbol,
    color: item.color,
    imageUrl: item.imageUrl,
  })),
  ...EXTRA_SUGGESTIONS,
];

export const CustomThemeModal: React.FC<CustomThemeModalProps> = ({
  isOpen,
  onClose,
  onApplyCustomTheme,
  currentCustomTheme = null,
}) => {
  const [themeName, setThemeName] = useState('我的專屬糖果隊');
  const [items, setItems] = useState<ThemeItem[]>(() => {
    if (currentCustomTheme && currentCustomTheme.items.length >= 6) {
      return currentCustomTheme.items;
    }
    try {
      const saved = localStorage.getItem('pairmaster_custom_theme_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.items && parsed.items.length >= 6) return parsed.items;
      }
    } catch {
      // ignore
    }
    return CANDY_SPIRIT_ITEMS.slice(0, 24).map((s, idx) => ({
      id: `custom_${idx}_${Date.now()}`,
      name: s.name,
      symbol: s.symbol,
      color: s.color,
      imageUrl: s.imageUrl,
    }));
  });

  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('🌸');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentCustomTheme && currentCustomTheme.items.length >= 6) {
      setThemeName(currentCustomTheme.name || '我的專屬糖果隊');
      setItems(currentCustomTheme.items.slice(0, 24));
      setErrorMsg(null);
    }
  }, [isOpen, currentCustomTheme]);

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSymbol.trim()) return;
    if (items.length >= 24) {
      soundFx.playMismatch();
      setErrorMsg('自訂牌組最多可加入 24 個公仔圖案喔！');
      return;
    }

    soundFx.playClick();
    const newItem: ThemeItem = {
      id: `custom_${Date.now()}`,
      name: newName.trim().slice(0, 40),
      symbol: newSymbol.trim().slice(0, 16),
      color: 'text-pink-500',
    };

    setItems((prev) => {
      const next = [...prev, newItem];
      if (next.length >= 6) setErrorMsg(null);
      return next;
    });
    setNewName('');
    setNewSymbol('🌸');
  };

  const handleQuickAdd = (s: { name: string; symbol: string; color: string; imageUrl?: string }) => {
    if (items.length >= 24) {
      soundFx.playMismatch();
      setErrorMsg('自訂牌組最多可加入 24 個公仔圖案喔！');
      return;
    }
    soundFx.playClick();
    const newItem: ThemeItem = {
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      name: s.name.slice(0, 40),
      symbol: s.symbol.slice(0, 16),
      color: s.color,
      imageUrl: s.imageUrl,
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      if (next.length >= 6) setErrorMsg(null);
      return next;
    });
  };

  const handleRemoveItem = (id: string) => {
    soundFx.playMismatch();
    setErrorMsg(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveAndApply = () => {
    if (items.length < 6) {
      soundFx.playMismatch();
      setErrorMsg(`目前只有 ${items.length} 個公仔圖案，請至少保留或加入 6 個公仔才能開始配對喔！`);
      return;
    }
    setErrorMsg(null);

    soundFx.playVictory();
    const customTheme: MatchTheme = {
      id: 'custom-theme',
      name: themeName.trim() || '自訂糖果隊',
      enName: 'Custom Sweet Deck',
      description: '玩家自創的糖果色公仔卡通牌組',
      icon: '🎨',
      items,
    };

    try {
      localStorage.setItem('pairmaster_custom_theme_v2', JSON.stringify(customTheme));
    } catch {
      // ignore
    }

    onApplyCustomTheme(customTheme);
    onClose();
  };

  const handleResetPresets = () => {
    soundFx.playClick();
    setErrorMsg(null);
    setItems(
      CANDY_SPIRIT_ITEMS.slice(0, 24).map((s, idx) => ({
        id: `custom_${idx}_${Date.now()}`,
        name: s.name,
        symbol: s.symbol,
        color: s.color,
        imageUrl: s.imageUrl,
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-xl shadow-xs">
              🎨
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">自訂專屬公仔 · 糖果色清單</h3>
              <span className="text-xs text-pink-500 font-bold">
                自由挑選 {CANDY_SPIRIT_ITEMS.length} 款糖果精靈與用具或加入自訂公仔
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Name Input */}
        <div className="space-y-1">
          <label className="text-xs text-slate-600 font-bold">牌組名稱</label>
          <input
            type="text"
            maxLength={40}
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-pink-500"
            placeholder="例如：糖果森林小夥伴"
          />
        </div>

        {/* Current Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-700 font-bold">
              目前牌組清單 ({items.length}/24 個公仔圖案，至少 6 個)：
            </span>
            <button
              onClick={handleResetPresets}
              className="text-[11px] text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重置為精選 24 位小精靈</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-pink-50/50 rounded-2xl border border-pink-200">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between p-1.5 rounded-xl bg-white border border-pink-200 shadow-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-lg object-cover shrink-0 border border-pink-100"
                    />
                  ) : (
                    <span className="text-xl shrink-0">{it.symbol}</span>
                  )}
                  <span className="text-xs text-slate-800 font-bold truncate">{it.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveItem(it.id)}
                  title="刪除"
                  className="text-slate-300 hover:text-rose-500 p-1 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Fast Add Suggestions */}
        <div className="space-y-1.5">
          <span className="text-xs text-pink-600 font-bold block">✨ 點擊快速加入糖果小精靈：</span>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {PRESET_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAdd(s)}
                className="text-[11px] font-bold px-2 py-1 bg-white hover:bg-pink-100 text-slate-700 border border-pink-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-md object-cover"
                  />
                ) : (
                  <span>{s.symbol}</span>
                )}
                <span>{s.name}</span>
                <Plus className="w-3 h-3 text-pink-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input Row */}
        <form onSubmit={handleAddItem} className="p-3 bg-pink-50 rounded-2xl border border-pink-200 space-y-2">
          <span className="text-xs text-slate-700 font-bold block">自己輸入新公仔名稱與表情：</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              maxLength={8}
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="w-16 px-2.5 py-1.5 text-center text-sm bg-white border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 font-bold shadow-xs"
              placeholder="符號"
            />
            <input
              type="text"
              required
              maxLength={40}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 text-slate-800 font-bold shadow-xs"
              placeholder="例如：波波小雲朵"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              加入
            </button>
          </div>
        </form>

        {/* Validation Banner */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-xs text-rose-700 font-bold" role="alert">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="w-1/3 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSaveAndApply}
            className="w-2/3 py-2.5 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl transition-all shadow-md shadow-pink-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>套用並開始配對 🌸</span>
          </button>
        </div>
      </div>
    </div>
  );
};
