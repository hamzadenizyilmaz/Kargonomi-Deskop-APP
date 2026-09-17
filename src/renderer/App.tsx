import { Component, Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { ConnectionResult, CredentialStatus, DesktopSettings } from '../shared/ipc.ts';
import { Layout, type Route } from './components/Layout.tsx';
import type { ListMenuState } from './components/Listbox.tsx';
import { formatLira } from './lib/format.ts';
import { isNetworkFailure } from './lib/errors.ts';
import { handleSaveShortcut } from './lib/shortcuts.ts';
import { fetchWarehouses, initialWarehouseList, type WarehouseList } from './lib/warehouses.ts';
import { applyTheme } from './theme.ts';
import { Button, type ConnectionStatusKey } from './components/Kit.tsx';
import { SystemState, copyDiagnostics } from './components/SystemState.tsx';
import { ConfirmDialog, Dialog } from './components/Ui.tsx';
import { BarcodePage } from './pages/BarcodePage.tsx';
import { CreateShipmentPage } from './pages/CreateShipmentPage.tsx';
import { CreditPage } from './pages/CreditPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DiagnosticsPage } from './pages/DiagnosticsPage.tsx';
import { EditShipmentPage } from './pages/EditShipmentPage.tsx';
import { LocationsPage } from './pages/LocationsPage.tsx';
import { PricingPage } from './pages/PricingPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { SetupPage, SplashScreen } from './pages/SetupPage.tsx';
import { ShipmentDetailPage } from './pages/ShipmentDetailPage.tsx';
import { ShipmentsPage } from './pages/ShipmentsPage.tsx';
import { WarehousesPage } from './pages/WarehousesPage.tsx';
import { WebhooksPage } from './pages/WebhooksPage.tsx';

// Sender step: the select reports loading or failure only while it has no
// warehouse to offer; warehouses seen on shipments still count as choices.
function warehouseMenuState(list: WarehouseList): ListMenuState {
  if (list.items.length > 0) return 'default';
  if (list.status === 'loading') return 'loading';
  return list.status === 'loaded' ? 'default' : 'error';
}

interface BoundaryState { readonly failed: boolean }

// "Beklenmeyen Hata" (19:131) for anything the renderer did not anticipate.
export class AppErrorBoundary extends Component<{ readonly children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { failed: false };
  static getDerivedStateFromError(): BoundaryState { return { failed: true }; }
  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="setup-shell setup-shell--state">
        <SystemState
          kind="unexpected"
          onSecondary={() => void copyDiagnostics().catch(() => undefined)}
          onPrimary={() => this.setState({ failed: false })}
        />
      </main>
    );
  }
}

