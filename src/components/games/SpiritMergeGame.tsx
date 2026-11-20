import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Pause,
  Play,
  Wand2,
  Coins,
  Cloud,
} from 'lucide-react';
import { MERGE_EVOLUTION_CHAIN } from '../../data/spiritPairings';
import { soundFx } from '../../utils/audio';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useKingdomProgress } from '../../hooks/useKingdomProgress';

interface SpiritBall {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  bornAt: number;
  mergedPopAt?: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  createdAt: number;
}

interface SpiritMergeGameProps {
  isActiveTab?: boolean;
  onOpenMyRecords?: () => void;
}

const CANVAS_W = 360;
const CANVAS_H = 480;
const WALL_PAD = 10;
const FLOOR_Y = CANVAS_H - 12;
const DANGER_Y = 78;
const DROP_SPAWN_Y = 42;
const GRAVITY = 0.34;
const DAMPING = 0.992;
const RESTITUTION = 0.24;

export const SpiritMergeGame: React.FC<SpiritMergeGameProps> = ({
  isActiveTab = true,
  onOpenMyRecords,
}) => {
  const { getCloudHighScore, getPublicStageBest, saveGameScore } = useFirebase();
  const { earnCoins, recordMergeTier, unlockCardFree } = useKingdomProgress();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<SpiritBall[]>([]);
  const floatsRef = useRef<FloatingText[]>([]);
  const nextIdRef = useRef(1);
  const aimXRef = useRef(CANVAS_W / 2);
  const lastDropAtRef = useRef(0);
  const dangerFramesRef = useRef(0);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const scoreRef = useRef(0);
  const startMsRef = useRef<number>(Date.now());
  const gameOverTriggeredRef = useRef(false);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentTier, setCurrentTier] = useState<number>(() => Math.floor(Math.random() * 4));
  const [nextTier, setNextTier] = useState<number>(() => Math.floor(Math.random() * 4));
  const [maxReachedTier, setMaxReachedTier] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [shakeCharges, setShakeCharges] = useState(2);
  const [popMiniCharges, setPopMiniCharges] = useState(1);
  const [dangerRatio, setDangerRatio] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'anonymous' | 'local' | null>(null);
  const [coinsAwarded, setCoinsAwarded] = useState(0);

  const currentTierRef = useRef(currentTier);
  currentTierRef.current = currentTier;
  const maxReachedTierRef = useRef(0);
  const highScoreRef = useRef(0);

  const localStorageKey = 'pairmaster_merge_high_standard_candy-merge';

  useEffect(() => {
    let localBest = 0;
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) localBest = parseInt(saved, 10) || 0;
    } catch {
      localBest = 0;
    }
    const cloudBest = getCloudHighScore('merge', 'standard', 'candy-merge');
    const best = Math.max(localBest, cloudBest);
    highScoreRef.current = best;
    setHighScore(best);
  }, [getCloudHighScore]);

  // Preload the 10 spirit avatars onto Image objects for crisp 60fps canvas rendering
  useEffect(() => {
    MERGE_EVOLUTION_CHAIN.forEach((cfg) => {
      if (cfg.item.imageUrl && !imageCacheRef.current.has(cfg.item.id)) {
        const img = new Image();
        img.src = cfg.item.imageUrl;
        imageCacheRef.current.set(cfg.item.id, img);
      }
    });
  }, []);

  const endGame = useCallback(() => {
    if (gameOverTriggeredRef.current) return;
    gameOverTriggeredRef.current = true;
    setIsGameOver(true);

    const finalScore = scoreRef.current;
    const elapsedSec = Math.max(5, Math.round((Date.now() - startMsRef.current) / 1000));
    const reward = Math.max(12, Math.min(120, Math.round(finalScore / 35)));
    setCoinsAwarded(reward);
    earnCoins(reward);

    if (finalScore > highScoreRef.current) {
      highScoreRef.current = finalScore;
      setHighScore(finalScore);
      try {
        localStorage.setItem(localStorageKey, String(finalScore));
      } catch {
        // ignore
      }
    }

    const stars = finalScore >= 2600 ? 3 : finalScore >= 1100 ? 2 : 1;
    void saveGameScore({
      gameMode: 'merge',
      themeId: 'candy-merge',
      themeName: '糖果盲盒罐',
      difficultyId: 'standard',
      score: finalScore,
      timeSec: elapsedSec,
      maxCombo: Math.max(1, maxReachedTierRef.current + 1),
      stars,
    }).then((status) => setSyncStatus(status));

    soundFx.playVictory();
  }, [earnCoins, saveGameScore]);

  const initNewGame = useCallback(() => {
    ballsRef.current = [];
    floatsRef.current = [];
    nextIdRef.current = 1;
    aimXRef.current = CANVAS_W / 2;
    lastDropAtRef.current = 0;
    dangerFramesRef.current = 0;
    scoreRef.current = 0;
    maxReachedTierRef.current = 0;
    startMsRef.current = Date.now();
    gameOverTriggeredRef.current = false;

    const firstTier = Math.floor(Math.random() * 4);
    currentTierRef.current = firstTier;
    setScore(0);
    setCurrentTier(firstTier);
    setNextTier(Math.floor(Math.random() * 4));
    setMaxReachedTier(0);
    setIsPaused(false);
    setIsGameOver(false);
    setShakeCharges(2);
    setPopMiniCharges(1);
    setDangerRatio(0);
    setSyncStatus(null);
    setCoinsAwarded(0);
  }, []);

  const dropBall = useCallback(
    (clientX?: number) => {
      if (!isActiveTab || isPaused || isGameOver) return;
      const now = performance.now();
      if (now - lastDropAtRef.current < 420) return;

      if (clientX !== undefined && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const relX = ((clientX - rect.left) / rect.width) * CANVAS_W;
        const r = MERGE_EVOLUTION_CHAIN[currentTier].radius;
        aimXRef.current = Math.max(WALL_PAD + r + 2, Math.min(CANVAS_W - WALL_PAD - r - 2, relX));
      }

      const spec = MERGE_EVOLUTION_CHAIN[currentTier];
      const clampedX = Math.max(
        WALL_PAD + spec.radius + 2,
        Math.min(CANVAS_W - WALL_PAD - spec.radius - 2, aimXRef.current)
      );

      ballsRef.current.push({
        id: nextIdRef.current++,
        tier: currentTier,
        x: clampedX,
        y: DROP_SPAWN_Y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 1.5,
        r: spec.radius,
        bornAt: now,
      });

      lastDropAtRef.current = now;
      soundFx.playCardFlip();
      setCurrentTier(nextTier);
      setNextTier(Math.floor(Math.random() * 4));
    },
    [currentTier, isActiveTab, isGameOver, isPaused, nextTier]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isPaused || isGameOver) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const r = MERGE_EVOLUTION_CHAIN[currentTier].radius;
    aimXRef.current = Math.max(WALL_PAD + r + 2, Math.min(CANVAS_W - WALL_PAD - r - 2, relX));
  };

  const handleShakeJar = () => {
    if (shakeCharges <= 0 || isPaused || isGameOver) return;
    soundFx.playPowerUp();
    setShakeCharges((c) => c - 1);
    ballsRef.current.forEach((b) => {
      b.vy -= 3.6 + Math.random() * 2.2;
      b.vx += (Math.random() - 0.5) * 6.5;
    });
  };

  const handlePopMinis = () => {
    if (popMiniCharges <= 0 || isPaused || isGameOver) return;
    const before = ballsRef.current.length;
    const filtered = ballsRef.current.filter((b) => b.tier > 1);
    if (filtered.length === before) return;
    soundFx.playMatchSuccess(3);
    setPopMiniCharges((c) => c - 1);
    const popped = before - filtered.length;
    ballsRef.current = filtered;
    scoreRef.current += popped * 25;
    setScore(scoreRef.current);
  };

  // Main physics + canvas render loop (paused automatically if tab hidden or paused)
  useEffect(() => {
    if (!isActiveTab || isPaused || isGameOver) return;
    let rafId = 0;

    const stepPhysics = () => {
      const now = performance.now();
      const balls = ballsRef.current;
      const subSteps = 4;

      for (let s = 0; s < subSteps; s++) {
        // 1. Integrate velocities & wall collisions
        for (const b of balls) {
          b.vy += GRAVITY / subSteps;
          b.vx *= DAMPING;
          b.vy *= DAMPING;
          b.x += b.vx / subSteps;
          b.y += b.vy / subSteps;

          if (b.x - b.r < WALL_PAD) {
            b.x = WALL_PAD + b.r;
            b.vx = Math.abs(b.vx) * RESTITUTION;
          } else if (b.x + b.r > CANVAS_W - WALL_PAD) {
            b.x = CANVAS_W - WALL_PAD - b.r;
            b.vx = -Math.abs(b.vx) * RESTITUTION;
          }

          if (b.y + b.r > FLOOR_Y) {
            b.y = FLOOR_Y - b.r;
            b.vy = -Math.abs(b.vy) * RESTITUTION;
            b.vx *= 0.94;
          }
        }

        // 2. Circle-circle separation & merging
        const removedIds = new Set<number>();
        const spawned: SpiritBall[] = [];

        for (let i = 0; i < balls.length; i++) {
          const a = balls[i];
          if (removedIds.has(a.id)) continue;

          for (let j = i + 1; j < balls.length; j++) {
            const b = balls[j];
            if (removedIds.has(b.id)) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            const minDist = a.r + b.r;

            if (distSq < minDist * minDist) {
              // Merge if same tier & below max tier
              if (a.tier === b.tier && a.tier < MERGE_EVOLUTION_CHAIN.length - 1) {
                removedIds.add(a.id);
                removedIds.add(b.id);
                const nextT = a.tier + 1;
                const spec = MERGE_EVOLUTION_CHAIN[nextT];
                const mx = Math.max(
                  WALL_PAD + spec.radius,
                  Math.min(CANVAS_W - WALL_PAD - spec.radius, (a.x + b.x) / 2)
                );
                const my = Math.min(FLOOR_Y - spec.radius, (a.y + b.y) / 2);

                spawned.push({
                  id: nextIdRef.current++,
                  tier: nextT,
                  x: mx,
                  y: my,
                  vx: (a.vx + b.vx) * 0.25,
                  vy: -1.6,
                  r: spec.radius,
                  bornAt: now,
                  mergedPopAt: now,
                });

                scoreRef.current += spec.points;
                setScore(scoreRef.current);
                if (nextT > maxReachedTierRef.current) {
                  maxReachedTierRef.current = nextT;
                  setMaxReachedTier(nextT);
                  recordMergeTier(nextT);
                  if (nextT >= 5) {
                    unlockCardFree(spec.item.id);
                  }
                }

                floatsRef.current.push({
                  id: nextIdRef.current++,
                  x: mx,
                  y: my - 10,
                  text: `+${spec.points} ${spec.item.symbol}`,
                  createdAt: now,
                });

                soundFx.playMatchSuccess(Math.min(5, Math.ceil(nextT / 2) + 1));
                if (nextT >= 7) {
                  confetti({
                    particleCount: nextT === 9 ? 90 : 35,
                    spread: 65,
                    origin: { y: 0.6 },
                  });
                }
                break;
              }

              // Standard elastic collision resolution
              const dist = Math.sqrt(distSq) || 0.001;
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              const totalMass = a.r + b.r;
              const aShare = b.r / totalMass;
              const bShare = a.r / totalMass;

              a.x -= nx * overlap * aShare;
              a.y -= ny * overlap * aShare;
              b.x += nx * overlap * bShare;
              b.y += ny * overlap * bShare;

              const rvx = b.vx - a.vx;
              const rvy = b.vy - a.vy;
              const velAlongNormal = rvx * nx + rvy * ny;
              if (velAlongNormal < 0) {
                const jImpulse = -(1 + RESTITUTION) * velAlongNormal * 0.5;
                a.vx -= jImpulse * nx;
                a.vy -= jImpulse * ny;
                b.vx += jImpulse * nx;
                b.vy += jImpulse * ny;
              }
            }
          }
        }

        if (removedIds.size > 0 || spawned.length > 0) {
          ballsRef.current = balls.filter((b) => !removedIds.has(b.id)).concat(spawned);
        }
      }

      // 3. Check danger overflow line (ignore newly spawned < 950ms)
      let anyAboveDanger = false;
      for (const b of ballsRef.current) {
        if (now - b.bornAt > 950 && b.y - b.r < DANGER_Y) {
          anyAboveDanger = true;
          break;
        }
      }

      if (anyAboveDanger) {
        dangerFramesRef.current += 1;
        setDangerRatio(Math.min(1, dangerFramesRef.current / 120));
        if (dangerFramesRef.current >= 120) {
          endGame();
        }
      } else if (dangerFramesRef.current > 0) {
        dangerFramesRef.current = Math.max(0, dangerFramesRef.current - 3);
        setDangerRatio(Math.min(1, dangerFramesRef.current / 120));
      }
    };

    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== CANVAS_W * dpr || canvas.height !== CANVAS_H * dpr) {
        canvas.width = CANVAS_W * dpr;
        canvas.height = CANVAS_H * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Pastel jar background
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#fff7fb');
      grad.addColorStop(1, '#ffeaf3');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Danger top line
      ctx.save();
      ctx.strokeStyle = dangerFramesRef.current > 20 ? '#ef4444' : '#f9a8d4';
      ctx.lineWidth = dangerFramesRef.current > 20 ? 2.5 : 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(WALL_PAD, DANGER_Y);
      ctx.lineTo(CANVAS_W - WALL_PAD, DANGER_Y);
      ctx.stroke();
      ctx.restore();

      // Aim drop guide & preview ball
      const activeTier = currentTierRef.current;
      const previewSpec = MERGE_EVOLUTION_CHAIN[activeTier];
      const aimX = Math.max(
        WALL_PAD + previewSpec.radius + 2,
        Math.min(CANVAS_W - WALL_PAD - previewSpec.radius - 2, aimXRef.current)
      );
      ctx.save();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(aimX, DROP_SPAWN_Y + previewSpec.radius);
      ctx.lineTo(aimX, FLOOR_Y);
      ctx.stroke();
      ctx.restore();

      const drawSpiritCircle = (x: number, y: number, r: number, tier: number, scaleBoost = 1) => {
        const cfg = MERGE_EVOLUTION_CHAIN[tier];
        const drawR = r * scaleBoost;

        ctx.save();
        // Soft shadow
        ctx.beginPath();
        ctx.arc(x, y + 2, drawR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
        ctx.fill();

        // Colored candy rim
        ctx.beginPath();
        ctx.arc(x, y, drawR, 0, Math.PI * 2);
        ctx.fillStyle = cfg.bgTint;
        ctx.fill();
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = cfg.ringColor;
        ctx.stroke();

        // Clipped avatar image or emoji fallback
        const img = imageCacheRef.current.get(cfg.item.id);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2, drawR - 2.5), 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, x - drawR + 2, y - drawR + 2, (drawR - 2) * 2, (drawR - 2) * 2);
          ctx.restore();
        } else {
          ctx.font = `${Math.round(drawR * 1.1)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cfg.item.symbol, x, y + 1);
        }

        // Specular highlight arc
        ctx.beginPath();
        ctx.arc(x - drawR * 0.28, y - drawR * 0.28, drawR * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fill();
        ctx.restore();
      };

      // Draw waiting drop ball at top
      drawSpiritCircle(aimX, DROP_SPAWN_Y, previewSpec.radius, activeTier, 1);

      // Draw all active jar balls
      const now = performance.now();
      for (const b of ballsRef.current) {
        let boost = 1;
        if (b.mergedPopAt && now - b.mergedPopAt < 220) {
          const p = (now - b.mergedPopAt) / 220;
          boost = 1 + Math.sin(p * Math.PI) * 0.18;
        }
        drawSpiritCircle(b.x, b.y, b.r, b.tier, boost);
      }

      // Draw floating score popups
      floatsRef.current = floatsRef.current.filter((ft) => now - ft.createdAt < 900);
      for (const ft of floatsRef.current) {
        const age = (now - ft.createdAt) / 900;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#db2777';
        ctx.fillText(ft.text, ft.x, ft.y - age * 26);
        ctx.restore();
      }

      // Jar border walls
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(WALL_PAD, 12);
      ctx.lineTo(WALL_PAD, FLOOR_Y);
      ctx.lineTo(CANVAS_W - WALL_PAD, FLOOR_Y);
      ctx.lineTo(CANVAS_W - WALL_PAD, 12);
      ctx.stroke();

      ctx.restore();
    };

    const tick = () => {
      stepPhysics();
      renderCanvas();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [endGame, isActiveTab, isGameOver, isPaused, recordMergeTier, unlockCardFree]);

  const publicBest = getPublicStageBest('merge', 'standard', 'candy-merge');
  const nextSpec = MERGE_EVOLUTION_CHAIN[nextTier];

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 border border-pink-200 rounded-3xl p-4 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <span>🫧 糖果盲盒罐：合成大精靈</span>
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            左右移動手指瞄準投放 · 相同精靈相撞即刻進化成大精靈！
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setIsPaused((p) => !p);
            }}
            disabled={isGameOver}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? '繼續' : '暫停'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              initNewGame();
            }}
            className="px-3 py-2 text-xs font-black text-white bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新開罐</span>
          </button>
        </div>
      </div>

      {/* Main Split Area: Canvas Jar + Evolution Chain */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 flex flex-col items-center space-y-3">
          {/* HUD Bar */}
          <div className="w-full max-w-[380px] grid grid-cols-3 gap-2">
            <div className="bg-white border border-pink-200 rounded-2xl p-2.5 text-center shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 block">目前分數</span>
              <span className="text-lg font-black font-mono text-pink-600 tabular-nums">{score}</span>
            </div>
            <div className="bg-white border border-pink-200 rounded-2xl p-2.5 text-center shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 block">個人最高</span>
              <span className="text-lg font-black font-mono text-amber-500 tabular-nums">{highScore}</span>
            </div>
            <div className="bg-white border border-pink-200 rounded-2xl p-2.5 flex items-center justify-center gap-2 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400">下一粒</span>
              {nextSpec.item.imageUrl ? (
                <img
                  src={nextSpec.item.imageUrl}
                  alt={nextSpec.item.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-pink-300"
                />
              ) : (
                <span className="text-xl">{nextSpec.item.symbol}</span>
              )}
            </div>
          </div>

          {dangerRatio > 0.25 && !isGameOver && (
            <div className="w-full max-w-[380px] bg-rose-50 border border-rose-300 rounded-xl px-3 py-1.5 text-xs font-black text-rose-600 text-center animate-pulse">
              ⚠️ 糖果快滿瀉出盲盒罐了！快合成騰出空間！
            </div>
          )}

          {/* Jar Canvas */}
          <div className="relative w-full max-w-[380px] rounded-3xl overflow-hidden border-2 border-pink-300 shadow-lg bg-white select-none touch-none">
            <canvas
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerMove}
              onPointerUp={(e) => dropBall(e.clientX)}
              className="w-full h-auto block cursor-crosshair aspect-[3/4]"
            />

            {isPaused && !isGameOver && (
              <div className="absolute inset-0 bg-pink-950/35 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-6">
                <p className="text-xl font-black text-white drop-shadow">遊戲暫停中</p>
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="px-5 py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black text-sm shadow-lg cursor-pointer"
                >
                  繼續合成精靈
                </button>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 bg-white/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in">
                <span className="text-4xl">🍬</span>
                <h3 className="text-xl font-black text-slate-900">糖果罐滿瀉結算！</h3>
                <p className="text-3xl font-black font-mono text-pink-600">{score} 分</p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />+{coinsAwarded} 王國星幣
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-violet-100 text-violet-700">
                    最高進化：{MERGE_EVOLUTION_CHAIN[maxReachedTier].item.name}
                  </span>
                </div>
                {syncStatus && (
                  <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-pink-500" />
                    {syncStatus === 'cloud' ? '已同步至雲端全服榜' : '已保存本機與排行紀錄'}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={initNewGame}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black text-sm shadow-md cursor-pointer"
                  >
                    再玩一罐
                  </button>
                  {onOpenMyRecords && (
                    <button
                      type="button"
                      onClick={onOpenMyRecords}
                      className="px-4 py-2.5 rounded-2xl bg-pink-50 text-pink-700 border border-pink-200 font-black text-sm cursor-pointer"
                    >
                      查看排行榜
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Powerups */}
          <div className="w-full max-w-[380px] grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={shakeCharges <= 0 || isPaused || isGameOver}
              onClick={handleShakeJar}
              className="py-2.5 px-3 rounded-2xl bg-white border border-pink-200 hover:border-pink-400 text-xs font-black text-slate-700 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-45"
            >
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>搖晃盲盒罐 ({shakeCharges})</span>
            </button>
            <button
              type="button"
              disabled={popMiniCharges <= 0 || isPaused || isGameOver}
              onClick={handlePopMinis}
              className="py-2.5 px-3 rounded-2xl bg-white border border-violet-200 hover:border-violet-400 text-xs font-black text-slate-700 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-45"
            >
              <Wand2 className="w-4 h-4 text-violet-500" />
              <span>消除最小兩級 ({popMiniCharges})</span>
            </button>
          </div>
        </div>

        {/* Right Info Panel: Evolution Chart + Global Best */}
        <div className="lg:col-span-5 space-y-3">
          {publicBest && (
            <div className="bg-gradient-to-r from-amber-50 to-pink-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-amber-700 block">全服合成罐冠軍</span>
                  <span className="text-xs font-black text-slate-800 truncate block">
                    {publicBest.displayName}
                  </span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-rose-600">{publicBest.highScore} 分</span>
            </div>
          )}

          <div className="bg-white/95 border border-pink-200 rounded-3xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">🌟 10 階精靈進化合成表</h3>
              <span className="text-[11px] font-bold text-pink-600">合成第 6 階以上送閃卡圖鑑！</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MERGE_EVOLUTION_CHAIN.map((step) => {
                const reached = step.tier <= maxReachedTier;
                return (
                  <div
                    key={step.item.id}
                    className={`p-2 rounded-2xl border flex items-center gap-2 transition-all ${
                      reached
                        ? 'bg-pink-50/90 border-pink-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200/80 opacity-75'
                    }`}
                  >
                    {step.item.imageUrl && (
                      <img
                        src={step.item.imageUrl}
                        alt={step.item.name}
                        className="w-8 h-8 rounded-full object-cover border border-pink-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-800 truncate">
                        {step.tier + 1}. {step.item.name}
                      </p>
                      <p className="text-[10px] font-bold text-pink-500 font-mono">+{step.points} 分</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpiritMergeGame;
