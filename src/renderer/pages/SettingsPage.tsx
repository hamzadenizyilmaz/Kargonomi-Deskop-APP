// Figma page "22 — Settings": Connection (17:2), Remove Token Dialog (17:171),
// Appearance (17:333), Updates (17:644),
// Update Available (17:799), Downloading Update (17:956),
// Restart Required (17:1107) and About (17:1260).

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';

import type { AppInfo, ConnectionResult, DesktopSettings, UpdateState } from '../../shared/ipc.ts';
import { ApiConnectionStatus, Button, SegmentedControl, Switch, TextField, type ConnectionStatusKey } from '../components/Kit.tsx';
import { ConfirmDialog, Dialog } from '../components/Ui.tsx';
import { tr } from '../i18n.ts';
import { applyTheme } from '../theme.ts';

export type SettingsSection = 'connection' | 'appearance' | 'diagnostics' | 'updates' | 'about';

const sections: readonly { readonly id: SettingsSection; readonly label: string }[] = [
  { id: 'connection', label: 'Bağlantı' },
  { id: 'appearance', label: 'Görünüm' },
  { id: 'diagnostics', label: 'Tanılama' },
  { id: 'updates', label: 'Güncellemeler' },
  { id: 'about', label: 'Hakkında' },
];

const repository = 'github.com/hamzadenizyilmaz/Kargonomi-Deskop-APP';
const developers = [
  { handle: 'hamzadenizyilmaz', url: 'https://github.com/hamzadenizyilmaz' },
  { handle: 'beyzagul02', url: 'https://github.com/beyzagul02' },
] as const;

// The stored key is never read back; the field only shows that one exists.
const tokenMask = '••••••••••••••••';

export interface SettingsPageProps {
  readonly initialSection?: SettingsSection;
  // Last connection state measured by the shell (topbar), shown until the
  // user runs "Bağlantıyı Test Et" here.
  readonly shellConnection: ConnectionStatusKey;
  readonly onDiagnostics: () => void;
  readonly onCredentialsCleared: () => void;
  // The topbar names the open section ("Ayarlar / Görünüm", 17:369).
  readonly onCrumb: (crumb: string) => void;
}

export function SettingsPage({ initialSection = 'connection', shellConnection, onDiagnostics, onCredentialsCleared, onCrumb }: SettingsPageProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [settings, setSettings] = useState<DesktopSettings>();
  const [info, setInfo] = useState<AppInfo>();
  const [update, setUpdate] = useState<UpdateState>();
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    onCrumb(sections.find((item) => item.id === section)?.label ?? 'Bağlantı');
  }, [onCrumb, section]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.kargonomi.settings.get(),
      window.kargonomi.app.info().catch(() => undefined),
      window.kargonomi.updates.state().catch(() => undefined),
    ]).then(([value, application, updateState]) => {
      if (!active) return;
      setSettings(value);
      setInfo(application);
      if (updateState !== undefined) setUpdate(updateState);
    }).catch(() => undefined);
    const unsubscribe = window.kargonomi.updates.onChange(setUpdate);
    return () => { active = false; unsubscribe(); };
  }, []);

  // Settings are written through the main process, which validates them; a
  // rejected write restores what is stored so the screen never lies.
  const save = async (next: DesktopSettings) => {
    const previous = settings;
    setSettings(next);
    applyTheme(next.theme);
    try {
      setSettings(await window.kargonomi.settings.update(next));
      setSaveFailed(false);
    } catch {
      if (previous !== undefined) {
        setSettings(previous);
        applyTheme(previous.theme);
      }
      setSaveFailed(true);
    }
  };

  let content: ReactNode = null;
  if (section === 'connection') {
    content = <ConnectionSection settings={settings} shellConnection={shellConnection} onSave={save} onCredentialsCleared={onCredentialsCleared} />;
  } else if (section === 'appearance') {
    content = <AppearanceSection settings={settings} onSave={save} />;
  } else if (section === 'updates') {
    content = (
      <UpdatesSection
        update={update}
        version={info?.version}
        automatic={settings?.autoUpdate ?? true}
        onAutomatic={(checked) => { if (settings !== undefined) void save({ ...settings, autoUpdate: checked }); }}
      />
    );
  } else if (section === 'about') {
    content = <AboutSection version={info?.version} />;
  }

  return (
    <main className="main-content">
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Ayar bölümleri">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              className="settings-nav__item"
              aria-current={item.id === section ? 'page' : undefined}
              onClick={() => { if (item.id === 'diagnostics') onDiagnostics(); else setSection(item.id); }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {saveFailed ? (
            <div className="banner banner--error" role="alert">
              <p className="banner__title">Ayar kaydedilemedi</p>
              <p className="banner__text">{tr.genericError}</p>
            </div>
          ) : null}
          {content}
        </div>
      </div>
    </main>
  );
}

