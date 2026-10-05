import {
  GameState,
  CombatStats,
  EnemyNote,
  ActionType,
  AttackSide,
  AttackType,
} from '../types';
import {
  CENTER_X,
  GROUND_Y,
  HIT_DISTANCE_OFFSET,
  HITSTOP_PERFECT,
  HITSTOP_MIKIRI,
  HITSTOP_IAI,
  HITSTOP_DEATH,
  POSTURE_ENEMY_PERFECT,
  POSTURE_ENEMY_GOOD,
  POSTURE_ENEMY_MIKIRI,
  POSTURE_BOSS_PERFECT,
  POSTURE_BOSS_GOOD,
  POSTURE_BOSS_MIKIRI,
  POSTURE_PLAYER_GOOD,
  POSTURE_PLAYER_MISS,
  POSTURE_PLAYER_RECOVER_PERFECT,
  POSTURE_PLAYER_RECOVER_MIKIRI,
  DAMAGE_PLAYER_MISS,
  DAMAGE_PLAYER_WRONG_ACTION,
  SCORE_PERFECT,
  SCORE_GOOD,
  SCORE_MIKIRI,
  SCORE_DEATHBLOW_BASE,
  SCORE_BOSS_DEATHBLOW,
  SCORE_FLAWLESS_BONUS,
  MAX_POSTURE,
  FEVER_COMBO_THRESHOLD,
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
    missCount: 0,
    totalNotes: 0,
    grade: 'C',
    wavesCleared: 0,
  };

  private calibrationOffsetMs: number = 0;
  private isMuted: boolean = false;
  private lastFrameTime: number = 0;
  private lastCalibBeat: number = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // 載入本地存檔
    const saved = StorageManager.load();
    this.calibrationOffsetMs = saved.calibrationOffsetMs;
    this.isMuted = saved.isMuted;
    this.stats.score = saved.highScore;
    this.stats.maxCombo = saved.highestCombo;
    this.stats.grade = saved.bestGrade;

    // 初始化子系統
    this.soundEngine = new SoundEngine();
    this.soundEngine.setMute(this.isMuted);

    this.beatTracker = new BeatTracker(116, this.calibrationOffsetMs);
    this.parryJudge = new ParryJudge();
    this.inputManager = new InputManager(this.canvas);
    this.samurai = new Samurai();
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
  }

  private setupClickRegions(): void {
    this.inputManager.clearClickRegions();

    // 1. 標題出陣按鈕
    this.inputManager.registerClickRegion({
      id: 'START_BTN',
      x: CENTER_X - 100,
      y: 320,
      w: 200,
      h: 50,
      callback: () => {
        if (this.state === 'TITLE') {
          this.startReadyCountdown();
        }
      },
    });

    // 2. 標題延遲校準按鈕
    this.inputManager.registerClickRegion({
      id: 'CALIBRATE_BTN',
      x: CENTER_X - 90,
      y: 390,
      w: 180,
      h: 38,
      callback: () => {
        if (this.state === 'TITLE') {
          this.enterCalibration();
        }
      },
    });

    // 3. 校準頁 -10ms 按鈕
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

    // 4. 校準頁 +10ms 按鈕
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

    // 5. 校準頁保存按鈕
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

    // 6. 結算再戰按鈕
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
    this.stats = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      goodCount: 0,
      mikiriCount: 0,
      missCount: 0,
      totalNotes: 0,
      grade: 'C',
      wavesCleared: 0,
    };
    this.samurai.reset();
    this.enemyPosture = 0;
    this.isWaveFlawless = true;
    this.countdownVal = 3;
    this.countdownTimer = 0;
    this.isBossWave = (this.currentWave % 3 === 0);
    this.state = 'READY';

    this.soundEngine.sfx?.playCountdownTaiko(false);
  }

  private startCombatWave(): void {
    const audioCtx = this.soundEngine.getContext();
    if (!audioCtx) return;

    this.isBossWave = (this.currentWave % 3 === 0);

    // 波次 BPM 與難度曲線
    const waveBpm = 118 + (this.currentWave - 1) * 8;
    this.beatTracker.setBpm(waveBpm);
    this.beatTracker.start(audioCtx, 0.5);

    this.soundEngine.sequencer?.stop();
    this.soundEngine.sequencer?.start(waveBpm, audioCtx.currentTime + 0.5, this.isBossWave);

    if (this.isBossWave) {
      this.soundEngine.sfx?.playBossRoar();
      this.camera.triggerShake(7, 0.35);
    }

    // 生成當前波次敵兵/Boss譜面
    this.generateWaveBeatmap(this.currentWave, waveBpm, this.isBossWave);

    this.state = 'COMBAT';
    PlayroomSDKBridge.startRun();
  }

  // 動態譜面演算法 (支援影之劍聖 Boss 多段節奏變速連斬)
  private generateWaveBeatmap(wave: number, bpm: number, isBoss: boolean): void {
    this.noteQueue = [];
    this.enemies = [];

    const spb = 60 / bpm;

    if (isBoss) {
      // ===== BOSS 專屬關卡：影之劍聖 (Shadow Kensei) =====
      let currentBeat = 4.0;
      const patterns = ['FLURRY_TRIPLE', 'BOSS_DELAYED', 'BOSS_QUINTUPLE', 'BOSS_JUMP', 'FLURRY_TRIPLE', 'BOSS_JUMP'];

      for (let pIdx = 0; pIdx < patterns.length; pIdx++) {
        const pattern = patterns[pIdx];
        const side: AttackSide = pIdx % 2 === 0 ? 'LEFT' : 'RIGHT';

        if (pattern === 'FLURRY_TRIPLE') {
          // 1. 三連斬 (嗒-嗒-嗒)
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
          // 2. 變速五連斬 (前兩刀極快、中段停頓、後兩刀迅猛)
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
          // 3. 延遲重刀 (長蓄力慢刀)
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
          // 4. 躍空突刺 (高空撲擊，血紅「危」字)
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

    // ===== 一般波次雜兵配置 =====
    const noteCount = 14 + wave * 8;
    const perilousRate = Math.min(0.35, 0.05 + wave * 0.06);

    let currentBeat = 4.0;
    let lastSide: AttackSide = 'LEFT';

    for (let i = 0; i < noteCount; i++) {
      const side: AttackSide = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      const isPerilous = wave > 1 && Math.random() < perilousRate;

      let type: AttackType = 'NORMAL';
      if (isPerilous) {
        type = 'PERILOUS_THRUST';
      } else if (wave >= 2 && Math.random() < 0.22) {
        type = 'FLURRY_TRIPLE';
      }

      const beatInterval = isPerilous ? 2.0 : (side === lastSide ? 1.0 : 1.5);
      currentBeat += beatInterval;
      lastSide = side;

      const targetTime = currentBeat * spb;
      const approachDuration = Math.max(0.72, 1.15 - (wave - 1) * 0.08);

      const note: EnemyNote = {
        id: `wave${wave}_note_${i}`,
        targetBeat: currentBeat,
        targetTime,
        side,
        type,
        approachDuration,
        isDead: false,
        handled: false,
      };

      this.noteQueue.push(note);
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

    // 依判定反饋
    switch (result.rating) {
      case 'PERFECT': {
        this.samurai.setPose(side === 'LEFT' ? 'PARRY_LEFT' : 'PARRY_RIGHT', 0.18);
        this.soundEngine.sfx?.playClang(true); // 觸發完美招架共振和弦
        this.vfx.spawnSparks(clashX, clashY, 50); // 金紅高溫火花
        this.vfx.spawnInkSplatter(clashX, clashY, 8); // 水墨飛濺
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
        break;
      }

      case 'GOOD': {
        this.samurai.setPose(side === 'LEFT' ? 'PARRY_LEFT' : 'PARRY_RIGHT', 0.15);
        this.soundEngine.sfx?.playThud();
        this.vfx.spawnSparks(clashX, clashY, 20);
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
        break;
      }

      case 'MIKIRI': {
        // 看破成功：特工凌空踏刀，鏡頭瞬間縮放帶慢動作特寫！
        this.samurai.setPose('MIKIRI', 0.32);
        this.soundEngine.sfx?.playMikiri();
        this.vfx.spawnMikiriBurst(clashX, clashY + 20);
        this.vfx.triggerHitstop(HITSTOP_MIKIRI);

        // 鏡頭瞬間縮放特寫 (1.28x)
        this.camera.triggerZoom(1.28, 0.34, clashX, clashY);
        this.camera.triggerShake(7.5, 0.32);
        this.vfx.addFloatingText(clashX, clashY - 35, 'MIKIRI COUNTER!!', '#00f0ff');

        this.addScore(SCORE_MIKIRI);
        this.stats.mikiriCount++;
        this.stats.combo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

        this.samurai.reducePosture(POSTURE_PLAYER_RECOVER_MIKIRI);
        this.addEnemyPosture(this.isBossWave ? POSTURE_BOSS_MIKIRI : POSTURE_ENEMY_MIKIRI);

        const enemyObj = this.enemies.find(e => e.note === result.targetEnemy);
        enemyObj?.triggerDefeat('MIKIRI');
        break;
      }

      case 'WRONG_ACTION': {
        // 擇錯破防受創
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

  // 極意境界倍率計算 (15+ Combo 環繞蒼藍烈焰，得分倍增)
  private addScore(baseScore: number): void {
    let multiplier = 1.0;
    if (this.stats.combo >= 50) multiplier = 5.0;
    else if (this.stats.combo >= 25) multiplier = 3.0;
    else if (this.stats.combo >= FEVER_COMBO_THRESHOLD) multiplier = 2.5; // 極意境界
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

  // 觸發居合一閃 (Boss 戰觸發影之奧義處決)
  private triggerDeathblowSlash(): void {
    this.state = 'IAI_SLASH_BURST';
    this.stateTimer = 0.65;
    this.soundEngine.sfx?.playIaiThunder();
    this.vfx.triggerIaiFlash(0.25);
    this.vfx.triggerHitstop(HITSTOP_IAI);
    this.camera.triggerShake(11, 0.45);
    this.camera.triggerZoom(1.15, 0.35);

    // 擊潰所有在場敵人
    for (const e of this.enemies) {
      e.triggerDefeat('DEATHBLOW');
    }

    const waveBonus = this.isBossWave
      ? SCORE_BOSS_DEATHBLOW
      : this.currentWave * SCORE_DEATHBLOW_BASE;

    this.stats.score += waveBonus;
    const titleText = this.isBossWave ? `奧義・影之處決 +${waveBonus}!` : `居合一閃 +${waveBonus}!`;
    this.vfx.addFloatingText(CENTER_X, GROUND_Y - 90, titleText, '#ffd700');

    if (this.isWaveFlawless) {
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
      StorageManager.recordRun(this.stats.score, this.stats.maxCombo, this.stats.grade);

      // 上報 Playroom 平台
      PlayroomSDKBridge.finishRun({
        score: this.stats.score,
        stats: {
          maxCombo: this.stats.maxCombo,
          perfectParries: this.stats.perfectCount,
          mikiriCount: this.stats.mikiriCount,
          grade: this.stats.grade,
          wavesCleared: this.stats.wavesCleared,
        },
      });
    }
  }

  private calculateGrade(): void {
    const total = Math.max(1, this.stats.perfectCount + this.stats.goodCount + this.stats.missCount);
    const accuracy = ((this.stats.perfectCount * 1.0 + this.stats.goodCount * 0.5) / total) * 100;

    if (accuracy >= 98 && this.stats.missCount === 0) {
      this.stats.grade = 'SSS';
    } else if (accuracy >= 92 && this.currentWave >= 4) {
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

  // 主遊戲心跳循環
  private gameLoop = (timestamp: number): void => {
    const dt = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    const isHitstopped = this.vfx.hitstopTimer > 0;
    this.vfx.update(dt);
    this.camera.update(dt);
    this.renderer.updateAmbient(dt);

    // 校準模式的節奏心跳指示音
    if (this.state === 'CALIBRATION') {
      const audioCtx = this.soundEngine.getContext();
      if (audioCtx) {
        const time = this.beatTracker.getSongTime(audioCtx);
        const currentBeatIndex = Math.floor(time * 2); // 1秒2拍 (120 BPM)
        if (currentBeatIndex > this.lastCalibBeat) {
          this.lastCalibBeat = currentBeatIndex;
          this.soundEngine.sfx?.playMetronomeTick(currentBeatIndex % 4 === 0);
        }
      }
      return;
    }

    if (this.state === 'READY') {
      this.countdownTimer += dt;
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
        this.state = 'WAVE_CLEAR';
        this.stateTimer = 1.3;
        this.stats.wavesCleared++;
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

    // 極意境界 (Fever Rush)：15+ 連擊環繞蒼藍烈焰
    const isFever = this.stats.combo >= FEVER_COMBO_THRESHOLD;
    this.samurai.isFever = isFever;
    if (isFever && Math.random() < 0.6) {
      this.vfx.spawnFeverAura(this.samurai.x, this.samurai.y);
    }

    // 1. 檢測是否有新敵兵需要生成實體
    while (this.noteQueue.length > 0) {
      const nextNote = this.noteQueue[0];
      if (songTime >= nextNote.targetTime - nextNote.approachDuration) {
        this.enemies.push(new EnemyNinja(nextNote));
        this.noteQueue.shift();

        // 若是無法防禦突刺或躍空斬，蓋下血紅印章伴隨錚鳴！
        if (nextNote.type === 'PERILOUS_THRUST' || nextNote.type === 'BOSS_JUMP') {
          this.soundEngine.sfx?.playPerilousStampAlert();
          this.vfx.spawnPerilousStamp(CENTER_X, 150);
          this.camera.triggerShake(4, 0.2);
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

      // 檢查超時漏招
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

      // 移除已擊退敵兵
      if (enemy.isFinished()) {
        this.enemies.splice(i, 1);
      }
    }

    // 若所有敵兵都生成且清空，而敵架勢未滿 100，則結算進入下一波
    if (this.noteQueue.length === 0 && this.enemies.length === 0 && this.state === 'COMBAT') {
      this.state = 'WAVE_CLEAR';
      this.stateTimer = 1.3;
      this.stats.wavesCleared++;
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
      this.isBossWave
    );
  }
}
