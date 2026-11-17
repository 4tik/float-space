import { electronAPI } from '../../electron/preload/index';

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
