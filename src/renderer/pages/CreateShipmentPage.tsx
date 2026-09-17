// Figma page "14 — Create Shipment": Step 1 Sender / Warehouse (11:2) and
// Manual (11:159), Step 2 Recipient (11:342), Step 3 Packages (11:524),
// Step 4 Review (11:691), Validation Errors (11:863), Submitting (11:1047),
// Success (11:1203) and API Failure (11:1355).

import type { Location, Shipment, ShipmentWriteInput, WarehouseRecord } from '@kargonomi/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, SelectField, Stepper, TextField, type SelectOption } from '../components/Kit.tsx';
import type { ListMenuState } from '../components/Listbox.tsx';
import { chooseMessage, emailError, phoneError, requiredMessage } from '../lib/validation.ts';
import { useWarehousePlaces, warehouseLabel } from '../lib/warehouses.ts';

const steps = ['Gönderici', 'Alıcı', 'Paketler', 'Kontrol'] as const;

interface PackageDraft {
  content: string;
  barcode: string;
  desi: string;
}

interface Draft {
  senderMode: 'warehouse' | 'manual';
  warehouseId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderStateId: string;
  senderCityId: string;
  senderTaxNumber: string;
  senderTaxPlace: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerTaxNumber: string;
  buyerTaxPlace: string;
  buyerAddress: string;
  buyerStateId: string;
  buyerCityId: string;
  packages: PackageDraft[];
}

const emptyDraft: Draft = {
  senderMode: 'warehouse',
  warehouseId: '',
  senderName: '',
  senderPhone: '',
  senderAddress: '',
  senderStateId: '',
  senderCityId: '',
  senderTaxNumber: '',
  senderTaxPlace: '',
  buyerName: '',
  buyerPhone: '',
  buyerEmail: '',
  buyerTaxNumber: '',
  buyerTaxPlace: '',
  buyerAddress: '',
  buyerStateId: '',
  buyerCityId: '',
  packages: [{ content: '', barcode: '', desi: '' }],
};

// "Verileriniz formda korunuyor" (11:1497): the draft outlives the screen, so
// opening Diagnostics from the failure state and coming back keeps the input.
let savedDraft: Draft | undefined;
let savedStep = 0;

type Phase = 'form' | 'submitting' | 'success' | 'failure';

const required = requiredMessage;
const choose = chooseMessage;

export interface CreateShipmentPageProps {
  readonly warehouses: readonly WarehouseRecord[];
  readonly warehousesState: ListMenuState;
  // Chosen with "Bu Depodan Gönderi Oluştur" on Depolar.
  readonly preferredWarehouseId?: number | undefined;
  readonly onCancel: () => void;
  readonly onDetail: (id: number) => void;
  readonly onPricing: (id: number) => void;
  readonly onDiagnostics: () => void;
}

