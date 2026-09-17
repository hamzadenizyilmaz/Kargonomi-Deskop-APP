import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { KargonomiClient, KargonomiError } from '@kargonomi/client';
import { BrowserWindow, app, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';

import { channels, networkFailureMessage, type BarcodeView, type ConnectionResult } from '../shared/ipc.ts';
import { DiagnosticLog } from './diagnostics.ts';
import { RequestTracer } from './request-trace.ts';
import { isAllowedExternalUrl } from './security.ts';
import type { SettingsStore } from './settings-store.ts';
import type { TokenVault } from './token-vault.ts';
import type { UpdateService } from './updates.ts';

interface Dependencies {
  readonly vault: TokenVault;
  readonly settings: SettingsStore;
  readonly log: DiagnosticLog;
  readonly updates: UpdateService;
}

// API operations as Tanılama names them ("ListShipments", 18:160) with their
// documented route templates; both go into the redacted diagnostic log.
const API_OPERATIONS: Readonly<Record<string, { readonly name: string; readonly method: string; readonly path: string }>> = {
  [channels.connectionTest]: { name: 'TestConnection', method: 'GET', path: '/user/credit' },
  [channels.credentialsReplace]: { name: 'TestConnection', method: 'GET', path: '/user/credit' },
  [channels.shipmentsList]: { name: 'ListShipments', method: 'GET', path: '/shipments' },
  [channels.shipmentsGet]: { name: 'GetShipment', method: 'GET', path: '/shipments/{id}' },
  [channels.shipmentsCreate]: { name: 'CreateShipment', method: 'POST', path: '/shipments' },
  [channels.shipmentsUpdate]: { name: 'UpdateShipment', method: 'PUT', path: '/shipments/{id}' },
  [channels.shipmentsPatch]: { name: 'PatchShipment', method: 'PATCH', path: '/shipments/{id}' },
  [channels.shipmentsDelete]: { name: 'DeleteShipment', method: 'DELETE', path: '/shipments/{id}' },
  [channels.shipmentsCancel]: { name: 'CancelShipment', method: 'POST', path: '/shipments/cancel' },
  [channels.pricingCompare]: { name: 'ComparePrices', method: 'GET', path: '/shipment-price-comparison/{id}' },
  [channels.pricingConfirm]: { name: 'ConfirmShippingPrice', method: 'POST', path: '/confirm-shipping-price' },
  [channels.creditGet]: { name: 'GetBalance', method: 'GET', path: '/user/credit' },
  [channels.warehousesList]: { name: 'ListWarehouses', method: 'GET', path: '/warehouses' },
  [channels.warehouseCreate]: { name: 'CreateWarehouse', method: 'POST', path: '/warehouses' },
  [channels.locationsStates]: { name: 'ListStates', method: 'GET', path: '/states/{countryId?}' },
  [channels.locationsCities]: { name: 'ListCities', method: 'GET', path: '/cities/{stateId}' },
  [channels.barcodeLoad]: { name: 'GetBarcode', method: 'GET', path: '/shipments/{id}/barcode' },
  [channels.barcodeSave]: { name: 'GetBarcode', method: 'GET', path: '/shipments/{id}/barcode' },
  [channels.barcodeOpen]: { name: 'GetBarcode', method: 'GET', path: '/shipments/{id}/barcode' },
  [channels.barcodePrint]: { name: 'GetBarcode', method: 'GET', path: '/shipments/{id}/barcode' },
  [channels.webhooksList]: { name: 'ListWebhooks', method: 'GET', path: '/webhooks' },
  [channels.webhooksGet]: { name: 'GetWebhook', method: 'GET', path: '/webhooks/{id}' },
  [channels.webhooksCreate]: { name: 'CreateWebhook', method: 'POST', path: '/webhooks' },
  [channels.webhooksUpdate]: { name: 'UpdateWebhook', method: 'PUT', path: '/webhooks/{id}' },
  [channels.webhooksDelete]: { name: 'DeleteWebhook', method: 'DELETE', path: '/webhooks/{id}' },
};

type Connect = (token?: string) => Promise<KargonomiClient>;

export function registerIpcHandlers({ vault, settings, log, updates }: Dependencies): void {
  const register = (channel: string, handler: (...arguments_: unknown[]) => unknown): void => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, (_event: IpcMainInvokeEvent, ...arguments_: unknown[]) => handler(...arguments_));
  };

  // API channels get a client whose requests are traced; one log entry is
  // written per operation with the final status of all its attempts.
  const api = (channel: string, handler: (connect: Connect, ...arguments_: unknown[]) => Promise<unknown>): void => {
    const operation = API_OPERATIONS[channel];
    if (operation === undefined) throw new Error(`Unknown API channel: ${channel}`);
    register(channel, async (...arguments_: unknown[]) => {
      const tracer = new RequestTracer();
      const started = performance.now();
      const connect: Connect = async (candidate) => {
        const token = candidate ?? await vault.readForMainProcess();
        if (token === undefined) throw new Error('API anahtarı yapılandırılmadı.');
        const configuration = await settings.get();
        return new KargonomiClient({ apiToken: token, baseUrl: configuration.baseUrl, timeoutMs: configuration.timeoutMs, fetch: tracer.fetch });
      };
      // A reply that arrived but could not be read is logged as a response
      // failure, so it never looks like a successful request.
      const record = (error?: unknown) => {
        let failure: string | null = tracer.attempts === 0 ? 'local' : tracer.failure;
        if (error !== undefined && failure === null && tracer.status !== null && tracer.status < 400) failure = 'response';
        log.add(operation.name, {
          method: tracer.method || operation.method,
          route: operation.path,
          endpoint: tracer.endpoint || null,
          status: tracer.status,
          durationMs: Math.round(performance.now() - started),
          retries: Math.max(0, tracer.attempts - 1),
          correlationId: tracer.correlationId,
          failure,
          problem: failure === 'response' && error instanceof TypeError ? error.message : undefined,
        });
      };
      try {
        const result = await handler(connect, ...arguments_);
        record();
        return result;
      } catch (error) {
        record(error);
        // Transport failures cross the bridge as one marker and nothing else
        // about the request (IPC only forwards the message); the log entry
        // above keeps the safe details.
        if (error instanceof KargonomiError && error.status === null) throw new Error(networkFailureMessage, { cause: error });
        throw error;
      }
    });
  };

  register(channels.credentialsStatus, () => vault.status());
  register(channels.credentialsStore, (token) => {
    if (typeof token !== 'string') throw new TypeError('API anahtarı metin olmalıdır.');
    return vault.store(token);
  });
  register(channels.credentialsClear, () => vault.clear());

  const testConnection = async (client: () => Promise<KargonomiClient>): Promise<ConnectionResult> => {
    try {
      await (await client()).account.credit();
      return { state: 'connected', message: 'Kargonomi bağlantısı kuruldu.' };
    } catch (error) {
      if (error instanceof KargonomiError && [401, 403].includes(error.status ?? 0)) return { state: 'unauthorized', message: 'API anahtarı geçersiz veya yetkisiz.' };
      if (error instanceof KargonomiError && error.message.toLowerCase().includes('timed out')) return { state: 'timeout', message: 'Kargonomi servisine zamanında ulaşılamadı.' };
      if (error instanceof KargonomiError && error.status === null) return { state: 'network-error', message: 'Kargonomi servisine ulaşılamadı.' };
      return { state: 'service-error', message: 'Kargonomi servisi isteği tamamlayamadı.' };
    }
  };

  api(channels.connectionTest, (connect) => testConnection(() => connect()));

  // "API Anahtarını Değiştir" (20:48): the new key is verified before it
  // replaces the stored one, so a rejected key never overwrites a working key.
  api(channels.credentialsReplace, async (connect, token): Promise<ConnectionResult> => {
    if (typeof token !== 'string' || token.trim() === '') throw new TypeError('API anahtarı metin olmalıdır.');
    const result = await testConnection(() => connect(token));
    if (result.state === 'connected') await vault.store(token);
    return result;
  });

  api(channels.shipmentsList, async (connect, page) => (await connect()).shipments.list(Number(page ?? 1)));
  api(channels.shipmentsGet, async (connect, id) => (await connect()).shipments.get(Number(id)));
  api(channels.shipmentsCreate, async (connect, input) => (await connect()).shipments.create(input as never));
  api(channels.shipmentsUpdate, async (connect, id, input) => (await connect()).shipments.update(Number(id), input as never));
  api(channels.shipmentsPatch, async (connect, id, input) => (await connect()).shipments.patch(Number(id), input as never));
  api(channels.shipmentsDelete, async (connect, id) => (await connect()).shipments.delete(Number(id)));
  api(channels.shipmentsCancel, async (connect, id) => (await connect()).shipments.cancel(Number(id)));
  api(channels.pricingCompare, async (connect, id) => (await connect()).pricing.compare(Number(id)));
  api(channels.pricingConfirm, async (connect, id, providerId) => (await connect()).pricing.confirm(Number(id), { id: Number(providerId) }));
  api(channels.creditGet, async (connect) => (await connect()).account.credit());
  api(channels.warehousesList, async (connect) => (await connect()).warehouses.list());
  api(channels.warehouseCreate, async (connect, input) => (await connect()).warehouses.create(input as never));
  api(channels.locationsStates, async (connect, countryId) => (await connect()).locations.states(countryId === undefined ? undefined : Number(countryId)));
  api(channels.locationsCities, async (connect, stateId) => (await connect()).locations.cities(Number(stateId)));
  api(channels.webhooksList, async (connect) => (await connect()).webhooks.list());
  api(channels.webhooksGet, async (connect, id) => (await connect()).webhooks.get(Number(id)));
  api(channels.webhooksCreate, async (connect, input) => (await connect()).webhooks.create(input as never));
  api(channels.webhooksUpdate, async (connect, id, input) => (await connect()).webhooks.update(Number(id), input as never));
  api(channels.webhooksDelete, async (connect, id) => (await connect()).webhooks.delete(Number(id)));

  const barcode = async (connect: Connect, id: unknown): Promise<{ view: BarcodeView; bytes: Uint8Array }> => {
    const document = await (await connect()).barcodes.pdf(Number(id));
    return { view: { rawBase64: document.rawBase64, bytesBase64: Buffer.from(document.bytes).toString('base64') }, bytes: document.bytes };
  };
  api(channels.barcodeLoad, async (connect, id) => (await barcode(connect, id)).view);
  api(channels.barcodeSave, async (connect, id, suggestedName) => {
    const safeName = `${basename(String(suggestedName), '.pdf').replaceAll(/[^\p{L}\p{N}._-]+/gu, '-') || `shipment-${String(id)}`}.pdf`;
    const choice = await dialog.showSaveDialog({ defaultPath: safeName, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (choice.canceled) return false;
    if (!choice.filePath.toLowerCase().endsWith('.pdf')) throw new Error('Dosya uzantısı .pdf olmalıdır.');
    await writeFile(choice.filePath, (await barcode(connect, id)).bytes, { flag: 'w' });
    return true;
  });
  const temporaryBarcode = async (connect: Connect, id: unknown): Promise<string> => {
    const directory = join(app.getPath('temp'), 'kargonomi-desktop');
    await mkdir(directory, { recursive: true });
    const path = join(directory, `barcode-${String(Number(id))}-${randomUUID()}.pdf`);
    await writeFile(path, (await barcode(connect, id)).bytes, { flag: 'wx' });
    return path;
  };
  api(channels.barcodeOpen, async (connect, id) => {
    const path = await temporaryBarcode(connect, id);
    const error = await shell.openPath(path);
    if (error) throw new Error('PDF harici uygulamada açılamadı.');
    const timer = setTimeout(() => void rm(path, { force: true }), 15 * 60 * 1_000);
    timer.unref();
  });
  api(channels.barcodePrint, async (connect, id) => {
    const path = await temporaryBarcode(connect, id);
    // The PDF only renders through Chromium's viewer plugin.
    const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, plugins: true } });
    try {
      await window.loadFile(path);
      await new Promise<void>((resolve, reject) => window.webContents.print({}, (success, reason) => success ? resolve() : reject(new Error(reason))));
    } finally {
      window.destroy();
      await rm(path, { force: true });
    }
  });

  register(channels.settingsGet, () => settings.get());
  register(channels.settingsUpdate, async (value) => {
    const saved = await settings.update(value as never);
    updates.configure(saved.autoUpdate);
    return saved;
  });
  register(channels.diagnosticsGet, () => ({ entries: log.snapshot(), generatedAt: new Date().toISOString() }));
  register(channels.appInfo, () => ({ version: app.getVersion(), electron: process.versions.electron, node: process.versions.node, platform: process.platform }));
  register(channels.updatesState, () => updates.state);
  register(channels.updatesCheck, () => updates.check());
  register(channels.updatesDownload, () => updates.download());
  register(channels.updatesCancel, () => { updates.cancel(); });
  register(channels.updatesInstall, () => { updates.install(); });
  register(channels.externalOpen, async (url) => {
    const value = String(url);
    if (!isAllowedExternalUrl(value)) throw new Error('Bu bağlantı protokolüne izin verilmiyor.');
    await shell.openExternal(value);
  });
}
