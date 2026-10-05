import { PlayroomFinishPayload } from '../types';

interface PlayroomInstance {
  ready(): Promise<{ available: boolean; mode: string }>;
  startRun(): Promise<{ runId: string } | null>;
  finishRun(args: { runId: string; score: number }): Promise<{ saved: boolean } | null>;
}

export class PlayroomSDKBridge {
  private static readonly GAME_ID = 'slash-beat';
  private static currentRunId: string | null = null;
  private static playroomModule: PlayroomInstance | null = null;
  private static isInitialized: boolean = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 動態引入專案內的 playroom-sdk.js
      const mod = await import('../../playroom-sdk.js');
      if (mod && mod.Playroom) {
        this.playroomModule = mod.Playroom;
        const res = await this.playroomModule!.ready();
        console.log('[PlayroomSDK] Ready status:', res);
      }
    } catch (e) {
      console.warn('[PlayroomSDK] SDK not available or running standalone:', e);
    }
  }

  public static async startRun(): Promise<string | null> {
    await this.init();
    this.currentRunId = null;

    try {
      if (this.playroomModule) {
        const run = await this.playroomModule.startRun();
        if (run && run.runId) {
          this.currentRunId = run.runId;
          console.log('[PlayroomSDK] Run started with ID:', this.currentRunId);
        }
      }
    } catch (e) {
      console.warn('[PlayroomSDK] Error starting run:', e);
    }

    // 容錯備援：向外層容器廣播 standard message
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          protocol: 'playroom',
          version: 1,
          type: 'PLAYROOM_START_RUN',
          gameId: this.GAME_ID,
          runId: this.currentRunId,
          timestamp: Date.now(),
        }, '*');
      }
    } catch {
      // 跨來源隔離容錯
    }

    return this.currentRunId;
  }

  public static async finishRun(payload: PlayroomFinishPayload): Promise<void> {
    try {
      if (this.playroomModule && this.currentRunId) {
        const res = await this.playroomModule.finishRun({
          runId: this.currentRunId,
          score: payload.score,
        });
        console.log('[PlayroomSDK] Run finished, result:', res);
      }
    } catch (e) {
      console.warn('[PlayroomSDK] Error finishing run:', e);
    }

    // 容錯備援 postMessage
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          protocol: 'playroom',
          version: 1,
          type: 'PLAYROOM_FINISH_RUN',
          gameId: this.GAME_ID,
          runId: this.currentRunId,
          score: payload.score,
          stats: payload.stats,
          timestamp: Date.now(),
        }, '*');
      }
    } catch {
      // 容錯
    }

    this.currentRunId = null;
  }
}
