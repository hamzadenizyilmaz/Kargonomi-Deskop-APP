// Figma page "17 — Barcode": Default (15:2), Loading (15:193),
// Not Ready (15:336) and Error (15:482). "Farklı Kaydet" goes through the
// Save PDF dialog (25 — Dialogs & Overlays, 20:84) before the system picker.

import type { Shipment } from '@kargonomi/client';
import { useCallback, useEffect, useState } from 'react';

import type { BarcodeView } from '../../shared/ipc.ts';
import { Button, TextField } from '../components/Kit.tsx';
import { Dialog, PageHeader } from '../components/Ui.tsx';
import { tr } from '../i18n.ts';

type Phase = 'loading' | 'ready' | 'not-ready' | 'error';

interface SaveRequest {
  readonly name: string;
  readonly busy: boolean;
  readonly failed: boolean;
}

export interface BarcodePageProps {
  readonly shipmentId: number;
  readonly onDetail: () => void;
}

export function BarcodePage({ shipmentId, onDetail }: BarcodePageProps) {
  const [shipment, setShipment] = useState<Shipment>();
  const [document_, setDocument] = useState<BarcodeView>();
  const [preview, setPreview] = useState<string>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [actionError, setActionError] = useState<string>();
  const [saving, setSaving] = useState<SaveRequest>();

  const load = useCallback(async () => {
    setPhase('loading');
    setDocument(undefined);
    setActionError(undefined);
    const detail = await window.kargonomi.shipments.get(shipmentId).catch(() => undefined);
    setShipment(detail);
    try {
      setDocument(await window.kargonomi.barcodes.load(shipmentId));
      setPhase('ready');
    } catch {
      // A shipment the provider has not labelled yet has no barcode at all,
      // which the design separates from a malformed provider response.
      setPhase(detail?.shippingWebserviceBarcode === null ? 'not-ready' : 'error');
    }
  }, [shipmentId]);

  useEffect(() => { void load(); }, [load]);

  // The provider returns raw PDF bytes; they are previewed from a blob URL,
  // which the renderer CSP allows for frames.
  useEffect(() => {
    if (document_ === undefined) { setPreview(undefined); return undefined; }
    const bytes = Uint8Array.from(atob(document_.bytesBase64), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    setPreview(url);
    return () => { URL.revokeObjectURL(url); };
  }, [document_]);

  const run = (operation: () => Promise<unknown>, failure: string) => {
    setActionError(undefined);
    operation().catch(() => setActionError(failure));
  };

  const save = async (request: SaveRequest) => {
    setSaving({ ...request, busy: true, failed: false });
    try {
      // false: the system picker was dismissed, so the dialog stays for another try.
      const saved = await window.kargonomi.barcodes.save(shipmentId, request.name.trim());
      setSaving(saved ? undefined : { ...request, busy: false, failed: false });
    } catch {
      setSaving({ ...request, busy: false, failed: true });
    }
  };

  const subtitle = [
    `Gönderi #${shipmentId}`,
    shipment?.buyerName ?? undefined,
    shipment?.shippingProviderName ?? undefined,
  ].filter((part): part is string => part !== undefined && part !== '').join(' · ');

  // Print, save and open need a label; they stay unavailable until one loads.
  const unavailable = phase !== 'ready';

  return (
    <main className="main-content main-content--dense">
      <PageHeader
        title="Barkod / Etiket"
        description={subtitle}
        toolbar
        actions={
          <>
            <Button hierarchy="secondary" leadingIcon="action-print" disabled={unavailable} onClick={() => run(() => window.kargonomi.barcodes.print(shipmentId), 'Barkod yazdırılamadı.')}>Yazdır</Button>
            <Button hierarchy="secondary" leadingIcon="action-save" disabled={unavailable} onClick={() => setSaving({ name: `kargonomi-${shipmentId}-barkod.pdf`, busy: false, failed: false })}>Farklı Kaydet</Button>
            <Button hierarchy="secondary" leadingIcon="action-external-link" disabled={unavailable} onClick={() => run(() => window.kargonomi.barcodes.open(shipmentId), 'PDF harici uygulamada açılamadı.')}>Aç</Button>
            <Button hierarchy="secondary" leadingIcon="action-refresh" onClick={() => void load()}>Yenile</Button>
          </>
        }
      />

      {actionError === undefined ? null : (
        <div className="banner banner--error" role="alert">
          <p className="banner__title">{actionError}</p>
          <p className="banner__text">{tr.genericError}</p>
        </div>
      )}

      {phase === 'ready' && preview !== undefined ? (
        <div className="pdf-area">
          <iframe className="pdf-sheet" title={`Gönderi ${shipmentId} barkod önizlemesi`} src={preview} />
        </div>
      ) : null}

      {phase === 'loading' ? (
        <div className="pdf-area" role="status">
          <span className="pdf-placeholder" aria-hidden="true" />
          <span className="sr-only">Barkod yükleniyor</span>
        </div>
      ) : null}

      {phase === 'not-ready' ? (
        <div className="state-block">
          <p className="state-block__title">Barkod henüz oluşturulmamış.</p>
          <p className="state-block__text">Gönderi işleme hazır hale geldikten ve sağlayıcı barkodu oluşturduktan sonra burada görüntülenir.</p>
          <Button hierarchy="secondary" onClick={onDetail}>Gönderi Detayına Git</Button>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="state-block state-block--error" role="alert">
          <p className="state-block__title">Barkod yanıtı görüntülenemedi</p>
          <p className="state-block__text">Sağlayıcıdan beklenmeyen veya geçersiz bir PDF yanıtı alındı.</p>
          <Button hierarchy="secondary" leadingIcon="action-refresh" onClick={() => void load()}>Tekrar Dene</Button>
        </div>
      ) : null}

      {saving === undefined ? null : (
        <Dialog
          title="Barkodu Kaydet"
          icon="file-pdf"
          dismissible={!saving.busy}
          onClose={() => setSaving(undefined)}
          actions={
            <>
              <Button hierarchy="secondary" disabled={saving.busy} onClick={() => setSaving(undefined)}>Vazgeç</Button>
              <Button hierarchy="primary" loading={saving.busy} disabled={saving.name.trim() === ''} onClick={() => void save(saving)}>Kaydet</Button>
            </>
          }
        >
          <p className="k-dialog__body">Barkod PDF dosyasını cihazınıza kaydedin.</p>
          <TextField
            label="Dosya Adı"
            value={saving.name}
            autoComplete="off"
            spellCheck={false}
            disabled={saving.busy}
            state={saving.failed ? 'error' : 'default'}
            message={saving.failed ? 'Dosya kaydedilemedi. Tekrar deneyin.' : undefined}
            onChange={(event) => setSaving({ ...saving, name: event.target.value, failed: false })}
          />
          <p className="k-dialog__note">Hedef klasör işletim sistemi dosya seçicisiyle belirlenir.</p>
        </Dialog>
      )}
    </main>
  );
}
