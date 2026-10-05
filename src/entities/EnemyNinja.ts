import { EnemyNote } from '../types';
import { CENTER_X, GROUND_Y, HIT_DISTANCE_OFFSET } from '../core/Constants';

export class EnemyNinja {
  public note: EnemyNote;
  public x: number = 0;
  public y: number = GROUND_Y;
  public isDefeated: boolean = false;
  public defeatTimer: number = 0;
  public defeatType: 'PARRY' | 'MIKIRI' | 'DEATHBLOW' | null = null;

  // 影之劍聖殘影隊列
  private ghostTrails: Array<{ x: number; y: number; alpha: number }> = [];

  constructor(note: EnemyNote) {
    this.note = note;
    this.x = note.side === 'LEFT' ? -100 : 1060;
  }

  public update(songTime: number, dt: number): void {
    if (this.isDefeated) {
      this.defeatTimer += dt;
      // 擊退受創向後飄飛
      const knockbackDir = this.note.side === 'LEFT' ? -1 : 1;
      this.x += knockbackDir * (this.note.isBoss ? 200 : 280) * dt;
      this.y -= (this.note.isBoss ? 60 : 90) * dt;
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
      jumpOffsetY = -Math.sin(p * Math.PI) * 110; // 躍至高空 110px
    }

    if (this.note.side === 'LEFT') {
      this.x = CENTER_X - spawnDist + progress * (hitX - (CENTER_X - spawnDist));
    } else {
      this.x = CENTER_X + spawnDist - progress * (CENTER_X + spawnDist - hitX);
    }
    this.y = GROUND_Y + jumpOffsetY;

    // 影之劍聖移動殘影
    if (this.note.isBoss && Math.random() < 0.35) {
      this.ghostTrails.push({ x: this.x, y: this.y, alpha: 0.5 });
      if (this.ghostTrails.length > 5) {
        this.ghostTrails.shift();
      }
    }

    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      this.ghostTrails[i].alpha -= dt * 2.5;
      if (this.ghostTrails[i].alpha <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }
  }

  public triggerDefeat(type: 'PARRY' | 'MIKIRI' | 'DEATHBLOW'): void {
    this.isDefeated = true;
    this.defeatType = type;
    this.defeatTimer = 0;
  }

  public isFinished(): boolean {
    const maxDefeatTime = this.note.isBoss ? 0.5 : 0.35;
    return this.isDefeated && this.defeatTimer > maxDefeatTime;
  }

  public render(ctx: CanvasRenderingContext2D, songTime: number): void {
    const isBoss = !!this.note.isBoss;

    // 1. 繪製影之劍聖殘影
    if (isBoss) {
      for (const g of this.ghostTrails) {
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.translate(g.x, g.y);
        if (this.note.side !== 'LEFT') ctx.scale(-1, 1);
        ctx.fillStyle = '#6b0080';
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

    // 死亡消散漸變透明度
    if (this.isDefeated) {
      const maxDefeatTime = isBoss ? 0.5 : 0.35;
      const alpha = Math.max(0, 1 - this.defeatTimer / maxDefeatTime);
      ctx.globalAlpha = alpha;
    }

    // 陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, isBoss ? 32 : 24, isBoss ? 8 : 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const isPerilous = this.note.type === 'PERILOUS_THRUST' || this.note.type === 'BOSS_JUMP';

    // 2. 「危」字印記 (突刺或躍空斬)
    if (isPerilous && !this.isDefeated) {
      this.renderPerilousSymbol(ctx, songTime, isBoss);
    }

    // 3. 連斬段數標籤 (如 5 連斬時顯示 1/5, 2/5...)
    if (this.note.flurryTotal && this.note.flurryIndex && !this.isDefeated) {
      ctx.save();
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`連斬 ${this.note.flurryIndex}/${this.note.flurryTotal}`, 0, -80);
      ctx.restore();
    }

    // 4. 軀幹姿態
    const runOffset = Math.sin(songTime * 14) * 4;
    const bodyHeight = isBoss ? -58 : -48;
    const bodyWidth = isBoss ? 16 : 12;

    // 身軀底色
    ctx.fillStyle = isBoss ? '#140c1e' : (isPerilous ? '#321016' : '#14141e');
    ctx.beginPath();
    ctx.moveTo(-bodyWidth, bodyHeight + runOffset);
    ctx.lineTo(bodyWidth, bodyHeight + runOffset);
    ctx.lineTo(bodyWidth + 4, 0);
    ctx.lineTo(-(bodyWidth + 4), 0);
    ctx.closePath();
    ctx.fill();

    // 影之劍聖專屬深紫夜煞斗篷
    if (isBoss) {
      ctx.fillStyle = '#491060';
      ctx.beginPath();
      ctx.moveTo(-18, bodyHeight + runOffset + 4);
      ctx.lineTo(-30, 2);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
    }

    // 面巾/頭盔
    ctx.fillStyle = isBoss ? '#300840' : (isPerilous ? '#b01026' : '#222230');
    ctx.beginPath();
    ctx.arc(4, bodyHeight - 6 + runOffset, isBoss ? 12 : 10, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛冷光 (劍聖為猩紅殺氣，雜兵危字為紅，普通為藍)
    ctx.fillStyle = isBoss ? '#ff0055' : (isPerilous ? '#ff2a4a' : '#00e1ff');
    ctx.fillRect(8, bodyHeight - 7 + runOffset, isBoss ? 6 : 4, 2);

    // 5. 武器渲染
    ctx.lineWidth = isBoss ? 3.5 : 2.5;
    ctx.lineCap = 'round';

    if (isPerilous) {
      // 突刺長槍 / 劍聖血色妖刀突刺
      ctx.strokeStyle = '#e60039';
      ctx.beginPath();
      ctx.moveTo(-10, -32 + runOffset);
      ctx.lineTo(isBoss ? 58 : 46, -34 + runOffset);
      ctx.stroke();

      // 槍尖/刀尖寒芒
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(isBoss ? 58 : 46, -34 + runOffset);
      ctx.lineTo(isBoss ? 68 : 54, -34 + runOffset);
      ctx.stroke();
    } else if (this.note.type === 'BOSS_DELAYED') {
      // 延遲重刀：高舉蓄力姿態
      ctx.strokeStyle = '#ff3366';
      ctx.beginPath();
      ctx.moveTo(2, -45 + runOffset);
      ctx.lineTo(22, -85 + runOffset); // 直插高空蓄勢
      ctx.stroke();

      // 刀尖聚集黑紅水墨氣勁
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.arc(22, -85 + runOffset, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 普通斬擊姿態
      ctx.strokeStyle = isBoss ? '#c850ff' : '#d6d6e6';
      ctx.beginPath();
      ctx.moveTo(4, -36 + runOffset);
      ctx.lineTo(isBoss ? 44 : 36, -20 + runOffset);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderPerilousSymbol(ctx: CanvasRenderingContext2D, songTime: number, isBoss: boolean): void {
    ctx.save();
    const pulse = 1.0 + Math.sin(songTime * 22) * 0.18;
    ctx.translate(0, isBoss ? -96 : -82);
    ctx.scale(pulse, pulse);

    // 血色光暈
    ctx.fillStyle = 'rgba(240, 20, 50, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, isBoss ? 24 : 18, 0, Math.PI * 2);
    ctx.fill();

    // 朱砂血方框印記
    const boxSize = isBoss ? 26 : 20;
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);

    // 書法「危」字
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isBoss ? 18 : 15}px "PingFang TC", "Microsoft JhengHei", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('危', 0, 0);

    ctx.restore();
  }
}
