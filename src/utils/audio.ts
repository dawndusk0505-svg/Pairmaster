/**
 * Cross-platform Audio Engine:
 * - Synthesizes crisp Web Audio API SFX (with iOS audioSession + user-gesture unlock & safe resume)
 * - Generates an in-memory 16-bit PCM WAV for the "Happy Birthday to You" music-box song
 *   so HTML5 <audio> plays reliably across Desktop, Android, and iOS/iPadOS (even in Silent Mode).
 */

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';
  };
};

interface BirthdayNote {
  f: number;
  d: number;
  gap?: number;
  isFinal?: boolean;
}

const HAPPY_BIRTHDAY_MELODY: BirthdayNote[] = [
  // Phrase 1: Hap-py birth-day to you
  { f: 523.25, d: 0.25 }, // C5
  { f: 523.25, d: 0.17 }, // C5
  { f: 587.33, d: 0.40 }, // D5
  { f: 523.25, d: 0.40 }, // C5
  { f: 698.46, d: 0.40 }, // F5
  { f: 659.25, d: 0.72, gap: 0.09 }, // E5

  // Phrase 2: Hap-py birth-day to you
  { f: 523.25, d: 0.25 }, // C5
  { f: 523.25, d: 0.17 }, // C5
  { f: 587.33, d: 0.40 }, // D5
  { f: 523.25, d: 0.40 }, // C5
  { f: 783.99, d: 0.40 }, // G5
  { f: 698.46, d: 0.72, gap: 0.09 }, // F5

  // Phrase 3: Hap-py birth-day dear superstar
  { f: 523.25, d: 0.25 }, // C5
  { f: 523.25, d: 0.17 }, // C5
  { f: 1046.5, d: 0.40 }, // C6
  { f: 880.0, d: 0.40 },  // A5
  { f: 698.46, d: 0.40 }, // F5
  { f: 659.25, d: 0.40 }, // E5
  { f: 587.33, d: 0.68, gap: 0.09 }, // D5

  // Phrase 4: Hap-py birth-day to you!
  { f: 932.33, d: 0.25 }, // Bb5
  { f: 932.33, d: 0.17 }, // Bb5
  { f: 880.0, d: 0.40 },  // A5
  { f: 698.46, d: 0.40 }, // F5
  { f: 783.99, d: 0.40 }, // G5
  { f: 698.46, d: 1.05, isFinal: true }, // F5
];

