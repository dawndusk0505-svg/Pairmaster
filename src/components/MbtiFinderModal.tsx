import React, { useState, useEffect } from 'react';
import { X, Sparkles, RotateCcw, Check, HelpCircle, Grid, Target, Zap, ExternalLink } from 'lucide-react';
import {
  MBTI_QUIZ_AXES,
  MBTI_DETAILED_QUESTIONS,
  MBTI_TYPE_INFO,
  MBTI_TYPES,
} from '../data/socialAndFortune';
import { soundFx } from '../utils/audio';

interface MbtiFinderModalProps {
  isOpen: boolean;
  targetSide: 'A' | 'B';
  targetName: string;
  onClose: () => void;
  onSwitchTargetSide: (side: 'A' | 'B') => void;
  onSelectMbti: (side: 'A' | 'B', mbti: string) => void;
}

const GROUPS: ('外交官' | '分析家' | '守護者' | '探險家')[] = [
  '外交官',
  '分析家',
  '守護者',
  '探險家',
];

const GROUP_META: Record<'外交官' | '分析家' | '守護者' | '探險家', { emoji: string; sub: string }> = {
  外交官: { emoji: '🌸', sub: 'NF · 溫柔理想同共情派' },
  分析家: { emoji: '🔮', sub: 'NT · 聰明理性同創意派' },
  守護者: { emoji: '🛡️', sub: 'SJ · 踏實可靠同貼心派' },
  探險家: { emoji: '🎨', sub: 'SP · 自由好玩同行動派' },
};

interface AxisBreakdown {
  axisLabel: string;
  leftLetter: string;
  rightLetter: string;
  leftPct: number;
  rightPct: number;
  winner: string;
  isBorderline: boolean;
}

