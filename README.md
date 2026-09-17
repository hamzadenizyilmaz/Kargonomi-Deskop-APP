<p align="center">
  <a href="https://www.bilhost.com/"><img src="assets/branding/bilhost-logo.svg" alt="Bilhost" height="58"></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.kargonomi.com.tr/"><img src="assets/branding/kargonomi-logo.png" alt="Kargonomi" height="58"></a>
</p>

<h1 align="center">Kargonomi Masaüstü İstemcisi</h1>

<p align="center">
  Kargonomi API ile gönderi, fiyat, barkod ve webhook işlemlerini tek pencereden yöneten Electron masaüstü uygulaması
</p>

<p align="center">
  <img src="https://img.shields.io/badge/sürüm-2.5.0--Enterprise-1f6feb" alt="Sürüm 2.5.0-Enterprise">
  <img src="https://img.shields.io/badge/platform-Windows-0078d4" alt="Platform Windows">
  <a href="LICENSE"><img src="https://img.shields.io/badge/lisans-GPL--3.0-blue" alt="GPL-3.0 lisansı"></a>
</p>

Kargonomi Masaüstü İstemcisi; gönderi oluşturma, fiyat karşılaştırma, kargo firması seçimi, barkod yazdırma, depo, konum ve webhook işlemlerini Kargonomi API üzerinden yürüten bir Electron ve React uygulamasıdır. API anahtarı işletim sisteminin güvenli depolama altyapısıyla şifrelenerek saklanır ve arayüze hiçbir zaman geri gönderilmez.

Proje Hamza Deniz Yılmaz ve Beyza Gül tarafından geliştirilmektedir. Kargonomi'nin resmî ürünü değildir; API'nin güncel davranışı ve kullanım koşulları için Kargonomi belgeleri esas alınmalıdır.

## Ekranlar

| Ekran | İşlemler |
|---|---|
| Kurulum | API adresi, API anahtarı ve istek zaman aşımını tanımlama; bağlantıyı test etme |
| Dashboard | Gönderi özet kartları, durum dağılımı, kullanılabilir bakiye, hızlı işlemler ve son gönderiler |
| Gönderiler | Arama; durum, kargo firması, tarih ve depo filtreleri; sayfalama ve satır işlemleri |
| Yeni Gönderi | Gönderici, alıcı, paket ve kontrol adımlarından oluşan gönderi oluşturma akışı |
| Gönderi Detayı | Gönderi bilgileri, fiyatlandırma, zaman çizelgesi ve duruma göre değişen işlemler |
| Gönderi Düzenleme | Düzenlenebilir alanları güncelleme ve kaydedilmemiş değişiklik uyarısı |
| Fiyat Karşılaştırma | Kargo seçeneklerini karşılaştırma, otomatik seçim ve kargo firmasını onaylama |
| Barkod | PDF önizleme, yazdırma, farklı kaydetme ve harici uygulamada açma |
| Depolar | Kargonomi hesabındaki depo kayıtlarını listeleme, depo oluşturma ve seçilen depodan gönderi başlatma |
| Lokasyonlar | İl ve ilçe listelerini ve konum servislerinin durumunu görüntüleme |
| Webhook'lar | Listeleme, oluşturma, düzenleme ve silme |
| Bakiyem | Kullanılabilir bakiyeyi görüntüleme |
| Tanılama | Bağlantı durumu, gecikme ve uygulama sürümü; maskelenmiş tanılama bilgisini kopyalama |
| Ayarlar | Bağlantı, görünüm, tanılama, güncellemeler ve hakkında bölümleri |

Arayüz, "Kargonomi Desktop — Enterprise Logistics Control Center" Figma tasarımına göre hazırlanmıştır. Açık, koyu ve sistem teması bulunur; koyu temada bağlantı, durum ve hata metinleri okunaklı tonlarla gösterilir. Uygulama 1280 × 720 ve üzeri pencere boyutları için tasarlanmıştır; 1366 pikselden dar pencerelerde yan menü simge görünümüne geçer.

