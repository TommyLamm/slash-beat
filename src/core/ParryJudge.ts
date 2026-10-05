import { ParryRating, EnemyNote, ActionType } from '../types';
import {
  WINDOW_PERFECT,
  WINDOW_GOOD,
  WINDOW_MIKIRI,
  SPAM_COOLDOWN,
  PENALTY_DURATION,
} from './Constants';

export class ParryJudge {
  private lastActionTime: number = -1;
  private emptyActionCount: number = 0;
  private penaltyUntilTime: number = 0;

  public evaluateInput(
    action: ActionType,
    inputSongTime: number,
    activeEnemies: EnemyNote[]
  ): { rating: ParryRating; targetEnemy: EnemyNote | null; timeDiff: number } {
    // 檢查連點懲罰冷卻 (100ms)
    if (inputSongTime - this.lastActionTime < SPAM_COOLDOWN) {
      return { rating: 'MISS', targetEnemy: null, timeDiff: 999 };
    }
    this.lastActionTime = inputSongTime;

    // 尋找在當前時間窗口內最近的一名敵人
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

    // 若周圍無任何敵人（空按揮空，時差超過 0.22 秒）
    if (!closestEnemy || minTimeDiff > 0.22) {
      this.handleEmptyAction(inputSongTime);
      return { rating: 'MISS', targetEnemy: null, timeDiff: minTimeDiff };
    }

    const timeDiff = inputSongTime - closestEnemy.targetTime;
    const absDiff = Math.abs(timeDiff);

    // 懲罰狀態下判定窗收窄 50%
    const isPenalized = inputSongTime < this.penaltyUntilTime;
    const perfectWin = isPenalized ? WINDOW_PERFECT * 0.5 : WINDOW_PERFECT;

    // 1. 面對「危」字攻擊 (PERILOUS_THRUST)
    if (closestEnemy.type === 'PERILOUS_THRUST') {
      if (action === 'SLASH') {
        if (absDiff <= WINDOW_MIKIRI) {
          closestEnemy.handled = true;
          this.resetPenalty();
          return { rating: 'MIKIRI', targetEnemy: closestEnemy, timeDiff };
        }
      } else {
        // 擇錯：面對「危」字卻按格擋 [J] -> 強制被破防受創
        closestEnemy.handled = true;
        return { rating: 'WRONG_ACTION', targetEnemy: closestEnemy, timeDiff };
      }
    }

    // 2. 面對普通攻擊或三連斬 (NORMAL / FLURRY_TRIPLE)
    if (action === 'PARRY') {
      if (absDiff <= perfectWin) {
        closestEnemy.handled = true;
        this.resetPenalty();
        return { rating: 'PERFECT', targetEnemy: closestEnemy, timeDiff };
      } else if (absDiff <= WINDOW_GOOD) {
        closestEnemy.handled = true;
        this.resetPenalty();
        return { rating: 'GOOD', targetEnemy: closestEnemy, timeDiff };
      }
    } else {
      // 面對普通攻擊卻用了看破突刺 -> 揮刀失誤
      if (absDiff <= WINDOW_GOOD) {
        closestEnemy.handled = true;
        return { rating: 'WRONG_ACTION', targetEnemy: closestEnemy, timeDiff };
      }
    }

    // 時間差距過大，判定為 MISS
    if (absDiff <= 0.20) {
      closestEnemy.handled = true;
    }
    return { rating: 'MISS', targetEnemy: closestEnemy, timeDiff };
  }

  private handleEmptyAction(now: number): void {
    this.emptyActionCount++;
    if (this.emptyActionCount >= 2) {
      this.penaltyUntilTime = now + PENALTY_DURATION; // 觸發 400ms 判定窗縮窄懲罰
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
