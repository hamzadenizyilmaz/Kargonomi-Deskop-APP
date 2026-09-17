// Figma page "10 — Onboarding": Splash (6:2), Welcome (6:9), API Setup (6:24),
// Connection Testing (6:53), Connection Success (6:66), Unauthorized (6:79)
// and Network Error (6:92).
// The key is verified by the main process before it is stored, so setup never
// finishes with a key the API rejected.

import { useState, type KeyboardEvent, type ReactNode } from 'react';

import type { ConnectionResult, DesktopSettings } from '../../shared/ipc.ts';
import { ApiConnectionStatus, Button, TextField } from '../components/Kit.tsx';
import { DiagnosticsPage } from './DiagnosticsPage.tsx';

type Step = 'welcome' | 'api' | 'testing' | 'success' | 'unauthorized' | 'network-error' | 'diagnostics';

export function SplashScreen({ version }: { readonly version?: string | undefined }) {
  return (
    <main className="setup-shell">
      <div className="splash" role="status">
        <p className="splash__brand">KARGONOMİ</p>
        <p className="splash__tagline">Desktop Logistics Control Center</p>
        <span className="splash__bar" aria-hidden="true" />
        <p className="splash__status">Uygulama başlatılıyor…</p>
        <p className="splash__version">Sürüm {version ?? '—'}</p>
      </div>
    </main>
  );
}

export interface SetupPageProps {
  readonly secureStorageAvailable: boolean;
  readonly settings: DesktopSettings | undefined;
  readonly onComplete: () => void;
}

