import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import { channels, events, type KargonomiDesktopApi, type UpdateState } from '../shared/ipc.ts';

const invoke = <T>(channel: string, ...arguments_: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...arguments_) as Promise<T>;

const api: KargonomiDesktopApi = {
  credentials: {
    status: () => invoke(channels.credentialsStatus),
    store: (token) => invoke(channels.credentialsStore, token),
    clear: () => invoke(channels.credentialsClear),
    replace: (token) => invoke(channels.credentialsReplace, token),
  },
  connection: { test: () => invoke(channels.connectionTest) },
  shipments: {
    list: (page) => invoke(channels.shipmentsList, page),
    get: (id) => invoke(channels.shipmentsGet, id),
    create: (input) => invoke(channels.shipmentsCreate, input),
    update: (id, input) => invoke(channels.shipmentsUpdate, id, input),
    patch: (id, input) => invoke(channels.shipmentsPatch, id, input),
    delete: (id) => invoke(channels.shipmentsDelete, id),
    cancel: (id) => invoke(channels.shipmentsCancel, id),
  },
  pricing: {
    compare: (id) => invoke(channels.pricingCompare, id),
    confirm: (id, providerId) => invoke(channels.pricingConfirm, id, providerId),
  },
  account: { credit: () => invoke(channels.creditGet) },
  warehouses: {
    list: () => invoke(channels.warehousesList),
    create: (input) => invoke(channels.warehouseCreate, input),
  },
  locations: {
    states: (countryId) => invoke(channels.locationsStates, countryId),
    cities: (stateId) => invoke(channels.locationsCities, stateId),
  },
  barcodes: {
    load: (id) => invoke(channels.barcodeLoad, id),
    save: (id, name) => invoke(channels.barcodeSave, id, name),
    print: (id) => invoke(channels.barcodePrint, id),
    open: (id) => invoke(channels.barcodeOpen, id),
  },
  webhooks: {
    list: () => invoke(channels.webhooksList),
    get: (id) => invoke(channels.webhooksGet, id),
    create: (input) => invoke(channels.webhooksCreate, input),
    update: (id, input) => invoke(channels.webhooksUpdate, id, input),
    delete: (id) => invoke(channels.webhooksDelete, id),
  },
  settings: {
    get: () => invoke(channels.settingsGet),
    update: (settings) => invoke(channels.settingsUpdate, settings),
  },
  diagnostics: { get: () => invoke(channels.diagnosticsGet) },
  app: {
    info: () => invoke(channels.appInfo),
    openExternal: (url) => invoke(channels.externalOpen, url),
  },
  updates: {
    state: () => invoke(channels.updatesState),
    check: () => invoke(channels.updatesCheck),
    download: () => invoke(channels.updatesDownload),
    cancel: () => invoke(channels.updatesCancel),
    install: () => invoke(channels.updatesInstall),
    // Only the state payload crosses the bridge; the IPC event never does.
    onChange: (listener) => {
      const handler = (_event: IpcRendererEvent, state: UpdateState) => listener(state);
      ipcRenderer.on(events.updatesChanged, handler);
      return () => { ipcRenderer.removeListener(events.updatesChanged, handler); };
    },
  },
};

contextBridge.exposeInMainWorld('kargonomi', Object.freeze(api));
