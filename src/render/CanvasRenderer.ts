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
import { GameState, CombatStats, FoliageParticle } from '../types';
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

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initFoliage();
  }

  private initFoliage(): void {
    this.foliage = [];
    for (let i = 0; i < 48; i++) {
      const isSakura = Math.random() > 0.35;
      this.foliage.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 25 + Math.random() * 55,
        vy: 18 + Math.random() * 40,
        size: isSakura ? 3 + Math.random() * 4 : 4 + Math.random() * 5,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 4.0,
        alpha: 0.35 + Math.random() * 0.55,
        type: isSakura ? 'SAKURA' : 'BAMBOO',
      });
    }
  }

  public updateAmbient(dt: number): void {
    for (const p of this.foliage) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.vAngle * dt;
      if (p.x > this.width + 30) p.x = -30;
      if (p.y > this.height + 30) p.y = -30;
    }
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
    isBossWave: boolean = false
  ): void {
    const ctx = this.ctx;

    // 清屏
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // 應用相機震動與縮放特寫
    camera.applyTransform(ctx);

    // 1. 繪製背景 (血月、山巒、水墨搖曳竹林、地表)
    this.renderBackground(ctx, songTime, stats.combo);

    // 2. 戰鬥相關實體與判定線
    if (state === 'COMBAT' || state === 'READY' || state === 'DEATHBLOW_WINDOW' || state === 'IAI_SLASH_BURST') {
      this.renderHitZones(ctx, songTime);

      // 敵兵
      for (const enemy of enemies) {
        enemy.render(ctx, songTime);
      }

      // 中央武士
      samurai.render(ctx);

      // 特效層 (火花、浮動文字、飛墨、蒼藍烈焰、危字印記)
      vfx.render(ctx);

      // 居合一閃反色高光
      if (vfx.isIaiInverted || state === 'IAI_SLASH_BURST') {
        this.renderIaiSlashOverlay(ctx);
      }

      // HUD 介面
      this.renderHUD(ctx, samurai, stats, enemyPosture, currentWave, calibrationOffsetMs, isMuted, isBossWave);
    }

    // 3. 各狀態特定覆蓋層
    if (state === 'TITLE') {
      this.renderTitleScreen(ctx, stats, isMuted, calibrationOffsetMs);
    } else if (state === 'CALIBRATION') {
      this.renderCalibrationScreen(ctx, songTime, calibrationOffsetMs);
    } else if (state === 'READY') {
      this.renderCountdown(ctx, countdownVal, isBossWave);
    } else if (state === 'DEATHBLOW_WINDOW') {
      this.renderDeathblowWindow(ctx, songTime, isBossWave);
    } else if (state === 'WAVE_CLEAR') {
      this.renderWaveClearOverlay(ctx, currentWave, isBossWave);
    } else if (state === 'GAME_OVER') {
      this.renderGameOverScreen(ctx, stats, currentWave);
    }

    ctx.restore();
  }

  // 1. 背景繪製：深黑水墨天幕、賽博紅月、遠山、水墨竹林（隨刀風搖曳）、和風地表網格
  private renderBackground(ctx: CanvasRenderingContext2D, songTime: number, combo: number): void {
    // 夜空背景
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#0a0a14');
    skyGrad.addColorStop(0.65, '#161426');
    skyGrad.addColorStop(1, '#08080e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 賽博血月 (Cyber Blood Moon)
    const moonCx = CENTER_X;
    const moonCy = 170;
    const moonRadius = 110;

    // 月之光暈
    const moonGlow = ctx.createRadialGradient(moonCx, moonCy, moonRadius * 0.4, moonCx, moonCy, moonRadius * 1.8);
    moonGlow.addColorStop(0, 'rgba(235, 30, 60, 0.45)');
    moonGlow.addColorStop(0.5, 'rgba(200, 20, 50, 0.15)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonCx, moonCy, moonRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 實體紅月
    const moonBody = ctx.createRadialGradient(moonCx - 30, moonCy - 30, 20, moonCx, moonCy, moonRadius);
    moonBody.addColorStop(0, '#ff3b56');
    moonBody.addColorStop(0.7, '#d61338');
    moonBody.addColorStop(1, '#8f0b24');
    ctx.fillStyle = moonBody;
    ctx.beginPath();
    ctx.arc(moonCx, moonCy, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // 遠景水墨山巒 (第一層)
    ctx.fillStyle = 'rgba(22, 18, 36, 0.75)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 260);
    ctx.bezierCurveTo(200, 210, 360, 270, 500, 230);
    ctx.bezierCurveTo(680, 190, 820, 250, this.width, 240);
    ctx.lineTo(this.width, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // 近景水墨山巒 (第二層)
    ctx.fillStyle = '#100e1c';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 310);
    ctx.bezierCurveTo(180, 280, 320, 330, 480, 300);
    ctx.bezierCurveTo(640, 270, 800, 320, this.width, 300);
    ctx.lineTo(this.width, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // 浮世繪風格：水墨竹林 (Bamboo Forest)，狂暴連擊時隨刀風劇烈搖曳！
    this.renderBambooForest(ctx, songTime, combo);

    // 和風透視地表網格
    ctx.fillStyle = '#06060a';
    ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);

    // 地平線水墨血線
    ctx.strokeStyle = '#e61e38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(this.width, GROUND_Y);
    ctx.stroke();

    // 網格橫線
    ctx.strokeStyle = 'rgba(230, 30, 60, 0.22)';
    ctx.lineWidth = 1;
    for (const gy of [GROUND_Y + 15, GROUND_Y + 35, GROUND_Y + 65, GROUND_Y + 105, GROUND_Y + 150]) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(this.width, gy);
      ctx.stroke();
    }

    // 網格放射縱線
    const gridSpeed = (songTime * 40) % 60;
    for (let gx = -120 + gridSpeed; gx < this.width + 120; gx += 60) {
      ctx.beginPath();
      ctx.moveTo(gx, this.height);
      ctx.lineTo(CENTER_X + (gx - CENTER_X) * 0.12, GROUND_Y);
      ctx.stroke();
    }

    // 飄落的櫻花瓣與水墨竹葉
    for (const p of this.foliage) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      if (p.type === 'SAKURA') {
        // 櫻花瓣 (粉紅飄逸)
        ctx.fillStyle = '#ff5388';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 水墨竹葉 (深竹青)
        ctx.fillStyle = '#225538';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2.2, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 繪製水墨竹林 (Bamboo Forest)
  private renderBambooForest(ctx: CanvasRenderingContext2D, songTime: number, combo: number): void {
    ctx.save();

    // 計算刀風搖曳幅度：連擊越高，刀氣越烈！
    const isFever = combo >= FEVER_COMBO_THRESHOLD;
    const windBase = combo >= 10 ? 12 : 3;
    const windForce = isFever ? 26 : windBase;
    const sway = Math.sin(songTime * 8) * windForce;

    // 竹林分佈在畫面左右兩翼 (左側 60~280，右側 680~900)
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

      // 竹竿主幹 (帶弧度隨風彎曲)
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, GROUND_Y);
      ctx.quadraticCurveTo(b.x + sway * 0.4, GROUND_Y - b.h * 0.5, topX, topY);
      ctx.stroke();

      // 竹節裝飾橫紋
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

        // 竹節生長細葉
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

    // 左判定環 (格擋)
    ctx.save();
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
    ctx.restore();
  }

  // 居合一閃黑白高反差與橫貫全屏斬痕
  private renderIaiSlashOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // 全屏白芒
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    // 橫切全屏的血色居合雷鳴光刃
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#ff003c';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 35);
    ctx.lineTo(this.width, GROUND_Y - 35);
    ctx.stroke();

    // 極限黑水墨刀光
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 35);
    ctx.lineTo(this.width, GROUND_Y - 35);
    ctx.stroke();

    ctx.restore();
  }

  // HUD 介面：血量、架勢條、Boss 架勢、分數、連擊、極意境界 (Fever)
  private renderHUD(
    ctx: CanvasRenderingContext2D,
    samurai: Samurai,
    stats: CombatStats,
    enemyPosture: number,
    currentWave: number,
    calibrationOffsetMs: number,
    isMuted: boolean,
    isBossWave: boolean
  ): void {
    ctx.save();

    // 1. 頂部敵方/Boss 架勢值
    const barWidth = 340;
    const barHeight = 13;
    const barX = (this.width - barWidth) / 2;
    const barY = 28;

    // 架勢底框
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.strokeStyle = isBossWave ? '#c850ff' : '#444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // 敵方架勢進度
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

    // 敵方/Boss 標籤
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    const bossTitle = isBossWave ? '【影之劍聖】架勢 (BOSS POSTURE)' : '敵陣架勢 (POSTURE)';
    ctx.fillText(`${bossTitle}: ${Math.floor(enemyPosture)}%`, CENTER_X, barY - 8);

    // 2. 左上角：波次 WAVE
    ctx.textAlign = 'left';
    ctx.font = '900 20px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = isBossWave ? '#c850ff' : '#ff2a4a';
    ctx.fillText(isBossWave ? 'BOSS: 影之劍聖' : `WAVE: 0${currentWave}`, 36, 36);

    // 3. 右上角：得分 SCORE 與 COMBO
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SCORE: ${stats.score.toLocaleString()}`, this.width - 36, 34);

    // 連擊數與極意境界 (FEVER RUSH) 演出
    if (stats.combo > 0) {
      const isFever = stats.combo >= FEVER_COMBO_THRESHOLD;
      ctx.font = '900 24px "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = isFever ? '#00f0ff' : (stats.combo >= 10 ? '#ffd700' : '#ffffff');
      ctx.fillText(`${stats.combo} COMBO!`, this.width - 36, 64);

      if (isFever) {
        // 蒼藍極意境界徽標
        ctx.font = 'bold 13px "PingFang TC", "Microsoft JhengHei", sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('【極意境界 FEVER 2.5x】', this.width - 36, 84);
      }
    }

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

    // 6. 底部中央觸控分區與按鍵指引
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('左側: [J] 招架 (PARRY)   |   右側: [K] 看破 (SLASH)', CENTER_X, this.height - 18);

    // 7. 右下角：靜音與校準資訊
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px sans-serif';
    const muteText = isMuted ? '[靜音中 🔇]' : '[音效開 🔊]';
    ctx.fillText(`CALIB: ${calibrationOffsetMs}ms   ${muteText}`, this.width - 36, this.height - 18);

    ctx.restore();
  }

  // 標題畫面
  private renderTitleScreen(
    ctx: CanvasRenderingContext2D,
    stats: CombatStats,
    isMuted: boolean,
    offsetMs: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 6, 12, 0.65)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 68px "PingFang TC", "Microsoft JhengHei", sans-serif';

    // 標題陰影與重墨
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText('極 意 一 閃', CENTER_X + 4, 154);

    ctx.fillStyle = '#ff2a4a';
    ctx.fillText('極 意 一 閃', CENTER_X - 1, 150);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('極 意 一 閃', CENTER_X, 150);

    // 副標題
    ctx.font = 'bold 22px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('節 奏 打 鐵  //  SLASH BEAT  v1.1.0', CENTER_X, 215);

    // 歷史最高戰績
    ctx.font = '15px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`最高評分: ${stats.score.toLocaleString()}   最高連擊: ${stats.maxCombo}   評級: [${stats.grade}]`, CENTER_X, 260);

    // 開始出陣按鈕 (START)
    const btnW = 200;
    const btnH = 50;
    const btnX = CENTER_X - btnW / 2;
    const btnY = 320;

    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('出  陣 (START)', CENTER_X, btnY + btnH / 2);

    // 節奏校準按鈕 (CALIBRATE)
    const calW = 180;
    const calH = 38;
    const calX = CENTER_X - calW / 2;
    const calY = 390;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(calX, calY, calW, calH, 4);
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 14px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`節奏校準 (${offsetMs > 0 ? '+' : ''}${offsetMs}ms)`, CENTER_X, calY + calH / 2);

    // 操作指南提示
    ctx.font = '13px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('按 [J] 格擋普通與連斬  |  按 [K] 看破「危」字與躍空斬  |  按 [空白鍵] 出陣', CENTER_X, 470);
    ctx.fillText(isMuted ? '【點擊右上角或按 ESC 解除靜音】' : '【全新「影之劍聖」BOSS、水墨筆觸、蒼藍極意境界已解鎖】', CENTER_X, 498);

    ctx.restore();
  }

  // 校準介面 (提供節奏節拍器校準頁面，微調耳機/螢幕音訊延遲補償 ±150ms)
  private renderCalibrationScreen(
    ctx: CanvasRenderingContext2D,
    songTime: number,
    offsetMs: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 10, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('節 奏 延 遲 校 準', CENTER_X, 90);

    ctx.font = '15px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('聆聽節拍敲擊聲，觀察收縮光環在重合瞬間敲擊 [J]，並微調補償', CENTER_X, 130);

    // 視覺節拍器指示器 (BPM 120 脈動)
    const beatPhase = (songTime * 2) % 1; // 1秒2拍 (500ms 一拍)
    const ringRadius = 26 + (1 - beatPhase) * 70;

    // 外收縮光環
    ctx.strokeStyle = beatPhase < 0.1 ? '#00f0ff' : '#ff1744';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(CENTER_X, 245, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 判定圓心
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(CENTER_X, 245, 26, 0, Math.PI * 2);
    ctx.fill();

    // 當前校準數值
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`當前音訊延遲補償: ${offsetMs > 0 ? '+' : ''}${offsetMs} ms`, CENTER_X, 345);

    // 微調按鈕指引 (提供 -10ms 與 +10ms 視覺按鈕)
    const btnMinusW = 120;
    const btnMinusX = CENTER_X - 140;
    const btnPlusX = CENTER_X + 20;
    const adjBtnY = 375;
    const adjBtnH = 38;

    // -10ms 按鈕
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(btnMinusX, adjBtnY, btnMinusW, adjBtnH, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('[J] -10 ms', btnMinusX + btnMinusW / 2, adjBtnY + adjBtnH / 2 + 5);

    // +10ms 按鈕
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(btnPlusX, adjBtnY, btnMinusW, adjBtnH, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[K] +10 ms', btnPlusX + btnMinusW / 2, adjBtnY + adjBtnH / 2 + 5);

    // 完成校準按鈕
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

  // 預備倒數 (3-2-1)
  private renderCountdown(ctx: CanvasRenderingContext2D, val: number, isBoss: boolean): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 96px "PingFang TC", "Microsoft JhengHei", sans-serif';

    const text = val > 0 ? `${val}` : (isBoss ? '斬！' : '一 閃！');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText(text, CENTER_X + 4, GROUND_Y - 76);

    ctx.fillStyle = val > 0 ? '#ffffff' : (isBoss ? '#c850ff' : '#ff003c');
    ctx.fillText(text, CENTER_X, GROUND_Y - 80);
    ctx.restore();
  }

  // 絕殺契機 (DEATHBLOW_WINDOW)
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

  // 波次通關覆蓋層
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
  private renderGameOverScreen(ctx: CanvasRenderingContext2D, stats: CombatStats, wave: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 6, 12, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2a4a';
    ctx.font = '900 44px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('戰  局  結  算', CENTER_X, 85);

    // 評級徽章
    ctx.font = '900 72px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = stats.grade === 'SSS' || stats.grade === 'SS' ? '#ffd700' : (stats.grade === 'S' ? '#00e5ff' : '#ffffff');
    ctx.fillText(stats.grade, CENTER_X, 165);

    // 戰績明細
    ctx.font = '16px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#e0e0e0';

    const rowY = 225;
    const spacing = 28;
    ctx.fillText(`最終評分: ${stats.score.toLocaleString()}`, CENTER_X, rowY);
    ctx.fillText(`肅清波次: Wave ${wave}   最大連擊: ${stats.maxCombo}`, CENTER_X, rowY + spacing);
    ctx.fillText(`極意招架 (PERFECT): ${stats.perfectCount}   看破 (MIKIRI): ${stats.mikiriCount}`, CENTER_X, rowY + spacing * 2);
    ctx.fillText(`防禦 (GOOD): ${stats.goodCount}   漏招受創: ${stats.missCount}`, CENTER_X, rowY + spacing * 3);

    // 再戰按鈕 (RESTART)
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
