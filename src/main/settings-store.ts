import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import appSettings from '../../appsettings.json' with { type: 'json' };
import type { DesktopSettings } from '../shared/ipc.ts';

export const defaultSettings: DesktopSettings = Object.freeze({
  baseUrl: appSettings.Kargonomi.BaseUrl,
  timeoutMs: 30_000,
  theme: 'system',
  autoUpdate: true,
  language: 'tr-TR',
});

export class SettingsStore {
  constructor(private readonly path: string) {}

  async get(): Promise<DesktopSettings> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      return this.validate(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return defaultSettings;
      throw error;
    }
  }

  async update(value: DesktopSettings): Promise<DesktopSettings> {
    const validated = this.validate(value);
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${String(process.pid)}.tmp`;
    await writeFile(temporary, JSON.stringify(validated, undefined, 2), { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.path);
    return validated;
  }

  private validate(value: unknown): DesktopSettings {
    if (typeof value !== 'object' || value === null) throw new Error('Ayar dosyası geçersiz.');
    const candidate = value as Partial<DesktopSettings>;
    if (typeof candidate.baseUrl !== 'string' || !candidate.baseUrl.startsWith('https://')) {
      throw new Error('API adresi HTTPS kullanmalıdır.');
    }
    const timeoutMs = candidate.timeoutMs;
    if (typeof timeoutMs !== 'number' || !Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
      throw new Error('Zaman aşımı 1–120 saniye arasında olmalıdır.');
    }
    const theme = candidate.theme;
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') throw new Error('Tema geçersiz.');
    // Files written before the update preference existed fall back to the
    // default; fields from older versions (such as density) are dropped.
    const autoUpdate: unknown = candidate.autoUpdate ?? defaultSettings.autoUpdate;
    if (typeof autoUpdate !== 'boolean') throw new Error('Güncelleme tercihi geçersiz.');
    if (candidate.language !== 'tr-TR') throw new Error('Ayarlar geçersiz.');
    return {
      baseUrl: candidate.baseUrl,
      timeoutMs,
      theme,
      autoUpdate,
      language: candidate.language,
    };
  }
}