function ConnectionSection({ settings, shellConnection, onSave, onCredentialsCleared }: {
  readonly settings: DesktopSettings | undefined;
  readonly shellConnection: ConnectionStatusKey;
  readonly onSave: (next: DesktopSettings) => Promise<void>;
  readonly onCredentialsCleared: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState<string>();
  const [baseUrlError, setBaseUrlError] = useState<string>();
  const [timeoutText, setTimeoutText] = useState<string>();
  const [timeoutError, setTimeoutError] = useState<string>();
  const [connection, setConnection] = useState<ConnectionResult>();
  const [testing, setTesting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const test = async () => {
    setTesting(true);
    try { setConnection(await window.kargonomi.connection.test()); }
    catch { setConnection({ state: 'service-error', message: '' }); }
    finally { setTesting(false); }
  };

  // Edits are committed when the field is left (or Enter is pressed), after
  // the same checks the main process applies (HTTPS, 1–120 seconds).
  const commitBaseUrl = () => {
    if (settings === undefined || baseUrl === undefined) return;
    const value = baseUrl.trim();
    if (!isHttpsUrl(value)) { setBaseUrlError('Geçerli bir https:// adresi girin.'); return; }
    setBaseUrlError(undefined);
    setBaseUrl(undefined);
    if (value !== settings.baseUrl) void onSave({ ...settings, baseUrl: value });
  };

  const commitTimeout = () => {
    if (settings === undefined || timeoutText === undefined) return;
    const seconds = Number(/^\s*(\d{1,3})\b/u.exec(timeoutText)?.[1]);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 120) { setTimeoutError('1–120 saniye arasında bir değer girin.'); return; }
    setTimeoutError(undefined);
    setTimeoutText(undefined);
    if (seconds * 1000 !== settings.timeoutMs) void onSave({ ...settings, timeoutMs: seconds * 1000 });
  };

  const commitOnEnter = (commit: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit();
  };

  const status: ConnectionStatusKey = testing ? 'connecting' : connection === undefined ? shellConnection : connectionKey(connection);

  return (
    <>
      <h1 className="settings-content__title">Bağlantı</h1>
      <p className="settings-content__description">Kargonomi API bağlantısını ve güvenli kimlik doğrulama ayarlarını yönetin.</p>
      <section className="form-panel">
        <h2 className="form-panel__title">API Bağlantısı</h2>
        <ApiConnectionStatus status={status} />
        <TextField
          label="API Base URL"
          type="url"
          spellCheck={false}
          value={baseUrl ?? settings?.baseUrl ?? ''}
          state={baseUrlError === undefined ? 'default' : 'error'}
          message={baseUrlError}
          onChange={(event) => { setBaseUrl(event.target.value); setBaseUrlError(undefined); }}
          onBlur={commitBaseUrl}
          onKeyDown={commitOnEnter(commitBaseUrl)}
        />
        <TextField label="API Token" type="text" value={tokenMask} readOnly masked />
        <TextField
          label="İstek Zaman Aşımı"
          inputMode="numeric"
          value={timeoutText ?? (settings === undefined ? '' : secondsLabel(settings.timeoutMs))}
          state={timeoutError === undefined ? 'default' : 'error'}
          message={timeoutError}
          onChange={(event) => { setTimeoutText(event.target.value); setTimeoutError(undefined); }}
          onBlur={commitTimeout}
          onKeyDown={commitOnEnter(commitTimeout)}
        />
        <p className="form-hint">API anahtarınız güvenli işletim sistemi depolamasında saklanır.</p>
        <div className="settings-actions">
          <Button hierarchy="secondary" leadingIcon="system-activity" loading={testing} onClick={() => void test()}>Bağlantıyı Test Et</Button>
          <Button hierarchy="secondary" leadingIcon="system-key" onClick={() => setReplacing(true)}>API Anahtarını Değiştir</Button>
          <Button hierarchy="destructive" leadingIcon="action-delete" onClick={() => setRemoving(true)}>API Anahtarını Kaldır</Button>
        </div>
      </section>

      {replacing ? (
        <ReplaceTokenDialog
          onClose={() => setReplacing(false)}
          onReplaced={(result) => { setReplacing(false); setConnection(result); }}
        />
      ) : null}

      {removing ? (
        <RemoveTokenDialog onClose={() => setRemoving(false)} onRemoved={onCredentialsCleared} />
      ) : null}
    </>
  );
}

// Replace API Token (20:48): the new key is tested by the main process and
// only stored when the connection succeeds.
function ReplaceTokenDialog({ onClose, onReplaced }: {
  readonly onClose: () => void;
  readonly onReplaced: (result: ConnectionResult) => void;
}) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const replace = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      const result = await window.kargonomi.credentials.replace(token);
      if (result.state === 'connected') { setToken(''); onReplaced(result); return; }
      setProblem(`${result.message} Mevcut anahtar korunuyor.`);
    } catch {
      setProblem('Anahtar güvenli depoya kaydedilemedi. Mevcut anahtar korunuyor.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog
      title="API Anahtarını Değiştir"
      icon="system-key"
      dismissible={!busy}
      onClose={onClose}
      actions={
        <>
          <Button hierarchy="secondary" disabled={busy} onClick={onClose}>Vazgeç</Button>
          <Button hierarchy="primary" loading={busy} disabled={token.trim() === ''} onClick={() => void replace()}>Test Et ve Değiştir</Button>
        </>
      }
    >
      <p className="k-dialog__body">Yeni API anahtarı doğrulandıktan sonra mevcut anahtar güvenli depolamada değiştirilecektir.</p>
      <TextField
        label="Yeni API Token"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={token}
        disabled={busy}
        state={problem === undefined ? 'default' : 'error'}
        message={problem}
        onChange={(event) => { setToken(event.target.value); setProblem(undefined); }}
      />
      <p className="k-dialog__note">Mevcut API anahtarı güvenlik nedeniyle gösterilmez.</p>
    </Dialog>
  );
}

