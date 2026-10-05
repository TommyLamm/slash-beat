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
export const WINDOW_JUMP = 0.075;    // ±75ms

// 判定防刷機制 (隻狼式流暢手感優化)
export const EMPTY_ACTION_COOLDOWN = 0.05; // 空刀硬冷卻 50ms
export const SPAM_COOLDOWN = 0.04;         // 連續招架最短間隔 40ms，適應 185+ BPM
export const PENALTY_DURATION = 0.30;      // 連續空按懲罰時間 (300ms)

// 極意境界 (Fever Rush)
export const FEVER_COMBO_THRESHOLD = 15;

// 架勢條最大值
export const MAX_POSTURE = 100;
export const MAX_HP = 100;

// 架勢與生命值增減 (雜兵)
export const POSTURE_ENEMY_PERFECT = 25;
export const POSTURE_ENEMY_GOOD = 8;
export const POSTURE_ENEMY_MIKIRI = 40;
export const POSTURE_ENEMY_JUMP = 36;

// 架勢與生命值增減 (影之劍聖 Boss)
export const POSTURE_BOSS_PERFECT = 14;
export const POSTURE_BOSS_GOOD = 5;
export const POSTURE_BOSS_MIKIRI = 28;
export const POSTURE_BOSS_JUMP = 25;

export const POSTURE_PLAYER_GOOD = 15;
export const POSTURE_PLAYER_MISS = 30;
export const POSTURE_PLAYER_RECOVER_PERFECT = 12;
export const POSTURE_PLAYER_RECOVER_MIKIRI = 22;
export const POSTURE_PLAYER_RECOVER_JUMP = 20;

export const DAMAGE_PLAYER_MISS = 20;
export const DAMAGE_PLAYER_WRONG_ACTION = 35;

// 得分常數
export const SCORE_PERFECT = 300;
export const SCORE_GOOD = 100;
export const SCORE_MIKIRI = 800;
export const SCORE_JUMP_COUNTER = 900;
export const SCORE_DEATHBLOW_BASE = 2500;
export const SCORE_BOSS_DEATHBLOW = 8000;
export const SCORE_FLAWLESS_BONUS = 5000;

// 頓幀時間 (秒)
export const HITSTOP_PERFECT = 0.080;
export const HITSTOP_MIKIRI = 0.120;
export const HITSTOP_JUMP = 0.120;
export const HITSTOP_IAI = 0.180;
export const HITSTOP_DEATH = 0.200;

// 慢動作終結特寫
export const SLOWMO_DURATION = 0.40;   // 慢動作 0.4 秒
export const SLOWMO_TIME_SCALE = 0.18; // 時空慢放倍率

// 無盡道場常數
export const ENDLESS_START_BPM = 110;
export const ENDLESS_MAX_BPM = 185;

// 存檔 Key
export const STORAGE_KEY = 'slash-beat:save:v1';
