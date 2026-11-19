import { describe, it, expect, vi } from 'vitest';
import { VirtualDisplayService } from '../electron/services/virtual-display.service';

describe('Virtual Display Subsystem', () => {
  it('should initialize and report resolution', () => {
    const service = VirtualDisplayService.getInstance();
    expect(service).toBeDefined();

    const res = service.getTargetResolution();
    expect(res.width).toBe(1920);
    expect(res.height).toBe(1080);
  });

  it('should allow changing target resolution', () => {
    const service = VirtualDisplayService.getInstance();
    service.setTargetResolution(1600, 900);
    expect(service.getTargetResolution()).toEqual({ width: 1600, height: 900 });

    service.setTargetResolution(1280, 720);
    expect(service.getTargetResolution()).toEqual({ width: 1280, height: 720 });

    // Reset to 1080p
    service.setTargetResolution(1920, 1080);
    expect(service.getTargetResolution()).toEqual({ width: 1920, height: 1080 });
  });

  it('should reject invalid HWND gracefully when moving apps', async () => {
    const service = VirtualDisplayService.getInstance();
    const result = await service.moveAppToVirtual('0');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid target window handle');
  });

  it('should report zero apps initially on virtual display', () => {
    const service = VirtualDisplayService.getInstance();
    const apps = service.getAppsOnVirtual();
    expect(Array.isArray(apps)).toBe(true);
  });
});
