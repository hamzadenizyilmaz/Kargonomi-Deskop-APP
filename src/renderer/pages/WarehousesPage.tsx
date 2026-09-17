// Figma page "18 — Warehouses": Warehouse / Create (15:1763) and Success (15:1935).
// The warehouse records come from GET /warehouses, which the live API serves
// although the published contract lists only creation; they use the Webhooks
// list layout (20 — Webhooks, 16:2). The API offers no warehouse update or
// delete (29 · Scope Guardrails), so a row only starts a shipment from it.

import type { WarehouseRecord } from '@kargonomi/client';
import { useEffect, useRef, useState } from 'react';

import { Button, SelectField, SwitchField, TextField } from '../components/Kit.tsx';
import { RowMenu, RowMenuItem } from '../components/RowMenu.tsx';
import { ErrorCard, PageHeader } from '../components/Ui.tsx';
import { chooseMessage, phoneError, requiredMessage } from '../lib/validation.ts';
import { useWarehousePlaces, warehouseLabel, type WarehouseList } from '../lib/warehouses.ts';
import { useLocations } from './CreateShipmentPage.tsx';

// Column widths fill the 1136px Webhook Table (54:10); the actions column is 86px.
const columns = [
  { label: 'ID', width: 96 },
  { label: 'Depo Adı', width: 210 },
  { label: 'Ana Depo', width: 110 },
  { label: 'Yetkili', width: 170 },
  { label: 'İl / İlçe', width: 190 },
  { label: 'Adres', width: 274 },
] as const;
const actionsWidth = 86;
// Loading skeleton bar widths, one per column (Webhook Table / Loading 54:66).
const skeletonWidths = [56, 130, 50, 100, 110, 180, 28] as const;
const noWarehouses: readonly WarehouseRecord[] = [];

type View = 'list' | 'create' | 'success';

interface CreatedWarehouse {
  readonly id: number | undefined;
  readonly name: string;
}

interface Draft {
  name: string;
  isMain: boolean;
  contactName: string;
  contactPhone: string;
  address: string;
  stateId: string;
  cityId: string;
  taxNumber: string;
}

type Errors = Partial<Record<keyof Draft, string>>;

const emptyDraft: Draft = { name: '', isMain: false, contactName: '', contactPhone: '', address: '', stateId: '', cityId: '', taxNumber: '' };

export interface WarehousesPageProps {
  readonly warehouses: WarehouseList;
  readonly onReload: () => void;
  readonly onCreateShipment: (warehouseId?: number) => void;
}

export function WarehousesPage({ warehouses, onReload, onCreateShipment }: WarehousesPageProps) {
  const [view, setView] = useState<View>('list');
  const [created, setCreated] = useState<CreatedWarehouse>();

  if (view === 'success' && created !== undefined) {
    return (
      <main className="main-content">
        <section className="success-panel" role="status">
          <h1 className="success-panel__title">Depo kaydedildi.</h1>
          <p className="success-panel__text">{created.name} yeni gönderilerde gönderici kaynağı olarak seçilebilir.</p>
          <div className="next-actions">
            <Button hierarchy="secondary" onClick={() => setView('list')}>Depo Listesine Dön</Button>
            <Button hierarchy="primary" onClick={() => onCreateShipment(created.id)}>Yeni Gönderi Oluştur</Button>
          </div>
        </section>
      </main>
    );
  }

  if (view === 'create') {
    return (
      <WarehouseForm
        onCancel={() => setView('list')}
        onCreated={(warehouse) => {
          setCreated(warehouse);
          setView('success');
          onReload();
        }}
      />
    );
  }

  const { status, items } = warehouses;
  const loading = status === 'loading';
  let body;
  if (status === 'derived' || status === 'failed') {
    body = <ErrorCard title="Depo kayıtları alınamadı" text="API isteği başarısız oldu. Bağlantıyı kontrol edip yeniden deneyin." onRetry={onReload} />;
  } else if (!loading && items.length === 0) {
    body = (
      <div className="empty-block">
        <p className="empty-block__title">Henüz depo kaydı yok.</p>
        <p className="empty-block__text">Gönderilerde gönderici olarak kullanılacak ilk deponuzu ekleyin.</p>
        <Button hierarchy="primary" leadingIcon="action-add" onClick={() => setView('create')}>Depo Ekle</Button>
      </div>
    );
  } else {
    body = (
      <>
        <WarehouseTable items={loading ? undefined : items} onCreateShipment={onCreateShipment} />
        {loading ? null : <p className="form-hint">{`Toplam ${items.length.toLocaleString('tr-TR')} depo kaydı`}</p>}
      </>
    );
  }

  return (
    <main className="main-content main-content--dense">
      <PageHeader
        title="Depolar"
        description="Kargonomi hesabınızdaki depo kayıtlarını görüntüleyin ve yeni depo ekleyin."
        actions={(
          <>
            <Button hierarchy="secondary" leadingIcon="action-refresh" disabled={loading} onClick={onReload}>Yenile</Button>
            <Button hierarchy="primary" leadingIcon="action-add" onClick={() => setView('create')}>Depo Ekle</Button>
          </>
        )}
      />
      {body}
    </main>
  );
}

