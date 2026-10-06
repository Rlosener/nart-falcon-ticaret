export type ProductSize = {
  name: string
  priceDelta: number
}

export type Product = {
  id: string
  name: string
  category: string
  price: number
  oldPrice?: number
  badge?: string
  kind: string
  tone: string
  colors: string[]
  sizes: ProductSize[]
  description: string
  material: string
  active?: boolean
  images?: string[]
  image?: string
  templateVisible?: boolean
}
export const products: Product[] = [
  {
    id: "manifesto-poster",
    name: "Manifesto Poster Seti",
    category: "Poster & Baskı",
    price: 690,
    badge: "Yeni",
    kind: "poster",
    tone: "lime",
    colors: ["Neon Yeşil", "Siyah"],
    sizes: [
      { name: "30 × 40 cm", priceDelta: 0 },
      { name: "50 × 70 cm", priceDelta: 300 },
    ],
    description:
      "Duvarında bir fikirden fazlası olsun. Cesur tipografi, güçlü bir duruş. İki parçalı Manifesto seti, yaratıcı alanına Nart Falcon karakterini taşır.",
    material:
      "250 gr mat sanat kâğıdı · 2 adet poster · Çerçeve dahil değildir",
  },
  {
    id: "everyday-tote",
    name: "Everyday Tote Bag",
    category: "Giyim & Aksesuar",
    price: 490,
    badge: "Çok satan",
    kind: "tote",
    tone: "black",
    colors: ["Siyah", "Doğal"],
    sizes: [{ name: "Standart", priceDelta: 0 }],
    description:
      "Fikirlerini yanında taşı. Dayanıklı pamuk kanvas, geniş iç hacim ve her güne eşlik eden yalın bir tasarım.",
    material: "%100 pamuk kanvas · 38 × 42 cm · 65 cm sap",
  },
  {
    id: "creative-notebook",
    name: "Creative Notes Defter",
    category: "Kırtasiye",
    price: 320,
    kind: "notebook",
    tone: "cream",
    colors: ["Doğal", "Siyah"],
    sizes: [{ name: "A5", priceDelta: 0 }],
    description:
      "Henüz söylenmemiş fikirler için boş bir alan. Noktalı sayfalar ve düz açılabilen cilt ile düşünceden tasarıma.",
    material: "120 sayfa · 100 gr noktalı kâğıt · İplik dikişli cilt",
  },
  {
    id: "signature-tee",
    name: "Signature Oversize T-shirt",
    category: "Giyim & Aksesuar",
    price: 890,
    oldPrice: 1090,
    badge: "İndirimli",
    kind: "tee",
    tone: "black",
    colors: ["Siyah", "Beyaz"],
    sizes: [
      { name: "S", priceDelta: 0 },
      { name: "M", priceDelta: 0 },
      { name: "L", priceDelta: 0 },
      { name: "XL", priceDelta: 80 },
    ],
    description:
      "Duruşunu giy. Rahat kesim, yoğun pamuk dokusu ve küçük bir imza. Günlük stilin için düşünülmüş bir temel parça.",
    material: "%100 pamuk · 240 gr kumaş · Oversize kesim",
  },
  {
    id: "bold-print",
    name: "Bold Art Print",
    category: "Poster & Baskı",
    price: 450,
    badge: "Yeni",
    kind: "art",
    tone: "cream",
    colors: ["Doğal", "Neon Yeşil"],
    sizes: [
      { name: "30 × 40 cm", priceDelta: 0 },
      { name: "50 × 70 cm", priceDelta: 220 },
    ],
    description:
      "Biçimin ötesine geç. Geometrinin ve negatif alanın dengesiyle tasarlanan özel sanat baskısı.",
    material: "300 gr dokulu sanat kâğıdı · Arşiv kalitesinde baskı",
  },
  {
    id: "studio-cup",
    name: "Studio Seramik Kupa",
    category: "Yaşam & Obje",
    price: 580,
    kind: "cup",
    tone: "cream",
    colors: ["Doğal", "Siyah"],
    sizes: [{ name: "300 ml", priceDelta: 0 }],
    description:
      "Yaratıcı molalar için. Elde tamamlanan seramik dokusu ve dengeli formuyla masanda kendine bir yer açar.",
    material: "Seramik · 300 ml · Bulaşık makinesinde yıkanabilir",
  },
  {
    id: "sticker-pack",
    name: "Make Your Mark Sticker Seti",
    category: "Kırtasiye",
    price: 190,
    kind: "stickers",
    tone: "lime",
    colors: ["Çok Renkli"],
    sizes: [{ name: "6 parça", priceDelta: 0 }],
    description:
      "Küçük yüzeyler, güçlü mesajlar. Bilgisayarına, defterine veya yaratıcı alanına kendi izini bırak.",
    material: "6 adet vinil sticker · Suya dayanıklı · Mat yüzey",
  },
  {
    id: "limited-object",
    name: "Loop Masa Objesi",
    category: "Yaşam & Obje",
    price: 1250,
    badge: "Sınırlı seri",
    kind: "object",
    tone: "black",
    colors: ["Siyah"],
    sizes: [{ name: "Standart", priceDelta: 0 }],
    description:
      "Tek bir çizgiden doğan heykelsi bir form. Sınırlı üretim Loop, günlük alanlara farklı bir perspektif getirir.",
    material: "Mat kompozit · 18 × 12 × 8 cm · Sınırlı üretim",
  },
]
export const categories = [
  "Tüm Ürünler",
  "Poster & Baskı",
  "Giyim & Aksesuar",
  "Kırtasiye",
  "Yaşam & Obje",
]
export const money = (amount: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount)
export const WHATSAPP_NUMARASI = "[WHATSAPP_NUMARASI]"
export type CartItem = {
  productId: string
  color: string
  size: string
  quantity: number
}
export type Customer = {
  name: string
  phone: string
  city: string
  district: string
  address: string
  note: string
  consent: boolean
}
export const emptyCustomer: Customer = {
  name: "",
  phone: "",
  city: "",
  district: "",
  address: "",
  note: "",
  consent: false,
}
export const itemKey = (item: CartItem) =>
  `${item.productId}:${item.color}:${item.size}`
