import type {
  AccountCredit,
  BarcodeDocument,
  Location,
  PriceComparison,
  Shipment,
  ShipmentPage,
  ShipmentPatchInput,
  ShipmentWriteInput,
  Warehouse,
  WarehouseCreateInput,
  WarehouseRecord,
  Webhook,
  WebhookWriteInput,
} from '@kargonomi/client';

export const channels = {
  credentialsStatus: 'credentials:status',
  credentialsStore: 'credentials:store',
  credentialsClear: 'credentials:clear',
  credentialsReplace: 'credentials:replace',
  connectionTest: 'connection:test',
  shipmentsList: 'shipments:list',
  shipmentsGet: 'shipments:get',
  shipmentsCreate: 'shipments:create',
  shipmentsUpdate: 'shipments:update',
  shipmentsPatch: 'shipments:patch',
  shipmentsDelete: 'shipments:delete',
  shipmentsCancel: 'shipments:cancel',
  pricingCompare: 'pricing:compare',
  pricingConfirm: 'pricing:confirm',
  creditGet: 'credit:get',
  warehousesList: 'warehouses:list',
  warehouseCreate: 'warehouse:create',
  locationsStates: 'locations:states',
  locationsCities: 'locations:cities',
  barcodeLoad: 'barcode:load',
  barcodeSave: 'barcode:save',
  barcodePrint: 'barcode:print',
  barcodeOpen: 'barcode:open',
  webhooksList: 'webhooks:list',
  webhooksGet: 'webhooks:get',
  webhooksCreate: 'webhooks:create',
  webhooksUpdate: 'webhooks:update',
  webhooksDelete: 'webhooks:delete',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  diagnosticsGet: 'diagnostics:get',
  appInfo: 'app:info',
  externalOpen: 'external:open',
  updatesState: 'updates:state',
  updatesCheck: 'updates:check',
  updatesDownload: 'updates:download',
  updatesCancel: 'updates:cancel',
  updatesInstall: 'updates:install',
} as const;

// An API call that never reached Kargonomi (network down, DNS, timeout) is
// rejected with exactly this message, so the renderer can show
// "Bağlantı kurulamadı" (Dialog / Connection Failed, 20:99).
export const networkFailureMessage = 'KARGONOMI_NETWORK_FAILURE';

// Main → renderer notifications; these are never invoked from the renderer.
export const events = {
  updatesChanged: 'updates:changed',
} as const;

export const EXPLICIT_CHANNELS = Object.freeze(Object.values(channels));

export interface CredentialStatus {
  readonly configured: boolean;
  readonly secureStorageAvailable: boolean;
}

export type ConnectionState = 'connected' | 'unauthorized' | 'network-error' | 'timeout' | 'service-error';

export interface ConnectionResult {
  readonly state: ConnectionState;
  readonly message: string;
}

export interface DesktopSettings {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly theme: 'light' | 'dark' | 'system';
  // Güncellemeler → Otomatik güncelleme (17:793).
  readonly autoUpdate: boolean;
  readonly language: 'tr-TR';
}

export type UpdatePhase = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error' | 'unsupported';

export interface UpdateState {
  readonly phase: UpdatePhase;
  readonly currentVersion: string;
  readonly nextVersion: string | null;
  readonly releaseNotes: string | null;
  readonly percent: number | null;
}

export interface Diagnostics {
  readonly entries: readonly string[];
  readonly generatedAt: string;
}

export interface AppInfo {
  readonly version: string;
  readonly electron: string;
  readonly node: string;
  readonly platform: string;
}

export interface BarcodeView extends Omit<BarcodeDocument, 'bytes'> {
  readonly bytesBase64: string;
}

export interface KargonomiDesktopApi {
  readonly credentials: {
    status(): Promise<CredentialStatus>;
    store(token: string): Promise<CredentialStatus>;
    clear(): Promise<CredentialStatus>;
    // Tests the candidate first and stores it only when the connection succeeds.
    replace(token: string): Promise<ConnectionResult>;
  };
  readonly connection: { test(): Promise<ConnectionResult> };
  readonly shipments: {
    list(page?: number): Promise<ShipmentPage>;
    get(id: number): Promise<Shipment>;
    create(input: ShipmentWriteInput): Promise<Shipment>;
    update(id: number, input: ShipmentWriteInput): Promise<Shipment>;
    patch(id: number, input: ShipmentPatchInput): Promise<Shipment>;
    delete(id: number): Promise<void>;
    cancel(id: number): Promise<unknown>;
  };
  readonly pricing: {
    compare(id: number): Promise<PriceComparison>;
    confirm(id: number, providerId: number): Promise<PriceComparison>;
  };
  readonly account: { credit(): Promise<AccountCredit> };
  readonly warehouses: {
    list(): Promise<readonly WarehouseRecord[]>;
    create(input: WarehouseCreateInput): Promise<Warehouse>;
  };
  readonly locations: {
    states(countryId?: number): Promise<readonly Location[]>;
    cities(stateId: number): Promise<readonly Location[]>;
  };
  readonly barcodes: {
    load(id: number): Promise<BarcodeView>;
    save(id: number, suggestedName: string): Promise<boolean>;
    print(id: number): Promise<void>;
    open(id: number): Promise<void>;
  };
  readonly webhooks: {
    list(): Promise<readonly Webhook[]>;
    get(id: number): Promise<Webhook>;
    create(input: WebhookWriteInput): Promise<Webhook>;
    update(id: number, input: WebhookWriteInput): Promise<Webhook>;
    delete(id: number): Promise<void>;
  };
  readonly settings: {
    get(): Promise<DesktopSettings>;
    update(settings: DesktopSettings): Promise<DesktopSettings>;
  };
  readonly diagnostics: { get(): Promise<Diagnostics> };
  readonly app: { info(): Promise<AppInfo>; openExternal(url: string): Promise<void> };
  readonly updates: {
    state(): Promise<UpdateState>;
    check(): Promise<UpdateState>;
    download(): Promise<void>;
    cancel(): Promise<void>;
    install(): Promise<void>;
    onChange(listener: (state: UpdateState) => void): () => void;
  };
}
