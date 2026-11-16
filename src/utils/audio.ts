/**
 * Web Audio API synthesized sound generator
 * No external assets required, instantaneous, reliable, and configurable.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private birthdayNodes: OscillatorNode[] = [];
  private birthdayMasterGain: GainNode | null = null;

  constructor() {
    // Read muted preference from localStorage if available
    try {
      const saved = localStorage.getItem('pairmaster_audio_muted');
      if (saved !== null) {
        this.isMuted = JSON.parse(saved);
      }
    } catch {
      this.isMuted = false;
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Autoplay policy may block resume before user gesture
      });
    }
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
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  /**
   * Harmonious chime on pair match, ascending pitch with combo
   */
  public playMatchSuccess(combo: number = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const baseFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const multiplier = Math.min(1 + (combo - 1) * 0.12, 1.8);

    const now = this.ctx.currentTime;
    [0, 1].forEach((idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const freq = (baseFreqs[(idx + Math.min(combo - 1, 2)) % baseFreqs.length] || 523.25) * multiplier;
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.38);
    });
  }

  /**
   * Subtle soft mismatch sound
   */
  public playMismatch() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.16);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  /**
   * Shimmering sparkle for power-ups (Peek, Freeze, Shuffle)
   */
  public playPowerUp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.28);
    });
  }

  /**
   * High-energy victory fanfare
   */
  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.5, d: 0.4 },  // C6
    ];

    let offset = 0;
    const now = this.ctx.currentTime;
    notes.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + offset);

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + note.d + 0.05);

      offset += note.d * 0.9;
    });
  }

  /**
   * Tactile button click
   */
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Laser ping for tile link connect
   */
  public playLinkLine() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Stop any currently playing Happy Birthday melody cleanly
   */
  public stopHappyBirthday() {
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
  }

  /**
   * Celebratory celesta/music-box "Happy Birthday to You" melody (F major).
   * Returns 'blocked' when browser autoplay policy prevents unmuted playback without user gesture.
   */
  public async playHappyBirthday(): Promise<'played' | 'muted' | 'blocked'> {
    if (this.isMuted) return 'muted';
    this.initContext();
    if (!this.ctx) return 'blocked';

    if (this.ctx.state !== 'running') {
      try {
        await Promise.race([
          this.ctx.resume().catch(() => {}),
          new Promise<void>((resolve) => setTimeout(resolve, 120)),
        ]);
      } catch {
        return 'blocked';
      }
    }

    if ((this.ctx.state as string) !== 'running') {
      return 'blocked';
    }

    this.stopHappyBirthday();

    const ctx = this.ctx;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.24, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.birthdayMasterGain = masterGain;

    // F Major (C5 pickup) - joyful, crisp music-box register
    const melody: Array<{ f: number; d: number; gap?: number; isFinal?: boolean }> = [
      // Phrase 1: Hap-py birth-day to you
      { f: 523.25, d: 0.25 }, // C5
      { f: 523.25, d: 0.16 }, // C5
      { f: 587.33, d: 0.40 }, // D5
      { f: 523.25, d: 0.40 }, // C5
      { f: 698.46, d: 0.40 }, // F5
      { f: 659.25, d: 0.72, gap: 0.08 }, // E5

      // Phrase 2: Hap-py birth-day to you
      { f: 523.25, d: 0.25 }, // C5
      { f: 523.25, d: 0.16 }, // C5
      { f: 587.33, d: 0.40 }, // D5
      { f: 523.25, d: 0.40 }, // C5
      { f: 783.99, d: 0.40 }, // G5
      { f: 698.46, d: 0.72, gap: 0.08 }, // F5

      // Phrase 3: Hap-py birth-day dear superstar
      { f: 523.25, d: 0.25 }, // C5
      { f: 523.25, d: 0.16 }, // C5
      { f: 1046.5, d: 0.40 }, // C6
      { f: 880.0, d: 0.40 },  // A5
      { f: 698.46, d: 0.40 }, // F5
      { f: 659.25, d: 0.40 }, // E5
      { f: 587.33, d: 0.68, gap: 0.08 }, // D5

      // Phrase 4: Hap-py birth-day to you!
      { f: 932.33, d: 0.25 }, // Bb5
      { f: 932.33, d: 0.16 }, // Bb5
      { f: 880.0, d: 0.40 },  // A5
      { f: 698.46, d: 0.40 }, // F5
      { f: 783.99, d: 0.40 }, // G5
      { f: 698.46, d: 0.98, isFinal: true }, // F5
    ];

    let offset = 0.04;
    const now = ctx.currentTime;

    melody.forEach((note) => {
      const startTime = now + offset;
      const stopTime = startTime + note.d + 0.08;

      // Warm fundamental voice
      const mainOsc = ctx.createOscillator();
      const mainGain = ctx.createGain();
      mainOsc.type = 'triangle';
      mainOsc.frequency.setValueAtTime(note.f, startTime);

      mainGain.gain.setValueAtTime(0.0001, startTime);
      mainGain.gain.linearRampToValueAtTime(0.55, startTime + 0.018);
      mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d + 0.04);

      mainOsc.connect(mainGain);
      mainGain.connect(masterGain);
      mainOsc.start(startTime);
      mainOsc.stop(stopTime);
      this.birthdayNodes.push(mainOsc);

      // Soft celesta octave shimmer
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(note.f * 2, startTime);

      shimmerGain.gain.setValueAtTime(0.0001, startTime);
      shimmerGain.gain.linearRampToValueAtTime(0.14, startTime + 0.015);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d * 0.85);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(masterGain);
      shimmerOsc.start(startTime);
      shimmerOsc.stop(stopTime);
      this.birthdayNodes.push(shimmerOsc);

      // Gentle F-major harmony chord on the final note
      if (note.isFinal) {
        [349.23, 440.0].forEach((chordFreq) => {
          const chordOsc = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chordOsc.type = 'sine';
          chordOsc.frequency.setValueAtTime(chordFreq, startTime);

          chordGain.gain.setValueAtTime(0.0001, startTime);
          chordGain.gain.linearRampToValueAtTime(0.22, startTime + 0.04);
          chordGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d + 0.06);

          chordOsc.connect(chordGain);
          chordGain.connect(masterGain);
          chordOsc.start(startTime);
          chordOsc.stop(stopTime);
          this.birthdayNodes.push(chordOsc);
        });
      }

      offset += note.d + (note.gap ?? 0.02);
    });

    return 'played';
  }
}

export const soundFx = new SoundEffects();
