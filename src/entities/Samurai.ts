import {
  CENTER_X,
  GROUND_Y,
  MAX_HP,
  MAX_POSTURE,
} from '../core/Constants';
import { BladeTrailStyle } from '../types';

export type SamuraiPose =
  | 'IDLE'
  | 'PARRY_LEFT'
  | 'PARRY_RIGHT'
  | 'MIKIRI'
  | 'JUMP_COUNTER'
  | 'IAI_CHARGE'
  | 'IAI_SLASH'
  | 'HURT';

export class Samurai {
  public x: number = CENTER_X;
  public y: number = GROUND_Y;
  public hp: number = MAX_HP;
  public posture: number = 0;
  public isPostureBroken: boolean = false;
  public postureBrokenTimer: number = 0;
  public isFever: boolean = false;
  public bladeTrailStyle: BladeTrailStyle = 'AZURE';

  public pose: SamuraiPose = 'IDLE';
  private poseTimer: number = 0;
  private animTime: number = 0;

  // 刀尖世界座標拖尾軌跡隊列 (Blade Trail)
  public bladeTrails: Array<{ x: number; y: number; alpha: number }> = [];

  public reset(): void {
    this.x = CENTER_X;
    this.y = GROUND_Y;
    this.hp = MAX_HP;
    this.posture = 0;
    this.isPostureBroken = false;
    this.postureBrokenTimer = 0;
    this.isFever = false;
    this.pose = 'IDLE';
    this.poseTimer = 0;
    this.animTime = 0;
    this.bladeTrails = [];
  }

  public setPose(newPose: SamuraiPose, duration: number = 0.18): void {
    this.pose = newPose;
    this.poseTimer = duration;
  }

