// Figma page "12 — Shipments": Default (9:2), Search State (9:255),
// Filter State (9:506), Empty (9:759), Search Empty (9:940), Loading (9:1124),
// Error (9:1357) and Row Actions / Open (9:1538).
// The list endpoint only pages (50 records/page provider constraint), so search
// and filters narrow the page that is currently loaded.

import type { Shipment, ShipmentPage } from '@kargonomi/client';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FilterMenu, type FilterOption } from '../components/FilterMenu.tsx';
import { GridCell, GridRow, GridSkeleton, GridState, GridTable, TextPagination, type GridColumn } from '../components/GridTable.tsx';
import { Button, SearchField, ShipmentStatusBadge, resolveShipmentStatus } from '../components/Kit.tsx';
import { RowMenu, RowMenuItem } from '../components/RowMenu.tsx';
import { PageHeader } from '../components/Ui.tsx';
import { liraOr } from '../lib/format.ts';
import { formatDate } from './DashboardPage.tsx';

// Shipment Table / State=Default (8:2).
const columns: readonly GridColumn[] = [
  { key: 'id', header: 'ID', width: 105 },
  { key: 'buyer', header: 'Alıcı', width: 145 },
  { key: 'status', header: 'Durum', width: 145 },
  { key: 'provider', header: 'Kargo Firması', width: 120 },
  { key: 'tracking', header: 'Takip Kodu', width: 150 },
  { key: 'packages', header: 'Paket', width: 60 },
  { key: 'estimated', header: 'Tahmini', width: 85 },
  { key: 'real', header: 'Gerçek', width: 85 },
  { key: 'created', header: 'Oluşturulma', width: 115 },
  { key: 'actions', header: '', width: 70 },
];

// Shipment Table / State=Loading (8:99) skeleton bar widths.
const skeletonWidths = [100, 130, 120, 110, 140, 50, 75, 75, 100, 45];

