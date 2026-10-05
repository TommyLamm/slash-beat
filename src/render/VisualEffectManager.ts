import { SparkParticle, FloatingText, InkSplatter, AuraParticle, PerilousStamp } from '../types';

export class VisualEffectManager {
  public particles: SparkParticle[] = [];
  public floatingTexts: FloatingText[] = [];
  public splatters: InkSplatter[] = [];
  public auraParticles: AuraParticle[] = [];
  public perilousStamps: PerilousStamp[] = [];

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

  // 1. 打鐵金紅雙色高溫火花 + 水墨拖尾
  public spawnSparks(x: number, y: number, count: number = 46): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 250 + Math.random() * 520;

      // 金紅雙色賽博高溫配色
      let color = '#ffe600'; // 金黃高溫
      const dice = Math.random();
      if (dice < 0.45) {
        color = '#ff1744'; // 緋紅火花
      } else if (dice < 0.75) {
        color = '#ffea00'; // 熾金
      } else {
        color = '#ffffff'; // 白熾火星
      }

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150, // 向上衝量
        size: 1.8 + Math.random() * 3.2,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: 0.18 + Math.random() * 0.32,
      });
    }
  }

  // 2. 踩刀看破衝擊波
  public spawnMikiriBurst(x: number, y: number): void {
    for (let i = 0; i < 32; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 220 + Math.random() * 380;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        color: Math.random() > 0.3 ? '#00f0ff' : '#ffffff',
        alpha: 1.0,
        life: 0,
        maxLife: 0.32 + Math.random() * 0.25,
      });
    }

    // 噴發環形青色衝擊波墨痕
    this.spawnInkSplatter(x, y, 10);
  }

  // 3. 水墨飛濺筆觸 (Sumie Splatter)
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

  // 4. 「危」字血紅印章蓋下
  public spawnPerilousStamp(x: number, y: number): void {
    this.perilousStamps.push({
      x,
      y,
      scale: 2.2, // 從 2.2 倍迅速壓下至 1.0
      alpha: 1.0,
      life: 0,
      maxLife: 0.9,
    });
  }

  // 5. 蒼藍極意烈焰 (Fever Rush Aura)
  public spawnFeverAura(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const colors = ['#00e5ff', '#3388ff', '#80ffff', '#1a55ff'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.auraParticles.push({
        x: x + offsetX,
        y: y + 5,
        vx: (Math.random() - 0.5) * 30,
        vy: -(60 + Math.random() * 110), // 向上升騰
        size: 3 + Math.random() * 5,
        color,
        alpha: 0.85,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
      });
    }
  }

  // 6. 浮動打擊文字 (PERFECT PARRY, MIKIRI, GOOD, MISS)
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
      p.vx *= 0.93;
      p.vy = (p.vy + 920 * dt) * 0.93;
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
      s.alpha = Math.max(0, 0.85 * (1 - s.life / s.maxLife));
    }

    // 更新蒼藍烈焰光環
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
      // 前 0.12 秒迅速縮至 1.0 (重重蓋下)
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
    // 1. 水墨殘跡 (深邃毛筆飛白)
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

    // 2. 蒼藍極意烈焰 (Fever Rush Aura)
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

    // 3. 金紅雙色打鐵火花 (Lighter 疊加混合，爆出高溫耀斑)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // 拖尾光芒細線
      ctx.lineWidth = p.size * 0.6;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 4. 「危」字血紅印章 (Perilous Stamp Overlay)
    for (const st of this.perilousStamps) {
      ctx.save();
      ctx.globalAlpha = st.alpha;
      ctx.translate(st.x, st.y);
      ctx.scale(st.scale, st.scale);

      // 朱砂外方框
      const stampSize = 56;
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 4;
      ctx.strokeRect(-stampSize / 2, -stampSize / 2, stampSize, stampSize);

      // 朱砂紅底
      ctx.fillStyle = 'rgba(235, 20, 50, 0.35)';
      ctx.fillRect(-stampSize / 2, -stampSize / 2, stampSize, stampSize);

      // 書法印章「危」字
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px "PingFang TC", "Microsoft JhengHei", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('危', 0, 0);

      ctx.restore();
    }

    // 5. 浮動打擊文字
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
