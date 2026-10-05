import {
  SparkParticle,
  FloatingText,
  InkSplatter,
  AuraParticle,
  PerilousStamp,
  TouchRipple,
  BladeTrailStyle,
} from '../types';

export interface BladeVacuum {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export class VisualEffectManager {
  public particles: SparkParticle[] = [];
  public floatingTexts: FloatingText[] = [];
  public splatters: InkSplatter[] = [];
  public auraParticles: AuraParticle[] = [];
  public perilousStamps: PerilousStamp[] = [];
  public touchRipples: TouchRipple[] = [];
  public bladeVacuums: BladeVacuum[] = [];

  public hitstopTimer: number = 0; // 頓幀倒數 (秒)
  public isIaiInverted: boolean = false;
  public iaiFlashTimer: number = 0;

  // 慢動作終結特寫 (Cinematic Slow-mo Deathblow Finisher)
  public isSlowmoActive: boolean = false;
  public slowmoTimer: number = 0;
  public slowmoDuration: number = 0.4;

  public triggerHitstop(durationSeconds: number): void {
    this.hitstopTimer = Math.max(this.hitstopTimer, durationSeconds);
  }

  public triggerIaiFlash(durationSeconds: number = 0.2): void {
    this.isIaiInverted = true;
    this.iaiFlashTimer = durationSeconds;
  }

  public triggerSlowmo(durationSeconds: number = 0.4): void {
    this.isSlowmoActive = true;
    this.slowmoTimer = durationSeconds;
    this.slowmoDuration = durationSeconds;
  }

