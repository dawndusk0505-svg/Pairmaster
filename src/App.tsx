import React, { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { FlipMatchGame } from './components/FlipMatchGame';
import { LinkMatchGame } from './components/LinkMatchGame';
import { CompatibilityMatcher } from './components/CompatibilityMatcher';
import { SwipeMatchSimulator } from './components/SwipeMatchSimulator';
import { DailyLuckyPair } from './components/DailyLuckyPair';
import { ShareModal } from './components/ShareModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { Sparkles, Grid, Link as LinkIcon, Compass, Heart, Sun, X } from 'lucide-react';
import { soundFx } from './utils/audio';
import { MatchTheme } from './data/matchThemes';
import matchBannerImg from './assets/images/match_banner_realm_1794493181788.jpg';

function loadSavedCustomTheme(): MatchTheme | null {
  try {
    const saved = localStorage.getItem('pairmaster_custom_theme_v2');
    if (saved) {
      const parsed = JSON.parse(saved) as MatchTheme;
      if (parsed?.items?.length >= 6) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function AppContent() {
  const { user, cloudCustomTheme, saveCustomTheme, cloudError, clearCloudError } = useFirebase();
  const [activeTab, setActiveTab] = useState<ActiveTab>('flip');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'global' | 'mine'>('global');
  const [localCustomTheme, setLocalCustomTheme] = useState<MatchTheme | null>(loadSavedCustomTheme);

  const openLeaderboard = (tab: 'global' | 'mine' = 'global') => {
    setLeaderboardTab(tab);
    setIsLeaderboardOpen(true);
  };

  const effectiveCustomTheme = cloudCustomTheme || localCustomTheme;

  const handleUpdateCustomTheme = (nextTheme: MatchTheme) => {
    setLocalCustomTheme(nextTheme);
    if (user && user.emailVerified) {
      void saveCustomTheme(nextTheme);
    }
  };

  const handleSelectAndScroll = (tab: ActiveTab, shouldScroll = false) => {
    setActiveTab(tab);
    if (shouldScroll) {
      const el = document.getElementById('game-workspace');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8] text-slate-800 flex flex-col font-sans selection:bg-pink-200 selection:text-pink-900">
      {/* 3-Zone Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => handleSelectAndScroll(tab, false)}
        onQuickAction={() => handleSelectAndScroll('flip', true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenLeaderboard={() => openLeaderboard('global')}
      />

      {/* Cloud Error / Quota Notice Banner */}
      {cloudError && (
        <div
          role="alert"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 font-bold flex items-center justify-center gap-3"
        >
          <span>☁️ {cloudError}</span>
          <button
            type="button"
            onClick={clearCloudError}
            aria-label="關閉提示"
            className="p-0.5 rounded hover:bg-amber-200/60 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Share & Custom Short URL Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        appUrl="https://ais-pre-krvumhfjffb6iagndkdupo-289030953393.europe-west1.run.app"
      />

      {/* Cloud Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        initialTab={leaderboardTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-14">
        {/* Hero Showcase Section with Pastel Pink Theme */}
        <section className="relative overflow-hidden border-b border-pink-100 bg-gradient-to-b from-pink-100/70 via-rose-50/50 to-[#FFF5F8] py-5 sm:py-6 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Title and Subtitle */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-pink-600 tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SWEET PAIRING & MAGIC HEARTS</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight text-balance leading-tight">
                探索每一種甜蜜的{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-pink-400">
                  心靈配對
                </span>{' '}
                🌸
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed text-balance font-medium">
                從鍛鍊腦力的粉萌翻牌與連連看，到洞悉命運軌跡的浪漫星盤與 MBTI 契合度合盤；每一次輕觸，都充滿滿滿少女心！
              </p>

              {/* Mode Quick Navigation Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    handleSelectAndScroll('flip', true);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                    activeTab === 'flip'
                      ? 'bg-white border-pink-400 ring-2 ring-pink-300 shadow-pink-100 shadow-md'
                      : 'bg-white/70 border-pink-100 hover:border-pink-300 hover:bg-white'
                  }`}
                >
                  <Grid className={`w-4 h-4 mb-1.5 ${activeTab === 'flip' ? 'text-pink-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800 block">翻牌記憶</span>
                  <span className="text-[10px] text-pink-400 font-medium">糖果精靈登場</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    handleSelectAndScroll('link', true);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                    activeTab === 'link'
                      ? 'bg-white border-pink-400 ring-2 ring-pink-300 shadow-pink-100 shadow-md'
                      : 'bg-white/70 border-pink-100 hover:border-pink-300 hover:bg-white'
                  }`}
                >
                  <LinkIcon className={`w-4 h-4 mb-1.5 ${activeTab === 'link' ? 'text-pink-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800 block">連連看</span>
                  <span className="text-[10px] text-pink-400 font-medium">粉彩連線消除</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    handleSelectAndScroll('chemistry', true);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                    activeTab === 'chemistry'
                      ? 'bg-white border-pink-400 ring-2 ring-pink-300 shadow-pink-100 shadow-md'
                      : 'bg-white/70 border-pink-100 hover:border-pink-300 hover:bg-white'
                  }`}
                >
                  <Compass className={`w-4 h-4 mb-1.5 ${activeTab === 'chemistry' ? 'text-pink-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800 block">契合測算</span>
                  <span className="text-[10px] text-pink-400 font-medium">星盤心靈合盤</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    handleSelectAndScroll('swipe', true);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                    activeTab === 'swipe'
                      ? 'bg-white border-pink-400 ring-2 ring-pink-300 shadow-pink-100 shadow-md'
                      : 'bg-white/70 border-pink-100 hover:border-pink-300 hover:bg-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 mb-1.5 ${activeTab === 'swipe' ? 'text-rose-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800 block">心動卡牌</span>
                  <span className="text-[10px] text-pink-400 font-medium">滑卡甜蜜破冰</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    handleSelectAndScroll('fortune', true);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 shadow-xs ${
                    activeTab === 'fortune'
                      ? 'bg-white border-pink-400 ring-2 ring-pink-300 shadow-pink-100 shadow-md'
                      : 'bg-white/70 border-pink-100 hover:border-pink-300 hover:bg-white'
                  }`}
                >
                  <Sun className={`w-4 h-4 mb-1.5 ${activeTab === 'fortune' ? 'text-pink-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800 block">幸運籤卡</span>
                  <span className="text-[10px] text-pink-400 font-medium">每日色彩美食</span>
                </button>
              </div>
            </div>

            {/* Right Column: Visual Game Banner */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border-2 border-pink-200/80 shadow-xl shadow-pink-100 group">
                <img
                  src={matchBannerImg}
                  alt="配對王國概念繪卷"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover aspect-[16/9] group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pink-900/45 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white drop-shadow-md">
                  <span className="font-bold">✨ 配對王國 · 糖果萌星登場</span>
                  <span className="text-[11px] font-bold opacity-95">即點即玩 →</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Interactive Mode View */}
        <section id="game-workspace" className="mt-2 scroll-mt-16">
          {activeTab === 'flip' && (
            <FlipMatchGame
              customTheme={effectiveCustomTheme}
              onUpdateCustomTheme={handleUpdateCustomTheme}
              onOpenMyRecords={() => openLeaderboard('mine')}
            />
          )}
          {activeTab === 'link' && (
            <LinkMatchGame
              customTheme={effectiveCustomTheme}
              onUpdateCustomTheme={handleUpdateCustomTheme}
              onOpenMyRecords={() => openLeaderboard('mine')}
            />
          )}
          {activeTab === 'chemistry' && <CompatibilityMatcher />}
          {activeTab === 'swipe' && <SwipeMatchSimulator />}
          {activeTab === 'fortune' && <DailyLuckyPair />}
        </section>
      </main>

      {/* Minimalist Pastel Pink Footer */}
      <footer className="border-t border-pink-200/70 py-6 px-4 bg-white/70 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-pink-600 font-bold">PairMaster</span>
            <span aria-hidden="true">·</span>
            <span>粉系萌萌配對平台</span>
            <span aria-hidden="true">·</span>
            <span>雲端即時同步版</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hover:text-pink-600 transition-colors">Web Audio 萌趣合成音效</span>
            <span aria-hidden="true">·</span>
            <span>© 2026 PairMaster</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
