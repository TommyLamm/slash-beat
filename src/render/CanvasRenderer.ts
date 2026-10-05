import {
  VIRTUAL_WIDTH,
  VIRTUAL_HEIGHT,
  CENTER_X,
  GROUND_Y,
  HIT_DISTANCE_OFFSET,
  MAX_HP,
  MAX_POSTURE,
  FEVER_COMBO_THRESHOLD,
} from '../core/Constants';
import {
  GameState,
  GameMode,
  CombatStats,
  FoliageParticle,
  RainParticle,
  LightningBolt,
  BladeTrailStyle,
} from '../types';
import { Samurai } from '../entities/Samurai';
import { EnemyNinja } from '../entities/EnemyNinja';
import { VisualEffectManager } from './VisualEffectManager';
import { Camera } from './Camera';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = VIRTUAL_WIDTH;
  private height: number = VIRTUAL_HEIGHT;

  // 浮世繪飄落櫻花花瓣與水墨竹葉
  private foliage: FoliageParticle[] = [];

  // 雷雨天守閣動態天候粒子
  private rainDrops: RainParticle[] = [];
  private lightningBolts: LightningBolt[] = [];
  private lightningTimer: number = 2.5;
  private flashAlpha: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initFoliage();
    this.initRain();
  }

  private initFoliage(): void {
    this.foliage = [];
    for (let i = 0; i < 36; i++) {
      const isSakura = Math.random() > 0.35;
      this.foliage.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 30 + Math.random() * 60,
        vy: 20 + Math.random() * 45,
        size: isSakura ? 3 + Math.random() * 4 : 4 + Math.random() * 5,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 4.0,
        alpha: 0.35 + Math.random() * 0.55,
        type: isSakura ? 'SAKURA' : 'BAMBOO',
      });
    }
  }

  private initRain(): void {
    this.rainDrops = [];
    for (let i = 0; i < 220; i++) {
      this.rainDrops.push({
        x: Math.random() * (this.width + 160) - 80,
        y: Math.random() * this.height,
        vx: -60 - Math.random() * 80, // 強風傾斜
        vy: 750 + Math.random() * 550,
        length: 16 + Math.random() * 22,
        alpha: 0.25 + Math.random() * 0.45,
      });
    }
  }

  public updateAmbient(dt: number, vfx?: VisualEffectManager): void {
    // 1. 飄花更新
    for (const p of this.foliage) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.vAngle * dt;
      if (p.x > this.width + 30) p.x = -30;
      if (p.y > this.height + 30) p.y = -30;
    }

    // 2. 暴雨更新與刀氣斬斷雨滴
    for (const r of this.rainDrops) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;

      // 檢查是否被氣刃真空圈斬斷震散
      if (vfx && vfx.bladeVacuums.length > 0) {
        for (const bv of vfx.bladeVacuums) {
          const dx = r.x - bv.x;
          const dy = r.y - bv.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < bv.radius * bv.radius) {
            // 被氣刃斬斷震飛！
            r.x += (dx > 0 ? 1 : -1) * (140 + Math.random() * 100);
            r.y += (Math.random() - 0.5) * 80;
          }
        }
      }

      if (r.y > this.height + 20) {
        r.y = -20;
        r.x = Math.random() * (this.width + 200) - 50;
      }
      if (r.x < -80) {
        r.x = this.width + 50;
      }
    }

    // 3. 閃電計時與生成
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.triggerLightning();
      this.lightningTimer = 3.5 + Math.random() * 5.0; // 每 3.5~8.5 秒一陣天守閣雷暴
    }

    // 更新閃電衰減
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      const b = this.lightningBolts[i];
      b.timer -= dt;
      b.alpha = Math.max(0, b.timer / 0.18) * b.maxAlpha;
      if (b.timer <= 0) {
        this.lightningBolts.splice(i, 1);
      }
    }

    // 閃電暴光漸隱
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 4.2);
    }
  }

  // 觸發真實樹狀電弧
  public triggerLightning(): void {
    const startX = 180 + Math.random() * (this.width - 360);
    const startY = 0;
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    let curX = startX;
    let curY = startY;
    const steps = 14;
    const targetY = 320;

    for (let i = 0; i < steps; i++) {
      const nextY = curY + (targetY / steps) + (Math.random() - 0.5) * 15;
      const nextX = curX + (Math.random() - 0.5) * 45;
      segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

      // 分岔枝節
      if (Math.random() < 0.4) {
        const branchX = nextX + (Math.random() - 0.5) * 60;
        const branchY = nextY + 30 + Math.random() * 40;
        segments.push({ x1: nextX, y1: nextY, x2: branchX, y2: branchY });
      }

      curX = nextX;
      curY = nextY;
    }

    this.lightningBolts.push({
      segments,
      alpha: 1.0,
      maxAlpha: 1.0,
      timer: 0.22,
    });

    this.flashAlpha = 0.85; // 瞬間白晝暴光
  }

  // 主渲染入口
  public render(
    state: GameState,
    samurai: Samurai,
    enemies: EnemyNinja[],
    vfx: VisualEffectManager,
    camera: Camera,
    stats: CombatStats,
    enemyPosture: number,
    songTime: number,
    currentWave: number,
    countdownVal: number,
    calibrationOffsetMs: number,
    isMuted: boolean,
    isBossWave: boolean = false,
    gameMode: GameMode = 'WAVES',
    currentBpm: number = 118,
    touchSplitRatio: number = 0.5,
    touchInvert: boolean = false,
    selectedBladeTrail: BladeTrailStyle = 'AZURE'
  ): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // 應用相機震動與特寫
    camera.applyTransform(ctx);

    // 1. 繪製背景 (雷雨天守閣動態場景、暴雨、竹林)
    this.renderThunderstormCastleBackground(ctx, songTime, stats.combo, vfx);

    // 2. 戰鬥相關實體與判定線
    if (state === 'COMBAT' || state === 'READY' || state === 'DEATHBLOW_WINDOW' || state === 'IAI_SLASH_BURST') {
      this.renderHitZones(ctx, songTime);

      // 敵兵
      for (const enemy of enemies) {
        enemy.render(ctx, songTime);
      }

      // 武士
      samurai.render(ctx);

      // 特效層
      vfx.render(ctx);

      // 居合一閃全屏斬痕
      if (vfx.isIaiInverted || state === 'IAI_SLASH_BURST') {
        this.renderIaiSlashOverlay(ctx);
      }

      // 慢動作終結特寫：宣紙水墨留白剪影濾鏡
      if (vfx.isSlowmoActive) {
        this.renderSlowmoCinematicFilter(ctx, samurai, vfx.slowmoTimer / vfx.slowmoDuration);
      }

      // HUD 介面
      this.renderHUD(
        ctx,
        samurai,
        stats,
        enemyPosture,
        currentWave,
        calibrationOffsetMs,
        isMuted,
        isBossWave,
        gameMode,
        currentBpm,
        selectedBladeTrail
      );

      // 繪製手機觸控半透明引導線
      this.renderTouchZonesGuide(ctx, touchSplitRatio, touchInvert);
    }

    // 3. 各狀態特定覆蓋層
    if (state === 'TITLE') {
      this.renderTitleScreen(ctx, stats, isMuted, calibrationOffsetMs, selectedBladeTrail);
    } else if (state === 'CALIBRATION') {
      this.renderCalibrationScreen(ctx, songTime, calibrationOffsetMs);
    } else if (state === 'READY') {
      this.renderCountdown(ctx, countdownVal, isBossWave, gameMode);
    } else if (state === 'DEATHBLOW_WINDOW') {
      this.renderDeathblowWindow(ctx, songTime, isBossWave);
    } else if (state === 'WAVE_CLEAR') {
      this.renderWaveClearOverlay(ctx, currentWave, isBossWave);
    } else if (state === 'GAME_OVER') {
      this.renderGameOverScreen(ctx, stats, currentWave, gameMode);
    }

    ctx.restore();
  }

  // 1. 「雷雨天守閣」(Thunderstorm Castle) 動態天候場景
  private renderThunderstormCastleBackground(
    ctx: CanvasRenderingContext2D,
    songTime: number,
    combo: number,
    vfx: VisualEffectManager
  ): void {
    // 閃電暴光時白晝瞬閃
    if (this.flashAlpha > 0.05) {
      ctx.fillStyle = `rgba(240, 245, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 夜空水墨天幕
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#06060e');
    skyGrad.addColorStop(0.65, '#121020');
    skyGrad.addColorStop(1, '#050508');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 賽博血月 (若閃電暴光則微隱)
    const moonAlpha = Math.max(0.2, 1 - this.flashAlpha);
    ctx.save();
    ctx.globalAlpha = moonAlpha;
    const moonCx = CENTER_X + 160;
    const moonCy = 145;
    const moonRadius = 90;

    const moonGlow = ctx.createRadialGradient(moonCx, moonCy, moonRadius * 0.4, moonCx, moonCy, moonRadius * 1.8);
    moonGlow.addColorStop(0, 'rgba(235, 30, 60, 0.4)');
    moonGlow.addColorStop(0.5, 'rgba(200, 20, 50, 0.12)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonCx, moonCy, moonRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    const moonBody = ctx.createRadialGradient(moonCx - 24, moonCy - 24, 15, moonCx, moonCy, moonRadius);
    moonBody.addColorStop(0, '#ff3b56');
    moonBody.addColorStop(0.7, '#d61338');
    moonBody.addColorStop(1, '#8f0b24');
    ctx.fillStyle = moonBody;
    ctx.beginPath();
    ctx.arc(moonCx, moonCy, moonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 宏偉水墨「天守閣」(Tenshukaku Castle) 在夜空矗立
    this.renderTenshukakuCastle(ctx, songTime);

    // 閃電電弧
    for (const b of this.lightningBolts) {
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      for (const seg of b.segments) {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 遠山水墨剪影
    ctx.fillStyle = '#0e0c18';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 310);
    ctx.bezierCurveTo(180, 280, 320, 330, 480, 300);
    ctx.bezierCurveTo(640, 270, 800, 320, this.width, 300);
    ctx.lineTo(this.width, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // 隨風搖曳水墨竹林
    this.renderBambooForest(ctx, songTime, combo);

    // 地表石垣城牆網格
    ctx.fillStyle = '#040406';
    ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);

    ctx.strokeStyle = '#e61e38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(this.width, GROUND_Y);
    ctx.stroke();

    // 地表反光橫線
    ctx.strokeStyle = 'rgba(230, 30, 60, 0.22)';
    ctx.lineWidth = 1;
    for (const gy of [GROUND_Y + 15, GROUND_Y + 35, GROUND_Y + 65, GROUND_Y + 105, GROUND_Y + 150]) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(this.width, gy);
      ctx.stroke();
    }

    // 狂風暴雨 (Rain Falling)
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const r of this.rainDrops) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + (r.vx / r.vy) * r.length, r.y + r.length);
    }
    ctx.stroke();
    ctx.restore();

    // 飄花
    for (const p of this.foliage) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.type === 'SAKURA') {
        ctx.fillStyle = '#ff5388';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#225538';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2.2, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 繪製日式城堡「天守閣」宏偉水墨剪影
  private renderTenshukakuCastle(ctx: CanvasRenderingContext2D, songTime: number): void {
    ctx.save();
    const castleX = CENTER_X - 180;
    const castleBaseY = GROUND_Y;

    // 石垣石階基座 (Ishigaki Stone Ramparts)
    ctx.fillStyle = '#0a0912';
    ctx.beginPath();
    ctx.moveTo(castleX - 110, castleBaseY);
    ctx.lineTo(castleX - 90, castleBaseY - 60);
    ctx.lineTo(castleX + 90, castleBaseY - 60);
    ctx.lineTo(castleX + 110, castleBaseY);
    ctx.closePath();
    ctx.fill();

    // 第一層城閣身 (Level 1)
    ctx.fillStyle = '#100e1c';
    ctx.fillRect(castleX - 80, castleBaseY - 120, 160, 60);

    // 第一層飛簷斗拱 (Eaves 1)
    this.drawCurvedRoof(ctx, castleX, castleBaseY - 120, 200, 18);

    // 第二層城閣身 (Level 2)
    ctx.fillStyle = '#141222';
    ctx.fillRect(castleX - 60, castleBaseY - 175, 120, 55);

    // 第二層飛簷斗拱 (Eaves 2)
    this.drawCurvedRoof(ctx, castleX, castleBaseY - 175, 160, 16);

    // 第三層頂閣 (Level 3 Tower)
    ctx.fillStyle = '#181628';
    ctx.fillRect(castleX - 42, castleBaseY - 225, 84, 50);

    // 頂層巨型四阿頂 (Top Roof)
    this.drawCurvedRoof(ctx, castleX, castleBaseY - 225, 125, 20);

    // 頂端金色雙鴟尾 (Shachihoko)
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    // 左金鴟吻
    ctx.moveTo(castleX - 45, castleBaseY - 245);
    ctx.quadraticCurveTo(castleX - 55, castleBaseY - 260, castleX - 48, castleBaseY - 265);
    ctx.quadraticCurveTo(castleX - 40, castleBaseY - 255, castleX - 40, castleBaseY - 245);
    // 右金鴟吻
    ctx.moveTo(castleX + 45, castleBaseY - 245);
    ctx.quadraticCurveTo(castleX + 55, castleBaseY - 260, castleX + 48, castleBaseY - 265);
    ctx.quadraticCurveTo(castleX + 40, castleBaseY - 255, castleX + 40, castleBaseY - 245);
    ctx.fill();

    // 城閣窗花朱紅燈火微光 (隨風搖曳)
    const flicker = 0.5 + Math.sin(songTime * 5) * 0.15;
    ctx.fillStyle = `rgba(255, 120, 40, ${flicker})`;
    ctx.fillRect(castleX - 22, castleBaseY - 210, 8, 12);
    ctx.fillRect(castleX + 14, castleBaseY - 210, 8, 12);
    ctx.fillRect(castleX - 35, castleBaseY - 160, 10, 14);
    ctx.fillRect(castleX + 25, castleBaseY - 160, 10, 14);

    ctx.restore();
  }

  // 繪製日式城堡飛簷弧線 (Curved Eaves)
  private drawCurvedRoof(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    roofWidth: number,
    height: number
  ): void {
    const half = roofWidth / 2;
    ctx.fillStyle = '#08080f';
    ctx.beginPath();
    ctx.moveTo(cx - half - 12, baseY);
    ctx.quadraticCurveTo(cx - half + 20, baseY - 6, cx, baseY - height);
    ctx.quadraticCurveTo(cx + half - 20, baseY - 6, cx + half + 12, baseY);
    ctx.quadraticCurveTo(cx, baseY - 2, cx - half - 12, baseY);
    ctx.closePath();
    ctx.fill();

    // 飛簷尖端上翹金勾 (Upturned Eaves)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - half - 12, baseY);
    ctx.quadraticCurveTo(cx - half - 16, baseY - 8, cx - half - 14, baseY - 14);
    ctx.moveTo(cx + half + 12, baseY);
    ctx.quadraticCurveTo(cx + half + 16, baseY - 8, cx + half + 14, baseY - 14);
    ctx.stroke();
  }

  // 水墨竹林
  private renderBambooForest(ctx: CanvasRenderingContext2D, songTime: number, combo: number): void {
    ctx.save();
    const isFever = combo >= FEVER_COMBO_THRESHOLD;
    const windForce = isFever ? 28 : (combo >= 10 ? 14 : 4);
    const sway = Math.sin(songTime * 8) * windForce;

    const bambooPoles = [
      { x: 50,  h: 220, w: 7, color: 'rgba(16, 26, 20, 0.85)' },
      { x: 120, h: 260, w: 9, color: 'rgba(12, 20, 16, 0.95)' },
      { x: 190, h: 210, w: 6, color: 'rgba(20, 32, 24, 0.75)' },
      { x: 270, h: 240, w: 8, color: 'rgba(14, 22, 18, 0.90)' },
      { x: 690, h: 230, w: 8, color: 'rgba(14, 22, 18, 0.90)' },
      { x: 770, h: 265, w: 9, color: 'rgba(12, 20, 16, 0.95)' },
      { x: 840, h: 215, w: 6, color: 'rgba(20, 32, 24, 0.75)' },
      { x: 910, h: 250, w: 8, color: 'rgba(16, 26, 20, 0.85)' },
    ];

    for (const b of bambooPoles) {
      const topX = b.x + sway * (b.h / 250);
      const topY = GROUND_Y - b.h;

      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, GROUND_Y);
      ctx.quadraticCurveTo(b.x + sway * 0.4, GROUND_Y - b.h * 0.5, topX, topY);
      ctx.stroke();

      ctx.strokeStyle = '#050a08';
      ctx.lineWidth = 2.5;
      for (let s = 1; s <= 4; s++) {
        const segRatio = s / 5;
        const jx = b.x + (topX - b.x) * segRatio;
        const jy = GROUND_Y - b.h * segRatio;
        ctx.beginPath();
        ctx.moveTo(jx - b.w, jy);
        ctx.lineTo(jx + b.w, jy);
        ctx.stroke();

        if (s >= 2) {
          ctx.fillStyle = b.color;
          const leafSway = sway * 0.7;
          ctx.beginPath();
          ctx.ellipse(jx + leafSway + 12, jy - 6, 14, 4, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // 判定線光環
  private renderHitZones(ctx: CanvasRenderingContext2D, songTime: number): void {
    const pulse = 1.0 + Math.sin(songTime * 12) * 0.08;
    const leftHitX = CENTER_X - HIT_DISTANCE_OFFSET;
    const rightHitX = CENTER_X + HIT_DISTANCE_OFFSET;

    ctx.save();
    // 左判定環 (格擋)
    ctx.strokeStyle = 'rgba(255, 230, 80, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(leftHitX, GROUND_Y - 35, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // 右判定環 (看破)
    ctx.strokeStyle = 'rgba(0, 230, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(rightHitX, GROUND_Y - 35, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // 上判定環 (向上看破跳躍)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(CENTER_X, GROUND_Y - 85, 24 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // 居合一閃黑白高反差與全屏斬痕
  private renderIaiSlashOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.lineWidth = 14;
    ctx.strokeStyle = '#ff003c';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 35);
    ctx.lineTo(this.width, GROUND_Y - 35);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 35);
    ctx.lineTo(this.width, GROUND_Y - 35);
    ctx.stroke();
    ctx.restore();
  }

  // 慢動作終結特寫：宣紙水墨留白濾鏡 (Cinematic Slow-mo Deathblow Finisher)
  private renderSlowmoCinematicFilter(
    ctx: CanvasRenderingContext2D,
    samurai: Samurai,
    progress: number
  ): void {
    ctx.save();
    // 宣紙半透明米白覆蓋，形成強烈黑白水墨反差
    ctx.fillStyle = `rgba(245, 242, 232, ${0.45 * progress})`;
    ctx.fillRect(0, 0, this.width, this.height);

    // 上下電影寬銀幕黑邊 (Cinematic Letterbox Bars)
    const barH = 50 * progress;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, barH);
    ctx.fillRect(0, this.height - barH, this.width, barH);

    // 慢動作毛筆書法大字「看 破・誅」
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 64px "PingFang TC", "Microsoft JhengHei", serif';
    ctx.fillStyle = '#ff1744';
    ctx.fillText('看 破・天 誅', CENTER_X, 130);

    ctx.restore();
  }

  // 手機觸控螢幕區域半透明引導線
  private renderTouchZonesGuide(
    ctx: CanvasRenderingContext2D,
    splitRatio: number,
    touchInvert: boolean
  ): void {
    ctx.save();
    const splitX = this.width * splitRatio;
    const jumpH = this.height * 0.35;

    // 上方跳躍區域虛線
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, jumpH);
    ctx.lineTo(this.width, jumpH);
    ctx.stroke();

    // 下方左右分割虛線
    ctx.beginPath();
    ctx.moveTo(splitX, jumpH);
    ctx.lineTo(splitX, this.height);
    ctx.stroke();

    ctx.restore();
  }

  // HUD 介面
  private renderHUD(
    ctx: CanvasRenderingContext2D,
    samurai: Samurai,
    stats: CombatStats,
    enemyPosture: number,
    currentWave: number,
    calibrationOffsetMs: number,
    isMuted: boolean,
    isBossWave: boolean,
    gameMode: GameMode,
    currentBpm: number,
    selectedBladeTrail: BladeTrailStyle
  ): void {
    ctx.save();

    // 1. 頂部架勢值
    const barWidth = 340;
    const barHeight = 13;
    const barX = (this.width - barWidth) / 2;
    const barY = 28;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.strokeStyle = isBossWave ? '#c850ff' : '#444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    const enemyRatio = Math.min(1.0, enemyPosture / MAX_POSTURE);
    const enemyGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    if (isBossWave) {
      enemyGrad.addColorStop(0, '#c850ff');
      enemyGrad.addColorStop(1, '#ff0055');
    } else {
      enemyGrad.addColorStop(0, '#ff9900');
      enemyGrad.addColorStop(1, '#ff003c');
    }
    ctx.fillStyle = enemyGrad;
    ctx.fillRect(barX, barY, barWidth * enemyRatio, barHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    const bossTitle = isBossWave
      ? '【影之劍聖】架勢 (BOSS POSTURE)'
      : (gameMode === 'ENDLESS' ? '無盡修羅架勢 (POSTURE)' : '敵陣架勢 (POSTURE)');
    ctx.fillText(`${bossTitle}: ${Math.floor(enemyPosture)}%`, CENTER_X, barY - 8);

    // 2. 左上角：模式與波次/BPM
    ctx.textAlign = 'left';
    ctx.font = '900 20px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = isBossWave ? '#c850ff' : '#ff2a4a';
    if (gameMode === 'ENDLESS') {
      ctx.fillText(`無盡道場  BPM: ${Math.floor(currentBpm)}`, 36, 36);
      ctx.font = 'bold 14px "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`已斬殺: ${stats.endlessKills} 敵`, 36, 58);
    } else {
      ctx.fillText(isBossWave ? 'BOSS: 影之劍聖' : `WAVE: 0${currentWave}`, 36, 36);
    }

    // 3. 右上角：得分與 COMBO
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SCORE: ${stats.score.toLocaleString()}`, this.width - 36, 34);

    if (stats.combo > 0) {
      const isFever = stats.combo >= FEVER_COMBO_THRESHOLD;
      ctx.font = '900 24px "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = isFever ? '#00f0ff' : (stats.combo >= 10 ? '#ffd700' : '#ffffff');
      ctx.fillText(`${stats.combo} COMBO!`, this.width - 36, 64);

      if (isFever) {
        ctx.font = 'bold 13px "PingFang TC", "Microsoft JhengHei", sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('【極意境界 FEVER 2.5x】', this.width - 36, 84);
      }
    }

    // 光刃樣式標籤 (右上小角)
    ctx.font = 'bold 12px "PingFang TC", "Microsoft JhengHei", sans-serif';
    let trailLabel = '【蒼雷之刃】';
    let trailCol = '#00f0ff';
    if (selectedBladeTrail === 'CRIMSON') {
      trailLabel = '【猩紅煞氣】';
      trailCol = '#ff1744';
    } else if (selectedBladeTrail === 'SOLAR') {
      trailLabel = '【璀璨金芒】';
      trailCol = '#ffd700';
    }
    ctx.fillStyle = trailCol;
    ctx.fillText(trailLabel, this.width - 36, 104);

    // 4. 左下角：武士 HP
    const hpBarW = 160;
    const hpBarH = 10;
    const hpX = 36;
    const hpY = this.height - 38;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
    const hpRatio = samurai.hp / MAX_HP;
    ctx.fillStyle = hpRatio > 0.3 ? '#2ed573' : '#ff4757';
    ctx.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH);

    ctx.fillStyle = '#dddddd';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`HP: ${Math.floor(samurai.hp)}/${MAX_HP}`, hpX, hpY - 5);

    // 5. 武士自身架勢條
    const pBarW = 160;
    const pBarH = 10;
    const pX = hpX + hpBarW + 24;
    const pY = hpY;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(pX, pY, pBarW, pBarH);
    const pRatio = samurai.posture / MAX_POSTURE;
    ctx.fillStyle = samurai.isPostureBroken ? '#ff003c' : '#ffa502';
    ctx.fillRect(pX, pY, pBarW * pRatio, pBarH);

    ctx.fillStyle = samurai.isPostureBroken ? '#ff4757' : '#dddddd';
    ctx.fillText(samurai.isPostureBroken ? '自身失衡 (BROKEN!)' : `自身架勢: ${Math.floor(samurai.posture)}%`, pX, pY - 5);

    // 6. 底部中央鍵位指引
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('招架: [J]/[A]/[←]  |  看破: [K]/[D]/[→]  |  跳躍看破: [W]/[↑]/[Space]', CENTER_X, this.height - 18);

    // 7. 右下角資訊
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px sans-serif';
    const muteText = isMuted ? '[靜音 🔇]' : '[音效 🔊]';
    ctx.fillText(`校準: ${calibrationOffsetMs}ms  ${muteText}`, this.width - 36, this.height - 18);

    ctx.restore();
  }

  // 標題畫面
  private renderTitleScreen(
    ctx: CanvasRenderingContext2D,
    stats: CombatStats,
    isMuted: boolean,
    offsetMs: number,
    selectedBladeTrail: BladeTrailStyle
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 6, 12, 0.68)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 68px "PingFang TC", "Microsoft JhengHei", sans-serif';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText('極 意 一 閃', CENTER_X + 4, 134);
    ctx.fillStyle = '#ff2a4a';
    ctx.fillText('極 意 一 閃', CENTER_X - 1, 130);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('極 意 一 閃', CENTER_X, 130);

    ctx.font = 'bold 22px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('雷雨天守閣 × 無盡道場  //  SLASH BEAT  v1.2.0', CENTER_X, 185);

    // 戰績歷史
    ctx.font = '14px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`修羅最高: ${stats.score.toLocaleString()} (評級: [${stats.grade}])  |  無盡斬殺: ${stats.endlessKills} 敵`, CENTER_X, 225);

    // 按鈕組：
    // 1. 浪人修羅道 (WAVES) 按鈕
    const btnW = 180;
    const btnH = 46;
    const btn1X = CENTER_X - 190;
    const btnY = 270;

    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.roundRect(btn1X, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('修羅波次 (STORY)', btn1X + btnW / 2, btnY + btnH / 2);

    // 2. 無盡道場試煉 (ENDLESS) 按鈕
    const btn2X = CENTER_X + 10;
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath();
    ctx.roundRect(btn2X, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('無盡道場 (DOJO)', btn2X + btnW / 2, btnY + btnH / 2);

    // 3. 刀光光刃風格切換按鈕 (Blade Trail Switch)
    const trailBtnW = 220;
    const trailBtnH = 36;
    const trailBtnX = CENTER_X - trailBtnW / 2;
    const trailBtnY = 335;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(trailBtnX, trailBtnY, trailBtnW, trailBtnH, 4);
    ctx.fill();

    let trailName = '蒼雷之刃 (Azure)';
    let trailCol = '#00f0ff';
    if (selectedBladeTrail === 'CRIMSON') {
      trailName = '猩紅煞氣 (Crimson)';
      trailCol = '#ff1744';
    } else if (selectedBladeTrail === 'SOLAR') {
      trailName = '璀璨金芒 (Solar)';
      trailCol = '#ffd700';
    }

    ctx.fillStyle = trailCol;
    ctx.font = 'bold 14px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`刀光: ${trailName}`, CENTER_X, trailBtnY + trailBtnH / 2);

    // 4. 節奏校準按鈕
    const calW = 180;
    const calH = 34;
    const calX = CENTER_X - calW / 2;
    const calY = 385;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(calX, calY, calW, calH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`節奏校準 (${offsetMs > 0 ? '+' : ''}${offsetMs}ms)`, CENTER_X, calY + calH / 2);

    // 操作提示
    ctx.font = '13px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('[J]/[A] 格擋飛鏢與斬擊  |  [K]/[D] 看破直刺  |  [W]/[Space] 跳躍看破掃堂腿', CENTER_X, 455);
    ctx.fillText('【雷雨天守閣・雙手裏劍忍者・長槍僧兵・狂暴津輕三味線獨奏全面實裝】', CENTER_X, 485);

    ctx.restore();
  }

  // 校準介面
  private renderCalibrationScreen(
    ctx: CanvasRenderingContext2D,
    songTime: number,
    offsetMs: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 10, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('節 奏 延 遲 校 準', CENTER_X, 90);

    ctx.font = '15px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('聆聽節拍敲擊聲，在光環重合瞬間按鍵並微調補償', CENTER_X, 130);

    const beatPhase = (songTime * 2) % 1;
    const ringRadius = 26 + (1 - beatPhase) * 70;

    ctx.strokeStyle = beatPhase < 0.1 ? '#00f0ff' : '#ff1744';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(CENTER_X, 245, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(CENTER_X, 245, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`當前音訊延遲補償: ${offsetMs > 0 ? '+' : ''}${offsetMs} ms`, CENTER_X, 345);

    const btnMinusW = 120;
    const btnMinusX = CENTER_X - 140;
    const btnPlusX = CENTER_X + 20;
    const adjBtnY = 375;
    const adjBtnH = 38;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(btnMinusX, adjBtnY, btnMinusW, adjBtnH, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('[J] -10 ms', btnMinusX + btnMinusW / 2, adjBtnY + adjBtnH / 2 + 5);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(btnPlusX, adjBtnY, btnMinusW, adjBtnH, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[K] +10 ms', btnPlusX + btnMinusW / 2, adjBtnY + adjBtnH / 2 + 5);

    const okW = 180;
    const okH = 42;
    const okX = CENTER_X - okW / 2;
    const okY = 445;

    ctx.fillStyle = '#2ed573';
    ctx.beginPath();
    ctx.roundRect(okX, okY, okW, okH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('保存校準並返回', CENTER_X, okY + okH / 2 + 5);

    ctx.restore();
  }

  // 倒數畫面
  private renderCountdown(ctx: CanvasRenderingContext2D, val: number, isBoss: boolean, mode: GameMode): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 96px "PingFang TC", "Microsoft JhengHei", sans-serif';

    const text = val > 0 ? `${val}` : (mode === 'ENDLESS' ? '狂 飆！' : (isBoss ? '斬！' : '一 閃！'));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText(text, CENTER_X + 4, GROUND_Y - 76);

    ctx.fillStyle = val > 0 ? '#ffffff' : (mode === 'ENDLESS' ? '#00f0ff' : (isBoss ? '#c850ff' : '#ff003c'));
    ctx.fillText(text, CENTER_X, GROUND_Y - 80);
    ctx.restore();
  }

  // 絕殺契機
  private renderDeathblowWindow(ctx: CanvasRenderingContext2D, songTime: number, isBoss: boolean): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, this.width, this.height);

    const pulse = 1.0 + Math.sin(songTime * 16) * 0.1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.floor(72 * pulse)}px "PingFang TC", "Microsoft JhengHei", sans-serif`;

    ctx.fillStyle = isBoss ? '#c850ff' : '#ff003c';
    ctx.fillText('死', CENTER_X, GROUND_Y - 140);

    ctx.font = 'bold 24px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isBoss ? '按 [K] 發動【影之奧義・居合處決】！' : '按 [K] 發動【居合一閃】清屏！', CENTER_X, GROUND_Y - 80);

    ctx.restore();
  }

  // 通關覆蓋層
  private renderWaveClearOverlay(ctx: CanvasRenderingContext2D, wave: number, isBoss: boolean): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = '900 48px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = isBoss ? '#c850ff' : '#ffd700';
    ctx.fillText(isBoss ? '影之劍聖 破斬肅清！' : `WAVE 0${wave} 肅 清！`, CENTER_X, GROUND_Y - 90);

    ctx.font = 'bold 20px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('修羅道深化，節奏加速！', CENTER_X, GROUND_Y - 40);

    ctx.restore();
  }

  // 結算畫面
  private renderGameOverScreen(
    ctx: CanvasRenderingContext2D,
    stats: CombatStats,
    wave: number,
    gameMode: GameMode
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 6, 12, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2a4a';
    ctx.font = '900 44px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(gameMode === 'ENDLESS' ? '無 盡 道 場 結 算' : '戰  局  結  算', CENTER_X, 85);

    ctx.font = '900 72px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = stats.grade === 'SSS' || stats.grade === 'SS' ? '#ffd700' : (stats.grade === 'S' ? '#00e5ff' : '#ffffff');
    ctx.fillText(stats.grade, CENTER_X, 165);

    ctx.font = '16px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#e0e0e0';

    const rowY = 225;
    const spacing = 26;
    ctx.fillText(`最終評分: ${stats.score.toLocaleString()}`, CENTER_X, rowY);

    if (gameMode === 'ENDLESS') {
      ctx.fillText(`已斬殺刺客: ${stats.endlessKills} 敵   最大連擊: ${stats.maxCombo}`, CENTER_X, rowY + spacing);
    } else {
      ctx.fillText(`肅清波次: Wave ${wave}   最大連擊: ${stats.maxCombo}`, CENTER_X, rowY + spacing);
    }

    ctx.fillText(`極意招架 (PERFECT): ${stats.perfectCount}   看破突刺: ${stats.mikiriCount}`, CENTER_X, rowY + spacing * 2);
    ctx.fillText(`跳躍看破 (JUMP): ${stats.jumpCounterCount}   受創失誤: ${stats.missCount}`, CENTER_X, rowY + spacing * 3);

    const btnW = 180;
    const btnH = 46;
    const btnX = CENTER_X - btnW / 2;
    const btnY = 365;

    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('再  戰 (RESTART)', CENTER_X, btnY + btnH / 2 + 6);

    ctx.font = '14px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('按 [空白鍵] 或點擊按鈕重啟挑戰', CENTER_X, 445);

    ctx.restore();
  }
}
