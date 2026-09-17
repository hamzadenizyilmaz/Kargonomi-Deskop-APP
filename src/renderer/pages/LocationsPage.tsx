// Figma page "19 — Locations": Utility Default (15:2068), Cascading Loading
// (15:2220), Error (15:2370) and No Data (15:2523).
// This screen is a service health and cascading-selection utility, not
// master-data CRUD — exactly as the design states.

import type { Location } from '@kargonomi/client';
import { useEffect, useMemo, useState } from 'react';

import { Button, SelectField, type FieldState } from '../components/Kit.tsx';

type ServiceState = 'loading' | 'ok' | 'error' | 'empty';

// Health cards (15:2199): the value and the card border share one status colour.
const services: Record<ServiceState, { readonly label: string; readonly tone: 'success' | 'warning' | 'error' }> = {
  loading: { label: 'Yükleniyor', tone: 'warning' },
  ok: { label: 'Çalışıyor', tone: 'success' },
  error: { label: 'Hata', tone: 'error' },
  empty: { label: 'Veri Yok', tone: 'warning' },
};

export function LocationsPage() {
  const [states, setStates] = useState<readonly Location[]>([]);
  const [cities, setCities] = useState<readonly Location[]>([]);
  const [stateService, setStateService] = useState<ServiceState>('loading');
  const [cityService, setCityService] = useState<ServiceState>('loading');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [check, setCheck] = useState(0);

  // Every Locations frame shows a selected province, so the first one is
  // picked once the list arrives and the district service is checked with it.
  useEffect(() => {
    let active = true;
    setStateService('loading');
    window.kargonomi.locations.states()
      .then((value) => {
        if (!active) return;
        setStates(value);
        setStateService(value.length === 0 ? 'empty' : 'ok');
        setStateId((current) => (value.some((state) => String(state.id) === current) ? current : value[0] === undefined ? '' : String(value[0].id)));
      })
      .catch(() => { if (active) { setStates([]); setStateId(''); setStateService('error'); } });
    return () => { active = false; };
  }, [check]);

  // Changing the province clears the district selection and reloads the list.
  useEffect(() => {
    setCityId('');
    if (stateId === '') { setCities([]); return undefined; }
    let active = true;
    setCityService('loading');
    window.kargonomi.locations.cities(Number(stateId))
      .then((value) => { if (active) { setCities(value); setCityService(value.length === 0 ? 'empty' : 'ok'); } })
      .catch(() => { if (active) { setCities([]); setCityService('error'); } });
    return () => { active = false; };
  }, [stateId, check]);

  // Without a province there is nothing to ask the district service for.
  const cityStatus: ServiceState = stateId === '' ? (stateService === 'loading' ? 'loading' : 'empty') : cityService;
  const stateOptions = useMemo(() => states.map((state) => ({ value: String(state.id), label: state.name })), [states]);
  const cityOptions = useMemo(() => cities.map((city) => ({ value: String(city.id), label: city.name })), [cities]);
  const failed = stateService === 'error' || cityStatus === 'error';
  const recheck = () => setCheck((value) => value + 1);

  const cityHint = cityStatus === 'error'
    ? 'İlçe listesi alınamadı. İl değişirse eski ilçe seçimi temizlenir.'
    : cityStatus === 'empty' && stateId !== ''
      ? 'Seçilen il için ilçe verisi bulunamadı.'
      : 'İl değiştiğinde mevcut ilçe seçimi sıfırlanır ve yeni liste yüklenir.';

  return (
    <main className="main-content">
      <div className="form-wrapper">
        <h1 className="form-wrapper__title">Lokasyon Servisi</h1>
        <p className="form-wrapper__description">İl ve ilçe servislerinin durumunu kontrol edin ve bağımlı seçim davranışını test edin. Bu ekran master-data CRUD değildir.</p>

        <div className="health-cards" role="status">
          <HealthCard label="İl Servisi" state={stateService} />
          <HealthCard label="İlçe Servisi" state={cityStatus} />
        </div>

        <section className="form-panel">
          <h2 className="form-panel__title">Bağımlı Lokasyon Seçimi</h2>
          <div className="field-row">
            <SelectField
              label="İl"
              placeholder={placeholderFor(stateService, 'İl seçin')}
              options={stateOptions}
              state={fieldStateFor(stateService)}
              menuState={stateService === 'loading' ? 'loading' : stateService === 'error' ? 'error' : 'default'}
              message={stateService === 'error' ? 'İl listesi alınamadı.' : undefined}
              disabled={stateService === 'empty'}
              value={stateId}
              onChange={setStateId}
            />
            <SelectField
              label="İlçe"
              placeholder={placeholderFor(cityStatus, 'İlçe seçin')}
              options={cityOptions}
              state={fieldStateFor(cityStatus)}
              menuState={cityStatus === 'loading' ? 'loading' : cityStatus === 'error' ? 'error' : 'default'}
              message={cityStatus === 'error' ? 'İlçe listesi alınamadı.' : undefined}
              disabled={cityStatus === 'empty'}
              value={cityId}
              onChange={setCityId}
            />
          </div>
          <p className={cityStatus === 'error' ? 'form-hint form-hint--error' : 'form-hint'}>{cityHint}</p>
        </section>

        {/* Default offers a re-check and Error a retry; Loading and No Data have no action. */}
        {failed ? <div><Button hierarchy="secondary" onClick={recheck}>Tekrar Dene</Button></div> : null}
        {!failed && stateService === 'ok' && cityStatus === 'ok'
          ? <div><Button hierarchy="secondary" onClick={recheck}>Servisleri Yeniden Kontrol Et</Button></div>
          : null}
      </div>
    </main>
  );
}

function HealthCard({ label, state }: { readonly label: string; readonly state: ServiceState }) {
  const service = services[state];
  return (
    <article className={`health-card health-card--${service.tone}`}>
      <span className="health-card__label">{label}</span>
      <span className="health-card__value">{service.label}</span>
    </article>
  );
}

// Select Field states (49:38): Loading, Error ("Seçim yapılamadı") and
// Disabled ("Veri yok") as the Locations frames label them.
function fieldStateFor(service: ServiceState): FieldState {
  if (service === 'loading') return 'loading';
  return service === 'error' ? 'error' : 'default';
}

function placeholderFor(service: ServiceState, fallback: string): string {
  if (service === 'error') return 'Seçim yapılamadı';
  return service === 'empty' ? 'Veri yok' : fallback;
}
