// Figma page "23 — Diagnostics": Overview (18:2). Entries are written by the
// main process, which keeps only request metadata and redacts sensitive values
// before they reach this screen; "Tanılamayı Kopyala" copies the same entries.

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AppInfo, Diagnostics } from '../../shared/ipc.ts';
import { ApiConnectionStatus, Button, type ConnectionStatusKey } from '../components/Kit.tsx';
import { copyDiagnostics } from '../components/SystemState.tsx';
import { PageHeader } from '../components/Ui.tsx';

type Failure = 'timeout' | 'network' | 'local' | 'response';

interface LastRequest {
  readonly status: number | null;
  readonly durationMs: number | null;
  readonly failure: Failure | null;
}

export interface DiagnosticsPageProps {
  // Connection state measured by the shell, used until a request is logged.
  readonly shellConnection: ConnectionStatusKey;
}

export function DiagnosticsPage({ shellConnection }: DiagnosticsPageProps) {
  const [diagnostics, setDiagnostics] = useState<Diagnostics>();
  const [info, setInfo] = useState<AppInfo>();
  const [announcement, setAnnouncement] = useState('');

  const load = useCallback(async () => {
    const [snapshot, application] = await Promise.all([
      window.kargonomi.diagnostics.get().catch(() => undefined),
      window.kargonomi.app.info().catch(() => undefined),
    ]);
    setDiagnostics(snapshot);
    setInfo(application);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const latest = useMemo(() => lastRequest(diagnostics?.entries ?? []), [diagnostics]);

  const copy = () => {
    copyDiagnostics().then(
      () => setAnnouncement('Tanılama panoya kopyalandı.'),
      () => setAnnouncement('Kopyalama tamamlanamadı.'),
    );
  };

  return (
    <main className="main-content main-content--dense main-content--diagnostics">
      <PageHeader
        title="Tanılama"
        description="Bağlantı ve uygulama durumunu hassas verileri göstermeden inceleyin."
        toolbar
        actions={
          <>
            <Button hierarchy="secondary" leadingIcon="action-copy" onClick={copy}>Tanılamayı Kopyala</Button>
            <Button hierarchy="primary" leadingIcon="action-refresh" onClick={() => void load()}>Yenile</Button>
          </>
        }
      />

      <div className="diagnostics-grid">
        <section className="form-panel form-panel--compact">
          <h2 className="form-panel__title">API Bağlantısı</h2>
          <ApiConnectionStatus status={latest === undefined ? shellConnection : connectionOf(latest)} />
          <Row label="Gecikme" value={latest?.durationMs === undefined || latest.durationMs === null ? '—' : `${latest.durationMs} ms`} />
        </section>

        <section className="form-panel form-panel--compact">
          <h2 className="form-panel__title">Uygulama</h2>
          <Row label="Uygulama Sürümü" value={info?.version ?? '—'} />
          <Row label="Ortam" value="Desktop" />
        </section>
      </div>
      <p className="sr-only" role="status">{announcement}</p>
    </main>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="setting-row">
      <span className="setting-row__label">{label}</span>
      <span className="setting-row__value">{value}</span>
    </div>
  );
}

// Entries are JSON documents written by the main-process diagnostic log.
function lastRequest(raw: readonly string[]): LastRequest | undefined {
  const line = raw.at(-1);
  if (line === undefined) return undefined;
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(line) as Record<string, unknown>; } catch { /* keep defaults */ }
  const count = (key: string): number | null => {
    const value = parsed[key];
    return typeof value === 'number' ? value : null;
  };
  const failure = parsed['failure'];
  return {
    status: count('status'),
    durationMs: count('durationMs'),
    failure: failure === 'timeout' || failure === 'network' || failure === 'local' || failure === 'response' ? failure : null,
  };
}

function connectionOf(entry: LastRequest): ConnectionStatusKey {
  if (entry.failure === 'timeout') return 'timeout';
  if (entry.failure === 'network') return 'offline';
  if (entry.status === 401 || entry.status === 403) return 'unauthorized';
  if (entry.status !== null && entry.status >= 500) return 'service-problem';
  return 'connected';
}
