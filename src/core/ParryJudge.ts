import { ParryRating, EnemyNote, ActionType } from '../types';
import {
  WINDOW_PERFECT,
  WINDOW_GOOD,
  WINDOW_MIKIRI,
  WINDOW_JUMP,
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
    // 1. 優先尋找在當前時間窗口內最近的一名有效目標
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

    // 2. 若周圍無任何敵人（空按揮空，時差超過 0.22 秒）
    if (!closestEnemy || minTimeDiff > 0.22) {
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

    // 防按鍵物理抖動 (40ms 內同一次微抖不重複判定，適應 185+ BPM)
    if (inputSongTime - this.lastActionTime < SPAM_COOLDOWN) {
      return { rating: 'MISS', targetEnemy: null, timeDiff: 999 };
    }
    this.lastActionTime = inputSongTime;

    // 連續狂按時的隻狼式判定窗動態微幅收窄
    const isPenalized = inputSongTime < this.penaltyUntilTime;
    const perfectWin = isPenalized ? WINDOW_PERFECT * 0.7 : WINDOW_PERFECT;
    const goodWin = isPenalized ? WINDOW_GOOD * 0.82 : WINDOW_GOOD;
    const mikiriWin = isPenalized ? WINDOW_MIKIRI * 0.75 : WINDOW_MIKIRI;
    const jumpWin = isPenalized ? WINDOW_JUMP * 0.8 : WINDOW_JUMP;

    // 4. 下段掃堂腿橫掃 (SPEAR_SWEEP)：必須向上跳躍看破 (JUMP)
    if (closestEnemy.type === 'SPEAR_SWEEP') {
      if (action === 'JUMP') {
        if (absDiff <= jumpWin) {
          closestEnemy.handled = true;
          this.resetPenalty();
          return { rating: 'JUMP_COUNTER', targetEnemy: closestEnemy, timeDiff };
        }
      } else {
        // 擇錯：面對掃堂腿卻按了格擋或突刺 -> 雙腿被橫掃絆倒受創！
        if (absDiff <= goodWin) {
          closestEnemy.handled = true;
          return { rating: 'WRONG_ACTION', targetEnemy: closestEnemy, timeDiff };
        }
      }
    }
    // 5. 直線突刺 / 躍空猛擊 (PERILOUS_THRUST / SPEAR_THRUST / BOSS_JUMP)：必須踏刀看破 (SLASH)
    else if (
      closestEnemy.type === 'PERILOUS_THRUST' ||
      closestEnemy.type === 'SPEAR_THRUST' ||
      closestEnemy.type === 'BOSS_JUMP'
    ) {
      if (action === 'SLASH') {
        if (absDiff <= mikiriWin) {
          closestEnemy.handled = true;
          this.resetPenalty();
          return { rating: 'MIKIRI', targetEnemy: closestEnemy, timeDiff };
        }
      } else {
        // 擇錯：面對直刺卻按格擋或跳躍 -> 被直接刺穿破防！
        if (absDiff <= goodWin) {
          closestEnemy.handled = true;
          return { rating: 'WRONG_ACTION', targetEnemy: closestEnemy, timeDiff };
        }
      }
    }
    // 6. 普通攻擊、飛鏢手裏劍、連斬、延遲重刀：必須刀刃招架 (PARRY)
    else {
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
        // 擇錯：面對普通斬擊/飛鏢卻胡亂按了突刺或跳躍
        if (absDiff <= goodWin) {
          closestEnemy.handled = true;
          return { rating: 'WRONG_ACTION', targetEnemy: closestEnemy, timeDiff };
        }
      }
    }

    // 時間差距偏大（0.15s ~ 0.22s 間按得稍早或稍晚），標記已處理並判 MISS
    if (absDiff <= 0.22) {
      closestEnemy.handled = true;
    }
    return { rating: 'MISS', targetEnemy: closestEnemy, timeDiff };
  }

  private handleEmptyAction(now: number): void {
    this.emptyActionCount++;
    if (this.emptyActionCount >= 4) {
      this.penaltyUntilTime = now + PENALTY_DURATION; // 觸發 300ms 判定窗略微收窄
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
