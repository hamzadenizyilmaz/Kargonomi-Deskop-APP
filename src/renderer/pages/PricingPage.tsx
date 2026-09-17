// Figma page "16 — Price Comparison": Default (13:2), Loading (13:210),
// No Available Carrier (13:390), Confirm Carrier Modal (13:542),
// Confirming (13:760) and Confirmation Success (13:971).
// Scope guardrail (29 — Developer Handoff): the automatic option is shown as
// "Otomatik — En Uygun Seçim" and never exposes shipping_provider_id = -1.

import type { PriceOffer, Shipment } from '@kargonomi/client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../components/Kit.tsx';
import { ConfirmDialog, ErrorCard } from '../components/Ui.tsx';
import { tr } from '../i18n.ts';
import { formatLira } from '../lib/format.ts';

const automaticProviderId = -1;

// The API lists its own automatic entry (id "-1", no price). The screen shows
// it once, as the first row, under the product name.
const automaticOffer: PriceOffer = {
  id: automaticProviderId,
  name: 'Otomatik — En Uygun Seçim',
  slug: 'automatic',
  rawPrice: null,
  parsedAmount: null,
  available: true,
};

// Carrier Header (13:355) and every carrier row share these cell widths.
const columns = [
  { label: 'Kargo Firması', width: 290 },
  { label: 'Fiyat', width: 150 },
  { label: 'KDV', width: 160 },
  { label: 'Uygunluk', width: 180 },
] as const;
const actionWidth = 190;
const skeletonWidths = [240, 120, 130, 150, 150] as const;

type Phase = 'select' | 'confirming' | 'confirmed';

export interface PricingPageProps {
  readonly shipmentId: number;
  readonly onEdit: () => void;
  readonly onDetail: () => void;
  readonly onBarcode: () => void;
}

