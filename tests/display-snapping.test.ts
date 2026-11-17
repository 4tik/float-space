import { describe, it, expect } from 'vitest';
import { SnapPosition } from '../src/types/display';

describe('Display Bounds Clamping & Snapping Logic', () => {
  const displayWorkArea = { x: 0, y: 0, width: 1920, height: 1040 };

  function calculateSnap(snap: SnapPosition, workArea = displayWorkArea) {
    const { x, y, width, height } = workArea;
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

  function clampToBounds(bounds: { x: number; y: number; width: number; height: number }, work = displayWorkArea) {
    let width = Math.min(bounds.width, work.width);
    let height = Math.min(bounds.height, work.height);
    let x = Math.max(work.x, Math.min(bounds.x, work.x + work.width - width));
    let y = Math.max(work.y, Math.min(bounds.y, work.y + work.height - height));
    return { x, y, width, height };
  }

  it('should calculate left-half and right-half snapping precisely', () => {
    const left = calculateSnap('left-half');
    expect(left).toEqual({ x: 0, y: 0, width: 960, height: 1040 });

    const right = calculateSnap('right-half');
    expect(right).toEqual({ x: 960, y: 0, width: 960, height: 1040 });
  });

  it('should calculate 4 corners snapping accurately', () => {
    const topLeft = calculateSnap('top-left');
    expect(topLeft).toEqual({ x: 0, y: 0, width: 960, height: 520 });

    const bottomRight = calculateSnap('bottom-right');
    expect(bottomRight).toEqual({ x: 960, y: 520, width: 960, height: 520 });
  });

  it('should prevent accidental window placement outside display bounds', () => {
    // Window placed way off-screen to the right and bottom
    const offscreen = { x: 2500, y: 1500, width: 480, height: 320 };
    const clamped = clampToBounds(offscreen);

    expect(clamped.x).toBe(1920 - 480);
    expect(clamped.y).toBe(1040 - 320);
    expect(clamped.width).toBe(480);
    expect(clamped.height).toBe(320);
  });

  it('should clamp negative coordinates onto display', () => {
    const negative = { x: -300, y: -200, width: 480, height: 320 };
    const clamped = clampToBounds(negative);

    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });
});
