import { EnemyNote, EnemyKind } from '../types';
import { CENTER_X, GROUND_Y, HIT_DISTANCE_OFFSET } from '../core/Constants';

export class EnemyNinja {
  public note: EnemyNote;
  public x: number = 0;
  public y: number = GROUND_Y;
  public isDefeated: boolean = false;
  public defeatTimer: number = 0;
  public defeatType: 'PARRY' | 'MIKIRI' | 'JUMP_COUNTER' | 'DEATHBLOW' | null = null;

  // 殘影隊列
  private ghostTrails: Array<{ x: number; y: number; alpha: number }> = [];
  // 手裏劍旋轉角度
  private shurikenSpin: number = 0;

  constructor(note: EnemyNote) {
    this.note = note;
    this.x = note.side === 'LEFT' ? -100 : 1060;
  }

  public get enemyKind(): EnemyKind {
    if (this.note.isBoss) return 'BOSS';
    if (this.note.enemyKind) return this.note.enemyKind;
    if (this.note.type === 'SHURIKEN') return 'SHURIKEN_SHINOBI';
    if (this.note.type === 'SPEAR_THRUST' || this.note.type === 'SPEAR_SWEEP') return 'SPEAR_MONK';
    return 'NORMAL';
  }

  public update(songTime: number, dt: number): void {
    this.shurikenSpin += dt * 25.0; // 飛鏢高速旋轉

    if (this.isDefeated) {
      this.defeatTimer += dt;
      const knockbackDir = this.note.side === 'LEFT' ? -1 : 1;
      const speed = this.note.isBoss ? 200 : (this.defeatType === 'JUMP_COUNTER' ? 180 : 300);
      this.x += knockbackDir * speed * dt;
      this.y -= (this.defeatType === 'JUMP_COUNTER' ? -120 : (this.note.isBoss ? 60 : 100)) * dt;
      return;
    }

    const hitX =
      this.note.side === 'LEFT'
        ? CENTER_X - HIT_DISTANCE_OFFSET
        : CENTER_X + HIT_DISTANCE_OFFSET;

    const spawnDist = 480;
    const timeRemaining = this.note.targetTime - songTime;
    const progress = 1 - timeRemaining / this.note.approachDuration;

    // 躍空斬拋物線 (BOSS_JUMP)
    let jumpOffsetY = 0;
    if (this.note.type === 'BOSS_JUMP') {
      const p = Math.max(0, Math.min(1, progress));
      jumpOffsetY = -Math.sin(p * Math.PI) * 110;
    }

    // 僧兵二段蓄力變奏停頓 (SPEAR_THRUST)
    let effectiveProgress = progress;
    if (this.note.type === 'SPEAR_THRUST') {
      // 0.3 ~ 0.7 期間蓄力後撤頓止，隨後 0.7 ~ 1.0 極速雷霆直刺
      if (progress < 0.3) {
        effectiveProgress = progress * 1.2;
      } else if (progress < 0.68) {
        effectiveProgress = 0.36 + Math.sin((progress - 0.3) * 8) * 0.04;
      } else {
        const burstT = (progress - 0.68) / 0.32;
        effectiveProgress = 0.36 + burstT * 0.64;
      }
    }

    if (this.note.side === 'LEFT') {
      this.x = CENTER_X - spawnDist + effectiveProgress * (hitX - (CENTER_X - spawnDist));
    } else {
      this.x = CENTER_X + spawnDist - effectiveProgress * (CENTER_X + spawnDist - hitX);
    }
    this.y = GROUND_Y + jumpOffsetY;

    // 殘影效果 (Boss 或高速手裏劍忍者)
    const isSpecial = this.note.isBoss || this.enemyKind === 'SHURIKEN_SHINOBI';
    if (isSpecial && Math.random() < 0.35) {
      this.ghostTrails.push({ x: this.x, y: this.y, alpha: 0.5 });
      if (this.ghostTrails.length > 5) {
        this.ghostTrails.shift();
      }
    }

    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      this.ghostTrails[i].alpha -= dt * 3.0;
      if (this.ghostTrails[i].alpha <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }
  }

  public triggerDefeat(type: 'PARRY' | 'MIKIRI' | 'JUMP_COUNTER' | 'DEATHBLOW'): void {
    this.isDefeated = true;
    this.defeatType = type;
    this.defeatTimer = 0;
  }

  public isFinished(): boolean {
    const maxDefeatTime = this.note.isBoss ? 0.55 : 0.38;
    return this.isDefeated && this.defeatTimer > maxDefeatTime;
  }

