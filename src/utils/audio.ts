/**
 * Cross-platform Audio Engine:
 * - Synthesizes gentle, musical, Candy-Kingdom 16-bit PCM WAV sounds in memory
 *   (soft sine/glockenspiel envelopes, comfortable balanced mastering, zero harsh sweeps)
 * - Uses pre-warmed polyphonic HTML5 <audio> pools so all sounds play cleanly across
 *   Desktop, Android, and iOS/iPadOS Safari (even with Silent Switch toggled ON)
 * - Pre-renders Combo pitch steps directly in PCM so playbackRate DSP warping never occurs
 */

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';
  };
};

interface NoteSpec {
  f: number;
  d: number;
  gap?: number;
  isFinal?: boolean;
}

type SfxKey =
  | 'click'
  | 'flip'
  | 'match1'
  | 'match2'
  | 'match3'
  | 'match4'
  | 'match5'
  | 'mismatch'
  | 'powerup'
  | 'link';

const HAPPY_BIRTHDAY_MELODY: NoteSpec[] = [
  // Phrase 1: Hap-py birth-day to you
  { f: 523.25, d: 0.25 },
  { f: 523.25, d: 0.17 },
  { f: 587.33, d: 0.40 },
  { f: 523.25, d: 0.40 },
  { f: 698.46, d: 0.40 },
  { f: 659.25, d: 0.72, gap: 0.09 },

  // Phrase 2: Hap-py birth-day to you
  { f: 523.25, d: 0.25 },
  { f: 523.25, d: 0.17 },
  { f: 587.33, d: 0.40 },
  { f: 523.25, d: 0.40 },
  { f: 783.99, d: 0.40 },
  { f: 698.46, d: 0.72, gap: 0.09 },

  // Phrase 3: Hap-py birth-day dear superstar
  { f: 523.25, d: 0.25 },
  { f: 523.25, d: 0.17 },
  { f: 1046.5, d: 0.40 },
  { f: 880.0, d: 0.40 },
  { f: 698.46, d: 0.40 },
  { f: 659.25, d: 0.40 },
  { f: 587.33, d: 0.68, gap: 0.09 },

  // Phrase 4: Hap-py birth-day to you!
  { f: 932.33, d: 0.25 },
  { f: 932.33, d: 0.17 },
  { f: 880.0, d: 0.40 },
  { f: 698.46, d: 0.40 },
  { f: 783.99, d: 0.40 },
  { f: 698.46, d: 1.05, isFinal: true },
];

