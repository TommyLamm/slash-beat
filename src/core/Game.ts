import {
  GameState,
  GameMode,
  CombatStats,
  EnemyNote,
  ActionType,
  AttackSide,
  AttackType,
  BladeTrailStyle,
} from '../types';
import {
  CENTER_X,
  GROUND_Y,
  HIT_DISTANCE_OFFSET,
  HITSTOP_PERFECT,
  HITSTOP_MIKIRI,
  HITSTOP_JUMP,
  HITSTOP_IAI,
  HITSTOP_DEATH,
  SLOWMO_DURATION,
  SLOWMO_TIME_SCALE,
  POSTURE_ENEMY_PERFECT,
  POSTURE_ENEMY_GOOD,
  POSTURE_ENEMY_MIKIRI,
  POSTURE_ENEMY_JUMP,
  POSTURE_BOSS_PERFECT,
  POSTURE_BOSS_GOOD,
  POSTURE_BOSS_MIKIRI,
  POSTURE_BOSS_JUMP,
  POSTURE_PLAYER_GOOD,
  POSTURE_PLAYER_MISS,
  POSTURE_PLAYER_RECOVER_PERFECT,
  POSTURE_PLAYER_RECOVER_MIKIRI,
  POSTURE_PLAYER_RECOVER_JUMP,
  DAMAGE_PLAYER_MISS,
  DAMAGE_PLAYER_WRONG_ACTION,
  SCORE_PERFECT,
  SCORE_GOOD,
  SCORE_MIKIRI,
  SCORE_JUMP_COUNTER,
  SCORE_DEATHBLOW_BASE,
  SCORE_BOSS_DEATHBLOW,
  SCORE_FLAWLESS_BONUS,
  MAX_POSTURE,
  FEVER_COMBO_THRESHOLD,
  ENDLESS_START_BPM,
  ENDLESS_MAX_BPM,
} from './Constants';
import { StorageManager } from './Storage';
import { BeatTracker } from './BeatTracker';
import { ParryJudge } from './ParryJudge';
import { InputManager } from './InputManager';
import { SoundEngine } from '../audio/SoundEngine';
import { Samurai } from '../entities/Samurai';
import { EnemyNinja } from '../entities/EnemyNinja';
import { VisualEffectManager } from '../render/VisualEffectManager';
import { Camera } from '../render/Camera';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { PlayroomSDKBridge } from '../sdk/PlayroomSDKBridge';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private state: GameState = 'BOOT';
  private gameMode: GameMode = 'WAVES';
  private soundEngine: SoundEngine;
  private beatTracker: BeatTracker;
  private parryJudge: ParryJudge;
  private inputManager: InputManager;
  private samurai: Samurai;
  private vfx: VisualEffectManager;
  private camera: Camera;
  private renderer: CanvasRenderer;

  private enemies: EnemyNinja[] = [];
  private noteQueue: EnemyNote[] = [];
  private currentWave: number = 1;
  private currentBpm: number = 118;
  private enemyPosture: number = 0;
  private isWaveFlawless: boolean = true;
  private countdownVal: number = 3;
  private countdownTimer: number = 0;
  private stateTimer: number = 0;
  private isBossWave: boolean = false;

  private stats: CombatStats = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfectCount: 0,
    goodCount: 0,
    mikiriCount: 0,
    jumpCounterCount: 0,
    missCount: 0,
    totalNotes: 0,
    grade: 'C',
    wavesCleared: 0,
    endlessKills: 0,
  };

  private calibrationOffsetMs: number = 0;
  private isMuted: boolean = false;
  private selectedBladeTrail: BladeTrailStyle = 'AZURE';
  private touchSplitRatio: number = 0.5;
  private touchInvert: boolean = false;
  private lastFrameTime: number = 0;
  private lastCalibBeat: number = -1;

  // 無盡道場生成計數
  private endlessSpawnBeat: number = 4.0;
  private endlessTotalSpawned: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // 載入本地存檔
    const saved = StorageManager.load();
    this.calibrationOffsetMs = saved.calibrationOffsetMs;
    this.isMuted = saved.isMuted;
    this.selectedBladeTrail = saved.selectedBladeTrail || 'AZURE';
    this.touchSplitRatio = saved.touchSplitRatio || 0.5;
    this.touchInvert = saved.touchInvert || false;
    this.stats.score = saved.highScore;
    this.stats.maxCombo = saved.highestCombo;
    this.stats.grade = saved.bestGrade;
    this.stats.endlessKills = saved.endlessHighestKills || 0;

    // 初始化子系統
    this.soundEngine = new SoundEngine();
    this.soundEngine.setMute(this.isMuted);

    this.beatTracker = new BeatTracker(118, this.calibrationOffsetMs);
    this.parryJudge = new ParryJudge();
    this.inputManager = new InputManager(this.canvas);
    this.inputManager.setTouchConfig(this.touchSplitRatio, this.touchInvert);

    this.samurai = new Samurai();
    this.samurai.bladeTrailStyle = this.selectedBladeTrail;

    this.vfx = new VisualEffectManager();
    this.camera = new Camera();
    this.renderer = new CanvasRenderer(this.ctx);

    this.setupInputHandlers();
    this.setupClickRegions();

    this.state = 'TITLE';
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }

  private setupInputHandlers(): void {
    this.inputManager.setOnAction((action: ActionType) => {
      this.handlePlayerAction(action);
    });

    this.inputManager.setOnConfirm(() => {
      this.handleConfirm();
    });

    this.inputManager.setOnCancel(() => {
      this.toggleMute();
    });

    this.inputManager.setOnTouchRipple((x: number, y: number, color: string) => {
      this.vfx.addTouchRipple(x, y, color);
    });
  }

  private setupClickRegions(): void {
    this.inputManager.clearClickRegions();

    // 1. 標題出陣按鈕 (修羅波次 Story Waves)
    this.inputManager.registerClickRegion({
      id: 'START_WAVES_BTN',
      x: CENTER_X - 190,
      y: 270,
      w: 180,
      h: 46,
      callback: () => {
        if (this.state === 'TITLE') {
          this.gameMode = 'WAVES';
          this.startReadyCountdown();
        }
      },
    });

    // 2. 標題無盡道場試煉按鈕 (Endless Dojo)
    this.inputManager.registerClickRegion({
      id: 'START_ENDLESS_BTN',
      x: CENTER_X + 10,
      y: 270,
      w: 180,
      h: 46,
      callback: () => {
        if (this.state === 'TITLE') {
          this.gameMode = 'ENDLESS';
          this.startReadyCountdown();
        }
      },
    });

    // 3. 刀光光刃風格切換按鈕
    this.inputManager.registerClickRegion({
      id: 'SWITCH_TRAIL_BTN',
      x: CENTER_X - 110,
      y: 335,
      w: 220,
      h: 36,
      callback: () => {
        if (this.state === 'TITLE') {
          this.cycleBladeTrail();
        }
      },
    });

    // 4. 標題延遲校準按鈕
    this.inputManager.registerClickRegion({
      id: 'CALIBRATE_BTN',
      x: CENTER_X - 90,
      y: 385,
      w: 180,
      h: 34,
      callback: () => {
        if (this.state === 'TITLE') {
          this.enterCalibration();
        }
      },
    });

    // 5. 校準頁 -10ms 按鈕
    this.inputManager.registerClickRegion({
      id: 'CALIBRATE_MINUS_BTN',
      x: CENTER_X - 140,
      y: 375,
      w: 120,
      h: 38,
      callback: () => {
        if (this.state === 'CALIBRATION') {
          this.adjustCalibration(-10);
        }
      },
    });

    // 6. 校準頁 +10ms 按鈕
    this.inputManager.registerClickRegion({
      id: 'CALIBRATE_PLUS_BTN',
      x: CENTER_X + 20,
      y: 375,
      w: 120,
      h: 38,
      callback: () => {
        if (this.state === 'CALIBRATION') {
          this.adjustCalibration(+10);
        }
      },
    });

    // 7. 校準頁保存按鈕
    this.inputManager.registerClickRegion({
      id: 'CALIBRATE_SAVE_BTN',
      x: CENTER_X - 90,
      y: 445,
      w: 180,
      h: 42,
      callback: () => {
        if (this.state === 'CALIBRATION') {
          this.exitCalibration();
        }
      },
    });

    // 8. 結算再戰按鈕
    this.inputManager.registerClickRegion({
      id: 'RESTART_BTN',
      x: CENTER_X - 90,
      y: 365,
      w: 180,
      h: 46,
      callback: () => {
        if (this.state === 'GAME_OVER') {
          this.startReadyCountdown();
        }
      },
    });
  }

  private cycleBladeTrail(): void {
    if (this.selectedBladeTrail === 'AZURE') {
      this.selectedBladeTrail = 'CRIMSON';
    } else if (this.selectedBladeTrail === 'CRIMSON') {
      this.selectedBladeTrail = 'SOLAR';
    } else {
      this.selectedBladeTrail = 'AZURE';
    }
    this.samurai.bladeTrailStyle = this.selectedBladeTrail;
    StorageManager.save({ selectedBladeTrail: this.selectedBladeTrail });
    this.soundEngine.sfx?.playClang(true);
  }

  private async ensureAudio(): Promise<boolean> {
    return await this.soundEngine.unlock();
  }

  private toggleMute(): void {
    this.isMuted = this.soundEngine.toggleMute();
    StorageManager.save({ isMuted: this.isMuted });
  }

  private enterCalibration(): void {
    this.ensureAudio();
    this.state = 'CALIBRATION';
    const audioCtx = this.soundEngine.getContext();
    if (audioCtx) {
      this.beatTracker.start(audioCtx);
      this.soundEngine.sequencer?.stop();
    }
    this.lastCalibBeat = -1;
  }

  private adjustCalibration(deltaMs: number): void {
    this.calibrationOffsetMs = Math.max(-150, Math.min(150, this.calibrationOffsetMs + deltaMs));
    this.beatTracker.setOffsetMs(this.calibrationOffsetMs);
    this.soundEngine.sfx?.playMetronomeTick(true);
  }

  private exitCalibration(): void {
    this.beatTracker.reset();
    StorageManager.save({ calibrationOffsetMs: this.calibrationOffsetMs });
    this.state = 'TITLE';
  }

  private async startReadyCountdown(): Promise<void> {
    await this.ensureAudio();
    this.currentWave = 1;
    this.currentBpm = this.gameMode === 'ENDLESS' ? ENDLESS_START_BPM : 118;
    this.stats = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      goodCount: 0,
      mikiriCount: 0,
      jumpCounterCount: 0,
      missCount: 0,
      totalNotes: 0,
      grade: 'C',
      wavesCleared: 0,
      endlessKills: 0,
    };
    this.samurai.reset();
    this.samurai.bladeTrailStyle = this.selectedBladeTrail;
    this.enemyPosture = 0;
    this.isWaveFlawless = true;
    this.countdownVal = 3;
    this.countdownTimer = 0;
    this.isBossWave = this.gameMode === 'WAVES' && (this.currentWave % 3 === 0);
    this.endlessSpawnBeat = 4.0;
    this.endlessTotalSpawned = 0;
    this.state = 'READY';

    this.soundEngine.sfx?.playCountdownTaiko(false);
  }

  private startCombatWave(): void {
    const audioCtx = this.soundEngine.getContext();
    if (!audioCtx) return;

    this.isBossWave = this.gameMode === 'WAVES' && (this.currentWave % 3 === 0);

    if (this.gameMode === 'WAVES') {
      this.currentBpm = 118 + (this.currentWave - 1) * 8;
    }

    this.beatTracker.setBpm(this.currentBpm);
    this.beatTracker.start(audioCtx, 0.5);

    this.soundEngine.sequencer?.stop();
    this.soundEngine.sequencer?.start(this.currentBpm, audioCtx.currentTime + 0.5, this.isBossWave);

    if (this.isBossWave) {
      this.soundEngine.sfx?.playBossRoar();
      this.camera.triggerShake(7, 0.35);
    }

    if (this.gameMode === 'WAVES') {
      this.generateWaveBeatmap(this.currentWave, this.currentBpm, this.isBossWave);
    } else {
      // 無盡道場初始生成
      this.noteQueue = [];
      this.enemies = [];
      this.endlessSpawnBeat = 4.0;
      this.populateEndlessQueue(20);
    }

    this.state = 'COMBAT';
    PlayroomSDKBridge.startRun();
  }

  // 無盡道場動態生成隊列
  private populateEndlessQueue(count: number): void {
    const spb = 60 / this.currentBpm;

    for (let i = 0; i < count; i++) {
      this.endlessTotalSpawned++;
      const side: AttackSide = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      const dice = Math.random();

      // 敵兵類型分佈：隨擊殺數增加多樣化
      let type: AttackType = 'NORMAL';
      let enemyKind: any = 'NORMAL';
      let approachDuration = Math.max(0.65, 1.05 - (this.currentBpm - 110) * 0.005);

      if (dice < 0.28) {
        // 雙手裏劍忍者
        type = 'SHURIKEN';
        enemyKind = 'SHURIKEN_SHINOBI';
        this.noteQueue.push({
          id: `endless_${this.endlessTotalSpawned}_shuriken1`,
          targetBeat: this.endlessSpawnBeat,
          targetTime: this.endlessSpawnBeat * spb,
          side,
          type: 'SHURIKEN',
          approachDuration,
          isDead: false,
          handled: false,
          enemyKind: 'SHURIKEN_SHINOBI',
          shurikenIndex: 1,
        });
        this.stats.totalNotes++;

        // 切分音第二枚飛鏢
        const secondBeat = this.endlessSpawnBeat + 0.32;
        this.noteQueue.push({
          id: `endless_${this.endlessTotalSpawned}_shuriken2`,
          targetBeat: secondBeat,
          targetTime: secondBeat * spb,
          side,
          type: 'SHURIKEN',
          approachDuration,
          isDead: false,
          handled: false,
          enemyKind: 'SHURIKEN_SHINOBI',
          shurikenIndex: 2,
        });
        this.stats.totalNotes++;

        this.endlessSpawnBeat += 1.8;
      } else if (dice < 0.52) {
        // 長槍僧兵：直刺或下段掃堂腿
        const isSweep = Math.random() < 0.5;
        type = isSweep ? 'SPEAR_SWEEP' : 'SPEAR_THRUST';
        enemyKind = 'SPEAR_MONK';
        approachDuration = 1.15;

        this.noteQueue.push({
          id: `endless_${this.endlessTotalSpawned}_monk`,
          targetBeat: this.endlessSpawnBeat,
          targetTime: this.endlessSpawnBeat * spb,
          side,
          type,
          approachDuration,
          isDead: false,
          handled: false,
          enemyKind: 'SPEAR_MONK',
        });
        this.stats.totalNotes++;
        this.endlessSpawnBeat += 2.0;
      } else if (dice < 0.72) {
        // 三連斬
        type = 'FLURRY_TRIPLE';
        for (let f = 1; f <= 3; f++) {
          const beat = this.endlessSpawnBeat + (f - 1) * 0.25;
          this.noteQueue.push({
            id: `endless_${this.endlessTotalSpawned}_flurry_${f}`,
            targetBeat: beat,
            targetTime: beat * spb,
            side,
            type: 'NORMAL',
            approachDuration,
            isDead: false,
            handled: false,
            flurryIndex: f,
            flurryTotal: 3,
          });
          this.stats.totalNotes++;
        }
        this.endlessSpawnBeat += 2.0;
      } else {
        // 普通近戰武士
        this.noteQueue.push({
          id: `endless_${this.endlessTotalSpawned}_norm`,
          targetBeat: this.endlessSpawnBeat,
          targetTime: this.endlessSpawnBeat * spb,
          side,
          type: 'NORMAL',
          approachDuration,
          isDead: false,
          handled: false,
        });
        this.stats.totalNotes++;
        this.endlessSpawnBeat += 1.25;
      }
    }
  }

  // 波次模式譜面演算法 (包含雙手裏劍忍者與長槍僧兵)
  private generateWaveBeatmap(wave: number, bpm: number, isBoss: boolean): void {
    this.noteQueue = [];
    this.enemies = [];
    const spb = 60 / bpm;

    if (isBoss) {
      // ===== BOSS 專屬關卡：影之劍聖 =====
      let currentBeat = 4.0;
      const patterns = ['FLURRY_TRIPLE', 'BOSS_DELAYED', 'BOSS_QUINTUPLE', 'BOSS_JUMP', 'FLURRY_TRIPLE', 'BOSS_JUMP'];

      for (let pIdx = 0; pIdx < patterns.length; pIdx++) {
        const pattern = patterns[pIdx];
        const side: AttackSide = pIdx % 2 === 0 ? 'LEFT' : 'RIGHT';

        if (pattern === 'FLURRY_TRIPLE') {
          for (let f = 1; f <= 3; f++) {
            const beat = currentBeat + (f - 1) * 0.28;
            this.noteQueue.push({
              id: `boss_w${wave}_triple_${pIdx}_${f}`,
              targetBeat: beat,
              targetTime: beat * spb,
              side,
              type: 'NORMAL',
              approachDuration: 0.85,
              isDead: false,
              handled: false,
              isBoss: true,
              flurryIndex: f,
              flurryTotal: 3,
            });
            this.stats.totalNotes++;
          }
          currentBeat += 2.2;
        } else if (pattern === 'BOSS_QUINTUPLE') {
          const offsets = [0, 0.2, 0.65, 0.85, 1.05];
          for (let f = 1; f <= 5; f++) {
            const beat = currentBeat + offsets[f - 1];
            this.noteQueue.push({
              id: `boss_w${wave}_quint_${pIdx}_${f}`,
              targetBeat: beat,
              targetTime: beat * spb,
              side,
              type: 'NORMAL',
              approachDuration: 0.75,
              isDead: false,
              handled: false,
              isBoss: true,
              flurryIndex: f,
              flurryTotal: 5,
            });
            this.stats.totalNotes++;
          }
          currentBeat += 2.5;
        } else if (pattern === 'BOSS_DELAYED') {
          this.noteQueue.push({
            id: `boss_w${wave}_delay_${pIdx}`,
            targetBeat: currentBeat + 1.2,
            targetTime: (currentBeat + 1.2) * spb,
            side,
            type: 'BOSS_DELAYED',
            approachDuration: 1.45,
            isDead: false,
            handled: false,
            isBoss: true,
          });
          this.stats.totalNotes++;
          currentBeat += 2.4;
        } else if (pattern === 'BOSS_JUMP') {
          this.noteQueue.push({
            id: `boss_w${wave}_jump_${pIdx}`,
            targetBeat: currentBeat + 1.0,
            targetTime: (currentBeat + 1.0) * spb,
            side,
            type: 'BOSS_JUMP',
            approachDuration: 1.1,
            isDead: false,
            handled: false,
            isBoss: true,
          });
          this.stats.totalNotes++;
          currentBeat += 2.2;
        }
      }
      return;
    }

    // ===== 一般波次：整合雙手裏劍忍者與長槍僧兵 =====
    const noteCount = 14 + wave * 7;
    let currentBeat = 4.0;
    let lastSide: AttackSide = 'LEFT';

    for (let i = 0; i < noteCount; i++) {
      const side: AttackSide = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      const dice = Math.random();

      if (wave >= 2 && dice < 0.22) {
        // 雙手裏劍忍者 (Shuriken Shinobi)
        const approachDuration = Math.max(0.75, 1.1 - (wave - 1) * 0.06);
        this.noteQueue.push({
          id: `w${wave}_shuriken_${i}_1`,
          targetBeat: currentBeat,
          targetTime: currentBeat * spb,
          side,
          type: 'SHURIKEN',
          approachDuration,
          isDead: false,
          handled: false,
          enemyKind: 'SHURIKEN_SHINOBI',
          shurikenIndex: 1,
        });
        this.stats.totalNotes++;

        const secondBeat = currentBeat + 0.35;
        this.noteQueue.push({
          id: `w${wave}_shuriken_${i}_2`,
          targetBeat: secondBeat,
          targetTime: secondBeat * spb,
          side,
          type: 'SHURIKEN',
          approachDuration,
          isDead: false,
          handled: false,
          enemyKind: 'SHURIKEN_SHINOBI',
          shurikenIndex: 2,
        });
        this.stats.totalNotes++;
        currentBeat += 1.8;
      } else if (wave >= 2 && dice < 0.44) {
        // 長槍僧兵 (Spear Monk)
        const isSweep = Math.random() < 0.5;
        const type: AttackType = isSweep ? 'SPEAR_SWEEP' : 'SPEAR_THRUST';
        this.noteQueue.push({
          id: `w${wave}_monk_${i}`,
          targetBeat: currentBeat,
          targetTime: currentBeat * spb,
          side,
          type,
          approachDuration: 1.25,
          isDead: false,
          handled: false,
          enemyKind: 'SPEAR_MONK',
        });
        this.stats.totalNotes++;
        currentBeat += 2.0;
      } else {
        // 普通近戰 / 三連斬
        let type: AttackType = 'NORMAL';
        if (wave >= 2 && Math.random() < 0.25) {
          type = 'FLURRY_TRIPLE';
        }

        const beatInterval = side === lastSide ? 1.0 : 1.5;
        currentBeat += beatInterval;
        lastSide = side;

        const targetTime = currentBeat * spb;
        const approachDuration = Math.max(0.72, 1.15 - (wave - 1) * 0.08);

        this.noteQueue.push({
          id: `wave${wave}_note_${i}`,
          targetBeat: currentBeat,
          targetTime,
          side,
          type,
          approachDuration,
          isDead: false,
          handled: false,
        });
        this.stats.totalNotes++;

        if (type === 'FLURRY_TRIPLE') {
          for (let flurryIdx = 1; flurryIdx <= 2; flurryIdx++) {
            const flurryBeat = currentBeat + flurryIdx * 0.25;
            this.noteQueue.push({
              id: `wave${wave}_note_${i}_f${flurryIdx}`,
              targetBeat: flurryBeat,
              targetTime: flurryBeat * spb,
              side,
              type: 'NORMAL',
              approachDuration,
              isDead: false,
              handled: false,
            });
            this.stats.totalNotes++;
          }
          currentBeat += 0.5;
        }
      }
    }
  }

  // 玩家動作響應
  private handlePlayerAction(action: ActionType): void {
    if (this.state === 'TITLE') {
      this.startReadyCountdown();
      return;
    }

    if (this.state === 'CALIBRATION') {
      if (action === 'PARRY') {
        this.adjustCalibration(-10);
      } else {
        this.adjustCalibration(+10);
      }
      return;
    }

    if (this.state === 'DEATHBLOW_WINDOW') {
      if (action === 'SLASH') {
        this.triggerDeathblowSlash();
      }
      return;
    }

    if (this.state === 'GAME_OVER') {
      this.startReadyCountdown();
      return;
    }

    if (this.state !== 'COMBAT') return;

    const audioCtx = this.soundEngine.getContext();
    if (!audioCtx) return;

    const songTime = this.beatTracker.getSongTime(audioCtx);
    const activeNotes = this.enemies.map(e => e.note);

    const result = this.parryJudge.evaluateInput(action, songTime, activeNotes);
    const side = result.targetEnemy?.side || 'LEFT';

    const clashX = side === 'LEFT' ? CENTER_X - HIT_DISTANCE_OFFSET : CENTER_X + HIT_DISTANCE_OFFSET;
    const clashY = GROUND_Y - 45;

    switch (result.rating) {
      case 'PERFECT': {
        this.samurai.setPose(side === 'LEFT' ? 'PARRY_LEFT' : 'PARRY_RIGHT', 0.18);
        this.soundEngine.sfx?.playClang(true);
        this.vfx.spawnSparks(clashX, clashY, 50, this.selectedBladeTrail);
        this.vfx.spawnInkSplatter(clashX, clashY, 8);
        this.vfx.spawnBladeVacuum(clashX, clashY, 140); // 氣刃斬斷雨滴
        this.vfx.triggerHitstop(HITSTOP_PERFECT);
        this.camera.triggerShake(5.5, 0.22);
        this.vfx.addFloatingText(clashX, clashY - 20, 'PERFECT PARRY!', '#ffd700');

        this.addScore(SCORE_PERFECT);
        this.stats.perfectCount++;
        this.stats.combo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

        this.samurai.reducePosture(POSTURE_PLAYER_RECOVER_PERFECT);
        this.addEnemyPosture(this.isBossWave ? POSTURE_BOSS_PERFECT : POSTURE_ENEMY_PERFECT);

        const enemyObj = this.enemies.find(e => e.note === result.targetEnemy);
        enemyObj?.triggerDefeat('PARRY');
        this.onEnemyDefeated(result.targetEnemy);
        break;
      }

      case 'GOOD': {
        this.samurai.setPose(side === 'LEFT' ? 'PARRY_LEFT' : 'PARRY_RIGHT', 0.15);
        this.soundEngine.sfx?.playThud();
        this.vfx.spawnSparks(clashX, clashY, 20, this.selectedBladeTrail);
        this.camera.triggerShake(3, 0.16);
        this.vfx.addFloatingText(clashX, clashY - 20, 'GOOD BLOCK', '#ffffff');

        this.addScore(SCORE_GOOD);
        this.stats.goodCount++;
        this.stats.combo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

        this.samurai.addPosture(POSTURE_PLAYER_GOOD);
        this.addEnemyPosture(this.isBossWave ? POSTURE_BOSS_GOOD : POSTURE_ENEMY_GOOD);

        const enemyObj = this.enemies.find(e => e.note === result.targetEnemy);
        enemyObj?.triggerDefeat('PARRY');
        this.onEnemyDefeated(result.targetEnemy);
        break;
      }

      case 'MIKIRI': {
        // 看破踩刀：觸發慢動作終結特寫！
        this.samurai.setPose('MIKIRI', 0.32);
        this.soundEngine.sfx?.playMikiri();
        this.vfx.spawnMikiriBurst(clashX, clashY + 20);
        this.vfx.triggerHitstop(HITSTOP_MIKIRI);

        // 觸發慢動作特寫 (0.4 秒)
        this.vfx.triggerSlowmo(SLOWMO_DURATION);
        this.camera.triggerZoom(1.38, 0.42, clashX, clashY);
        this.camera.triggerShake(8.0, 0.35);
        this.vfx.addFloatingText(clashX, clashY - 35, 'MIKIRI COUNTER!!', '#00f0ff');

        this.addScore(SCORE_MIKIRI);
        this.stats.mikiriCount++;
        this.stats.combo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

        this.samurai.reducePosture(POSTURE_PLAYER_RECOVER_MIKIRI);
        this.addEnemyPosture(this.isBossWave ? POSTURE_BOSS_MIKIRI : POSTURE_ENEMY_MIKIRI);

        const enemyObj = this.enemies.find(e => e.note === result.targetEnemy);
        enemyObj?.triggerDefeat('MIKIRI');
        this.onEnemyDefeated(result.targetEnemy);
        break;
      }

      case 'JUMP_COUNTER': {
        // 向上看破跳躍踩槍：躍空怒斬慢動作！
        this.samurai.setPose('JUMP_COUNTER', 0.38);
        this.soundEngine.sfx?.playJumpCounter();
        this.vfx.spawnJumpCounterBurst(clashX, clashY);
        this.vfx.triggerHitstop(HITSTOP_JUMP);

        // 觸發慢動作特寫 (0.4 秒)
        this.vfx.triggerSlowmo(SLOWMO_DURATION);
        this.camera.triggerZoom(1.42, 0.45, clashX, clashY - 40);
        this.camera.triggerShake(8.5, 0.38);
        this.vfx.addFloatingText(clashX, clashY - 45, 'JUMP COUNTER!!', '#ffd700');

        this.addScore(SCORE_JUMP_COUNTER);
        this.stats.jumpCounterCount++;
        this.stats.combo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

        this.samurai.reducePosture(POSTURE_PLAYER_RECOVER_JUMP);
        this.addEnemyPosture(this.isBossWave ? POSTURE_BOSS_JUMP : POSTURE_ENEMY_JUMP);

        const enemyObj = this.enemies.find(e => e.note === result.targetEnemy);
        enemyObj?.triggerDefeat('JUMP_COUNTER');
        this.onEnemyDefeated(result.targetEnemy);
        break;
      }

      case 'WRONG_ACTION': {
        this.soundEngine.sfx?.playHit();
        this.soundEngine.sfx?.playMissBuzz();
        this.soundEngine.sfx?.playPostureBreak();
        this.vfx.addFloatingText(CENTER_X, GROUND_Y - 40, '擇錯破防!!', '#ff003c');
        this.camera.triggerShake(8.5, 0.36);
        this.samurai.takeDamage(DAMAGE_PLAYER_WRONG_ACTION);
        this.stats.combo = 0;
        this.stats.missCount++;
        this.isWaveFlawless = false;

        const enemyObj = this.enemies.find(e => e.note === result.targetEnemy);
        enemyObj?.triggerDefeat('PARRY');
        this.checkPlayerDeath();
        break;
      }

      case 'MISS': {
        if (!result.targetEnemy) {
          this.soundEngine.sfx?.playEmptyWhoosh();
        }
        break;
      }
    }
  }

  private onEnemyDefeated(note?: EnemyNote | null): void {
    if (this.gameMode === 'ENDLESS') {
      this.stats.endlessKills++;

      // 無盡模式節奏狂飆演算法：每擊退 8 敵，BPM 狂飆 +5，最高狂飆至 185 BPM！
      if (this.stats.endlessKills % 8 === 0 && this.currentBpm < ENDLESS_MAX_BPM) {
        this.currentBpm = Math.min(ENDLESS_MAX_BPM, this.currentBpm + 5);
        this.beatTracker.setBpm(this.currentBpm);
        this.soundEngine.sequencer?.setBpm(this.currentBpm);
        this.vfx.addFloatingText(CENTER_X, GROUND_Y - 90, `BPM 加速狂飆 -> ${this.currentBpm}!`, '#00f0ff');
      }

      // 檢查是否需要補充無盡生成隊列
      if (this.noteQueue.length < 10) {
        this.populateEndlessQueue(15);
      }
    }
  }

  private handleConfirm(): void {
    if (this.state === 'TITLE') {
      this.startReadyCountdown();
    } else if (this.state === 'CALIBRATION') {
      this.exitCalibration();
    } else if (this.state === 'DEATHBLOW_WINDOW') {
      this.triggerDeathblowSlash();
    } else if (this.state === 'GAME_OVER') {
      this.startReadyCountdown();
    }
  }

  private addScore(baseScore: number): void {
    let multiplier = 1.0;
    if (this.stats.combo >= 50) multiplier = 5.0;
    else if (this.stats.combo >= 25) multiplier = 3.0;
    else if (this.stats.combo >= FEVER_COMBO_THRESHOLD) multiplier = 2.5;
    else if (this.stats.combo >= 10) multiplier = 1.5;

    this.stats.score += Math.floor(baseScore * multiplier);
  }

  private addEnemyPosture(amount: number): void {
    this.enemyPosture += amount;
    if (this.enemyPosture >= MAX_POSTURE && this.state === 'COMBAT') {
      this.enemyPosture = MAX_POSTURE;
      this.state = 'DEATHBLOW_WINDOW';
      this.soundEngine.sfx?.playDeathBlowPrompt();
      this.samurai.setPose('IAI_CHARGE', 1.5);
      this.vfx.triggerHitstop(0.2);
    }
  }

  private triggerDeathblowSlash(): void {
    this.state = 'IAI_SLASH_BURST';
    this.stateTimer = 0.65;
    this.soundEngine.sfx?.playIaiThunder();
    this.vfx.triggerIaiFlash(0.25);
    this.vfx.triggerHitstop(HITSTOP_IAI);
    this.camera.triggerShake(11, 0.45);
    this.camera.triggerZoom(1.15, 0.35);

    for (const e of this.enemies) {
      e.triggerDefeat('DEATHBLOW');
    }

    const waveBonus = this.isBossWave
      ? SCORE_BOSS_DEATHBLOW
      : (this.gameMode === 'ENDLESS' ? 5000 : this.currentWave * SCORE_DEATHBLOW_BASE);

    this.stats.score += waveBonus;
    const titleText = this.isBossWave ? `奧義・影之處決 +${waveBonus}!` : `居合一閃 +${waveBonus}!`;
    this.vfx.addFloatingText(CENTER_X, GROUND_Y - 90, titleText, '#ffd700');

    if (this.isWaveFlawless && this.gameMode === 'WAVES') {
      this.stats.score += SCORE_FLAWLESS_BONUS;
      this.vfx.addFloatingText(CENTER_X, GROUND_Y - 120, `無傷通關獎勵 +${SCORE_FLAWLESS_BONUS}!`, '#00f0ff');
    }
  }

  private checkPlayerDeath(): void {
    if (this.samurai.hp <= 0 && this.state !== 'GAME_OVER') {
      this.state = 'GAME_OVER';
      this.soundEngine.sequencer?.stop();
      this.soundEngine.sfx?.playPostureBreak();
      this.vfx.triggerHitstop(HITSTOP_DEATH);
      this.camera.triggerShake(9, 0.5);

      this.calculateGrade();

      if (this.gameMode === 'WAVES') {
        StorageManager.recordWaveRun(this.stats.score, this.stats.maxCombo, this.stats.grade);
      } else {
        StorageManager.recordEndlessRun(this.stats.score, this.stats.maxCombo, this.stats.endlessKills);
      }

      PlayroomSDKBridge.finishRun({
        score: this.stats.score,
        stats: {
          maxCombo: this.stats.maxCombo,
          perfectParries: this.stats.perfectCount,
          mikiriCount: this.stats.mikiriCount + this.stats.jumpCounterCount,
          grade: this.stats.grade,
          wavesCleared: this.gameMode === 'WAVES' ? this.stats.wavesCleared : this.stats.endlessKills,
          mode: this.gameMode,
        },
      });
    }
  }

  private calculateGrade(): void {
    const total = Math.max(1, this.stats.perfectCount + this.stats.goodCount + this.stats.missCount);
    const accuracy = ((this.stats.perfectCount * 1.0 + this.stats.goodCount * 0.5) / total) * 100;

    if (accuracy >= 98 && this.stats.missCount === 0) {
      this.stats.grade = 'SSS';
    } else if (accuracy >= 92 && (this.currentWave >= 4 || this.stats.endlessKills >= 30)) {
      this.stats.grade = 'SS';
    } else if (accuracy >= 85) {
      this.stats.grade = 'S';
    } else if (accuracy >= 75) {
      this.stats.grade = 'A';
    } else if (accuracy >= 60) {
      this.stats.grade = 'B';
    } else {
      this.stats.grade = 'C';
    }
  }

  // 主循環
  private gameLoop = (timestamp: number): void => {
    const rawDt = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    // 若處於慢動作終結特寫，時空慢放！
    const dt = this.vfx.isSlowmoActive ? rawDt * SLOWMO_TIME_SCALE : rawDt;

    this.update(dt, rawDt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number, rawDt: number): void {
    const isHitstopped = this.vfx.hitstopTimer > 0;
    this.vfx.update(rawDt);
    this.camera.update(rawDt);
    this.renderer.updateAmbient(rawDt, this.vfx);

    if (this.state === 'CALIBRATION') {
      const audioCtx = this.soundEngine.getContext();
      if (audioCtx) {
        const time = this.beatTracker.getSongTime(audioCtx);
        const currentBeatIndex = Math.floor(time * 2);
        if (currentBeatIndex > this.lastCalibBeat) {
          this.lastCalibBeat = currentBeatIndex;
          this.soundEngine.sfx?.playMetronomeTick(currentBeatIndex % 4 === 0);
        }
      }
      return;
    }

    if (this.state === 'READY') {
      this.countdownTimer += rawDt;
      if (this.countdownTimer >= 0.8) {
        this.countdownTimer = 0;
        this.countdownVal--;
        if (this.countdownVal > 0) {
          this.soundEngine.sfx?.playCountdownTaiko(false);
        } else if (this.countdownVal === 0) {
          this.soundEngine.sfx?.playCountdownTaiko(true);
        } else {
          this.startCombatWave();
        }
      }
      return;
    }

    if (this.state === 'IAI_SLASH_BURST') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.gameMode === 'WAVES') {
          this.state = 'WAVE_CLEAR';
          this.stateTimer = 1.3;
          this.stats.wavesCleared++;
        } else {
          // 無盡模式居合清屏後直接繼續戰鬥！
          this.state = 'COMBAT';
          this.enemyPosture = 0;
        }
      }
      return;
    }

    if (this.state === 'WAVE_CLEAR') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.currentWave++;
        this.enemyPosture = 0;
        this.isWaveFlawless = true;
        this.startCombatWave();
      }
      return;
    }

    if (this.state !== 'COMBAT' && this.state !== 'DEATHBLOW_WINDOW') return;
    if (isHitstopped) return;

    const audioCtx = this.soundEngine.getContext();
    if (!audioCtx) return;

    const songTime = this.beatTracker.getSongTime(audioCtx);

    // 極意境界 (Fever Rush) 與三味線激情模式
    const isFever = this.stats.combo >= FEVER_COMBO_THRESHOLD;
    this.samurai.isFever = isFever;
    this.soundEngine.sequencer?.setFeverMode(isFever);

    if (isFever && Math.random() < 0.6) {
      this.vfx.spawnFeverAura(this.samurai.x, this.samurai.y, this.selectedBladeTrail);
    }

    // 1. 實體生成
    while (this.noteQueue.length > 0) {
      const nextNote = this.noteQueue[0];
      if (songTime >= nextNote.targetTime - nextNote.approachDuration) {
        this.enemies.push(new EnemyNinja(nextNote));
        this.noteQueue.shift();

        // 預警音效與朱砂印記
        if (
          nextNote.type === 'PERILOUS_THRUST' ||
          nextNote.type === 'BOSS_JUMP' ||
          nextNote.type === 'SPEAR_THRUST'
        ) {
          this.soundEngine.sfx?.playPerilousStampAlert();
          this.vfx.spawnPerilousStamp(CENTER_X, 150);
          this.camera.triggerShake(4, 0.2);
        } else if (nextNote.type === 'SPEAR_SWEEP') {
          this.soundEngine.sfx?.playSpearSweep();
        } else if (nextNote.type === 'SHURIKEN') {
          this.soundEngine.sfx?.playShurikenWhoosh();
        }
      } else {
        break;
      }
    }

    // 2. 更新武士
    this.samurai.update(dt);

    // 3. 更新敵兵位移與漏招判定
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(songTime, dt);

      // 超時漏招
      if (!enemy.note.handled && !enemy.isDefeated && songTime > enemy.note.targetTime + 0.09) {
        enemy.note.handled = true;
        this.soundEngine.sfx?.playHit();
        this.soundEngine.sfx?.playMissBuzz();
        this.samurai.takeDamage(DAMAGE_PLAYER_MISS);
        this.camera.triggerShake(5.5, 0.22);
        this.vfx.addFloatingText(enemy.x, enemy.y - 30, 'MISS!', '#ff3344');
        this.stats.combo = 0;
        this.stats.missCount++;
        this.isWaveFlawless = false;
        this.checkPlayerDeath();
      }

      if (enemy.isFinished()) {
        this.enemies.splice(i, 1);
      }
    }

    // 波次模式清空判定
    if (this.gameMode === 'WAVES') {
      if (this.noteQueue.length === 0 && this.enemies.length === 0 && this.state === 'COMBAT') {
        this.state = 'WAVE_CLEAR';
        this.stateTimer = 1.3;
        this.stats.wavesCleared++;
      }
    }
  }

  private render(): void {
    const audioCtx = this.soundEngine.getContext();
    const songTime = audioCtx ? this.beatTracker.getSongTime(audioCtx) : 0;

    this.renderer.render(
      this.state,
      this.samurai,
      this.enemies,
      this.vfx,
      this.camera,
      this.stats,
      this.enemyPosture,
      songTime,
      this.currentWave,
      this.countdownVal,
      this.calibrationOffsetMs,
      this.isMuted,
      this.isBossWave,
      this.gameMode,
      this.currentBpm,
      this.touchSplitRatio,
      this.touchInvert,
      this.selectedBladeTrail
    );
  }
}
