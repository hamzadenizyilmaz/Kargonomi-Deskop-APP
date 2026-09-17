// Figma page "21 — Credit": Default (16:2359), Loading (16:2499) and
// Error (16:2638). The design explicitly forbids a fabricated transaction list
// when the API has no history endpoint.

import { useCallback, useEffect, useState } from 'react';

import { Button } from '../components/Kit.tsx';
import { PageHeader } from '../components/Ui.tsx';
import { formatLira } from '../lib/format.ts';

export function CreditPage() {
  const [amount, setAmount] = useState<string>();
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setAmount(undefined);
    try {
      const credit = await window.kargonomi.account.credit();
      setAmount(credit.amount);
      setUpdatedAt(new Date());
    } catch { setFailed(true); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="main-content">
      <div className="credit-wrapper">
        <PageHeader
          title="Bakiyem"
          description="Kargonomi servislerinde kullanılabilir bakiyenizi görüntüleyin."
          actions={<Button hierarchy="secondary" onClick={() => void load()}>Yenile</Button>}
        />

        {failed ? (
          <section className="balance-card balance-card--error" role="alert">
            <h2 className="balance-card__error-title">Bakiye alınamadı</h2>
            <p className="balance-card__error-text">API isteği başarısız oldu. Bağlantıyı kontrol edip tekrar deneyin.</p>
            <div><Button hierarchy="secondary" onClick={() => void load()}>Tekrar Dene</Button></div>
          </section>
        ) : amount === undefined ? (
          <section className="balance-card balance-card--loading" role="status">
            <span className="balance-card__skeleton" style={{ width: 160, height: 16 }} aria-hidden="true" />
            <span className="balance-card__skeleton" style={{ width: 260, height: 42 }} aria-hidden="true" />
            <span className="balance-card__skeleton" style={{ width: 120, height: 12 }} aria-hidden="true" />
            <span className="sr-only">Bakiye yükleniyor</span>
          </section>
        ) : (
          <section className="balance-card">
            <span className="balance-card__label">Kullanılabilir Bakiye</span>
            <span className="balance-card__value">{formatLira(amount)}</span>
            <span className="balance-card__updated">Son güncelleme: {updatedAt?.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) ?? '—'}</span>
            <p className="balance-card__note">Bakiye yalnız gönderi operasyonlarında kullanılabilir. API işlem geçmişi sağlamıyorsa bu ekranda sahte işlem listesi gösterilmez.</p>
          </section>
        )}
      </div>
    </main>
  );
}
