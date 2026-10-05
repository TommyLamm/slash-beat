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
  private onTouchRippleCallback: ((x: number, y: number, color: string) => void) | null = null;
  private clickRegions: ClickRegion[] = [];
  private canvas: HTMLCanvasElement;

  // 自定義觸控配置
  public splitRatio: number = 0.5; // 0.3 ~ 0.7
  public isInverted: boolean = false;
  public jumpZoneRatio: number = 0.35; // 上方 35% 區域為向上跳躍看破

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

  public setOnTouchRipple(cb: (x: number, y: number, color: string) => void): void {
    this.onTouchRippleCallback = cb;
  }

  public setTouchConfig(splitRatio: number, isInverted: boolean): void {
    this.splitRatio = Math.max(0.2, Math.min(0.8, splitRatio));
    this.isInverted = isInverted;
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
      // 1. 格擋鍵 (PARRY)：支援 [J] / [A] / [Z] / [←]
      if (code === 'KeyJ' || code === 'KeyA' || code === 'KeyZ' || code === 'ArrowLeft') {
        e.preventDefault();
        this.onActionCallback?.('PARRY');
      }
      // 2. 突刺看破 / 斬擊鍵 (SLASH)：支援 [K] / [D] / [X] / [→]
      else if (code === 'KeyK' || code === 'KeyD' || code === 'KeyX' || code === 'ArrowRight') {
        e.preventDefault();
        this.onActionCallback?.('SLASH');
      }
      // 3. 向上看破跳躍鍵 (JUMP)：支援 [W] / [I] / [ArrowUp] / [Space]
      else if (code === 'KeyW' || code === 'KeyI' || code === 'ArrowUp') {
        e.preventDefault();
        this.onActionCallback?.('JUMP');
      } else if (code === 'Space') {
        e.preventDefault();
        this.onConfirmCallback?.();
        // 戰鬥中 Space 亦可作為跳躍看破
        this.onActionCallback?.('JUMP');
      } else if (code === 'Enter') {
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

      // 未命中按鈕時，進行螢幕手勢與分區觸控判定：
      // 1. 螢幕上方 35% 區域為 JUMP（向上看破跳躍）
      let action: ActionType;
      let color: string;

      if (y < this.canvas.height * this.jumpZoneRatio) {
        action = 'JUMP';
        color = '#00f0ff';
      } else {
        const splitX = this.canvas.width * this.splitRatio;
        const isLeft = x < splitX;
        const triggerLeft = this.isInverted ? 'SLASH' : 'PARRY';
        const triggerRight = this.isInverted ? 'PARRY' : 'SLASH';

        action = isLeft ? triggerLeft : triggerRight;
        color = action === 'PARRY' ? '#ffd700' : '#ff0055';
      }

      this.onTouchRippleCallback?.(x, y, color);
      this.onActionCallback?.(action);
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

    this.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
  }
}
