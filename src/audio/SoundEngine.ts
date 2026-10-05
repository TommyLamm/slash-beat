import { SoundEffects } from './SoundEffects';
import { JapaneseSequencer } from './JapaneseSequencer';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  public sfx: SoundEffects | null = null;
  public sequencer: JapaneseSequencer | null = null;

  private isUnlocked: boolean = false;
  private isMuted: boolean = false;
  private listenersAttached: boolean = false;

  constructor() {
    this.attachAutoUnlockListeners();
  }

  private attachAutoUnlockListeners(): void {
    if (this.listenersAttached || typeof window === 'undefined') return;
    this.listenersAttached = true;

    const quickUnlock = (): void => {
      this.unlock().catch(() => {});
    };

    window.addEventListener('pointerdown', quickUnlock, { passive: true });
    window.addEventListener('touchstart', quickUnlock, { passive: true });
    window.addEventListener('keydown', quickUnlock, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    });
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // 1. 動態壓縮器 (消除 180+ BPM 超高速連斬雜音破音)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime); // -12dB 壓制峰值
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(14, this.ctx.currentTime);     // 強勁壓縮比防溢出
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);  // 3ms 極速起音
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);

      // 連接鏈條：compressor -> masterGain -> destination
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // 2. 音效子總線 (SFX Bus)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
      this.sfxGain.connect(this.compressor);

      // 3. 背景樂子總線 (BGM Bus)
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.68, this.ctx.currentTime);
      this.bgmGain.connect(this.compressor);

      this.sfx = new SoundEffects(this.ctx, this.sfxGain);
      this.sequencer = new JapaneseSequencer(this.ctx, this.bgmGain);
    } catch (e) {
      console.warn('[SoundEngine] Web Audio initialization warning:', e);
    }
  }

  public async unlock(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('[SoundEngine] Resume failed:', e);
      }
    }
    this.isUnlocked = this.ctx.state === 'running';
    return this.isUnlocked;
  }

  public ensureRunning(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getContext(): AudioContext | null {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getIsUnlocked(): boolean {
    return this.isUnlocked;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}
