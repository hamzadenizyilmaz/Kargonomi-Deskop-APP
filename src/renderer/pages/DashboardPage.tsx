// Figma page "11 — Dashboard": Default (7:2), Loading (7:250),
// API Error (7:432) and Offline (7:618).
// API Error keeps the last good figures on screen and replaces only the recent
// shipments table; Offline keeps everything and adds the persistent banner.

import type { Shipment, ShipmentPage } from '@kargonomi/client';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, IconButton, resolveShipmentStatus, shipmentStatusLabel } from '../components/Kit.tsx';
import { ErrorCard, LoadingSkeleton, OfflineBanner, PageHeader } from '../components/Ui.tsx';
import type { Route } from '../components/Layout.tsx';
import { liraOr } from '../lib/format.ts';

// Recent Shipments Table (114:228) column widths.
const recentColumns = [
  { key: 'tracking', header: 'Takip No', width: 190 },
  { key: 'buyer', header: 'Alıcı', width: 210 },
  { key: 'provider', header: 'Kargo Firması', width: 150 },
  { key: 'status', header: 'Durum', width: 180 },
  { key: 'date', header: 'Tarih', width: 150 },
  { key: 'amount', header: 'Tutar', width: 110 },
  { key: 'actions', header: '', width: 130 },
] as const;

const kpiLabels = ['Toplam Gönderi', 'İşleme Hazır', 'Teslim Sürecinde', 'Teslim Edildi', 'İptal Talebi'] as const;

interface DashboardData {
  readonly page: ShipmentPage;
  readonly loadedAt: Date;
}

export interface DashboardPageProps {
  readonly onNavigate: (route: Route) => void;
  readonly onDetail: (id: number) => void;
  readonly onRefresh: () => void;
  // The last connection test could not reach the API at all.
  readonly apiOffline: boolean;
}