  public takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.posture = Math.min(MAX_POSTURE, this.posture + 20);
    this.setPose('HURT', 0.25);
    if (this.posture >= MAX_POSTURE) {
      this.triggerPostureBreak();
    }
  }

  public addPosture(amount: number): boolean {
    this.posture = Math.min(MAX_POSTURE, this.posture + amount);
    if (this.posture >= MAX_POSTURE) {
      this.triggerPostureBreak();
      return true;
    }
    return false;
  }

  public reducePosture(amount: number): void {
    this.posture = Math.max(0, this.posture - amount);
  }

  public heal(amount: number): void {
    this.hp = Math.min(MAX_HP, this.hp + amount);
  }

  private triggerPostureBreak(): void {
    this.isPostureBroken = true;
    this.postureBrokenTimer = 1.0;
    this.setPose('HURT', 1.0);
  }

  public update(dt: number): void {
    this.animTime += dt;

    if (this.poseTimer > 0) {
      this.poseTimer -= dt;
      if (this.poseTimer <= 0 && this.pose !== 'IDLE') {
        this.pose = 'IDLE';
      }
    }

    if (this.isPostureBroken) {
      this.postureBrokenTimer -= dt;
      if (this.postureBrokenTimer <= 0) {
        this.isPostureBroken = false;
        this.posture = 0;
      }
    } else {
      const recoveryRate = 24 * (this.hp / MAX_HP);
      this.posture = Math.max(0, this.posture - recoveryRate * dt);
    }

    // 計算刀尖實時座標並寫入拖尾隊列
    this.updateBladeTrails(dt);
  }

  private updateBladeTrails(dt: number): void {
    // 根據當前姿勢獲取刀尖大略位置
    const tip = this.getBladeTipOffset();
    const worldTipX = this.x + tip.x;
    const worldTipY = this.y + tip.y;

    if (this.pose !== 'IDLE' && this.pose !== 'HURT') {
      this.bladeTrails.push({ x: worldTipX, y: worldTipY, alpha: 1.0 });
      if (this.bladeTrails.length > 12) {
        this.bladeTrails.shift();
      }
    }

    for (let i = this.bladeTrails.length - 1; i >= 0; i--) {
      this.bladeTrails[i].alpha -= dt * 4.5;
      if (this.bladeTrails[i].alpha <= 0) {
        this.bladeTrails.splice(i, 1);
      }
    }
  }

  private getBladeTipOffset(): { x: number; y: number } {
    switch (this.pose) {
      case 'PARRY_LEFT':
        return { x: -44, y: -76 };
      case 'PARRY_RIGHT':
        return { x: 44, y: -76 };
      case 'MIKIRI':
        return { x: 38, y: -16 };
      case 'JUMP_COUNTER':
        return { x: 0, y: -95 };
      case 'IAI_CHARGE':
        return { x: 20, y: -24 };
      case 'IAI_SLASH':
        return { x: 55, y: -38 };
      default:
        return { x: -28, y: -12 };
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. 繪製劍氣刀光拖尾 (Blade Trail)
    this.renderBladeTrail(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);

    const breathe = Math.sin(this.animTime * 3) * 2;
    const scarfWave = Math.sin(this.animTime * 6) * 4;

    // 陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    const shadowScale = this.pose === 'JUMP_COUNTER' ? 0.6 : 1.0;
    ctx.ellipse(0, 0, 32 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 姿態位移
    if (this.pose === 'HURT') {
      ctx.translate(0, 4);
      ctx.rotate(-0.1);
    } else if (this.pose === 'JUMP_COUNTER') {
      // 凌空躍起 45px
      ctx.translate(0, -45);
    }

    // 飄揚深紅長圍巾
    ctx.fillStyle = '#e61e38';
    ctx.beginPath();
    ctx.moveTo(-5, -60 + breathe);
    ctx.quadraticCurveTo(-35, -55 + scarfWave, -60, -50 + scarfWave * 1.5);
    ctx.quadraticCurveTo(-40, -45 + scarfWave, -5, -52 + breathe);
    ctx.closePath();
    ctx.fill();

    // 武士黑袍水墨軀幹
    ctx.fillStyle = this.isPostureBroken ? '#442222' : '#0e0e14';
    ctx.beginPath();
    ctx.moveTo(-16, -58 + breathe);
    ctx.lineTo(16, -58 + breathe);
    ctx.lineTo(24, 0);
    ctx.lineTo(-24, 0);
    ctx.closePath();
    ctx.fill();

    // 腰帶
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(-18, -32 + breathe, 36, 6);

    // 斗笠
    ctx.fillStyle = '#181822';
    ctx.beginPath();
    ctx.moveTo(-38, -70 + breathe);
    ctx.lineTo(38, -70 + breathe);
    ctx.lineTo(0, -88 + breathe);
    ctx.closePath();
    ctx.fill();

    // 斗笠邊緣亮邊 (隨劍氣光刃配色)
    let trailColor = '#00f0ff';
    if (this.bladeTrailStyle === 'CRIMSON') trailColor = '#ff003c';
    else if (this.bladeTrailStyle === 'SOLAR') trailColor = '#ffd700';

    ctx.strokeStyle = this.isFever ? trailColor : '#8a8a9a';
    ctx.lineWidth = this.isFever ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(-38, -70 + breathe);
    ctx.lineTo(38, -70 + breathe);
    ctx.stroke();

    // 武器渲染
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';

    if (this.pose === 'PARRY_LEFT') {
      ctx.strokeStyle = this.isFever ? trailColor : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-10, -45 + breathe);
      ctx.lineTo(-44, -76);
      ctx.stroke();

      ctx.strokeStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(-12, -42 + breathe);
      ctx.lineTo(-8, -48 + breathe);
      ctx.stroke();
    } else if (this.pose === 'PARRY_RIGHT') {
      ctx.strokeStyle = this.isFever ? trailColor : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(10, -45 + breathe);
      ctx.lineTo(44, -76);
      ctx.stroke();

      ctx.strokeStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(8, -48 + breathe);
      ctx.lineTo(12, -42 + breathe);
      ctx.stroke();
    } else if (this.pose === 'MIKIRI') {
      ctx.translate(0, -18);
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-5, -45 + breathe);
      ctx.lineTo(35, 2);
      ctx.stroke();

      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(35, 12, 22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.pose === 'JUMP_COUNTER') {
      // 向上看破跳躍：雙手反握太刀由上至下凌空雷霆重劈！
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(0, -50 + breathe);
      ctx.lineTo(0, 18);
      ctx.stroke();

      // 踩踏長槍的金色破空踏浪
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 22, 28, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.pose === 'IAI_CHARGE') {
      ctx.strokeStyle = '#ff003c';
      ctx.beginPath();
      ctx.moveTo(-15, -30 + breathe);
      ctx.lineTo(15, -25 + breathe);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#c0c0d0';
      ctx.beginPath();
      ctx.moveTo(-12, -35 + breathe);
      ctx.lineTo(-28, -12);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 繪製光刃劍氣拖尾
  private renderBladeTrail(ctx: CanvasRenderingContext2D): void {
    if (this.bladeTrails.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    let primaryColor = '#00f0ff';
    let glowColor = 'rgba(0, 240, 255, 0.4)';
    if (this.bladeTrailStyle === 'CRIMSON') {
      primaryColor = '#ff1744';
      glowColor = 'rgba(255, 23, 68, 0.4)';
    } else if (this.bladeTrailStyle === 'SOLAR') {
      primaryColor = '#ffd700';
      glowColor = 'rgba(255, 215, 0, 0.4)';
    }

    for (let i = 0; i < this.bladeTrails.length - 1; i++) {
      const p1 = this.bladeTrails[i];
      const p2 = this.bladeTrails[i + 1];

      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 8 * p1.alpha;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3.5 * p1.alpha;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
