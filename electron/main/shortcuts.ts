import { globalShortcut, BrowserWindow } from 'electron';
import { FloatingWindowManager } from './floating-window-manager';
import { LoggerService } from '../services/logger.service';

export class ShortcutManager {
  private static instance: ShortcutManager;
  private logger = LoggerService.getInstance();
  private windowManager = FloatingWindowManager.getInstance();

  public static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  public registerDefaults(mainWindow: BrowserWindow): void {
    try {
      globalShortcut.unregisterAll();

      // Toggle all floating windows: CommandOrControl+Shift+M
      globalShortcut.register('CommandOrControl+Shift+M', () => {
        this.logger.info('Shortcuts', 'Triggered Toggle All Monitors');
        const all = this.windowManager.getAllConfigs();
        const anyVisible = all.some(c => c.isActive && !c.isMinimized);
        if (anyVisible) {
          this.windowManager.hideAll();
        } else {
          this.windowManager.showAll();
        }
      });

      // Quick show main window / Mission control: CommandOrControl+Shift+Space
      globalShortcut.register('CommandOrControl+Shift+Space', () => {
        if (!mainWindow.isDestroyed()) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      });

      this.logger.info('Shortcuts', 'Global shortcuts registered successfully');
    } catch (err) {
      this.logger.error('Shortcuts', 'Failed to register global shortcuts', err);
    }
  }

  public unregisterAll(): void {
    globalShortcut.unregisterAll();
  }
}
