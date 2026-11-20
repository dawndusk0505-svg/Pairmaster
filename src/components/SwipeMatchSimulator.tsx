import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Heart, X, Star, MessageCircle, Send, RotateCcw, MapPin, Sparkles, Trash2 } from 'lucide-react';
import { SWIPE_PROFILES, SwipeProfile } from '../data/socialAndFortune';
import { soundFx } from '../utils/audio';
import { useFirebase } from '../contexts/FirebaseContext';

interface Message {
  id: string;
  sender: 'user' | 'match';
  text: string;
  time: string;
}

function loadJsonFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateContextualReply(profile: SwipeProfile, userText: string, turnNumber: number): string {
  const choices = profile.replies[0]?.choices || [];
  const matchedChoice = choices.find((c) => c.text === userText);
  if (matchedChoice) {
    return matchedChoice.response;
  }

  const hobby = profile.interests[turnNumber % profile.interests.length] || '探索生活';
  const secondaryHobby = profile.interests[(turnNumber + 1) % profile.interests.length] || '美食';

  const multiTurnReplies = [
    `哈哈同感！我平時最鍾意就係「${hobby}」，身為 ${profile.mbti} 真係好期待同你多啲交流～ ✨`,
    `你講得好中呀！以我嘅 ${profile.zodiac} 直覺，我哋一定好啱傾，不如得閒一齊試下「${secondaryHobby}」？☕`,
    `係咪呀～做「${profile.occupation}」平時好少遇到咁同頻嘅人！你平時放假最鍾意做咩呀？🌸`,
    `多謝你同我傾計！同你聊天感覺好輕鬆，希望今日嘅 PairMaster 都可以帶俾你好多好運💖`,
  ];

  return multiTurnReplies[turnNumber % multiTurnReplies.length];
}