export function App() {
  const [credential, setCredential] = useState<CredentialStatus>();
  const [settings, setSettings] = useState<DesktopSettings>();
  const [version, setVersion] = useState<string>();
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [route, setRoute] = useState<Route>('dashboard');
  const [visit, setVisit] = useState(0);
  // Last topbar segment reported by a page whose frames vary it (Webhooks).
  const [crumb, setCrumb] = useState<string>();
  const [selected, setSelected] = useState<number>();
  const [balance, setBalance] = useState<string>();
  const [connection, setConnection] = useState<ConnectionStatusKey>('connecting');
  const [warehouses, setWarehouses] = useState<WarehouseList>(initialWarehouseList);
  const warehouseRequest = useRef(0);
  const [preferredWarehouse, setPreferredWarehouse] = useState<number>();
  const [pendingCancel, setPendingCancel] = useState<{ readonly id: number; readonly carrier: string | null }>();
  const [pendingDelete, setPendingDelete] = useState<number>();
  const [dialogBusy, setDialogBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  // A cancel/delete that never reached the API, offered again from
  // Dialog / Connection Failed (20:99).
  const [failedAction, setFailedAction] = useState<ShipmentAction>();
  const [cancelRequested, setCancelRequested] = useState<ReadonlySet<number>>(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const initialize = useCallback(() => {
    setInitializationFailed(false);
    // The splash (6:2) shows the running version and the chosen theme as soon
    // as the main process answers, without waiting for the credential check.
    void window.kargonomi.app.info().then((info) => setVersion(info.version)).catch(() => undefined);
    const loadedSettings = window.kargonomi.settings.get().catch(() => undefined).then((desktopSettings) => {
      applyTheme(desktopSettings?.theme ?? 'system');
      return desktopSettings;
    });
    void Promise.all([window.kargonomi.credentials.status(), loadedSettings])
      .then(([status, desktopSettings]) => {
        setCredential(status);
        setSettings(desktopSettings);
      })
      .catch(() => setInitializationFailed(true));
  }, []);

  useEffect(initialize, [initialize]);

  useEffect(() => {
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, []);

  // Topbar meta: live connection state and account balance.
  useEffect(() => {
    if (credential?.configured !== true) return;
    void window.kargonomi.connection.test()
      .then((result: ConnectionResult) => setConnection(toConnectionKey(result)))
      .catch(() => setConnection('service-problem'));
    void window.kargonomi.account.credit().then((credit) => setBalance(formatLira(credit.amount))).catch(() => setBalance(undefined));
  }, [credential?.configured, refreshKey]);

  // Warehouse records for Depolar and the sender step; the latest request wins.
  const reloadWarehouses = useCallback(() => {
    warehouseRequest.current += 1;
    const request = warehouseRequest.current;
    setWarehouses((current) => ({ ...current, status: 'loading' }));
    void fetchWarehouses().then((list) => {
      if (request === warehouseRequest.current) setWarehouses(list);
    });
  }, []);

  useEffect(() => {
    if (credential?.configured !== true) return;
    reloadWarehouses();
  }, [credential?.configured, refreshKey, reloadWarehouses]);

  if (initializationFailed) {
    return (
      <main className="setup-shell setup-shell--state">
        <SystemState kind="unexpected" onSecondary={() => void copyDiagnostics().catch(() => undefined)} onPrimary={initialize} />
      </main>
    );
  }

  if (credential === undefined) return <SplashScreen version={version} />;

  if (!credential.configured) {
    return (
      <SetupPage
        secureStorageAvailable={credential.secureStorageAvailable}
        settings={settings}
        onComplete={() => setCredential({ ...credential, configured: true })}
      />
    );
  }

  const navigate = (next: Route) => {
    setRoute(next);
    setVisit((value) => value + 1);
    setCrumb(undefined);
    setPreferredWarehouse(undefined);
    if (!['detail', 'edit', 'pricing', 'barcode'].includes(next)) setSelected(undefined);
    // Depolar and the sender step read the warehouse records again.
    if (next === 'warehouses' || next === 'create') reloadWarehouses();
  };
  const createFromWarehouse = (warehouseId?: number) => {
    navigate('create');
    setPreferredWarehouse(warehouseId);
  };
  const openShipment = (id: number) => { setSelected(id); setRoute('detail'); };
  // Re-runs the topbar connection test and balance lookup.
  const refreshShell = () => setRefreshKey((value) => value + 1);

  let content: ReactNode;
  if (route === 'dashboard') {
    content = <DashboardPage onNavigate={navigate} onDetail={openShipment} onRefresh={refreshShell} apiOffline={connection === 'offline'} />;
  } else if (route === 'shipments') {
    content = (
      <ShipmentsPage
        onCreate={() => navigate('create')}
        onDetail={openShipment}
        onEdit={(id) => { setSelected(id); setRoute('edit'); }}
        onPricing={(id) => { setSelected(id); setRoute('pricing'); }}
        onBarcode={(id) => { setSelected(id); setRoute('barcode'); }}
        onCancel={(id, carrier) => setPendingCancel({ id, carrier })}
        onDelete={setPendingDelete}
      />
    );
  } else if (route === 'create') {
    content = (
      <CreateShipmentPage
        warehouses={warehouses.items}
        warehousesState={warehouseMenuState(warehouses)}
        preferredWarehouseId={preferredWarehouse}
        onCancel={() => navigate('shipments')}
        onDetail={openShipment}
        onPricing={(id) => { setSelected(id); setRoute('pricing'); }}
        onDiagnostics={() => navigate('diagnostics')}
      />
    );
  } else if (route === 'detail' && selected !== undefined) {
    content = (
      <ShipmentDetailPage
        id={selected}
        onEdit={() => setRoute('edit')}
        onPricing={() => setRoute('pricing')}
        onBarcode={() => setRoute('barcode')}
        onCancel={(carrier) => setPendingCancel({ id: selected, carrier })}
        onDelete={() => setPendingDelete(selected)}
        onDiagnostics={() => navigate('diagnostics')}
        cancellationRequested={cancelRequested.has(selected)}
      />
    );
  } else if (route === 'edit' && selected !== undefined) {
    content = <EditShipmentPage id={selected} onCancel={() => setRoute('detail')} onSaved={openShipment} />;
  } else if (route === 'pricing' && selected !== undefined) {
    content = (
      <PricingPage
        shipmentId={selected}
        onEdit={() => setRoute('edit')}
        onDetail={() => setRoute('detail')}
        onBarcode={() => setRoute('barcode')}
      />
    );
  } else if (route === 'barcode' && selected !== undefined) {
    content = <BarcodePage shipmentId={selected} onDetail={() => setRoute('detail')} />;
  } else if (route === 'warehouses') {
    content = <WarehousesPage warehouses={warehouses} onReload={reloadWarehouses} onCreateShipment={createFromWarehouse} />;
  } else if (route === 'locations') {
    content = <LocationsPage />;
  } else if (route === 'webhooks') {
    content = <WebhooksPage onCrumb={setCrumb} />;
  } else if (route === 'credit') {
    content = <CreditPage />;
  } else if (route === 'diagnostics') {
    content = <DiagnosticsPage shellConnection={connection} />;
  } else if (route === 'settings' || route === 'about') {
    content = (
      <SettingsPage
        initialSection={route === 'about' ? 'about' : 'connection'}
        shellConnection={connection}
        onCrumb={setCrumb}
        onDiagnostics={() => navigate('diagnostics')}
        onCredentialsCleared={() => setCredential({ ...credential, configured: false })}
      />
    );
  } else {
    content = <DashboardPage onNavigate={navigate} onDetail={openShipment} onRefresh={refreshShell} apiOffline={connection === 'offline'} />;
  }

  const closeShipmentDialogs = () => {
    setPendingCancel(undefined);
    setPendingDelete(undefined);
    setFailedAction(undefined);
    setActionError(undefined);
  };

  const runShipmentAction = async (action: ShipmentAction) => {
    setDialogBusy(true);
    setActionError(undefined);
    try {
      if (action.kind === 'cancel') await window.kargonomi.shipments.cancel(action.id);
      else await window.kargonomi.shipments.delete(action.id);
      closeShipmentDialogs();
      refreshShell();
      // Prototype Flow 3 (26) ends on the shipment detail in its Cancellation
      // Requested state, whichever screen the request came from; a deleted
      // record returns to the list.
      if (action.kind === 'delete') {
        navigate('shipments');
      } else {
        setCancelRequested((current) => new Set(current).add(action.id));
        setSelected(action.id);
        setRoute('detail');
        setVisit((value) => value + 1);
      }
    } catch (error) {
      if (isNetworkFailure(error)) {
        closeShipmentDialogs();
        setFailedAction(action);
      } else {
        // The confirmation stays (or comes back) with the error, ready to retry.
        setFailedAction(undefined);
        if (action.kind === 'cancel') setPendingCancel({ id: action.id, carrier: action.carrier });
        else setPendingDelete(action.id);
        setActionError(action.kind === 'cancel'
          ? 'İptal talebi oluşturulamadı. Güvenli ayrıntılar Tanılama ekranına kaydedildi.'
          : 'Gönderi silinemedi. Güvenli ayrıntılar Tanılama ekranına kaydedildi.');
      }
    } finally {
      setDialogBusy(false);
    }
  };

  return (
    <Layout
      route={route}
      onNavigate={navigate}
      breadcrumb={breadcrumbFor(route, selected, crumb)}
      connection={connection}
      balance={balance}
    >
      {/* A new visit (including re-selecting the current item) starts the page afresh. */}
      <Fragment key={visit}>{content}</Fragment>

      {pendingCancel === undefined ? null : (
        <ConfirmDialog
          title="İptal Talebi Oluştur"
          icon="status-warning"
          tone="warning"
          confirmHierarchy="destructive"
          body="İptal talebinin tamamlanması zaman alabilir. Talep gönderildikten sonra durum “İptal Talebi” olarak izlenecektir."
          meta={`Gönderi #${pendingCancel.id}${pendingCancel.carrier === null ? '' : ` · ${pendingCancel.carrier}`}`}
          error={actionError}
          confirmLabel="İptal Talebi Oluştur"
          busy={dialogBusy}
          onConfirm={() => void runShipmentAction({ kind: 'cancel', id: pendingCancel.id, carrier: pendingCancel.carrier })}
          onClose={closeShipmentDialogs}
        />
      )}

      {pendingDelete === undefined ? null : (
        <ConfirmDialog
          title="Kaydı Sil"
          icon="action-delete"
          tone="error"
          confirmHierarchy="destructive"
          body="Bu kayıt kalıcı olarak silinecektir. Bu işlem geri alınamaz."
          error={actionError}
          confirmLabel="Sil"
          busy={dialogBusy}
          onConfirm={() => void runShipmentAction({ kind: 'delete', id: pendingDelete, carrier: null })}
          onClose={closeShipmentDialogs}
        />
      )}

      {failedAction === undefined ? null : (
        <Dialog
          title="Bağlantı kurulamadı"
          icon="system-wifi-off"
          tone="error"
          dismissible={!dialogBusy}
          onClose={closeShipmentDialogs}
          actions={
            <>
              <Button hierarchy="secondary" disabled={dialogBusy} onClick={() => { closeShipmentDialogs(); navigate('diagnostics'); }}>Tanılamayı Aç</Button>
              <Button hierarchy="primary" loading={dialogBusy} onClick={() => void runShipmentAction(failedAction)}>Tekrar Dene</Button>
            </>
          }
        >
          <p className="k-dialog__body">Kargonomi API sunucusuna erişilemedi. Ağ bağlantısını ve Base URL ayarını kontrol edin.</p>
          <p className="k-dialog__note">API anahtarı veya hassas istek içeriği bu hata penceresinde gösterilmez.</p>
        </Dialog>
      )}
    </Layout>
  );
}

interface ShipmentAction {
  readonly kind: 'cancel' | 'delete';
  readonly id: number;
  readonly carrier: string | null;
}

// Breadcrumbs follow the topbar text on each Figma screen.
function breadcrumbFor(route: Route, selected: number | undefined, crumb: string | undefined): string {
  const id = selected === undefined ? '' : `#${selected}`;
  switch (route) {
    case 'dashboard': return 'Dashboard / Genel Bakış';
    case 'shipments': return 'Gönderiler / Tüm Gönderiler';
    case 'create': return 'Gönderiler / Yeni Gönderi';
    case 'detail': return `Gönderiler / ${id}`;
    case 'edit': return `Gönderiler / ${id} / Düzenle`;
    case 'pricing': return `Gönderiler / ${id} / Fiyat Karşılaştır`;
    case 'barcode': return `Gönderiler / ${id} / Barkod`;
    case 'warehouses': return 'Yönetim / Depolar';
    case 'locations': return 'Yönetim / Lokasyonlar';
    case 'webhooks': return `Webhooks / ${crumb ?? 'Tümü'}`;
    case 'credit': return 'Bakiyem';
    case 'diagnostics': return 'Tanılama / Genel Bakış';
    case 'settings': return `Ayarlar / ${crumb ?? 'Bağlantı'}`;
    case 'about': return `Ayarlar / ${crumb ?? 'Hakkında'}`;
  }
}

function toConnectionKey(result: ConnectionResult): ConnectionStatusKey {
  if (result.state === 'connected') return 'connected';
  if (result.state === 'unauthorized') return 'unauthorized';
  if (result.state === 'timeout') return 'timeout';
  if (result.state === 'network-error') return 'offline';
  return 'service-problem';
}

