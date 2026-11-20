import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundFx } from '../utils/audio';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          soundFx.playClick();
          void install();
        }}
        title="安裝為手機桌面 App（全螢幕暢玩）"
        className="p-1.5 sm:px-2.5 sm:py-1.5 text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
      >
        <Download className="w-4 h-4 text-pink-500" />
        <span className="hidden xl:inline">安裝 App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            setShowIOSGuide(true);
          }}
          title="加到 iPhone／iPad 主畫面全螢幕玩"
          aria-label="加到主畫面"
          className="p-1.5 sm:px-2.5 sm:py-1.5 text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
        >
          <Smartphone className="w-4 h-4 text-pink-500" />
          <span className="hidden xl:inline">加到主畫面</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setShowIOSGuide(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-pink-950/45 backdrop-blur-md p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white border-2 border-pink-300 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                <div className="flex items-center gap-2">
                  <img
                    src="/apple-touch-icon.png"
                    alt="PairMaster"
                    className="w-9 h-9 rounded-xl border border-pink-200 shadow-xs"
                  />
                  <div>
                    <h3 className="text-base font-black text-slate-900">加到主畫面 App</h3>
                    <p className="text-[11px] font-bold text-pink-500">全螢幕暢玩，唔會被 Safari 工具列遮住！</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="關閉說明"
                  className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2.5 text-xs font-bold text-slate-700">
                <li className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-pink-50/70 border border-pink-200">
                  <span className="w-6 h-6 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 font-black">1</span>
                  <span className="pt-0.5 flex items-center flex-wrap gap-1">
                    點擊 Safari 底部或右上角嘅 <Share className="w-4 h-4 text-sky-600 inline" /> <strong>「分享」</strong> 按鈕。
                  </span>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-pink-50/70 border border-pink-200">
                  <span className="w-6 h-6 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 font-black">2</span>
                  <span className="pt-0.5 flex items-center flex-wrap gap-1">
                    向下捲動，揀選 <PlusSquare className="w-4 h-4 text-pink-600 inline" /> <strong>「加入主畫面」</strong>。
                  </span>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-pink-50/70 border border-pink-200">
                  <span className="w-6 h-6 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 font-black">3</span>
                  <span className="pt-0.5">
                    點擊右上角 <strong>「新增」</strong>，桌面即刻多咗 PairMaster 圖示啦 💖
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 shadow-md cursor-pointer"
              >
                好呀，明白！
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
