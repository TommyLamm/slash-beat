export class Camera {
  public shakeX: number = 0;
  public shakeY: number = 0;
  private shakeAmplitude: number = 0;
  private shakeDuration: number = 0;
  private shakeTime: number = 0;

  public triggerShake(amplitude: number = 6, duration: number = 0.25): void {
    this.shakeAmplitude = Math.max(this.shakeAmplitude, amplitude);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = 0;
  }

  public update(dt: number): void {
    if (this.shakeTime < this.shakeDuration && this.shakeAmplitude > 0.1) {
      this.shakeTime += dt;
      // 諧振衰減震動: A * exp(-lambda * t) * cos(omega * t)
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
  }

  public applyTransform(ctx: CanvasRenderingContext2D): void {
    if (this.shakeX !== 0 || this.shakeY !== 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }
  }
}