function RemoveTokenDialog({ onClose, onRemoved }: { readonly onClose: () => void; readonly onRemoved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <ConfirmDialog
      title="API Anahtarını Kaldır"
      icon="action-delete"
      tone="error"
      confirmHierarchy="destructive"
      body="API anahtarınız bu cihazdan kaldırılacaktır. Yeni anahtar girilene kadar API işlemleri kullanılamaz."
      note={failed ? 'Anahtar kaldırılamadı. Tekrar deneyin.' : undefined}
      confirmLabel="API Anahtarını Kaldır"
      busy={busy}
      onConfirm={() => {
        setBusy(true);
        setFailed(false);
        void window.kargonomi.credentials.clear()
          .then(() => { onRemoved(); })
          .catch(() => { setFailed(true); })
          .finally(() => setBusy(false));
      }}
      onClose={onClose}
    />
  );
}

function AppearanceSection({ settings, onSave }: {
  readonly settings: DesktopSettings | undefined;
  readonly onSave: (next: DesktopSettings) => Promise<void>;
}) {
  return (
    <>
      <h1 className="settings-content__title">Görünüm</h1>
      <p className="settings-content__description">Uygulamanın açık, koyu veya sistem temasıyla görünmesini seçin.</p>
      <section className="form-panel">
        <h2 className="form-panel__title">Tema</h2>
        <SegmentedControl
          label="Tema"
          value={settings?.theme ?? 'system'}
          options={[{ value: 'light', label: 'Açık' }, { value: 'dark', label: 'Koyu' }, { value: 'system', label: 'Sistem' }]}
          onChange={(value) => { if (settings !== undefined) void onSave({ ...settings, theme: value }); }}
        />
      </section>
    </>
  );
}

