import { SlashBeatSaveSchema, GradeRank, BladeTrailStyle } from '../types';
import { STORAGE_KEY } from './Constants';

export class StorageManager {
  private static defaultData: SlashBeatSaveSchema = {
    version: 1,
    highScore: 0,
    highestCombo: 0,
    bestGrade: 'C',
    totalRuns: 0,
    calibrationOffsetMs: 0,
    isMuted: false,
    selectedBladeTrail: 'AZURE',
    endlessHighScore: 0,
    endlessMaxCombo: 0,
    endlessHighestKills: 0,
    touchSplitRatio: 0.5,
    touchInvert: false,
  };

  public static load(): SlashBeatSaveSchema {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) {
          return {
            ...this.defaultData,
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.warn('[Storage] Failed to read localStorage:', e);
    }
    return { ...this.defaultData };
  }

  public static save(data: Partial<SlashBeatSaveSchema>): void {
    try {
      const current = this.load();
      const updated: SlashBeatSaveSchema = {
        ...current,
        ...data,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[Storage] Failed to write localStorage:', e);
    }
  }

  public static recordWaveRun(score: number, combo: number, grade: GradeRank): void {
    const current = this.load();
    const gradeOrder: Record<GradeRank, number> = {
      SSS: 6,
      SS: 5,
      S: 4,
      A: 3,
      B: 2,
      C: 1,
    };

    const bestGrade = gradeOrder[grade] > gradeOrder[current.bestGrade] ? grade : current.bestGrade;

    this.save({
      highScore: Math.max(current.highScore, score),
      highestCombo: Math.max(current.highestCombo, combo),
      bestGrade,
      totalRuns: current.totalRuns + 1,
    });
  }

  public static recordEndlessRun(score: number, combo: number, kills: number): void {
    const current = this.load();
    this.save({
      endlessHighScore: Math.max(current.endlessHighScore, score),
      endlessMaxCombo: Math.max(current.endlessMaxCombo, combo),
      endlessHighestKills: Math.max(current.endlessHighestKills, kills),
      totalRuns: current.totalRuns + 1,
    });
  }
}
