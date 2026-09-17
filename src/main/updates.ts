// Settings → Güncellemeler (Figma 17:644, 17:799, 17:956 and 17:1107):
// checking, Update Available, Downloading and Restart Required follow
// electron-updater's lifecycle. electron-updater verifies every download
// against the SHA-512 published in the update manifest before installing it.

import { app } from 'electron';
import electronUpdater, { type CancellationToken as Token, type ProgressInfo, type UpdateInfo } from 'electron-updater';

import type { UpdateState } from '../shared/ipc.ts';

type Listener = (state: UpdateState) => void;

export class UpdateService {
  #state: UpdateState;
  #token: Token | undefined;
  #bound = false;
  #automatic = false;

  constructor(private readonly notify: Listener) {
    this.#state = { phase: 'idle', currentVersion: app.getVersion(), nextVersion: null, releaseNotes: null, percent: null };
  }

  get state(): UpdateState {
    return this.#state;
  }

  // Only an installed build carries the publish configuration
  // (app-update.yml); development runs report the check as unsupported.
  get supported(): boolean {
    return app.isPackaged;
  }

  configure(automatic: boolean): void {
    this.#automatic = automatic;
    if (!this.supported) return;
    const updater = this.#updater();
    // Every download starts from download(), so "İndirmeyi İptal Et" always
    // holds its cancellation token; "Otomatik güncelleme" starts it at once.
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = automatic;
  }

  async check(): Promise<UpdateState> {
    if (!this.supported) {
      this.#set({ phase: 'unsupported' });
      return this.#state;
    }
    if (this.#state.phase === 'downloading' || this.#state.phase === 'downloaded') return this.#state;
    this.#set({ phase: 'checking', percent: null });
    try {
      await this.#updater().checkForUpdates();
    } catch {
      this.#set({ phase: 'error' });
    }
    return this.#state;
  }

  async download(): Promise<void> {
    if (!this.supported || this.#state.phase !== 'available') return;
    const token = new electronUpdater.CancellationToken();
    this.#token = token;
    this.#set({ phase: 'downloading', percent: 0 });
    try {
      await this.#updater().downloadUpdate(token);
    } catch {
      // A cancelled download returns to Update Available; anything else is an error.
      this.#set(token.cancelled ? { phase: 'available', percent: null } : { phase: 'error', percent: null });
    } finally {
      if (this.#token === token) this.#token = undefined;
    }
  }

  cancel(): void {
    this.#token?.cancel();
  }

  install(): void {
    if (this.#state.phase !== 'downloaded') return;
    this.#updater().quitAndInstall();
  }

  #updater() {
    const updater = electronUpdater.autoUpdater;
    if (!this.#bound) {
      this.#bound = true;
      updater.logger = null;
      updater.on('checking-for-update', () => this.#set({ phase: 'checking' }));
      updater.on('update-available', (info: UpdateInfo) => {
        this.#set({ phase: 'available', nextVersion: info.version, releaseNotes: plainNotes(info.releaseNotes) });
        if (this.#automatic) void this.download();
      });
      updater.on('update-not-available', () => this.#set({ phase: 'up-to-date', nextVersion: null, releaseNotes: null }));
      updater.on('download-progress', (progress: ProgressInfo) => this.#set({ phase: 'downloading', percent: progress.percent }));
      updater.on('update-downloaded', (info: UpdateInfo) => this.#set({ phase: 'downloaded', nextVersion: info.version, percent: 100 }));
      updater.on('update-cancelled', () => this.#set({ phase: 'available', percent: null }));
      updater.on('error', () => { if (this.#token?.cancelled !== true) this.#set({ phase: 'error', percent: null }); });
    }
    return updater;
  }

  #set(change: Partial<UpdateState>): void {
    this.#state = { ...this.#state, ...change };
    this.notify(this.#state);
  }
}

// Release notes may arrive as HTML (GitHub provider) or as a list; the
// renderer only ever receives plain text.
function plainNotes(notes: UpdateInfo['releaseNotes']): string | null {
  if (notes === undefined || notes === null) return null;
  const text = typeof notes === 'string' ? notes : notes.map((entry) => entry.note ?? '').join('\n');
  const plain = text
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll(/&(nbsp|amp|lt|gt|quot|#39);/gu, (_, entity: string) => entities[entity] ?? ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();
  return plain === '' ? null : plain.slice(0, 600);
}

const entities: Readonly<Record<string, string>> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': '\'' };
