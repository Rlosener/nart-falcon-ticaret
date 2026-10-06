# Design QA — Nart Falcon Mağaza Yönetimi

## Kapsam

- Sayfalar: `#/admin`, kategori yönetimi, ürün görsel/renk/ölçü editörü, ölçüye özel fiyat ve mağaza ürün detayı.
- Tasarım dili kaynağı: `qa/implementation-home-1440.png`.
- Yönetim paneli: `qa/implementation-admin-1440.png`.
- Renk ve ölçü editörü: `qa/implementation-admin-variants-1440.png` ve `qa/implementation-admin-variants-390.png`.
- Ölçü fiyatı alanı: `qa/implementation-admin-size-pricing-1440.png`.
- Mağaza canlı fiyat etkisi: `qa/implementation-product-size-price-1440.png`.
- Çalışma hedefi: mevcut React/Vite arayüzü, PHP API ve MySQL veri katmanı.

## Görsel eşleşme

- Masaüstü kontrolü: 1440 × 1000 CSS piksel, DPR 1. Uygulama panelinin kaydettiği görsel bitmap 1247 × 1000 pikseldir.
- Mobil kontrol: 390 × 844 CSS piksel.
- Masaüstü ürün editörü: `scrollWidth = clientWidth = 1440` (açılış animasyonu tamamlandıktan sonra).
- Mobil ürün editörü: `scrollWidth = clientWidth = 390`.
- Yönetim ekranları mevcut siyah, kırık beyaz ve neon yeşil Nart Falcon sistemiyle devam ediyor.

## Uygulanan akışlar

### Kategori yönetimi

- Ayrı Kategoriler bölümü eklendi.
- Kategori ekleme, yeniden adlandırma ve kullanılmayan kategoriyi onayla silme akışları gerçek veri katmanına bağlandı.
- Bir üründe kullanılan kategori silinemez; kullanıcıya önce ürünleri taşıması gerektiği açıklanır.
- Kategori yeniden adlandırıldığında bağlı ürünler aynı işlem içinde güncellenir.

### Renk ve ölçü yönetimi

- Virgüllü metin alanları yerine ekle/kaldır kontrollü renk ve ölçü satırları kullanıldı.
- En az bir renk ve bir ölçü zorunludur.
- Aynı ölçü adı ikinci kez kaydedilemez.
- Her ölçü satırında temel fiyata eklenecek `+ X TL` değeri bulunur.
- Negatif, sayı olmayan veya kabul edilen sınırı aşan fiyat farkı hem istemci hem sunucu tarafında reddedilir.

### Ürün görsel yönetimi

- Ürün editörüne önizlemeli çoklu görsel yöneticisi eklendi.
- Bir ürüne en fazla 4 adet PNG, JPG veya WebP görseli eklenebilir; her dosya en fazla 700 KB olabilir.
- Görseller tek tek silinebilir ve herhangi bir görsel mağaza kapağı yapılabilir.
- Ürünlerde hâlihazırda görünen CSS tabanlı Nart Falcon şablonu da `Varsayılan` etiketiyle medya yöneticisinde önizlenir.
- Varsayılan şablon `Kaldır` ile devre dışı bırakılabilir; görselsiz durum panelde ve canlı önizlemede görünür, `Şablonu geri getir` ile geri alınabilir.
- İlk görsel ürün kartında ve detay kapağında, diğer görseller ürün detay galerisinde gösterilir.
- Eski tek görselli SQL ve tarayıcı kayıtları otomatik olarak tek öğeli galeriye dönüştürülür.
- Yeni galeri verisi mevcut `image` SQL alanında JSON olarak saklanır; kurulu veritabanları için yıkıcı şema göçü gerekmez.

### Mağaza fiyat davranışı

- Ölçü düğmesinde fiyat farkı `+300 TL` biçiminde görünür.
- Ölçü seçildiğinde ürün fiyatı aynı anda temel fiyat + ölçü farkına döner.
- Doğrulanan örnek: Manifesto Poster Seti `50 × 70 cm (+300 TL)` seçiminde `690 TL → 990 TL`.
- Sepet birim fiyatı, satır toplamı, sipariş özeti ve WhatsApp mesajı aynı fiyat hesaplama fonksiyonunu kullanır.
- Eski tarayıcı kayıtlarındaki metin tabanlı ölçüler, fiyat farkı `0` olacak şekilde geriye uyumlu okunur.

## SQL, kurulum ve güvenlik

- `categories`, `products`, `store_settings`, `admin_users` ve `activity_log` tabloları otomatik kurulum şemasında bulunur.
- Kategori ve ürün yazma işlemleri yönetici oturumu, aynı kaynak ve CSRF kontrolü gerektirir.
- Kategori adı, renk listesi, ölçü nesneleri ve fiyat farkları PHP tarafında yeniden doğrulanır.
- SQL yedek çıktısı kategorileri ve ölçü fiyat farklarını kapsar.
- `install.php`, şemayı, başlangıç kategorilerini/ürünlerini ve ilk yöneticiyi kurar; ardından kurulumu kilitler.

