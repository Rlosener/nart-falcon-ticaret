import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import {
  Button,
  HeroArt,
  Icon,
  IconButton,
  Overlay,
  ProductArt,
  Quantity,
} from "./ui"
import {
  cartTotalForProducts,
  emptyCustomer,
  itemKey,
  money,
  orderMessage,
  productUnitPrice,
  type CartItem,
  type Customer,
  type Product,
} from "./data"
import { useCatalog } from "./catalog"
import { AdminPage } from "./admin"

function stored<T>(key: string, fallback: T, session = false): T {
  try {
    return (
      JSON.parse(
        (session ? sessionStorage : localStorage).getItem(key) || "null",
      ) ?? fallback
    )
  } catch {
    return fallback
  }
}
function routeNow() {
  return window.location.hash.slice(1) || "/"
}
function go(path: string) {
  if (routeNow() === path)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  else window.location.hash = path
}
const nav = [
  ["Ana Sayfa", "/"],
  ["Mağaza", "/magaza"],
  ["Koleksiyonlar", "/koleksiyonlar"],
  ["Hakkımızda", "/hakkimizda"],
  ["İçgörüler", "/icgoruler"],
  ["İletişim", "/iletisim"],
]
const colorClasses: Record<string, string> = {
  Siyah: "swatch-black",
  "Neon Yeşil": "swatch-lime",
  Doğal: "swatch-cream",
  Beyaz: "swatch-white",
  "Çok Renkli": "swatch-multi",
}
function Breadcrumb({ title }: { title: string }) {
  return (
    <div className="breadcrumb">
      <a href="#/">Ana Sayfa</a>
      <Icon name="chevron" size={12} />
      <a href="#/magaza">Mağaza</a>
      <Icon name="chevron" size={12} />
      <span>{title}</span>
    </div>
  )
}
function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <a className="product-image" href={`#/urun/${product.id}`}>
        <ProductArt product={product} />
        <div className="hover-art">
          <ProductArt product={product} alternate />
        </div>
        {product.badge && (
          <span
            className={`badge ${
              product.badge === "Yeni"
                ? "badge-light"
                : product.oldPrice
                  ? "badge-lime"
                  : ""
            }`}
          >
            {product.badge}
          </span>
        )}
        <span className="image-corner">
          <Icon name="diagonal" size={18} />
        </span>
      </a>
      <div className="product-meta">
        <span>{product.category}</span>
        <div className="swatches">
          {product.colors.map((color) => (
            <span
              key={color}
              className={`swatch ${colorClasses[color] || "swatch-custom"}`}
              title={color}
            />
          ))}
        </div>
      </div>
      <div className="product-name-row">
        <a href={`#/urun/${product.id}`}>{product.name}</a>
        <IconButton
          label={`${product.name} için varyant seç ve sepete ekle`}
          name="plus"
          onClick={() => go(`/urun/${product.id}`)}
        />
      </div>
      <div className="price">
        {money(product.price)}{" "}
        {product.oldPrice && <del>{money(product.oldPrice)}</del>}
      </div>
    </article>
  )
}
function SectionHeader({
  eyebrow,
  title,
  link = "/magaza",
  label = "Tümünü keşfet",
}: {
  eyebrow: string
  title: string
  link?: string
  label?: string
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <a className="text-link" href={`#${link}`}>
        {label}
        <Icon name="diagonal" size={18} />
      </a>
    </div>
  )
}

function PageLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const startedAt = performance.now()
    const minimumDuration = reducedMotion ? 120 : 950
    let pageLoaded = document.readyState === "complete"
    let completed = false
    let frame = 0
    let leaveTimer = 0

    const markLoaded = () => {
      pageLoaded = true
    }
    const finish = () => {
      if (completed) return
      completed = true
      setProgress(100)
      setLeaving(true)
      leaveTimer = window.setTimeout(onComplete, reducedMotion ? 40 : 520)
    }
    const tick = (now: number) => {
      const elapsed = now - startedAt
      const simulated = Math.min(94, Math.round((elapsed / 1150) * 94))
      setProgress(pageLoaded ? Math.max(simulated, 82) : simulated)
      if ((pageLoaded && elapsed >= minimumDuration) || elapsed >= 2600) {
        finish()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener("load", markLoaded, { once: true })
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(leaveTimer)
      window.removeEventListener("load", markLoaded)
    }
  }, [onComplete])

  return (
    <div
      className={`nf-loader ${leaving ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`Nart Falcon mağazası yükleniyor, yüzde ${progress}`}
    >
      <div className="nf-loader-inner">
        <img src="/assets/logo.svg" alt="Nart Falcon Creative" />
        <div className="nf-loader-copy">
          <span>CREATIVE GOODS / 2026</span>
          <strong>YÜKLENİYOR</strong>
        </div>
        <div
          className="nf-loader-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <i style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <div className="nf-loader-meta">
          <span>FARK YARAT.</span>
          <b>{progress.toString().padStart(3, "0")}</b>
          <span>İZ BIRAK.</span>
        </div>
      </div>
    </div>
  )
}

function ScrollProgress() {
  useEffect(() => {
    const sync = () => {
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      )
      document.documentElement.style.setProperty(
        "--nf-scroll-progress",
        String(Math.min(1, window.scrollY / max)),
      )
      document.body.classList.toggle("nf-scrolled", window.scrollY > 24)
    }
    sync()
    window.addEventListener("scroll", sync, { passive: true })
    window.addEventListener("resize", sync)
    return () => {
      window.removeEventListener("scroll", sync)
      window.removeEventListener("resize", sync)
      document.body.classList.remove("nf-scrolled")
    }
  }, [])

  return (
    <div className="nf-scroll-progress" aria-hidden="true">
      <span />
    </div>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const sync = () => setVisible(window.scrollY > 700)
    sync()
    window.addEventListener("scroll", sync, { passive: true })
    return () => window.removeEventListener("scroll", sync)
  }, [])
  return (
    <button
      className={`nf-back-to-top ${visible ? "is-visible" : ""}`}
      type="button"
      aria-label="Sayfanın başına dön"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <Icon name="down" size={18} />
    </button>
  )
}

function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () => {
      if (paused || document.hidden) {
        video.pause()
        return
      }
      video.play().catch(() => setPaused(true))
    }
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [paused])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = (event: MediaQueryListEvent) => setPaused(event.matches)
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return (
    <>
      <div className={`hero-media ${ready ? "is-ready" : ""}`}>
        <video
          ref={videoRef}
          aria-hidden="true"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/assets/nart-falcon-hero.jpg"
          onCanPlay={() => setReady(true)}
        >
          <source src="/assets/nart-falcon-hero.mp4" type="video/mp4" />
        </video>
      </div>
      <button
        className="hero-video-toggle"
        type="button"
        aria-pressed={paused}
        aria-label={`Arka plan videosunu ${paused ? "oynat" : "duraklat"}`}
        onClick={() => setPaused((current) => !current)}
      >
        <span className={paused ? "out-dot" : "live-dot"} />
        {paused ? "Videoyu oynat" : "Videoyu duraklat"}
      </button>
    </>
  )
}

function usePageMotion(route: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return
    let observer: IntersectionObserver | undefined
    const frame = requestAnimationFrame(() => {
      const root = document.getElementById("main-content")
      if (!root) return
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(
          [
            ".section-heading",
            ".category-card",
            ".product-card",
            ".collection-feature > *",
            ".manifesto > *",
            ".editorial > *",
            ".trust-bar > *",
            ".insight-grid > *",
            ".page-heading",
            ".shop-toolbar",
            ".shop-layout",
            ".product-detail > *",
            ".checkout-layout > *",
            ".about-copy > *",
            ".contact-layout > *",
            ".collection-list > *",
            ".legal-page > *",
            ".article-page > *",
          ].join(","),
        ),
      )
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
      nodes.forEach((node, index) => {
        node.classList.add("nf-reveal")
        node.style.setProperty("--nf-reveal-delay", `${(index % 4) * 70}ms`)
      })
      if (reducedMotion || !("IntersectionObserver" in window)) {
        nodes.forEach((node) => node.classList.add("is-visible"))
        return
      }
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add("is-visible")
            observer?.unobserve(entry.target)
          })
        },
        { rootMargin: "0px 0px -8%", threshold: 0.08 },
      )
      nodes.forEach((node) => observer?.observe(node))
    })
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [route, ready])
}

function Home() {
  const { storefrontProducts: products } = useCatalog()
  const categories = useMemo(
    () => [
      "Tüm Ürünler",
      ...Array.from(new Set(products.map((product) => product.category))),
    ],
    [products],
  )
  const categoryCards = categories
    .slice(1, 5)
    .map((category) => ({
      category,
      product: products.find((product) => product.category === category),
    }))
    .filter(
      (item): item is { category: string; product: Product } => !!item.product,
    )
  return (
    <>
      <section className="hero">
        <HeroBackgroundVideo />
        <div className="hero-side">
          NART FALCON — CREATIVE GOODS<span>01 / 2026</span>
        </div>
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="live-dot" /> BAĞIMSIZ FİKİRLER. GÜÇLÜ İZLER.
          </div>
          <h1>
            Fark yarat.
            <br />
            <span>İz bırak.</span>
          </h1>
          <p>
            Strateji, tasarım ve teknoloji.
            <br />
            Şimdi, hayatına dokunan tasarımlarda.
          </p>
          <div className="hero-actions">
            <Button onClick={() => go("/magaza")}>
              Mağazayı Keşfet <Icon name="diagonal" />
            </Button>
            <a className="hero-secondary" href="#/koleksiyon/manifesto">
              Yeni Koleksiyon <Icon name="arrow" size={18} />
            </a>
          </div>
          <div className="hero-footnote">
            <span>ÖZGÜN TASARIM.</span>
            <span>GÜNLÜK İLHAM.</span>
            <span>KALICI ETKİ.</span>
          </div>
        </div>
        <HeroArt />
      </section>
      <div className="hero-bottom">
        <span>Bir fikirden fazlası. Bir duruş.</span>
        <div>
          <span>TASARIM</span>
          <i /> <span>YAŞAM</span>
          <i /> <span>DENEYİM</span>
          <i /> <span>NART FALCON</span>
        </div>
        <a
          href="#categories"
          aria-label="Kategorilere git"
          onClick={(e) => {
            e.preventDefault()
            document
              .getElementById("categories")
              ?.scrollIntoView({ behavior: "smooth" })
          }}
        >
          <Icon name="down" />
        </a>
      </div>
      <section className="section categories-section" id="categories">
        <SectionHeader
          eyebrow="YARATICILIĞA ALAN AÇ"
          title="Kendi izini bul."
          label="Tüm ürünler"
        />
        <div className="category-grid">
          {categoryCards.map(({ category, product }, index) => (
            <a
              href={`#/magaza?kategori=${encodeURIComponent(category)}`}
              className="category-card"
              key={category}
            >
              <span className="category-index">0{index + 1}</span>
              <div className="category-visual">
                <ProductArt product={product} />
              </div>
              <div className="category-title">
                <h3>{category}</h3>
                <Icon name="diagonal" />
              </div>
              <span className="category-desc">
                {
                  [
                    "Duvarlarında güçlü fikirler.",
                    "Duruşunu yanında taşı.",
                    "Yeni fikirler için boş bir sayfa.",
                    "Günlük hayatın, başka bir açıdan.",
                  ][index]
                }
              </span>
            </a>
          ))}
        </div>
      </section>
      <section className="section new-section">
        <SectionHeader
          eyebrow="STÜDYODAN YENİ ÇIKTI"
          title="Yeni fikirler. Yeni parçalar."
          label="Mağazayı keşfet"
        />
        <div className="product-grid">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="collection-feature">
        <div className="collection-image">
          <img
            src="/assets/content.svg"
            alt="Daha cesur, daha özgün Manifesto koleksiyonu tasarımları"
          />
        </div>
        <div className="collection-copy">
          <span className="eyebrow">01 / THE MANIFESTO COLLECTION</span>
          <h2>
            Sadece bir ürün değil.
            <br />
            Bir ifade biçimi.
          </h2>
          <p>
            Cesur fikirlerden doğan, gündelik hayatın içinde kendine yer bulan
            parçalar. İlk koleksiyonumuzla tanış.
          </p>
          <Button onClick={() => go("/koleksiyon/manifesto")}>
            Koleksiyonu Keşfet <Icon name="diagonal" />
          </Button>
          <span className="collection-bottom">
            BAĞIMSIZ TASARIM. SINIRLI ÜRETİM.
          </span>
        </div>
      </section>
      <section className="section">
        <SectionHeader
          eyebrow="SİZİN SEÇİMLERİNİZ"
          title="İz bırakan parçalar."
          label="Tüm ürünler"
        />
        <div className="product-grid">
          {products.slice(1, 5).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="manifesto">
        <span className="eyebrow">NART FALCON MANİFESTOSU</span>
        <h2>
          İyi tasarım, sadece
          <br />
          görünmez. <span>Hissedilir.</span>
        </h2>
        <div className="manifesto-bottom">
          <p>
            Biz, fikirlerin gücüne inanıyoruz. Her detayda bir niyet,
            <br />
            her parçada bir hikâye. Daha az sıradan. Daha çok sen.
          </p>
          <a className="text-link" href="#/hakkimizda">
            Bizi tanı <Icon name="diagonal" />
          </a>
        </div>
        <img className="manifesto-symbol" src="/assets/symbol.svg" alt="" />
      </section>
      <section className="section editorial">
        <div>
          <span className="eyebrow">FİKİRDEN NESNEYE</span>
          <h2>
            Her parçanın
            <br />
            bir başlangıcı var.
          </h2>
          <p>
            Bir çizgi, bir kelime, bir bakış açısı. Stüdyomuzda doğan fikirlerin
            günlük hayatın bir parçasına dönüşme hikâyesi.
          </p>
          <a className="text-link" href="#/icgoru/tasarim-sureci">
            Tasarım sürecini keşfet <Icon name="diagonal" />
          </a>
        </div>
        <div className="studio-image">
          <img
            src="/assets/design-workspace.jpg"
            alt="Çerçeveli grafik poster, çizim tableti ve bilgisayarlarla yaratıcı bir çalışma alanı"
            title="Fotoğraf: Shpëtim Ujkani / Unsplash"
            loading="lazy"
          />
          <span>STÜDYO İLHAMI / SHPËTIM UJKANI — UNSPLASH</span>
        </div>
      </section>
      <TrustBar />
      <section className="section insights-section">
        <SectionHeader
          eyebrow="STÜDYODAN NOTLAR"
          title="Fikirler, notlar, içgörüler."
          link="/icgoruler"
          label="Tüm içgörüler"
        />
        <div className="insight-grid">
          {[
            ["identity", "Bir fikrin fiziksel hâli", "tasarim-sureci"],
            ["direction", "Neden daha az, daha çoktur?", "yalin-tasarim"],
            ["content", "Günlük hayatında kendi izini bırak", "kendi-izin"],
          ].map(([asset, title, slug], i) => (
            <a href={`#/icgoru/${slug}`} key={slug}>
              <img src={`/assets/${asset}.svg`} alt={title} loading="lazy" />
              <span className="eyebrow">
                {i === 0 ? "TASARIM SÜRECİ" : i === 1 ? "PERSPEKTİF" : "İLHAM"}{" "}
                / 4 DK OKUMA
              </span>
              <div>
                <h3>{title}</h3>
                <Icon name="diagonal" />
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}
function TrustBar() {
  return (
    <div className="trust-bar">
      {[
        ["truck", "Özenli teslimat", "Her parça, özenle paketlenir."],
        [
          "return",
          "Şeffaf iade koşulları",
          "Alışverişin her adımında açık bilgi.",
        ],
        ["shield", "Özgün tasarım", "Nart Falcon stüdyosundan."],
        ["chat", "WhatsApp desteği", "Soruların için doğrudan iletişim."],
      ].map(([icon, title, text]) => (
        <a
          key={title}
          href={`#/${
            icon === "chat"
              ? "iletisim"
              : icon === "shield"
                ? "hakkimizda"
                : "teslimat-iade"
          }`}
        >
          <Icon name={icon} size={28} />
          <div>
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        </a>
      ))}
    </div>
  )
}
function Shop({ route }: { route: string }) {
  const { storefrontProducts: products } = useCatalog()
  const categories = useMemo(
    () => [
      "Tüm Ürünler",
      ...Array.from(new Set(products.map((product) => product.category))),
    ],
    [products],
  )
  const params = new URLSearchParams(route.split("?")[1])
  const collection = route.startsWith("/koleksiyon/")
  const [category, setCategory] = useState(
    params.get("kategori") || "Tüm Ürünler",
  )
  const [query, setQuery] = useState(params.get("q") || "")
  const [sort, setSort] = useState("Önerilen")
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")
  const [price, setPrice] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [limit, setLimit] = useState(6)
  const closeFilter = useCallback(() => setFilterOpen(false), [])
  const reset = () => {
    setCategory("Tüm Ürünler")
    setQuery("")
    setColor("")
    setPrice("")
    setSize("")
    setLimit(6)
  }
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (category === "Tüm Ürünler" || p.category === category) &&
            (!collection ||
              [
                "manifesto-poster",
                "everyday-tote",
                "creative-notebook",
                "sticker-pack",
              ].includes(p.id)) &&
            `${p.name} ${p.category}`
              .toLocaleLowerCase("tr")
              .includes(query.toLocaleLowerCase("tr")) &&
            (!color || p.colors.includes(color)) &&
            (!size || p.sizes.some((option) => option.name === size)) &&
            (!price || (price === "low" ? p.price <= 500 : p.price > 500)),
        )
        .sort((a, b) =>
          sort === "Fiyat: Artan"
            ? a.price - b.price
            : sort === "Fiyat: Azalan"
              ? b.price - a.price
              : sort === "Yeni gelenler"
                ? Number(b.badge === "Yeni") - Number(a.badge === "Yeni")
                : 0,
        ),
    [products, category, query, color, price, size, sort, collection],
  )
  const filters = (
    <div className="filter-content">
      <div className="filter-group">
        <h3>Kategoriler</h3>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-filter ${category === cat ? "selected" : ""}`}
            onClick={() => {
              setCategory(cat)
              setLimit(6)
            }}
          >
            {cat}
            <span>
              {cat === "Tüm Ürünler"
                ? products.length
                : products.filter((p) => p.category === cat).length}
            </span>
          </button>
        ))}
      </div>
      <div className="filter-group">
        <h3>Fiyat aralığı</h3>
        <select
          aria-label="Fiyat aralığı"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        >
          <option value="">Tüm fiyatlar</option>
          <option value="low">₺500 ve altı</option>
          <option value="high">₺500 üzeri</option>
        </select>
      </div>
      <div className="filter-group">
        <h3>Renk</h3>
        {Array.from(new Set(products.flatMap((product) => product.colors))).map(
          (c) => (
            <button
              key={c}
              className={`color-filter ${color === c ? "selected" : ""}`}
              onClick={() => setColor(color === c ? "" : c)}
            >
              <span
                className={`swatch ${colorClasses[c] || "swatch-custom"}`}
              />
              {c}
              {color === c && <Icon name="check" size={16} />}
            </button>
          ),
        )}
      </div>
      <div className="filter-group">
        <h3>Ölçü / Varyant</h3>
        <select
          aria-label="Ölçü filtresi"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        >
          <option value="">Tüm varyantlar</option>
          {Array.from(
            new Set(
              products.flatMap((product) =>
                product.sizes.map((option) => option.name),
              ),
            ),
          ).map((optionName) => (
            <option key={optionName}>{optionName}</option>
          ))}
        </select>
      </div>
      <Button variant="text" onClick={reset}>
        Tüm filtreleri temizle <Icon name="close" size={16} />
      </Button>
      {filterOpen && (
        <Button onClick={closeFilter}>
          {filtered.length} ürünü göster <Icon name="arrow" />
        </Button>
      )}
    </div>
  )
  const title = collection
    ? "The Manifesto."
    : route.startsWith("/arama")
      ? "Arama sonuçları."
      : category === "Tüm Ürünler"
        ? "Fikirden hayatına."
        : `${category}.`
  return (
    <main className="shop-page section">
      <Breadcrumb
        title={collection ? "Manifesto Koleksiyonu" : "Tüm Ürünler"}
      />
      <div className="page-heading">
        <span className="eyebrow">
          {collection ? "KOLEKSİYON 01 / 2026" : "NART FALCON / MAĞAZA"}
        </span>
        <h1>{title}</h1>
        <p>
          {collection
            ? "Cesur bir duruşun günlük hayattaki karşılığı. İlk koleksiyonumuzu keşfet."
            : "Özgün tasarımlar. Günlük ilham. Kendi izini bırakan parçaları keşfet."}
        </p>
      </div>
      <div className="shop-toolbar">
        <div className="search-input">
          <Icon name="search" />
          <input
            aria-label="Ürünlerde ara"
            placeholder="Bir fikir, bir ürün ara…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(6)
            }}
          />
        </div>
        <span>{filtered.length} ürün</span>
        <Button
          variant="outline"
          className="mobile-filter"
          onClick={() => setFilterOpen(true)}
        >
          <Icon name="filter" /> Filtrele
        </Button>
        <select
          aria-label="Ürün sıralama"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {["Önerilen", "Yeni gelenler", "Fiyat: Artan", "Fiyat: Azalan"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      <div className="shop-layout">
        <aside className="desktop-filters">{filters}</aside>
        <div className="shop-results">
          <div className="active-filters">
            {[
              [
                category !== "Tüm Ürünler" ? category : "",
                () => setCategory("Tüm Ürünler"),
              ],
              [color, () => setColor("")],
              [size, () => setSize("")],
              [
                price ? (price === "low" ? "₺500 ve altı" : "₺500 üzeri") : "",
                () => setPrice(""),
              ],
            ].map(
              ([text, fn], i) =>
                text && (
                  <button key={i} onClick={fn as () => void}>
                    {text as string}
                    <Icon name="close" size={14} />
                  </button>
                ),
            )}
          </div>
          {filtered.length ? (
            <>
              <div className="product-grid shop-grid">
                {filtered.slice(0, limit).map((p) => (
                  <ProductCard product={p} key={p.id} />
                ))}
              </div>
              <div className="load-more">
                <span>
                  {Math.min(limit, filtered.length)} / {filtered.length} ürün
                  gösteriliyor
                </span>
                {limit < filtered.length && (
                  <Button variant="outline" onClick={() => setLimit(limit + 6)}>
                    Daha Fazla Yükle <Icon name="plus" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Icon name="search" size={44} />
              <h2>Aradığın parça henüz burada değil.</h2>
              <p>Farklı bir kelime dene veya filtrelerini sadeleştir.</p>
              <Button onClick={reset}>Filtreleri temizle</Button>
            </div>
          )}
        </div>
      </div>
      {filterOpen && (
        <Overlay title="Filtreler" onClose={closeFilter}>
          {filters}
        </Overlay>
      )}
    </main>
  )
}
function ProductDetail({
  product,
  add,
  notify,
}: {
  product: Product
  add: (p: Product, color: string, size: string, qty: number) => void
  notify: (text: string) => void
}) {
  const { storefrontProducts: products, settings } = useCatalog()
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState("")
  const [image, setImage] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [busy, setBusy] = useState(false)
  const galleryImages = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : []
  const galleryItems = galleryImages.length
    ? galleryImages.map((src, index) => ({ src, alternate: false, index }))
    : product.templateVisible === false
      ? [{ src: undefined, alternate: false, index: 0 }]
      : [
          { src: undefined, alternate: false, index: 0 },
          { src: undefined, alternate: true, index: 1 },
        ]
  const selectedSize = product.sizes.find((option) => option.name === size)
  const selectedPrice = productUnitPrice(product, size)
  const selectedOldPrice = product.oldPrice
    ? product.oldPrice + (selectedSize?.priceDelta ?? 0)
    : undefined
  const closeZoom = useCallback(() => setZoom(false), [])
  const handleAdd = () => {
    if (!settings.acceptingOrders) {
      notify("Sipariş alımı şu anda kapalı. Daha sonra tekrar deneyebilirsin.")
      return
    }
    if (!color || !size) {
      setError("Sepete eklemek için lütfen renk ve ölçü seç.")
      return
    }
    setError("")
    setBusy(true)
    add(product, color, size, quantity)
    window.setTimeout(() => setBusy(false), 450)
  }
  return (
    <main className="section product-page">
      <Breadcrumb title={product.name} />
      <div className="product-detail">
        <div className="gallery">
          <div className="main-product-image">
            <ProductArt
              product={product}
              alternate={galleryItems[image]?.alternate}
              color={color}
              imageSrc={galleryItems[image]?.src}
            />
            <IconButton
              label="Ürün görselini büyüt"
              name="zoom"
              onClick={() => setZoom(true)}
            />
          </div>
          <div className="thumbnails">
            {galleryItems.map((item) => (
              <button
                key={item.index}
                className={image === item.index ? "selected" : ""}
                onClick={() => setImage(item.index)}
                aria-label={`${item.index + 1}. ürün görseli`}
              >
                <ProductArt
                  product={product}
                  alternate={item.alternate}
                  color={color}
                  imageSrc={item.src}
                />
              </button>
            ))}
          </div>
          <span className="gallery-caption">
            Tasarım görselleri temsili ürün kompozisyonlarıdır.
          </span>
        </div>
        <div className="product-info">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          <div className="detail-price">
            {money(selectedPrice)}
            {selectedOldPrice && (
              <>
                <del>{money(selectedOldPrice)}</del>
                <span className="badge badge-lime">
                  %{Math.round((1 - selectedPrice / selectedOldPrice) * 100)}{" "}
                  indirim
                </span>
              </>
            )}
          </div>
          <p>{product.description}</p>
          <div className="variant-group">
            <div>
              Renk <span>{color || "Seçim yap"}</span>
            </div>
            <div className="variant-buttons">
              {product.colors.map((c) => (
                <button
                  key={c}
                  aria-pressed={color === c}
                  onClick={() => {
                    setColor(c)
                    setError("")
                  }}
                  className={color === c ? "selected" : ""}
                >
                  <span
                    className={`swatch ${colorClasses[c] || "swatch-custom"}`}
                  />
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="variant-group">
            <div>
              Ölçü / Varyant <span>{size || "Seçim yap"}</span>
            </div>
            <div className="variant-buttons">
              {product.sizes.map((option) => (
                <button
                  key={option.name}
                  aria-pressed={size === option.name}
                  onClick={() => {
                    setSize(option.name)
                    setError("")
                  }}
                  className={size === option.name ? "selected" : ""}
                >
                  <span>{option.name}</span>
                  {option.priceDelta > 0 && (
                    <small>
                      +{option.priceDelta.toLocaleString("tr-TR")} TL
                    </small>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div
            className={`availability-status ${settings.acceptingOrders ? "" : "is-closed"}`}
            role="status"
          >
            <span className="live-dot" />
            {settings.acceptingOrders
              ? "Siparişe ve üretime açık"
              : "Sipariş alımı geçici olarak kapalı"}
          </div>
          {error && (
            <p className="form-error" role="alert">
              <Icon name="alert" size={16} />
              {error}
            </p>
          )}
          <div className="add-to-cart">
            <Quantity value={quantity} onChange={setQuantity} max={99} />
            <Button
              disabled={busy || !settings.acceptingOrders}
              onClick={handleAdd}
            >
              {busy
                ? "Sepete ekleniyor…"
                : !settings.acceptingOrders
                  ? "Siparişler geçici olarak kapalı"
                  : "Sepete Ekle"}
              <Icon name="bag" />
            </Button>
          </div>
          <Button
            variant="outline"
            className="full-width"
            onClick={() => {
              if (!/^\d{10,15}$/.test(settings.whatsappNumber)) {
                notify(
                  "WhatsApp numarası henüz tanımlanmadı. İletişim sayfasını ziyaret edebilirsin.",
                )
                return
              }
              window.open(
                `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(`Merhaba, ${product.name} hakkında bilgi almak istiyorum.`)}`,
                "_blank",
                "noopener,noreferrer",
              )
            }}
          >
            <Icon name="chat" />
            WhatsApp’tan Bilgi Al
          </Button>
          <div className="delivery-note">
            <Icon name="truck" />
            <span>
              Özenli paketleme. Teslimat koşulları WhatsApp’ta netleştirilir.
            </span>
          </div>
          {[
            ["Ürün detayları", product.description],
            ["Teknik özellikler & materyal", product.material],
            [
              "Teslimat & iade",
              "Teslimat süresi ve kargo bedeli siparişin onaylanmasından önce WhatsApp üzerinden paylaşılır. Kişiye özel olmayan ürünlerde yasal cayma hakların saklıdır.",
            ],
          ].map(([title, text], i) => (
            <details key={title} open={i === 0}>
              <summary>
                {title}
                <Icon name="plus" size={18} />
              </summary>
              <p>{text}</p>
            </details>
          ))}
        </div>
      </div>
      <section className="related">
        <SectionHeader
          eyebrow="BİR ARADA DAHA GÜÇLÜ"
          title="Birlikte tercih edilenler."
        />
        <div className="product-grid">
          {products
            .filter((p) => p.id !== product.id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      {zoom && (
        <Overlay
          title={product.name}
          onClose={closeZoom}
          className="zoom-modal"
        >
          <ProductArt
            product={product}
            color={color}
            alternate={galleryItems[image]?.alternate}
            imageSrc={galleryItems[image]?.src}
          />
        </Overlay>
      )}
    </main>
  )
}
function CartLines({
  cart,
  update,
  remove,
}: {
  cart: CartItem[]
  update: (key: string, qty: number) => void
  remove: (key: string) => void
}) {
  const { storefrontProducts: products } = useCatalog()
  return (
    <div className="cart-lines">
      {cart.map((item) => {
        const product = products.find((p) => p.id === item.productId)
        if (!product)
          return (
            <div
              className="cart-item cart-item-unavailable"
              key={itemKey(item)}
            >
              <div className="cart-item-info">
                <strong>Ürün bilgisi geçici olarak kullanılamıyor</strong>
                <span>
                  {item.productId} · {item.color} / {item.size} · {item.quantity} adet
                </span>
                <button
                  className="remove-link"
                  onClick={() => remove(itemKey(item))}
                >
                  Sepetten çıkar
                </button>
              </div>
            </div>
          )
        const unitPrice = productUnitPrice(product, item.size)
        return (
          <div className="cart-item" key={itemKey(item)}>
            <a href={`#/urun/${product.id}`}>
              <ProductArt product={product} color={item.color} />
            </a>
            <div className="cart-item-info">
              <a href={`#/urun/${product.id}`}>{product.name}</a>
              <span>
                {item.color} / {item.size}
              </span>
              <span>Birim fiyat: {money(unitPrice)}</span>
              <div className="cart-item-actions">
                <Quantity
                  value={item.quantity}
                  onChange={(q) => update(itemKey(item), q)}
                  max={99}
                />
                <button
                  className="remove-link"
                  onClick={() => remove(itemKey(item))}
                >
                  Sil
                </button>
              </div>
            </div>
            <strong>{money(unitPrice * item.quantity)}</strong>
          </div>
        )
      })}
    </div>
  )
}
function EmptyCart() {
  return (
    <div className="empty-state">
      <Icon name="bag" size={48} />
      <span className="eyebrow">YENİ BİR FİKRE YER VAR</span>
      <h2>Henüz bir iz bırakmadın.</h2>
      <p>Sepetin boş. Sana ilham verecek parçaları keşfet.</p>
      <Button onClick={() => go("/magaza")}>
        Mağazayı Keşfet <Icon name="diagonal" />
      </Button>
    </div>
  )
}
function OrderSummary({ cart }: { cart: CartItem[] }) {
  const { storefrontProducts: products } = useCatalog()
  return (
    <div className="order-summary">
      <h2>Sipariş özeti</h2>
      {cart.map((item) => {
        const p = products.find((p) => p.id === item.productId)
        if (!p)
          return (
            <div className="summary-product" key={itemKey(item)}>
              <div>
                <strong>Ürün verisi bekleniyor × {item.quantity}</strong>
                <span>
                  {item.color} / {item.size}
                </span>
              </div>
              <span>—</span>
            </div>
          )
        const unitPrice = productUnitPrice(p, item.size)
        return (
          <div className="summary-product" key={itemKey(item)}>
            <div>
              <strong>
                {p.name} × {item.quantity}
              </strong>
              <span>
                {item.color} / {item.size}
              </span>
            </div>
            <span>{money(unitPrice * item.quantity)}</span>
          </div>
        )
      })}
      <div className="summary-line">
        <span>Ara toplam</span>
        <span>{money(cartTotalForProducts(cart, products))}</span>
      </div>
      <div className="summary-line">
        <span>Teslimat</span>
        <span>WhatsApp’ta netleştirilir</span>
      </div>
      <div className="summary-total">
        <span>Ürün toplamı</span>
        <strong>{money(cartTotalForProducts(cart, products))}</strong>
      </div>
      <p>
        Online ödeme alınmaz. Sipariş ve teslimat detayları WhatsApp üzerinden
        birlikte netleştirilir.
      </p>
    </div>
  )
}
function CartPage({
  cart,
  update,
  remove,
}: {
  cart: CartItem[]
  update: (key: string, qty: number) => void
  remove: (key: string) => void
}) {
  const { settings } = useCatalog()

  return (
    <main className="section cart-page">
      <Breadcrumb title="Sepetim" />
      <div className="page-heading">
        <span className="eyebrow">SEÇTİĞİN PARÇALAR</span>
        <h1>Sepetin. Senin izin.</h1>
      </div>
      {!cart.length ? (
        <EmptyCart />
      ) : (
        <div className="checkout-layout">
          <div>
            <CartLines cart={cart} update={update} remove={remove} />
            <a className="text-link" href="#/magaza">
              Alışverişe devam et <Icon name="arrow" />
            </a>
          </div>
          <div>
            <OrderSummary cart={cart} />
            {!settings.acceptingOrders && (
              <p className="order-closed-notice" role="status">
                Sipariş alımı geçici olarak kapalı. Sepetin bu tarayıcıda
                korunacak.
              </p>
            )}
            <Button
              className="full-width"
              onClick={() => go("/siparis")}
              disabled={!settings.acceptingOrders}
            >
              {settings.acceptingOrders
                ? "Sipariş Detaylarına Geç"
                : "Sipariş Alımı Kapalı"}{" "}
              <Icon name="arrow" />
            </Button>
            <span className="secure-note">
              <Icon name="chat" size={16} />
              Siparişin WhatsApp üzerinden tamamlanır.
            </span>
          </div>
        </div>
      )}
    </main>
  )
}
function Checkout({
  cart,
  customer,
  setCustomer,
}: {
  cart: CartItem[]
  customer: Customer
  setCustomer: (customer: Customer) => void
}) {
  const { settings } = useCatalog()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!settings.acceptingOrders) {
      setErrors({
        order:
          "Sipariş alımı şu anda kapalı. Mağaza yeniden açıldığında devam edebilirsin.",
      })
      return
    }
    const next: Record<string, string> = {}
    if (customer.name.trim().split(/\s+/).length < 2)
      next.name = "Lütfen adını ve soyadını yaz."
    if (
      !/^\+?[\d\s()-]{10,20}$/.test(customer.phone) ||
      customer.phone.replace(/\D/g, "").length < 10
    )
      next.phone = "Geçerli bir WhatsApp telefon numarası yaz."
    if (!customer.city.trim()) next.city = "Şehir bilgisi zorunludur."
    if (!customer.district.trim()) next.district = "İlçe bilgisi zorunludur."
    if (customer.address.trim().length < 10)
      next.address = "Lütfen açık teslimat adresini yaz (en az 10 karakter)."
    if (!customer.consent)
      next.consent =
        "Devam etmek için gizlilik bilgilendirmesini onaylamalısın."
    setErrors(next)
    if (!Object.keys(next).length) {
      setBusy(true)
      window.setTimeout(() => {
        setBusy(false)
        go("/mesaj-onizleme")
      }, 350)
    }
  }
  const fields: [keyof Customer, string, string][] = [
    ["name", "Ad Soyad", "Adın ve soyadın"],
    ["phone", "WhatsApp Telefon Numarası", "Ülke kodu ile telefon numaran"],
    ["city", "Şehir", "Şehir"],
    ["district", "İlçe", "İlçe"],
  ]
  if (!cart.length)
    return (
      <main className="section">
        <EmptyCart />
      </main>
    )
  return (
    <main className="section checkout-page">
      <Breadcrumb title="Sipariş bilgileri" />
      <div className="checkout-steps">
        <a href="#/sepet">01 Sepet</a>
        <span className="current">02 Sipariş bilgileri</span>
        <span>03 WhatsApp mesajı</span>
      </div>
      <div className="page-heading">
        <span className="eyebrow">SONRAKİ ADIM, TANIŞMAK</span>
        <h1>Detayları tamamlayalım.</h1>
        <p>Bilgilerini ekle. Sipariş mesajını birlikte hazırlayalım.</p>
      </div>
      <div className="checkout-layout">
        <form onSubmit={submit} noValidate>
          {!settings.acceptingOrders && (
            <p className="order-closed-notice" role="status">
              Sipariş alımı geçici olarak kapalı. Bilgilerini
              güncelleyebilirsin; WhatsApp mesajı mağaza yeniden açıldığında
              hazırlanabilir.
            </p>
          )}
          <div className="form-grid">
            {fields.map(([key, label, placeholder]) => (
              <label className="field" key={key}>
                {label} <span>*</span>
                <input
                  name={key}
                  autoComplete={
                    key === "name"
                      ? "name"
                      : key === "phone"
                        ? "tel"
                        : key === "city"
                          ? "address-level1"
                          : "address-level2"
                  }
                  type={key === "phone" ? "tel" : "text"}
                  value={customer[key] as string}
                  placeholder={placeholder}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `${key}-error` : undefined}
                  required
                  onChange={(e) => {
                    setCustomer({ ...customer, [key]: e.target.value })
                    setErrors({ ...errors, [key]: "" })
                  }}
                />
                {errors[key] && (
                  <small id={`${key}-error`} className="form-error">
                    {errors[key]}
                  </small>
                )}
              </label>
            ))}
          </div>
          <label className="field">
            Teslimat Adresi <span>*</span>
            <textarea
              rows={4}
              required
              autoComplete="street-address"
              value={customer.address}
              placeholder="Mahalle, sokak, bina ve daire numarası"
              aria-invalid={!!errors.address}
              onChange={(e) =>
                setCustomer({ ...customer, address: e.target.value })
              }
            />
            {errors.address && (
              <small className="form-error">{errors.address}</small>
            )}
          </label>
          <label className="field">
            Sipariş Notu <span className="optional">İsteğe bağlı</span>
            <textarea
              rows={3}
              value={customer.note}
              placeholder="Bizimle paylaşmak istediğin bir detay var mı?"
              onChange={(e) =>
                setCustomer({ ...customer, note: e.target.value })
              }
            />
          </label>
          <label className="checkbox-row consent">
            <input
              type="checkbox"
              checked={customer.consent}
              onChange={(e) =>
                setCustomer({ ...customer, consent: e.target.checked })
              }
            />
            <span>
              <a href="#/gizlilik">KVKK / gizlilik bilgilendirmesini</a> okudum.{" "}
              <span>*</span>
            </span>
          </label>
          {errors.consent && (
            <p className="form-error" role="alert">
              {errors.consent}
            </p>
          )}
          {errors.order && (
            <p className="form-error" role="alert">
              {errors.order}
            </p>
          )}
          <div className="form-actions">
            <a href="#/sepet" className="text-link">
              Sepete dön
            </a>
            <Button type="submit" disabled={busy || !settings.acceptingOrders}>
              {busy ? "Mesaj hazırlanıyor…" : "WhatsApp Mesajını Hazırla"}
              <Icon name="arrow" />
            </Button>
          </div>
          <p className="form-caption">
            Bilgilerin bu sekmede korunur. Henüz bir sipariş gönderilmez ve
            ödeme alınmaz.
          </p>
        </form>
        <OrderSummary cart={cart} />
      </div>
    </main>
  )
}
function MessagePreview({
  cart,
  customer,
  notify,
}: {
  cart: CartItem[]
  customer: Customer
  notify: (text: string) => void
}) {
  const { storefrontProducts: products, settings } = useCatalog()
  const [status, setStatus] = useState<"ready" | "opened" | "error">("ready")
  const [copyError, setCopyError] = useState(false)
  const message = orderMessage(cart, customer, products)
  if (!cart.length)
    return (
      <main className="section">
        <EmptyCart />
      </main>
    )
  if (
    !customer.consent ||
    !customer.name.trim() ||
    !customer.phone.trim() ||
    !customer.city.trim() ||
    !customer.district.trim() ||
    !customer.address.trim()
  )
    return (
      <main className="section">
        <div className="empty-state">
          <h1>Önce detayları tamamlayalım.</h1>
          <p>Mesajını hazırlamak için müşteri bilgilerin gerekli.</p>
          <Button onClick={() => go("/siparis")}>
            Sipariş bilgilerine dön
          </Button>
        </div>
      </main>
    )
  function openWhatsApp() {
    if (
      !settings.acceptingOrders ||
      !/^\d{10,15}$/.test(settings.whatsappNumber)
    ) {
      setStatus("error")
      return
    }
    const url = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`
    const popup = window.open(url, "_blank")
    if (!popup) setStatus("error")
    else {
      popup.opener = null
      setStatus("opened")
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      notify("Sipariş mesajı kopyalandı.")
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }
  return (
    <main className="section preview-page">
      <Breadcrumb title="Mesaj ön izlemesi" />
      <div className="checkout-steps">
        <a href="#/sepet">01 Sepet</a>
        <a href="#/siparis">02 Sipariş bilgileri</a>
        <span className="current">03 WhatsApp mesajı</span>
      </div>
      <div className="page-heading">
        <span className="eyebrow">GÖNDERMEDEN ÖNCE SON BİR BAKIŞ</span>
        <h1>
          {status === "opened" ? "Sohbet şimdi başlıyor." : "Mesajın hazır."}
        </h1>
        <p>Hazırlanan mesajı kontrol et. WhatsApp’ta son adımı sen tamamla.</p>
      </div>
      <div className="checkout-layout">
        <div>
          <div className="message-heading">
            <span>
              <Icon name="chat" /> WhatsApp mesaj ön izlemesi
            </span>
            <a href="#/siparis">
              Bilgileri düzenle <Icon name="diagonal" size={16} />
            </a>
          </div>
          <pre className="message-preview">{message}</pre>
          {copyError && (
            <p className="form-error" role="alert">
              Kopyalama izni alınamadı. Ön izlemedeki metni seçip elle
              kopyalayabilirsin.
            </p>
          )}
          <Button variant="outline" onClick={copy}>
            <Icon name="copy" /> Mesajı Kopyala
          </Button>
        </div>
        <div>
          <OrderSummary cart={cart} />
          {status === "error" && (
            <div className="status-notice error-notice" role="alert">
              <Icon name="alert" />
              <div>
                <strong>WhatsApp açılamadı.</strong>
                <p>
                  {!settings.acceptingOrders
                    ? "Sipariş alımı şu anda kapalı. Mesajını kopyalayıp daha sonra tekrar deneyebilirsin."
                    : !/^\d{10,15}$/.test(settings.whatsappNumber)
                      ? "Mağazanın WhatsApp numarası henüz tanımlanmadı. Mesajını kopyalayabilir ve daha sonra tekrar deneyebilirsin."
                      : "Tarayıcın yeni pencereyi engellemiş olabilir. İzin verip tekrar dene veya mesajını kopyala."}
                </p>
              </div>
            </div>
          )}
          {status === "opened" && (
            <div className="status-notice" role="status">
              <Icon name="check" />
              <div>
                <strong>WhatsApp sohbeti açıldı.</strong>
                <p>
                  Sipariş talebini tamamlamak için hazırlanan mesajı WhatsApp
                  üzerinden gönder. Henüz sipariş onayı verilmedi.
                </p>
              </div>
            </div>
          )}
          <Button className="full-width" onClick={openWhatsApp}>
            <Icon name="chat" />
            {status === "error"
              ? "Tekrar Dene"
              : "WhatsApp’ta Siparişi Tamamla"}
            <Icon name="diagonal" />
          </Button>
          {status === "error" && (
            <Button variant="outline" className="full-width" onClick={copy}>
              Mesajı Kopyala <Icon name="copy" />
            </Button>
          )}
          <p className="form-caption">
            Buton WhatsApp sohbetini açar. Hazır mesajı WhatsApp içinde kendin
            gönderirsin.
          </p>
        </div>
      </div>
    </main>
  )
}
const faq = [
  [
    "Nasıl sipariş verebilirim?",
    "Ürünlerini ve varyantlarını seçerek sepetine ekle. Sipariş bilgilerini doldur ve mesaj ön izlemesini kontrol et. Son adımda WhatsApp sohbeti açılır; hazır mesajı kendin göndererek sipariş talebini iletirsin.",
  ],
  [
    "Online ödeme veya üyelik gerekiyor mu?",
    "Hayır. Üyelik ve online ödeme yok. Ödeme, üretim ve teslimat koşulları WhatsApp üzerinden seninle netleştirilir.",
  ],
  [
    "WhatsApp’a geçtiğimde siparişim tamamlanmış olur mu?",
    "Hayır. Sohbetin açılması sipariş onayı değildir. Mesajı WhatsApp içinde göndermen ve Nart Falcon ekibiyle detayları netleştirmen gerekir.",
  ],
  [
    "Teslimat ne kadar sürer?",
    "Ürünün üretim ve hazırlık süresine göre değişir. Kesin süre ve kargo bedeli sipariş onayından önce WhatsApp üzerinden paylaşılır.",
  ],
  [
    "Ürünümü iade edebilir miyim?",
    "Kişiye özel üretilmeyen ürünler için yasal cayma hakların geçerlidir. İade sürecini başlatmadan önce ekiple iletişime geç. Detaylar teslimat ve iade sayfasında yer alır.",
  ],
  [
    "Sepetim ve bilgilerim kaybolur mu?",
    "Sepetin bu tarayıcıda saklanır. Müşteri bilgilerin ise açık olan sekmenin oturumu boyunca korunur. Ortak bir cihaz kullanıyorsan kişisel bilgilerini temizle.",
  ],
]
function InfoPage({
  route,
  notify,
}: {
  route: string
  notify: (text: string) => void
}) {
  const { settings } = useCatalog()
  const sellerReady = Boolean(
    settings.seller.legalName &&
      settings.seller.address &&
      settings.seller.email,
  )
  if (route === "/koleksiyonlar")
    return (
      <main className="section">
        <div className="page-heading">
          <span className="eyebrow">NART FALCON / KOLEKSİYONLAR</span>
          <h1>Bir araya gelen fikirler.</h1>
          <p>Bir duruşun etrafında buluşan, birbirini tamamlayan parçalar.</p>
        </div>
        <a className="collection-list" href="#/koleksiyon/manifesto">
          <img src="/assets/content.svg" alt="Manifesto koleksiyonu" />
          <div>
            <span className="eyebrow">KOLEKSİYON 01 / 2026</span>
            <h2>The Manifesto.</h2>
            <p>
              Cesur fikirler. Kalıcı etkiler. Yaratıcı duruşunu günlük hayatına
              taşı.
            </p>
            <span className="text-link">
              Koleksiyonu keşfet <Icon name="diagonal" />
            </span>
          </div>
        </a>
      </main>
    )
  if (route === "/hakkimizda")
    return (
      <main>
        <section className="section about-intro">
          <span className="eyebrow">NART FALCON CREATIVE</span>
          <h1>
            Cesur fikirler.
            <br />
            <span>Kalıcı etkiler.</span>
          </h1>
          <div className="about-copy">
            <img src="/assets/identity.svg" alt="Nart Falcon marka tasarımı" />
            <div>
              <h2>
                Bir stüdyodan.
                <br />
                Hayatının içine.
              </h2>
              <p>
                Nart Falcon; strateji, tasarım ve teknolojiyi bir araya getiren
                bağımsız bir yaratıcı stüdyo. Markalar için ürettiğimiz güçlü
                fikirleri şimdi fiziksel ürünlerle günlük hayata taşıyoruz.
              </p>
              <p>
                Bu mağaza, tasarıma bakışımızın doğal bir devamı. Her parça
                düşünülmüş bir detay, özgün bir ifade ve uzun süre eşlik edecek
                bir deneyim sunmak için tasarlandı.
              </p>
              <a className="text-link" href="#/magaza">
                Parçaları keşfet <Icon name="diagonal" />
              </a>
            </div>
          </div>
        </section>
        <TrustBar />
      </main>
    )
  if (route === "/iletisim")
    return (
      <main className="section">
        <div className="page-heading">
          <span className="eyebrow">DOĞRUDAN İLETİŞİM</span>
          <h1>Bir sorun, bir fikrin mi var?</h1>
          <p>Ürünler, sipariş süreci veya özel bir proje. Konuşalım.</p>
        </div>
        <div className="contact-layout">
          <div className="contact-panel">
            <Icon name="chat" size={40} />
            <h2>WhatsApp üzerinden tanışalım.</h2>
            <p>
              Sipariş vermek için ürünlerini sepete ekle. Ürün soruları ve
              destek için WhatsApp hattımız üzerinden doğrudan iletişime geç.
            </p>
            <Button
              onClick={() => {
                if (!/^\d{10,15}$/.test(settings.whatsappNumber)) {
                  notify(
                    "WhatsApp iletişim numarası henüz tanımlanmadı. Gerçek numara eklendiğinde bu bağlantı etkinleşecek.",
                  )
                  return
                }
                window.open(
                  `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent("Merhaba Nart Falcon, bilgi almak istiyorum.")}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }}
            >
              WhatsApp’tan İletişime Geç <Icon name="diagonal" />
            </Button>
            <span className="form-caption">
              {settings.whatsappNumber
                ? "WhatsApp sohbeti yeni sekmede açılır."
                : "İletişim numarası yönetim panelinden eklenebilir."}
            </span>
          </div>
          <div>
            <h2>Önce seni dinliyoruz.</h2>
            <p>
              İyi bir deneyim, doğru bir konuşmayla başlar. Siparişinin üretim,
              teslimat ve ödeme detaylarını birlikte netleştiririz.
            </p>
            <a className="info-link" href="#/sss">
              Sipariş süreci hakkında <Icon name="diagonal" />
            </a>
            <a className="info-link" href="#/teslimat-iade">
              Teslimat ve iade koşulları <Icon name="diagonal" />
            </a>
            <a
              className="info-link"
              href={`${settings.corporateSiteUrl.replace(/\/$/, "")}/page-contact.html`}
              target="_blank"
              rel="noreferrer"
            >
              Creative Studio ile iletişim <Icon name="diagonal" />
            </a>
          </div>
        </div>
      </main>
    )
  if (route === "/sss")
    return (
      <main className="section legal-page">
        <div className="page-heading">
          <span className="eyebrow">AKLINDAKİ SORULAR</span>
          <h1>
            Açık sorular.
            <br />
            Net cevaplar.
          </h1>
        </div>
        {faq.map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <Icon name="plus" />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
        <a className="text-link" href="#/iletisim">
          Başka bir sorun mu var? Konuşalım <Icon name="diagonal" />
        </a>
      </main>
    )
  if (
    route === "/teslimat-iade" ||
    route === "/gizlilik" ||
    route === "/yasal"
  ) {
    const privacy = route === "/gizlilik"
    const legal = route === "/yasal"
    return (
      <main className="section legal-page">
        <div className="page-heading">
          <span className="eyebrow">ŞEFFAF VE AÇIK</span>
          <h1>
            {privacy
              ? "Gizlilik & KVKK."
              : legal
                ? "Yasal bilgilendirme."
                : "Teslimat & iade."}
          </h1>
          <p>Son güncelleme: 03 Ekim 2026 · Ön bilgilendirme</p>
        </div>
        {!sellerReady && (
          <div className="legal-notice" role="status">
            <Icon name="alert" />
            <p>
              Mağaza henüz siparişe açık değildir. Satıcı bilgileri ve onaylı
              ticari koşullar tamamlanmadan WhatsApp sipariş akışı etkinleşmez.
            </p>
          </div>
        )}
        {sellerReady && (
          <section className="seller-details" aria-labelledby="seller-heading">
            <h2 id="seller-heading">Satıcı bilgileri</h2>
            <dl>
              <div>
                <dt>Ticari unvan</dt>
                <dd>{settings.seller.legalName}</dd>
              </div>
              <div>
                <dt>Adres</dt>
                <dd>{settings.seller.address}</dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>
                  <a href={`mailto:${settings.seller.email}`}>
                    {settings.seller.email}
                  </a>
                </dd>
              </div>
              {settings.seller.registrationId && (
                <div>
                  <dt>Kayıt / vergi bilgisi</dt>
                  <dd>{settings.seller.registrationId}</dd>
                </div>
              )}
            </dl>
            {settings.seller.jurisdictionNote && (
              <p>{settings.seller.jurisdictionNote}</p>
            )}
          </section>
        )}
        {(privacy
          ? [
              [
                "Hangi bilgiler kullanılır?",
                "Sipariş formunda ad soyad, telefon, şehir, ilçe, teslimat adresi ve isteğe bağlı not alınır. Bu bilgiler sipariş mesajını hazırlamak için kullanılır.",
              ],
              [
                "Bilgilerin nasıl saklanır?",
                "Sepet tarayıcının yerel depolamasında, müşteri bilgileri ise yalnızca açık sekme oturumunda tutulur. WhatsApp sohbetini açana kadar bilgiler mağaza sunucusuna gönderilmez.",
              ],
              [
                "WhatsApp ile paylaşım",
                "Sohbeti açtığında bilgilerin URL ile WhatsApp’a aktarılır. Mesajı gönderme kararı sana aittir. WhatsApp’ın kendi gizlilik koşulları uygulanır.",
              ],
              [
                "Bilgilerini temizleme",
                sellerReady
                  ? `Bu sekmedeki kişisel bilgilerini aşağıdaki butondan temizleyebilirsin. Başvurular için ${settings.seller.email} adresine ulaşabilirsin.`
                  : "Bu sekmedeki kişisel bilgilerini aşağıdaki butondan temizleyebilirsin. Veri sorumlusu ve yasal başvuru kanalları siparişe açılmadan önce paylaşılacaktır.",
              ],
            ]
          : legal
            ? [
                [
                  "Sipariş talebi ve onay",
                  "Sitede sepet oluşturmak veya WhatsApp sohbetini açmak sipariş onayı değildir. Satış koşulları taraflar arasında WhatsApp üzerinden netleştirilir.",
                ],
                [
                  "Ödeme ve ürün bilgileri",
                  "Online ödeme alınmaz. Ürün fiyatı seçilen ölçü farkıyla birlikte sipariş ön izlemesinde gösterilir; vergi, üretim ve teslimat koşulları satış onayından önce teyit edilir.",
                ],
                [
                  "Fikrî haklar",
                  "Nart Falcon marka adı ve resmi görsel kimliği ilgili hak sahiplerine aittir. Tasarım görselleri ürün kompozisyonlarını temsil eder.",
                ],
              ]
            : [
                [
                  "Sipariş ve teslimat",
                  "Sipariş talebin WhatsApp mesajı ile iletilir. Ekip hazırlık süresini, teslimat yöntemini ve kargo bedelini onay öncesinde paylaşır.",
                ],
                [
                  "Özenli paketleme",
                  "Baskı ve tasarım ürünleri yüzeylerini koruyacak şekilde paketlenir. Teslimatta hasar görürsen ambalaj ve ürün fotoğraflarıyla ekibe ulaş.",
                ],
                [
                  "Cayma ve iade",
                  "Kişiye özel üretilmeyen ürünlerde mevzuat kapsamındaki 14 günlük cayma hakkı saklıdır. Kişiye özel üretim gibi istisnalar satış öncesinde açıklanmalıdır.",
                ],
                [
                  "İade süreci",
                  "İade talebini ekiple paylaş. İade adresi, gönderim koşulları ve ücret iadesi süresi gerçek satış koşulları kapsamında yazılı olarak bildirilir.",
                ],
              ]
        ).map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        {privacy && (
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem("nf-customer")
              window.dispatchEvent(new Event("clear-customer"))
              notify("Bu sekmedeki müşteri bilgilerin temizlendi.")
            }}
          >
            Müşteri bilgilerimi temizle <Icon name="trash" />
          </Button>
        )}
      </main>
    )
  }
  if (route === "/icgoruler")
    return (
      <main className="section">
        <div className="page-heading">
          <span className="eyebrow">NART FALCON / JOURNAL</span>
          <h1>Fikirler. Notlar. İçgörüler.</h1>
          <p>Tasarımın arkasındaki düşünceler ve stüdyodan hikâyeler.</p>
        </div>
        <div className="insight-grid">
          {[
            ["identity", "Bir fikrin fiziksel hâli", "tasarim-sureci"],
            ["direction", "Neden daha az, daha çoktur?", "yalin-tasarim"],
            ["content", "Günlük hayatında kendi izini bırak", "kendi-izin"],
          ].map(([image, title, slug]) => (
            <a href={`#/icgoru/${slug}`} key={slug}>
              <img src={`/assets/${image}.svg`} alt={title} />
              <span className="eyebrow">TASARIM / 4 DK OKUMA</span>
              <div>
                <h3>{title}</h3>
                <Icon name="diagonal" />
              </div>
            </a>
          ))}
        </div>
      </main>
    )
  if (route.startsWith("/icgoru/")) {
    const title = route.endsWith("yalin-tasarim")
      ? "Neden daha az, daha çoktur?"
      : route.endsWith("kendi-izin")
        ? "Günlük hayatında kendi izini bırak."
        : "Bir fikrin fiziksel hâli."
    return (
      <main className="section article-page">
        <a className="text-link" href="#/icgoruler">
          İçgörülere dön <Icon name="arrow" />
        </a>
        <div className="page-heading">
          <span className="eyebrow">STÜDYODAN NOTLAR / TASARIM</span>
          <h1>{title}</h1>
          <p>
            Bir parçanın değerini yalnızca biçimi değil, arkasındaki fikir
            belirler.
          </p>
        </div>
        <img
          src="/assets/identity.svg"
          alt="Manifesto koleksiyonu tasarım süreci"
        />
        <div className="article-copy">
          <h2>Her şey bir soruyla başlar.</h2>
          <p>
            Bir nesne, gündelik hayatında neyi değiştirebilir? Bizim için cevap;
            büyük bir iddia değil, düşünülmüş bir detay. Bir defterin ilk
            sayfası, bir posterin duruşu, her gün yanında taşıdığın bir çanta.
          </p>
          <p>
            Manifesto koleksiyonu bu düşünceden doğdu. Siyahın yalınlığı,
            yeşilin enerjisi ve güçlü tipografi aynı dilde buluştu. Amacımız
            yalnızca güzel görünen parçalar yapmak değil; kullanıldıkça anlam
            kazanan tasarımlar üretmek.
          </p>
          <h2>Daha az sıradan. Daha çok sen.</h2>
          <p>
            İyi bir tasarım sana ne düşüneceğini söylemez. Kendi fikrine alan
            açar. Bu koleksiyondaki her parça, kendi izini bırakman için bir
            başlangıç.
          </p>
          <a className="text-link" href="#/koleksiyon/manifesto">
            Manifesto koleksiyonunu keşfet <Icon name="diagonal" />
          </a>
        </div>
      </main>
    )
  }
  return (
    <main className="section not-found">
      <span className="eyebrow">404 / BU SAYFADA BİR İZ YOK</span>
      <h1>
        Kaybolmak da
        <br />
        keşfin bir parçası.
      </h1>
      <p>Aradığın sayfa burada değil. Yeni bir başlangıç yapalım.</p>
      <Button onClick={() => go("/")}>
        Ana Sayfaya Dön <Icon name="arrow" />
      </Button>
    </main>
  )
}
export default function App() {
  const {
    storefrontProducts: products,
    settings,
    backendMode,
    isLoading,
    dataError,
  } = useCatalog()
  const storeCategories = useMemo(
    () => [
      "Tüm Ürünler",
      ...Array.from(new Set(products.map((product) => product.category))),
    ],
    [products],
  )
  const [route, setRoute] = useState(routeNow)
  const [introReady, setIntroReady] = useState(false)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const raw = stored<unknown>("nf-cart", [])
    return Array.isArray(raw)
      ? raw
          .filter(
            (i): i is CartItem =>
              i &&
              typeof i.productId === "string" &&
              typeof i.color === "string" &&
              typeof i.size === "string" &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 99,
          )
          .map((i) => ({ ...i, quantity: Math.min(i.quantity, 99) }))
      : []
  })
  const [customer, setCustomer] = useState<Customer>(() => ({
    ...emptyCustomer,
    ...stored("nf-customer", emptyCustomer, true),
  }))
  const [drawer, setDrawer] = useState<"cart" | "search" | "menu" | null>(null)
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState("")
  const [removeKey, setRemoveKey] = useState("")
  const closeDrawer = useCallback(() => setDrawer(null), [])
  const closeRemove = useCallback(() => setRemoveKey(""), [])
  const notify = useCallback((text: string) => setToast(text), [])
  const finishIntro = useCallback(() => setIntroReady(true), [])
  usePageMotion(route, introReady)
  useEffect(() => {
    document.body.classList.toggle("nf-loading", !introReady)
    return () => document.body.classList.remove("nf-loading")
  }, [introReady])
  useEffect(() => {
    const listener = () => {
      setRoute(routeNow())
      setDrawer(null)
      window.scrollTo({ top: 0, behavior: "instant" })
    }
    const clear = () => setCustomer(emptyCustomer)
    window.addEventListener("hashchange", listener)
    window.addEventListener("clear-customer", clear)
    return () => {
      window.removeEventListener("hashchange", listener)
      window.removeEventListener("clear-customer", clear)
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem("nf-cart", JSON.stringify(cart))
    } catch {
      notify(
        "Sepetin bu tarayıcıda kaydedilemedi. Sekmeyi açık tutarak devam edebilirsin.",
      )
    }
  }, [cart, notify])
  useEffect(() => {
    if (isLoading || (backendMode !== "sql" && backendMode !== "demo")) return
    setCart((current) => {
      const next = current.flatMap((item) => {
        const product = products.find(
          (candidate) => candidate.id === item.productId,
        )
        if (
          !product ||
          !product.colors.includes(item.color) ||
          !product.sizes.some((option) => option.name === item.size)
        )
          return []
        return [{ ...item, quantity: Math.min(item.quantity, 99) }]
      })
      const changed =
        next.length !== current.length ||
        next.some((item, index) => item.quantity !== current[index]?.quantity)
      if (changed) notify("Sepet güncel ürün bilgilerine göre yenilendi.")
      return changed ? next : current
    })
  }, [backendMode, isLoading, products, notify])
  useEffect(() => {
    try {
      sessionStorage.setItem("nf-customer", JSON.stringify(customer))
    } catch {
      notify("Bilgilerin tarayıcıda saklanamadı. Sayfayı kapatmadan devam et.")
    }
  }, [customer, notify])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(""), 5000)
    return () => clearTimeout(timer)
  }, [toast])
  const add = (p: Product, color: string, size: string, qty: number) => {
    if (!settings.acceptingOrders) {
      notify("Sipariş alımı şu anda kapalı.")
      return
    }
    const selected = { productId: p.id, color, size, quantity: qty }
    const existing = cart.find((i) => itemKey(i) === itemKey(selected))
    setCart((current) =>
      existing
        ? current.map((i) =>
            itemKey(i) === itemKey(selected)
              ? { ...i, quantity: i.quantity + qty }
              : i,
          )
        : [...current, selected],
    )
    setDrawer("cart")
    notify("Ürün sepete eklendi.")
  }
  const update = (key: string, qty: number) => {
    const item = cart.find((i) => itemKey(i) === key)
    if (!item) return
    const p = products.find((p) => p.id === item.productId)
    if (!p) return
    setCart(
      cart.map((i) =>
        itemKey(i) === key
          ? { ...i, quantity: Math.min(99, Math.max(1, qty)) }
          : i,
      ),
    )
  }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const pathname = route.split("?")[0]
  const product = pathname.startsWith("/urun/")
    ? products.find((p) => p.id === pathname.split("/")[2])
    : undefined
  return (
    <div className={`app-shell ${introReady ? "is-ready" : "is-loading"}`}>
      {!introReady && <PageLoader onComplete={finishIntro} />}
      <ScrollProgress />
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById("main-content")?.focus()
        }}
      >
        İçeriğe geç
      </a>
      <div className="announcement">
        <span>{settings.announcement}</span>
        <a href="#/sss">
          WhatsApp ile kolay sipariş <Icon name="diagonal" size={12} />
        </a>
      </div>
      <header className="header">
        <a className="logo" href="#/" aria-label="Nart Falcon ana sayfa">
          <img src="/assets/logo.svg" alt="Nart Falcon Store" />
        </a>
        <nav aria-label="Ana menü">
          {nav.map(([text, path]) => (
            <a
              href={`#${path}`}
              key={path}
              className={
                pathname === path ||
                (path === "/magaza" && pathname.startsWith("/urun/"))
                  ? "active"
                  : ""
              }
            >
              {text}
            </a>
          ))}
          <a
            className="agency-link"
            href={settings.corporateSiteUrl}
            aria-label="Nart Falcon Ajans sitesine git"
          >
            Ajans <Icon name="diagonal" size={12} />
          </a>
        </nav>
        <div className="header-actions">
          <IconButton
            label="Ürün ara"
            name="search"
            onClick={() => setDrawer("search")}
          />
          <button
            className="cart-button"
            onClick={() => setDrawer("cart")}
            aria-label={`Sepeti aç, ${count} ürün`}
          >
            <Icon name="bag" />
            <span>Sepet</span>
            <b>{count.toString().padStart(2, "0")}</b>
          </button>
          <IconButton
            label="Menüyü aç"
            name="menu"
            className="mobile-menu-button"
            onClick={() => setDrawer("menu")}
          />
        </div>
      </header>
      {!isLoading &&
        (backendMode === "not-installed" || backendMode === "error") && (
          <div className="store-data-error" role="alert">
            <Icon name="alert" size={18} />
            <div>
              <strong>Mağaza verilerine şu anda ulaşılamıyor.</strong>
              <span>
                {dataError ||
                  "Ürünler güvenli biçimde gizlendi. Lütfen daha sonra tekrar deneyin."}
              </span>
            </div>
          </div>
        )}
      <div id="main-content" tabIndex={-1}>
        <div className="route-stage" key={route}>
          {pathname === "/admin" ? (
            <AdminPage />
          ) : pathname === "/" ? (
            <Home />
          ) : pathname === "/magaza" ||
            pathname === "/arama" ||
            pathname.startsWith("/koleksiyon/") ? (
            <Shop key={route} route={route} />
          ) : product ? (
            <ProductDetail
              key={product.id}
              product={product}
              add={add}
              notify={notify}
            />
          ) : pathname === "/sepet" ? (
            <CartPage cart={cart} update={update} remove={setRemoveKey} />
          ) : pathname === "/siparis" ? (
            <Checkout
              cart={cart}
              customer={customer}
              setCustomer={setCustomer}
            />
          ) : pathname === "/mesaj-onizleme" ? (
            <MessagePreview cart={cart} customer={customer} notify={notify} />
          ) : (
            <InfoPage route={pathname} notify={notify} />
          )}
        </div>
      </div>
      <footer className="footer">
        <div className="footer-top">
          <div>
            <span className="eyebrow">BİR SONRAKİ GÜÇLÜ FİKİR</span>
            <h2>
              Hayatına dokunsun.
              <br />
              Senin izini taşısın.
            </h2>
            <Button onClick={() => go("/magaza")}>
              Kendi İzini Keşfet <Icon name="diagonal" />
            </Button>
          </div>
          <div className="footer-nav-area">
            <a
              className="studio-link"
              href={settings.corporateSiteUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>NART FALCON</span> Creative Studio <Icon name="diagonal" />
            </a>
            <div className="footer-links">
              <div>
                <span className="eyebrow">KEŞFET</span>
                {nav.slice(0, 5).map(([text, path]) => (
                  <a key={path} href={`#${path}`}>
                    {text}
                  </a>
                ))}
              </div>
              <div>
                <span className="eyebrow">YARDIM & BİLGİ</span>
                {[
                  ["İletişim", "/iletisim"],
                  ["Sık Sorulan Sorular", "/sss"],
                  ["Teslimat & İade", "/teslimat-iade"],
                  ["Gizlilik & KVKK", "/gizlilik"],
                  ["Yasal Bilgilendirme", "/yasal"],
                ].map(([text, path]) => (
                  <a key={path} href={`#${path}`}>
                    {text}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Nart Falcon. Tüm hakları saklıdır.</span>
          <span>Strateji, tasarım ve teknoloji. Fark yarat. İz bırak.</span>
          <a href="#/iletisim">
            İletişim <Icon name="diagonal" size={12} />
          </a>
        </div>
        <p className="prototype-note">
          {settings.acceptingOrders
            ? "Online ödeme alınmaz. Sipariş ve teslimat WhatsApp üzerinden netleştirilir."
            : "Mağaza hazırlık aşamasında · Sipariş alımı kapalıdır."}
        </p>
      </footer>
      {drawer === "cart" && (
        <Overlay title={`Sepetin (${count})`} onClose={closeDrawer}>
          {cart.length ? (
            <>
              <div className="drawer-cart-body">
                <CartLines cart={cart} update={update} remove={setRemoveKey} />
              </div>
              <div className="drawer-cart-footer">
                <div className="summary-total">
                  <span>Ürün toplamı</span>
                  <strong>{money(cartTotalForProducts(cart, products))}</strong>
                </div>
                <p>Teslimat ve ödeme detayları WhatsApp’ta netleştirilir.</p>
                {!settings.acceptingOrders && (
                  <p className="order-closed-notice" role="status">
                    Sipariş alımı geçici olarak kapalı.
                  </p>
                )}
                <Button
                  className="full-width"
                  onClick={() => go("/siparis")}
                  disabled={!settings.acceptingOrders}
                >
                  {settings.acceptingOrders
                    ? "Sipariş Detaylarına Geç"
                    : "Sipariş Alımı Kapalı"}{" "}
                  <Icon name="arrow" />
                </Button>
                <Button
                  variant="outline"
                  className="full-width"
                  onClick={() => go("/sepet")}
                >
                  Sepeti Görüntüle
                </Button>
                <Button
                  variant="text"
                  className="full-width"
                  onClick={closeDrawer}
                >
                  Alışverişe devam et
                </Button>
              </div>
            </>
          ) : (
            <EmptyCart />
          )}
        </Overlay>
      )}
      {drawer === "search" && (
        <Overlay title="Bir fikir ara." onClose={closeDrawer}>
          <form
            className="drawer-search"
            onSubmit={(e) => {
              e.preventDefault()
              go(`/arama?q=${encodeURIComponent(search)}`)
            }}
          >
            <div className="search-input">
              <Icon name="search" />
              <input
                autoFocus
                placeholder="Ürün veya koleksiyon ara…"
                aria-label="Arama kelimesi"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit">
              Ara <Icon name="arrow" />
            </Button>
          </form>
          <span className="eyebrow search-caption">
            {search ? "EŞLEŞEN PARÇALAR" : "ÖNE ÇIKAN PARÇALAR"}
          </span>
          <div className="search-results">
            {products
              .filter(
                (p) =>
                  !search ||
                  `${p.name} ${p.category}`
                    .toLocaleLowerCase("tr")
                    .includes(search.toLocaleLowerCase("tr")),
              )
              .slice(0, 4)
              .map((p) => (
                <a key={p.id} href={`#/urun/${p.id}`}>
                  <ProductArt product={p} />
                  <div>
                    <strong>{p.name}</strong>
                    <span>{p.category}</span>
                    <b>{money(p.price)}</b>
                  </div>
                  <Icon name="diagonal" />
                </a>
              ))}
            {search &&
              !products.some((p) =>
                `${p.name} ${p.category}`
                  .toLocaleLowerCase("tr")
                  .includes(search.toLocaleLowerCase("tr")),
              ) && <p>Sonuç bulunamadı. Başka bir kelime dene.</p>}
          </div>
        </Overlay>
      )}
      {drawer === "menu" && (
        <Overlay
          title="Nart Falcon"
          onClose={closeDrawer}
          className="menu-drawer"
        >
          <img src="/assets/logo.svg" alt="Nart Falcon Store" />
          <nav aria-label="Mobil ana menü">
            {nav.map(([text, path]) => (
              <a key={path} href={`#${path}`}>
                {text}
                <Icon name="diagonal" />
              </a>
            ))}
            <a
              className="mobile-agency-link"
              href={settings.corporateSiteUrl}
            >
              Ajans
              <Icon name="diagonal" />
            </a>
          </nav>
          <div className="mobile-categories">
            <span className="eyebrow">KATEGORİLER</span>
            {storeCategories.slice(1).map((cat) => (
              <a
                key={cat}
                href={`#/magaza?kategori=${encodeURIComponent(cat)}`}
              >
                {cat}
              </a>
            ))}
          </div>
          <a className="menu-contact" href="#/iletisim">
            <Icon name="chat" size={30} />
            <span>
              BİR FİKRİN Mİ VAR?<strong>Konuşalım.</strong>
            </span>
          </a>
        </Overlay>
      )}
      {removeKey && (
        <Overlay
          title="Bu parçayı sepetinden çıkar?"
          onClose={closeRemove}
          className="confirm-modal"
        >
          <p>İstediğin zaman tekrar ekleyebilirsin.</p>
          <div className="form-actions">
            <Button variant="outline" onClick={closeRemove}>
              Vazgeç
            </Button>
            <Button
              variant="dark"
              onClick={() => {
                setCart(cart.filter((i) => itemKey(i) !== removeKey))
                setRemoveKey("")
                notify("Ürün sepetinden çıkarıldı.")
              }}
            >
              Ürünü Sil <Icon name="trash" />
            </Button>
          </div>
        </Overlay>
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon
            name={
              toast.includes("eklendi") ||
              toast.includes("kopyalandı") ||
              toast.includes("temizlendi")
                ? "check"
                : "alert"
            }
          />
          <span>{toast}</span>
          <IconButton
            label="Bildirimi kapat"
            name="close"
            onClick={() => setToast("")}
          />
        </div>
      )}
      <BackToTop />
    </div>
  )
}