export const productUnitPrice = (product: Product, sizeName: string) =>
  product.price +
  (product.sizes.find((size) => size.name === sizeName)?.priceDelta ?? 0)
export const cartTotal = (cart: CartItem[]) =>
  cartTotalForProducts(cart, products)
export const cartTotalForProducts = (cart: CartItem[], catalog: Product[]) =>
  cart.reduce((sum, item) => {
    const product = catalog.find((candidate) => candidate.id === item.productId)
    return (
      sum + (product ? productUnitPrice(product, item.size) : 0) * item.quantity
    )
  }, 0)
export function orderMessage(
  cart: CartItem[],
  customer: Customer,
  catalog: Product[] = products,
) {
  return `Merhaba Nart Falcon, web sitenizden sipariş vermek istiyorum.\n\nMÜŞTERİ BİLGİLERİ\nAd Soyad: ${customer.name}\nTelefon: ${customer.phone}\nŞehir / İlçe: ${customer.city} / ${customer.district}\nTeslimat Adresi: ${customer.address}\n\nSİPARİŞ DETAYLARI\n${cart
    .flatMap((item, index) => {
      const product = catalog.find((p) => p.id === item.productId)
      if (!product) return []
      const unitPrice = productUnitPrice(product, item.size)
      return `${index + 1}. ${product.name}\n   Varyant: ${item.color} / ${item.size}\n   Adet: ${item.quantity}\n   Birim Fiyat: ${money(unitPrice)}\n   Ara Toplam: ${money(unitPrice * item.quantity)}`
    })
    .join(
      "\n\n",
    )}\n\nTOPLAM: ${money(cartTotalForProducts(cart, catalog))}\nSipariş Notu: ${customer.note.trim() || "Yok"}`
}