const statusOptions: readonly FilterOption[] = [
  { value: 'draft', label: 'Taslak' },
  { value: 'ready', label: 'İşleme Hazır' },
  { value: 'creating', label: 'Sipariş Oluşturuluyor' },
  { value: 'created', label: 'Sipariş Oluşturuldu' },
  { value: 'checking', label: 'Kargo Kaydı Kontrol Ediliyor' },
  { value: 'inDelivery', label: 'Teslim Sürecinde' },
  { value: 'delivered', label: 'Teslim Edildi' },
  { value: 'notDelivered', label: 'Teslim Edilemedi' },
  { value: 'returning', label: 'Geri Geliyor' },
  { value: 'lost', label: 'Kayıp' },
  { value: 'cancellationRequest', label: 'İptal Talebi' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

const dateOptions: readonly FilterOption[] = [
  { value: '1', label: 'Bugün' },
  { value: '7', label: 'Son 7 Gün' },
  { value: '30', label: 'Son 30 Gün' },
];

interface Chip {
  readonly key: string;
  readonly label: string;
  readonly clear: () => void;
}

export interface ShipmentsPageProps {
  readonly onCreate: () => void;
  readonly onDetail: (id: number) => void;
  readonly onEdit: (id: number) => void;
  readonly onPricing: (id: number) => void;
  readonly onBarcode: (id: number) => void;
  readonly onCancel: (id: number, carrier: string | null) => void;
  readonly onDelete: (id: number) => void;
}

export function ShipmentsPage({ onCreate, onDetail, onEdit, onPricing, onBarcode, onCancel, onDelete }: ShipmentsPageProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<ShipmentPage>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [days, setDays] = useState('');
  const [warehouse, setWarehouse] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try { setPage(await window.kargonomi.shipments.list(pageNumber)); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  }, [pageNumber]);

  useEffect(() => { void load(); }, [load]);

  const loaded = page?.items ?? [];

  const providerOptions = useMemo<readonly FilterOption[]>(
    () => [...new Set(loaded.map((shipment) => shipment.shippingProviderName).filter((name): name is string => name !== null))]
      .sort((a, b) => a.localeCompare(b, 'tr-TR'))
      .map((name) => ({ value: name, label: name })),
    [loaded],
  );

  const warehouseOptions = useMemo<readonly FilterOption[]>(() => {
    const found = new Map<string, string>();
    for (const shipment of loaded) {
      if (shipment.warehouse !== null) found.set(String(shipment.warehouse.id), shipment.warehouse.name);
    }
    return [...found.entries()].map(([value, label]) => ({ value, label: `Depo: ${label}` }));
  }, [loaded]);

  const items = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    const since = days === '' ? undefined : startOfWindow(Number(days));
    return loaded.filter((shipment) => {
      if (status !== '' && resolveShipmentStatus(shipment.status) !== status) return false;
      if (provider !== '' && shipment.shippingProviderName !== provider) return false;
      if (warehouse !== '' && String(shipment.warehouse?.id ?? '') !== warehouse) return false;
      // A record without a creation date cannot match a date window.
      if (since !== undefined && (shipment.createdAt === null || new Date(shipment.createdAt) < since)) return false;
      if (needle === '') return true;
      return matches(shipment, needle);
    });
  }, [days, loaded, provider, query, status, warehouse]);

  const optionLabel = (options: readonly FilterOption[], value: string) => options.find((option) => option.value === value)?.label ?? value;

  const searchChip: Chip | null = query.trim() === '' ? null : { key: 'query', label: `Arama: ${query.trim()}`, clear: () => setQuery('') };
  const filterChips: readonly Chip[] = [
    status === '' ? null : { key: 'status', label: `Durum: ${optionLabel(statusOptions, status)}`, clear: () => setStatus('') },
    provider === '' ? null : { key: 'provider', label: `Kargo: ${provider.replace(/\s+Kargo$/u, '')}`, clear: () => setProvider('') },
    days === '' ? null : { key: 'days', label: `Tarih: ${optionLabel(dateOptions, days)}`, clear: () => setDays('') },
    warehouse === '' ? null : { key: 'warehouse', label: optionLabel(warehouseOptions, warehouse), clear: () => setWarehouse('') },
  ].filter((chip): chip is Chip => chip !== null);
  const chips = searchChip === null ? filterChips : [searchChip, ...filterChips];
  // Search State (9:406) counts results; Filter State (9:657) counts filters.
  const summary = filterChips.length === 0 ? `${items.length} sonuç` : `${chips.length} aktif filtre`;

  const clearAll = () => { setQuery(''); setStatus(''); setProvider(''); setDays(''); setWarehouse(''); };

  let body;
  if (failed) {
    body = (
      <GridState
        tone="error"
        title="Gönderiler alınamadı"
        text="API isteği başarısız oldu. Bağlantınızı kontrol edip yeniden deneyin."
        action={<Button hierarchy="secondary" leadingIcon="action-refresh" onClick={() => void load()}>Tekrar Dene</Button>}
      />
    );
  } else if (loading || page === undefined) {
    body = <GridSkeleton widths={skeletonWidths} />;
  } else if (items.length === 0 && chips.length > 0) {
    body = (
      <GridState
        title="Aramanızla eşleşen gönderi bulunamadı."
        text="Arama terimini veya aktif filtreleri değiştirerek tekrar deneyin."
        action={<Button hierarchy="primary" leadingIcon="action-close" onClick={clearAll}>Filtreleri Temizle</Button>}
      />
    );
  } else if (items.length === 0) {
    body = (
      <GridState
        title="Henüz gönderiniz bulunmuyor."
        text="İlk gönderinizi oluşturarak operasyon akışını başlatın."
        action={<Button hierarchy="primary" leadingIcon="shipment-package-add" onClick={onCreate}>İlk Gönderinizi Oluşturun</Button>}
      />
    );
  } else {
    body = items.map((shipment) => (
      <GridRow key={shipment.id}>
        <GridCell width={105}>
          <button type="button" className="grid-table__link" onClick={() => onDetail(shipment.id)}>#{shipment.id}</button>
        </GridCell>
        <GridCell width={145} title={shipment.buyerName ?? undefined}>{shipment.buyerName ?? '—'}</GridCell>
        <GridCell width={145} kind="status"><ShipmentStatusBadge status={shipment.status} statusLabel={shipment.statusLabel} /></GridCell>
        <GridCell width={120} title={shipment.shippingProviderName ?? undefined}>{shipment.shippingProviderName ?? '—'}</GridCell>
        <GridCell width={150} title={shipment.shippingWebserviceTrackingCode ?? undefined}>{shipment.shippingWebserviceTrackingCode ?? '—'}</GridCell>
        <GridCell width={60} kind="muted">{shipment.packageCount}</GridCell>
        <GridCell width={85} kind="muted">{liraOr(shipment.estimatedPrice)}</GridCell>
        <GridCell width={85} kind="muted">{liraOr(shipment.pricing?.realPrice ?? shipment.realPrice)}</GridCell>
        <GridCell width={115} kind="muted">{formatDate(shipment.createdAt)}</GridCell>
        <GridCell width={70} kind="actions">
          <RowMenu label={`Gönderi ${shipment.id} işlemleri`}>
            {(close) => (
              <>
                <RowMenuItem label="Görüntüle" onSelect={() => { close(); onDetail(shipment.id); }} />
                <RowMenuItem label="Düzenle" onSelect={() => { close(); onEdit(shipment.id); }} />
                <RowMenuItem label="Fiyat Karşılaştır" onSelect={() => { close(); onPricing(shipment.id); }} />
                <RowMenuItem label="Barkod" onSelect={() => { close(); onBarcode(shipment.id); }} />
                <RowMenuItem label="İptal Talebi" danger onSelect={() => { close(); onCancel(shipment.id, shipment.shippingProviderName); }} />
                <RowMenuItem label="Sil" danger onSelect={() => { close(); onDelete(shipment.id); }} />
              </>
            )}
          </RowMenu>
        </GridCell>
      </GridRow>
    ));
  }

  // The Loading variant keeps the pagination row; it is shown whenever a page
  // has been received, including while the next one is on its way.
  const showPagination = !failed && page !== undefined && page.total > 0 && (loading || items.length > 0);

  return (
    <main className="main-content main-content--dense">
      <PageHeader
        title="Gönderiler"
        description="Gönderileri arayın, filtreleyin ve operasyon aksiyonlarını yönetin."
        actions={
          <>
            <Button hierarchy="secondary" leadingIcon="action-refresh" onClick={() => void load()}>Yenile</Button>
            <Button hierarchy="primary" leadingIcon="shipment-package-add" onClick={onCreate}>Yeni Gönderi</Button>
          </>
        }
      />

      <div className="filter-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Ara: ID, alıcı, takip kodu…" />
        <FilterMenu label="Durum" width={120} options={statusOptions} value={status} onChange={setStatus} />
        <FilterMenu label="Kargo Firması" width={120} options={providerOptions} value={provider} onChange={setProvider} />
        <FilterMenu label="Tarih" width={120} options={dateOptions} value={days} onChange={setDays} />
        <FilterMenu label="Gelişmiş Filtreler" width={150} options={warehouseOptions} value={warehouse} onChange={setWarehouse} />
        <span className="filter-toolbar__spacer" aria-hidden="true" />
        <button type="button" className="filter-toolbar__clear" onClick={clearAll}>Temizle</button>
      </div>

      {chips.length === 0 ? null : (
        <div className="active-filters" aria-live="polite">
          <span className="active-filters__count">{summary}</span>
          {chips.map((chip) => (
            <span className="chip" key={chip.key}>
              {`${chip.label}  `}
              <button type="button" className="chip__remove" aria-label={`${chip.label} filtresini kaldır`} onClick={chip.clear}>×</button>
            </span>
          ))}
        </div>
      )}

      <GridTable label="Gönderiler" width={1080} columns={columns} busy={loading}>
        {body}
        {showPagination ? (
          <TextPagination
            currentPage={page.currentPage}
            lastPage={page.lastPage}
            perPage={page.perPage}
            total={page.total}
            disabled={loading}
            onChange={setPageNumber}
          />
        ) : null}
      </GridTable>
    </main>
  );
}

function matches(shipment: Shipment, needle: string): boolean {
  const haystack = `${shipment.id} #${shipment.id} ${shipment.buyerName ?? ''} ${shipment.shippingWebserviceTrackingCode ?? ''}`;
  return haystack.toLocaleLowerCase('tr-TR').includes(needle);
}

function startOfWindow(days: number): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}