export function CreateShipmentPage({ warehouses, warehousesState, preferredWarehouseId, onCancel, onDetail, onPricing, onDiagnostics }: CreateShipmentPageProps) {
  const [step, setStep] = useState(savedStep);
  const [draft, setDraft] = useState<Draft>(savedDraft ?? emptyDraft);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [phase, setPhase] = useState<Phase>('form');
  const [created, setCreated] = useState<Shipment>();
  const [focusRequest, setFocusRequest] = useState(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => { savedDraft = draft; savedStep = step; }, [draft, step]);

  // Focus the first invalid control once the error state has rendered.
  useEffect(() => {
    if (focusRequest === 0) return;
    panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  const senderLocations = useLocations(draft.senderStateId);
  const buyerLocations = useLocations(draft.buyerStateId);
  const placeOf = useWarehousePlaces(warehouses);

  // A warehouse picked on Depolar starts the sender step with that warehouse.
  useEffect(() => {
    if (preferredWarehouseId === undefined) return;
    setDraft((current) => ({ ...current, senderMode: 'warehouse', warehouseId: String(preferredWarehouseId) }));
    setStep(0);
    setErrors({});
  }, [preferredWarehouseId]);

  // Otherwise the main warehouse is offered while nothing has been chosen.
  useEffect(() => {
    if (draft.senderMode !== 'warehouse' || draft.warehouseId !== '') return;
    const main = warehouses.find((warehouse) => warehouse.isMain);
    if (main !== undefined) setDraft((current) => (current.warehouseId === '' ? { ...current, warehouseId: String(main.id) } : current));
  }, [draft.senderMode, draft.warehouseId, warehouses]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const setPackage = (index: number, key: keyof PackageDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      packages: current.packages.map((item, position) => (position === index ? { ...item, [key]: value } : item)),
    }));
  };

  const validate = useCallback((target: number): Readonly<Record<string, string>> => {
    const found: Record<string, string> = {};
    if (target === 0) {
      if (draft.senderMode === 'warehouse') {
        if (draft.warehouseId === '') found['warehouseId'] = choose;
      } else {
        if (draft.senderName.trim() === '') found['senderName'] = required;
        const phone = phoneError(draft.senderPhone);
        if (phone !== undefined) found['senderPhone'] = phone;
        if (draft.senderAddress.trim() === '') found['senderAddress'] = required;
        if (draft.senderStateId === '') found['senderStateId'] = choose;
        if (draft.senderCityId === '') found['senderCityId'] = choose;
      }
    }
    if (target === 1) {
      if (draft.buyerName.trim() === '') found['buyerName'] = required;
      const phone = phoneError(draft.buyerPhone);
      if (phone !== undefined) found['buyerPhone'] = phone;
      const email = emailError(draft.buyerEmail);
      if (email !== undefined) found['buyerEmail'] = email;
      if (draft.buyerAddress.trim() === '') found['buyerAddress'] = required;
      if (draft.buyerStateId === '') found['buyerStateId'] = choose;
      if (draft.buyerCityId === '') found['buyerCityId'] = choose;
    }
    if (target === 2) {
      draft.packages.forEach((item, index) => {
        const desi = item.desi.trim().replace(',', '.');
        if (desi === '') found[`desi-${index}`] = required;
        else if (!(Number(desi) > 0)) found[`desi-${index}`] = 'Geçerli bir desi değeri girin.';
      });
    }
    return found;
  }, [draft]);

  // Validation contract: field message + section summary + focus first invalid.
  const advance = () => {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFocusRequest((value) => value + 1);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const back = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  };

  const submit = async () => {
    for (const target of [0, 1, 2]) {
      const found = validate(target);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        setStep(target);
        setPhase('form');
        setFocusRequest((value) => value + 1);
        return;
      }
    }
    setPhase('submitting');
    try {
      setCreated(await window.kargonomi.shipments.create(toInput(draft)));
      savedDraft = undefined;
      savedStep = 0;
      setPhase('success');
    } catch {
      setPhase('failure');
    }
  };

  const restart = () => {
    savedDraft = undefined;
    savedStep = 0;
    setDraft(emptyDraft);
    setStep(0);
    setErrors({});
    setCreated(undefined);
    setPhase('form');
  };

  const errorCount = Object.keys(errors).length;
  const fieldState = (key: string) => (errors[key] === undefined ? 'default' as const : 'error' as const);
  const packageSummary = `${draft.packages.length} paket · ${totalDesi(draft)} desi`;
  const warehouseOptions = useMemo<readonly SelectOption[]>(() => warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouseLabel(warehouse) })), [warehouses]);

  if (phase === 'submitting') {
    return (
      <main className="main-content main-content--dense">
        <div className="form-wrapper">
          <Stepper steps={steps} current={3} />
          <h1 className="form-wrapper__title">Gönderi oluşturuluyor</h1>
          <p className="form-wrapper__description">Bilgiler Kargonomi API’ye gönderiliyor.</p>
          <div className="banner" role="status">
            <p className="banner__title">İşlem devam ediyor</p>
            <p className="banner__text">Çift gönderimi önlemek için oluşturma aksiyonu geçici olarak devre dışıdır.</p>
          </div>
          <section className="form-panel">
            <h2 className="form-panel__title">Gönderi Özeti</h2>
            <SummaryRow label="Alıcı" value={draft.buyerName} />
            <SummaryRow label="Paket" value={packageSummary} />
            <SummaryRow label="Gönderici" value={senderSummary(draft, warehouses)} />
          </section>
          <div><Button hierarchy="primary" loading>Gönderi Oluşturuluyor…</Button></div>
        </div>
      </main>
    );
  }

  if (phase === 'success' && created !== undefined) {
    return (
      <main className="main-content main-content--dense">
        <div className="form-wrapper">
          <Stepper steps={steps} current={steps.length} />
          <h1 className="form-wrapper__title">Gönderi başarıyla oluşturuldu.</h1>
          <p className="form-wrapper__description">Gönderi kaydı oluşturuldu; sonraki adımda fiyat seçeneklerini karşılaştırabilirsiniz.</p>
          <div className="banner banner--success" role="status">
            <p className="banner__title">Gönderi #{created.id}</p>
            <p className="banner__text">Kayıt başarıyla oluşturuldu. Henüz taşıyıcı seçilmedi.</p>
          </div>
          <section className="form-panel">
            <h2 className="form-panel__title">Sonraki İşlemler</h2>
            <div className="next-actions">
              <Button hierarchy="primary" leadingIcon="shipment-scale" onClick={() => onPricing(created.id)}>Fiyatları Karşılaştır</Button>
              <Button hierarchy="secondary" leadingIcon="shipment-package" onClick={() => onDetail(created.id)}>Gönderi Detayı</Button>
              <Button hierarchy="ghost" leadingIcon="shipment-package-add" onClick={restart}>Yeni Gönderi Oluştur</Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (phase === 'failure') {
    return (
      <main className="main-content main-content--dense">
        <div className="form-wrapper">
          <Stepper steps={steps} current={3} />
          <h1 className="form-wrapper__title">Gönderi oluşturulamadı</h1>
          <p className="form-wrapper__description">Girdiğiniz bilgiler korunmuştur; bağlantı sorununu giderip tekrar deneyebilirsiniz.</p>
          <div className="banner banner--error" role="alert">
            <p className="banner__title">API isteği başarısız oldu</p>
            <p className="banner__text">Güvenli hata ayrıntısı: işlem tamamlanmadı. Verileriniz formda korunuyor.</p>
          </div>
          <section className="form-panel">
            <h2 className="form-panel__title">Korunan Form Verileri</h2>
            <SummaryRow label="Alıcı" value={draft.buyerName} />
            <SummaryRow label="Adres" value={draft.buyerAddress} />
            <SummaryRow label="Paket" value={packageSummary} />
            <div className="next-actions">
              <Button hierarchy="secondary" onClick={onDiagnostics}>Tanılamayı Aç</Button>
              <Button hierarchy="primary" leadingIcon="action-refresh" onClick={() => void submit()}>Tekrar Dene</Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const description = step === 0 && draft.senderMode === 'manual' ? 'Gönderici bilgilerini manuel olarak girin.' : stepDescriptions[step];

  return (
    <main className="main-content main-content--dense">
      <div className="form-wrapper" ref={panel}>
        <Stepper steps={steps} current={step} />
        <h1 className="form-wrapper__title">{stepTitles[step]}</h1>
        <p className="form-wrapper__description">{errorCount > 0 ? 'Hatalı alanları düzeltmeden devam edemezsiniz.' : description}</p>

        {errorCount > 0 ? (
          <div className="banner banner--error" role="alert">
            <p className="banner__title">{errorCount} alanı kontrol edin</p>
            <p className="banner__text">İlk hatalı alan odaklanır; hata mesajları ilgili alanın altında kalır.</p>
          </div>
        ) : null}

        {step === 0 ? (
          <section className="form-panel">
            <h2 className="form-panel__title">Gönderici Seçimi</h2>
            <div className="mode-switch" role="radiogroup" aria-label="Gönderici Seçimi">
              <button type="button" role="radio" className="mode-switch__option" aria-checked={draft.senderMode === 'warehouse'} onClick={() => { set('senderMode', 'warehouse'); setErrors({}); }}>Depodan Gönder</button>
              <button type="button" role="radio" className="mode-switch__option" aria-checked={draft.senderMode === 'manual'} onClick={() => { set('senderMode', 'manual'); setErrors({}); }}>Gönderici Bilgilerini Gir</button>
            </div>
            {draft.senderMode === 'warehouse' ? (
              <>
                <SelectField label="Depo" placeholder="Depo seçin" options={warehouseOptions} menuState={warehousesState} value={draft.warehouseId} state={fieldState('warehouseId')} message={errors['warehouseId']} onChange={(value) => set('warehouseId', value)} />
                <p className="form-hint">
                  {warehousesState === 'default' && warehouses.length === 0
                    ? 'Kayıtlı depo bulunamadı. Depolar ekranından depo ekleyebilir veya gönderici bilgilerini girebilirsiniz.'
                    : 'Depo seçildiğinde kayıtlı gönderici bilgileri bu gönderi için kullanılır.'}
                </p>
              </>
            ) : (
              <>
                <div className="field-row">
                  <TextField label="Ad Soyad / Ünvan" value={draft.senderName} state={fieldState('senderName')} message={errors['senderName']} onChange={(event) => set('senderName', event.target.value)} />
                  <TextField label="Telefon" type="tel" value={draft.senderPhone} state={fieldState('senderPhone')} message={errors['senderPhone']} onChange={(event) => set('senderPhone', event.target.value)} />
                </div>
                <TextField label="Adres" value={draft.senderAddress} state={fieldState('senderAddress')} message={errors['senderAddress']} onChange={(event) => set('senderAddress', event.target.value)} />
                <div className="field-row">
                  <SelectField label="İl" placeholder="İl seçin" options={senderLocations.stateOptions} menuState={senderLocations.statesState} value={draft.senderStateId} state={fieldState('senderStateId')} message={errors['senderStateId']} onChange={(value) => setDraft((current) => ({ ...current, senderStateId: value, senderCityId: '' }))} />
                  <SelectField label="İlçe" placeholder="İlçe seçin" options={senderLocations.cityOptions} menuState={senderLocations.citiesState} disabled={draft.senderStateId === ''} value={draft.senderCityId} state={fieldState('senderCityId')} message={errors['senderCityId']} onChange={(value) => set('senderCityId', value)} />
                </div>
                <div className="field-row">
                  <TextField label="Vergi Numarası" value={draft.senderTaxNumber} onChange={(event) => set('senderTaxNumber', event.target.value)} />
                  <TextField label="Vergi Dairesi" value={draft.senderTaxPlace} onChange={(event) => set('senderTaxPlace', event.target.value)} />
                </div>
              </>
            )}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="form-panel">
            <h2 className="form-panel__title">Alıcı</h2>
            <div className="field-row">
              <TextField label="Ad Soyad" value={draft.buyerName} state={fieldState('buyerName')} message={errors['buyerName']} onChange={(event) => set('buyerName', event.target.value)} />
              <TextField label="Telefon" type="tel" value={draft.buyerPhone} state={fieldState('buyerPhone')} message={errors['buyerPhone']} onChange={(event) => set('buyerPhone', event.target.value)} />
            </div>
            <div className="field-row">
              <TextField label="E-posta" type="email" value={draft.buyerEmail} state={fieldState('buyerEmail')} message={errors['buyerEmail']} onChange={(event) => set('buyerEmail', event.target.value)} />
              <TextField label="T.C. / Vergi No (opsiyonel)" value={draft.buyerTaxNumber} onChange={(event) => set('buyerTaxNumber', event.target.value)} />
            </div>
            <TextField label="Vergi Dairesi (opsiyonel)" value={draft.buyerTaxPlace} onChange={(event) => set('buyerTaxPlace', event.target.value)} />
            <TextField label="Adres" value={draft.buyerAddress} state={fieldState('buyerAddress')} message={errors['buyerAddress']} onChange={(event) => set('buyerAddress', event.target.value)} />
            <div className="field-row">
              <SelectField label="İl" placeholder="İl seçin" options={buyerLocations.stateOptions} menuState={buyerLocations.statesState} value={draft.buyerStateId} state={fieldState('buyerStateId')} message={errors['buyerStateId']} onChange={(value) => setDraft((current) => ({ ...current, buyerStateId: value, buyerCityId: '' }))} />
              <SelectField label="İlçe" placeholder="İlçe seçin" options={buyerLocations.cityOptions} menuState={buyerLocations.citiesState} disabled={draft.buyerStateId === ''} value={draft.buyerCityId} state={fieldState('buyerCityId')} message={errors['buyerCityId']} onChange={(value) => set('buyerCityId', value)} />
            </div>
          </section>
        ) : null}

        {step === 2 ? draft.packages.map((item, index) => (
          <section className="form-panel" key={index}>
            <h2 className="form-panel__title">Paket #{index + 1}</h2>
            <TextField label="İçerik" value={item.content} onChange={(event) => setPackage(index, 'content', event.target.value)} />
            <div className="field-row">
              <TextField label="Barkod" value={item.barcode} onChange={(event) => setPackage(index, 'barcode', event.target.value)} />
              <TextField label="Desi" inputMode="decimal" value={item.desi} state={fieldState(`desi-${index}`)} message={errors[`desi-${index}`]} onChange={(event) => setPackage(index, 'desi', event.target.value)} />
            </div>
            {index === draft.packages.length - 1 ? (
              <div className="package-tools">
                <span className="package-tools__count">Paket sayısı: {draft.packages.length}</span>
                <div className="package-actions">
                  <Button
                    hierarchy="ghost"
                    leadingIcon="action-delete"
                    disabled={draft.packages.length === 1}
                    onClick={() => setDraft((current) => ({ ...current, packages: current.packages.slice(0, -1) }))}
                  >
                    Paketi Kaldır
                  </Button>
                  <Button
                    hierarchy="secondary"
                    leadingIcon="action-add"
                    onClick={() => setDraft((current) => ({ ...current, packages: [...current.packages, { content: '', barcode: '', desi: '' }] }))}
                  >
                    Paket Ekle
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        )) : null}

        {step === 3 ? (
          <>
            <section className="form-panel">
              <h2 className="form-panel__title">Gönderici</h2>
              <SummaryRow label="Kaynak" value={senderSummary(draft, warehouses)} />
              <SummaryRow label="Şehir / İlçe" value={senderLocation(draft, warehouses, senderLocations, placeOf)} />
              <button type="button" className="summary-edit" onClick={() => setStep(0)}>Düzenle</button>
            </section>
            <section className="form-panel">
              <h2 className="form-panel__title">Alıcı</h2>
              <SummaryRow label="Ad Soyad" value={draft.buyerName} />
              <SummaryRow label="Telefon" value={draft.buyerPhone} />
              <SummaryRow label="Adres" value={[draft.buyerAddress, locationSummary(buyerLocations, draft.buyerStateId, draft.buyerCityId)].filter((part) => part !== '').join(', ')} />
              <button type="button" className="summary-edit" onClick={() => setStep(1)}>Düzenle</button>
            </section>
            <section className="form-panel">
              <h2 className="form-panel__title">Paketler</h2>
              {draft.packages.map((item, index) => (
                <SummaryRow key={index} label={`Paket #${index + 1}`} value={[item.content, `${item.desi} desi`, item.barcode === '' ? '' : `Barkod ${item.barcode}`].filter((part) => part !== '').join(' · ')} />
              ))}
              <button type="button" className="summary-edit" onClick={() => setStep(2)}>Düzenle</button>
            </section>
          </>
        ) : null}

        <div className="form-footer">
          {step === 0
            ? <Button hierarchy="secondary" onClick={() => { savedDraft = undefined; savedStep = 0; onCancel(); }}>Vazgeç</Button>
            : <Button hierarchy="secondary" leadingIcon="control-chevron-left" onClick={back}>{backLabels[step]}</Button>}
          {step === 3
            ? <Button hierarchy="primary" leadingIcon="shipment-package-add" onClick={() => void submit()}>Gönderiyi Oluştur</Button>
            : step === 2
              ? <Button hierarchy="primary" onClick={advance}>Kontrol Et</Button>
              : <Button hierarchy="primary" trailingIcon="control-chevron-right" onClick={advance}>Devam</Button>}
        </div>
      </div>
    </main>
  );
}

const stepTitles = ['Gönderici', 'Alıcı Bilgileri', 'Paketler', 'Gönderiyi Kontrol Et'] as const;

const stepDescriptions = [
  'Gönderinin hangi depo veya gönderici bilgisiyle çıkacağını belirleyin.',
  'Teslimat için gerekli alıcı ve adres bilgilerini girin.',
  'Gönderideki paketleri ve fiziksel gönderi bilgilerini tanımlayın.',
  'Gönderiyi oluşturmadan önce bilgileri son kez doğrulayın.',
] as const;

const backLabels = ['Vazgeç', 'Göndericiye Dön', 'Alıcıya Dön', 'Paketlere Dön'] as const;

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="summary-row">
      <span className="summary-row__label">{label}</span>
      <span className="summary-row__value">{value === '' ? '—' : value}</span>
    </div>
  );
}

export interface LocationLookup {
  readonly states: readonly Location[];
  readonly cities: readonly Location[];
  readonly stateOptions: readonly SelectOption[];
  readonly cityOptions: readonly SelectOption[];
  readonly statesState: 'default' | 'loading' | 'error';
  readonly citiesState: 'default' | 'loading' | 'error';
}

export function useLocations(stateId: string): LocationLookup {
  const [states, setStates] = useState<readonly Location[]>([]);
  const [cities, setCities] = useState<readonly Location[]>([]);
  const [statesState, setStatesState] = useState<'default' | 'loading' | 'error'>('loading');
  const [citiesState, setCitiesState] = useState<'default' | 'loading' | 'error'>('default');

  useEffect(() => {
    let active = true;
    setStatesState('loading');
    window.kargonomi.locations.states()
      .then((value) => { if (active) { setStates(value); setStatesState('default'); } })
      .catch(() => { if (active) { setStates([]); setStatesState('error'); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (stateId === '') { setCities([]); setCitiesState('default'); return undefined; }
    let active = true;
    setCitiesState('loading');
    window.kargonomi.locations.cities(Number(stateId))
      .then((value) => { if (active) { setCities(value); setCitiesState('default'); } })
      .catch(() => { if (active) { setCities([]); setCitiesState('error'); } });
    return () => { active = false; };
  }, [stateId]);

  return useMemo(() => ({
    states,
    cities,
    stateOptions: states.map((state) => ({ value: String(state.id), label: state.name })),
    cityOptions: cities.map((city) => ({ value: String(city.id), label: city.name })),
    statesState,
    citiesState,
  }), [cities, citiesState, states, statesState]);
}

function totalDesi(draft: Draft): string {
  const sum = draft.packages.reduce((total, item) => total + (Number(item.desi.replace(',', '.')) || 0), 0);
  return sum.toLocaleString('tr-TR');
}

function senderSummary(draft: Draft, warehouses: readonly WarehouseRecord[]): string {
  if (draft.senderMode === 'manual') return draft.senderName;
  const warehouse = warehouses.find((item) => String(item.id) === draft.warehouseId);
  return warehouse === undefined ? '' : warehouseLabel(warehouse);
}

function senderLocation(draft: Draft, warehouses: readonly WarehouseRecord[], lookup: LocationLookup, placeOf: (warehouse: WarehouseRecord) => string): string {
  if (draft.senderMode === 'manual') return locationSummary(lookup, draft.senderStateId, draft.senderCityId);
  const warehouse = warehouses.find((item) => String(item.id) === draft.warehouseId);
  return warehouse === undefined ? '' : placeOf(warehouse);
}

function locationSummary(lookup: LocationLookup, stateId: string, cityId: string): string {
  const state = lookup.states.find((item) => String(item.id) === stateId)?.name;
  const city = lookup.cities.find((item) => String(item.id) === cityId)?.name;
  return [state, city].filter((part): part is string => part !== undefined).join(' / ');
}

function toInput(draft: Draft): ShipmentWriteInput {
  const base = {
    buyerName: draft.buyerName.trim(),
    buyerEmail: draft.buyerEmail.trim() === '' ? null : draft.buyerEmail.trim(),
    buyerTaxNumber: draft.buyerTaxNumber.trim() === '' ? null : draft.buyerTaxNumber.trim(),
    buyerTaxPlace: draft.buyerTaxPlace.trim() === '' ? null : draft.buyerTaxPlace.trim(),
    buyerPhone: draft.buyerPhone.trim(),
    buyerAddress: draft.buyerAddress.trim(),
    buyerStateId: Number(draft.buyerStateId),
    buyerCityId: Number(draft.buyerCityId),
    packages: draft.packages.map((item) => ({
      desi: item.desi.trim().replace(',', '.'),
      content: item.content.trim() === '' ? null : item.content.trim(),
      barcode: item.barcode.trim() === '' ? null : item.barcode.trim(),
    })),
  };
  if (draft.senderMode === 'warehouse') return { ...base, warehouseId: Number(draft.warehouseId) };
  return {
    ...base,
    senderName: draft.senderName.trim(),
    senderPhone: draft.senderPhone.trim(),
    senderAddress: draft.senderAddress.trim(),
    senderStateId: Number(draft.senderStateId),
    senderCityId: Number(draft.senderCityId),
    senderTaxNumber: draft.senderTaxNumber.trim() === '' ? null : draft.senderTaxNumber.trim(),
    senderTaxPlace: draft.senderTaxPlace.trim() === '' ? null : draft.senderTaxPlace.trim(),
  };
}
