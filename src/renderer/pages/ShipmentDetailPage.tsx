// Figma page "13 — Shipment Detail": Ready (10:2), Draft (10:232),
// Cancellation Requested (10:458), Cancelled (10:687), Delivered (10:916)
// and Unknown Status (10:1150).
// Context actions and the status banner change with the shipment state; the
// layout (700px main column + 428px aside) stays identical.

import type { Shipment } from '@kargonomi/client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { Button, ShipmentStatusBadge, resolveShipmentStatus, type ShipmentStatusKey } from '../components/Kit.tsx';
import { ErrorCard, LoadingSkeleton, PageHeader } from '../components/Ui.tsx';
import { liraOr } from '../lib/format.ts';

const inFlight: readonly ShipmentStatusKey[] = ['ready', 'creating', 'created', 'checking', 'inDelivery', 'notDelivered', 'returning'];

export interface ShipmentDetailPageProps {
  readonly id: number;
  readonly onEdit: () => void;
  readonly onPricing: () => void;
  readonly onBarcode: () => void;
  readonly onCancel: (carrier: string | null) => void;
  readonly onDelete: () => void;
  readonly onDiagnostics: () => void;
  // A cancel request the API accepted during this session.
  readonly cancellationRequested?: boolean;
}

export function ShipmentDetailPage({ id, onEdit, onPricing, onBarcode, onCancel, onDelete, onDiagnostics, cancellationRequested = false }: ShipmentDetailPageProps) {
  const [shipment, setShipment] = useState<Shipment>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setShipment(undefined);
    try { setShipment(await window.kargonomi.shipments.get(id)); }
    catch { setFailed(true); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (failed) {
    return (
      <main className="main-content main-content--dense">
        <PageHeader title={`Gönderi #${id}`} description="Gönderi ayrıntıları." />
        <ErrorCard title="Gönderi alınamadı" text="API isteği başarısız oldu. Bağlantıyı kontrol edip yeniden deneyin." onRetry={() => void load()} />
      </main>
    );
  }

  if (shipment === undefined) {
    return (
      <main className="main-content main-content--dense">
        <PageHeader title={`Gönderi #${id}`} description="Gönderi ayrıntıları." />
        <LoadingSkeleton lines={4} />
      </main>
    );
  }

  // Prototype Flow 3 (26): once a cancel request is accepted the screen shows
  // Cancellation Requested (10:458) even if the provider still reports the
  // earlier in-flight status; a later reported state takes over again.
  const reported = resolveShipmentStatus(shipment.status);
  const state: ShipmentStatusKey = cancellationRequested && inFlight.includes(reported) ? 'cancellationRequest' : reported;
  const banner = bannerFor(state);

  return (
    <main className="main-content main-content--dense">
      <header className="detail-header">
        <div className="detail-header__identity">
          <p className="detail-header__breadcrumb">{`Gönderiler  /  #${shipment.id}`}</p>
          <div className="detail-header__title-row">
            <h1 className="detail-header__title">Gönderi #{shipment.id}</h1>
            <ShipmentStatusBadge status={state === reported ? shipment.status : 'cancellation_request'} statusLabel={shipment.statusLabel} />
          </div>
        </div>
        <div className="detail-header__actions">
          <Button hierarchy="secondary" leadingIcon="action-refresh" onClick={() => void load()}>Yenile</Button>
          {state === 'draft' ? (
            <>
              <Button hierarchy="secondary" leadingIcon="action-edit" onClick={onEdit}>Düzenle</Button>
              <Button hierarchy="primary" leadingIcon="shipment-scale" onClick={onPricing}>Fiyatları Karşılaştır</Button>
              <Button hierarchy="destructive" leadingIcon="action-delete" onClick={onDelete}>Sil</Button>
            </>
          ) : null}
          {/* A label exists from "İşleme Hazır" onwards, so every in-flight and
              delivered state gets the Barkodu Görüntüle action the Ready and
              Delivered frames define; cancellation stops once the provider has
              closed the shipment. */}
          {inFlight.includes(state) || state === 'delivered'
            ? <Button hierarchy="primary" leadingIcon="shipment-tag" onClick={onBarcode}>Barkodu Görüntüle</Button>
            : null}
          {inFlight.includes(state)
            ? <Button hierarchy="destructive" leadingIcon="status-warning" onClick={() => onCancel(shipment.shippingProviderName)}>İptal Talebi</Button>
            : null}
          {state === 'unknown' ? <Button hierarchy="secondary" onClick={onDiagnostics}>Tanılamayı Aç</Button> : null}
        </div>
      </header>

      {banner === null ? null : (
        <div className={`banner ${banner.tone}`} role="status">
          <p className="banner__title">{banner.title}</p>
          <p className="banner__text">{banner.text}</p>
        </div>
      )}

      <div className="detail-columns">
        <div className="detail-column">
          <Section title="Özet">
            {/* Draft (10:384, 10:387) names what is still missing. */}
            <Row label="Takip Kodu" mono value={shipment.shippingWebserviceTrackingCode ?? 'Henüz oluşturulmadı'} />
            <Row label="Kargo Firması" value={shipment.shippingProviderName ?? 'Seçilmedi'} />
            <Row label="Paket Sayısı" value={String(shipment.packageCount)} />
            <Row label="Oluşturulma" value={formatDateTime(shipment.createdAt)} />
            <Row label="Son Güncelleme" value={formatDateTime(shipment.updatedAt, 'Bilgi yok')} />
          </Section>

          <Section title="Alıcı">
            <Row label="Ad Soyad" value={shipment.buyer?.name ?? shipment.buyerName ?? '—'} />
            <Row label="Telefon" value={shipment.buyer?.phone ?? '—'} />
            <Row label="E-posta" value={shipment.buyer?.email ?? '—'} />
            <Row label="Adres" value={shipment.buyer?.address ?? '—'} />
            <Row label="Şehir / İlçe" value={joinLocation(shipment.buyer?.state ?? null, shipment.buyer?.city ?? null)} />
          </Section>

          <Section title="Gönderici">
            <Row label="Kaynak" value={shipment.warehouse?.name ?? '—'} />
            <Row label="Yetkili" value={shipment.sender?.name ?? shipment.warehouse?.contactName ?? '—'} />
            <Row label="Telefon" value={shipment.sender?.phone ?? shipment.warehouse?.contactPhone ?? '—'} />
          </Section>

          <Section title="Paketler">
            {shipment.shipmentPackages.length === 0
              ? <Row label="Paket" value="—" />
              : shipment.shipmentPackages.flatMap((shipmentPackage, index) => [
                  <Row key={`content-${index}`} label={`Paket #${index + 1} İçerik`} value={shipmentPackage.content ?? '—'} />,
                  <Row key={`barcode-${index}`} label="Barkod" mono value={shipmentPackage.barcode ?? 'Henüz yok'} />,
                  <Row key={`desi-${index}`} label="Desi" value={shipmentPackage.realDesi ?? shipmentPackage.desi} />,
                ])}
          </Section>
        </div>

        <div className="detail-column">
          <Section title="Fiyatlandırma">
            <Row label="Tahmini Ücret" value={liraOr(shipment.pricing?.estimatedPrice ?? shipment.estimatedPrice)} />
            <Row label="Gerçek Ücret" value={liraOr(shipment.pricing?.realPrice ?? shipment.realPrice, 'Bekleniyor')} />
            <Row label="Ek Ücret" value={liraOr(shipment.pricing?.extraShippingPrice ?? shipment.extraShippingPrice)} />
            <Row label="Fark" value={liraOr(shipment.pricing?.priceDifference)} />
          </Section>

          {/* Draft lists two milestones (10:450), Delivered adds a fifth (10:1147). */}
          <Section title="Gönderi Zaman Çizelgesi">
            <Row label="Oluşturuldu" value={formatDateTime(shipment.createdAt)} />
            <Row label="İşleme Hazır" value={formatDateTime(shipment.shippingWebserviceCreatedAt, 'Bilgi yok')} />
            {state === 'draft' ? null : (
              <>
                <Row label="Kargo Firması Kabulü" value={formatDateTime(shipment.deliveryDateToShipmentOffice, 'Bilgi yok')} />
                <Row label="Teslim Sürecinde" value="Bilgi yok" />
              </>
            )}
            {state === 'delivered'
              ? <Row label="Teslim Edildi" value={formatDateTime(shipment.shippingProviderCustomerDeliveryDate, 'Bilgi yok')} />
              : null}
          </Section>

          {/* Unknown Status (10:1381): the raw provider value is only ever shown here. */}
          {state === 'unknown' ? (
            <Section title="Tanılama">
              <Row label="Raw provider status" mono value={shipment.status} />
              <Row label="Eşleme" value="Bilinmeyen Durum" />
            </Section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="detail-section">
      <h2 className="detail-section__title">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, mono = false }: { readonly label: string; readonly value: string; readonly mono?: boolean }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className={mono ? 'detail-row__value detail-row__value--mono' : 'detail-row__value'}>{value}</span>
    </div>
  );
}

function bannerFor(state: ShipmentStatusKey): { readonly tone: string; readonly title: string; readonly text: string } | null {
  if (state === 'cancellationRequest') {
    return { tone: '', title: 'İptal talebiniz alındı.', text: 'İptal işlemi anında tamamlanmayabilir. Kargonomi durum güncellenene kadar gönderiyi “İptal Talebi” olarak gösterecektir.' };
  }
  if (state === 'cancelled') {
    return { tone: 'banner--error', title: 'Gönderi iptal edildi.', text: 'Aktif kargo aksiyonları bu kayıt için kapatılmıştır.' };
  }
  if (state === 'delivered') {
    return { tone: 'banner--success', title: 'Gönderi teslim edildi.', text: 'Teslim bilgisi sağlayıcı tarafından güncellendi.' };
  }
  if (state === 'unknown') {
    return { tone: '', title: 'Bilinmeyen Durum', text: 'Sağlayıcıdan gelen durum eşlenemedi. Ham provider değeri yalnız Tanılama bölümünde gösterilir.' };
  }
  return null;
}

function joinLocation(state: string | null, city: string | null): string {
  const parts = [state, city].filter((part): part is string => part !== null && part !== '');
  return parts.length === 0 ? '—' : parts.join(' / ');
}

export function formatDateTime(value: string | null, fallback = '—'): string {
  if (value === null) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return fallback;
  return `${date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}