export function PricingPage({ shipmentId, onEdit, onDetail, onBarcode }: PricingPageProps) {
  const [shipment, setShipment] = useState<Shipment>();
  const [offers, setOffers] = useState<readonly PriceOffer[]>();
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<PriceOffer>();
  const [phase, setPhase] = useState<Phase>('select');
  const [confirmFailed, setConfirmFailed] = useState(false);
  const resultBanner = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setFailed(false);
    setOffers(undefined);
    // Loading (13:210) already shows the shipment summary, so the shipment is
    // read next to the slower provider price lookup.
    void window.kargonomi.shipments.get(shipmentId).then(setShipment, () => undefined);
    try {
      const comparison = await window.kargonomi.pricing.compare(shipmentId);
      setShipment(comparison.shipment);
      setOffers(comparison.offers.filter((offer) => offer.id !== automaticProviderId));
    } catch { setFailed(true); }
  }, [shipmentId]);

  useEffect(() => { void load(); }, [load]);

  // Once the dialog closes its trigger is locked (and later removed), so
  // focus moves to the banner that reports the selection instead of being lost.
  useEffect(() => {
    if (phase !== 'select' || confirmFailed) resultBanner.current?.focus();
  }, [phase, confirmFailed]);

  // Confirming (13:760): the dialog closes and every carrier action stays
  // locked until the provider answers, so the selection cannot be sent twice.
  const confirm = async (offer: PriceOffer) => {
    setPending(undefined);
    setConfirmFailed(false);
    setPhase('confirming');
    try {
      const comparison = await window.kargonomi.pricing.confirm(shipmentId, offer.id);
      setShipment(comparison.shipment);
      setPhase('confirmed');
    } catch {
      setConfirmFailed(true);
      setPhase('select');
    }
  };

  let content: ReactNode;
  if (failed) {
    content = <ErrorCard title="Fiyat seçenekleri alınamadı" text="API isteği başarısız oldu. Bağlantıyı kontrol edip yeniden deneyin." onRetry={() => void load()} />;
  } else if (phase === 'confirmed') {
    content = (
      <>
        <div ref={resultBanner} className="banner banner--success" role="status" tabIndex={-1}>
          <p className="banner__title">Kargo Firması seçildi.</p>
          <p className="banner__text">Gönderi işleme hazır hale getirildi. Barkod hazır olduğunda görüntüleyebilirsiniz.</p>
        </div>
        <div className="next-actions">
          <Button hierarchy="primary" leadingIcon="shipment-tag" onClick={onBarcode}>Barkodu Görüntüle</Button>
          <Button hierarchy="secondary" leadingIcon="shipment-package" onClick={onDetail}>Gönderiye Git</Button>
        </div>
      </>
    );
  } else if (offers !== undefined && !offers.some((offer) => offer.available)) {
    content = (
      <>
        <div className="banner" role="status">
          <p className="banner__title">Kullanılabilir kargo teklifi bulunamadı.</p>
          <p className="banner__text">Gönderi adresi, paket bilgileri veya sağlayıcı erişimini kontrol edin.</p>
        </div>
        <section className="no-carrier">
          <h2 className="no-carrier__title">Bu gönderi için kullanılabilir kargo teklifi bulunamadı.</h2>
          <p className="no-carrier__text">Gönderi bilgilerini gözden geçirip fiyat sorgusunu tekrar çalıştırın.</p>
          <Button hierarchy="secondary" leadingIcon="action-edit" onClick={onEdit}>Gönderi Bilgilerini Gözden Geçir</Button>
        </section>
      </>
    );
  } else {
    content = (
      <>
        {phase === 'confirming' ? (
          <div ref={resultBanner} className="banner" role="status" tabIndex={-1}>
            <p className="banner__title">Kargo Firması seçimi işleniyor</p>
            <p className="banner__text">Aynı işlemin iki kez gönderilmesini önlemek için seçim geçici olarak kilitlendi.</p>
          </div>
        ) : null}
        {confirmFailed ? (
          <div ref={resultBanner} className="banner banner--error" role="alert" tabIndex={-1}>
            <p className="banner__title">Kargo Firması seçilemedi.</p>
            <p className="banner__text">{tr.genericError}</p>
          </div>
        ) : null}
        <CarrierTable offers={offers} locked={phase === 'confirming'} onSelect={setPending} />
      </>
    );
  }

  return (
    <main className="main-content main-content--dense">
      <div className="form-wrapper form-wrapper--wide">
        <h1 className="form-wrapper__title">Kargo Seçenekleri</h1>
        <p className="form-wrapper__description">Bu gönderi için kullanılabilir kargo seçeneklerini karşılaştırın.</p>
        <ShipmentSummary id={shipmentId} shipment={shipment} />
        {content}
      </div>

      {pending === undefined ? null : (
        <ConfirmDialog
          title="Kargo Firmasını Onayla"
          icon="shipment-truck"
          body="Bu işlem gönderiyi işleme hazır hale getirecektir."
          meta={`${pending.name} · ${priceLabel(pending)} · Gönderi #${shipmentId}`}
          confirmLabel="Kargoyu Onayla"
          busy={false}
          onConfirm={() => void confirm(pending)}
          onClose={() => setPending(undefined)}
        />
      )}
    </main>
  );
}

// Shipment Summary (13:341): four equal columns of Caption label + Body Medium value.
function ShipmentSummary({ id, shipment }: { readonly id: number; readonly shipment: Shipment | undefined }) {
  const items = [
    { label: 'Gönderi', value: `#${id}` },
    { label: 'Alıcı', value: shipment === undefined ? '—' : shipment.buyerName ?? shipment.buyer?.name ?? '—' },
    { label: 'Paket', value: shipment === undefined ? '—' : packageSummary(shipment) },
    { label: 'Çıkış', value: shipment?.warehouse?.name ?? '—' },
  ];
  return (
    <section className="pricing-summary" aria-label="Gönderi özeti">
      {items.map((item) => (
        <div className="pricing-summary__item" key={item.label}>
          <span className="pricing-summary__label">{item.label}</span>
          <span className="pricing-summary__value" title={item.value}>{item.value}</span>
        </div>
      ))}
    </section>
  );
}

