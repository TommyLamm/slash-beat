export class SoundEffects {
  constructor(private ctx: AudioContext, private out: GainNode) {}

  // 1. 隻狼式極限格擋清脆金屬打鐵巨響 (The Clang) + 完美招架和弦共振
  public playClang(isPerfect: boolean = true): void {
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
      bandpass.Q.value = 24; // 極高 Q 值帶來尖銳金屬共振

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.93, now + 0.24);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      osc.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.out);

      osc.start(now);
      osc.stop(now + 0.24);
    });

    // 瞬態衝擊白噪聲，模擬鐵器劇烈碰撞爆出的火星與氣浪
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(noiseGain);
      noiseGain.connect(this.out);
      noise.start(now);
    } catch {
      // 容錯
    }

    // 完美招架時追加古箏/金石共振和弦 (Resonance Chords: D6 1174Hz & A6 1760Hz)
    if (isPerfect) {
      this.playResonanceChords(now);
    }
  }

  // 完美招架共鳴和弦 (日本調式清越回響)
  public playResonanceChords(startTime?: number): void {
    if (this.ctx.state !== 'running') return;
    const now = startTime ?? this.ctx.currentTime;
    const chordFreqs = [1174.66, 1760.00]; // 高八度商音與羽音

    chordFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.015);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.out);
      osc.start(now);
      osc.stop(now + 0.45);
    });
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

    // 次重低音衝擊 (Sub-bass drop)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(180, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    subGain.gain.setValueAtTime(0.95, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    sub.connect(subGain);
    subGain.connect(this.out);
    sub.start(now);
    sub.stop(now + 0.35);

    // 踩碎刀刃尖鳴 (Blade Snap)
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(840, now);
    snap.frequency.exponentialRampToValueAtTime(110, now + 0.18);

    snapGain.gain.setValueAtTime(0.35, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    snap.connect(snapGain);
    snapGain.connect(this.out);
    snap.start(now);
    snap.stop(now + 0.18);
  }

  // 4. 「危」字印記蓋下：高音金屬錚鳴預警 (Perilous Stamp Alert)
  public playPerilousStampAlert(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 銳利刺耳的高頻金屬錚鳴 (2800Hz 下滑)
    const alertOsc = this.ctx.createOscillator();
    const alertFilter = this.ctx.createBiquadFilter();
    const alertGain = this.ctx.createGain();

    alertOsc.type = 'sawtooth';
    alertOsc.frequency.setValueAtTime(2800, now);
    alertOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.28);

    alertFilter.type = 'bandpass';
    alertFilter.frequency.setValueAtTime(2600, now);
    alertFilter.Q.value = 18;

    alertGain.gain.setValueAtTime(0.5, now);
    alertGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    alertOsc.connect(alertFilter);
    alertFilter.connect(alertGain);
    alertGain.connect(this.out);
    alertOsc.start(now);
    alertOsc.stop(now + 0.28);

    // 朱砂印蓋下的沉悶印記音
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(220, now);
    thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

    thudGain.gain.setValueAtTime(0.6, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    thudOsc.connect(thudGain);
    thudGain.connect(this.out);
    thudOsc.start(now);
    thudOsc.stop(now + 0.15);
  }

  // 5. 居合一閃水墨雷鳴音效 (Iai Thunder)
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

  // 6. 玩家受創刺痛肉體音效
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

  // 7. 失誤斷音 / 雜音斷弦 (Miss Buzzer)
  public playMissBuzz(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.linearRampToValueAtTime(85, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 8. 揮空風聲 (Whoosh)
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

  // 9. 倒數預備重太鼓
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

  // 10. 架勢崩潰破防音效 (Posture Break)
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

  // 11. 絕殺契機音效 (Deathblow Prompt)
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

  // 12. 節拍器滴答校準音 (Metronome Tick)
  public playMetronomeTick(isStrong: boolean = false): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const freq = isStrong ? 1400 : 900;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.value = 15;

    gain.gain.setValueAtTime(isStrong ? 0.6 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 13. 影之劍聖 登場劍氣轟鳴
  public playBossRoar(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(75, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.7);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    sub.connect(gain);
    gain.connect(this.out);
    sub.start(now);
    sub.stop(now + 0.7);
  }
}
