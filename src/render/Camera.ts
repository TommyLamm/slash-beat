import { CENTER_X, GROUND_Y } from '../core/Constants';

export class Camera {
  public shakeX: number = 0;
  public shakeY: number = 0;
  private shakeAmplitude: number = 0;
  private shakeDuration: number = 0;
  private shakeTime: number = 0;

  // 鏡頭縮放特寫
  public scale: number = 1.0;
  private targetScale: number = 1.0;
  private zoomDuration: number = 0;
  private zoomTime: number = 0;
  private pivotX: number = CENTER_X;
  private pivotY: number = GROUND_Y - 40;

  public triggerShake(amplitude: number = 6, duration: number = 0.25): void {
    this.shakeAmplitude = Math.max(this.shakeAmplitude, amplitude);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = 0;
  }

  public triggerZoom(targetScale: number = 1.25, duration: number = 0.28, px: number = CENTER_X, py: number = GROUND_Y - 40): void {
    this.targetScale = targetScale;
    this.scale = targetScale;
    this.zoomDuration = duration;
    this.zoomTime = 0;
    this.pivotX = px;
    this.pivotY = py;
  }

  public update(dt: number): void {
    // 震動衰減
    if (this.shakeTime < this.shakeDuration && this.shakeAmplitude > 0.1) {
      this.shakeTime += dt;
      const progress = this.shakeTime / this.shakeDuration;
      const decay = Math.exp(-6.0 * progress);
      const angle = this.shakeTime * 45.0;

      this.shakeX = Math.cos(angle) * this.shakeAmplitude * decay;
      this.shakeY = Math.sin(angle) * this.shakeAmplitude * decay;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeAmplitude = 0;
      this.shakeDuration = 0;
      this.shakeTime = 0;
    }

    // 縮放平滑復原
    if (this.scale > 1.001) {
      this.zoomTime += dt;
      const t = Math.min(1.0, this.zoomTime / (this.zoomDuration || 0.25));
      // 平滑插值回到 1.0
      this.scale = 1.0 + (this.targetScale - 1.0) * (1 - t * t);
      if (t >= 1.0) {
        this.scale = 1.0;
      }
    } else {
      this.scale = 1.0;
    }
  }

  public applyTransform(ctx: CanvasRenderingContext2D): void {
    if (this.scale !== 1.0) {
      ctx.translate(this.pivotX, this.pivotY);
      ctx.scale(this.scale, this.scale);
      ctx.translate(-this.pivotX, -this.pivotY);
    }
    if (this.shakeX !== 0 || this.shakeY !== 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }
  }
}
