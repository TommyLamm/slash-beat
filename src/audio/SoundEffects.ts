export class SoundEffects {
  constructor(private ctx: AudioContext, private out: GainNode) {}

  // 1. 隻狼式極限格擋清脆金屬打鐵巨響 (The Clang)
  public playClang(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 雙金屬高頻諧振頻率 (1850Hz 與 3720Hz)
    const freqs = [1850, 3720];
    freqs.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const bandpass = this.ctx.createBiquadFilter();

      bandpass.type = 'bandpass';
      bandpass.frequency.value = f;
      bandpass.Q.value = 22; // 高 Q 值帶來尖銳金屬共振

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.94, now + 0.22);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.out);

      osc.start(now);
      osc.stop(now + 0.22);
    });

    // 瞬態衝擊白噪聲，模擬鐵器劇烈碰撞爆出的火星與氣浪
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.045);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise.connect(noiseGain);
      noiseGain.connect(this.out);
      noise.start(now);
    } catch {
      // 容錯
    }
  }

  // 2. 普通格擋鈍響 (The Thud)
  public playThud(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // 3. 看破踩刀音效 (Mikiri Stomp)
  public playMikiri(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 次重低音衝擊
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.28);

    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    sub.connect(subGain);
    subGain.connect(this.out);
    sub.start(now);
    sub.stop(now + 0.28);

    // 踩碎刀刃尖鳴
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(800, now);
    snap.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    snapGain.gain.setValueAtTime(0.3, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    snap.connect(snapGain);
    snapGain.connect(this.out);
    snap.start(now);
    snap.stop(now + 0.15);
  }

  // 4. 居合一閃水墨雷鳴音效 (Iai Thunder)
  public playIaiThunder(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.55);

    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.6);

    // 刀光破空撕裂聲
    const hiss = this.ctx.createOscillator();
    const hissGain = this.ctx.createGain();
    hiss.type = 'sine';
    hiss.frequency.setValueAtTime(4200, now);
    hiss.frequency.exponentialRampToValueAtTime(800, now + 0.35);

    hissGain.gain.setValueAtTime(0.4, now);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    hiss.connect(hissGain);
    hissGain.connect(this.out);
    hiss.start(now);
    hiss.stop(now + 0.35);
  }

  // 5. 玩家受創刺痛肉體音效
  public playHit(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 6. 揮空風聲 (Whoosh)
  public playEmptyWhoosh(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 7. 倒數預備重太鼓
  public playCountdownTaiko(isFinal: boolean = false): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = isFinal ? 150 : 110;
    const endFreq = isFinal ? 38 : 42;
    const dur = isFinal ? 0.35 : 0.22;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    gain.gain.setValueAtTime(isFinal ? 0.7 : 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + dur);
  }

  // 8. 架勢崩潰破防音效 (Posture Break)
  public playPostureBreak(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const freqs = [320, 480, 720];
    freqs.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.4, now + 0.3);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.out);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  // 9. 絕殺契機音效 (Deathblow Prompt)
  public playDeathBlowPrompt(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}
