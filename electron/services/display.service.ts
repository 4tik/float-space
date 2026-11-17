import { screen } from 'electron';
import { PhysicalDisplay, SnapPosition } from '../../src/types/display';
import { LoggerService } from './logger.service';

export class DisplayService {
  private static instance: DisplayService;
  private logger = LoggerService.getInstance();

  private constructor() {}

  public static getInstance(): DisplayService {
    if (!DisplayService.instance) {
      DisplayService.instance = new DisplayService();
    }
    return DisplayService.instance;
  }

  public getAllDisplays(): PhysicalDisplay[] {
    try {
      const displays = screen.getAllDisplays();
      const primary = screen.getPrimaryDisplay();

      return displays.map((d, index) => ({
        id: d.id,
        label: `Display ${index + 1} (${d.size.width}x${d.size.height})`,
        bounds: d.bounds,
        workArea: d.workArea,
        scaleFactor: d.scaleFactor,
        isPrimary: d.id === primary.id,
        rotation: d.rotation,
      }));
    } catch (err) {
      this.logger.error('DisplayService', 'Failed to get displays', err);
      return [];
    }
  }

  public getDisplayById(displayId?: number): Electron.Display {
    const displays = screen.getAllDisplays();
    if (displayId !== undefined) {
      const match = displays.find(d => d.id === displayId);
      if (match) return match;
    }
    return screen.getPrimaryDisplay();
  }

  public clampToBounds(bounds: { x: number; y: number; width: number; height: number }, displayId?: number): { x: number; y: number; width: number; height: number } {
    const display = this.getDisplayById(displayId);
    const work = display.workArea;

    let width = Math.min(bounds.width, work.width);
    let height = Math.min(bounds.height, work.height);
    let x = Math.max(work.x, Math.min(bounds.x, work.x + work.width - width));
    let y = Math.max(work.y, Math.min(bounds.y, work.y + work.height - height));

    return { x, y, width, height };
  }

  public calculateSnapBounds(
    snap: SnapPosition,
    displayId?: number
  ): { x: number; y: number; width: number; height: number } {
    const display = this.getDisplayById(displayId);
    const { x, y, width, height } = display.workArea;
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    switch (snap) {
      case 'left-half':
        return { x, y, width: halfW, height };
      case 'right-half':
        return { x: x + halfW, y, width: width - halfW, height };
      case 'top-half':
        return { x, y, width, height: halfH };
      case 'bottom-half':
        return { x, y: y + halfH, width, height: height - halfH };
      case 'top-left':
        return { x, y, width: halfW, height: halfH };
      case 'top-right':
        return { x: x + halfW, y, width: width - halfW, height: halfH };
      case 'bottom-left':
        return { x, y: y + halfH, width: halfW, height: height - halfH };
      case 'bottom-right':
        return { x: x + halfW, y: y + halfH, width: width - halfW, height: height - halfH };
      case 'center': {
        const cw = Math.min(640, width);
        const ch = Math.min(480, height);
        return {
          x: x + Math.floor((width - cw) / 2),
          y: y + Math.floor((height - ch) / 2),
          width: cw,
          height: ch,
        };
      }
      case 'maximize':
        return { x, y, width, height };
      default:
        return { x: x + 100, y: y + 100, width: 480, height: 320 };
    }
  }

  public autoArrangeGrid(
    count: number,
    displayId?: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    if (count <= 0) return [];
    const display = this.getDisplayById(displayId);
    const { x, y, width, height } = display.workArea;

    let cols = 1;
    let rows = 1;

    if (count === 2) {
      cols = 2;
      rows = 1;
    } else if (count <= 4) {
      cols = 2;
      rows = 2;
    } else if (count <= 6) {
      cols = 3;
      rows = 2;
    } else {
      cols = Math.ceil(Math.sqrt(count));
      rows = Math.ceil(count / cols);
    }

    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);
    const padding = 12;

    const result: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      result.push({
        x: x + col * cellW + padding,
        y: y + row * cellH + padding,
        width: cellW - padding * 2,
        height: cellH - padding * 2,
      });
    }

    return result;
  }
}
