import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode, Smartphone, ExternalLink, Link2 } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, appUrl }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const activeUrl = typeof window !== 'undefined' ? window.location.href : appUrl;

  useEffect(() => {
    if (isOpen && activeUrl) {
      QRCode.toDataURL(activeUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#be185d', // deep rose
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, activeUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    soundFx.playClick();
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-600 shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">分享與自訂簡單網址 🌸</h3>
              <span className="text-xs text-pink-500 font-mono font-bold">SHARE & CUSTOM SHORT URL</span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option 1: Instant QR Code Scan */}
        <div className="bg-pink-50/70 border border-pink-200 rounded-3xl p-4 flex flex-col sm:flex-row items-center gap-5">
          {qrDataUrl ? (
            <div className="p-2 bg-white rounded-2xl shadow-md border-2 border-pink-200 shrink-0">
              <img src={qrDataUrl} alt="掃描進入配對王國" className="w-32 h-32 block rounded-xl" />
            </div>
          ) : (
            <div className="w-32 h-32 bg-pink-100 rounded-2xl animate-pulse shrink-0" />
          )}

          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-xs font-black text-pink-600 flex items-center justify-center sm:justify-start gap-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>手機相機一掃即開（最方便）</span>
            </span>
            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              朋友唔需要手動輸入長網址，只要開啟手機相機掃描 QR Code，就可以即時進入遊戲！
            </p>
          </div>
        </div>

        {/* Current URL Copy */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-600 font-bold">目前專屬網址：</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={activeUrl}
              className="flex-1 px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-slate-700 font-mono truncate select-all focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製' : '複製網址'}</span>
            </button>
          </div>
        </div>

        {/* Short URL Guide */}
        <div className="p-4 rounded-3xl bg-pink-50/60 border border-pink-200 space-y-3">
          <div className="flex items-center gap-1.5 text-pink-600 text-xs font-black">
            <Link2 className="w-4 h-4" />
            <span>自訂好記的專屬短網址：</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-bold">
            你可以免費將上面呢串網址縮成好似 <span className="text-pink-600 font-mono">tinyurl.com/pair-yui</span> 咁簡單嘅網址：
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-pink-200">
              <div>
                <span className="text-slate-900 font-black block">TinyURL 自訂別名</span>
                <span className="text-[11px] text-pink-500 font-bold">自訂專屬單字（例如 tinyurl.com/pair-yui）</span>
              </div>
              <a
                href={`https://tinyurl.com/create.php?url=${encodeURIComponent(activeUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs text-white bg-pink-500 hover:bg-pink-600 rounded-xl font-bold flex items-center gap-1 shadow-xs"
              >
                <span>立即建立</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-pink-200">
              <div>
                <span className="text-slate-900 font-black block">Reurl.cc 縮網址</span>
                <span className="text-[11px] text-slate-500 font-bold">免註冊，秒速縮成極短英數網址</span>
              </div>
              <a
                href="https://reurl.cc/main/tw"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold flex items-center gap-1"
              >
                <span>前往縮網址</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="w-full py-2.5 text-xs font-black text-slate-600 bg-slate-100 hover:bg-pink-100 hover:text-pink-700 rounded-2xl transition-colors cursor-pointer"
        >
          返回遊戲 🌸
        </button>
      </div>
    </div>
  );
};
