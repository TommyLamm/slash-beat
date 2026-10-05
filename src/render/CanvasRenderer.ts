import {
  VIRTUAL_WIDTH,
  VIRTUAL_HEIGHT,
  CENTER_X,
  GROUND_Y,
  HIT_DISTANCE_OFFSET,
  MAX_HP,
  MAX_POSTURE,
} from '../core/Constants';
import { GameState, CombatStats } from '../types';
import { Samurai } from '../entities/Samurai';
import { EnemyNinja } from '../entities/EnemyNinja';
import { VisualEffectManager } from './VisualEffectManager';
import { Camera } from './Camera';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = VIRTUAL_WIDTH;
  private height: number = VIRTUAL_HEIGHT;

  // 飄落花瓣與墨點粒子
  private ambientPetals: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initAmbientPetals();
  }

  private initAmbientPetals(): void {
    this.ambientPetals = [];
    for (let i = 0; i < 35; i++) {
      this.ambientPetals.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 20 + Math.random() * 40,
        vy: 15 + Math.random() * 30,
        size: 2.5 + Math.random() * 4.5,
        alpha: 0.3 + Math.random() * 0.6,
      });
    }
  }

  public updateAmbient(dt: number): void {
    for (const p of this.ambientPetals) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x > this.width + 20) p.x = -20;
      if (p.y > this.height + 20) p.y = -20;
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
    isMuted: boolean
  ): void {
    const ctx = this.ctx;

    // 清屏
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // 應用相機震動
    camera.applyTransform(ctx);

    // 1. 繪製背景 (血月、山巒、地表)
    this.renderBackground(ctx, songTime);

    // 2. 戰鬥相關實體與判定線
    if (state === 'COMBAT' || state === 'READY' || state === 'DEATHBLOW_WINDOW' || state === 'IAI_SLASH_BURST') {
      this.renderHitZones(ctx, songTime);

      // 敵兵
      for (const enemy of enemies) {
        enemy.render(ctx, songTime);
      }

      // 中央武士
      samurai.render(ctx);

      // 特效層 (火花、浮動文字、飛墨)
      vfx.render(ctx);

      // 居合一閃反色高光
      if (vfx.isIaiInverted || state === 'IAI_SLASH_BURST') {
        this.renderIaiSlashOverlay(ctx);
      }

      // HUD 介面
      this.renderHUD(ctx, samurai, stats, enemyPosture, currentWave, calibrationOffsetMs, isMuted);
    }

    // 3. 各狀態特定覆蓋層
    if (state === 'TITLE') {
      this.renderTitleScreen(ctx, stats, isMuted, calibrationOffsetMs);
    } else if (state === 'CALIBRATION') {
      this.renderCalibrationScreen(ctx, songTime, calibrationOffsetMs);
    } else if (state === 'READY') {
      this.renderCountdown(ctx, countdownVal);
    } else if (state === 'DEATHBLOW_WINDOW') {
      this.renderDeathblowWindow(ctx, songTime);
    } else if (state === 'WAVE_CLEAR') {
      this.renderWaveClearOverlay(ctx, currentWave);
    } else if (state === 'GAME_OVER') {
      this.renderGameOverScreen(ctx, stats, currentWave);
    }

    ctx.restore();
  }

  // 1. 背景繪製：深黑水墨天幕、賽博紅月、遠山、和風地表網格
  private renderBackground(ctx: CanvasRenderingContext2D, songTime: number): void {
    // 夜空背景
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#0a0a14');
    skyGrad.addColorStop(0.65, '#161426');
    skyGrad.addColorStop(1, '#08080e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 賽博血月 (Cyber Blood Moon)
    const moonCx = CENTER_X;
    const moonCy = 175;
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

    // 網格放射縱線 (透視移動效果)
    const gridSpeed = (songTime * 40) % 60;
    for (let gx = -120 + gridSpeed; gx < this.width + 120; gx += 60) {
      ctx.beginPath();
      ctx.moveTo(gx, this.height);
      ctx.lineTo(CENTER_X + (gx - CENTER_X) * 0.12, GROUND_Y);
      ctx.stroke();
    }

    // 漂浮櫻花瓣與水墨點
    for (const p of this.ambientPetals) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#ff4070';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 1.4, p.size * 0.8, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 判定線光環
  private renderHitZones(ctx: CanvasRenderingContext2D, songTime: number): void {
    const pulse = 1.0 + Math.sin(songTime * 12) * 0.08;
    const leftHitX = CENTER_X - HIT_DISTANCE_OFFSET;
    const rightHitX = CENTER_X + HIT_DISTANCE_OFFSET;

    // 左判定環 (格擋)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 230, 80, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(leftHitX, GROUND_Y - 35, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // 右判定環 (看破)
    ctx.strokeStyle = 'rgba(0, 230, 255, 0.45)';
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
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ff003c';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 35);
    ctx.lineTo(this.width, GROUND_Y - 35);
    ctx.stroke();

    // 極限黑水墨刀光
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 35);
    ctx.lineTo(this.width, GROUND_Y - 35);
    ctx.stroke();

    ctx.restore();
  }

  // HUD 介面：血量、架勢條、Boss 架勢、分數、連擊
  private renderHUD(
    ctx: CanvasRenderingContext2D,
    samurai: Samurai,
    stats: CombatStats,
    enemyPosture: number,
    currentWave: number,
    calibrationOffsetMs: number,
    isMuted: boolean
  ): void {
    ctx.save();

    // 1. 頂部敵方架勢值 (BOSS/敵人架勢條)
    const barWidth = 320;
    const barHeight = 12;
    const barX = (this.width - barWidth) / 2;
    const barY = 28;

    // 架勢底框
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // 敵方架勢進度 (滿 100 觸發居合一閃)
    const enemyRatio = Math.min(1.0, enemyPosture / MAX_POSTURE);
    const enemyGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    enemyGrad.addColorStop(0, '#ff9900');
    enemyGrad.addColorStop(1, '#ff003c');
    ctx.fillStyle = enemyGrad;
    ctx.fillRect(barX, barY, barWidth * enemyRatio, barHeight);

    // 敵方架勢標籤
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`敵陣架勢 (POSTURE): ${Math.floor(enemyPosture)}%`, CENTER_X, barY - 8);

    // 2. 左上角：波次 WAVE
    ctx.textAlign = 'left';
    ctx.font = '900 20px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ff2a4a';
    ctx.fillText(`WAVE: 0${currentWave}`, 36, 36);

    // 3. 右上角：得分 SCORE 與 COMBO
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SCORE: ${stats.score.toLocaleString()}`, this.width - 36, 34);

    // 連擊數與極意倍率
    if (stats.combo > 0) {
      ctx.font = '900 24px "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = stats.combo >= 25 ? '#ffd700' : '#00e5ff';
      ctx.fillText(`${stats.combo} COMBO!`, this.width - 36, 64);
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

    // 5. 武士自身架勢條 (滿 100 自身崩防)
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
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
    // 半透明黑色水墨遮罩
    ctx.fillStyle = 'rgba(6, 6, 12, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    // 主標題：極意一閃
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 68px "PingFang TC", "Microsoft JhengHei", sans-serif';

    // 標題陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText('極 意 一 閃', CENTER_X + 4, 154);

    ctx.fillStyle = '#ff2a4a';
    ctx.fillText('極 意 一 閃', CENTER_X - 1, 150);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('極 意 一 閃', CENTER_X, 150);

    // 副標題
    ctx.font = 'bold 22px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('節 奏 打 鐵  //  SLASH BEAT', CENTER_X, 215);

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
    const calW = 160;
    const calH = 38;
    const calX = CENTER_X - calW / 2;
    const calY = 390;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(calX, calY, calW, calH, 4);
    ctx.fill();

    ctx.fillStyle = '#dddddd';
    ctx.font = 'bold 14px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`延遲校準 (${offsetMs}ms)`, CENTER_X, calY + calH / 2);

    // 操作指南提示
    ctx.font = '13px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('按 [J] 格擋普通攻擊  |  按 [K] 看破「危」字攻擊  |  按 [空白鍵] 出陣', CENTER_X, 470);
    ctx.fillText(isMuted ? '【點擊右上角或按 ESC 解除靜音】' : '【點擊出陣即可解鎖 Web Audio 震撼金屬音效】', CENTER_X, 498);

    ctx.restore();
  }

  // 校準介面
  private renderCalibrationScreen(
    ctx: CanvasRenderingContext2D,
    songTime: number,
    offsetMs: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 10, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('音 訊 節 奏 校 準', CENTER_X, 100);

    ctx.font = '16px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('踏準白圈縮小至正中心的瞬間按下 [J] 或點擊螢幕，以測試硬體延遲', CENTER_X, 145);

    // 視覺節奏指示器 (BPM 120 脈動)
    const beatPhase = (songTime * 2) % 1; // 1秒2拍
    const ringRadius = 25 + (1 - beatPhase) * 65;

    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CENTER_X, 260, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 判定圓心
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(CENTER_X, 260, 25, 0, Math.PI * 2);
    ctx.fill();

    // 當前校準值
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`當前補償偏移 (OFFSET): ${offsetMs > 0 ? '+' : ''}${offsetMs} ms`, CENTER_X, 360);

    // 調整按鈕指示
    ctx.font = '15px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#eeeeee';
    ctx.fillText('按 [J] 減少 -10ms   |   按 [K] 增加 +10ms', CENTER_X, 410);

    // 完成校準按鈕
    const okW = 160;
    const okH = 42;
    const okX = CENTER_X - okW / 2;
    const okY = 450;
    ctx.fillStyle = '#2ed573';
    ctx.beginPath();
    ctx.roundRect(okX, okY, okW, okH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('保存並返回', CENTER_X, okY + okH / 2 + 5);

    ctx.restore();
  }

  // 預備倒數 (3-2-1)
  private renderCountdown(ctx: CanvasRenderingContext2D, val: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 96px "PingFang TC", "Microsoft JhengHei", sans-serif';

    const text = val > 0 ? `${val}` : '一 閃！';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText(text, CENTER_X + 4, GROUND_Y - 76);

    ctx.fillStyle = val > 0 ? '#ffffff' : '#ff003c';
    ctx.fillText(text, CENTER_X, GROUND_Y - 80);
    ctx.restore();
  }

  // 絕殺契機 (DEATHBLOW_WINDOW)
  private renderDeathblowWindow(ctx: CanvasRenderingContext2D, songTime: number): void {
    ctx.save();
    // 肅殺暗化
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, this.width, this.height);

    // 巨大血紅「死」字高光
    const pulse = 1.0 + Math.sin(songTime * 16) * 0.1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.floor(72 * pulse)}px "PingFang TC", "Microsoft JhengHei", sans-serif`;

    ctx.fillStyle = '#ff003c';
    ctx.fillText('死', CENTER_X, GROUND_Y - 140);

    // 提示
    ctx.font = 'bold 24px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('按 [K] 發動【居合一閃】清屏！', CENTER_X, GROUND_Y - 80);

    ctx.restore();
  }

  // 波次通關覆蓋層
  private renderWaveClearOverlay(ctx: CanvasRenderingContext2D, wave: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = '900 48px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`WAVE 0${wave} 肅 清！`, CENTER_X, GROUND_Y - 90);

    ctx.font = 'bold 20px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('敵陣強化，節奏加速！', CENTER_X, GROUND_Y - 40);

    ctx.restore();
  }

  // 結算畫面
  private renderGameOverScreen(ctx: CanvasRenderingContext2D, stats: CombatStats, wave: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 6, 12, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2a4a';
    ctx.font = '900 44px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('戰  局  結  算', CENTER_X, 85);

    // 評級徽章 (SSS / SS / S / A / B / C)
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
