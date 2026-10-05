export type GameState =
  | 'BOOT'
  | 'TITLE'
  | 'CALIBRATION'
  | 'SETTINGS'
  | 'READY'
  | 'COMBAT'
  | 'DEATHBLOW_WINDOW'
  | 'IAI_SLASH_BURST'
  | 'WAVE_CLEAR'
  | 'GAME_OVER';

export type GameMode = 'WAVES' | 'ENDLESS';

export type ActionType = 'PARRY' | 'SLASH' | 'JUMP';

export type AttackType =
  | 'NORMAL'
  | 'PERILOUS_THRUST'
  | 'FLURRY_TRIPLE'
  | 'BOSS_QUINTUPLE'
  | 'BOSS_DELAYED'
  | 'BOSS_JUMP'
  | 'SHURIKEN'
  | 'SPEAR_THRUST'
  | 'SPEAR_SWEEP';

export type AttackSide = 'LEFT' | 'RIGHT';

export type ParryRating = 'PERFECT' | 'GOOD' | 'MIKIRI' | 'JUMP_COUNTER' | 'MISS' | 'WRONG_ACTION';

export type GradeRank = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C';

export type BladeTrailStyle = 'AZURE' | 'CRIMSON' | 'SOLAR';

export type EnemyKind = 'NORMAL' | 'SHURIKEN_SHINOBI' | 'SPEAR_MONK' | 'BOSS';

export interface CombatStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  mikiriCount: number;
  jumpCounterCount: number;
  missCount: number;
  totalNotes: number;
  grade: GradeRank;
  wavesCleared: number;
  endlessKills: number;
}

export interface EnemyNote {
  id: string;
  targetBeat: number;       // 目標命中拍數
  targetTime: number;       // 音樂精確時間戳 (秒)
  side: AttackSide;         // 攻擊方位
  type: AttackType;         // 攻擊類型
  approachDuration: number; // 衝鋒預警時間 (秒)
  isDead: boolean;
  handled: boolean;
  slashHit?: boolean;
  isBoss?: boolean;
  enemyKind?: EnemyKind;
  flurryIndex?: number;
  flurryTotal?: number;
  shurikenIndex?: number;   // 1 或 2
  chargeDuration?: number;  // 僧兵二段蓄力時長
}

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface InkSplatter {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  angle: number;
  length: number;
  life: number;
  maxLife: number;
}

export interface FoliageParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  alpha: number;
  type: 'SAKURA' | 'BAMBOO';
}

export interface AuraParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface PerilousStamp {
  x: number;
  y: number;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface RainParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
}

export interface LightningBolt {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  alpha: number;
  maxAlpha: number;
  timer: number;
}

export interface BladeTrailPoint {
  x: number;
  y: number;
  alpha: number;
  width: number;
  style: BladeTrailStyle;
}

export interface TouchRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface SlashBeatSaveSchema {
  version: 1;
  highScore: number;
  highestCombo: number;
  bestGrade: GradeRank;
  totalRuns: number;
  calibrationOffsetMs: number;
  isMuted: boolean;
  selectedBladeTrail: BladeTrailStyle;
  endlessHighScore: number;
  endlessMaxCombo: number;
  endlessHighestKills: number;
  touchSplitRatio: number; // 0.3 ~ 0.7 螢幕劃分比例
  touchInvert: boolean;    // 是否左右對調
}

export interface PlayroomFinishPayload {
  score: number;
  stats: {
    maxCombo: number;
    perfectParries: number;
    mikiriCount: number;
    grade: string;
    wavesCleared: number;
    mode?: string;
  };
}
