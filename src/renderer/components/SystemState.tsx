// Figma page "24 — System States" — the shared enterprise state pattern used
// whenever the API, the network or an unexpected response interrupts a screen.
// The shell stays visible; the user is told what happened and what to do next.
// Every value below is transcribed from the twelve state frames (19:5 … 48:24),
// including each frame's own secondary / primary action pair.

import { Button } from './Kit.tsx';
import { Icon, type IconName } from './Icon.tsx';

export type SystemStateKind =
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'rate-limited'
  | 'provider-error'
  | 'timeout'
  | 'maintenance'
  | 'unexpected'
  | 'unknown-response'
  | 'payment-required';

// warning / error: the frame border and identity label take that status colour.
// neutral: border/default with a brand/primary label (Not Found, Maintenance,
// Unknown Response). payment: the later Payment Required frame (48:24), which
// tints its guidance box and uses a medium label on an 8px corner.
type Tone = 'warning' | 'error' | 'neutral' | 'payment';

interface SystemStateDefinition {
  readonly label: string;
  readonly code: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly title: string;
  readonly description: string;
  readonly guidance: string;
  readonly secondary: string;
  readonly primary: string;
}

const definitions: Record<SystemStateKind, SystemStateDefinition> = {
  offline: {
    label: 'Çevrimdışı', code: 'OFFLINE', icon: 'system-wifi-off', tone: 'warning',
    title: 'Çevrimdışısınız',
    description: 'Sunucuya ulaşılamıyor. Mevcut veriler görüntülenebilir; yeni istekler bağlantı geri geldiğinde çalıştırılır.',
    guidance: 'Ağ bağlantısını kontrol edin.',
    secondary: 'Tanılamayı Aç', primary: 'Tekrar Dene',
  },
  unauthorized: {
    label: 'Yetkisiz', code: '401', icon: 'system-key', tone: 'error',
    title: 'API anahtarı doğrulanamadı',
    description: 'Kimlik doğrulama başarısız. Mevcut token tekrar ekranda gösterilmez.',
    guidance: 'API anahtarını güncelleyin.',
    secondary: 'Tanılamayı Aç', primary: 'API Anahtarını Güncelle',
  },
  forbidden: {
    label: 'Erişim Yasak', code: '403', icon: 'system-lock', tone: 'error',
    title: 'Bu işlem için erişim yok',
    description: 'API kimliği doğrulandı ancak bu kaynağa erişim izni bulunmuyor.',
    guidance: 'Yetki veya hesap kapsamını kontrol edin.',
    secondary: 'Tanılamayı Aç', primary: 'Geri Dön',
  },
  'not-found': {
    label: 'Bulunamadı', code: '404', icon: 'action-search', tone: 'neutral',
    title: 'Kayıt bulunamadı',
    description: 'İstenen gönderi veya kaynak artık mevcut olmayabilir.',
    guidance: 'Listeye dönüp kaydı yeniden kontrol edin.',
    secondary: 'Yenile', primary: 'Gönderilere Dön',
  },
  validation: {
    label: 'Doğrulama Hatası', code: '422', icon: 'status-warning', tone: 'warning',
    title: 'Bazı bilgiler geçerli değil',
    description: 'İstek gönderilmeden önce hatalı alanlar düzeltilmelidir.',
    guidance: 'Alan bazlı hata mesajlarını kontrol edin.',
    secondary: 'Vazgeç', primary: 'Hataları Düzelt',
  },
  'rate-limited': {
    label: 'İstek Sınırı', code: '429', icon: 'system-clock', tone: 'warning',
    title: 'Çok fazla istek gönderildi',
    description: 'API geçici olarak yeni isteklere sınır uyguluyor.',
    guidance: 'Kısa süre sonra tekrar deneyin; otomatik tekrarlar kontrollü olmalıdır.',
    secondary: 'Tanılamayı Aç', primary: 'Tekrar Dene',
  },
  'provider-error': {
    label: 'Kargo Firması Hatası', code: '5xx PROVIDER', icon: 'status-error', tone: 'error',
    title: 'Kargo firması işlemi tamamlayamadı',
    description: 'Kargonomi erişilebilir ancak kargo firması tarafında hata oluştu.',
    guidance: 'Gönderi verisini koruyup işlemi tekrar deneyebilirsiniz.',
    secondary: 'Gönderiye Dön', primary: 'Tekrar Dene',
  },
  timeout: {
    label: 'Zaman Aşımı', code: 'TIMEOUT', icon: 'system-clock', tone: 'warning',
    title: 'İstek zaman aşımına uğradı',
    description: 'Sunucu belirlenen süre içinde yanıt vermedi. İşlemin karşı tarafta tamamlanmış olma ihtimali kontrol edilmelidir.',
    guidance: 'Aynı işlemi körlemesine tekrarlamayın.',
    secondary: 'Tanılamayı Aç', primary: 'Durumu Kontrol Et',
  },
  maintenance: {
    label: 'Bakım', code: 'MAINTENANCE', icon: 'control-sliders', tone: 'neutral',
    title: 'Hizmet geçici olarak kullanılamıyor',
    description: 'Planlı bakım veya servis kesintisi nedeniyle bazı işlemler kullanılamıyor.',
    guidance: 'Bağlantı geri geldiğinde yeniden deneyin.',
    secondary: 'Çevrimdışı Devam Et', primary: 'Tekrar Kontrol Et',
  },
  unexpected: {
    label: 'Beklenmeyen Hata', code: 'UNEXPECTED', icon: 'system-bug', tone: 'error',
    title: 'Beklenmeyen bir hata oluştu',
    description: 'Uygulama beklenmeyen bir durumla karşılaştı. Girdiğiniz veriler mümkün olduğunca korunur.',
    guidance: 'Tanılama bilgilerini kopyalayıp tekrar deneyin.',
    secondary: 'Tanılamayı Kopyala', primary: 'Tekrar Dene',
  },
  'unknown-response': {
    label: 'Bilinmeyen Yanıt', code: 'UNKNOWN RESPONSE', icon: 'status-info', tone: 'neutral',
    title: 'Sunucudan tanınmayan yanıt alındı',
    description: 'Yanıt biçimi veya durum değeri uygulamanın bildiği sözleşmeyle eşleşmedi.',
    guidance: 'Ham yanıt hassas bilgiler maskelenerek Tanılama bölümünde incelenebilir.',
    secondary: 'Geri Dön', primary: 'Tanılamayı Aç',
  },
  'payment-required': {
    label: 'Bakiye Yetersiz', code: '402', icon: 'finance-wallet', tone: 'payment',
    title: 'Yeterli bakiye bulunmuyor',
    description: 'Bu işlem için kullanılabilir bakiye yeterli değil. Bakiye güncellendiğinde işlemi yeniden deneyebilirsiniz.',
    guidance: 'Bakiyenizi kontrol edin veya gerekli bakiye sağlandıktan sonra yeniden deneyin.',
    secondary: 'Tekrar Dene', primary: 'Bakiyeyi Aç',
  },
};