function CarrierTable({ offers, locked, onSelect }: {
  readonly offers: readonly PriceOffer[] | undefined;
  readonly locked: boolean;
  readonly onSelect: (offer: PriceOffer) => void;
}) {
  const cheapest = (offers ?? [])
    .filter((offer) => offer.available && offer.parsedAmount !== null)
    .reduce<PriceOffer | undefined>((best, offer) => (best === undefined || Number(offer.parsedAmount) < Number(best.parsedAmount) ? offer : best), undefined);

  return (
    <div className="carrier-table" role="table" aria-label="Kargo seçenekleri" aria-busy={offers === undefined || locked || undefined}>
      <div className="carrier-header" role="row">
        {columns.map((column) => (
          <span className="carrier-header__cell" role="columnheader" style={{ width: column.width }} key={column.label}>{column.label}</span>
        ))}
        <span className="carrier-header__cell" role="columnheader" style={{ width: actionWidth }}>
          <span className="sr-only">İşlem</span>
        </span>
      </div>
      {offers === undefined
        ? Array.from({ length: 4 }, (_, row) => (
          <div className="carrier-skeleton" aria-hidden="true" key={row}>
            {skeletonWidths.map((width, cell) => <span className="carrier-skeleton__bar" style={{ width }} key={cell} />)}
          </div>
        ))
        : [automaticOffer, ...offers].map((offer) => (
          <CarrierRow
            offer={offer}
            automatic={offer === automaticOffer}
            cheapest={offer === cheapest}
            locked={locked}
            onSelect={() => onSelect(offer)}
            key={offer.id}
          />
        ))}
    </div>
  );
}

function CarrierRow({ offer, automatic, cheapest, locked, onSelect }: {
  readonly offer: PriceOffer;
  readonly automatic: boolean;
  readonly cheapest: boolean;
  readonly locked: boolean;
  readonly onSelect: () => void;
}) {
  const [identity, price, vat, availability] = columns;
  const rowClass = automatic ? 'carrier-row carrier-row--automatic' : offer.available ? 'carrier-row' : 'carrier-row carrier-row--unavailable';
  return (
    <div className={rowClass} role="row">
      <div className="carrier-cell carrier-cell--identity" role="cell" style={{ width: identity.width }}>
        <span className="carrier-badge" aria-hidden="true">{automatic ? 'OT' : abbreviate(offer.name)}</span>
        <span className="carrier-name" title={offer.name}>{offer.name}</span>
        {cheapest ? <span className="carrier-best">En Uygun</span> : null}
      </div>
      <div className="carrier-cell carrier-cell--price" role="cell" style={{ width: price.width }} title={offer.available ? offer.rawPrice ?? undefined : undefined}>
        {offer.available ? priceLabel(offer) : '—'}
      </div>
      <div className="carrier-cell carrier-cell--meta" role="cell" style={{ width: vat.width }}>
        {offer.available ? 'Sağlayıcı verisi' : '—'}
      </div>
      <div className={offer.available ? 'carrier-cell carrier-cell--meta carrier-cell--available' : 'carrier-cell carrier-cell--meta'} role="cell" style={{ width: availability.width }}>
        {offer.available ? 'Uygun' : 'Hizmet Dışı Bölge'}
      </div>
      <div className="carrier-cell carrier-cell--action" role="cell" style={{ width: actionWidth }}>
        {offer.available ? (
          <Button hierarchy="secondary" leadingIcon="status-success" locked={locked} aria-label={automatic ? undefined : `Seç: ${offer.name}`} onClick={onSelect}>
            {automatic ? 'Otomatik Seç' : 'Seç'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// "Değişken" for the automatic choice, lira for a numeric provider price and
// the provider's own wording for anything else.
function priceLabel(offer: PriceOffer): string {
  if (offer.id === automaticProviderId) return 'Değişken';
  if (offer.parsedAmount !== null) return formatLira(offer.parsedAmount);
  return offer.rawPrice ?? '—';
}

// "1 paket · 3 desi"; the desi part is left out when the response carries no
// package lines, rather than claiming zero.
function packageSummary(shipment: Shipment): string {
  const count = `${shipment.packageCount} paket`;
  if (shipment.shipmentPackages.length === 0) return count;
  const desi = shipment.shipmentPackages.reduce((total, item) => total + (Number(item.realDesi ?? item.desi) || 0), 0);
  return `${count} · ${desi.toLocaleString('tr-TR')} desi`;
}

// Carrier Identity badge in the design is a two-letter abbreviation ("YK").
function abbreviate(name: string): string {
  const words = name.split(/\s+/u).filter((word) => word !== '');
  if (words.length === 0) return '—';
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toLocaleUpperCase('tr-TR');
  return `${(words[0] ?? '').charAt(0)}${(words[1] ?? '').charAt(0)}`.toLocaleUpperCase('tr-TR');
}
