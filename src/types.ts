export type GameState =
  | 'BOOT'
  | 'TITLE'
  | 'CALIBRATION'
  | 'READY'
  | 'COMBAT'
  | 'DEATHBLOW_WINDOW'
  | 'IAI_SLASH_BURST'
  | 'WAVE_CLEAR'
  | 'GAME_OVER';

export type ActionType = 'PARRY' | 'SLASH';
export type AttackType = 'NORMAL' | 'PERILOUS_THRUST' | 'FLURRY_TRIPLE';
export type AttackSide = 'LEFT' | 'RIGHT';

export type ParryRating = 'PERFECT' | 'GOOD' | 'MIKIRI' | 'MISS' | 'WRONG_ACTION';

export type GradeRank = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C';

export interface CombatStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  mikiriCount: number;
  missCount: number;
  totalNotes: number;
  grade: GradeRank;
  wavesCleared: number;
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

export interface SlashBeatSaveSchema {
  version: 1;
  highScore: number;
  highestCombo: number;
  bestGrade: GradeRank;
  totalRuns: number;
  calibrationOffsetMs: number;
  isMuted: boolean;
}

export interface PlayroomFinishPayload {
  score: number;
  stats: {
    maxCombo: number;
    perfectParries: number;
    mikiriCount: number;
    grade: string;
    wavesCleared: number;
  };
}