export interface SystemStateProps {
  readonly kind: SystemStateKind;
  readonly onSecondary: () => void;
  readonly onPrimary: () => void;
}

export function SystemState({ kind, onSecondary, onPrimary }: SystemStateProps) {
  const definition = definitions[kind];
  return (
    <section className={`system-state system-state--${definition.tone}`} role="alert">
      <div className="system-state__meta">
        <span className="system-state__identity">
          <Icon name={definition.icon} size={18} />
          {definition.label}
        </span>
        <span className="system-state__code">{definition.code}</span>
      </div>
      <h2 className="system-state__title">{definition.title}</h2>
      <p className="system-state__description">{definition.description}</p>
      <p className="system-state__guidance">{definition.guidance}</p>
      <span className="system-state__spacer" aria-hidden="true" />
      <div className="system-state__actions">
        <Button hierarchy="secondary" onClick={onSecondary}>{definition.secondary}</Button>
        <Button hierarchy="primary" onClick={onPrimary}>{definition.primary}</Button>
      </div>
    </section>
  );
}

// "Tanılamayı Kopyala": the main process has already redacted every entry, so
// the copied text never carries the API token, secrets or full personal data.
export async function copyDiagnostics(): Promise<void> {
  const snapshot = await window.kargonomi.diagnostics.get();
  await navigator.clipboard.writeText([`Kargonomi Desktop · ${snapshot.generatedAt}`, ...snapshot.entries].join('\n'));
}
