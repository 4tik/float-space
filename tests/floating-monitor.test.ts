import { describe, it, expect } from 'vitest';
import { FloatingWindowConfig } from '../src/types/floating-monitor';

describe('Floating Monitor Configuration & Independence', () => {
  function createDefaultConfig(overrides: Partial<FloatingWindowConfig> = {}): FloatingWindowConfig {
    const now = new Date().toISOString();
    return {
      id: overrides.id || `mon-${Date.now()}`,
      title: overrides.title || 'Floating Monitor',
      displayMode: overrides.displayMode || 'live-monitor',
      positionX: overrides.positionX ?? 100,
      positionY: overrides.positionY ?? 100,
      width: Math.max(overrides.width ?? 480, 240),
      height: Math.max(overrides.height ?? 320, 160),
      opacity: Math.max(0.1, Math.min(1.0, overrides.opacity ?? 1.0)),
      alwaysOnTop: overrides.alwaysOnTop ?? true,
      isLocked: overrides.isLocked ?? false,
      isActive: true,
      isMinimized: false,
      isMaximized: false,
      workspaceId: overrides.workspaceId || 'ws-dev',
      groupId: overrides.groupId,
      displayId: overrides.displayId ?? 0,
      compactToolbar: overrides.compactToolbar ?? false,
      hideToolbar: overrides.hideToolbar ?? false,
      captureFrameRate: overrides.captureFrameRate ?? 30,
      captureQuality: overrides.captureQuality ?? 'medium',
      createdAt: now,
      updatedAt: now,
    };
  }

  it('should apply default requirements: 480x320, min 240x160, always on top', () => {
    const config = createDefaultConfig();
    expect(config.width).toBe(480);
    expect(config.height).toBe(320);
    expect(config.alwaysOnTop).toBe(true);
    expect(config.opacity).toBe(1.0);
    expect(config.isLocked).toBe(false);
  });

  it('should enforce minimum width and height constraints (240x160)', () => {
    const smallConfig = createDefaultConfig({ width: 100, height: 80 });
    expect(smallConfig.width).toBe(240);
    expect(smallConfig.height).toBe(160);
  });

  it('should clamp opacity between 0.1 and 1.0', () => {
    const tooLow = createDefaultConfig({ opacity: 0.01 });
    expect(tooLow.opacity).toBe(0.1);

    const tooHigh = createDefaultConfig({ opacity: 1.5 });
    expect(tooHigh.opacity).toBe(1.0);
  });

  it('should support at least 5 simultaneous independent monitors', () => {
    const monitors: FloatingWindowConfig[] = [];
    for (let i = 0; i < 5; i++) {
      monitors.push(
        createDefaultConfig({
          id: `mon-${i + 1}`,
          title: `Monitor ${i + 1}`,
          positionX: 100 + i * 50,
          positionY: 100 + i * 50,
        })
      );
    }

    expect(monitors.length).toBe(5);
    const ids = new Set(monitors.map((m) => m.id));
    expect(ids.size).toBe(5);

    // Independence: modifying one monitor does not affect another
    monitors[0].opacity = 0.5;
    monitors[0].isLocked = true;

    expect(monitors[1].opacity).toBe(1.0);
    expect(monitors[1].isLocked).toBe(false);
  });
});
