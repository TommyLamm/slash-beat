import { SoundEffects } from './SoundEffects';
import { JapaneseSequencer } from './JapaneseSequencer';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  public sfx: SoundEffects | null = null;
  public sequencer: JapaneseSequencer | null = null;

  private isUnlocked: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    // 延遲至使用者手勢時或建構時安全初始化
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.sfx = new SoundEffects(this.ctx, this.sfxGain);
      this.sequencer = new JapaneseSequencer(this.ctx, this.bgmGain);
    } catch (e) {
      console.warn('[SoundEngine] Web Audio initialization warning:', e);
    }
  }

  public async unlock(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('[SoundEngine] Resume failed:', e);
      }
    }
    this.isUnlocked = this.ctx.state === 'running';
    return this.isUnlocked;
  }

  public getContext(): AudioContext | null {
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
