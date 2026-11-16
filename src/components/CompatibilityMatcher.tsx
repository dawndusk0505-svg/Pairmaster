import React, { useState } from 'react';
import { Sparkles, Heart, Copy, Check, Compass, ArrowLeftRight, Dices, HelpCircle, BookmarkPlus, Trash2, Cloud, LogIn } from 'lucide-react';
import { MBTI_TYPES, MBTI_TYPE_INFO } from '../data/socialAndFortune';
import { calculateCompatibility, PersonData, CompatibilityResult, getZodiacFromDate } from '../utils/compatibilityCalc';
import { MbtiFinderModal } from './MbtiFinderModal';
import { soundFx } from '../utils/audio';
import { useFirebase } from '../contexts/FirebaseContext';
import constellationImg from '../assets/images/couple_destiny_constellation_1794493181382.jpg';

const SAMPLE_NAMES = ['子晴', '柏翰', '芷妍', '宇軒', '思穎', '承佑', '沛恩', '浩然'];
const RELATION_LABELS: Record<'love' | 'friend' | 'work' | 'creative', string> = {
  love: '心動戀愛',
  friend: '靈魂知己',
  work: '合夥共創',
  creative: '靈感同盟',
};

export const CompatibilityMatcher: React.FC = () => {
  const [personA, setPersonA] = useState<PersonData>({
    name: '林語晨',
    birthDate: '1998-05-18',
    mbti: 'INFJ',
    relationType: 'love',
  });

  const [personB, setPersonB] = useState<PersonData>({
    name: '陳逸飛',
    birthDate: '1997-10-24',
    mbti: 'ENFP',
    relationType: 'love',
  });

  const [relationType, setRelationType] = useState<'love' | 'friend' | 'work' | 'creative'>('love');
  const [result, setResult] = useState<CompatibilityResult>(() =>
    calculateCompatibility(
      { name: '林語晨', birthDate: '1998-05-18', mbti: 'INFJ', relationType: 'love' },
      { name: '陳逸飛', birthDate: '1997-10-24', mbti: 'ENFP', relationType: 'love' }
    )
  );

  const [copied, setCopied] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [mbtiModalOpen, setMbtiModalOpen] = useState(false);
  const [mbtiTargetSide, setMbtiTargetSide] = useState<'A' | 'B'>('A');

  const { user, compatibilityLogs, saveCompatibilityLog, deleteCompatibilityLog, signInWithGoogle } = useFirebase();

  const recompute = (
    nextA: PersonData = personA,
    nextB: PersonData = personB,
    nextRel: 'love' | 'friend' | 'work' | 'creative' = relationType
  ) => {
    const calculated = calculateCompatibility(
      { ...nextA, relationType: nextRel },
      { ...nextB, relationType: nextRel }
    );
    setResult(calculated);
  };

  const handleCompute = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playPowerUp();
    recompute();
  };

  const handleRelationChange = (rel: 'love' | 'friend' | 'work' | 'creative') => {
    soundFx.playClick();
    setRelationType(rel);
    recompute(personA, personB, rel);
  };

  const handleSwapPersons = () => {
    soundFx.playCardFlip();
    const nextA = { ...personB, relationType };
    const nextB = { ...personA, relationType };
    setPersonA(nextA);
    setPersonB(nextB);
    recompute(nextA, nextB, relationType);
  };

  const handleRandomPair = () => {
    soundFx.playPowerUp();
    const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const randomDate = () => {
      const y = 1992 + Math.floor(Math.random() * 13);
      const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
      const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const nameA = pickRandom(SAMPLE_NAMES);
    let nameB = pickRandom(SAMPLE_NAMES);
    if (nameB === nameA) nameB = '心怡';

    const nextA: PersonData = { name: nameA, birthDate: randomDate(), mbti: pickRandom(MBTI_TYPES), relationType };
    const nextB: PersonData = { name: nameB, birthDate: randomDate(), mbti: pickRandom(MBTI_TYPES), relationType };
    setPersonA(nextA);
    setPersonB(nextB);
    recompute(nextA, nextB, relationType);
  };

  const handleOpenMbtiFinder = (side: 'A' | 'B') => {
    soundFx.playClick();
    setMbtiTargetSide(side);
    setMbtiModalOpen(true);
  };

  const handleApplyMbtiFromModal = (side: 'A' | 'B', mbti: string) => {
    if (side === 'A') {
      const nextA = { ...personA, mbti };
      setPersonA(nextA);
      recompute(nextA, personB, relationType);
    } else {
      const nextB = { ...personB, mbti };
      setPersonB(nextB);
      recompute(personA, nextB, relationType);
    }
  };

  const handleCopyCard = () => {
    soundFx.playClick();
    const text = `🌸【PairMaster · 靈魂契合度測算報告】🌸\n` +
      `搭檔：${result.personA.name} (${result.personA.zodiac} · ${result.personA.mbti}) × ${result.personB.name} (${result.personB.zodiac} · ${result.personB.mbti})\n` +
      `綜合契合度：${result.overallScore}% · ${result.verdict}\n` +
      `${result.dimensionLabels.telepathy.split(' ')[0]}：${result.dimensions.telepathy}% | ${result.dimensionLabels.spark.split(' ')[0]}：${result.dimensions.spark}%\n` +
      `${result.dimensionLabels.values.split(' ')[0]}：${result.dimensions.values}% | ${result.dimensionLabels.endurance.split(' ')[0]}：${result.dimensions.endurance}%\n` +
      `籤詩：${result.destinyQuote}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToCloud = async () => {
    soundFx.playClick();
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!user.emailVerified || isSavingLog) return;
    setIsSavingLog(true);
    try {
      await saveCompatibilityLog(result, relationType);
      soundFx.playVictory();
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2500);
    } finally {
      setIsSavingLog(false);
    }
  };

  const infoA = MBTI_TYPE_INFO[personA.mbti];
  const infoB = MBTI_TYPE_INFO[personB.mbti];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Introduction Card */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-pink-200 bg-gradient-to-r from-pink-100 via-rose-50 to-pink-50 p-6 sm:p-8 shadow-md shadow-pink-100">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-bold text-pink-600 tracking-wider">
            🌸 星盤元素 × 生肖合盤 × MBTI 雙人深測
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            雙人契合度 · 星盤與心理深測
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            融合西方黃道十二宮四象元素、東方生肖合盤與 MBTI 認知功能交互。唔知自己或對方係邊種 MBTI？可以隨時用旁邊嘅「30秒速測」搵出嚟！
          </p>
        </div>
      </div>

      {/* Input Form Deck */}
      <form onSubmit={handleCompute} className="bg-white/90 border-2 border-pink-200/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl shadow-pink-100/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-pink-100 pb-4">
          <label className="text-sm font-bold text-pink-700 flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span>測算關係面向</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-pink-50 rounded-2xl border border-pink-200">
            {(
              [
                { id: 'love', label: '心動戀愛' },
                { id: 'friend', label: '靈魂知己' },
                { id: 'work', label: '合夥共創' },
                { id: 'creative', label: '靈感同盟' },
              ] as const
            ).map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => handleRelationChange(t.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  relationType === t.id
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two Columns: Person A & Person B */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Person A */}
          <div className="p-4 sm:p-5 rounded-2xl bg-pink-50/60 border border-pink-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-pink-600">搭檔 A (第一位)</span>
              <span className="text-xs text-pink-500 font-bold">
                推算星座：{getZodiacFromDate(personA.birthDate)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 font-bold">稱呼 / 姓名</label>
              <input
                type="text"
                required
                value={personA.name}
                onChange={(e) => setPersonA({ ...personA, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-pink-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-pink-500 shadow-xs"
                placeholder="例如：語晨"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-600 font-bold">出生年月日</label>
                <input
                  type="date"
                  required
                  value={personA.birthDate}
                  onChange={(e) => setPersonA({ ...personA, birthDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-pink-500 shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <label className="text-xs text-slate-600 font-bold">MBTI 人格</label>
                  <button
                    type="button"
                    onClick={() => handleOpenMbtiFinder('A')}
                    className="text-[11px] font-black text-pink-600 hover:text-pink-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>唔知邊型？測一測</span>
                  </button>
                </div>
                <select
                  value={personA.mbti}
                  onChange={(e) => setPersonA({ ...personA, mbti: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-pink-500 shadow-xs"
                >
                  {MBTI_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type} · {MBTI_TYPE_INFO[type]?.title}
                    </option>
                  ))}
                </select>
                {infoA && (
                  <p className="text-[11px] text-pink-600 font-bold truncate">
                    {infoA.nickname} · {infoA.group}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Person B */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-600">搭檔 B (第二位)</span>
              <span className="text-xs text-rose-500 font-bold">
                推算星座：{getZodiacFromDate(personB.birthDate)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 font-bold">稱呼 / 姓名</label>
              <input
                type="text"
                required
                value={personB.name}
                onChange={(e) => setPersonB({ ...personB, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-rose-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-rose-500 shadow-xs"
                placeholder="例如：逸飛"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-600 font-bold">出生年月日</label>
                <input
                  type="date"
                  required
                  value={personB.birthDate}
                  onChange={(e) => setPersonB({ ...personB, birthDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-rose-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-rose-500 shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <label className="text-xs text-slate-600 font-bold">MBTI 人格</label>
                  <button
                    type="button"
                    onClick={() => handleOpenMbtiFinder('B')}
                    className="text-[11px] font-black text-rose-600 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>唔知邊型？測一測</span>
                  </button>
                </div>
                <select
                  value={personB.mbti}
                  onChange={(e) => setPersonB({ ...personB, mbti: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-rose-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-rose-500 shadow-xs"
                >
                  {MBTI_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type} · {MBTI_TYPE_INFO[type]?.title}
                    </option>
                  ))}
                </select>
                {infoB && (
                  <p className="text-[11px] text-rose-600 font-bold truncate">
                    {infoB.nickname} · {infoB.group}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSwapPersons}
              className="px-3.5 py-2 text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>互換兩人</span>
            </button>
            <button
              type="button"
              onClick={handleRandomPair}
              className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>隨機試算</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenMbtiFinder('A')}
              className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>MBTI 速測與圖鑑</span>
            </button>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-7 py-3 text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl transition-all shadow-md shadow-pink-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>開始合盤測算 🌸</span>
          </button>
        </div>
      </form>

      {/* MBTI Quick Finder Modal */}
      <MbtiFinderModal
        isOpen={mbtiModalOpen}
        targetSide={mbtiTargetSide}
        targetName={mbtiTargetSide === 'A' ? personA.name : personB.name}
        onClose={() => setMbtiModalOpen(false)}
        onSwitchTargetSide={setMbtiTargetSide}
        onSelectMbti={handleApplyMbtiFromModal}
      />

      {/* Result Display Section */}
      <div className="bg-white/90 border-2 border-pink-200/80 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl shadow-pink-100/50 relative">
        <div className="flex flex-col md:flex-row items-center gap-6 border-b border-pink-100 pb-6">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-pink-500/20 to-rose-500/20 border-2 border-pink-300 flex flex-col items-center justify-center shrink-0 shadow-inner">
            <span className="text-4xl font-black text-pink-600 font-mono tabular-nums">
              {result.overallScore}%
            </span>
            <span className="text-[11px] text-pink-500 font-bold mt-0.5">契合指數</span>
          </div>

          <div className="space-y-1.5 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-slate-500 font-bold">
              <span>{result.personA.name} ({result.personA.zodiac} · {result.personA.mbti})</span>
              <span className="text-rose-500 font-black">♥</span>
              <span>{result.personB.name} ({result.personB.zodiac} · {result.personB.mbti})</span>
            </div>
            <h2 className="text-2xl font-black text-pink-600 tracking-tight">
              {result.verdict}
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              {result.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isSavingLog}
              onClick={() => void handleSaveToCloud()}
              className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
            >
              {savedJustNow ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已存入雲端</span>
                </>
              ) : user ? (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>{isSavingLog ? '儲存中...' : '儲存合盤紀錄'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>登入並儲存</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyCard}
              className="px-4 py-2.5 text-xs font-bold text-pink-700 bg-pink-100 hover:bg-pink-200 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製結果' : '複製結果'}</span>
            </button>
          </div>
        </div>

        {/* 4 Dimension Bars */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-4 h-4 text-pink-500" />
            <span>四維共鳴維度評析</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-100 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">{result.dimensionLabels.telepathy}</span>
                <span className="text-pink-600 font-mono tabular-nums">{result.dimensions.telepathy}%</span>
              </div>
              <div className="w-full bg-pink-200/50 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-pink-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${result.dimensions.telepathy}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-100 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">{result.dimensionLabels.spark}</span>
                <span className="text-rose-600 font-mono tabular-nums">{result.dimensions.spark}%</span>
              </div>
              <div className="w-full bg-pink-200/50 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${result.dimensions.spark}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-100 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">{result.dimensionLabels.values}</span>
                <span className="text-purple-600 font-mono tabular-nums">{result.dimensions.values}%</span>
              </div>
              <div className="w-full bg-pink-200/50 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${result.dimensions.values}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-100 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">{result.dimensionLabels.endurance}</span>
                <span className="text-amber-600 font-mono tabular-nums">{result.dimensions.endurance}%</span>
              </div>
              <div className="w-full bg-pink-200/50 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${result.dimensions.endurance}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Highlights & Growth Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3 bg-pink-50/50 p-5 rounded-3xl border border-pink-200">
            <h4 className="text-sm font-bold text-pink-600 flex items-center gap-1.5">
              <span>✦</span>
              <span>核心相吸亮點</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
              {result.highlights.map((h, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-pink-500 mt-0.5">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 bg-rose-50/50 p-5 rounded-3xl border border-rose-200">
            <h4 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
              <span>✦</span>
              <span>相處升溫建議指南</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
              {result.growthTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Constellation Art Card */}
        <div className="rounded-3xl border-2 border-pink-200 bg-gradient-to-r from-pink-100/60 to-rose-100/40 p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
          <img
            src={constellationImg}
            alt="星盤宿命繪卷"
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-3xl object-cover border-2 border-pink-300 shrink-0 shadow-md"
          />
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-xs text-pink-600 font-bold tracking-wider">
              命定和鳴詩籤
            </span>
            <p className="text-sm text-slate-800 font-bold italic">
              {result.destinyQuote}
            </p>
            <div className="text-xs text-slate-500 font-medium pt-1">
              <span>{result.personA.chineseAnimal}年 × {result.personB.chineseAnimal}年</span>
              <span className="mx-2">·</span>
              <span>{result.personA.zodiacElement}象與{result.personB.zodiacElement}象和鳴</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Compatibility History */}
      <div className="bg-white/90 border-2 border-pink-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md shadow-pink-100/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-pink-500" />
            <h3 className="text-sm font-black text-slate-800">雲端合盤歷史紀錄</h3>
          </div>
          {!user && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                void signInWithGoogle();
              }}
              className="text-xs font-black text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>登入查看及同步紀錄</span>
            </button>
          )}
        </div>

        {!user ? (
          <p className="text-xs text-slate-500 font-medium">
            使用 Google 帳號登入後，你可以隨時收藏每一次心動合盤測算，跨裝置查閱過往配對結果。
          </p>
        ) : compatibilityLogs.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium">
            尚未有任何雲端紀錄，點擊上方「儲存合盤紀錄」即可保留目前結果！
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {compatibilityLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-200 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-black text-slate-800 truncate">
                    {log.personAName} ({log.personAMbti}) ♥ {log.personBName} ({log.personBMbti})
                  </div>
                  <div className="text-[11px] font-bold text-pink-600 flex items-center gap-1.5 truncate">
                    <span>{RELATION_LABELS[log.relationType] || '合盤'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{log.personAZodiac} × {log.personBZodiac}</span>
                    <span aria-hidden="true">·</span>
                    <span>{log.verdict}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-base font-black font-mono text-rose-600 tabular-nums">
                    {log.overallScore}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playMismatch();
                      void deleteCompatibilityLog(log.id);
                    }}
                    title="刪除此紀錄"
                    aria-label="刪除此紀錄"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