## Klavye kullanımı

| Tuş | Davranış |
|---|---|
| `Tab` / `Shift + Tab` | Etkileşimli öğeler arasında ileri ve geri gitme |
| `Enter` | Odaktaki aksiyonu çalıştırma |
| `Escape` | Diyalog, açılır liste ve satır menüsünü kapatma |
| Ok tuşları | Menüler, seçenek listeleri ve tema seçicisinde gezinme |
| `Ctrl + S` / `Cmd + S` | Gönderi düzenleme, depo ve webhook formlarını kaydetme |

Diyalog veya satır menüsü kapandığında odak, onu açan öğeye döner.

## Teknoloji

| Bileşen | Sürüm |
|---|---|
| Electron | 44 |
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| electron-builder | 26 |
| electron-updater | 6.8.9 |
| API istemcisi | `@kargonomi/client` |

## Gereksinimler

- Node.js 24 ve npm 12 veya üzeri
- `@kargonomi/client` paketi (bkz. [API istemci paketi](#api-istemci-paketi))
- API işlemleri için geçerli bir Kargonomi API anahtarı

## Proje yapısı

| Dizin / dosya | İçerik |
|---|---|
| `src/main/` | Electron ana süreci: pencere, güvenli anahtar deposu, ayarlar, IPC işleyicileri, tanılama ve güncelleme hizmeti |
| `src/preload/` | Arayüze yalnızca tanımlı işlemleri açan köprü (`window.kargonomi`) |
| `src/renderer/` | React arayüzü: ekranlar, bileşenler, stiller ve simgeler |
| `src/shared/` | Ana süreç ile arayüz arasında paylaşılan IPC kanalları ve türler |
| `assets/` | Uygulama simgeleri ve marka görselleri |
| `appsettings.json` | Varsayılan Kargonomi API adresi |
| `scripts/` | Derleme yardımcıları |
| `dist-electron/`, `dist-renderer/` | Derleme çıktıları |
| `artifacts/` | electron-builder ara çıktıları |
| `setup/` | Dağıtıma hazır kurulum dosyası ve güncelleme bilgileri |

## Yapılandırma

Varsayılan temel API adresi `appsettings.json` dosyasından okunur:

```json
{
  "Kargonomi": {
    "BaseUrl": "https://app.kargonomi.com.tr/api/v1/"
  }
}
```

Kullanıcı ayarları (API adresi, istek zaman aşımı, tema ve otomatik güncelleme tercihi) Electron'un kullanıcı veri dizinindeki `settings.json` dosyasında tutulur. Temel adres yalnızca `https://` ile başlayabilir; zaman aşımı 1–120 saniye arasında olmalıdır.

API anahtarı kurulum ekranında veya **Ayarlar → Bağlantı** bölümünde girilir. Anahtar önce bağlantı testiyle doğrulanır, ardından işletim sisteminin güvenli depolama altyapısıyla (Electron `safeStorage`) şifrelenerek kullanıcı veri dizinindeki `secure/api-token.bin` dosyasına yazılır. Kaydedilen anahtar ekranda yeniden gösterilmez. API anahtarını `appsettings.json` dosyasına, ortam dosyalarına veya kaynak koda yazmayın.

## API istemci paketi

Uygulama, Kargonomi API isteklerini `@kargonomi/client` paketiyle yapar. Bu paket `package.json` dosyasında şu an `file:../NodeJS` olarak tanımlıdır. Bu nedenle Kargonomi API deposundaki `NodeJS` paketi, bu projenin bir üst dizininde derlenmiş olarak bulunmalıdır:

```text
çalışma-dizini/
├── NodeJS/          @kargonomi/client
└── <bu proje>/
```

```powershell
npm ci --prefix ../NodeJS
npm --prefix ../NodeJS run build
```

Proje bağımsız bir depoda kullanılacaksa bu bağımlılık, paketin yayımlandığı kaynağa göre güncellenmelidir.

API istemcisi, React ve yazı tipleri derleme sırasında uygulama dosyalarına gömülür; bu yüzden `devDependencies` içinde yer alırlar ve kurulum paketine ayrıca kopyalanmazlar. `dependencies` içinde yalnızca çalışma anında gereken `electron-updater` bulunur.

## Kurulum ve çalıştırma

```powershell
npm ci
npm run build
npm start
```

`npm ci` komutu bağımlılıklarla birlikte Electron çalışma dosyasını da indirir. `npm start` derlenmiş uygulamayı açar.

### Geliştirme modu

Arayüz değişikliklerini uygulamayı yeniden derlemeden görmek için Vite geliştirme sunucusunu kullanın:

```powershell
# 1. terminal
npm run dev

# 2. terminal
npm run build
$env:VITE_DEV_SERVER_URL = "http://localhost:5173"
npm start
```

macOS ve Linux kabuklarında ikinci terminalde `VITE_DEV_SERVER_URL=http://localhost:5173 npm start` komutu kullanılabilir. Vite farklı bir port bildirirse adresi ona göre değiştirin. Ana süreç veya köprü (`src/main/`, `src/preload/`) değiştiğinde `npm run build` komutunu yeniden çalıştırın.

Geliştirme sırasında `F12` ve `Ctrl + Shift + I` geliştirici araçlarını açar, `Ctrl + R` arayüzü yeniden yükler. Paketlenmiş sürümde bu kısayollar kapalıdır.

## Doğrulama

```powershell
npm run lint
npm run typecheck
npm run verify
```

`verify` komutu kod biçimi, tür denetimi ve derleme adımlarını sırayla çalıştırır. Bu kontroller gerçek Kargonomi hesabına istek göndermez.

## Kurulum dosyası

```powershell
npm run setup
```

Bu komut uygulamayı derler, Windows kurulum dosyasını (NSIS) oluşturur ve sürümde yayımlanacak dosyaları `setup/` dizinine toplar:

| Dosya | Kullanım |
|---|---|
| `Kargonomi-Masaustu-<sürüm>-<mimari>.exe` | Kullanıcıya verilecek kurulum dosyası |
| `Kargonomi-Masaustu-<sürüm>-<mimari>.exe.blockmap` | Güncellemede yalnızca değişen blokların indirilmesi |
| `latest.yml` | Otomatik güncellemenin okuduğu sürüm bilgisi |
| `<sürüm>.zip` | Proje kaynak kodu; `.gitignore` kapsamındaki dosyalar eklenmez |

Kaynak kodu arşivi, Git'in izlediği ve yok saymadığı dosyalardan oluşturulur; bu nedenle komut bir Git çalışma dizininde çalıştırılmalıdır. `setup/` dizini her çalıştırmada yeniden oluşturulur.

Kurulum sihirbazı hedef dizinin değiştirilmesine izin verir; uygulama kaldırıldığında kullanıcı verileri silinmez. electron-builder'ın ara çıktıları `artifacts/` dizininde kalır. Kurulum yapmadan çalıştırılabilir bir dizin için `npm run package:dir` komutunu kullanın; sonuç `artifacts/win-unpacked/` dizinine yazılır.

Bu projede kod imzalama yapılandırılmamıştır. İmzasız kurulum dosyası açılırken Windows SmartScreen uyarı gösterebilir.

## Otomatik güncelleme

Paketlenmiş sürüm, [github.com/hamzadenizyilmaz/Kargonomi-Deskop-APP](https://github.com/hamzadenizyilmaz/Kargonomi-Deskop-APP/releases) deposunun Releases bölümünü `electron-updater` ile denetler ve en güncel sürümü indirir. Depo bilgisi `package.json` içindeki `build.publish` alanındadır; güncellemelerin kullanıcılara ulaşması için deponun herkese açık olması gerekir. Güncelleme denetimi, indirme, indirmeyi iptal etme ve yeniden başlatma adımları **Ayarlar → Güncellemeler** bölümünden yönetilir. Otomatik güncelleme açıkken uygulama her açılışta yeni sürümü denetler, bulduğu sürümü arka planda indirir ve kapanırken kurar; indirme sürerken iptal edilebilir. Otomatik güncelleme aynı bölümden kapatılabilir.

Yeni sürüm yayımlarken `npm run setup` ile `setup/` dizinine toplanan dosyaları aynı GitHub sürümüne ekleyin; otomatik güncelleme için kurulum dosyası, `.blockmap` ve `latest.yml` birlikte bulunmalıdır.

Uygulama sürümü `-Enterprise` ekini taşıdığından güncelleme denetimi yalnızca etiketi aynı ekle biten GitHub sürümlerini dikkate alır. Yeni sürümde `package.json` içindeki sürümü `2.6.0-Enterprise` gibi artırın ve GitHub sürüm etiketini `2.6.0-Enterprise` ya da `v2.6.0-Enterprise` biçiminde oluşturun. `2.6.0` gibi eksiz etiketler kurulu uygulamaya güncelleme olarak sunulmaz. İndirilen dosya, `latest.yml` içindeki SHA-512 özetiyle doğrulanır. Geliştirme ortamında çalışan uygulama güncelleme denetimi yapmaz.

## Güvenlik

- Arayüz sürecinde Node.js erişimi kapalıdır; bağlam yalıtımı ve Chromium korumalı alanı açıktır.
- Arayüz yalnızca köprüde tanımlı IPC işlemlerini çağırabilir; API anahtarı arayüze hiçbir zaman gönderilmez.
- İçerik güvenliği politikası betik ve stil kaynaklarını uygulama paketiyle sınırlar.
- Uygulama içinde başka adrese gezinme engellenir; yalnızca `https://` bağlantıları varsayılan tarayıcıda açılır.
- Tanılama kayıtları yalnızca işlem adı, yöntem, uç nokta, durum kodu, süre, tekrar sayısı, correlation ID ve yanıt işlenemediğinde sorunlu alanın adını içerir; istek başlıkları, gövdeleri ve alan değerleri kaydedilmez.
- Kayıtlar bellekte tutulur, en fazla 500 kayıt saklanır ve telefon, adres ile kimlik numarası desenleri maskelenir.
- Otomatik yeniden deneme yalnızca güvenli `GET` isteklerinde uygulanır.

Bir güvenlik açığı bulduysanız herkese açık issue oluşturmadan önce [SECURITY.md](SECURITY.md) içindeki bildirim yolunu kullanın.

## Belgeler

- [GitHub deposu](https://github.com/hamzadenizyilmaz/Kargonomi-Deskop-APP)
- [Sürümler ve kurulum dosyaları](https://github.com/hamzadenizyilmaz/Kargonomi-Deskop-APP/releases)
- [Katkı rehberi](CONTRIBUTING.md)
- [Güvenlik politikası](SECURITY.md)
- [Değişiklik geçmişi](CHANGELOG.md)
- [Davranış kuralları](CODE_OF_CONDUCT.md)

## Geliştiriciler

- [Hamza Deniz Yılmaz](https://github.com/hamzadenizyilmaz)
- [Beyza Gül](https://github.com/beyzagul02)

Proje [Bilhost](https://www.bilhost.com/) desteğiyle geliştirilmektedir. Kargonomi adı ve logosu Kargonomi'ye, Bilhost adı ve logosu Bilhost'a aittir.

## Lisans

Kaynak kod [GNU General Public License v3.0](LICENSE) kapsamında sunulur. Paket tanımlarında aynı lisansın SPDX karşılığı olan `GPL-3.0-only` ifadesi kullanılır.
