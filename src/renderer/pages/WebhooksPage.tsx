// Figma page "20 — Webhooks": List (16:2), Empty (16:204), Create (16:344),
// Success (16:505), Edit (16:641), Delete Confirmation (16:802),
// Status Error (16:947) and Loading (56:9346).
//
// API constraints (Swagger WebhookWrite): name ≥ 2 characters, an https:// URL,
// a free-form event_type whose only documented value is "shipment.updated",
// and no secret property — the Secret field therefore stays read-only. The
// Status Error frame is shown only when the API reports a failing webhook,
// which the current payload never does.

import type { Webhook, WebhookWriteInput } from '@kargonomi/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, SelectField, SwitchField, TextField, type SelectOption } from '../components/Kit.tsx';
import { RowMenu, RowMenuItem } from '../components/RowMenu.tsx';
import { Dialog, ErrorCard, PageHeader } from '../components/Ui.tsx';
import { requiredMessage } from '../lib/validation.ts';

// Webhook Table (54:10) column widths; the actions column is 86px.
const columns = [
  { label: 'Ad', width: 190 },
  { label: 'URL', width: 360 },
  { label: 'Olay Türü', width: 180 },
  { label: 'Durum', width: 120 },
  { label: 'Oluşturulma', width: 200 },
] as const;
const actionsWidth = 86;
// Webhook Table / Loading (54:66) skeleton bar widths, one per column.
const skeletonWidths = [90, 250, 110, 70, 120, 28] as const;

const eventLabels: Readonly<Record<string, string>> = { 'shipment.updated': 'Gönderi Durumu' };
const defaultEvent = 'shipment.updated';

type View = 'list' | 'create' | 'edit' | 'success';

interface Draft {
  name: string;
  url: string;
  eventType: string;
  isActive: boolean;
}

type Errors = Partial<Record<'name' | 'url', string>>;

const emptyDraft: Draft = { name: '', url: '', eventType: defaultEvent, isActive: true };

