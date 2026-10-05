import { ParryRating, EnemyNote, ActionType } from '../types';
import {
  WINDOW_PERFECT,
  WINDOW_GOOD,
  WINDOW_MIKIRI,
  EMPTY_ACTION_COOLDOWN,
  SPAM_COOLDOWN,
  PENALTY_DURATION,
} from './Constants';

export class ParryJudge {
  private lastActionTime: number = -1;
  private lastEmptyActionTime: number = -1;
  private emptyActionCount: number = 0;
  private penaltyUntilTime: number = 0;

  public evaluateInput(
    action: ActionType,
    inputSongTime: number,
    activeEnemies: EnemyNote[]
  ): { rating: ParryRating; targetEnemy: EnemyNote | null; timeDiff: number } {
    // 1. 優先尋找在當前時間窗口內最近的一名有效敵人
    let closestEnemy: EnemyNote | null = null;
    let minTimeDiff = Infinity;

    for (const enemy of activeEnemies) {
      if (enemy.handled || enemy.isDead) continue;
      const diff = Math.abs(enemy.targetTime - inputSongTime);
      if (diff < minTimeDiff) {
        minTimeDiff = diff;
        closestEnemy = enemy;
      }
    }

    // 2. 若周圍無任何敵人（空按揮空，時差超過 0.20 秒）
    if (!closestEnemy || minTimeDiff > 0.20) {
      // 避免超高速物理抖鍵重複計算空按
      if (inputSongTime - this.lastEmptyActionTime < EMPTY_ACTION_COOLDOWN) {
        return { rating: 'MISS', targetEnemy: null, timeDiff: minTimeDiff };
      }
      this.lastEmptyActionTime = inputSongTime;
      this.handleEmptyAction(inputSongTime);
      return { rating: 'MISS', targetEnemy: null, timeDiff: minTimeDiff };
    }

    // 3. 有敵兵即將命中（命中窗口內）：嚴禁暴力報 MISS 吞鍵！
    const timeDiff = inputSongTime - closestEnemy.targetTime;
    const absDiff = Math.abs(timeDiff);

    // 防按鍵物理抖動 (50ms 內同一次微抖不重複判定)
    if (inputSongTime - this.lastActionTime < SPAM_COOLDOWN) {
      return { rating: 'MISS', targetEnemy: null, timeDiff: 999 };
    }
    this.lastActionTime = inputSongTime;

    // 連續狂按時的隻狼式判定窗動態微幅收窄（而非直接吞刀）
    const isPenalized = inputSongTime < this.penaltyUntilTime;
    const perfectWin = isPenalized ? WINDOW_PERFECT * 0.65 : WINDOW_PERFECT;
    const goodWin = isPenalized ? WINDOW_GOOD * 0.8 : WINDOW_GOOD;

    const isPerilous = closestEnemy.type === 'PERILOUS_THRUST' || closestEnemy.type === 'BOSS_JUMP';

    // 4. 面對「危」字攻擊或躍空斬 (PERILOUS_THRUST / BOSS_JUMP)
    if (isPerilous) {
      if (action === 'SLASH') {
        if (absDiff <= WINDOW_MIKIRI) {
          closestEnemy.handled = true;
          this.resetPenalty();
          return { rating: 'MIKIRI', targetEnemy: closestEnemy, timeDiff };
        }
      } else {
        // 擇錯：面對「危」字卻按格擋 [J] -> 強制被破防受創
        if (absDiff <= goodWin) {
          closestEnemy.handled = true;
          return { rating: 'WRONG_ACTION', targetEnemy: closestEnemy, timeDiff };
        }
      }
    } else {
      // 5. 面對普通攻擊、三連斬、五連斬、延遲重刀
      if (action === 'PARRY') {
        if (absDiff <= perfectWin) {
          closestEnemy.handled = true;
          this.resetPenalty();
          return { rating: 'PERFECT', targetEnemy: closestEnemy, timeDiff };
        } else if (absDiff <= goodWin) {
          closestEnemy.handled = true;
          this.resetPenalty();
          return { rating: 'GOOD', targetEnemy: closestEnemy, timeDiff };
        }
      } else {
        // 面對普通攻擊卻用了看破突刺 [K] -> 揮刀擇錯受創
        if (absDiff <= goodWin) {
          closestEnemy.handled = true;
          return { rating: 'WRONG_ACTION', targetEnemy: closestEnemy, timeDiff };
        }
      }
    }

    // 時間差距偏大（0.15s ~ 0.20s 間按得稍早或稍晚），標記已處理並判 MISS
    if (absDiff <= 0.20) {
      closestEnemy.handled = true;
    }
    return { rating: 'MISS', targetEnemy: closestEnemy, timeDiff };
  }

  private handleEmptyAction(now: number): void {
    this.emptyActionCount++;
    if (this.emptyActionCount >= 3) {
      this.penaltyUntilTime = now + PENALTY_DURATION; // 觸發 350ms 判定窗略微收窄
      this.emptyActionCount = 0;
    }
  }

  public resetPenalty(): void {
    this.emptyActionCount = 0;
    this.penaltyUntilTime = 0;
  }

  public isPenaltyActive(now: number): boolean {
    return now < this.penaltyUntilTime;
  }
}
