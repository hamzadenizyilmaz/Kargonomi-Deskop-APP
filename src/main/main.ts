import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BrowserWindow, Menu, app, nativeTheme, safeStorage, screen, shell } from 'electron';

import { events, type DesktopSettings } from '../shared/ipc.ts';

import { DiagnosticLog } from './diagnostics.ts';
import { registerIpcHandlers } from './ipc-handlers.ts';
import { isAllowedExternalUrl, secureWebPreferences } from './security.ts';
import { SettingsStore } from './settings-store.ts';
import { FileEncryptedStore, TokenVault } from './token-vault.ts';
import { UpdateService } from './updates.ts';

const directory = dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | undefined;

// Canvas colour of the chosen theme (background/canvas), so the window never
// flashes the other palette before the renderer paints.
function canvasColor(theme: DesktopSettings['theme']): string {
  const dark = theme === 'dark' || (theme === 'system' && nativeTheme.shouldUseDarkColors);
  return dark ? '#020617' : '#f8fafc';
}

// Figma screens are drawn on a 1440×900 page. The window opens with exactly
// that page area when the display allows it, otherwise with the largest one
// that fits the work area.
function fitDesignSize(window: BrowserWindow): void {
  const [outerWidth = 0, outerHeight = 0] = window.getSize();
  const [innerWidth = 0, innerHeight = 0] = window.getContentSize();
  const area = screen.getDisplayMatching(window.getBounds()).workAreaSize;
  window.setContentSize(
    Math.min(1440, area.width - (outerWidth - innerWidth)),
    Math.min(900, area.height - (outerHeight - innerHeight)),
  );
  window.center();
}

function createWindow(theme: DesktopSettings['theme']): void {
  const preload = join(directory, 'preload.cjs');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    // Smallest layout the design is verified at (Responsive Tests 1280×720).
    minWidth: 1280,
    minHeight: 720,
    show: false,
    backgroundColor: canvasColor(theme),
    title: 'Kargonomi Desktop Client',
    webPreferences: { ...secureWebPreferences(), preload },
  });
  fitDesignSize(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) {
      event.preventDefault();
      if (isAllowedExternalUrl(url)) void shell.openExternal(url);
    }
  });
  // Packaged builds never open DevTools or reload the renderer; development
  // keeps both on their usual keys although the menu bar is gone.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const command = input.control || input.meta;
    const key = input.key.toLowerCase();
    const devTools = input.key === 'F12' || (command && input.shift && key === 'i');
    const reload = command && key === 'r';
    if (!devTools && !reload) return;
    event.preventDefault();
    if (app.isPackaged) return;
    if (devTools) mainWindow?.webContents.toggleDevTools();
    else mainWindow?.webContents.reload();
  });

  const developmentUrl = process.env.VITE_DEV_SERVER_URL;
  if (!app.isPackaged && developmentUrl) void mainWindow.loadURL(developmentUrl);
  else void mainWindow.loadFile(join(directory, '../dist-renderer/index.html'));
}

void app.whenReady().then(() => {
  // The App Shell (3:194) has no in-window menu bar. macOS keeps a minimal
  // application menu so its standard edit shortcuts keep working.
  Menu.setApplicationMenu(process.platform === 'darwin'
    ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
    : null);
  const userData = app.getPath('userData');
  const vault = new TokenVault(new FileEncryptedStore(join(userData, 'secure', 'api-token.bin')), {
    available: () => safeStorage.isEncryptionAvailable(),
    encrypt: (plainText) => safeStorage.encryptString(plainText),
    decrypt: (cipherText) => safeStorage.decryptString(Buffer.from(cipherText)),
  });
  const settings = new SettingsStore(join(userData, 'settings.json'));
  const updates = new UpdateService((state) => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(events.updatesChanged, state);
  });
  registerIpcHandlers({ vault, settings, log: new DiagnosticLog(), updates });
  void settings.get().catch(() => undefined).then((stored) => {
    const theme = stored?.theme ?? 'system';
    createWindow(theme);
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(theme); });
    // "Otomatik güncelleme" checks once per launch and downloads in the background.
    const automatic = stored?.autoUpdate ?? true;
    updates.configure(automatic);
    if (updates.supported && automatic) void updates.check();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