// Topbar per frame: Tümü (List, Empty, Status Error), Yükleniyor, Yeni,
// Düzenle, Başarılı and Sil.
export function WebhooksPage({ onCrumb }: { readonly onCrumb: (crumb: string) => void }) {
  const [items, setItems] = useState<readonly Webhook[]>();
  const [listFailed, setListFailed] = useState(false);
  const [view, setView] = useState<View>('list');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Errors>({});
  const [editing, setEditing] = useState<Webhook>();
  const [saved, setSaved] = useState<Webhook>();
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Webhook>();
  const [focusRequest, setFocusRequest] = useState(0);
  const panel = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    setItems(undefined);
    setListFailed(false);
    try { setItems(await window.kargonomi.webhooks.list()); }
    catch { setListFailed(true); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  let crumb = 'Tümü';
  if (pendingDelete !== undefined) crumb = 'Sil';
  else if (view === 'create') crumb = 'Yeni';
  else if (view === 'edit') crumb = 'Düzenle';
  else if (view === 'success') crumb = 'Başarılı';
  else if (items === undefined && !listFailed) crumb = 'Yükleniyor';
  useEffect(() => { onCrumb(crumb); }, [crumb, onCrumb]);

  useEffect(() => {
    if (focusRequest === 0) return;
    panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  const openForm = (webhook: Webhook | undefined) => {
    setEditing(webhook);
    setDraft(webhook === undefined ? emptyDraft : { name: webhook.name, url: webhook.url, eventType: webhook.eventType, isActive: webhook.isActive });
    setErrors({});
    setSaveFailed(false);
    setView(webhook === undefined ? 'create' : 'edit');
  };

  const backToList = () => {
    setEditing(undefined);
    setView('list');
    void load();
  };

  const submit = async () => {
    const found: Errors = {};
    const name = draft.name.trim();
    const url = draft.url.trim();
    if (name === '') found.name = requiredMessage;
    else if (name.length < 2) found.name = 'En az 2 karakter girin.';
    if (url === '') found.url = requiredMessage;
    else if (!isHttpsUrl(url)) found.url = 'Geçerli bir https:// adresi girin.';
    setErrors(found);
    if (Object.keys(found).length > 0) { setFocusRequest((value) => value + 1); return; }

    setBusy(true);
    setSaveFailed(false);
    const input: WebhookWriteInput = { name, url, eventType: draft.eventType, isActive: draft.isActive };
    try {
      const result = editing === undefined
        ? await window.kargonomi.webhooks.create(input)
        : await window.kargonomi.webhooks.update(editing.id, input);
      setSaved(result);
      setView('success');
    } catch {
      setSaveFailed(true);
    } finally { setBusy(false); }
  };

  const remove = async (webhook: Webhook) => {
    setBusy(true);
    setDeleteFailed(false);
    try {
      await window.kargonomi.webhooks.delete(webhook.id);
      setPendingDelete(undefined);
      void load();
    } catch {
      setPendingDelete(undefined);
      setDeleteFailed(true);
    } finally { setBusy(false); }
  };

  if (view === 'success' && saved !== undefined) {
    return (
      <main className="main-content">
        <section className="success-panel" role="status">
          <h1 className="success-panel__title">Webhook kaydedildi.</h1>
          <p className="success-panel__text">{saved.name} webhook’u {saved.isActive ? 'aktif' : 'pasif'} olarak kaydedildi.</p>
          <div className="next-actions">
            <Button hierarchy="secondary" leadingIcon="action-edit" onClick={() => openForm(saved)}>Webhook’u Düzenle</Button>
            <Button hierarchy="primary" leadingIcon="system-webhook" onClick={backToList}>Webhook Listesine Dön</Button>
          </div>
        </section>
      </main>
    );
  }

  if (view === 'create' || view === 'edit') {
    const errorCount = Object.keys(errors).length;
    const eventOptions: readonly SelectOption[] = eventLabels[draft.eventType] === undefined
      ? [{ value: defaultEvent, label: eventLabel(defaultEvent) }, { value: draft.eventType, label: draft.eventType }]
      : [{ value: defaultEvent, label: eventLabel(defaultEvent) }];
    return (
      <main className="main-content">
        <div className="form-wrapper">
          <h1 className="form-wrapper__title">{view === 'create' ? 'Webhook Ekle' : 'Webhook Düzenle'}</h1>
          <p className="form-wrapper__description">{view === 'create' ? 'Yeni bir webhook uç noktası tanımlayın.' : 'Mevcut webhook yapılandırmasını güncelleyin.'}</p>

          {errorCount > 0 ? (
            <div className="banner banner--error" role="alert">
              <p className="banner__title">{errorCount} alanı kontrol edin</p>
              <p className="banner__text">İlk hatalı alan odaklanır; hata mesajları ilgili alanın altında kalır.</p>
            </div>
          ) : null}

          {saveFailed ? (
            <div className="banner banner--error" role="alert">
              <p className="banner__title">Webhook kaydedilemedi</p>
              <p className="banner__text">API isteği başarısız oldu. Form verileri korunuyor; tekrar deneyebilirsiniz.</p>
            </div>
          ) : null}

          <section ref={panel} className="form-panel">
            <h2 className="form-panel__title">Webhook Ayarları</h2>
            <div className="field-row">
              <TextField label="Ad" value={draft.name} state={errors.name === undefined ? 'default' : 'error'} message={errors.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              <TextField label="URL" type="url" spellCheck={false} value={draft.url} state={errors.url === undefined ? 'default' : 'error'} message={errors.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} />
            </div>
            <div className="field-row">
              <SelectField label="Olay Türü" options={eventOptions} value={draft.eventType} onChange={(value) => setDraft({ ...draft, eventType: value })} />
              <SwitchField label="Durum" checked={draft.isActive} onChange={(checked) => setDraft({ ...draft, isActive: checked })} />
            </div>
            <TextField label="Webhook Secret (opsiyonel)" type="password" value="" placeholder="••••••••" readOnly disabled />
            <p className="form-hint">Secret değerleri güvenli alan olarak maskelenir.</p>
          </section>

          <div className="form-actions">
            <Button hierarchy="secondary" disabled={busy} onClick={backToList}>Vazgeç</Button>
            <Button hierarchy="primary" leadingIcon="action-save" data-save-shortcut aria-keyshortcuts="Control+S Meta+S" loading={busy} onClick={() => void submit()}>
              {view === 'create' ? 'Webhook Kaydet' : 'Değişiklikleri Kaydet'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content main-content--dense">
      <PageHeader
        title="Webhooks"
        description="Kargonomi olaylarını harici sistemlerinize ileten webhook uç noktalarını yönetin."
        actions={<Button hierarchy="primary" leadingIcon="action-add" onClick={() => openForm(undefined)}>Webhook Ekle</Button>}
      />

      {deleteFailed ? (
        <div className="banner banner--error" role="alert">
          <p className="banner__title">Webhook silinemedi</p>
          <p className="banner__text">API isteği başarısız oldu. Kayıt listede kalmaya devam ediyor.</p>
        </div>
      ) : null}

      {listFailed ? (
        <ErrorCard title="Webhook listesi alınamadı" text="API isteği başarısız oldu. Bağlantıyı kontrol edip yeniden deneyin." onRetry={() => void load()} />
      ) : items?.length === 0 ? (
        <div className="empty-block">
          <p className="empty-block__title">Henüz webhook yok.</p>
          <p className="empty-block__text">Kargonomi olaylarını başka sistemlere iletmek için ilk webhook’unuzu ekleyin.</p>
          <Button hierarchy="primary" leadingIcon="action-add" onClick={() => openForm(undefined)}>Webhook Ekle</Button>
        </div>
      ) : (
        <WebhookTable items={items} onEdit={openForm} onDelete={(webhook) => { setDeleteFailed(false); setPendingDelete(webhook); }} />
      )}

      {pendingDelete === undefined ? null : (
        <Dialog
          title="Webhook’u Sil"
          icon="action-delete"
          tone="error"
          dismissible={!busy}
          onClose={() => setPendingDelete(undefined)}
          actions={
            <>
              <Button hierarchy="secondary" disabled={busy} onClick={() => setPendingDelete(undefined)}>Vazgeç</Button>
              <Button hierarchy="destructive" leadingIcon="action-delete" loading={busy} onClick={() => void remove(pendingDelete)}>Webhook’u Sil</Button>
            </>
          }
        >
          <p className="k-dialog__meta">{pendingDelete.name}</p>
          <p className="k-dialog__code">{pendingDelete.url}</p>
          <p className="k-dialog__note">Silme işlemi geri alınamaz.</p>
        </Dialog>
      )}
    </main>
  );
}

function WebhookTable({ items, onEdit, onDelete }: {
  readonly items: readonly Webhook[] | undefined;
  readonly onEdit: (webhook: Webhook) => void;
  readonly onDelete: (webhook: Webhook) => void;
}) {
  return (
    <div className="record-table-scroll">
      <div className="record-table" role="table" aria-label="Webhooklar" aria-busy={items === undefined || undefined}>
        <div className="record-table__header" role="row">
          {columns.map((column) => (
            <span className="record-table__header-cell" role="columnheader" style={{ width: column.width }} key={column.label}>{column.label}</span>
          ))}
          <span className="record-table__header-cell" role="columnheader" style={{ width: actionsWidth }}><span className="sr-only">İşlemler</span></span>
        </div>
        {items === undefined
          ? Array.from({ length: 4 }, (_, row) => (
            <div className="record-table__skeleton-row" aria-hidden="true" key={row}>
              {[...columns.map((column) => column.width), actionsWidth].map((width, cell) => (
                <span className="record-table__skeleton-cell" style={{ width }} key={cell}>
                  <span className="record-table__skeleton" style={{ width: skeletonWidths[cell] }} />
                </span>
              ))}
            </div>
          ))
          : items.map((webhook) => (
            <div className="record-table__row" role="row" key={webhook.id}>
              <span className="record-table__cell" role="cell" style={{ width: columns[0].width }}>
                <span className="record-table__text" title={webhook.name}>{webhook.name}</span>
              </span>
              <span className="record-table__cell record-table__cell--mono" role="cell" style={{ width: columns[1].width }}>
                <span className="record-table__text" title={webhook.url}>{webhook.url}</span>
              </span>
              <span className="record-table__cell" role="cell" style={{ width: columns[2].width }}>
                <span className="record-table__text" title={webhook.eventType}>{eventLabel(webhook.eventType)}</span>
              </span>
              <span className={webhook.isActive ? 'record-table__cell record-status record-status--active' : 'record-table__cell record-status'} role="cell" style={{ width: columns[3].width }}>
                <span className="record-status__dot" aria-hidden="true" />
                {webhook.isActive ? 'Aktif' : 'Pasif'}
              </span>
              <span className="record-table__cell record-table__cell--muted" role="cell" style={{ width: columns[4].width }}>{createdAtOf(webhook)}</span>
              <span className="record-table__cell record-table__cell--actions" role="cell" style={{ width: actionsWidth }}>
                <RowMenu label={`${webhook.name} webhook işlemleri`}>
                  {(close) => (
                    <>
                      <RowMenuItem label="Düzenle" onSelect={() => { close(); onEdit(webhook); }} />
                      <RowMenuItem label="Sil" danger onSelect={() => { close(); onDelete(webhook); }} />
                    </>
                  )}
                </RowMenu>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// Known event types get their design label; anything else is shown as the
// provider sent it rather than being guessed.
function eventLabel(eventType: string): string {
  return eventLabels[eventType] ?? eventType;
}

function isHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}

// The webhook payload has no dedicated creation field; when the provider sends
// one it arrives inside additionalData.
function createdAtOf(webhook: Webhook): string {
  const raw = webhook.additionalData['created_at'];
  if (typeof raw !== 'string') return '—';
  const date = new Date(raw);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
