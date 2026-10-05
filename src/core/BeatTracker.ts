export class BeatTracker {
  private startTime: number = 0;
  private bpm: number = 120;
  private audioOffsetMs: number = 0;
  private isRunning: boolean = false;
  private pauseTime: number = 0;

  constructor(bpm: number = 120, offsetMs: number = 0) {
    this.bpm = bpm;
    this.audioOffsetMs = offsetMs;
  }

  public start(audioCtx: AudioContext, startDelaySeconds: number = 0): void {
    this.startTime = audioCtx.currentTime + startDelaySeconds;
    this.isRunning = true;
    this.pauseTime = 0;
  }

  public setBpm(newBpm: number): void {
    this.bpm = newBpm;
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setOffsetMs(ms: number): void {
    this.audioOffsetMs = ms;
  }

  public getOffsetMs(): number {
    return this.audioOffsetMs;
  }

  public getSecondsPerBeat(): number {
    return 60 / this.bpm;
  }

  // 取得歌曲播放的秒數
  public getSongTime(audioCtx: AudioContext): number {
    if (!this.isRunning) return 0;
    const elapsed = audioCtx.currentTime - this.startTime + (this.audioOffsetMs / 1000);
    return Math.max(0, elapsed);
  }

  // 取得歌曲精確拍數 (浮點數)
  public getCurrentBeat(audioCtx: AudioContext): number {
    const spb = this.getSecondsPerBeat();
    return this.getSongTime(audioCtx) / spb;
  }

  public beatToSeconds(beat: number): number {
    return beat * (60 / this.bpm);
  }

  public secondsToBeat(seconds: number): number {
    return seconds / (60 / this.bpm);
  }

  public reset(): void {
    this.isRunning = false;
    this.startTime = 0;
    this.pauseTime = 0;
  }
}