function WarehouseTable({ items, onCreateShipment }: {
  readonly items: readonly WarehouseRecord[] | undefined;
  readonly onCreateShipment: (warehouseId: number) => void;
}) {
  const placeOf = useWarehousePlaces(items ?? noWarehouses);
  return (
    <div className="record-table-scroll">
      <div className="record-table" role="table" aria-label="Depo kayıtları" aria-busy={items === undefined || undefined}>
        <div className="record-table__header" role="row">
          {columns.map((column) => (
            <span className="record-table__header-cell" role="columnheader" style={{ width: column.width }} key={column.label}>{column.label}</span>
          ))}
          <span className="record-table__header-cell" role="columnheader" style={{ width: actionsWidth }}><span className="sr-only">İşlemler</span></span>
        </div>
        {items === undefined
          ? Array.from({ length: 3 }, (_, row) => (
            <div className="record-table__skeleton-row" aria-hidden="true" key={row}>
              {[...columns.map((column) => column.width), actionsWidth].map((width, cell) => (
                <span className="record-table__skeleton-cell" style={{ width }} key={cell}>
                  <span className="record-table__skeleton" style={{ width: skeletonWidths[cell] }} />
                </span>
              ))}
            </div>
          ))
          : items.map((warehouse) => {
            const name = warehouseLabel(warehouse);
            return (
              <div className="record-table__row" role="row" key={warehouse.id}>
                <TextCell width={columns[0].width} value={String(warehouse.id)} />
                <TextCell width={columns[1].width} value={name} />
                <span className={warehouse.isMain ? 'record-table__cell record-status record-status--active' : 'record-table__cell record-status'} role="cell" style={{ width: columns[2].width }}>
                  <span className="record-status__dot" aria-hidden="true" />
                  {warehouse.isMain ? 'Evet' : 'Hayır'}
                </span>
                <TextCell width={columns[3].width} value={warehouse.contactName} />
                <TextCell width={columns[4].width} value={placeOf(warehouse)} />
                <TextCell width={columns[5].width} value={warehouse.address} muted />
                <span className="record-table__cell record-table__cell--actions" role="cell" style={{ width: actionsWidth }}>
                  <RowMenu label={`${name} deposu işlemleri`}>
                    {(close) => <RowMenuItem label="Bu Depodan Gönderi Oluştur" onSelect={() => { close(); onCreateShipment(warehouse.id); }} />}
                  </RowMenu>
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function TextCell({ width, value, muted = false }: { readonly width: number; readonly value: string | null; readonly muted?: boolean }) {
  const text = value === null || value.trim() === '' ? undefined : value;
  return (
    <span className={muted ? 'record-table__cell record-table__cell--muted' : 'record-table__cell'} role="cell" style={{ width }}>
      <span className="record-table__text" title={text}>{text ?? '—'}</span>
    </span>
  );
}

// Warehouse / Create (15:1763).
function WarehouseForm({ onCancel, onCreated }: {
  readonly onCancel: () => void;
  readonly onCreated: (warehouse: CreatedWarehouse) => void;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const locations = useLocations(draft.stateId);

  // Validation contract (29 — Handoff): focus the first invalid control once
  // the error state has rendered.
  useEffect(() => {
    if (focusRequest === 0) return;
    panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const validate = (): Errors => {
    const found: Errors = {};
    if (draft.name.trim() === '') found.name = requiredMessage;
    if (draft.contactName.trim() === '') found.contactName = requiredMessage;
    const phone = phoneError(draft.contactPhone);
    if (phone !== undefined) found.contactPhone = phone;
    if (draft.address.trim() === '') found.address = requiredMessage;
    if (draft.stateId === '') found.stateId = chooseMessage;
    if (draft.cityId === '') found.cityId = chooseMessage;
    if (draft.taxNumber.trim() === '') found.taxNumber = requiredMessage;
    return found;
  };

  const save = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFocusRequest((value) => value + 1);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const warehouse = await window.kargonomi.warehouses.create({
        name: draft.name.trim(),
        isMain: draft.isMain,
        contactName: draft.contactName.trim(),
        contactPhone: draft.contactPhone.trim(),
        address: draft.address.trim(),
        stateId: Number(draft.stateId),
        cityId: Number(draft.cityId),
        taxNumber: draft.taxNumber.trim(),
      });
      // The name shown is the one just saved; the id is used only when the
      // response carries a valid one.
      onCreated({ id: Number.isSafeInteger(warehouse.id) && warehouse.id > 0 ? warehouse.id : undefined, name: draft.name.trim() });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const errorCount = Object.keys(errors).length;
  const fieldState = (key: keyof Draft) => (errors[key] === undefined ? 'default' as const : 'error' as const);

  return (
    <main className="main-content">
      <div className="form-wrapper">
        <h1 className="form-wrapper__title">Depo Oluştur</h1>
        <p className="form-wrapper__description">Yeni gönderilerde kullanılabilecek gönderici/depo bilgisini kaydedin.</p>

        {errorCount > 0 ? (
          <div className="banner banner--error" role="alert">
            <p className="banner__title">{errorCount} alanı kontrol edin</p>
            <p className="banner__text">İlk hatalı alan odaklanır; hata mesajları ilgili alanın altında kalır.</p>
          </div>
        ) : null}

        {failed ? (
          <div className="banner banner--error" role="alert">
            <p className="banner__title">Depo kaydedilemedi</p>
            <p className="banner__text">API isteği başarısız oldu. Form verileri korunuyor; tekrar deneyebilirsiniz.</p>
          </div>
        ) : null}

        <section ref={panel} className="form-panel" aria-label="Depo bilgileri">
          <div className="field-row">
            <TextField label="Depo Adı" value={draft.name} state={fieldState('name')} message={errors.name} onChange={(event) => set('name', event.target.value)} />
            <SwitchField label="Ana Depo" checked={draft.isMain} onChange={(checked) => set('isMain', checked)} onText="Evet" offText="Hayır" />
          </div>
          <div className="field-row">
            <TextField label="Yetkili" value={draft.contactName} state={fieldState('contactName')} message={errors.contactName} onChange={(event) => set('contactName', event.target.value)} />
            <TextField label="Telefon" type="tel" value={draft.contactPhone} state={fieldState('contactPhone')} message={errors.contactPhone} onChange={(event) => set('contactPhone', event.target.value)} />
          </div>
          <TextField label="Adres" value={draft.address} state={fieldState('address')} message={errors.address} onChange={(event) => set('address', event.target.value)} />
          <div className="field-row">
            <SelectField label="İl" placeholder="İl seçin" options={locations.stateOptions} menuState={locations.statesState} value={draft.stateId} state={fieldState('stateId')} message={errors.stateId} onChange={(value) => setDraft((current) => ({ ...current, stateId: value, cityId: '' }))} />
            <SelectField label="İlçe" placeholder="İlçe seçin" options={locations.cityOptions} menuState={locations.citiesState} disabled={draft.stateId === ''} value={draft.cityId} state={fieldState('cityId')} message={errors.cityId} onChange={(value) => set('cityId', value)} />
          </div>
          <TextField label="Vergi Numarası" inputMode="numeric" value={draft.taxNumber} state={fieldState('taxNumber')} message={errors.taxNumber} onChange={(event) => set('taxNumber', event.target.value)} />
        </section>

        <div className="form-actions">
          <Button hierarchy="secondary" disabled={busy} onClick={onCancel}>Vazgeç</Button>
          <Button hierarchy="primary" data-save-shortcut aria-keyshortcuts="Control+S Meta+S" loading={busy} onClick={() => void save()}>Depoyu Kaydet</Button>
        </div>
      </div>
    </main>
  );
}
