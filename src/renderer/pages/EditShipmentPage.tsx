// Figma page "15 — Edit Shipment": Default (12:2), Unsaved Changes (12:188)
// and API Error (12:385). The dialog matches Dialog / Unsaved Changes (20:36).

import type { Shipment, ShipmentPatchInput } from '@kargonomi/client';
import { useCallback, useEffect, useState } from 'react';

import { Button, SelectField, TextField } from '../components/Kit.tsx';
import { Dialog, ErrorCard, LoadingSkeleton, PageHeader } from '../components/Ui.tsx';
import { useLocations } from './CreateShipmentPage.tsx';

interface EditDraft {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerTaxNumber: string;
  buyerAddress: string;
  buyerStateId: string;
  buyerCityId: string;
  packages: readonly { content: string; desi: string; barcode: string }[];
}

export interface EditShipmentPageProps {
  readonly id: number;
  readonly onCancel: () => void;
  readonly onSaved: (id: number) => void;
}

export function EditShipmentPage({ id, onCancel, onSaved }: EditShipmentPageProps) {
  const [shipment, setShipment] = useState<Shipment>();
  const [draft, setDraft] = useState<EditDraft>();
  const [original, setOriginal] = useState<string>('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const value = await window.kargonomi.shipments.get(id);
      const next = toDraft(value);
      setShipment(value);
      setDraft(next);
      setOriginal(JSON.stringify(next));
    } catch { setLoadFailed(true); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const locations = useLocations(draft?.buyerStateId ?? '');

  // The shipment carries province and district names; once the location lists
  // arrive, the matching ids pre-select İl / İlçe as the Edit frame shows
  // (12:156, 12:160) without marking the form as changed.
  useEffect(() => {
    const name = shipment?.buyer?.state;
    if (draft?.buyerStateId !== '' || name === undefined || name === null) return;
    const match = locations.states.find((state) => sameName(state.name, name));
    if (match === undefined) return;
    const next = { ...draft, buyerStateId: String(match.id) };
    setDraft(next);
    setOriginal((current) => (current === JSON.stringify(draft) ? JSON.stringify(next) : current));
  }, [draft, locations.states, shipment]);

  useEffect(() => {
    const name = shipment?.buyer?.city;
    if (draft?.buyerCityId !== '' || draft.buyerStateId === '' || name === undefined || name === null) return;
    const match = locations.cities.find((city) => sameName(city.name, name));
    if (match === undefined) return;
    const next = { ...draft, buyerCityId: String(match.id) };
    setDraft(next);
    setOriginal((current) => (current === JSON.stringify(draft) ? JSON.stringify(next) : current));
  }, [draft, locations.cities, shipment]);

  if (loadFailed) {
    return (
      <main className="main-content main-content--dense">
        <div className="form-wrapper">
          <PageHeader title="Gönderiyi Düzenle" description={`Gönderi #${id} için düzenlenebilir alanları güncelleyin.`} />
          <ErrorCard title="Gönderi alınamadı" text="API isteği başarısız oldu. Bağlantıyı kontrol edip yeniden deneyin." onRetry={() => void load()} />
        </div>
      </main>
    );
  }

  if (draft === undefined || shipment === undefined) {
    return (
      <main className="main-content main-content--dense">
        <div className="form-wrapper">
          <PageHeader title="Gönderiyi Düzenle" description={`Gönderi #${id} için düzenlenebilir alanları güncelleyin.`} />
          <LoadingSkeleton lines={4} />
        </div>
      </main>
    );
  }

  const dirty = JSON.stringify(draft) !== original;
  const set = <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => setDraft((current) => (current === undefined ? current : { ...current, [key]: value }));
  const setPackage = (index: number, key: 'content' | 'desi' | 'barcode', value: string) =>
    setDraft((current) => (current === undefined ? current : { ...current, packages: current.packages.map((item, position) => (position === index ? { ...item, [key]: value } : item)) }));

  const save = async () => {
    // Nothing changed: the Default frame keeps the action enabled, so saving
    // simply returns to the detail view without a request.
    if (!dirty) { onSaved(id); return; }
    setBusy(true);
    setSaveFailed(false);
    try {
      await window.kargonomi.shipments.patch(id, toPatch(draft));
      onSaved(id);
    } catch {
      setSaveFailed(true);
    } finally { setBusy(false); }
  };

  const leave = () => { if (dirty) setConfirmLeave(true); else onCancel(); };

  return (
    <main className="main-content main-content--dense">
      <div className="form-wrapper">
        <header className="page-header">
          <div className="page-header__text">
            <h1 className="page-header__title">Gönderiyi Düzenle</h1>
            <p className="page-header__description">Gönderi #{shipment.id} için düzenlenebilir alanları güncelleyin.</p>
          </div>
          <div className="page-header__actions">
            <Button hierarchy="secondary" disabled={busy} onClick={leave}>Vazgeç</Button>
            <Button hierarchy="primary" data-save-shortcut aria-keyshortcuts="Control+S Meta+S" loading={busy} onClick={() => void save()}>Değişiklikleri Kaydet</Button>
          </div>
        </header>

        {saveFailed ? (
          <div className="banner banner--error" role="alert">
            <p className="banner__title">Değişiklikler kaydedilemedi</p>
            <p className="banner__text">API isteği başarısız oldu. Form verileri korunuyor; tekrar deneyebilirsiniz.</p>
          </div>
        ) : null}

        <section className="form-panel">
          <h2 className="form-panel__title">Alıcı Bilgileri</h2>
          <div className="field-row">
            <TextField label="Ad Soyad" value={draft.buyerName} onChange={(event) => set('buyerName', event.target.value)} />
            <TextField label="Telefon" value={draft.buyerPhone} onChange={(event) => set('buyerPhone', event.target.value)} />
          </div>
          <div className="field-row">
            <TextField label="E-posta" type="email" value={draft.buyerEmail} onChange={(event) => set('buyerEmail', event.target.value)} />
            <SelectField label="İl" placeholder="İl seçin" options={locations.stateOptions} menuState={locations.statesState} value={draft.buyerStateId} onChange={(value) => setDraft((current) => (current === undefined ? current : { ...current, buyerStateId: value, buyerCityId: '' }))} />
          </div>
          <div className="field-row">
            <SelectField label="İlçe" placeholder="İlçe seçin" options={locations.cityOptions} menuState={locations.citiesState} disabled={draft.buyerStateId === ''} value={draft.buyerCityId} onChange={(value) => set('buyerCityId', value)} />
            <TextField label="T.C. / Vergi No (opsiyonel)" value={draft.buyerTaxNumber} onChange={(event) => set('buyerTaxNumber', event.target.value)} />
          </div>
          <TextField label="Adres" value={draft.buyerAddress} onChange={(event) => set('buyerAddress', event.target.value)} />
        </section>

        {draft.packages.map((item, index) => (
          <section className="form-panel" key={index}>
            <h2 className="form-panel__title">Paket #{index + 1}</h2>
            <div className="field-row">
              <TextField label="İçerik" value={item.content} onChange={(event) => setPackage(index, 'content', event.target.value)} />
              <TextField label="Desi" inputMode="decimal" value={item.desi} onChange={(event) => setPackage(index, 'desi', event.target.value)} />
            </div>
            <TextField label="Barkod" value={item.barcode} onChange={(event) => setPackage(index, 'barcode', event.target.value)} />
          </section>
        ))}
      </div>

      {confirmLeave ? (
        <Dialog
          title="Kaydedilmemiş değişiklikleriniz var."
          icon="status-warning"
          onClose={() => setConfirmLeave(false)}
          actions={
            <>
              <Button hierarchy="ghost" onClick={() => setConfirmLeave(false)}>Devam Et</Button>
              <Button hierarchy="destructive" onClick={onCancel}>Kaydetmeden Çık</Button>
              <Button hierarchy="primary" loading={busy} onClick={() => void save()}>Değişiklikleri Kaydet</Button>
            </>
          }
        >
          <p className="k-dialog__body">Bu sayfadan ayrılırsanız son değişiklikleriniz kaybolabilir.</p>
        </Dialog>
      ) : null}
    </main>
  );
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR');
}

function toDraft(shipment: Shipment): EditDraft {
  return {
    buyerName: shipment.buyer?.name ?? shipment.buyerName ?? '',
    buyerPhone: shipment.buyer?.phone ?? '',
    buyerEmail: shipment.buyer?.email ?? '',
    buyerTaxNumber: shipment.buyer?.taxNumber ?? '',
    buyerAddress: shipment.buyer?.address ?? '',
    buyerStateId: '',
    buyerCityId: '',
    packages: shipment.shipmentPackages.map((item) => ({
      content: item.content ?? '',
      desi: item.desi,
      barcode: item.barcode ?? '',
    })),
  };
}

function toPatch(draft: EditDraft): ShipmentPatchInput {
  return {
    buyerName: draft.buyerName.trim() === '' ? null : draft.buyerName.trim(),
    buyerEmail: draft.buyerEmail.trim() === '' ? null : draft.buyerEmail.trim(),
    buyerPhone: draft.buyerPhone.trim() === '' ? null : draft.buyerPhone.trim(),
    buyerAddress: draft.buyerAddress.trim() === '' ? null : draft.buyerAddress.trim(),
    buyerStateId: draft.buyerStateId === '' ? null : Number(draft.buyerStateId),
    buyerCityId: draft.buyerCityId === '' ? null : Number(draft.buyerCityId),
    packages: draft.packages.map((item) => ({
      desi: item.desi.trim(),
      content: item.content.trim() === '' ? null : item.content.trim(),
      barcode: item.barcode.trim() === '' ? null : item.barcode.trim(),
    })),
  };
}
