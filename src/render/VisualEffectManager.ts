import { SparkParticle, FloatingText, InkSplatter } from '../types';

export class VisualEffectManager {
  public particles: SparkParticle[] = [];
  public floatingTexts: FloatingText[] = [];
  public splatters: InkSplatter[] = [];

  public hitstopTimer: number = 0; // 頓幀倒數 (秒)
  public isIaiInverted: boolean = false;
  public iaiFlashTimer: number = 0;

  public triggerHitstop(durationSeconds: number): void {
    this.hitstopTimer = Math.max(this.hitstopTimer, durationSeconds);
  }

  public triggerIaiFlash(durationSeconds: number = 0.2): void {
    this.isIaiInverted = true;
    this.iaiFlashTimer = durationSeconds;
  }

  // 1. 打鐵金屬火花
  public spawnSparks(x: number, y: number, count: number = 38): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 220 + Math.random() * 480;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120, // 初始帶有向上噴射衝量
        size: 1.8 + Math.random() * 2.5,
        color: Math.random() > 0.25 ? '#ffe600' : '#ff3b00',
        alpha: 1.0,
        life: 0,
        maxLife: 0.16 + Math.random() * 0.26,
      });
    }
  }

  // 2. 踩刀看破衝擊波
  public spawnMikiriBurst(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 180 + Math.random() * 320;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.2 + Math.random() * 3.0,
        color: Math.random() > 0.4 ? '#00e5ff' : '#ffffff',
        alpha: 1.0,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.2,
      });
    }
  }

  // 3. 飛墨濺射 (水墨刀意)
  public spawnInkSplatter(x: number, y: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.splatters.push({
        x,
        y,
        radius: 3 + Math.random() * 9,
        alpha: 0.8,
        angle,
        length: 15 + Math.random() * 45,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
      });
    }
  }

  // 4. 浮動打擊文字 (PERFECT PARRY, MIKIRI, GOOD, MISS)
  public addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      scale: 1.3,
      alpha: 1.0,
      life: 0,
      maxLife: 0.55,
    });
  }

  public update(dt: number): void {
    // 頓幀計時
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
    }

    // 居合反色閃爍
    if (this.iaiFlashTimer > 0) {
      this.iaiFlashTimer -= dt;
      if (this.iaiFlashTimer <= 0) {
        this.isIaiInverted = false;
      }
    }

    // 更新火花粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= 0.94;
      p.vy = (p.vy + 980 * dt) * 0.94; // 重力與空氣阻力
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }

    // 更新水墨殘痕
    for (let i = this.splatters.length - 1; i >= 0; i--) {
      const s = this.splatters[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.splatters.splice(i, 1);
        continue;
      }
      s.alpha = Math.max(0, 0.8 * (1 - s.life / s.maxLife));
    }

    // 更新浮動打擊文字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life += dt;
      if (t.life >= t.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      t.y -= 45 * dt; // 向上飄移
      t.scale = Math.max(1.0, 1.3 - (t.life / t.maxLife) * 0.3);
      t.alpha = Math.max(0, 1 - t.life / t.maxLife);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. 水墨殘跡
    for (const s of this.splatters) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#0a0a10';
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.ellipse(s.length / 2, 0, s.length / 2, s.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. 打鐵火花 (Lighter 疊加混合，爆出炫目光暈)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. 浮動打擊文字
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = '900 22px "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 黑色描邊增加清晰度
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(t.text, 0, 0);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);

      ctx.restore();
    }
  }
}
