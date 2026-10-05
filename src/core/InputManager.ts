import { ActionType } from '../types';

export interface ClickRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  callback: () => void;
}

export class InputManager {
  private onActionCallback: ((action: ActionType) => void) | null = null;
  private onConfirmCallback: (() => void) | null = null;
  private onCancelCallback: (() => void) | null = null;
  private clickRegions: ClickRegion[] = [];
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  public setOnAction(cb: (action: ActionType) => void): void {
    this.onActionCallback = cb;
  }

  public setOnConfirm(cb: () => void): void {
    this.onConfirmCallback = cb;
  }

  public setOnCancel(cb: () => void): void {
    this.onCancelCallback = cb;
  }

  public registerClickRegion(region: ClickRegion): void {
    this.clickRegions.push(region);
  }

  public clearClickRegions(): void {
    this.clickRegions = [];
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;

      const code = e.code;
      if (code === 'KeyJ' || code === 'KeyZ' || code === 'ArrowLeft') {
        e.preventDefault();
        this.onActionCallback?.('PARRY');
      } else if (code === 'KeyK' || code === 'KeyX' || code === 'ArrowRight') {
        e.preventDefault();
        this.onActionCallback?.('SLASH');
      } else if (code === 'Space' || code === 'Enter') {
        e.preventDefault();
        this.onConfirmCallback?.();
      } else if (code === 'Escape') {
        e.preventDefault();
        this.onCancelCallback?.();
      }
    });

    const handlePointerDown = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      // 檢查是否命中點擊區域（如按鈕）
      for (let i = this.clickRegions.length - 1; i >= 0; i--) {
        const r = this.clickRegions[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          r.callback();
          return;
        }
      }

      // 未命中按鈕時，進行螢幕左右雙分區觸控判定：
      // 左半邊 = PARRY, 右半邊 = SLASH
      if (x < this.canvas.width / 2) {
        this.onActionCallback?.('PARRY');
      } else {
        this.onActionCallback?.('SLASH');
      }
      this.onConfirmCallback?.();
    };

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        handlePointerDown(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      handlePointerDown(e.clientX, e.clientY);
    });

    // 防止右鍵選單
    this.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
  }
}