export function SetupPage({ secureStorageAvailable, settings, onComplete }: SetupPageProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? '');
  const [baseUrlError, setBaseUrlError] = useState<string>();
  const [timeoutText, setTimeoutText] = useState(`${settings === undefined ? 30 : Math.round(settings.timeoutMs / 1000)} saniye`);
  const [timeoutError, setTimeoutError] = useState<string>();
  const [result, setResult] = useState<ConnectionResult>();
  const [failure, setFailure] = useState<string>();

  // Base URL and timeout are validated here with the main process's rules
  // (HTTPS, 1–120 seconds) before anything is written.
  const persistSettings = async (): Promise<boolean> => {
    const url = baseUrl.trim();
    const seconds = Number(/^\s*(\d{1,3})\b/u.exec(timeoutText)?.[1]);
    const urlProblem = isHttpsUrl(url) ? undefined : 'Geçerli bir https:// adresi girin.';
    const timeoutProblem = Number.isInteger(seconds) && seconds >= 1 && seconds <= 120 ? undefined : '1–120 saniye arasında bir değer girin.';
    setBaseUrlError(urlProblem);
    setTimeoutError(timeoutProblem);
    if (urlProblem !== undefined || timeoutProblem !== undefined) return false;
    if (settings === undefined) { setFailure('Bağlantı ayarları okunamadı. Uygulamayı yeniden başlatın.'); return false; }
    setTimeoutText(`${seconds} saniye`);
    await window.kargonomi.settings.update({ ...settings, baseUrl: url, timeoutMs: seconds * 1000 });
    return true;
  };

  // "Bağlantıyı Test Et" shows the outcome; "Kaydet ve Devam Et" goes straight
  // to the application when the key is accepted.
  const connect = async (continueOnSuccess: boolean) => {
    setFailure(undefined);
    try {
      if (!await persistSettings()) return;
    } catch {
      setFailure('Bağlantı ayarları kaydedilemedi.');
      return;
    }
    setStep('testing');
    try {
      const connection = await window.kargonomi.credentials.replace(token);
      setResult(connection);
      if (connection.state === 'connected') {
        setToken('');
        if (continueOnSuccess) onComplete();
        else setStep('success');
      } else if (connection.state === 'unauthorized') {
        setStep('unauthorized');
      } else {
        setStep('network-error');
      }
    } catch {
      setResult({ state: 'service-error', message: 'API anahtarı güvenli biçimde kaydedilemedi.' });
      setStep('network-error');
    }
  };

  if (step === 'diagnostics') {
    return (
      <div className="setup-diagnostics">
        <div><Button hierarchy="tertiary" leadingIcon="control-arrow-left" onClick={() => setStep('network-error')}>Kuruluma Dön</Button></div>
        <DiagnosticsPage shellConnection="offline" />
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <SetupPanel width={640} eyebrow="Enterprise Logistics Control Center" title="Kargonomi Desktop'a Hoş Geldiniz">
        <p className="setup-panel__lead">Kargo operasyonlarınızı tek masaüstü uygulamasından yönetin. Kurulum birkaç temel bağlantı adımından oluşur.</p>
        <ul className="feature-list">
          <li>• API bağlantınızı güvenli biçimde yapılandırın</li>
          <li>• Gönderi, fiyat, barkod ve webhook süreçlerini yönetin</li>
          <li>• Bağlantı ve hata durumlarını tanılama ekranından izleyin</li>
        </ul>
        <div className="setup-panel__actions">
          <Button hierarchy="secondary" onClick={() => setStep('api')}>Bağlantı Ayarları</Button>
          <Button hierarchy="primary" onClick={() => setStep('api')}>Kuruluma Başla</Button>
        </div>
      </SetupPanel>
    );
  }

  if (step === 'testing') {
    return (
      <SetupPanel width={660} eyebrow="Bağlantı testi" title="Bağlantı doğrulanıyor">
        <ApiConnectionStatus status="connecting" />
        <StateBox title="Kargonomi API bağlantısı doğrulanıyor…" text="Bu işlem sırasında sayfadan ayrılmadan diğer bağlantı bilgilerinizi kontrol edebilirsiniz." />
        <div><Button hierarchy="secondary" loading>Test ediliyor…</Button></div>
      </SetupPanel>
    );
  }

  if (step === 'success') {
    return (
      <SetupPanel width={620} eyebrow="Kurulum tamamlandı" title="Bağlantı başarılı.">
        <ApiConnectionStatus status="connected" />
        <StateBox title="API erişimi doğrulandı" text="Yapılandırılan API uç noktası erişilebilir ve kimlik doğrulama başarılı." />
        <div><Button hierarchy="primary" onClick={onComplete}>Panele Git</Button></div>
      </SetupPanel>
    );
  }

  if (step === 'unauthorized') {
    return (
      <SetupPanel width={620} eyebrow="Bağlantı sorunu" title="API anahtarı doğrulanamadı">
        <ApiConnectionStatus status="unauthorized" />
        <StateBox tone="error" title="Kimlik doğrulama başarısız" text="API anahtarınızı kontrol edin veya yeni bir anahtar girin. Mevcut anahtar güvenlik nedeniyle tekrar gösterilmez." />
        <div><Button hierarchy="primary" onClick={() => setStep('api')}>API Anahtarını Güncelle</Button></div>
      </SetupPanel>
    );
  }

  if (step === 'network-error') {
    return (
      <SetupPanel width={640} eyebrow="Bağlantı sorunu" title="Sunucuya ulaşılamadı">
        <ApiConnectionStatus status={result?.state === 'timeout' ? 'timeout' : result?.state === 'service-error' ? 'service-problem' : 'offline'} />
        <StateBox tone="error" title="Ağ bağlantısı kurulamadı" text="İnternet bağlantınızı, API Base URL ayarını ve güvenlik duvarı erişimini kontrol edin." />
        <div className="setup-panel__actions">
          <Button hierarchy="secondary" onClick={() => setStep('diagnostics')}>Ağ Tanılamasını Aç</Button>
          <Button hierarchy="primary" disabled={token.trim() === ''} onClick={() => void connect(false)}>Tekrar Dene</Button>
        </div>
      </SetupPanel>
    );
  }

  const ready = secureStorageAvailable && token.trim() !== '';
  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && ready) void connect(true);
  };

  return (
    <SetupPanel width={720} eyebrow="Bağlantı kurulumu" title="Kargonomi API Bağlantısı">
      <p className="setup-panel__text">Uygulamanın gönderi operasyonlarını çalıştırabilmesi için API erişimini yapılandırın.</p>
      <ApiConnectionStatus status="connecting" />
      <TextField
        label="API Base URL"
        type="url"
        spellCheck={false}
        placeholder="https://…"
        value={baseUrl}
        state={baseUrlError === undefined ? 'default' : 'error'}
        message={baseUrlError}
        onChange={(event) => { setBaseUrl(event.target.value); setBaseUrlError(undefined); }}
      />
      <TextField
        label="API Token"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={token}
        disabled={!secureStorageAvailable}
        onChange={(event) => setToken(event.target.value)}
        onKeyDown={commitOnEnter}
      />
      <TextField
        label="İstek Zaman Aşımı"
        inputMode="numeric"
        value={timeoutText}
        state={timeoutError === undefined ? 'default' : 'error'}
        message={timeoutError}
        onChange={(event) => { setTimeoutText(event.target.value); setTimeoutError(undefined); }}
      />
      {secureStorageAvailable
        ? <StateBox title="Güvenli saklama" text="API anahtarınız güvenli işletim sistemi depolamasında saklanır." />
        : <StateBox tone="error" title="Güvenli anahtar deposu kullanılamıyor" text="Bu cihazda güvenli anahtar deposu kullanılamıyor. Anahtar kaydedilemez." />}
      {failure === undefined ? null : <StateBox tone="error" title="Kaydedilemedi" text={failure} />}
      <div className="setup-panel__actions">
        <Button hierarchy="secondary" disabled={!ready} onClick={() => void connect(false)}>Bağlantıyı Test Et</Button>
        <Button hierarchy="primary" disabled={!ready} onClick={() => void connect(true)}>Kaydet ve Devam Et</Button>
      </div>
    </SetupPanel>
  );
}

// Setup Panel (6:10 …): brand, eyebrow and Heading 1 over the step content;
// every frame sets its own panel width.
function SetupPanel({ width, eyebrow, title, children }: {
  readonly width: number;
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <main className="setup-shell">
      <section className="setup-panel" style={{ width }}>
        <p className="setup-panel__brand">KARGONOMİ</p>
        <p className="setup-panel__eyebrow">{eyebrow}</p>
        <h1 className="setup-panel__title">{title}</h1>
        {children}
      </section>
    </main>
  );
}

// State / info and State / error (6:45, 6:87): the error tone only colours the title.
function StateBox({ title, text, tone = 'info' }: { readonly title: string; readonly text: string; readonly tone?: 'info' | 'error' }) {
  return (
    <div className={tone === 'error' ? 'state-box state-box--error' : 'state-box'} role={tone === 'error' ? 'alert' : undefined}>
      <p className="state-box__title">{title}</p>
      <p className="state-box__text">{text}</p>
    </div>
  );
}

function isHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}