  // 1. 氣刃震散斬斷雨滴空腔 (Blade Rain Slash Vacuum)
  public spawnBladeVacuum(x: number, y: number, maxRadius: number = 140): void {
    this.bladeVacuums.push({
      x,
      y,
      radius: 10,
      maxRadius,
      alpha: 1.0,
    });

    // 水霧蒸發粒子
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2.5,
        color: 'rgba(200, 240, 255, 0.9)',
        alpha: 0.9,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.2,
      });
    }
  }

  // 2. 打鐵火花 (支援自訂劍氣風格配色)
  public spawnSparks(x: number, y: number, count: number = 46, style: BladeTrailStyle = 'AZURE'): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 250 + Math.random() * 520;

      let color = '#ffe600';
      const dice = Math.random();

      if (style === 'CRIMSON') {
        color = dice < 0.6 ? '#ff003c' : (dice < 0.85 ? '#ff4070' : '#ffffff');
      } else if (style === 'SOLAR') {
        color = dice < 0.6 ? '#ffd700' : (dice < 0.85 ? '#fff176' : '#ffffff');
      } else {
        // AZURE
        color = dice < 0.45 ? '#00e5ff' : (dice < 0.75 ? '#ffe600' : '#ffffff');
      }

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150,
        size: 1.8 + Math.random() * 3.2,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: 0.18 + Math.random() * 0.32,
      });
    }
  }

  // 3. 踩刀看破衝擊波
  public spawnMikiriBurst(x: number, y: number, color: string = '#00f0ff'): void {
    for (let i = 0; i < 34; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 220 + Math.random() * 380;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        color: Math.random() > 0.3 ? color : '#ffffff',
        alpha: 1.0,
        life: 0,
        maxLife: 0.32 + Math.random() * 0.25,
      });
    }

    this.spawnInkSplatter(x, y, 12);
    this.spawnBladeVacuum(x, y, 160);
  }

  // 4. 向上看破跳躍踩槍震波 (Jump Counter Burst)
  public spawnJumpCounterBurst(x: number, y: number): void {
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 260 + Math.random() * 420;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3.0 + Math.random() * 3.5,
        color: Math.random() > 0.4 ? '#ffd700' : '#ffffff',
        alpha: 1.0,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
      });
    }

    this.spawnInkSplatter(x, y, 14);
    this.spawnBladeVacuum(x, y, 180);
  }

  // 5. 水墨飛濺筆觸
  public spawnInkSplatter(x: number, y: number, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.splatters.push({
        x,
        y,
        radius: 4 + Math.random() * 12,
        alpha: 0.85,
        angle,
        length: 20 + Math.random() * 55,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
      });
    }
  }

  // 6. 「危」字印章蓋下
  public spawnPerilousStamp(x: number, y: number): void {
    this.perilousStamps.push({
      x,
      y,
      scale: 2.2,
      alpha: 1.0,
      life: 0,
      maxLife: 0.9,
    });
  }

  // 7. 蒼藍極意烈焰 / 劍氣烈焰
  public spawnFeverAura(x: number, y: number, style: BladeTrailStyle = 'AZURE'): void {
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      let colors = ['#00e5ff', '#3388ff', '#80ffff', '#1a55ff'];
      if (style === 'CRIMSON') {
        colors = ['#ff003c', '#ff3366', '#d6002f', '#ff6688'];
      } else if (style === 'SOLAR') {
        colors = ['#ffd700', '#ffea00', '#ffa000', '#fff59d'];
      }
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.auraParticles.push({
        x: x + offsetX,
        y: y + 5,
        vx: (Math.random() - 0.5) * 30,
        vy: -(60 + Math.random() * 110),
        size: 3 + Math.random() * 5,
        color,
        alpha: 0.85,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
      });
    }
  }

  // 8. 觸控漣漪波紋
  public addTouchRipple(x: number, y: number, color: string = '#ffd700'): void {
    this.touchRipples.push({
      x,
      y,
      radius: 10,
      maxRadius: 60,
      alpha: 0.8,
      color,
    });
  }

  // 9. 浮動打擊文字
  public addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      scale: 1.35,
      alpha: 1.0,
      life: 0,
      maxLife: 0.6,
    });
  }

  public update(dt: number): void {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
    }

    if (this.iaiFlashTimer > 0) {
      this.iaiFlashTimer -= dt;
      if (this.iaiFlashTimer <= 0) {
        this.isIaiInverted = false;
      }
    }

    if (this.isSlowmoActive) {
      this.slowmoTimer -= dt;
      if (this.slowmoTimer <= 0) {
        this.isSlowmoActive = false;
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
      p.vx *= 0.93;
      p.vy = (p.vy + 920 * dt) * 0.93;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }

    // 更新氣刃真空圈
    for (let i = this.bladeVacuums.length - 1; i >= 0; i--) {
      const bv = this.bladeVacuums[i];
      bv.radius += (bv.maxRadius - bv.radius) * 12.0 * dt;
      bv.alpha -= dt * 3.5;
      if (bv.alpha <= 0) {
        this.bladeVacuums.splice(i, 1);
      }
    }

    // 更新觸控漣漪
    for (let i = this.touchRipples.length - 1; i >= 0; i--) {
      const r = this.touchRipples[i];
      r.radius += (r.maxRadius - r.radius) * 14.0 * dt;
      r.alpha -= dt * 2.8;
      if (r.alpha <= 0) {
        this.touchRipples.splice(i, 1);
      }
    }

    // 更新水墨殘痕
    for (let i = this.splatters.length - 1; i >= 0; i--) {
      const s = this.splatters[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.splatters.splice(i, 1);
        continue;
      }
      s.alpha = Math.max(0, 0.85 * (1 - s.life / s.maxLife));
    }

    // 更新烈焰光環
    for (let i = this.auraParticles.length - 1; i >= 0; i--) {
      const a = this.auraParticles[i];
      a.life += dt;
      if (a.life >= a.maxLife) {
        this.auraParticles.splice(i, 1);
        continue;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.size *= 0.98;
      a.alpha = Math.max(0, 0.85 * (1 - a.life / a.maxLife));
    }

    // 更新血紅印章
    for (let i = this.perilousStamps.length - 1; i >= 0; i--) {
      const st = this.perilousStamps[i];
      st.life += dt;
      if (st.life >= st.maxLife) {
        this.perilousStamps.splice(i, 1);
        continue;
      }
      if (st.life < 0.12) {
        const t = st.life / 0.12;
        st.scale = 2.2 - 1.2 * t;
      } else {
        st.scale = 1.0;
        st.alpha = Math.max(0, 1 - (st.life - 0.12) / (st.maxLife - 0.12));
      }
    }

    // 更新浮動打擊文字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life += dt;
      if (t.life >= t.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      t.y -= 45 * dt;
      t.scale = Math.max(1.0, 1.35 - (t.life / t.maxLife) * 0.35);
      t.alpha = Math.max(0, 1 - t.life / t.maxLife);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. 水墨殘跡
    for (const s of this.splatters) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#06060c';
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.ellipse(s.length / 2, 0, s.length / 2, s.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. 氣刃排開雨水真空環 (Blade Vacuum Shockwave)
    ctx.save();
    for (const bv of this.bladeVacuums) {
      ctx.save();
      ctx.globalAlpha = bv.alpha * 0.65;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(bv.x, bv.y, bv.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 3. 觸控漣漪波紋
    ctx.save();
    for (const r of this.touchRipples) {
      ctx.save();
      ctx.globalAlpha = r.alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 4. 烈焰光環
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const a of this.auraParticles) {
      ctx.save();
      ctx.globalAlpha = a.alpha;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 5. 打鐵火花
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = p.size * 0.6;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 6. 「危」字血紅印章
    for (const st of this.perilousStamps) {
      ctx.save();
      ctx.globalAlpha = st.alpha;
      ctx.translate(st.x, st.y);
      ctx.scale(st.scale, st.scale);

      const stampSize = 56;
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 4;
      ctx.strokeRect(-stampSize / 2, -stampSize / 2, stampSize, stampSize);

      ctx.fillStyle = 'rgba(235, 20, 50, 0.35)';
      ctx.fillRect(-stampSize / 2, -stampSize / 2, stampSize, stampSize);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px "PingFang TC", "Microsoft JhengHei", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('危', 0, 0);

      ctx.restore();
    }

    // 7. 浮動打擊文字
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = '900 22px "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(t.text, 0, 0);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);

      ctx.restore();
    }
  }
}
