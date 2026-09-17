# Değişiklik Günlüğü

Bu belge, Kargonomi Masaüstü İstemcisi'nin kullanıcıları ve geliştiricileri etkileyen önemli değişikliklerini sürümlere göre kaydeder. Uygulamanın kullanıcıya gösterilen sürümü `2.5.0-Enterprise`, lisansı GPL-3.0'dır.

## 2.5.0-Enterprise — 17 Eylül 2026

Masaüstü istemcisi, Kargonomi API entegrasyon çalışma alanından ayrı bir proje olarak düzenlendi.

### Eklenenler

- "Kargonomi Desktop — Enterprise Logistics Control Center" Figma tasarımına göre kurulum, Dashboard, gönderiler, yeni gönderi, gönderi detayı, düzenleme, fiyat karşılaştırma, barkod, depolar, lokasyonlar, webhook'lar, bakiye, tanılama ve ayarlar ekranları eklendi.
- Açık, koyu ve sistem teması eklendi; koyu temada bağlantı, durum ve hata metinleri okunaklı tonlarla gösterilir.
- 1280 × 720 ile 2560 × 1440 arasındaki pencere boyutları için düzen kuralları eklendi; 1366 pikselden dar pencerelerde yan menü simge görünümüne geçer.
- Kurulum akışına bağlantı testi, geçersiz anahtar ve ağ hatası ekranları eklendi.
- Beklenmeyen hata ekranı ile ağ hatalarında gösterilen "Bağlantı kurulamadı" diyaloğu eklendi.
- `electron-updater` ile GitHub Releases üzerinden güncelleme denetimi, indirme, indirmeyi iptal etme ve yeniden başlatma desteği eklendi.
- Tanılama ekranına API bağlantı durumu, gecikme, uygulama sürümü ve maskelenmiş tanılama bilgisini kopyalama eklendi.
- Barkod ekranına PDF önizleme, yazdırma, farklı kaydetme ve harici uygulamada açma eklendi.
- Depolar ekranı, Kargonomi hesabındaki depo kayıtlarını doğrudan API'den (`GET /warehouses`) çeker; kimlik, depo adı, ana depo, yetkili, il/ilçe ve adres bilgileri listelenir. Yalnızca il ve ilçe kimliği gelen kayıtların adları lokasyon servislerinden bulunur.
- Depo satırındaki "Bu Depodan Gönderi Oluştur" işlemi, yeni gönderiyi o depo seçili olarak başlatır; depo kaydedildikten sonra da aynı depoyla gönderi başlatılabilir.
- İptal talebi gönderildiğinde gönderi detayında "İptal talebiniz alındı" durumu gösterilir.
- Satır menülerinde ok tuşlarıyla gezinme, `Escape` ile kapanma ve odağın menüyü açan öğeye dönmesi sağlandı.
- Gönderi düzenleme, depo ve webhook formlarına `Ctrl + S` / `Cmd + S` kaydetme kısayolu eklendi.
- Derlenmiş uygulamayı açan `npm start` komutu eklendi.
- Uygulamayı derleyip Windows kurulum dosyasını, güncelleme dosyalarını ve `.gitignore` kurallarına uygun kaynak kodu arşivini `setup/` dizinine toplayan `npm run setup` komutu eklendi.

### Değiştirilenler

