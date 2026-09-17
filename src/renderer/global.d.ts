import type { KargonomiDesktopApi } from '../shared/ipc.ts';

declare global {
  interface Window {
    kargonomi: KargonomiDesktopApi;
  }
}

export {};
