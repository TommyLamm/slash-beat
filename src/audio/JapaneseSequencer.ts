export class JapaneseSequencer {
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private lookahead: number = 25.0; // 檢查間隔 (ms)
  private scheduleAheadTime: number = 0.12; // 預先排程窗口 (s)
  private timerId: number | null = null;

  // 日本陰音階 (Insen Scale) 基礎頻率表 (D4, Eb4, G4, A4, C5, D5)
  private insenFreqs = [
    293.66, // D4
    311.13, // Eb4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    622.25, // Eb5
    783.99, // G5
  ];

  // 16 步和風律動樣式 (0: 太鼓重擊, 1: 古箏, 2: 拍子木/太鼓輕音)
  private taikoPattern = [1, 0, 0, 1,  0, 0, 1, 0,  1, 0, 0, 1,  0, 1, 0, 0];
  private kotoPattern  = [0, 2, 4, 3,  5, 4, 2, 1,  0, 3, 5, 4,  7, 5, 4, 2];
  private kotoActive   = [1, 0, 1, 1,  0, 1, 1, 0,  1, 1, 0, 1,  1, 0, 1, 1];

  constructor(private ctx: AudioContext, private out: GainNode) {}

  public start(bpm: number, startTime: number = 0): void {
    this.bpm = bpm;
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

  private runScheduler = (): void => {
    if (!this.isPlaying) return;

    // 將直到 nextNoteTime < currentTime + scheduleAheadTime 的音符排入排程
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }

    this.timerId = window.setTimeout(this.runScheduler, this.lookahead);
  };

  private advanceStep(): void {
    // 每個 step 是十六分音符 (1/4 拍)
    const secondsPer16th = (60 / this.bpm) / 4;
    this.nextNoteTime += secondsPer16th;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(step: number, time: number): void {
    if (this.ctx.state !== 'running') return;

    // 1. 太鼓鼓點
    if (this.taikoPattern[step] === 1) {
      const isAccent = step === 0 || step === 8;
      this.playScheduledTaiko(time, isAccent);
    }

    // 2. 日本陰旋法古箏撥弦
    if (this.kotoActive[step] === 1) {
      const noteIdx = this.kotoPattern[step] % this.insenFreqs.length;
      const freq = this.insenFreqs[noteIdx];
      this.playScheduledKoto(time, freq, step % 4 === 0);
    }

    // 3. 拍子木 (Hyoshigi) 偶數拍裝飾
    if (step === 4 || step === 12) {
      this.playScheduledHyoshigi(time);
    }
  }

  // 程式化太鼓
  private playScheduledTaiko(time: number, isAccent: boolean): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = isAccent ? 130 : 100;
    const endFreq = 38;
    const dur = isAccent ? 0.22 : 0.15;
    const vol = isAccent ? 0.6 : 0.4;

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

  // 程式化古箏 (三角波 + 快速衰減 + 微微顫音)
  private playScheduledKoto(time: number, freq: number, isAccent: boolean): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const dur = isAccent ? 0.35 : 0.22;
    const vol = isAccent ? 0.32 : 0.22;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.004); // 極快 Attack (撥弦手感)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + dur);
  }

  // 程式化和風拍子木
  private playScheduledHyoshigi(time: number): void {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(840, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(840, time);
    filter.Q.setValueAtTime(10, time);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  // 低 HP 心跳警示音
  public playHeartbeat(time: number): void {
    if (this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.18);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.18);
  }
}
