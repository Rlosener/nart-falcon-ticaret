# NART FALCON Ticaret — mağaza arayüzü

Bu depo, `E-Ticaret Sitesi Tasarımı/` klasöründe yer alan React tabanlı mağaza arayüzünü içerir. Paket yapılandırması React 19, TypeScript ve Vite kullanır. Depodaki mevcut istemci kodu; bağımsız bir ödeme, sipariş backend'i veya gerçek kullanıcı kimlik doğrulaması bulunduğunu tek başına doğrulamıyor.

## Tasarım yaklaşımı

Ürün keşfi için katalog, kategori ve detay ekranlarını sade bir görsel hiyerarşide düzenleyin. Renk, tipografi ve buton durumları tek bir tutarlı dilde kalmalı; sepet ve satın alma çağrıları gerçek servisle bağlanmadıysa demo arayüz olarak açıkça işaretlenmelidir. Mobilde ürün görseli, fiyat ve ana aksiyon ilk bakışta anlaşılır olmalıdır.

## Teknoloji

- React 19 ve React DOM
- TypeScript
- Vite
- Tailwind CSS 4
- Biçimlendirme: oxfmt

## Çalıştırma

```bash
cd "E-Ticaret Sitesi Tasarımı"
pnpm install
pnpm dev
```

Üretim derlemesi ve önizleme:

```bash
pnpm build
pnpm preview
```

## Kaynak yapısı

Uygulama ve ekran bileşenleri alt klasördeki `src/` içinde bulunur. Projeye ait daha ayrıntılı ekran/klasör notları için [alt proje README'sini](E-Ticaret%20Sitesi%20Tasarımı/README.md) inceleyin.

Harici API, ödeme veya müşteri verisi eklendiğinde credentials'ı frontend'e gömmeyin; sunucu katmanı, hata durumları ve gerçek işlem sonuçları ayrıca tasarlanmalıdır.
