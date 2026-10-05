import { EnemyNote, AttackSide, AttackType } from '../types';
import { CENTER_X, GROUND_Y, HIT_DISTANCE_OFFSET } from '../core/Constants';

export class EnemyNinja {
  public note: EnemyNote;
  public x: number = 0;
  public y: number = GROUND_Y;
  public isDefeated: boolean = false;
  public defeatTimer: number = 0;
  public defeatType: 'PARRY' | 'MIKIRI' | 'DEATHBLOW' | null = null;

  constructor(note: EnemyNote) {
    this.note = note;
    this.x = note.side === 'LEFT' ? -100 : 1060;
  }

  public update(songTime: number, dt: number): void {
    if (this.isDefeated) {
      this.defeatTimer += dt;
      // 擊退受創向後飄飛
      const knockbackDir = this.note.side === 'LEFT' ? -1 : 1;
      this.x += knockbackDir * 280 * dt;
      this.y -= 90 * dt;
      return;
    }

    const hitX = this.note.side === 'LEFT'
      ? CENTER_X - HIT_DISTANCE_OFFSET
      : CENTER_X + HIT_DISTANCE_OFFSET;

    const spawnDist = 480;
    const timeRemaining = this.note.targetTime - songTime;
    const progress = 1 - (timeRemaining / this.note.approachDuration);

    if (this.note.side === 'LEFT') {
      this.x = (CENTER_X - spawnDist) + progress * (hitX - (CENTER_X - spawnDist));
    } else {
      this.x = (CENTER_X + spawnDist) - progress * ((CENTER_X + spawnDist) - hitX);
    }
  }

  public triggerDefeat(type: 'PARRY' | 'MIKIRI' | 'DEATHBLOW'): void {
    this.isDefeated = true;
    this.defeatType = type;
    this.defeatTimer = 0;
  }

  public isFinished(): boolean {
    return this.isDefeated && this.defeatTimer > 0.35;
  }

  public render(ctx: CanvasRenderingContext2D, songTime: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const isLeft = this.note.side === 'LEFT';
    // 若是左側來的，面朝右；若是右側來的，面朝左
    if (!isLeft) {
      ctx.scale(-1, 1);
    }

    // 死亡消散漸變透明度
    if (this.isDefeated) {
      const alpha = Math.max(0, 1 - this.defeatTimer / 0.35);
      ctx.globalAlpha = alpha;
    }

    // 陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const isPerilous = this.note.type === 'PERILOUS_THRUST';

    // 1. 若是「危」字攻擊，在頭頂上方懸浮血紅閃爍光標
    if (isPerilous && !this.isDefeated) {
      this.renderPerilousSymbol(ctx, songTime);
    }

    // 2. 敵兵身軀與姿態
    const runOffset = Math.sin(songTime * 14) * 4;

    ctx.fillStyle = isPerilous ? '#321016' : '#14141e';
    ctx.beginPath();
    ctx.moveTo(-12, -48 + runOffset);
    ctx.lineTo(12, -48 + runOffset);
    ctx.lineTo(16, 0);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();

    // 面巾/頭盔
    ctx.fillStyle = isPerilous ? '#b01026' : '#222230';
    ctx.beginPath();
    ctx.arc(4, -54 + runOffset, 10, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛冷光
    ctx.fillStyle = isPerilous ? '#ff2a4a' : '#00e1ff';
    ctx.fillRect(8, -55 + runOffset, 4, 2);

    // 3. 武器
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    if (isPerilous) {
      // 突刺長槍：直指武士核心
      ctx.strokeStyle = '#e60039';
      ctx.beginPath();
      ctx.moveTo(-10, -32 + runOffset);
      ctx.lineTo(46, -34 + runOffset);
      ctx.stroke();

      // 槍尖寒芒
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(46, -34 + runOffset);
      ctx.lineTo(54, -34 + runOffset);
      ctx.stroke();
    } else {
      // 太刀下劈姿態
      ctx.strokeStyle = '#d6d6e6';
      ctx.beginPath();
      ctx.moveTo(4, -36 + runOffset);
      ctx.lineTo(36, -20 + runOffset);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderPerilousSymbol(ctx: CanvasRenderingContext2D, songTime: number): void {
    ctx.save();
    const pulse = 1.0 + Math.sin(songTime * 20) * 0.15;
    ctx.translate(0, -82);
    ctx.scale(pulse, pulse);

    // 血色光暈
    ctx.fillStyle = 'rgba(230, 20, 50, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // 血圓環
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

    // 書法「危」字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('危', 0, 0);

    ctx.restore();
  }
}
