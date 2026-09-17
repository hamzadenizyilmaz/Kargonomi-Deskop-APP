# Kargonomi Masaüstü İstemcisi Katkı Rehberi

Bu proje Hamza Deniz Yılmaz ve Beyza Gül tarafından yönetilir, Bilhost tarafından desteklenir ve Kargonomi API ile bütünleşir. Katkılar GPL-3.0 lisansı kapsamında kabul edilir.

## Katkı hazırlığı

1. Değişikliğin etkilediği ekranları, bileşenleri ve IPC kanallarını belirleyin.
2. Arayüz değişikliklerini Figma tasarımındaki ilgili ekran ve durumlarla karşılaştırın.
3. API davranışını Kargonomi'nin güncel teknik belgeleriyle karşılaştırın.
4. Geçerli API anahtarı, webhook gizli anahtarı, müşteri adı, adres, telefon, barkod veya gerçek gönderi verisi kullanmayın; ekran görüntülerinde de bu bilgilere yer vermeyin.
5. Değişikliği tek bir teknik amaçla sınırlayın ve gerekçesini açıkça yazın.
6. Değiştireceğiniz dosyaların mevcut davranışını anlamadan uygulamaya başlamayın.

## Kod ilkeleri

### Süreçler ve güvenlik

- Arayüz sürecine Node.js veya Electron erişimi vermeyin; `nodeIntegration`, `contextIsolation` ve `sandbox` ayarlarını gevşetmeyin.
- Yeni bir yetenek gerektiğinde kanalı `src/shared/ipc.ts`, köprüyü `src/preload/preload.ts`, işleyiciyi `src/main/ipc-handlers.ts` içinde birlikte tanımlayın.
- API anahtarını arayüze göndermeyin, ekranda göstermeyin ve kayıtlara eklemeyin.
- Tanılama kayıtlarına istek başlığı, istek gövdesi, gizli anahtar veya kişisel veri eklemeyin.
- `index.html` içindeki içerik güvenliği politikasını gevşetmeyin. Harici bağlantılar yalnızca `https://` adresleri için ve varsayılan tarayıcıda açılabilir.
- `POST`, `PUT`, `PATCH` ve `DELETE` isteklerine otomatik yeniden gönderme davranışı eklemeyin. Kritik işlemlerde yükleniyor durumuyla çift gönderimi engelleyin.
- Temel API adresini kaynak koda yazmayın; varsayılan değer `appsettings.json` dosyasından okunur.

### Arayüz

- Ölçü, renk, yazı ve köşe yarıçaplarını `src/renderer/styles/tokens.css` içindeki tasarım belirteçlerinden alın; sabit renk değeri eklemeyin.
- Yeni ekran ve durumları Figma tasarımına dayandırın. Tasarımda bulunmayan bir durumu mevcut desenlerle çözün ve değişiklik önerisinde belirtin.
- Bir bileşeni veya stili Figma'daki bir çerçeveye göre düzenlediğinizde yorumda ilgili çerçevenin adını ve kimliğini belirtin.
- Kullanıcı metinlerini Türkçe yazın; yalnızca API ve tanılama terimleri teknik biçimde kalabilir.
- Arayüz metinlerini 12 pikselin altına indirmeyin; birincil etkileşim alanlarını yaklaşık 40 piksel yükseklikte tutun.
- Her etkileşimli öğede görünür odak halkası bulunmalıdır. Yalnızca simgeden oluşan butonlarda erişilebilir ad ve ipucu zorunludur.
- Durumları yalnızca renkle anlatmayın; metin ve gerektiğinde simge kullanın.
- Değişikliği açık ve koyu temada, 1280 × 720, 1440 × 900 ve 1920 × 1080 pencere boyutlarında denetleyin.
- Uygulamada karşılığı olmayan analiz, harita, kullanıcı yönetimi, muhasebe, işlem geçmişi veya depo silme gibi özellikler eklemeyin.

### Genel

- `TODO`, `FIXME`, kullanılmayan bileşen, boş soyutlama veya geçici örnek kod bırakmayın.
- API sözleşmesini etkileyen değişikliklerde `@kargonomi/client` paketiyle uyumu doğrulayın.

## Yerel denetimler

Değişiklik önerisi göndermeden önce şu komutu çalıştırın:

```powershell
npm run verify
```

Arayüz değişikliklerinde uygulamayı `npm start` veya [geliştirme modu](README.md#geliştirme-modu) ile açın ve ilgili ekranları klavyeyle de deneyin. Bu denetimlerde gerçek Kargonomi hesabı veya müşteri verisi kullanmayın.

## Değişiklik önerisi içeriği

Değişiklik önerisi aşağıdaki bilgileri içermelidir:

- sorunun ve çözümün kısa açıklaması;
- etkilenen ekranlar, bileşenler, IPC kanalları ve dosyalar;
- arayüz değiştiyse ilgili Figma ekranı ve kişisel veri içermeyen ekran görüntüleri;
- güvenlik ve geriye uyumluluk etkisi;
- çalıştırılan yerel denetim komutları ve sonuçları;
- kullanıcı davranışı değiştiyse `README.md` ve `CHANGELOG.md` güncellemesi.

## Lisans ve marka kullanımı

Katkı göndererek kodunuzun GPL-3.0 kapsamında kullanılmasını kabul edersiniz. Bilhost ve Kargonomi logolarını değiştirmeyin. Marka varlıkları ilgili hak sahiplerine aittir ve uygulama Kargonomi'nin resmî ürünü olarak tanıtılamaz.