export const SwipeMatchSimulator: React.FC = () => {
  const { user } = useFirebase();
  const uidKey = user?.uid || 'guest';
  const matchesKey = `pairmaster_swipe_matches_v1_${uidKey}`;
  const chatsKey = `pairmaster_swipe_chats_v1_${uidKey}`;

  const [profiles, setProfiles] = useState<SwipeProfile[]>(SWIPE_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<SwipeProfile | null>(null);
  const [matchedList, setMatchedList] = useState<SwipeProfile[]>(() =>
    loadJsonFromStorage<SwipeProfile[]>(matchesKey, [])
  );
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<string, Message[]>>(() =>
    loadJsonFromStorage<Record<string, Message[]>>(chatsKey, {})
  );
  const [showChatModal, setShowChatModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Pointer drag state for real card swiping
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reload persisted matches/chats when account changes
  useEffect(() => {
    setMatchedList(loadJsonFromStorage<SwipeProfile[]>(matchesKey, []));
    setChatHistoryMap(loadJsonFromStorage<Record<string, Message[]>>(chatsKey, {}));
  }, [matchesKey, chatsKey]);

  // Persist matches & chats automatically
  useEffect(() => {
    try {
      localStorage.setItem(matchesKey, JSON.stringify(matchedList));
    } catch {
      // ignore storage quota errors
    }
  }, [matchesKey, matchedList]);

  useEffect(() => {
    try {
      localStorage.setItem(chatsKey, JSON.stringify(chatHistoryMap));
    } catch {
      // ignore storage quota errors
    }
  }, [chatsKey, chatHistoryMap]);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const currentProfile = profiles[currentIndex];
  const activeMessages = matchedProfile ? chatHistoryMap[matchedProfile.id] || [] : [];

  const handlePass = useCallback(() => {
    if (!currentProfile || swipeDirection) return;
    soundFx.playMismatch();
    setSwipeDirection('left');
    setDragOffset({ x: 0, y: 0 });
    scheduleTimeout(() => {
      setSwipeDirection(null);
      setCurrentIndex((prev) => prev + 1);
    }, 220);
  }, [currentProfile, swipeDirection, scheduleTimeout]);

  const handleLike = useCallback(
    (isSuper: boolean = false) => {
      if (!currentProfile || swipeDirection) return;
      soundFx.playMatchSuccess();
      setSwipeDirection(isSuper ? 'up' : 'right');
      setDragOffset({ x: 0, y: 0 });

      const profile = currentProfile;

      scheduleTimeout(() => {
        setSwipeDirection(null);
        setCurrentIndex((prev) => prev + 1);

        if (isSuper || Math.random() < 0.85) {
          soundFx.playVictory();
          setMatchedProfile(profile);
          setMatchedList((prev) => (prev.some((p) => p.id === profile.id) ? prev : [profile, ...prev]));

          try {
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#f472b6', '#fb7185', '#fbbf24', '#fbcfe8'],
            });
          } catch {
            // ignore
          }

          const initialReply = profile.replies[0]?.prompt || `嗨！很高興認識你！${profile.icebreaker}`;
          setChatHistoryMap((prev) => {
            if (prev[profile.id]?.length) return prev;
            return {
              ...prev,
              [profile.id]: [
                {
                  id: `m1_${profile.id}`,
                  sender: 'match',
                  text: initialReply,
                  time: '剛剛',
                },
              ],
            };
          });
        }
      }, 220);
    },
    [currentProfile, swipeDirection, scheduleTimeout]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showChatModal || matchedProfile || !currentProfile) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleLike(false);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleLike(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showChatModal, matchedProfile, currentProfile, handlePass, handleLike]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentProfile || swipeDirection) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    setDragOffset({
      x: e.clientX - dragStartRef.current.x,
      y: (e.clientY - dragStartRef.current.y) * 0.35,
    });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;

    if (dragOffset.x > 90) {
      handleLike(false);
    } else if (dragOffset.x < -90) {
      handlePass();
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleOpenChat = (profileToOpen?: SwipeProfile) => {
    soundFx.playClick();
    if (profileToOpen) {
      setMatchedProfile(profileToOpen);
    }
    setShowChatModal(true);
  };

  const handleSendMessage = (textToSend?: string) => {
    const raw = textToSend || inputText;
    const cleanText = raw.trim();
    if (!cleanText || !matchedProfile) return;

    const targetProfile = matchedProfile;
    const prevCount = (chatHistoryMap[targetProfile.id] || []).filter((m) => m.sender === 'user').length;
    soundFx.playClick();
    const newMsg: Message = {
      id: `${Date.now()}_u`,
      sender: 'user',
      text: cleanText,
      time: new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistoryMap((prev) => ({
      ...prev,
      [targetProfile.id]: [...(prev[targetProfile.id] || []), newMsg],
    }));
    setInputText('');

    scheduleTimeout(() => {
      const replyText = generateContextualReply(targetProfile, cleanText, prevCount);
      soundFx.playMatchSuccess(2);
      setChatHistoryMap((prev) => ({
        ...prev,
        [targetProfile.id]: [
          ...(prev[targetProfile.id] || []),
          {
            id: `${Date.now()}_m`,
            sender: 'match',
            text: replyText,
            time: new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      }));
    }, 520);
  };

  const handleResetDeck = () => {
    soundFx.playClick();
    setProfiles([...SWIPE_PROFILES].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setMatchedProfile(null);
    setShowChatModal(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleClearMatches = () => {
    soundFx.playClick();
    setMatchedList([]);
    setChatHistoryMap({});
    setMatchedProfile(null);
    setShowChatModal(false);
  };

  const cardStyle: React.CSSProperties =
    isDragging || dragOffset.x !== 0
      ? {
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05}deg)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }
      : {};

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Top Banner */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-pink-600 tracking-tight">心動卡片配對 💖</h2>
        <p className="text-xs text-slate-500 font-bold">
          左右拖曳卡片或點擊按鈕探索心靈夥伴（配對與對話自動保存）
        </p>
      </div>

      {/* Matched Friends Quick Strip */}
      {matchedList.length > 0 && (
        <div className="bg-white/85 border border-pink-200 rounded-2xl p-3 space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-pink-600">
              💌 已配對心動好友 ({matchedList.length})
            </span>
            <button
              type="button"
              onClick={handleClearMatches}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 cursor-pointer"
              title="清空已配對好友與對話紀錄"
            >
              <Trash2 className="w-3 h-3" />
              <span>清空紀錄</span>
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {matchedList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleOpenChat(p)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors shrink-0 cursor-pointer"
              >
                <span className="text-base">{p.avatarEmoji}</span>
                <span className="text-xs font-bold text-slate-700">{p.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card Swipe Canvas */}
      <div className="relative h-[470px] w-full">
        {currentProfile ? (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={cardStyle}
            className={`absolute inset-0 bg-white border-2 border-pink-200/90 rounded-3xl p-5 sm:p-6 shadow-xl shadow-pink-100 flex flex-col justify-between select-none touch-pan-y cursor-grab active:cursor-grabbing ${
              !isDragging ? 'transition-all duration-200' : ''
            } ${
              swipeDirection === 'left'
                ? '-translate-x-full rotate-[-12deg] opacity-0'
                : swipeDirection === 'right'
                ? 'translate-x-full rotate-[12deg] opacity-0'
                : swipeDirection === 'up'
                ? '-translate-y-full opacity-0'
                : ''
            }`}
          >
            {dragOffset.x > 40 && (
              <div className="absolute top-6 left-6 z-20 px-3 py-1 border-2 border-pink-500 text-pink-600 font-black text-sm rounded-xl rotate-[-12deg] bg-white/90 pointer-events-none">
                LIKE 💖
              </div>
            )}
            {dragOffset.x < -40 && (
              <div className="absolute top-6 right-6 z-20 px-3 py-1 border-2 border-slate-400 text-slate-500 font-black text-sm rounded-xl rotate-[12deg] bg-white/90 pointer-events-none">
                PASS ✕
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-xl font-black text-slate-900 truncate">{currentProfile.name}</h3>
                  <span className="text-base text-pink-500 font-bold font-mono shrink-0">{currentProfile.age} 歲</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-pink-600 font-black shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>{currentProfile.matchScore}% 契合</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mt-1">
                <span>{currentProfile.zodiac}</span>
                <span aria-hidden="true">·</span>
                <span>{currentProfile.mbti}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-pink-500" />
                  <span>{currentProfile.distanceKm} km</span>
                </span>
              </div>
            </div>

            <div className="my-auto py-2">
              <div className="w-full aspect-[4/3] rounded-3xl bg-gradient-to-br from-pink-100/80 via-rose-50 to-pink-50 border border-pink-200 flex flex-col items-center justify-center p-5 text-center space-y-2.5 relative overflow-hidden shadow-inner">
                <div className="w-20 h-20 rounded-3xl bg-white border-2 border-pink-300 flex items-center justify-center text-4xl shadow-md shadow-pink-100">
                  {currentProfile.avatarEmoji}
                </div>
                <div>
                  <span className="text-xs text-pink-600 font-black block">{currentProfile.occupation}</span>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-bold italic line-clamp-3">
                    「{currentProfile.bio}」
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs text-pink-700 font-bold">
                {currentProfile.interests.map((tag) => `#${tag}`).join(' · ')}
              </p>

              <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-200 text-xs text-slate-700 font-bold">
                <span className="text-pink-600 font-black block mb-0.5">破冰話題：</span>
                <span>{currentProfile.icebreaker}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white border-2 border-pink-200 rounded-3xl p-8 shadow-xl shadow-pink-100 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-pink-100 border border-pink-200 flex items-center justify-center text-3xl shadow-xs">
              💌
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">這一輪的卡片已瀏覽完畢～</h3>
              <p className="text-xs text-slate-500 font-bold">
                已配對 {matchedList.length} 位好友，可點擊上方頭像聊天或重新洗牌！
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDeck}
              className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl transition-all shadow-md shadow-pink-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新隨機洗牌</span>
            </button>
          </div>
        )}
      </div>

      {/* Swipe Action Buttons */}
      {currentProfile && (
        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={handlePass}
            title="略過 (Pass / 鍵盤 ←)"
            aria-label="略過"
            className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => handleLike(true)}
            title="超級心動 (Super Like / 鍵盤 ↑)"
            aria-label="超級心動"
            className="w-12 h-12 rounded-full bg-white border-2 border-amber-300 hover:border-amber-400 hover:bg-amber-50 text-amber-500 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Star className="w-5 h-5 fill-amber-400 stroke-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => handleLike(false)}
            title="心動喜歡 (Like / 鍵盤 →)"
            aria-label="心動喜歡"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-300 transition-all active:scale-95 cursor-pointer"
          >
            <Heart className="w-6 h-6 fill-white" />
          </button>
        </div>
      )}

      {/* Mutual Match Modal */}
      {matchedProfile && !showChatModal && (
        <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <span className="text-xs font-black text-pink-600 tracking-wider">
              IT'S A MUTUAL MATCH! 🌸
            </span>

            <div className="space-y-1">
              <h2 className="text-3xl font-black text-pink-600 tracking-tight">
                恭喜配對成功！
              </h2>
              <p className="text-xs text-slate-600 font-bold">
                你和 {matchedProfile.name} 互相心動了彼此
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="w-20 h-20 rounded-3xl bg-pink-100 border-2 border-pink-300 flex items-center justify-center text-3xl shadow-sm">
                🌸
              </div>
              <div className="text-rose-500 text-2xl font-bold animate-pulse">
                ♥
              </div>
              <div className="w-20 h-20 rounded-3xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-3xl shadow-sm">
                {matchedProfile.avatarEmoji}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleOpenChat()}
                className="w-full py-3 px-4 text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl transition-all shadow-md shadow-pink-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>立即開啟對話破冰 💬</span>
              </button>

              <button
                type="button"
                onClick={() => setMatchedProfile(null)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-pink-600 transition-colors cursor-pointer"
              >
                繼續瀏覽其他卡片
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Live Chat Modal */}
      {showChatModal && matchedProfile && (
        <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-pink-300 rounded-3xl max-w-md w-full h-[520px] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-pink-100 bg-pink-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-pink-200 flex items-center justify-center text-xl shadow-xs">
                  {matchedProfile.avatarEmoji}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{matchedProfile.name}</h4>
                  <span className="text-[11px] text-pink-600 font-bold">
                    在線 · {matchedProfile.matchScore}% 默契值
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowChatModal(false);
                  setMatchedProfile(null);
                }}
                aria-label="關閉對話"
                className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FFF9FA]">
              {activeMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed font-bold shadow-xs ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 rounded-tl-none border border-pink-200'
                    }`}
                  >
                    <p>{m.text}</p>
                    <span
                      className={`text-[9px] block text-right mt-1 ${
                        m.sender === 'user' ? 'text-pink-100' : 'text-slate-400'
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {matchedProfile.replies[0]?.choices && (
              <div className="px-4 py-2 bg-pink-50/80 border-t border-pink-100 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-pink-500 font-bold shrink-0">快捷回應：</span>
                {matchedProfile.replies[0].choices.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(c.text)}
                    className="text-[11px] font-bold px-3 py-1 rounded-xl bg-white hover:bg-pink-100 text-pink-700 border border-pink-200 whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                  >
                    {c.text}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-pink-100 bg-white flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="發送破冰訊息..."
                className="flex-1 px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                aria-label="發送訊息"
                className="p-2 text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
