# Güvenlik Politikası

## Desteklenen sürüm

| Sürüm | Güvenlik durumu |
|---|---|
| `2.5.0-Enterprise` | Etkin destek |
| Daha eski çalışma kopyaları | Desteklenmiyor |

Kargonomi Masaüstü İstemcisi Hamza Deniz Yılmaz ve Beyza Gül tarafından sürdürülür; Bilhost proje destekçisidir. Bu depo, Kargonomi'nin resmî güvenlik bildirim kanalı değildir.

## Güvenlik açığı bildirimi

Bir güvenlik açığını açık GitHub kaydında paylaşmayın. Deponun özel güvenlik bildirimi özelliğini kullanın veya proje yöneticileriyle GitHub profilleri üzerinden özel iletişim kurun.

Bildirimde aşağıdaki bilgilere yer verin:

- etkilenen sürüm, işletim sistemi ve ekran;
- gerçek müşteri verisi içermeyen en küçük yeniden oluşturma adımları;
- beklenen güvenlik etkisi;
- biliniyorsa sorunu sınırlandırmaya yönelik öneri.

Geçerli API anahtarı, webhook gizli anahtarı, müşteri bilgisi veya size ait olmayan bir hesabın verisini eklemeyin. Kargonomi ya da Bilhost sistemlerine ilişkin bir güvenlik sorunu tespit ettiyseniz doğrudan ilgili kurumun resmî güvenlik kanalını kullanın.

## Erişim bilgisi olayı

Bir API anahtarı sohbet kaydında, günlükte, ekran görüntüsünde, Git geçmişinde ya da derleme çıktısında görünmüşse ele geçirilmiş kabul edilmelidir. Anahtarı hizmet yönetim ekranından iptal edin, yeni bir anahtar oluşturun ve erişim kayıtlarını inceleyin. Uygulamada yeni anahtarı **Ayarlar → Bağlantı → API Anahtarını Değiştir** ile girin veya cihazdaki kopyayı **API Anahtarını Kaldır** ile silin.

Bir değeri dosyanın son sürümünden silmek, Git geçmişindeki eski kopyaları ortadan kaldırmaz. Geçmişte bulunan erişim bilgileri yeniden kullanılmamalıdır.

## Güvenlik sınırları

### API anahtarı ve ayarlar

- API anahtarı Electron `safeStorage` ile şifrelenir ve kullanıcı veri dizinindeki `secure/api-token.bin` dosyasına yalnızca dosya sahibinin okuyabileceği izinlerle yazılır.
- İşletim sisteminin güvenli depolama altyapısı kullanılamıyorsa anahtar kaydedilmez.
- Yeni anahtar kaydedilmeden önce bağlantı testiyle doğrulanır; reddedilen anahtar mevcut anahtarın yerine yazılmaz.
- Anahtar yalnızca ana süreçte çözülür ve isteklerin `Authorization` başlığına eklenir. Arayüze gönderilmez, ekranda yalnızca maskeli gösterilir.
- Ayar dosyası doğrulanarak okunur ve yazılır. Temel API adresi yalnızca `https://` olabilir, istek zaman aşımı 1–120 saniye ile sınırlıdır.

### Pencere ve arayüz

- Arayüz sürecinde `nodeIntegration` kapalı, `contextIsolation` ve `sandbox` açıktır; güvensiz içerik çalıştırılmaz.
- Arayüz yalnızca köprüde tanımlı IPC kanallarını kullanabilir.
- İçerik güvenliği politikası betik, stil ve bağlantı kaynaklarını uygulama paketiyle sınırlar; gömülü nesnelere izin verilmez. Barkod önizlemesi için yalnızca `blob:` çerçevelerine ve Chromium'un yerleşik PDF görüntüleyicisine izin verilir.
- Uygulama içinde başka adrese gezinme engellenir ve yeni pencere açılmaz; yalnızca `https://` bağlantıları varsayılan tarayıcıda açılır.
- Windows ve Linux'ta uygulama menüsü bulunmaz. Paketlenmiş sürümde geliştirici araçları ve yeniden yükleme kısayolları kapalıdır.

### Ağ ve tanılama kayıtları

- İstekler `@kargonomi/client` üzerinden yapılır; otomatik yeniden deneme yalnızca güvenli `GET` isteklerinde uygulanır.
- Tanılama kayıtları yalnızca işlem adı, yöntem, uç nokta, durum kodu, süre, tekrar sayısı, correlation ID ve hata türünü içerir. İstek başlıkları ve gövdeleri kaydedilmez.
- Kayıtlar yalnızca bellekte tutulur ve en fazla 500 kayıt saklanır. Erişim bilgisi, telefon, adres ve kimlik numarası desenleri maskelenir.
- Ağ hataları arayüze yalnızca genel bir hata işaretiyle iletilir; ayrıntılar ana süreçteki tanılama kaydında kalır.

### Dosyalar ve güncellemeler

- Barkod PDF'i, yazdırma ve harici uygulamada açma için geçici dizine benzersiz bir adla yazılır. Yazdırmadan sonra hemen, harici açmadan 15 dakika sonra silinir; uygulama bu süre dolmadan kapanırsa dosya işletim sisteminin geçici dizininde kalabilir.
- Farklı kaydetme işleminde dosya yalnızca kullanıcının seçtiği `.pdf` konumuna yazılır.
- Güncellemeler `electron-updater` ile GitHub Releases üzerinden alınır ve `latest.yml` içindeki SHA-512 özetiyle doğrulanır.
- Bu projede Windows kod imzalama yapılandırması bulunmaz. Dağıtılan kurulum dosyalarının güvenilir bir sertifikayla imzalanması önerilir.

## Güvenli kullanım denetim listesi

1. Uygulamayı yalnızca güvenilir kaynaktan alınan kurulum dosyasıyla kurun.
2. API anahtarını yalnızca uygulamanın kurulum ekranından veya **Ayarlar → Bağlantı** bölümünden girin; ayar dosyalarına, ortam dosyalarına veya kaynak koda yazmayın.
3. Ortak kullanılan bilgisayarlarda işiniz bittiğinde **API Anahtarını Kaldır** seçeneğini kullanın.
4. Temel API adresini değiştirmeden önce adresin Kargonomi'ye ait olduğunu doğrulayın.
5. Tanılama bilgisini paylaşmadan önce içeriğini kontrol edin; ekran görüntülerinde müşteri bilgilerini gizleyin.
6. Otomatik güncellemeyi açık tutun veya yeni sürümleri düzenli olarak denetleyin.
7. Barkod ve gönderi belgelerinin saklama sürelerini KVKK kapsamındaki veri işleme yükümlülüklerinize göre belirleyin.

Kaynak kod GPL-3.0 kapsamında lisanslanmıştır. Bilhost ve Kargonomi adları ile marka varlıkları ilgili hak sahiplerine aittir.
