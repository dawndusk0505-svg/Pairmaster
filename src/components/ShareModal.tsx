import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode, Smartphone, ExternalLink, Link2, Megaphone, ShieldCheck } from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useFirebase } from '../contexts/FirebaseContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

const CUSTOM_SHARE_URL_KEY = 'pairmaster_custom_share_url_v1';

function getCleanCurrentUrl(fallbackUrl: string): string {
  if (typeof window === 'undefined') return fallbackUrl;
  const { origin, pathname } = window.location;
  const cleanPath = pathname && pathname !== '/' ? pathname.replace(/\/+$/, '') : '';
  return `${origin}${cleanPath}`;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, appUrl }) => {
  const { isAdmin } = useFirebase();
  const [activeTab, setActiveTab] = useState<'url' | 'promo'>('url');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [customShortUrl, setCustomShortUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(CUSTOM_SHARE_URL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [shortUrlDraft, setShortUrlDraft] = useState<string>(customShortUrl);
  const [shortUrlSavedToast, setShortUrlSavedToast] = useState(false);

  const cleanCurrentUrl = getCleanCurrentUrl(appUrl);
  const activeUrl = customShortUrl.trim() || cleanCurrentUrl;

  useEffect(() => {
    if (!isAdmin && activeTab === 'promo') {
      setActiveTab('url');
    }
  }, [isAdmin, activeTab]);

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

  const copyText = async (key: string, text: string) => {
    soundFx.playClick();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleSaveCustomShortUrl = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    const trimmed = shortUrlDraft.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      return;
    }
    setCustomShortUrl(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(CUSTOM_SHARE_URL_KEY, trimmed);
      } else {
        localStorage.removeItem(CUSTOM_SHARE_URL_KEY);
      }
    } catch {
      // ignore
    }
    setShortUrlSavedToast(true);
    setTimeout(() => setShortUrlSavedToast(false), 2000);
  };

  const handleResetShortUrl = () => {
    soundFx.playClick();
    setShortUrlDraft('');
    setCustomShortUrl('');
    try {
      localStorage.removeItem(CUSTOM_SHARE_URL_KEY);
    } catch {
      // ignore
    }
  };

  const isLongCloudRunUrl = cleanCurrentUrl.includes('.run.app') && !customShortUrl.trim();

  const threadsShortCopy = `整咗個超粉嫩療癒嘅免費網頁遊戲王國 🌸【PairMaster · 奇蹟配對王國】
免下載即點即玩！一個網頁玩齊 7 款配對街機遊戲 ＋ 36 張糖果精靈＆魔法用具閃卡圖鑑牆 🃏🔗🫧🪄🧁🏰⚔️

✨ 系統仲有 3 大互動工具 ＆ 跨裝置雲端榜：
💞 MBTI × 星座契合度合盤（可儲存自己檔案幫朋友測＋下載官方合盤圖卡！）
💘 心動滑卡破冰（真實左右滑動＋保留好友聊天室紀錄）
☀️ 每日開運幸運籤卡盲盒 ＋ 專屬精靈頭像＆7大遊戲雲端排行榜

🎁 每日全服置頂特別企劃（每日各精選 1 則 · 午夜自動撤下）：
🎂【置頂生日祝福欄】七彩閃燈主角框 ＋ 主角寫真放大 ＋ 全服送祝福＆即播《Happy Birthday》生日歌！
💌【每日表白告示板】可匿名「唔知邊個(unknown)」＋ 附帶紀念相片，幫你全服置頂傳情 🤫

立即開玩（手機可加到主畫面變 App）👇
${activeUrl}
#PairMaster #奇蹟配對王國 #MBTI配對 #星座合盤 #生日祝福 #表白告示板 #香港小遊戲`;

  const fbIgFullCopy = `🌸 歡迎嚟到【PairMaster · 奇蹟配對王國】💖
一個網頁免費免下載（仲支援手機「加到主畫面」變獨立 App 📱）玩齊「糖果遊戲廳 × 星幣圖鑑牆 × 心靈配對工具 × 每日置頂告示板」：

🎮 七大王國街機遊戲（每局賺取「王國星幣」＋ 支援雲端排行榜＆防偷看暫停）：
🃏 翻牌記憶大戰：25 位精靈 × 11 款精靈用具與水果化身（支援每日同盤挑戰、冰凍／透視道具、自訂相片主題！）
🔗 糖果連連看：兩轉彎極速連線（輕鬆 6×4 / 標準 8×6 / 大師 10×6 全盤挑戰）
🫧 合成大精靈：物理掉落進化罐，兩隻撞埋進化衝 SSR 星願蠑螈！
🪄 命定 CP 疊疊消：層疊壓牌配對精靈與專屬用具（甜蜜 6 組 / 熱戀 9 組 / 全王國 11 組）
🧁 甜品輸送帶：45 秒極速出餐，湊滿 5 連擊啟動 🔥 FEVER ×3 狂飆！
🏰 百層爬塔大冒險：迷霧層、CP 層、Boss 洗牌層 ＋ 過關任選王國祝福！
⚔️ 同盤好友 PK 賽：同種子 60 秒限時對戰，複製戰書連結約閨蜜／情侶同場搶分！

✨ 星幣精靈閃卡圖鑑牆（36 閃卡 ＋ 11 組 CP 雙星徽章）：
🏆 儲「王國星幣」即可 60 星幣扭蛋盲盒抽卡／80 星幣指定解鎖心儀精靈，仲可以喺個人檔案換成專屬遊戲頭像！

🧭 3 大心靈契合 ＆ 互動工具：
💞 MBTI × 星座契合度測算：可儲存個人檔案方便幫朋友測，一鍵下載精美「官方合盤報告 PNG 圖卡」分享！
💘 心動滑卡破冰：真實左右滑卡配對 ＋ 保留多輪好友聊天紀錄
☀️ 每日幸運籤卡：每日開運顏色、幸運美食與精靈能量盲盒

🎁 每日全服置頂特別企劃（每日限定各 1 則 · 過午夜 12 點自動撤下）：
━━━━━━━━━━━━
🎂【生日祝福欄示範】（七彩閃燈主角框 · 附主角寫真放大 ＋ 全服送祝福計數 ＋ 生日快樂歌！）
👑 祝「小櫻」生日快樂！｜來自：糖果好友團
💬「祝今日全場主角生日快樂！願你日日甜美開心，場場破紀錄！🎈💖」
━━━━━━━━━━━━
💌【表白告示板示範】（每日限定 1 則 · 可實名或匿名 ＋ 附紀念相片放大 ＋ 全服應援！）
💕 致：成日同我一齊玩配對嘅你｜告白人：唔知邊個(unknown)
💬「其實每次同你測 MBTI 同星座合盤我都偷偷 cap 低咗圖，好鍾意同你一齊玩嘅感覺 💕🌹」
━━━━━━━━━━━━

想幫朋友預約專屬生日置頂／投稿今日表白，可以直接喺首頁按「預約生日／投稿表白」或 DM 我排期呀！💌
即點即玩 👉 ${activeUrl}`;

  const effectiveTab = isAdmin ? activeTab : 'url';

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-600 shadow-xs">
              {effectiveTab === 'url' ? <QrCode className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isAdmin ? '分享與社群宣傳包 🌸' : '分享專屬網址與 QR 🌸'}
              </h3>
              <span className="text-xs text-pink-500 font-mono font-bold">
                {isAdmin ? 'SHARE, QR & SOCIAL PROMO' : 'SHARE & QR CODE'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="關閉分享視窗"
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs (Promo Copy strictly visible to Admins only) */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-pink-100/70 rounded-2xl border border-pink-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab('url');
              }}
              className={`py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                effectiveTab === 'url'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>專屬網址與 QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab('promo');
              }}
              className={`py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                effectiveTab === 'promo'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>FB/IG/Threads 文案</span>
            </button>
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {effectiveTab === 'url' ? (
            <>
              {/* Option 1: Instant QR Code Scan */}
              <div className="bg-pink-50/70 border border-pink-200 rounded-3xl p-4 flex flex-col sm:flex-row items-center gap-5">
                {qrDataUrl ? (
                  <div className="p-2 bg-white rounded-2xl shadow-md border-2 border-pink-200 shrink-0">
                    <img
                      src={qrDataUrl}
                      alt="掃描進入配對王國"
                      data-allow-save="true"
                      className="w-32 h-32 block rounded-xl"
                    />
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
                  {customShortUrl.trim() && (
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black">
                      ✅ 已自動套用你設定嘅短網址
                    </span>
                  )}
                </div>
              </div>

              {/* Current URL Copy */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-slate-600 font-bold">
                    {customShortUrl.trim() ? '目前套用嘅短網址：' : '目前網站預設網址：'}
                  </label>
                  {customShortUrl.trim() && (
                    <button
                      type="button"
                      onClick={handleResetShortUrl}
                      className="text-[11px] font-black text-rose-500 hover:underline cursor-pointer"
                    >
                      還原預設網址
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeUrl}
                    className="flex-1 px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-slate-700 font-mono truncate select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void copyText('url', activeUrl)}
                    className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95"
                  >
                    {copiedKey === 'url' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'url' ? '已複製' : '複製網址'}</span>
                  </button>
                </div>
                {isLongCloudRunUrl && (
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    💡 預設網址之所以比較長，係因為系統目前偵測到平台自動分配嘅雲端預覽域名（含專案編號）。如果你已經用開 <span className="font-mono text-pink-600">pages.dev</span> 或縮好短網址，可以直接喺下面貼上並儲存！
                  </p>
                )}
              </div>

              {/* Custom Short URL Binding + Shortener Links */}
              <div className="p-4 rounded-3xl bg-pink-50/60 border border-pink-200 space-y-3">
                <div className="flex items-center gap-1.5 text-pink-600 text-xs font-black">
                  <Link2 className="w-4 h-4" />
                  <span>設定專屬短網址（同步更新 QR Code ＆ 宣傳文案）：</span>
                </div>

                <form onSubmit={handleSaveCustomShortUrl} className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="url"
                    value={shortUrlDraft}
                    onChange={(e) => setShortUrlDraft(e.target.value)}
                    placeholder="貼上你的 pages.dev 或 tinyurl 短網址"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-pink-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-black text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors shrink-0 cursor-pointer"
                  >
                    {shortUrlSavedToast ? '已套用 ✓' : '套用'}
                  </button>
                </form>

                <p className="text-xs text-slate-600 leading-relaxed font-bold">
                  未有短網址？可以用下面免費工具將預設網址縮成好似{' '}
                  <span className="text-pink-600 font-mono">tinyurl.com/pair-kingdom</span> 咁簡短好記：
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-pink-200">
                    <div>
                      <span className="text-slate-900 font-black block">TinyURL 自訂別名</span>
                      <span className="text-[11px] text-pink-500 font-bold">
                        自訂專屬英文短網址（最推薦貼文使用）
                      </span>
                    </div>
                    <a
                      href={`https://tinyurl.com/create.php?url=${encodeURIComponent(cleanCurrentUrl)}`}
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
                      <span className="text-[11px] text-slate-500 font-bold">
                        免註冊，秒速縮成極短英數網址
                      </span>
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
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-black text-amber-800">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>管理員專用宣傳文案（一般玩家及訪客唔會見到此分頁）</span>
              </div>

              {/* Threads / IG Story Copy */}
              <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-pink-700">
                    🧵 Threads ／ IG 精簡吸睛版（含生日、表白、MBTI）
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyText('threads', threadsShortCopy)}
                    className="px-2.5 py-1 text-[11px] font-black text-white bg-pink-500 hover:bg-pink-600 rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'threads' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>一鍵複製</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] text-slate-700 font-sans whitespace-pre-wrap bg-white border border-pink-100 rounded-xl p-3 leading-relaxed">
                  {threadsShortCopy}
                </pre>
              </div>

              {/* FB / IG Detailed Post with Demo Examples */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-rose-700">
                    📘 FB ／ IG 完整介紹版（連生日＆表白示範例子）
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyText('fb', fbIgFullCopy)}
                    className="px-2.5 py-1 text-[11px] font-black text-white bg-rose-500 hover:bg-rose-600 rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'fb' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>一鍵複製</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] text-slate-700 font-sans whitespace-pre-wrap bg-white border border-rose-100 rounded-xl p-3 leading-relaxed">
                  {fbIgFullCopy}
                </pre>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="w-full py-2.5 text-xs font-black text-slate-600 bg-slate-100 hover:bg-pink-100 hover:text-pink-700 rounded-2xl transition-colors cursor-pointer shrink-0"
        >
          返回遊戲 🌸
        </button>
      </div>
    </div>
  );
};