function buildHappyBirthdayWavUrl(): string {
  const sampleRate = 24000;
  let totalDuration = 0.05;
  const scheduled = HAPPY_BIRTHDAY_MELODY.map((note) => {
    const start = totalDuration;
    totalDuration += note.d + (note.gap ?? 0.025);
    return { ...note, start };
  });
  totalDuration += 0.25;

  const numSamples = Math.ceil(totalDuration * sampleRate);
  const floatSamples = new Float32Array(numSamples);

  for (const note of scheduled) {
    const startIdx = Math.floor(note.start * sampleRate);
    const noteLengthSec = note.d + 0.12;
    const noteSamples = Math.floor(noteLengthSec * sampleRate);
    const attackSamples = Math.max(1, Math.floor(0.014 * sampleRate));
    const decayRate = note.isFinal ? 2.4 : 4.2;

    for (let i = 0; i < noteSamples; i++) {
      const idx = startIdx + i;
      if (idx >= numSamples) break;
      const t = i / sampleRate;
      const envAttack = i < attackSamples ? i / attackSamples : 1;
      const envDecay = Math.exp(-t * decayRate);
      const envTail = t > note.d ? Math.max(0, 1 - (t - note.d) / 0.12) : 1;
      const env = envAttack * envDecay * envTail;

      // Music-box / celesta voice: warm fundamental + octave shimmer + bell chime transient
      let sample =
        Math.sin(2 * Math.PI * note.f * t) * 0.62 +
        Math.sin(2 * Math.PI * note.f * 2 * t) * 0.22 +
        Math.sin(2 * Math.PI * note.f * 3 * t) * 0.09 * Math.exp(-t * 9);

      // Gentle F-major accompaniment chord on final note
      if (note.isFinal) {
        sample +=
          (Math.sin(2 * Math.PI * 349.23 * t) * 0.28 +
            Math.sin(2 * Math.PI * 440.0 * t) * 0.22 +
            Math.sin(2 * Math.PI * 523.25 * t) * 0.18) *
          Math.exp(-t * 1.9);
      }

      floatSamples[idx] += sample * env;
    }
  }

  // Normalize peak to 0.82 so it is crisp & clearly audible without clipping
  let maxAmp = 0.0001;
  for (let i = 0; i < numSamples; i++) {
    const abs = Math.abs(floatSamples[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  const norm = 0.82 / maxAmp;

  // Build 16-bit mono PCM WAV container
  const dataBytes = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, floatSamples[i] * norm));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private birthdayNodes: OscillatorNode[] = [];
  private birthdayMasterGain: GainNode | null = null;
  private birthdayAudio: HTMLAudioElement | null = null;
  private birthdayOnEnded: (() => void) | null = null;
  private birthdayWavUrl: string | null = null;
  private gestureUnlockBound: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('pairmaster_audio_muted');
      if (saved !== null) {
        this.isMuted = JSON.parse(saved);
      }
    } catch {
      this.isMuted = false;
    }

    this.bindGlobalUnlock();
  }

  private enablePlaybackAudioSession() {
    if (typeof navigator !== 'undefined') {
      const nav = navigator as AudioSessionNavigator;
      if (nav.audioSession && nav.audioSession.type !== 'playback') {
        try {
          nav.audioSession.type = 'playback';
        } catch {
          // Ignore unsupported audioSession assignment
        }
      }
    }
  }

  private bindGlobalUnlock() {
    if (this.gestureUnlockBound || typeof window === 'undefined') return;
    this.gestureUnlockBound = true;

    const unlock = () => {
      if (this.isMuted) return;
      this.enablePlaybackAudioSession();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
    };

    window.addEventListener('touchend', unlock, { capture: true, passive: true });
    window.addEventListener('click', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  private initContext(): AudioContext | null {
    this.enablePlaybackAudioSession();
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignore if called before user gesture
      });
    }
    return this.ctx;
  }

  /**
   * Ensures AudioContext is running before scheduling short Web Audio SFX so brief 60ms tones
   * aren't skipped while hardware wakes up from suspended state.
   */
  private withRunningContext(fn: (ctx: AudioContext) => void) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    if (ctx.state === 'running') {
      fn(ctx);
      return;
    }

    ctx
      .resume()
      .then(() => {
        if (!this.isMuted && (ctx.state as string) === 'running') {
          fn(ctx);
        }
      })
      .catch(() => {
        // Autoplay policy blocked resume before gesture
      });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopHappyBirthday();
    }
    try {
      localStorage.setItem('pairmaster_audio_muted', JSON.stringify(this.isMuted));
    } catch {
      // ignore
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Snappy wooden card flip sound
   */
  public playCardFlip() {
    this.withRunningContext((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(145, now + 0.09);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  /**
   * Harmonious chime on pair match, ascending pitch with combo
   */
  public playMatchSuccess(combo: number = 1) {
    this.withRunningContext((ctx) => {
      const baseFreqs = [523.25, 659.25, 783.99, 1046.5];
      const multiplier = Math.min(1 + (combo - 1) * 0.12, 1.8);
      const now = ctx.currentTime;

      [0, 1].forEach((idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const freq =
          (baseFreqs[(idx + Math.min(combo - 1, 2)) % baseFreqs.length] || 523.25) * multiplier;
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.36);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.38);
      });
    });
  }

  /**
   * Subtle soft mismatch sound
   */
  public playMismatch() {
    this.withRunningContext((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(185, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  /**
   * Shimmering sparkle for power-ups (Peek, Freeze, Shuffle)
   */
  public playPowerUp() {
    this.withRunningContext((ctx) => {
      const now = ctx.currentTime;
      const freqs = [587.33, 739.99, 880.0, 1174.66];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.26);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.28);
      });
    });
  }

  /**
   * High-energy victory fanfare
   */
  public playVictory() {
    this.withRunningContext((ctx) => {
      const notes = [
        { f: 523.25, d: 0.12 },
        { f: 659.25, d: 0.12 },
        { f: 783.99, d: 0.12 },
        { f: 1046.5, d: 0.42 },
      ];

      let offset = 0;
      const now = ctx.currentTime;
      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + offset);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.3, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + note.d + 0.05);

        offset += note.d * 0.9;
      });
    });
  }

  /**
   * Tactile button click
   */
  public playClick() {
    this.withRunningContext((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    });
  }

  /**
   * Laser ping for tile link connect
   */
  public playLinkLine() {
    this.withRunningContext((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.13);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  private getHappyBirthdayWavUrl(): string {
    if (!this.birthdayWavUrl) {
      this.birthdayWavUrl = buildHappyBirthdayWavUrl();
    }
    return this.birthdayWavUrl;
  }

  /**
   * Stop any currently playing Happy Birthday melody cleanly
   */
  public stopHappyBirthday() {
    const onEndedCb = this.birthdayOnEnded;
    this.birthdayOnEnded = null;

    if (this.birthdayAudio) {
      try {
        this.birthdayAudio.pause();
        this.birthdayAudio.currentTime = 0;
        this.birthdayAudio.onended = null;
      } catch {
        // Ignore
      }
      this.birthdayAudio = null;
    }

    this.birthdayNodes.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Node already stopped or disconnected
      }
    });
    this.birthdayNodes = [];
    if (this.birthdayMasterGain) {
      try {
        this.birthdayMasterGain.disconnect();
      } catch {
        // Already disconnected
      }
      this.birthdayMasterGain = null;
    }

    onEndedCb?.();
  }

  private playHappyBirthdayWebAudioFallback(onEnded?: () => void): boolean {
    const ctx = this.initContext();
    if (!ctx || (ctx.state as string) !== 'running') return false;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.45, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.birthdayMasterGain = masterGain;
    this.birthdayOnEnded = onEnded ?? null;

    let offset = 0.04;
    const now = ctx.currentTime;

    HAPPY_BIRTHDAY_MELODY.forEach((note, idx) => {
      const startTime = now + offset;
      const stopTime = startTime + note.d + 0.1;

      const mainOsc = ctx.createOscillator();
      const mainGain = ctx.createGain();
      mainOsc.type = 'triangle';
      mainOsc.frequency.setValueAtTime(note.f, startTime);

      mainGain.gain.setValueAtTime(0.0001, startTime);
      mainGain.gain.linearRampToValueAtTime(0.7, startTime + 0.015);
      mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d + 0.05);

      mainOsc.connect(mainGain);
      mainGain.connect(masterGain);
      mainOsc.start(startTime);
      mainOsc.stop(stopTime);
      this.birthdayNodes.push(mainOsc);

      if (idx === HAPPY_BIRTHDAY_MELODY.length - 1) {
        mainOsc.onended = () => {
          const cb = this.birthdayOnEnded;
          this.birthdayOnEnded = null;
          cb?.();
        };
      }

      offset += note.d + (note.gap ?? 0.025);
    });

    return true;
  }

  /**
   * Plays synthesized PCM WAV "Happy Birthday to You" via HTML5 <audio> (bypasses iOS Silent Switch),
   * calling audio.play() synchronously before awaiting so mobile Safari & Chrome accept the user gesture.
   */
  public async playHappyBirthday(onEnded?: () => void): Promise<'played' | 'muted' | 'blocked'> {
    if (this.isMuted) return 'muted';
    if (typeof window === 'undefined') return 'blocked';

    this.enablePlaybackAudioSession();
    this.stopHappyBirthday();
    this.birthdayOnEnded = onEnded ?? null;

    try {
      const wavUrl = this.getHappyBirthdayWavUrl();
      const audio = new Audio(wavUrl);
      audio.volume = 0.9;
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      audio.onended = () => {
        if (this.birthdayAudio === audio) {
          this.birthdayAudio = null;
        }
        const cb = this.birthdayOnEnded;
        this.birthdayOnEnded = null;
        cb?.();
      };
      this.birthdayAudio = audio;

      // IMPORTANT: Call play() synchronously before any `await` so user gesture activation isn't lost.
      await audio.play();
      return 'played';
    } catch (err) {
      this.birthdayAudio = null;
      this.birthdayOnEnded = null;
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError') {
        return 'blocked';
      }

      // Non-autoplay failure fallback to Web Audio oscillator synthesis
      const ctx = this.initContext();
      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          return 'blocked';
        }
      }
      return this.playHappyBirthdayWebAudioFallback(onEnded) ? 'played' : 'blocked';
    }
  }
}

export const soundFx = new SoundEffects();
