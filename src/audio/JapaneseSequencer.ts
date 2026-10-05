export class JapaneseSequencer {
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private lookahead: number = 25.0; // 檢查間隔 (ms)
  private scheduleAheadTime: number = 0.12; // 預先排程窗口 (s)
  private timerId: number | null = null;
  public isBossMode: boolean = false;

  // 擴充日本陰旋法與都節音階 (Insen & Miyako-bushi Scales) 雙八度音階表
  private insenFreqs = [
    146.83, // D3 (低音大古箏)
    155.56, // Eb3
    196.00, // G3
    220.00, // A3
    261.63, // C4
    293.66, // D4
    311.13, // Eb4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    622.25, // Eb5
    783.99, // G5
    880.00, // A5
  ];

  // 16 步太鼓律動 (Nagado 大太鼓 / Shime-daiko 締太鼓)
  private taikoPatternNormal = [1, 0, 0, 1,  0, 2, 1, 0,  1, 0, 2, 1,  0, 1, 2, 0];
  private taikoPatternBoss   = [1, 2, 0, 1,  2, 1, 2, 1,  1, 2, 1, 2,  2, 1, 2, 2];

  // 古箏撥弦旋律樣式
  private kotoPatternNormal  = [5, 7, 9, 8,  10, 9, 7, 6,  5, 8, 10, 9,  12, 10, 9, 7];
  private kotoPatternBoss    = [5, 9, 12, 9, 10, 12, 13, 12, 9, 12, 10, 8, 7, 9, 10, 12];
  private kotoActiveNormal   = [1, 0, 1, 1,  0, 1, 1, 0,   1, 1, 0, 1,   1, 0, 1, 1];
  private kotoActiveBoss     = [1, 1, 1, 1,  0, 1, 1, 1,   1, 1, 1, 1,   1, 1, 1, 1];

  constructor(private ctx: AudioContext, private out: GainNode) {}

  public start(bpm: number, startTime: number = 0, isBoss: boolean = false): void {
    this.bpm = bpm;
    this.isBossMode = isBoss;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = startTime > 0 ? startTime : this.ctx.currentTime + 0.05;
    this.runScheduler();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public setBpm(newBpm: number): void {
    this.bpm = newBpm;
  }

  public setBossMode(boss: boolean): void {
    this.isBossMode = boss;
  }

  private runScheduler = (): void => {
    if (!this.isPlaying) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }

    this.timerId = window.setTimeout(this.runScheduler, this.lookahead);
  };

  private advanceStep(): void {
    const secondsPer16th = (60 / this.bpm) / 4;
    this.nextNoteTime += secondsPer16th;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(step: number, time: number): void {
    if (this.ctx.state !== 'running') return;

    const taikoPattern = this.isBossMode ? this.taikoPatternBoss : this.taikoPatternNormal;
    const kotoPattern  = this.isBossMode ? this.kotoPatternBoss : this.kotoPatternNormal;
    const kotoActive   = this.isBossMode ? this.kotoActiveBoss : this.kotoActiveNormal;

    // 1. 太鼓層 (1: Nagado 大太鼓, 2: Shime-daiko 締太鼓輕敲)
    const taikoVal = taikoPattern[step];
    if (taikoVal === 1) {
      const isHeavy = step === 0 || step === 8;
      this.playScheduledNagado(time, isHeavy);
    } else if (taikoVal === 2) {
      this.playScheduledShime(time);
    }

    // 2. 古箏層 (Koto Pluck & Arpeggios)
    if (kotoActive[step] === 1) {
      const noteIdx = kotoPattern[step] % this.insenFreqs.length;
      const freq = this.insenFreqs[noteIdx];
      const isAccent = step % 4 === 0;
      this.playScheduledKoto(time, freq, isAccent);

      // Boss 戰或第 0 步演奏雙音和弦 (Chord Harmony)
      if (this.isBossMode && (step === 0 || step === 8)) {
        const bassFreq = this.insenFreqs[Math.max(0, noteIdx - 5)];
        this.playScheduledKoto(time + 0.015, bassFreq, true, 0.4);
      }
    }

    // 3. 拍子木 (Hyoshigi)
    if (step === 4 || step === 12 || (this.isBossMode && (step === 2 || step === 10))) {
      this.playScheduledHyoshigi(time);
    }
  }

  // 大太鼓 (Nagado-taiko) 深沉低音
  private playScheduledNagado(time: number, isAccent: boolean): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = isAccent ? 140 : 105;
    const endFreq = 34;
    const dur = isAccent ? 0.26 : 0.18;
    const vol = isAccent ? 0.65 : 0.42;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + dur);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + dur);
  }

  // 締太鼓 (Shime-daiko) 清脆高頻拍擊
  private playScheduledShime(time: number): void {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, time);
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.09);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, time);
    filter.Q.value = 6;

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.09);
  }

  // 古箏撥弦 (Koto) 帶金石韻味三角波 + 顫音
  private playScheduledKoto(time: number, freq: number, isAccent: boolean, volScale: number = 1.0): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const dur = isAccent ? 0.38 : 0.24;
    const vol = (isAccent ? 0.34 : 0.22) * volScale;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.003); // 極快撥弦
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + dur);
  }

  // 拍子木 (Hyoshigi)
  private playScheduledHyoshigi(time: number): void {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(840, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(840, time);
    filter.Q.setValueAtTime(12, time);

    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.07);
  }
}