export function DashboardPage({ onNavigate, onDetail, onRefresh, apiOffline }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData>();
  const [credit, setCredit] = useState<string | null>();
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  const load = useCallback(async () => {
    setFailed(false);
    // Credit lives behind a separate endpoint and still shows when the shipment
    // list fails. Like the other figures, a failed refresh keeps the last value;
    // with none yet it degrades to an em dash.
    const [page, amount] = await Promise.all([
      window.kargonomi.shipments.list(1).catch(() => undefined),
      window.kargonomi.account.credit().then((value) => value.amount).catch(() => null),
    ]);
    setCredit((current) => amount ?? current ?? null);
    if (page === undefined) setFailed(true);
    else setData({ page, loadedAt: new Date() });
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const online = () => setOffline(false);
    const down = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', down); };
  }, []);

  const refresh = () => { onRefresh(); void load(); };
  const buckets = useMemo(() => countByStatus(data?.page.items ?? []), [data]);
  const total = buckets.delivered + buckets.inDelivery + buckets.ready + buckets.problem;
  const share = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));
  // Without any figures (first load failed) the legend shows dashes like the KPI cards.
  const percent = (value: number) => (data === undefined ? '—' : `${share(value)}%`);

  const kpiValues: readonly string[] = data === undefined
    ? kpiLabels.map(() => '—')
    : [data.page.total.toLocaleString('tr-TR'), String(buckets.ready), String(buckets.inDelivery), String(buckets.delivered), String(buckets.cancellationRequest)];

  const segments = [
    { key: 'delivered', value: buckets.delivered },
    { key: 'transit', value: buckets.inDelivery },
    { key: 'ready', value: buckets.ready },
    { key: 'problem', value: buckets.problem },
  ].filter((segment) => segment.value > 0);

  let recent;
  if (failed) {
    recent = <ErrorCard title="Dashboard verileri alınamadı" text="API isteği başarısız oldu. Bağlantıyı kontrol edip yeniden deneyin." onRetry={refresh} />;
  } else if (data === undefined) {
    recent = <LoadingSkeleton lines={3} />;
  } else {
    recent = (
      <div className="recent-table-scroll">
        <div className="recent-table" role="table" aria-label="Son Gönderiler">
          <div className="recent-table__header" role="row">
            {recentColumns.map((column) => (
              <div className="recent-table__cell" role="columnheader" key={column.key} style={{ width: column.width }}>
                {column.key === 'actions' ? <span className="sr-only">İşlemler</span> : column.header}
              </div>
            ))}
          </div>
          {data.page.items.slice(0, 3).map((shipment) => (
            <div className="recent-table__row" role="row" key={shipment.id}>
              <div className="recent-table__cell" role="cell" style={{ width: 190 }}>{shipment.shippingWebserviceTrackingCode ?? '—'}</div>
              <div className="recent-table__cell" role="cell" style={{ width: 210 }}>{shipment.buyerName ?? '—'}</div>
              <div className="recent-table__cell" role="cell" style={{ width: 150 }}>{shipment.shippingProviderName ?? '—'}</div>
              <div className="recent-table__cell" role="cell" style={{ width: 180 }}>{shipmentStatusLabel(shipment.status, shipment.statusLabel)}</div>
              <div className="recent-table__cell" role="cell" style={{ width: 150 }}>{formatDate(shipment.createdAt)}</div>
              <div className="recent-table__cell" role="cell" style={{ width: 110 }}>{liraOr(shipment.estimatedPrice)}</div>
              <div className="recent-table__cell recent-table__cell--actions" role="cell" style={{ width: 130 }}>
                <IconButton icon="action-more-horizontal" label={`Gönderi ${shipment.id} ayrıntıları`} onClick={() => onDetail(shipment.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="main-content">
      <PageHeader
        title="Genel Bakış"
        description="Gönderi operasyonlarının güncel özetini görüntüleyin."
        actions={
          <>
            <Button hierarchy="secondary" leadingIcon="action-refresh" onClick={refresh}>Yenile</Button>
            <Button hierarchy="primary" leadingIcon="shipment-package-add" onClick={() => onNavigate('create')}>Yeni Gönderi</Button>
          </>
        }
      />

      {(offline || apiOffline) && data !== undefined
        ? <OfflineBanner text={`Son güncelleme ${data.loadedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}. Yeni veriler bağlantı yeniden kurulduğunda alınacaktır.`} />
        : null}

      <div className="kpi-row">
        {kpiLabels.map((label, index) => (
          <article className="kpi-card" key={label}>
            <p className="kpi-card__label">{label}</p>
            <p className="kpi-card__value">{kpiValues[index]}</p>
          </article>
        ))}
        <article className="kpi-card kpi-card--accent">
          <p className="kpi-card__label">Kullanılabilir Bakiye</p>
          <p className="kpi-card__value">{liraOr(credit)}</p>
        </article>
      </div>

      <div className="overview-row">
        <section className="panel panel--overview">
          <p className="panel__title">Gönderi Durum Dağılımı</p>
          {data === undefined && !failed ? <LoadingSkeleton lines={4} variant="line" /> : (
            <>
              <div className="stacked-bar" role="img" aria-label={data === undefined ? 'Gönderi durum dağılımı alınamadı' : `Teslim Edildi ${percent(buckets.delivered)}, Teslim Sürecinde ${percent(buckets.inDelivery)}, İşleme Hazır ${percent(buckets.ready)}, İptal veya sorunlu ${percent(buckets.problem)}`}>
                {segments.map((segment) => (
                  <span key={segment.key} className={`stacked-bar__segment stacked-bar__segment--${segment.key}`} style={{ flexGrow: segment.value }} />
                ))}
              </div>
              <div className="legend">
                <p>{`Teslim Edildi ${percent(buckets.delivered)}   •   Teslim Sürecinde ${percent(buckets.inDelivery)}`}</p>
                <p>{`İşleme Hazır ${percent(buckets.ready)}   •   İptal / Sorunlu ${percent(buckets.problem)}`}</p>
              </div>
            </>
          )}
        </section>
        <section className="panel panel--actions">
          <p className="panel__title">Hızlı İşlemler</p>
          <div className="quick-actions">
            <Button hierarchy="primary" leadingIcon="shipment-package-add" onClick={() => onNavigate('create')}>Yeni Gönderi</Button>
            <Button hierarchy="secondary" leadingIcon="shipment-package" onClick={() => onNavigate('shipments')}>Gönderileri Gör</Button>
            <Button hierarchy="secondary" leadingIcon="shipment-scale" onClick={() => onNavigate('shipments')}>Fiyat Karşılaştır</Button>
            <Button hierarchy="secondary" leadingIcon="system-webhook" onClick={() => onNavigate('webhooks')}>Webhook Yönetimi</Button>
          </div>
        </section>
      </div>

      <section className="section-stack">
        <div className="section-header">
          <h2 className="section-header__title">Son Gönderiler</h2>
          <button type="button" className="section-header__link" onClick={() => onNavigate('shipments')}>Tümünü Gör</button>
        </div>
        {recent}
      </section>
    </main>
  );
}

interface StatusBuckets {
  readonly ready: number;
  readonly inDelivery: number;
  readonly delivered: number;
  readonly cancellationRequest: number;
  readonly problem: number;
}

function countByStatus(items: readonly Shipment[]): StatusBuckets {
  let ready = 0;
  let inDelivery = 0;
  let delivered = 0;
  let cancellationRequest = 0;
  let problem = 0;
  for (const shipment of items) {
    const key = resolveShipmentStatus(shipment.status);
    if (key === 'ready' || key === 'draft') ready += 1;
    else if (key === 'creating' || key === 'created' || key === 'checking' || key === 'inDelivery') inDelivery += 1;
    else if (key === 'delivered') delivered += 1;
    else if (key === 'cancellationRequest') { cancellationRequest += 1; problem += 1; }
    else if (key !== 'unknown') problem += 1;
  }
  return { ready, inDelivery, delivered, cancellationRequest, problem };
}

export function formatDate(value: string | null): string {
  if (value === null) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