  public render(ctx: CanvasRenderingContext2D, songTime: number): void {
    const kind = this.enemyKind;
    const isBoss = kind === 'BOSS';

    // 1. 殘影
    if (this.ghostTrails.length > 0) {
      for (const g of this.ghostTrails) {
        ctx.save();
        ctx.globalAlpha = g.alpha * 0.7;
        ctx.translate(g.x, g.y);
        if (this.note.side !== 'LEFT') ctx.scale(-1, 1);
        ctx.fillStyle = isBoss ? '#6b0080' : '#1e3848';
        ctx.fillRect(-14, -58, 28, 58);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    const isLeft = this.note.side === 'LEFT';
    if (!isLeft) {
      ctx.scale(-1, 1);
    }

    // 死亡消散漸變
    if (this.isDefeated) {
      const maxDefeatTime = isBoss ? 0.55 : 0.38;
      const alpha = Math.max(0, 1 - this.defeatTimer / maxDefeatTime);
      ctx.globalAlpha = alpha;
    }

    // 地面陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    const shadowRx = isBoss ? 32 : (kind === 'SPEAR_MONK' ? 28 : 24);
    ctx.ellipse(0, 0, shadowRx, isBoss ? 8 : 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const isPerilous =
      this.note.type === 'PERILOUS_THRUST' ||
      this.note.type === 'BOSS_JUMP' ||
      this.note.type === 'SPEAR_THRUST';

    const isSweep = this.note.type === 'SPEAR_SWEEP';

    // 2. 「危」字印記 (突刺 / 躍空斬)
    if (isPerilous && !this.isDefeated) {
      this.renderPerilousSymbol(ctx, songTime, isBoss);
    }

    // 3. 掃堂腿橫掃「跳」/「下」字印記 (提示向上看破跳躍)
    if (isSweep && !this.isDefeated) {
      this.renderSweepJumpSymbol(ctx, songTime);
    }

    // 4. 連斬段數標籤
    if (this.note.flurryTotal && this.note.flurryIndex && !this.isDefeated) {
      ctx.save();
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`連斬 ${this.note.flurryIndex}/${this.note.flurryTotal}`, 0, -80);
      ctx.restore();
    }

    // 5. 依兵種分流繪製
    if (kind === 'SHURIKEN_SHINOBI') {
      this.renderShurikenShinobi(ctx, songTime);
    } else if (kind === 'SPEAR_MONK') {
      this.renderSpearMonk(ctx, songTime, isPerilous, isSweep);
    } else {
      this.renderRegularOrBoss(ctx, songTime, isBoss, isPerilous);
    }

    ctx.restore();
  }

  // 雙手裏劍忍者 (Shuriken Shinobi)
  private renderShurikenShinobi(ctx: CanvasRenderingContext2D, songTime: number): void {
    const runOffset = Math.sin(songTime * 18) * 3;

    // 身軀：深青灰水墨夜行忍者
    ctx.fillStyle = '#10222a';
    ctx.beginPath();
    ctx.moveTo(-12, -46 + runOffset);
    ctx.lineTo(12, -46 + runOffset);
    ctx.lineTo(16, 0);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();

    // 忍者面甲
    ctx.fillStyle = '#1d3b48';
    ctx.beginPath();
    ctx.arc(3, -52 + runOffset, 9, 0, Math.PI * 2);
    ctx.fill();

    // 青碧色護目冷芒
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(5, -53 + runOffset, 5, 2);

    // 旋轉巨大十字手裏劍 (Shuriken)
    ctx.save();
    ctx.translate(34, -30 + runOffset);
    ctx.rotate(this.shurikenSpin);

    // 飛鏢核心金屬刃片
    ctx.fillStyle = '#d0e8f0';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    const bladeLen = 22;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-5, -8);
      ctx.lineTo(0, -bladeLen);
      ctx.lineTo(5, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.rotate(Math.PI / 2);
    }
    // 飛鏢中心圓孔
    ctx.fillStyle = '#081216';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 長槍僧兵 (Spear Monk)
  private renderSpearMonk(
    ctx: CanvasRenderingContext2D,
    songTime: number,
    isPerilous: boolean,
    isSweep: boolean
  ): void {
    const runOffset = Math.sin(songTime * 12) * 2;

    // 魁梧僧袍身軀 (白袈裟 + 灰黑僧袍)
    ctx.fillStyle = '#2a2420';
    ctx.beginPath();
    ctx.moveTo(-16, -56 + runOffset);
    ctx.lineTo(16, -56 + runOffset);
    ctx.lineTo(20, 0);
    ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();

    // 斜披袈裟 (黃金僧帶)
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.moveTo(-14, -54 + runOffset);
    ctx.lineTo(14, -28 + runOffset);
    ctx.lineTo(8, -24 + runOffset);
    ctx.lineTo(-16, -48 + runOffset);
    ctx.closePath();
    ctx.fill();

    // 巨型僧笠
    ctx.fillStyle = '#1a1814';
    ctx.beginPath();
    ctx.arc(0, -62 + runOffset, 16, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // 長柄薙刀 / 十文字大長槍
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a2020'; // 朱紅槍柄

    if (isSweep) {
      // 掃堂腿橫掃：伏低身姿，長槍緊貼地表
      ctx.beginPath();
      ctx.moveTo(-28, -6 + runOffset);
      ctx.lineTo(60, -4 + runOffset);
      ctx.stroke();

      // 地面捲起的塵土氣浪
      ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(16, -4, 42, Math.PI * 0.8, Math.PI * 1.4);
      ctx.stroke();
    } else {
      // 直刺或蓄力直刺
      ctx.beginPath();
      ctx.moveTo(-12, -32 + runOffset);
      ctx.lineTo(58, -32 + runOffset);
      ctx.stroke();

      // 十文字槍尖
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(58, -32 + runOffset);
      ctx.lineTo(76, -32 + runOffset);
      ctx.lineTo(58, -28 + runOffset);
      ctx.closePath();
      ctx.fill();

      // 蓄力金光
      if (isPerilous) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(76, -32 + runOffset, 6 + Math.sin(songTime * 20) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 常規武士 / 影之劍聖
  private renderRegularOrBoss(
    ctx: CanvasRenderingContext2D,
    songTime: number,
    isBoss: boolean,
    isPerilous: boolean
  ): void {
    const runOffset = Math.sin(songTime * 14) * 4;
    const bodyHeight = isBoss ? -58 : -48;
    const bodyWidth = isBoss ? 16 : 12;

    // 身軀
    ctx.fillStyle = isBoss ? '#140c1e' : (isPerilous ? '#321016' : '#14141e');
    ctx.beginPath();
    ctx.moveTo(-bodyWidth, bodyHeight + runOffset);
    ctx.lineTo(bodyWidth, bodyHeight + runOffset);
    ctx.lineTo(bodyWidth + 4, 0);
    ctx.lineTo(-(bodyWidth + 4), 0);
    ctx.closePath();
    ctx.fill();

    // 影之劍聖斗篷
    if (isBoss) {
      ctx.fillStyle = '#491060';
      ctx.beginPath();
      ctx.moveTo(-18, bodyHeight + runOffset + 4);
      ctx.lineTo(-30, 2);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
    }

    // 頭盔面巾
    ctx.fillStyle = isBoss ? '#300840' : (isPerilous ? '#b01026' : '#222230');
    ctx.beginPath();
    ctx.arc(4, bodyHeight - 6 + runOffset, isBoss ? 12 : 10, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛冷光
    ctx.fillStyle = isBoss ? '#ff0055' : (isPerilous ? '#ff2a4a' : '#00e1ff');
    ctx.fillRect(8, bodyHeight - 7 + runOffset, isBoss ? 6 : 4, 2);

    // 武器
    ctx.lineWidth = isBoss ? 3.5 : 2.5;
    ctx.lineCap = 'round';

    if (isPerilous) {
      ctx.strokeStyle = '#e60039';
      ctx.beginPath();
      ctx.moveTo(-10, -32 + runOffset);
      ctx.lineTo(isBoss ? 58 : 46, -34 + runOffset);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(isBoss ? 58 : 46, -34 + runOffset);
      ctx.lineTo(isBoss ? 68 : 54, -34 + runOffset);
      ctx.stroke();
    } else if (this.note.type === 'BOSS_DELAYED') {
      ctx.strokeStyle = '#ff3366';
      ctx.beginPath();
      ctx.moveTo(2, -45 + runOffset);
      ctx.lineTo(22, -85 + runOffset);
      ctx.stroke();

      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.arc(22, -85 + runOffset, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = isBoss ? '#c850ff' : '#d6d6e6';
      ctx.beginPath();
      ctx.moveTo(4, -36 + runOffset);
      ctx.lineTo(isBoss ? 44 : 36, -20 + runOffset);
      ctx.stroke();
    }
  }

  // 「危」字書法印記
  private renderPerilousSymbol(ctx: CanvasRenderingContext2D, songTime: number, isBoss: boolean): void {
    ctx.save();
    const pulse = 1.0 + Math.sin(songTime * 22) * 0.18;
    ctx.translate(0, isBoss ? -96 : -82);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = 'rgba(240, 20, 50, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, isBoss ? 24 : 18, 0, Math.PI * 2);
    ctx.fill();

    const boxSize = isBoss ? 26 : 20;
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isBoss ? 18 : 15}px "PingFang TC", "Microsoft JhengHei", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('危', 0, 0);
    ctx.restore();
  }

  // 掃堂腿橫掃「跳」/「下段」黃金書法印記
  private renderSweepJumpSymbol(ctx: CanvasRenderingContext2D, songTime: number): void {
    ctx.save();
    const pulse = 1.0 + Math.sin(songTime * 24) * 0.18;
    ctx.translate(0, -78);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = 'rgba(255, 180, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-11, -11, 22, 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "PingFang TC", "Microsoft JhengHei", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('跳', 0, 0);
    ctx.restore();
  }
}
