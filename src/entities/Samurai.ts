import {
  CENTER_X,
  GROUND_Y,
  MAX_HP,
  MAX_POSTURE,
} from '../core/Constants';

export type SamuraiPose =
  | 'IDLE'
  | 'PARRY_LEFT'
  | 'PARRY_RIGHT'
  | 'MIKIRI'
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

  public pose: SamuraiPose = 'IDLE';
  private poseTimer: number = 0;
  private animTime: number = 0;

  public reset(): void {
    this.x = CENTER_X;
    this.y = GROUND_Y;
    this.hp = MAX_HP;
    this.posture = 0;
    this.isPostureBroken = false;
    this.postureBrokenTimer = 0;
    this.pose = 'IDLE';
    this.poseTimer = 0;
    this.animTime = 0;
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
    this.postureBrokenTimer = 1.0; // 凍結失衡 1 秒
    this.setPose('HURT', 1.0);
  }

  public update(dt: number): void {
    this.animTime += dt;

    // 姿勢計時
    if (this.poseTimer > 0) {
      this.poseTimer -= dt;
      if (this.poseTimer <= 0 && this.pose !== 'IDLE') {
        this.pose = 'IDLE';
      }
    }

    // 崩防計時
    if (this.isPostureBroken) {
      this.postureBrokenTimer -= dt;
      if (this.postureBrokenTimer <= 0) {
        this.isPostureBroken = false;
        this.posture = 0;
      }
    } else {
      // 自然衰減恢復架勢條：RecoveryRate = 24 * (hp / maxHp)
      const recoveryRate = 24 * (this.hp / MAX_HP);
      this.posture = Math.max(0, this.posture - recoveryRate * dt);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const breathe = Math.sin(this.animTime * 3) * 2;
    const scarfWave = Math.sin(this.animTime * 6) * 4;

    // 陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 依姿態進行繪製
    if (this.pose === 'HURT') {
      ctx.translate(0, 4);
      ctx.rotate(-0.1);
    }

    // 1. 飄揚的深紅長圍巾 (向左後方飄逸)
    ctx.fillStyle = '#e61e38';
    ctx.beginPath();
    ctx.moveTo(-5, -60 + breathe);
    ctx.quadraticCurveTo(-35, -55 + scarfWave, -60, -50 + scarfWave * 1.5);
    ctx.quadraticCurveTo(-40, -45 + scarfWave, -5, -52 + breathe);
    ctx.closePath();
    ctx.fill();

    // 2. 武士黑袍水墨軀幹
    ctx.fillStyle = this.isPostureBroken ? '#442222' : '#0e0e14';
    ctx.beginPath();
    ctx.moveTo(-16, -58 + breathe);
    ctx.lineTo(16, -58 + breathe);
    ctx.lineTo(24, 0);
    ctx.lineTo(-24, 0);
    ctx.closePath();
    ctx.fill();

    // 腰帶 (深金/朱紅腰封)
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(-18, -32 + breathe, 36, 6);

    // 3. 斗笠 (笠帽)
    ctx.fillStyle = '#181822';
    ctx.beginPath();
    ctx.moveTo(-38, -70 + breathe);
    ctx.lineTo(38, -70 + breathe);
    ctx.lineTo(0, -88 + breathe);
    ctx.closePath();
    ctx.fill();

    // 斗笠邊緣亮邊
    ctx.strokeStyle = '#8a8a9a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-38, -70 + breathe);
    ctx.lineTo(38, -70 + breathe);
    ctx.stroke();

    // 4. 太刀與手臂 (隨姿態動態變化)
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    if (this.pose === 'PARRY_LEFT') {
      // 左側格擋：太刀橫架於左胸前，刃口向左偏
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-10, -45 + breathe);
      ctx.lineTo(-42, -75);
      ctx.stroke();

      // 刀柄與金屬刀鍔
      ctx.strokeStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(-12, -42 + breathe);
      ctx.lineTo(-8, -48 + breathe);
      ctx.stroke();
    } else if (this.pose === 'PARRY_RIGHT') {
      // 右側格擋：太刀橫架於右側，刃口向右上方招架
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(10, -45 + breathe);
      ctx.lineTo(42, -75);
      ctx.stroke();

      ctx.strokeStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(8, -48 + breathe);
      ctx.lineTo(12, -42 + breathe);
      ctx.stroke();
    } else if (this.pose === 'MIKIRI') {
      // 看破踩刀：右腳前踏，雙手持刀猛力向下突刺定格
      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(-5, -45 + breathe);
      ctx.lineTo(35, -15);
      ctx.stroke();

      // 踏刀白光震波
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(35, -5, 18, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.pose === 'IAI_CHARGE') {
      // 居合拔刀術蓄力姿態：伏低身軀，左手按鞘，右手扣刀柄
      ctx.strokeStyle = '#ff003c';
      ctx.beginPath();
      ctx.moveTo(-15, -30 + breathe);
      ctx.lineTo(15, -25 + breathe);
      ctx.stroke();
    } else {
      // IDLE 待機：右手握刀鞘懸於腰際
      ctx.strokeStyle = '#c0c0d0';
      ctx.beginPath();
      ctx.moveTo(-12, -35 + breathe);
      ctx.lineTo(-28, -12);
      ctx.stroke();
    }

    ctx.restore();
  }
}