- API anahtarı, kurulumda ve değiştirme sırasında önce bağlantı testiyle doğrulanır; reddedilen anahtar kaydedilmez ve mevcut anahtarın yerine yazılmaz.
- Para tutarları Türk lirası biçiminde gösterilir.
- Odak halkası, Figma erişilebilirlik sözleşmesine göre düzenlendi.
- Tema seçicisi tek seçimli grup olarak çalışır; ok tuşları seçimi ve odağı birlikte taşır.
- Yerleşim kutularının arkasındaki renkli şeritler kaldırıldı; yüzey rengi yalnızca kart, panel ve tablolarda kullanılır.
- Otomatik güncelleme `hamzadenizyilmaz/Kargonomi-Deskop-APP` deposunun sürümlerini denetler.
- Dashboard'daki "Yeni Gönderi" düğmesinde simge ile tekrarlanan artı işareti kaldırıldı.
- Yanıtı gelen ancak işlenemeyen istekler tanılama kayıtlarında hata olarak işaretlenir.
- Üst çubuktaki bağlantı durumu anlamına göre renklenir: bağlıyken yeşil, çevrimdışıyken turuncu, API sorununda kırmızı.
- Dashboard, gönderi listesini ve bakiyeyi birbirinden bağımsız ve aynı anda yükler; liste alınamadığında da bakiye gösterilir.
- Tanılama ekranındaki iki panel aynı yükseklikte gösterilir.
- Depolar ekranı önce depo kayıtlarını gösterir; oluşturma formu "Depo Ekle" ile açılır ve kayıttan sonra listeye dönülebilir.
- Yeni Gönderi ekranındaki depo seçimi aynı kayıt listesinden dolar ve ana depo önceden seçilir. Depo listesi alınamazsa son gönderilerde görülen depolar sunulur.
- Pencerenin en küçük boyutu 1280 × 720 oldu; ekran uygunsa içerik alanı 1440 × 900 olarak açılır.
- Windows ve Linux'ta varsayılan Electron menü çubuğu kaldırıldı; macOS'ta yalnızca uygulama, düzenleme ve pencere menüleri bulunur.
- Paketlenmiş sürümde geliştirici araçları ve yeniden yükleme kısayolları kapatıldı.
- Açılış ekranı, uygulama sürümünü ve seçili temayı API anahtarı denetimini beklemeden gösterir.
- Geliştirme sunucusu, stil dosyalarının yüklenebilmesi için yalnızca kendi sayfasında içerik güvenliği politikasını gevşetir; derlenmiş uygulamadaki politika değişmedi.

### Kaldırılanlar

- Görünüm ayarlarındaki yoğunluk seçeneği ve Ayarlar'daki Davranış bölümü kaldırıldı.
- Tanılama ekranındaki son istek ayrıntısı, kayıt listesi ve çalışma ortamı satırı kaldırıldı.
- Kullanılmayan eski tablo bileşeni ve ilgili stiller kaldırıldı.

### Düzeltilenler

- API yanıtında sayı olarak gelen desi değerleri, boş tarih alanları veya boş nesneler yüzünden Dashboard'un ve gönderi listesinin "veriler alınamadı" hatası vermesi düzeltildi; API istemcisi OpenAPI sözleşmesine uygun hâle getirildi.
- Koyu temada hata mesajlarının ve durum etiketlerinin beyaza yakın görünmesi düzeltildi.
- Koyu temada birincil düğmelerin üzerine gelindiğinde ve basıldığında beyaz yazının okunaksızlaşması düzeltildi.
- Koyu temada fiyat karşılaştırma tablosunun başlığında ve "Otomatik" satırında görünen koyu şeritler kaldırıldı; "Otomatik" satırı mavi tonla vurgulanır.
- Açık temada "Uygun", "En Uygun", "Çalışıyor" ve "Uygulama güncel" gibi yeşil ve turuncu durum metinlerinin ve kurulumdaki hata başlığının düşük kontrastı düzeltildi; metinler Figma erişilebilirlik sözleşmesindeki 4.5:1 sınırını karşılar.
- Çevrimdışı durumda üst çubuktaki "Çevrimdışı" yazısının yeşil görünmesi düzeltildi.
- Dashboard ilk yüklemede veri alamadığında durum dağılımı panelinin sürekli yükleniyor görünmesi düzeltildi.
- Dashboard'daki "Kullanılabilir Bakiye" kartı diğer tutarlar gibi Türk lirası biçiminde gösterilir.
- Otomatik güncelleme açıkken kendiliğinden başlayan indirmenin "İndirmeyi İptal Et" ile durdurulamaması düzeltildi.
- Kurulum paketine API istemci klasöründeki geliştirme dosyalarının (`.env`, `src/`, SQL betiği ve yapılandırma dosyaları) kopyalanması düzeltildi. Derleme sırasında uygulamaya gömülen API istemcisi, React ve yazı tipleri `devDependencies` içine taşındı; pakette yalnızca çalışma anında gereken `electron-updater` bulunur.
- İptal ve silme istekleri başarısız olduğunda diyaloğun mesaj göstermeden kapanması düzeltildi.
- Dar pencerelerde "Son Gönderiler" tablosunun sayfa kenarından taşması düzeltildi; tablo artık yatay kaydırılır.
- Yeni Gönderi ekranında depo seçiminin boş kalması düzeltildi; depolar daha önce yalnızca son gönderilerden tahmin ediliyordu.
- Geliştirme modunda uygulamanın stilsiz açılması düzeltildi.

## Proje bilgileri

Proje Hamza Deniz Yılmaz ve Beyza Gül tarafından geliştirilir ve Bilhost tarafından desteklenir. Kargonomi, entegre edilen hizmetin markasıdır; bu uygulama Kargonomi'nin resmî ürünü değildir.
