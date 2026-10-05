export class SoundEffects {
  private activeVoices: Array<{ gain: GainNode; stopTime: number }> = [];

  constructor(private ctx: AudioContext, private out: GainNode) {}

  // 語音池清理與防爆音截斷
  private registerVoice(gain: GainNode, stopTime: number): void {
    const now = this.ctx.currentTime;
    // 移除已結束的語音
    this.activeVoices = this.activeVoices.filter(v => v.stopTime > now);

    // 若並發語音超過 6 個，對最舊的語音執行 5ms 平滑 ramp-down 避免振幅爆掉
    if (this.activeVoices.length >= 6) {
      const oldest = this.activeVoices.shift();
      if (oldest) {
        try {
          oldest.gain.gain.cancelScheduledValues(now);
          oldest.gain.gain.setValueAtTime(oldest.gain.gain.value, now);
          oldest.gain.gain.linearRampToValueAtTime(0.0001, now + 0.005);
        } catch {}
      }
    }
    this.activeVoices.push({ gain, stopTime });
  }

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
      bandpass.Q.value = 22; // 高 Q 值清脆金屬聲

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.94, now + 0.22);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.out);

      this.registerVoice(gain, now + 0.22);

      osc.start(now);
      osc.stop(now + 0.22);
    });

    // 瞬態衝擊白噪聲，模擬鐵器劇烈碰撞火星
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(noiseGain);
      noiseGain.connect(this.out);
      noise.start(now);
    } catch {}

    // 完美招架時追加古箏/金石共振和弦
    if (isPerfect) {
      this.playResonanceChords(now);
    }
  }

  // 完美招架共鳴和弦 (日本調式清越回響)
  public playResonanceChords(startTime?: number): void {
    if (this.ctx.state !== 'running') return;
    const now = startTime ?? this.ctx.currentTime;
    const chordFreqs = [1174.66, 1760.00];

    chordFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.015);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

      osc.connect(gain);
      gain.connect(this.out);
      this.registerVoice(gain, now + 0.42);

      osc.start(now);
      osc.stop(now + 0.42);
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

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.out);
    this.registerVoice(gain, now + 0.12);

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

    subGain.gain.setValueAtTime(0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    sub.connect(subGain);
    subGain.connect(this.out);
    this.registerVoice(subGain, now + 0.35);

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
    this.registerVoice(snapGain, now + 0.18);

    snap.start(now);
    snap.stop(now + 0.18);
  }

  // 4. 向上跳躍看破踏槍音效 (Jump Counter Stomp & Slash)
  public playJumpCounter(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 踏槍清脆重擊
    const stomp = this.ctx.createOscillator();
    const stompGain = this.ctx.createGain();
    stomp.type = 'sawtooth';
    stomp.frequency.setValueAtTime(420, now);
    stomp.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    stompGain.gain.setValueAtTime(0.8, now);
    stompGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    stomp.connect(stompGain);
    stompGain.connect(this.out);
    stomp.start(now);
    stomp.stop(now + 0.25);

    // 凌空劈斬銀芒呼嘯
    const whoosh = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(1600, now);
    whoosh.frequency.exponentialRampToValueAtTime(240, now + 0.3);

    whooshGain.gain.setValueAtTime(0.5, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    whoosh.connect(whooshGain);
    whooshGain.connect(this.out);
    whoosh.start(now);
    whoosh.stop(now + 0.3);
  }

  // 5. 手裏劍飛鏢高速旋轉破空呼嘯 (Shuriken Whirr)
  public playShurikenWhoosh(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(960, now);
    osc.frequency.linearRampToValueAtTime(1420, now + 0.14);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 8;

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 6. 長槍蓄力音效 (Spear Charge)
  public playSpearCharge(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // 7. 掃堂腿破風呼嘯音 (Spear Sweep)
  public playSpearSweep(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.28);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // 8. 「危」字印記蓋下：高音金屬錚鳴預警 (Perilous Stamp Alert)
  public playPerilousStampAlert(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

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

    // 印記蓋下的沉悶音
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

  // 9. 居合一閃水墨雷鳴音效 (Iai Thunder)
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

  // 10. 雷雨天守閣雷暴霹靂聲 (Thunderbolt Crack & Roll)
  public playThunderClap(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 閃電炸裂脆響
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(800, now);
    snap.frequency.exponentialRampToValueAtTime(50, now + 0.22);
    snapGain.gain.setValueAtTime(0.65, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    snap.connect(snapGain);
    snapGain.connect(this.out);
    snap.start(now);
    snap.stop(now + 0.22);

    // 低頻滾雷
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'triangle';
    rumble.frequency.setValueAtTime(95, now);
    rumble.frequency.exponentialRampToValueAtTime(26, now + 0.9);
    rumbleGain.gain.setValueAtTime(0.7, now + 0.05);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.out);
    rumble.start(now);
    rumble.stop(now + 0.9);
  }

  // 11. 玩家受創刺痛音效
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

  // 12. 失誤斷音 / 雜音斷弦 (Miss Buzzer)
  public playMissBuzz(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.18);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // 13. 空刀揮動破空聲
  public playEmptyWhoosh(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // 14. 崩防重擊聲 (Posture Break)
  public playPostureBreak(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.38);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  // 15. 絕殺提示音 (Deathblow Prompt)
  public playDeathBlowPrompt(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // 16. 出陣倒數太鼓聲 (Countdown Taiko)
  public playCountdownTaiko(isFinal: boolean = false): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = isFinal ? 240 : 160;
    const endFreq = isFinal ? 45 : 35;
    const dur = isFinal ? 0.38 : 0.22;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    gain.gain.setValueAtTime(isFinal ? 0.8 : 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + dur);
  }

  // 17. 節拍器校準滴答聲
  public playMetronomeTick(isAccent: boolean): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, now);

    gain.gain.setValueAtTime(isAccent ? 0.45 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 18. Boss 出現怒吼咆哮 (Boss Roar)
  public playBossRoar(): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  // 19. 津輕三味線 (Tsugaru-Shamisen) 撥弦音色：打板擊弦聲 + 鋸齒微變調 Sawari 韻味
  public playShamisenPluck(time: number, freq: number, isAccent: boolean, volScale: number = 1.0): void {
    if (this.ctx.state !== 'running') return;

    // 琴弦本體 (Sawtooth + 微量方波諧波，體現三味線的犀利鼻音)
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // 三味線特有的壓弦起音微幅向下彎音 (Bending)
    osc.frequency.setValueAtTime(freq * 1.03, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.035);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.1, time);
    filter.Q.value = 4.5; // 三味線共鳴腔

    const dur = isAccent ? 0.32 : 0.22;
    const vol = (isAccent ? 0.38 : 0.24) * volScale;

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.002); // 極快撥子打擊
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    this.registerVoice(gain, time + dur);

    osc.start(time);
    osc.stop(time + dur);

    // 撥子 (Bachi) 敲擊琴皮特有的瞬態打擊聲 (Slap attack)
    if (isAccent) {
      const slap = this.ctx.createOscillator();
      const slapGain = this.ctx.createGain();
      slap.type = 'triangle';
      slap.frequency.setValueAtTime(460, time);
      slap.frequency.exponentialRampToValueAtTime(90, time + 0.025);
      slapGain.gain.setValueAtTime(0.3, time);
      slapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
      slap.connect(slapGain);
      slapGain.connect(this.out);
      slap.start(time);
      slap.stop(time + 0.025);
    }
  }
}
