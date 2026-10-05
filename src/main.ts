import { Game } from './core/Game';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from './core/Constants';

function initApp(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #game-canvas not found!');
    return;
  }

  // 設置邏輯內部繪製緩衝解析度
  canvas.width = VIRTUAL_WIDTH;
  canvas.height = VIRTUAL_HEIGHT;

  // 視口縮放自適應函數
  const resizeCanvas = (): void => {
    const container = document.getElementById('game-container');
    if (!container) return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const targetAspect = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    const winAspect = winW / winH;

    let displayW: number;
    let displayH: number;

    if (winAspect > targetAspect) {
      displayH = winH;
      displayW = winH * targetAspect;
    } else {
      displayW = winW;
      displayH = winW / targetAspect;
    }

    container.style.width = `${Math.floor(displayW)}px`;
    container.style.height = `${Math.floor(displayH)}px`;
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // 啟動遊戲
  new Game(canvas);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
