import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, QrCode, Trophy, LogIn, LogOut } from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useFirebase } from '../contexts/FirebaseContext';

export type ActiveTab = 'flip' | 'link' | 'chemistry' | 'swipe' | 'fortune';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onQuickAction?: () => void;
  onOpenShare?: () => void;
  onOpenLeaderboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onQuickAction,
  onOpenShare,
  onOpenLeaderboard,
}) => {
  const [isMuted, setIsMuted] = useState(soundFx.getIsMuted());
  const { user, authReady, isAuthBusy, signInWithGoogle, signOutUser } = useFirebase();

  const handleToggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundFx.playClick();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-pink-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand title */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            soundFx.playClick();
            onSelectTab('flip');
          }}
          className="text-base sm:text-lg font-extrabold tracking-tight text-pink-600 whitespace-nowrap shrink-0 flex items-center gap-2 group"
        >
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-400 flex items-center justify-center text-white text-sm sm:text-base shadow-sm group-hover:scale-105 transition-transform">
            💖
          </span>
          <span className="tracking-wide">PairMaster · 奇蹟配對</span>
        </a>

        {/* Zone 2: Nav links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-bold">
          {(
            [
              ['flip', '翻牌記憶'],
              ['link', '連連看'],
              ['chemistry', '契合測算'],
              ['swipe', '心動卡牌'],
              ['fortune', '幸運籤卡'],
            ] as [ActiveTab, string][]
          ).map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => {
                soundFx.playClick();
                onSelectTab(tabKey);
              }}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded ${
                activeTab === tabKey
                  ? 'text-pink-600 border-b-2 border-pink-500 font-extrabold'
                  : 'text-slate-600 hover:text-pink-500'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onOpenLeaderboard();
              }}
              title="雲端榮譽榜"
              aria-label="雲端榮譽榜"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="hidden xl:inline">排行榜</span>
            </button>
          )}

          {onOpenShare && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onOpenShare();
              }}
              title="分享與短網址 QR Code"
              aria-label="分享與短網址"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <QrCode className="w-4 h-4 text-pink-500" />
              <span className="hidden xl:inline">分享</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleSound}
            title={isMuted ? '開啟遊戲音效' : '靜音'}
            aria-label={isMuted ? '開啟音效' : '靜音'}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
            )}
          </button>

          {authReady && (
            user ? (
              <div className="flex items-center gap-1 bg-pink-50/90 border border-pink-200 rounded-xl pl-1.5 pr-1 py-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '玩家'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-lg object-cover border border-pink-200"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-lg bg-pink-200 text-pink-700 text-[10px] font-black flex items-center justify-center">
                    {(user.displayName || '玩')[0]}
                  </span>
                )}
                <span className="hidden sm:inline text-[11px] font-bold text-slate-700 max-w-[72px] truncate">
                  {user.displayName || '已登入'}
                </span>
                <button
                  type="button"
                  disabled={isAuthBusy}
                  onClick={() => {
                    soundFx.playClick();
                    void signOutUser();
                  }}
                  title="登出雲端帳號"
                  aria-label="登出"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isAuthBusy}
                onClick={() => {
                  soundFx.playClick();
                  void signInWithGoogle();
                }}
                title="登入 Google 雲端同步戰績與公仔牌組"
                className="px-2.5 py-1.5 text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-pink-500" />
                <span className="hidden sm:inline">雲端登入</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              if (onQuickAction) {
                onQuickAction();
              } else {
                onSelectTab('flip');
              }
            }}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-xl transition-all shadow-md shadow-pink-200 whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">開局配對</span>
            <span className="sm:hidden">開局</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet nav drawer */}
      <div className="lg:hidden flex items-center justify-around px-2 py-1.5 border-t border-pink-100 bg-white/95 overflow-x-auto text-xs font-bold">
        {(
          [
            ['flip', '翻牌記憶'],
            ['link', '連連看'],
            ['chemistry', '契合測算'],
            ['swipe', '心動卡牌'],
            ['fortune', '幸運籤卡'],
          ] as [ActiveTab, string][]
        ).map(([tabKey, label]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => {
              soundFx.playClick();
              onSelectTab(tabKey);
            }}
            className={`px-2.5 py-1 whitespace-nowrap rounded-lg transition-colors ${
              activeTab === tabKey ? 'bg-pink-100 text-pink-700 font-extrabold' : 'text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
};
