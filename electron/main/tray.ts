import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import * as path from 'path';
import { FloatingWindowManager } from './floating-window-manager';
import { getAppIcon } from './index';

let tray: Tray | null = null;

export function createSystemTray(mainWindow: BrowserWindow): Tray {
  if (tray) return tray;

  let icon = getAppIcon();
  if (icon && typeof icon.resize === 'function') {
    icon = icon.resize({ width: 16, height: 16 });
  } else {
    icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAY0lEQVQ4T2NkoBAwUqifYdQAHg3/h4ZBMg1gYmBg+M+IR/1/qP5/DIORBTAGYmgGghj/UQbAAEYGhkfEGPg/0gEYGhoYGIg2gImBgfE/mgGUBtAYGBr+f0Qa8J8YA/7//88AAGw2KRM33b6MAAAAAElFTkSuQmCC',
        'base64'
      )
    );
  }

  tray = new Tray(icon);
  tray.setToolTip('Float-Space - Native Desktop Workspace & Floating Window Manager');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Float-Space',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Create Floating Monitor',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Show All Monitors',
      click: () => FloatingWindowManager.getInstance().showAll(),
    },
    {
      label: 'Hide All Monitors',
      click: () => FloatingWindowManager.getInstance().hideAll(),
    },
    { type: 'separator' },
    {
      label: 'Quit Float-Space',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}