export const MbtiFinderModal: React.FC<MbtiFinderModalProps> = ({
  isOpen,
  targetSide,
  targetName,
  onClose,
  onSwitchTargetSide,
  onSelectMbti,
}) => {
  const [mode, setMode] = useState<'detailed' | 'quick' | 'directory'>('detailed');

  // 16-question detailed state (each entry is +2, +1, -1, -2)
  const [detailedStep, setDetailedStep] = useState(0);
  const [detailedScores, setDetailedScores] = useState<(number | null)[]>(() =>
    Array(MBTI_DETAILED_QUESTIONS.length).fill(null)
  );

  // 4-question quick state
  const [quickStep, setQuickStep] = useState(0);
  const [quickAnswers, setQuickAnswers] = useState<(string | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (isOpen) {
      setDetailedStep(0);
      setDetailedScores(Array(MBTI_DETAILED_QUESTIONS.length).fill(null));
      setQuickStep(0);
      setQuickAnswers([null, null, null, null]);
    }
  }, [isOpen, targetSide]);

  if (!isOpen) return null;

  const displayTargetLabel = targetName.trim()
    ? `${targetName} (搭檔 ${targetSide})`
    : `搭檔 ${targetSide}`;

  // Detailed Quiz Computations
  const isDetailedFinished = detailedScores.every((v) => v !== null);
  const computeDetailedBreakdown = (): { code: string; axes: AxisBreakdown[] } => {
    const axisConfigs: {
      axis: 'EI' | 'SN' | 'TF' | 'JP';
      label: string;
      left: string;
      right: string;
    }[] = [
      { axis: 'EI', label: '能量來源 (E 外向 / I 內向)', left: 'E', right: 'I' },
      { axis: 'SN', label: '資訊感知 (S 實感 / N 直覺)', left: 'S', right: 'N' },
      { axis: 'TF', label: '決策準則 (T 思考 / F 情感)', left: 'T', right: 'F' },
      { axis: 'JP', label: '生活節奏 (J 計劃 / P 隨性)', left: 'J', right: 'P' },
    ];

    const axes: AxisBreakdown[] = axisConfigs.map((cfg) => {
      let sum = 0;
      MBTI_DETAILED_QUESTIONS.forEach((q, idx) => {
        if (q.axis === cfg.axis) {
          sum += detailedScores[idx] ?? 0;
        }
      });
      // Range is [-8, +8] across 4 questions (+/-2 each)
      const leftPct = Math.round(((sum + 8) / 16) * 100);
      const rightPct = 100 - leftPct;
      const winner = sum >= 0 ? cfg.left : cfg.right;
      const isBorderline = Math.abs(leftPct - 50) <= 6;

      return {
        axisLabel: cfg.label,
        leftLetter: cfg.left,
        rightLetter: cfg.right,
        leftPct,
        rightPct,
        winner,
        isBorderline,
      };
    });

    return {
      code: axes.map((a) => a.winner).join(''),
      axes,
    };
  };

  const detailedResult = isDetailedFinished ? computeDetailedBreakdown() : null;
  const detailedDetailInfo = detailedResult ? MBTI_TYPE_INFO[detailedResult.code] : null;
  const currentDetailedQ = MBTI_DETAILED_QUESTIONS[detailedStep];

  const handleChooseDetailed = (val: number) => {
    soundFx.playCardFlip();
    const next = [...detailedScores];
    next[detailedStep] = val;
    setDetailedScores(next);

    if (detailedStep < MBTI_DETAILED_QUESTIONS.length - 1) {
      setDetailedStep(detailedStep + 1);
    } else {
      soundFx.playVictory();
    }
  };

  const handleResetDetailed = () => {
    soundFx.playClick();
    setDetailedStep(0);
    setDetailedScores(Array(MBTI_DETAILED_QUESTIONS.length).fill(null));
  };

  // Quick Quiz Computations
  const isQuickFinished = quickAnswers.every((a) => a !== null);
  const quickCode = isQuickFinished ? quickAnswers.join('') : null;
  const quickDetailInfo = quickCode ? MBTI_TYPE_INFO[quickCode] : null;
  const currentQuickQ = MBTI_QUIZ_AXES[quickStep];

  const handleChooseQuick = (letter: string) => {
    soundFx.playCardFlip();
    const nextAnswers = [...quickAnswers];
    nextAnswers[quickStep] = letter;
    setQuickAnswers(nextAnswers);

    if (quickStep < MBTI_QUIZ_AXES.length - 1) {
      setQuickStep(quickStep + 1);
    } else {
      soundFx.playVictory();
    }
  };

  const handleResetQuick = () => {
    soundFx.playClick();
    setQuickStep(0);
    setQuickAnswers([null, null, null, null]);
  };

  const handleApplyResult = (code: string) => {
    soundFx.playMatchSuccess(2);
    onSelectMbti(targetSide, code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-pink-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-xl shadow-xs shrink-0">
              🧭
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                MBTI 人格測評與圖鑑 · 搵出真實性格
              </h3>
              <p className="text-xs text-pink-500 font-bold">
                測完會自動幫你填入【{displayTargetLabel}】欄位
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="關閉 MBTI 測驗"
            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-xl hover:bg-pink-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs + Target Side Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-pink-50 rounded-2xl border border-pink-200">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setMode('detailed');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                mode === 'detailed'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>16題精準測評</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setMode('quick');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                mode === 'quick'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>4題極速體驗</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setMode('directory');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                mode === 'directory'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>16型圖鑑</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
            <span className="text-slate-500">套用對象：</span>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onSwitchTargetSide('A');
              }}
              className={`px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                targetSide === 'A'
                  ? 'bg-pink-100 border-pink-400 text-pink-700 font-black'
                  : 'bg-white border-pink-200 text-slate-600 hover:border-pink-300'
              }`}
            >
              搭檔 A
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onSwitchTargetSide('B');
              }}
              className={`px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                targetSide === 'B'
                  ? 'bg-rose-100 border-rose-400 text-rose-700 font-black'
                  : 'bg-white border-pink-200 text-slate-600 hover:border-pink-300'
              }`}
            >
              搭檔 B
            </button>
          </div>
        </div>

        {/* MODE 1: 16-Question Multi-Scenario Assessment */}
        {mode === 'detailed' && (
          <div className="space-y-4">
            {!isDetailedFinished ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-pink-600">
                      多維情景題 · 一按強度即跳下一題（約 1 分鐘）
                    </span>
                    <span className="text-slate-600 font-mono">
                      第 {detailedStep + 1} / {MBTI_DETAILED_QUESTIONS.length} 題
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-pink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${((detailedStep + 1) / MBTI_DETAILED_QUESTIONS.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Scenario Question */}
                <div className="p-4 sm:p-5 rounded-2xl bg-pink-50/70 border border-pink-200 space-y-1">
                  <span className="text-[11px] font-black text-pink-500 uppercase">
                    情景 {detailedStep + 1}
                  </span>
                  <h4 className="text-base font-black text-slate-900 leading-snug">
                    {currentDetailedQ.scenario}
                  </h4>
                </div>

                {/* Two Options with 2-level intensity buttons inside */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option A */}
                  <div
                    className={`p-4 rounded-2xl border-2 flex flex-col justify-between space-y-3 transition-all ${
                      (detailedScores[detailedStep] ?? 0) > 0
                        ? 'bg-pink-50/80 border-pink-500 shadow-sm'
                        : 'bg-white border-pink-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-black text-pink-600 font-mono">
                        A 傾向 ({currentDetailedQ.optionA.letter})
                      </span>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed">
                        {currentDetailedQ.optionA.text}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleChooseDetailed(2)}
                        className={`py-2 px-2 text-xs font-black rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          detailedScores[detailedStep] === 2
                            ? 'bg-pink-500 text-white border-pink-500'
                            : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200'
                        }`}
                      >
                        非常似我
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChooseDetailed(1)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          detailedScores[detailedStep] === 1
                            ? 'bg-pink-400 text-white border-pink-400'
                            : 'bg-white hover:bg-pink-50 text-slate-700 border-pink-200'
                        }`}
                      >
                        少少似 A
                      </button>
                    </div>
                  </div>

                  {/* Option B */}
                  <div
                    className={`p-4 rounded-2xl border-2 flex flex-col justify-between space-y-3 transition-all ${
                      (detailedScores[detailedStep] ?? 0) < 0
                        ? 'bg-rose-50/80 border-rose-500 shadow-sm'
                        : 'bg-white border-rose-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-black text-rose-600 font-mono">
                        B 傾向 ({currentDetailedQ.optionB.letter})
                      </span>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed">
                        {currentDetailedQ.optionB.text}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleChooseDetailed(-1)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          detailedScores[detailedStep] === -1
                            ? 'bg-rose-400 text-white border-rose-400'
                            : 'bg-white hover:bg-rose-50 text-slate-700 border-rose-200'
                        }`}
                      >
                        少少似 B
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChooseDetailed(-2)}
                        className={`py-2 px-2 text-xs font-black rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          detailedScores[detailedStep] === -2
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        非常似我
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step Footer */}
                <div className="flex items-center justify-between pt-1 text-xs font-bold">
                  <button
                    type="button"
                    disabled={detailedStep === 0}
                    onClick={() => {
                      soundFx.playClick();
                      setDetailedStep((s) => Math.max(0, s - 1));
                    }}
                    className="text-slate-500 hover:text-pink-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    ← 上一題
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDetailed}
                    className="text-pink-500 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重新開始</span>
                  </button>
                </div>
              </>
            ) : (
              /* Detailed Result with 4-Axis Percentages */
              detailedResult &&
              detailedDetailInfo && (
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-pink-50 via-rose-50 to-white border-2 border-pink-300 space-y-5">
                  <div className="text-center space-y-1.5">
                    <span className="text-xs font-black text-pink-600 tracking-wider">
                      🎯 16 題精準測評結果（含四維傾向強度）
                    </span>
                    <div className="text-4xl font-black font-mono text-pink-600 tracking-wider">
                      {detailedDetailInfo.code}
                    </div>
                    <h4 className="text-xl font-black text-slate-900">
                      {detailedDetailInfo.title} · {detailedDetailInfo.nickname}
                    </h4>
                    <p className="text-xs text-slate-600 font-bold max-w-md mx-auto">
                      「{detailedDetailInfo.summary}」
                    </p>
                  </div>

                  {/* 4 Axis Percentage Bars */}
                  <div className="space-y-3 bg-white/85 rounded-2xl p-4 border border-pink-200">
                    {detailedResult.axes.map((ax) => (
                      <div key={ax.axisLabel} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={ax.winner === ax.leftLetter ? 'text-pink-600 font-black' : 'text-slate-400'}>
                            {ax.leftLetter} ({ax.leftPct}%)
                          </span>
                          <span className="text-[11px] text-slate-600">
                            {ax.axisLabel}
                            {ax.isBorderline && (
                              <span className="text-amber-600 ml-1">· 搖擺中間型</span>
                            )}
                          </span>
                          <span className={ax.winner === ax.rightLetter ? 'text-rose-600 font-black' : 'text-slate-400'}>
                            {ax.rightLetter} ({ax.rightPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-pink-500 transition-all duration-500"
                            style={{ width: `${ax.leftPct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleResetDetailed}
                      className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-pink-200 hover:bg-pink-50 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>重測 16 題</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyResult(detailedDetailInfo.code)}
                      className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl shadow-md shadow-pink-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>套用 {detailedDetailInfo.code} 至【{displayTargetLabel}】</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* MODE 2: 4-Question Quick Guess */}
        {mode === 'quick' && (
          <div className="space-y-5">
            {!isQuickFinished ? (
              <>
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-800 font-bold flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>提示：4 題版適合快速估計或幫暗戀對象「盲猜大概類型」；想最準確建議用左邊「16題精準測評」喔！</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-pink-600">{currentQuickQ.axis}</span>
                    <span className="text-slate-500 font-mono">
                      第 {quickStep + 1} / {MBTI_QUIZ_AXES.length} 題
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MBTI_QUIZ_AXES.map((q, idx) => (
                      <button
                        key={q.axis}
                        type="button"
                        onClick={() => {
                          soundFx.playClick();
                          setQuickStep(idx);
                        }}
                        aria-label={`跳至第 ${idx + 1} 題`}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx < quickStep || quickAnswers[idx]
                            ? 'bg-pink-500'
                            : idx === quickStep
                            ? 'bg-pink-300'
                            : 'bg-pink-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-pink-50/70 border border-pink-200 space-y-1.5">
                  <h4 className="text-base font-black text-slate-900">
                    {currentQuickQ.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-bold">
                    {currentQuickQ.question}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[currentQuickQ.optionA, currentQuickQ.optionB].map((opt) => {
                    const isSelected = quickAnswers[quickStep] === opt.letter;
                    return (
                      <button
                        key={opt.letter}
                        type="button"
                        onClick={() => handleChooseQuick(opt.letter)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer space-y-2 hover:-translate-y-0.5 ${
                          isSelected
                            ? 'bg-pink-50 border-pink-500 ring-2 ring-pink-300 shadow-md'
                            : 'bg-white border-pink-200 hover:border-pink-400 hover:bg-pink-50/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black font-mono text-pink-600">
                            {opt.letter}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-pink-600" />}
                        </div>
                        <p className="text-sm font-black text-slate-800 leading-snug">
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs font-bold">
                  <button
                    type="button"
                    disabled={quickStep === 0}
                    onClick={() => {
                      soundFx.playClick();
                      setQuickStep((s) => Math.max(0, s - 1));
                    }}
                    className="text-slate-500 hover:text-pink-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    ← 上一題
                  </button>
                  <button
                    type="button"
                    onClick={handleResetQuick}
                    className="text-pink-500 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重新作答</span>
                  </button>
                </div>
              </>
            ) : (
              quickDetailInfo && (
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-pink-50 via-rose-50 to-white border-2 border-pink-300 text-center space-y-4">
                  <span className="text-xs font-black text-pink-600 tracking-wider">
                    ⚡ 4 題極速初步結果
                  </span>

                  <div className="space-y-1">
                    <div className="text-4xl font-black font-mono text-pink-600 tracking-wider">
                      {quickDetailInfo.code}
                    </div>
                    <h4 className="text-xl font-black text-slate-900">
                      {quickDetailInfo.title} · {quickDetailInfo.nickname}
                    </h4>
                    <p className="text-xs text-pink-500 font-bold">
                      {GROUP_META[quickDetailInfo.group].emoji} {quickDetailInfo.group}系列
                    </p>
                  </div>

                  <p className="text-sm text-slate-700 font-bold max-w-md mx-auto leading-relaxed">
                    「{quickDetailInfo.summary}」
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setMode('detailed');
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-pink-600 bg-white border border-pink-200 hover:bg-pink-50 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>想更準？轉做 16 題</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyResult(quickDetailInfo.code)}
                      className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 rounded-2xl shadow-md shadow-pink-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>套用 {quickDetailInfo.code} 至【{displayTargetLabel}】</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* MODE 3: Full 16-Type Visual Directory */}
        {mode === 'directory' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200 text-[11px] text-slate-700 font-bold grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-pink-600 font-black block">1. 能量來源</span>
                <span>E 外向好動 · I 內向喜靜</span>
              </div>
              <div>
                <span className="text-pink-600 font-black block">2. 思考習慣</span>
                <span>S 務實細節 · N 想像靈感</span>
              </div>
              <div>
                <span className="text-pink-600 font-black block">3. 判斷準則</span>
                <span>T 理性邏輯 · F 感性共情</span>
              </div>
              <div>
                <span className="text-pink-600 font-black block">4. 生活態度</span>
                <span>J 事前規劃 · P 隨興彈性</span>
              </div>
            </div>

            <div className="space-y-4 max-h-[46vh] overflow-y-auto pr-1">
              {GROUPS.map((groupName) => {
                const typesInGroup = MBTI_TYPES.map((code) => MBTI_TYPE_INFO[code]).filter(
                  (d) => d.group === groupName
                );
                return (
                  <div key={groupName} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-pink-600">
                      <span>{GROUP_META[groupName].emoji}</span>
                      <span>{groupName}</span>
                      <span className="text-slate-400 font-bold">· {GROUP_META[groupName].sub}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {typesInGroup.map((info) => (
                        <button
                          key={info.code}
                          type="button"
                          onClick={() => handleApplyResult(info.code)}
                          className="p-3 rounded-2xl bg-white hover:bg-pink-50 border border-pink-200 hover:border-pink-400 text-left transition-all cursor-pointer shadow-xs group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-pink-600 font-mono">
                              {info.code} · {info.title}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-pink-500">
                              套用 →
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-rose-500 block mt-0.5">
                            {info.nickname}
                          </span>
                          <p className="text-[11px] text-slate-600 font-medium mt-1 leading-snug">
                            {info.summary}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Safe External Third-Party Deep Assessment Reference */}
        <div className="pt-3 border-t border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="space-y-0.5">
            <span className="font-black text-slate-700 block">
              🌐 想做完整 60–130 題深度測試？
            </span>
            <span className="text-[11px] text-slate-500 font-bold block">
              另開分頁前往知名第三方測評網（與本平台無從屬關係），測完返嚟揀型號即可！
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://www.16personalities.com/ch"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold flex items-center gap-1 transition-colors"
            >
              <span>16Personalities (繁中60題)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.truity.com/test/type-finder-personality-test-new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-pink-50 text-slate-600 border border-pink-200 font-bold flex items-center gap-1 transition-colors"
            >
              <span>Truity (EN)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
