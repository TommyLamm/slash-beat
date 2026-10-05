export const VIRTUAL_WIDTH = 960;
export const VIRTUAL_HEIGHT = 540;

// 判定線與中心點
export const CENTER_X = 480;
export const GROUND_Y = 380;
export const HIT_DISTANCE_OFFSET = 35; // 左右刀刃交擊判定偏移 (左 445, 右 515)

// 節奏判定時間窗 (單位：秒)
export const WINDOW_PERFECT = 0.045; // ±45ms
export const WINDOW_GOOD = 0.090;    // ±90ms
export const WINDOW_MIKIRI = 0.060;  // ±60ms

// 防刷冷卻
export const SPAM_COOLDOWN = 0.10;   // 100ms 硬冷卻
export const PENALTY_DURATION = 0.40;// 連續空按懲罰時間 (400ms)

// 架勢條最大值
export const MAX_POSTURE = 100;
export const MAX_HP = 100;

// 架勢與生命值增減
export const POSTURE_ENEMY_PERFECT = 25;
export const POSTURE_ENEMY_GOOD = 8;
export const POSTURE_ENEMY_MIKIRI = 40;

export const POSTURE_PLAYER_GOOD = 15;
export const POSTURE_PLAYER_MISS = 30;
export const POSTURE_PLAYER_RECOVER_PERFECT = 10;
export const POSTURE_PLAYER_RECOVER_MIKIRI = 20;

export const DAMAGE_PLAYER_MISS = 20;
export const DAMAGE_PLAYER_WRONG_ACTION = 35;

// 得分常數
export const SCORE_PERFECT = 300;
export const SCORE_GOOD = 100;
export const SCORE_MIKIRI = 800;
export const SCORE_DEATHBLOW_BASE = 2500;
export const SCORE_FLAWLESS_BONUS = 5000;

// 頓幀時間 (秒)
export const HITSTOP_PERFECT = 0.080;
export const HITSTOP_MIKIRI = 0.100;
export const HITSTOP_IAI = 0.160;
export const HITSTOP_DEATH = 0.200;

// 存檔 Key
export const STORAGE_KEY = 'slash-beat:save:v1';
