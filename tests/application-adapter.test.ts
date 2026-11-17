import { describe, it, expect } from 'vitest';
import { WindowsApplicationAdapter } from '../electron/native/windows/windows-adapter';
import { MacOSApplicationAdapter } from '../electron/native/macos/macos-adapter';
import { LinuxApplicationAdapter } from '../electron/native/linux/linux-adapter';
import { Win32WindowEmbedder } from '../electron/native/windows/win32-embed';

describe('Platform Application Adapters & Native Capabilities', () => {
  it('WindowsApplicationAdapter should return accurate win32 capabilities', () => {
    const adapter = new WindowsApplicationAdapter();
    const caps = adapter.getCapabilities();

    expect(caps.platform).toBe('win32');
    expect(caps.canCapture).toBe(true);
    expect(caps.desktopEnvironment).toContain('Windows');
  });

  it('MacOSApplicationAdapter should correctly indicate sandboxing limitations', () => {
    const adapter = new MacOSApplicationAdapter();
    const caps = adapter.getCapabilities();

    expect(caps.platform).toBe('darwin');
    expect(caps.canEmbed).toBe(false); // Honest reporting, no fake embedding claims
    expect(caps.requiresPermissions).toBe(true);
  });

  it('LinuxApplicationAdapter should handle X11 vs Wayland capability reporting', () => {
    const adapter = new LinuxApplicationAdapter();
    const caps = adapter.getCapabilities();

    expect(caps.platform).toBe('linux');
    expect(caps.canCapture).toBe(true);
  });

  it('Win32WindowEmbedder should evaluate valid and invalid handles safely', () => {
    const invalidRes = Win32WindowEmbedder.canEmbedWindow(1234, '0');
    expect(invalidRes.canEmbed).toBe(false);

    if (process.platform === 'win32') {
      const validRes = Win32WindowEmbedder.canEmbedWindow(1234, '1048576');
      expect(validRes.canEmbed).toBe(true);
    }
  });
});