function UpdatesSection({ update, version, automatic, onAutomatic }: {
  readonly update: UpdateState | undefined;
  readonly version: string | undefined;
  readonly automatic: boolean;
  readonly onAutomatic: (checked: boolean) => void;
}) {
  const current = update?.currentVersion ?? version ?? '—';
  const next = update?.nextVersion ?? '—';
  const phase = update?.phase ?? 'idle';

  // Update Available (17:799)
  if (phase === 'available') {
    return (
      <>
        <h1 className="settings-content__title">Güncellemeler</h1>
        <div className="banner banner--success" role="status">
          <p className="banner__title">Yeni sürüm kullanılabilir</p>
          <p className="banner__text">{`Mevcut: ${current} · Yeni: ${next}`}</p>
        </div>
        <section className="form-panel">
          <h2 className="form-panel__title">Sürüm Özeti</h2>
          <SettingRow label="Mevcut sürüm" value={current} />
          <SettingRow label="Yeni sürüm" value={next} />
          {/* Release notes come from the update manifest; none are invented. */}
          {update?.releaseNotes === null || update?.releaseNotes === undefined ? null : <p className="form-hint">{update.releaseNotes}</p>}
          <div><Button hierarchy="primary" leadingIcon="action-download" onClick={() => void window.kargonomi.updates.download()}>Güncellemeyi İndir</Button></div>
        </section>
      </>
    );
  }

  // Downloading Update (17:956)
  if (phase === 'downloading') {
    const percent = Math.max(0, Math.min(100, Math.round(update?.percent ?? 0)));
    return (
      <>
        <h1 className="settings-content__title">Güncellemeler</h1>
        <section className="form-panel">
          <h2 className="form-panel__title">Güncelleme indiriliyor</h2>
          <p className="update-progress__label">{`${next} sürümü indiriliyor…`}</p>
          <div className="update-progress" role="progressbar" aria-label="Güncelleme indirme ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <span className="update-progress__bar" style={{ width: `${percent}%` }} />
          </div>
          <p className="form-hint">{`%${percent} tamamlandı`}</p>
          <div><Button hierarchy="secondary" leadingIcon="action-download" onClick={() => void window.kargonomi.updates.cancel()}>İndirmeyi İptal Et</Button></div>
        </section>
      </>
    );
  }

  // Restart Required (17:1107)
  if (phase === 'downloaded') {
    return (
      <>
        <h1 className="settings-content__title">Güncellemeler</h1>
        <div className="banner" role="status">
          <p className="banner__title">Yeniden başlatma gerekiyor</p>
          <p className="banner__text">Yeni sürümü tamamlamak için uygulamayı yeniden başlatın.</p>
        </div>
        <section className="form-panel">
          <h2 className="form-panel__title">Güncelleme Hazır</h2>
          <SettingRow label="Yeni sürüm" value={next} />
          <div><Button hierarchy="primary" leadingIcon="action-refresh" onClick={() => void window.kargonomi.updates.install()}>Uygulamayı Yeniden Başlat</Button></div>
        </section>
      </>
    );
  }

  // Updates (17:644), with the outcome of the last check above the panel.
  return (
    <>
      <h1 className="settings-content__title">Güncellemeler</h1>
      <p className="settings-content__description">Uygulama sürümünü ve güncelleme tercihlerini yönetin.</p>
      {phase === 'up-to-date' ? (
        <div className="banner banner--success" role="status">
          <p className="banner__title">Uygulama güncel</p>
          <p className="banner__text">{`Mevcut: ${current}`}</p>
        </div>
      ) : null}
      {phase === 'error' ? (
        <div className="banner banner--error" role="alert">
          <p className="banner__title">Güncellemeler denetlenemedi</p>
          <p className="banner__text">{tr.genericError}</p>
        </div>
      ) : null}
      {phase === 'unsupported' ? (
        <div className="banner" role="status">
          <p className="banner__title">Güncelleme denetimi kullanılamıyor</p>
          <p className="banner__text">Güncellemeler yalnız kurulum paketiyle yüklenmiş uygulamada denetlenir.</p>
        </div>
      ) : null}
      <section className="form-panel">
        <h2 className="form-panel__title">Sürüm</h2>
        <SettingRow label="Mevcut sürüm" value={current} />
        <div className="setting-row">
          <span className="setting-row__label">Otomatik güncelleme</span>
          <Switch checked={automatic} onChange={onAutomatic} label="Otomatik güncelleme" />
        </div>
        <div>
          <Button hierarchy="secondary" leadingIcon="action-refresh" loading={phase === 'checking'} onClick={() => void window.kargonomi.updates.check()}>
            Güncellemeleri Kontrol Et
          </Button>
        </div>
      </section>
    </>
  );
}

function AboutSection({ version }: { readonly version: string | undefined }) {
  return (
    <>
      <h1 className="settings-content__title">Hakkında</h1>
      <p className="settings-content__description">Ürün, sürüm ve geliştirici bilgileri.</p>
      <section className="form-panel">
        <h2 className="form-panel__title">Kargonomi Desktop</h2>
        <SettingRow label="Ürün" value="Kargonomi Desktop" />
        <SettingRow label="Sürüm" value={version ?? '—'} />
        <SettingRow label="Repository" value={repository} />
      </section>
      <section className="form-panel">
        <h2 className="form-panel__title">Geliştiriciler</h2>
        {developers.map((developer) => (
          <button type="button" className="settings-link" key={developer.handle} onClick={() => void window.kargonomi.app.openExternal(developer.url)}>
            {`${developer.handle} — ${developer.url}`}
          </button>
        ))}
      </section>
    </>
  );
}

function SettingRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="setting-row">
      <span className="setting-row__label">{label}</span>
      <span className="setting-row__value">{value}</span>
    </div>
  );
}

function secondsLabel(timeoutMs: number): string {
  return `${Math.round(timeoutMs / 1000)} saniye`;
}

function isHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}

function connectionKey(result: ConnectionResult): ConnectionStatusKey {
  if (result.state === 'connected') return 'connected';
  if (result.state === 'unauthorized') return 'unauthorized';
  if (result.state === 'timeout') return 'timeout';
  if (result.state === 'network-error') return 'offline';
  return 'service-problem';
}