## Doğrulama sonucu

- TypeScript `--noEmit`: geçti.
- Vite production build: geçti, 20 modül dönüştürüldü.
- PHP syntax: `install.php`, `bootstrap.php`, `index.php`, `seed.php` geçti.
- SQL kurucu ayrıştırması: 5 tablo ifadesi geçti.
- Eski/yeni ölçü JSON uyumluluk kontrolü: geçti.
- Tek görsel ve çoklu galeri SQL veri uyumluluk kontrolü: geçti.
- Eski kayıt, JSON galeri ve `templateVisible: false` medya ayarı uyumluluk kontrolü: geçti.
- Sunucu görsel sınırı kontrolü: 2 geçerli görsel kabul edildi, 5 görsel `validation_error` ile reddedildi.
- Tarayıcıda kategori bölümü, dinamik renk/ölçü satırları ve `+300 TL → 990 TL` fiyat etkisi doğrulandı.
- Tarayıcıda görsel yöneticisinin açıklama, ekleme, boş durum ve responsive panel görünümü doğrulandı.
- Tarayıcıda mevcut varsayılan görsel kartı, kaldırılmış durum, görselsiz canlı önizleme ve geri getirme akışı doğrulandı.
- Ürün detay sayfasının görselsiz eski ürünlerde iki temsili galeri öğesini göstermeye devam ettiği doğrulandı.
- Sepette seçilen varyantın birim fiyatı ve toplamı `990 TL` olarak doğrulandı.
- Stok alanı veya stok metni kaynakta ve dağıtım içeriğinde bulunmuyor.

## Sınır

- Yerel Vite sunucusu PHP çalıştırmadığı için tarayıcı testi açıkça işaretlenmiş demo veri katmanıyla yapıldı.
- Gerçek MySQL kurulumu ve cPanel barındırması için kullanıcı veritabanı bilgileri mevcut olmadığından canlı bağlantı testi yapılmadı; PHP akışı, şema, kurulum kilidi ve paket içeriği yerelde doğrulandı.
- Tarayıcı otomasyon ortamı yerel dosya seçicisine dosya enjekte etmeye izin vermediği için fiziksel dosya seçimi otomatikleştirilemedi; dosya türü/boyutu, FileReader akışı, galeri state'i ve sunucu doğrulaması kod ve veri testleriyle kontrol edildi.

## 03 Ekim 2026 MVP yayın sertleştirmesi

- `StoreSettings`; kurumsal site URL'i ile satıcı unvanı, adresi, e-postası,
  kayıt/vergi bilgisi ve yetki alanı notunu kapsayacak biçimde genişletildi.
- Üretim varsayılanı `acceptingOrders=false` oldu. Geçerli 10–15 haneli
  WhatsApp numarası ile zorunlu satıcı bilgileri eksikken siparişe açma hem
  istemcide hem PHP API'de reddediliyor.
- Müşteri footer'ındaki yönetim paneli bağlantısı kaldırıldı; Creative Studio
  bağlantısı mağaza ayarındaki kurumsal URL'den besleniyor.
- JSON yedeğe şema sürümü eklendi. Geri yükleme yönetici + aynı kaynak + CSRF
  kontrolüyle, tam doğrulama sonrasında tek SQL transaction içinde çalışıyor.
- Görsel MIME türü artık yalnızca uzantı/data URL etiketiyle değil gerçek dosya
  içeriğinden doğrulanıyor; 700 KB ve dört görsel sınırı sunucuda yeniden uygulanıyor.
- Dört farklı geçerli PNG aynı ürün galerisi için kabul edildi; beşinci görsel
  ve 700 KB üstü içerik PHP katmanında `validation_error` ile reddedildi.
- Sistem sıfırlama için `SIFIRLA` yazılı onayı zorunlu hale getirildi.
- Üretim derlemesi SQL kurulmamışken `/api/index.php?resource=bootstrap` için
  `503 not_installed` verdi; görünür hata mesajı gösterdi, ürün kartı sayısı `0`
  kaldı ve demo kataloğa düşmedi.
- Responsive ölçümde kurumsal site 320/390/768/1440, mağaza 390/768/1440
  genişliklerinde taşmasızdı. Mağazanın 320 px başlığındaki 8 px taşma
  düzeltildi ve tekrar ölçümde `scrollWidth = innerWidth = 320` sonucu alındı.
- React kalite kontrolünde yeni bağımlılık veya ağır istemci modülü eklenmedi;
  TypeScript ve Vite üretim derlemesi yeniden geçti.

final result: passed