function encodeWavDataUri(
  floatSamples: Float32Array,
  sampleRate: number,
  targetPeak: number = 0.55
): string {
  const numSamples = floatSamples.length;
  let maxAmp = 0;
  for (let i = 0; i < numSamples; i++) {
    const abs = Math.abs(floatSamples[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  const norm = maxAmp > 0.0001 ? targetPeak / maxAmp : 0;

  const dataBytes = numSamples * 2;
  const totalBytes = 44 + dataBytes;
  const buffer = new ArrayBuffer(totalBytes);
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
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, floatSamples[i] * norm));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Pure, gentle marimba/bubble tap (smooth sine fade-in/fade-out, zero aliasing or buzz)
 */
function renderSoftPluckWav(
  startFreq: number,
  endFreq: number,
  durationSec: number,
  peak: number = 0.45,
  sampleRate: number = 22050
): string {
  const numSamples = Math.ceil(durationSec * sampleRate);
  const samples = new Float32Array(numSamples);
  let phase = 0;
  const attackSamples = Math.max(1, Math.floor(0.005 * sampleRate));
  const tailSamples = Math.max(1, Math.floor(0.012 * sampleRate));

  for (let i = 0; i < numSamples; i++) {
    const progress = i / numSamples;
    const freq = startFreq + (endFreq - startFreq) * progress;
    phase += (2 * Math.PI * freq) / sampleRate;

    const envAttack = i < attackSamples ? i / attackSamples : 1;
    const envEnd = i > numSamples - tailSamples ? (numSamples - i) / tailSamples : 1;
    const envDecay = Math.exp(-progress * 4.5);
    samples[i] = Math.sin(phase) * envAttack * envEnd * envDecay;
  }

  return encodeWavDataUri(samples, sampleRate, peak);
}

/**
 * Sweet glockenspiel / music-box notes with smooth fade-out tail (zero clicks)
 */
function renderBellNotesWav(
  notes: Array<{ f: number; offset: number; dur: number; shimmer?: number }>,
  totalSec: number,
  peak: number = 0.52,
  sampleRate: number = 22050
): string {
  const numSamples = Math.ceil(totalSec * sampleRate);
  const samples = new Float32Array(numSamples);

  for (const note of notes) {
    const startIdx = Math.floor(note.offset * sampleRate);
    const noteSamples = Math.floor(note.dur * sampleRate);
    const attackSamples = Math.max(1, Math.floor(0.008 * sampleRate));
    const tailSamples = Math.max(1, Math.floor(0.025 * sampleRate));
    const shimmer = note.shimmer ?? 0.14;

    for (let i = 0; i < noteSamples; i++) {
      const idx = startIdx + i;
      if (idx >= numSamples) break;
      const t = i / sampleRate;
      const envAttack = i < attackSamples ? i / attackSamples : 1;
      const envEnd = i > noteSamples - tailSamples ? (noteSamples - i) / tailSamples : 1;
      const envDecay = Math.exp(-t * (4.8 / Math.max(note.dur, 0.12)));

      const s =
        Math.sin(2 * Math.PI * note.f * t) * 0.85 +
        Math.sin(2 * Math.PI * note.f * 2 * t) * shimmer * Math.exp(-t * 8);
      samples[idx] += s * envAttack * envEnd * envDecay;
    }
  }

  return encodeWavDataUri(samples, sampleRate, peak);
}

function renderHappyBirthdayWav(): string {
  const sampleRate = 22050;
  let totalDuration = 0.05;
  const scheduled = HAPPY_BIRTHDAY_MELODY.map((note) => {
    const start = totalDuration;
    totalDuration += note.d + (note.gap ?? 0.025);
    return { ...note, start };
  });
  totalDuration += 0.3;

  const numSamples = Math.ceil(totalDuration * sampleRate);
  const samples = new Float32Array(numSamples);

  for (const note of scheduled) {
    const startIdx = Math.floor(note.start * sampleRate);
    const noteLengthSec = note.d + 0.14;
    const noteSamples = Math.floor(noteLengthSec * sampleRate);
    const attackSamples = Math.max(1, Math.floor(0.014 * sampleRate));
    const decayRate = note.isFinal ? 2.4 : 4.2;

    for (let i = 0; i < noteSamples; i++) {
      const idx = startIdx + i;
      if (idx >= numSamples) break;
      const t = i / sampleRate;
      const envAttack = i < attackSamples ? i / attackSamples : 1;
      const envDecay = Math.exp(-t * decayRate);
      const envTail = t > note.d ? Math.max(0, 1 - (t - note.d) / 0.14) : 1;
      const env = envAttack * envDecay * envTail;

      let sample =
        Math.sin(2 * Math.PI * note.f * t) * 0.65 +
        Math.sin(2 * Math.PI * note.f * 2 * t) * 0.2 +
        Math.sin(2 * Math.PI * note.f * 3 * t) * 0.06 * Math.exp(-t * 9);

      if (note.isFinal) {
        sample +=
          (Math.sin(2 * Math.PI * 349.23 * t) * 0.26 +
            Math.sin(2 * Math.PI * 440.0 * t) * 0.2 +
            Math.sin(2 * Math.PI * 523.25 * t) * 0.16) *
          Math.exp(-t * 1.9);
      }

      samples[idx] += sample * env;
    }
  }

  return encodeWavDataUri(samples, sampleRate, 0.62);
}

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();

  private sfxUris: Partial<Record<SfxKey | 'victory' | 'birthday' | 'silent', string>> = {};
  private sfxPools: Partial<Record<SfxKey, HTMLAudioElement[]>> = {};
  private sfxPoolCursor: Record<SfxKey, number> = {
    click: 0,
    flip: 0,
    match1: 0,
    match2: 0,
    match3: 0,
    match4: 0,
    match5: 0,
    mismatch: 0,
    powerup: 0,
    link: 0,
  };

  private victoryAudio: HTMLAudioElement | null = null;
  private victoryUnlocked: boolean = false;
  private victoryUnlockInFlight: boolean = false;

  private birthdayAudio: HTMLAudioElement | null = null;
  private birthdayOnEnded: (() => void) | null = null;
  private birthdayNodes: OscillatorNode[] = [];
  private birthdayMasterGain: GainNode | null = null;

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

  public subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.isMuted);
      } catch {
        // Ignore subscriber error
      }
    });
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

  private getUri(key: SfxKey | 'victory' | 'birthday' | 'silent'): string {
    if (this.sfxUris[key]) return this.sfxUris[key]!;

    let uri = '';
    switch (key) {
      case 'silent':
        uri = encodeWavDataUri(new Float32Array(400), 22050, 0);
        break;
      case 'click':
        // Crisp light marimba UI tap
        uri = renderSoftPluckWav(740, 520, 0.048, 0.36);
        break;
      case 'flip':
        // Light upward airy card-turn pop
        uri = renderSoftPluckWav(390, 580, 0.072, 0.42);
        break;
      case 'mismatch':
        // Gentle two-note marimba "E4 -> C4"
        uri = renderBellNotesWav(
          [
            { f: 329.63, offset: 0, dur: 0.09, shimmer: 0.04 },
            { f: 261.63, offset: 0.08, dur: 0.14, shimmer: 0.04 },
          ],
          0.24,
          0.42
        );
        break;
      case 'link':
        // Crisp musical 2-note chime G5 -> C6
        uri = renderBellNotesWav(
          [
            { f: 783.99, offset: 0, dur: 0.09, shimmer: 0.1 },
            { f: 1046.5, offset: 0.045, dur: 0.14, shimmer: 0.14 },
          ],
          0.2,
          0.46
        );
        break;
      case 'match1':
        uri = renderBellNotesWav(
          [
            { f: 523.25, offset: 0, dur: 0.22 },
            { f: 659.25, offset: 0.06, dur: 0.28 },
          ],
          0.36,
          0.52
        );
        break;
      case 'match2':
        uri = renderBellNotesWav(
          [
            { f: 587.33, offset: 0, dur: 0.22 },
            { f: 739.99, offset: 0.06, dur: 0.28 },
          ],
          0.36,
          0.52
        );
        break;
      case 'match3':
        uri = renderBellNotesWav(
          [
            { f: 659.25, offset: 0, dur: 0.22 },
            { f: 830.61, offset: 0.06, dur: 0.28 },
          ],
          0.36,
          0.52
        );
        break;
      case 'match4':
        uri = renderBellNotesWav(
          [
            { f: 783.99, offset: 0, dur: 0.22 },
            { f: 987.77, offset: 0.06, dur: 0.28 },
          ],
          0.36,
          0.52
        );
        break;
      case 'match5':
        uri = renderBellNotesWav(
          [
            { f: 880.0, offset: 0, dur: 0.22 },
            { f: 1046.5, offset: 0.06, dur: 0.3 },
          ],
          0.38,
          0.52
        );
        break;
      case 'powerup':
        uri = renderBellNotesWav(
          [
            { f: 587.33, offset: 0, dur: 0.14 },
            { f: 739.99, offset: 0.045, dur: 0.16 },
            { f: 880.0, offset: 0.09, dur: 0.18 },
            { f: 1174.66, offset: 0.135, dur: 0.24 },
          ],
          0.39,
          0.48
        );
        break;
      case 'victory':
        uri = renderBellNotesWav(
          [
            { f: 523.25, offset: 0, dur: 0.14 },
            { f: 659.25, offset: 0.11, dur: 0.14 },
            { f: 783.99, offset: 0.22, dur: 0.14 },
            { f: 1046.5, offset: 0.33, dur: 0.44 },
            { f: 523.25, offset: 0.33, dur: 0.44, shimmer: 0 },
            { f: 783.99, offset: 0.33, dur: 0.44, shimmer: 0 },
          ],
          0.8,
          0.56
        );
        break;
      case 'birthday':
        uri = renderHappyBirthdayWav();
        break;
    }

    this.sfxUris[key] = uri;
    return uri;
  }

  private getPool(key: SfxKey): HTMLAudioElement[] {
    if (this.sfxPools[key]) return this.sfxPools[key]!;
    const uri = this.getUri(key);
    const pool = [0, 1, 2].map(() => {
      const el = new Audio(uri);
      el.preload = 'auto';
      el.setAttribute('playsinline', 'true');
      return el;
    });
    this.sfxPools[key] = pool;
    return pool;
  }

  private getVictoryAudio(): HTMLAudioElement {
    if (!this.victoryAudio) {
      const el = new Audio(this.getUri('victory'));
      el.preload = 'auto';
      el.setAttribute('playsinline', 'true');
      this.victoryAudio = el;
    }
    return this.victoryAudio;
  }

  private unlockDelayedAudioElements() {
    if (this.isMuted || typeof window === 'undefined') return;
    this.enablePlaybackAudioSession();

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    if (!this.victoryUnlocked && !this.victoryUnlockInFlight) {
      this.victoryUnlockInFlight = true;
      const vEl = this.getVictoryAudio();
      vEl.src = this.getUri('silent');
      vEl.volume = 0;
      vEl
        .play()
        .then(() => {
          window.setTimeout(() => {
            vEl.pause();
            vEl.src = this.getUri('victory');
            vEl.volume = 0.65;
            vEl.load();
            this.victoryUnlocked = true;
            this.victoryUnlockInFlight = false;
          }, 35);
        })
        .catch(() => {
          vEl.src = this.getUri('victory');
          vEl.volume = 0.65;
          this.victoryUnlockInFlight = false;
        });
    }
  }

  private bindGlobalUnlock() {
    if (this.gestureUnlockBound || typeof window === 'undefined') return;
    this.gestureUnlockBound = true;

    const unlock = () => {
      this.unlockDelayedAudioElements();
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
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playWebAudioTone(freq: number, dur: number, type: OscillatorType = 'sine', vol: number = 0.15) {
    const ctx = this.initContext();
    if (!ctx || (ctx.state as string) !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private playSfx(key: SfxKey, volume: number = 0.6, fallbackFreq: number = 520) {
    if (this.isMuted || typeof window === 'undefined') return;
    this.enablePlaybackAudioSession();

    try {
      const pool = this.getPool(key);
      const idx = this.sfxPoolCursor[key];
      this.sfxPoolCursor[key] = (idx + 1) % pool.length;
      const el = pool[idx];

      if (el.readyState >= 1 && el.currentTime > 0) {
        try {
          el.currentTime = 0;
        } catch {
          // Ignore seek errors on unbuffered elements
        }
      }
      el.volume = volume;

      const p = el.play();
      if (p) {
        p.catch(() => {
          this.playWebAudioTone(fallbackFreq, 0.08, 'sine', 0.14);
        });
      }
    } catch {
      this.playWebAudioTone(fallbackFreq, 0.08, 'sine', 0.14);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopHappyBirthday();
    } else {
      this.unlockDelayedAudioElements();
    }
    try {
      localStorage.setItem('pairmaster_audio_muted', JSON.stringify(this.isMuted));
    } catch {
      // ignore
    }
    this.notifyListeners();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playCardFlip() {
    this.playSfx('flip', 0.55, 440);
  }

  public playMatchSuccess(combo: number = 1) {
    const step = Math.min(5, Math.max(1, combo)) as 1 | 2 | 3 | 4 | 5;
    this.playSfx(`match${step}`, 0.62, 659.25);
  }

  public playMismatch() {
    this.playSfx('mismatch', 0.52, 262);
  }

  public playPowerUp() {
    this.playSfx('powerup', 0.58, 740);
  }

  public playClick() {
    this.playSfx('click', 0.45, 580);
  }

  public playLinkLine() {
    this.playSfx('link', 0.56, 784);
  }

  public playVictory() {
    if (this.isMuted || typeof window === 'undefined') return;
    this.enablePlaybackAudioSession();

    try {
      const el = this.getVictoryAudio();
      if (el.src !== this.getUri('victory')) {
        el.src = this.getUri('victory');
      }
      if (el.readyState >= 1 && el.currentTime > 0) {
        try {
          el.currentTime = 0;
        } catch {
          // ignore
        }
      }
      el.volume = 0.65;
      const p = el.play();
      if (p) {
        p.catch(() => {
          this.playWebAudioTone(784, 0.3, 'triangle', 0.18);
        });
      }
    } catch {
      this.playWebAudioTone(784, 0.3, 'triangle', 0.18);
    }
  }

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
    masterGain.gain.setValueAtTime(0.4, ctx.currentTime);
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
      mainGain.gain.linearRampToValueAtTime(0.65, startTime + 0.015);
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

  public async playHappyBirthday(onEnded?: () => void): Promise<'played' | 'muted' | 'blocked'> {
    if (this.isMuted) return 'muted';
    if (typeof window === 'undefined') return 'blocked';

    this.enablePlaybackAudioSession();
    this.stopHappyBirthday();
    this.birthdayOnEnded = onEnded ?? null;

    try {
      const wavUrl = this.getUri('birthday');
      const audio = new Audio(wavUrl);
      audio.volume = 0.68;
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

      await audio.play();
      return 'played';
    } catch (err) {
      this.birthdayAudio = null;
      this.birthdayOnEnded = null;
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError') {
        return 'blocked';
      }

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
