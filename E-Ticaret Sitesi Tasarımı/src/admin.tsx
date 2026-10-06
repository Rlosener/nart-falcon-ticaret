import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  useCatalog,
  type StoreBackup,
  type StoreSettings,
} from "./catalog"
import { money, type Product } from "./data"
import { Button, Icon, Overlay, ProductArt } from "./ui"

type AdminTab = "products" | "categories" | "settings" | "activity"
type ProductFilter = "all" | "active" | "hidden"

type SizeDraft = {
  name: string
  priceDelta: string
}

type ProductDraft = {
  id: string
  name: string
  category: string
  price: string
  oldPrice: string
  badge: string
  kind: string
  tone: string
  colors: string[]
  sizes: SizeDraft[]
  description: string
  material: string
  active: boolean
  images: string[]
  templateVisible: boolean
}

const MAX_PRODUCT_IMAGES = 4
const MAX_IMAGE_BYTES = 700 * 1024

const artKinds = [
  ["poster", "Poster"],
  ["tote", "Çanta"],
  ["notebook", "Defter"],
  ["tee", "T-shirt"],
  ["art", "Sanat baskısı"],
  ["cup", "Kupa"],
  ["stickers", "Sticker"],
  ["object", "Obje"],
]

function emptyDraft(category = "Poster & Baskı"): ProductDraft {
  return {
    id: "",
    name: "",
    category,
    price: "",
    oldPrice: "",
    badge: "",
    kind: "poster",
    tone: "lime",
    colors: ["Neon Yeşil", "Siyah"],
    sizes: [{ name: "Standart", priceDelta: "0" }],
    description: "",
    material: "",
    active: true,
    images: [],
    templateVisible: true,
  }
}

function toDraft(product: Product): ProductDraft {
  return {
    ...product,
    price: String(product.price),
    oldPrice: product.oldPrice ? String(product.oldPrice) : "",
    badge: product.badge || "",
    colors: [...product.colors],
    sizes: product.sizes.map((size) => ({
      name: size.name,
      priceDelta: String(size.priceDelta),
    })),
    active: product.active !== false,
    images: product.images?.length
      ? [...product.images]
      : product.image
        ? [product.image]
        : [],
    templateVisible: product.templateVisible !== false,
  }
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function ProductEditor({
  product,
  onClose,
}: {
  product?: Product
  onClose: () => void
}) {
  const { products, categories, upsertProduct } = useCatalog()
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product ? toDraft(product) : emptyDraft(categories[1] || ""),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [imageError, setImageError] = useState("")
  const [imageBusy, setImageBusy] = useState(false)
  const [saveError, setSaveError] = useState("")

  const update = <Key extends keyof ProductDraft,>(
    key: Key,
    value: ProductDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: "" }))
  }

  const updateColor = (index: number, value: string) => {
    update(
      "colors",
      draft.colors.map((color, colorIndex) =>
        colorIndex === index ? value : color,
      ),
    )
  }

  const updateSize = (index: number, key: keyof SizeDraft, value: string) => {
    update(
      "sizes",
      draft.sizes.map((size, sizeIndex) =>
        sizeIndex === index ? { ...size, [key]: value } : size,
      ),
    )
  }

  const selectImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    if (!files.length) return
    setImageError("")
    if (draft.images.length + files.length > MAX_PRODUCT_IMAGES) {
      setImageError(
        `Bir ürüne en fazla ${MAX_PRODUCT_IMAGES} görsel eklenebilir.`,
      )
      return
    }
    if (files.some((file) => !/^image\/(png|jpe?g|webp)$/i.test(file.type))) {
      setImageError("Yalnızca PNG, JPG veya WebP formatı kullanılabilir.")
      return
    }
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setImageError("Her görselin boyutu en fazla 700 KB olabilir.")
      return
    }
    setImageBusy(true)
    try {
      const added = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onerror = () => reject(new Error("read_failed"))
              reader.onload = () => resolve(String(reader.result || ""))
              reader.readAsDataURL(file)
            }),
        ),
      )
      update("images", Array.from(new Set([...draft.images, ...added])))
    } catch {
      setImageError("Görsellerden biri okunamadı. Tekrar deneyin.")
    } finally {
      setImageBusy(false)
    }
  }

  const makeCover = (index: number) => {
    const selected = draft.images[index]
    update("images", [selected, ...draft.images.filter((_, i) => i !== index)])
  }

  const removeImage = (index: number) => {
    update(
      "images",
      draft.images.filter((_, imageIndex) => imageIndex !== index),
    )
    setImageError("")
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const next: Record<string, string> = {}
    const price = Number(draft.price)
    const oldPrice = draft.oldPrice ? Number(draft.oldPrice) : undefined
    const colors = Array.from(
      new Set(draft.colors.map((value) => value.trim()).filter(Boolean)),
    )
    const sizes = draft.sizes
      .map((size) => ({
        name: size.name.trim(),
        priceDelta: Number(size.priceDelta || 0),
      }))
      .filter((size) => size.name)
    if (draft.name.trim().length < 3)
      next.name = "Ürün adı en az 3 karakter olmalı."
    if (!draft.category.trim()) next.category = "Kategori zorunludur."
    if (!Number.isFinite(price) || price <= 0)
      next.price = "Geçerli bir satış fiyatı girin."
    if (
      oldPrice !== undefined &&
      (!Number.isFinite(oldPrice) || oldPrice <= price)
    )
      next.oldPrice = "Eski fiyat satış fiyatından yüksek olmalı."
    if (!colors.length) next.colors = "En az bir renk girin."
    if (!sizes.length) next.sizes = "En az bir ölçü girin."
    if (
      sizes.some(
        (size) =>
          !Number.isFinite(size.priceDelta) ||
          size.priceDelta < 0 ||
          size.priceDelta > 1_000_000,
      )
    )
      next.sizes = "Ölçü fiyat farkı 0 ile 1.000.000 TL arasında olmalı."
    if (
      new Set(sizes.map((size) => size.name.toLocaleLowerCase("tr"))).size !==
      sizes.length
    )
      next.sizes = "Aynı ölçü birden fazla kez eklenemez."
    if (draft.description.trim().length < 12)
      next.description = "Ürün açıklaması en az 12 karakter olmalı."
    if (draft.material.trim().length < 5)
      next.material = "Materyal veya teknik bilgi girin."
    setErrors(next)
    if (Object.keys(next).length) return

    let id = product?.id || slugify(draft.name)
    if (!id) id = `urun-${Date.now()}`
    if (!product) {
      const base = id
      let index = 2
      while (products.some((item) => item.id === id)) {
        id = `${base}-${index}`
        index += 1
      }
    }

    setBusy(true)
    setSaveError("")
    try {
      await upsertProduct(
        {
          id,
          name: draft.name.trim(),
          category: draft.category.trim(),
          price,
          oldPrice,
          badge: draft.badge.trim() || undefined,
          kind: draft.kind,
          tone: draft.tone,
          colors,
          sizes,
          description: draft.description.trim(),
          material: draft.material.trim(),
          active: draft.active,
          images: draft.images,
          image: draft.images[0],
          templateVisible: draft.templateVisible,
        },
        product ? "update" : "create",
      )
      onClose()
    } catch (error) {
      setSaveError((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const preview: Product = {
    id: product?.id || "yeni-urun",
    name: draft.name || "Yeni ürün",
    category: draft.category || "Kategori",
    price: Number(draft.price) || 0,
    kind: draft.kind,
    tone: draft.tone,
    colors: draft.colors.map((value) => value.trim()).filter(Boolean),
    sizes: draft.sizes
      .map((size) => ({
        name: size.name.trim(),
        priceDelta: Number(size.priceDelta || 0),
      }))
      .filter((size) => size.name),
    description: draft.description,
    material: draft.material,
    active: draft.active,
    images: draft.images,
    image: draft.images[0],
    templateVisible: draft.templateVisible,
  }

  return (
    <Overlay
      title={product ? "Ürünü düzenle" : "Yeni ürün ekle"}
      onClose={onClose}
      className="admin-editor"
    >
      <form className="admin-product-form" onSubmit={submit} noValidate>
        <div className="admin-product-preview">
          <ProductArt product={preview} />
          <div>
            <span className="eyebrow">CANLI ÖN İZLEME</span>
            <strong>{preview.name}</strong>
            <span>{preview.category}</span>
          </div>
        </div>

        <div className="admin-form-grid">
          <label className="field admin-field-wide">
            Ürün adı <span>*</span>
            <input
              autoFocus
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              aria-invalid={!!errors.name}
              placeholder="Örn. Creative Studio Hoodie"
            />
            {errors.name && <small className="form-error">{errors.name}</small>}
          </label>
          <label className="field">
            Kategori <span>*</span>
            <select
              value={draft.category}
              onChange={(event) => update("category", event.target.value)}
              aria-invalid={!!errors.category}
            >
              {categories.slice(1).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <small className="field-help">
              Yeni kategori eklemek için Kategoriler bölümünü kullanın.
            </small>
            {errors.category && (
              <small className="form-error">{errors.category}</small>
            )}
          </label>
          <label className="field">
            Etiket
            <input
              value={draft.badge}
              onChange={(event) => update("badge", event.target.value)}
              placeholder="Yeni, Çok satan…"
            />
          </label>
          <label className="field">
            Satış fiyatı <span>*</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={draft.price}
              onChange={(event) => update("price", event.target.value)}
              aria-invalid={!!errors.price}
            />
            {errors.price && (
              <small className="form-error">{errors.price}</small>
            )}
          </label>
          <label className="field">
            Eski fiyat
            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={draft.oldPrice}
              onChange={(event) => update("oldPrice", event.target.value)}
              aria-invalid={!!errors.oldPrice}
            />
            {errors.oldPrice && (
              <small className="form-error">{errors.oldPrice}</small>
            )}
          </label>
          <label className="field">
            Görsel şablonu
            <select
              value={draft.kind}
              onChange={(event) => update("kind", event.target.value)}
            >
              {artKinds.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Görsel tonu
            <select
              value={draft.tone}
              onChange={(event) => update("tone", event.target.value)}
            >
              <option value="lime">Neon yeşil</option>
              <option value="black">Siyah</option>
              <option value="cream">Krem</option>
            </select>
          </label>
          <fieldset className="admin-image-manager admin-field-wide">
            <legend>Ürün görselleri</legend>
            <div className="admin-image-heading">
              <p className="field-help">
                En fazla {MAX_PRODUCT_IMAGES} görsel · PNG, JPG veya WebP · her
                biri en fazla 700 KB. İlk görsel mağaza kapağıdır.
              </p>
              <label
                className={`button button-outline admin-image-add ${
                  imageBusy || draft.images.length >= MAX_PRODUCT_IMAGES
                    ? "is-disabled"
                    : ""
                }`}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={
                    imageBusy || draft.images.length >= MAX_PRODUCT_IMAGES
                  }
                  onChange={selectImages}
                />
                {imageBusy ? "Görseller işleniyor…" : "Görsel Ekle"}
                <Icon name="plus" size={16} />
              </label>
            </div>
            <div className="admin-image-grid">
              {draft.templateVisible ? (
                <article className="admin-image-card admin-template-image-card">
                  <div className="admin-image-preview">
                    <ProductArt
                      product={{
                        ...preview,
                        images: [],
                        image: undefined,
                        templateVisible: true,
                      }}
                    />
                    <span>Varsayılan</span>
                  </div>
                  <div className="admin-image-actions">
                    <strong>
                      {draft.images.length ? "Yedek şablon" : "Mağaza kapağı"}
                    </strong>
                    <button
                      type="button"
                      className="admin-image-delete"
                      onClick={() => update("templateVisible", false)}
                      aria-label="Varsayılan ürün görselini kaldır"
                    >
                      <Icon name="trash" size={15} /> Kaldır
                    </button>
                  </div>
                </article>
              ) : (
                <article className="admin-template-hidden">
                  <Icon name="alert" size={20} />
                  <span>Varsayılan ürün görseli kaldırıldı.</span>
                  <button
                    type="button"
                    onClick={() => update("templateVisible", true)}
                  >
                    Şablonu geri getir
                  </button>
                </article>
              )}
              {draft.images.map((image, index) => (
                <article
                  className="admin-image-card"
                  key={`${image.slice(-32)}-${index}`}
                >
                  <div className="admin-image-preview">
                    <img src={image} alt={`${index + 1}. ürün görseli`} />
                    {index === 0 && <span>Kapak</span>}
                  </div>
                  <div className="admin-image-actions">
                    {index === 0 ? (
                      <strong>Mağaza kapağı</strong>
                    ) : (
                      <button type="button" onClick={() => makeCover(index)}>
                        Kapak yap
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-image-delete"
                      onClick={() => removeImage(index)}
                      aria-label={`${index + 1}. görseli sil`}
                    >
                      <Icon name="trash" size={15} /> Sil
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!draft.images.length && (
              <p className="admin-image-status">
                {draft.templateVisible
                  ? "Bu ürün şu anda yukarıdaki varsayılan görseli kullanıyor."
                  : "Bu ürün görselsiz gösterilecek. Yeni görsel ekleyebilir veya şablonu geri getirebilirsiniz."}
              </p>
            )}
            {imageError && <small className="form-error">{imageError}</small>}
          </fieldset>
          <fieldset className="admin-variant-editor admin-field-wide">
            <legend>
              Renkler <span>*</span>
            </legend>
            <div className="admin-variant-list">
              {draft.colors.map((color, index) => (
                <div className="admin-color-row" key={`color-${index}`}>
                  <input
                    value={color}
                    onChange={(event) => updateColor(index, event.target.value)}
                    aria-label={`${index + 1}. renk`}
                    placeholder="Renk adı"
                  />
                  <button
                    type="button"
                    className="admin-variant-remove"
                    onClick={() =>
                      update(
                        "colors",
                        draft.colors.filter(
                          (_, colorIndex) => colorIndex !== index,
                        ),
                      )
                    }
                    disabled={draft.colors.length === 1}
                    aria-label={`${color || `${index + 1}. renk`} kaldır`}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => update("colors", [...draft.colors, ""])}
            >
              Renk Ekle <Icon name="plus" size={16} />
            </Button>
            {errors.colors && (
              <small className="form-error">{errors.colors}</small>
            )}
          </fieldset>
          <fieldset className="admin-variant-editor admin-field-wide">
            <legend>
              Ölçüler ve fiyat farkları <span>*</span>
            </legend>
            <p className="field-help">
              Fiyat farkı, temel satış fiyatına eklenir. 0 girilen ölçülerde ek
              ücret gösterilmez.
            </p>
            <div className="admin-size-head" aria-hidden="true">
              <span>Ölçü / varyant</span>
              <span>Fiyat farkı</span>
              <span />
            </div>
            <div className="admin-variant-list">
              {draft.sizes.map((size, index) => (
                <div className="admin-size-row" key={`size-${index}`}>
                  <input
                    value={size.name}
                    onChange={(event) =>
                      updateSize(index, "name", event.target.value)
                    }
                    aria-label={`${index + 1}. ölçü adı`}
                    placeholder="Örn. 50 × 70 cm"
                  />
                  <label className="admin-price-delta">
                    <span>+</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={size.priceDelta}
                      onChange={(event) =>
                        updateSize(index, "priceDelta", event.target.value)
                      }
                      aria-label={`${size.name || `${index + 1}. ölçü`} fiyat farkı`}
                    />
                    <span>TL</span>
                  </label>
                  <button
                    type="button"
                    className="admin-variant-remove"
                    onClick={() =>
                      update(
                        "sizes",
                        draft.sizes.filter(
                          (_, sizeIndex) => sizeIndex !== index,
                        ),
                      )
                    }
                    disabled={draft.sizes.length === 1}
                    aria-label={`${size.name || `${index + 1}. ölçü`} kaldır`}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update("sizes", [...draft.sizes, { name: "", priceDelta: "0" }])
              }
            >
              Ölçü Ekle <Icon name="plus" size={16} />
            </Button>
            {errors.sizes && (
              <small className="form-error">{errors.sizes}</small>
            )}
          </fieldset>
          <label className="field admin-field-wide">
            Ürün açıklaması <span>*</span>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <small className="form-error">{errors.description}</small>
            )}
          </label>
          <label className="field admin-field-wide">
            Materyal / teknik bilgi <span>*</span>
            <textarea
              rows={3}
              value={draft.material}
              onChange={(event) => update("material", event.target.value)}
              aria-invalid={!!errors.material}
            />
            {errors.material && (
              <small className="form-error">{errors.material}</small>
            )}
          </label>
        </div>
        <label className="admin-switch-row">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => update("active", event.target.checked)}
          />
          <span>
            <strong>Mağazada yayınla</strong>
            <small>Kapalıysa ürün yalnızca yönetim panelinde görünür.</small>
          </span>
        </label>
        {saveError && (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        )}
        <div className="admin-form-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={busy}>
            {busy
              ? "Kaydediliyor…"
              : product
                ? "Değişiklikleri Kaydet"
                : "Ürünü Ekle"}
            <Icon name="check" />
          </Button>
        </div>
      </form>
    </Overlay>
  )
}

function ProductsPanel() {
  const { products, isSaving, dataError, toggleProduct, removeProduct } =
    useCatalog()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ProductFilter>("all")
  const [editing, setEditing] = useState<Product | undefined>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [removeId, setRemoveId] = useState("")

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchesQuery = `${product.name} ${product.category} ${product.id}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr"))
        const matchesFilter =
          filter === "all" ||
          (filter === "active" && product.active !== false) ||
          (filter === "hidden" && product.active === false)
        return matchesQuery && matchesFilter
      }),
    [products, query, filter],
  )

  const removeTarget = products.find((product) => product.id === removeId)

  const openCreate = () => {
    setEditing(undefined)
    setEditorOpen(true)
  }
  const openEdit = (product: Product) => {
    setEditing(product)
    setEditorOpen(true)
  }

  return (
    <section className="admin-panel" aria-labelledby="admin-products-title">
      <div className="admin-panel-heading">
        <div>
          <span className="eyebrow">KATALOĞU YÖNET</span>
          <h2 id="admin-products-title">Ürünler</h2>
          <p>
            {products.length} kayıt · {filtered.length} sonuç gösteriliyor
          </p>
        </div>
        <Button onClick={openCreate}>
          Yeni Ürün <Icon name="plus" />
        </Button>
      </div>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ürün adı, kategori veya kod ara…"
            aria-label="Yönetim panelinde ürün ara"
          />
        </label>
        <div className="admin-filter-tabs" aria-label="Ürün durumu filtreleri">
          {[
            ["all", "Tümü"],
            ["active", "Yayında"],
            ["hidden", "Gizli"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value as ProductFilter)}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="admin-product-list">
          <div className="admin-product-list-head" aria-hidden="true">
            <span>Ürün</span>
            <span>Fiyat</span>
            <span>Durum</span>
            <span>İşlemler</span>
          </div>
          {filtered.map((product) => (
            <article className="admin-product-row" key={product.id}>
              <div className="admin-product-identity">
                <div className="admin-product-thumb">
                  <ProductArt product={product} />
                </div>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                  <small>{product.id}</small>
                </div>
              </div>
              <div className="admin-product-price">
                <strong>{money(product.price)}</strong>
                {product.oldPrice && <del>{money(product.oldPrice)}</del>}
              </div>
              <button
                className={`admin-status-toggle ${
                  product.active === false ? "is-hidden" : ""
                }`}
                onClick={() => {
                  void toggleProduct(product.id).catch(() => undefined)
                }}
                disabled={isSaving}
                aria-pressed={product.active !== false}
              >
                <span />
                {product.active === false ? "Gizli" : "Yayında"}
              </button>
              <div className="admin-row-actions">
                <button onClick={() => openEdit(product)}>Düzenle</button>
                {product.active === false ? (
                  <span className="disabled-action" aria-label="Gizli ürün">
                    Gizli
                  </span>
                ) : (
                  <a href={`#/urun/${product.id}`} target="_self">
                    Görüntüle
                  </a>
                )}
                <button
                  className="danger"
                  onClick={() => setRemoveId(product.id)}
                >
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <Icon name="search" size={34} />
          <h3>Eşleşen ürün bulunamadı.</h3>
          <p>Aramayı veya durum filtresini değiştirin.</p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("")
              setFilter("all")
            }}
          >
            Filtreleri Temizle
          </Button>
        </div>
      )}

      {dataError && (
        <p className="form-error admin-panel-error" role="alert">
          {dataError}
        </p>
      )}

      {editorOpen && (
        <ProductEditor product={editing} onClose={() => setEditorOpen(false)} />
      )}
      {removeTarget && (
        <Overlay
          title="Ürünü kalıcı olarak sil?"
          onClose={() => setRemoveId("")}
          className="confirm-modal"
        >
          <p>
            <strong>{removeTarget.name}</strong> SQL veritabanından, mağazadan
            ve yönetim listesinden kalıcı olarak kaldırılacak.
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemoveId("")}>
              Vazgeç
            </Button>
            <Button
              variant="dark"
              disabled={isSaving}
              onClick={() => {
                void removeProduct(removeTarget.id)
                  .then(() => setRemoveId(""))
                  .catch(() => undefined)
              }}
            >
              {isSaving ? "Siliniyor…" : "Ürünü Sil"} <Icon name="trash" />
            </Button>
          </div>
        </Overlay>
      )}
    </section>
  )
}

function CategoriesPanel() {
  const {
    products,
    categories,
    isSaving,
    addCategory,
    renameCategory,
    removeCategory,
  } = useCatalog()
  const categoryNames = categories.slice(1)
  const [newName, setNewName] = useState("")
  const [editing, setEditing] = useState("")
  const [editName, setEditName] = useState("")
  const [removeName, setRemoveName] = useState("")
  const [error, setError] = useState("")

  const add = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    try {
      await addCategory(newName)
      setNewName("")
    } catch (categoryError) {
      setError((categoryError as Error).message)
    }
  }

  const saveRename = async (name: string) => {
    setError("")
    try {
      await renameCategory(name, editName)
      setEditing("")
      setEditName("")
    } catch (categoryError) {
      setError((categoryError as Error).message)
    }
  }

  const targetUsage = removeName
    ? products.filter((product) => product.category === removeName).length
    : 0

  return (
    <section className="admin-panel" aria-labelledby="admin-categories-title">
      <div className="admin-panel-heading">
        <div>
          <span className="eyebrow">KATALOĞU DÜZENLE</span>
          <h2 id="admin-categories-title">Kategoriler</h2>
          <p>
            {categoryNames.length} kategori · Yeni kategoriler ürün formunda
            hemen kullanılabilir.
          </p>
        </div>
      </div>

      <form className="admin-category-create" onSubmit={add} noValidate>
        <label className="field">
          Yeni kategori adı
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Örn. Ev & Yaşam"
            maxLength={120}
          />
        </label>
        <Button type="submit" disabled={isSaving || newName.trim().length < 2}>
          {isSaving ? "Ekleniyor…" : "Kategori Ekle"}
          <Icon name="plus" />
        </Button>
      </form>

      {error && (
        <p className="form-error admin-panel-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-category-list">
        {categoryNames.map((name) => {
          const usage = products.filter(
            (product) => product.category === name,
          ).length
          const isEditing = editing === name
          return (
            <article key={name}>
              <div className="admin-category-name">
                <span className="live-dot" />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={120}
                    aria-label={`${name} için yeni kategori adı`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void saveRename(name)
                      }
                      if (event.key === "Escape") setEditing("")
                    }}
                  />
                ) : (
                  <div>
                    <strong>{name}</strong>
                    <small>
                      {usage
                        ? `${usage} üründe kullanılıyor`
                        : "Henüz ürün yok"}
                    </small>
                  </div>
                )}
              </div>
              <div className="admin-row-actions">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => void saveRename(name)}
                      disabled={isSaving || editName.trim().length < 2}
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => {
                        setEditing("")
                        setEditName("")
                      }}
                    >
                      Vazgeç
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditing(name)
                        setEditName(name)
                        setError("")
                      }}
                    >
                      Düzenle
                    </button>
                    <button
                      className="danger"
                      onClick={() => setRemoveName(name)}
                      disabled={usage > 0}
                      title={
                        usage > 0
                          ? "Silmeden önce bu kategorideki ürünleri taşıyın."
                          : undefined
                      }
                    >
                      Sil
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {removeName && (
        <Overlay
          title="Kategoriyi kalıcı olarak sil?"
          onClose={() => setRemoveName("")}
          className="confirm-modal"
        >
          <p>
            <strong>{removeName}</strong> kategori listesinden kaldırılacak.
            {targetUsage > 0
              ? ` Bu kategori ${targetUsage} üründe kullanıldığı için silinemez.`
              : " Bu işlem geri alınamaz."}
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemoveName("")}>
              Vazgeç
            </Button>
            <Button
              variant="dark"
              disabled={isSaving || targetUsage > 0}
              onClick={() => {
                void removeCategory(removeName)
                  .then(() => setRemoveName(""))
                  .catch((categoryError) =>
                    setError((categoryError as Error).message),
                  )
              }}
            >
              {isSaving ? "Siliniyor…" : "Kategoriyi Sil"}
              <Icon name="trash" />
            </Button>
          </div>
        </Overlay>
      )}
    </section>
  )
}

function SettingsPanel() {
  const {
    settings,
    isSaving,
    dataError,
    updateSettings,
    createBackup,
    restoreBackup,
    resetStore,
  } = useCatalog()
  const [draft, setDraft] = useState<StoreSettings>(settings)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState("")
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreCandidate, setRestoreCandidate] = useState<StoreBackup | null>(
    null,
  )
  const [restoreFileName, setRestoreFileName] = useState("")
  const restoreInput = useRef<HTMLInputElement>(null)

  useEffect(() => setDraft(settings), [settings])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const phone = draft.whatsappNumber.replace(/\D/g, "")
    if (phone && !/^\d{10,15}$/.test(phone)) {
      setError("WhatsApp numarasını ülke koduyla birlikte 10–15 hane girin.")
      return
    }
    if (!draft.announcement.trim()) {
      setError("Duyuru metni boş bırakılamaz.")
      return
    }
    let corporateSiteUrl = ""
    try {
      corporateSiteUrl = new URL(draft.corporateSiteUrl.trim()).toString()
      if (!/^https?:$/.test(new URL(corporateSiteUrl).protocol)) throw new Error()
    } catch {
      setError("Kurumsal site adresini https:// ile başlayan geçerli bir URL olarak girin.")
      return
    }
    if (draft.seller.email && !/^\S+@\S+\.\S+$/.test(draft.seller.email)) {
      setError("Geçerli bir işletme e-posta adresi girin.")
      return
    }
    if (
      draft.acceptingOrders &&
      (!/^\d{10,15}$/.test(phone) ||
        !draft.seller.legalName.trim() ||
        !draft.seller.address.trim() ||
        !draft.seller.email.trim())
    ) {
      setError(
        "Siparişi açmak için geçerli WhatsApp numarası, işletme adı, adresi ve e-posta bilgisi zorunludur.",
      )
      return
    }
    setError("")
    try {
      await updateSettings({
        ...draft,
        whatsappNumber: phone,
        announcement: draft.announcement.trim(),
        corporateSiteUrl,
        seller: {
          legalName: draft.seller.legalName.trim(),
          address: draft.seller.address.trim(),
          email: draft.seller.email.trim().toLocaleLowerCase("tr"),
          registrationId: draft.seller.registrationId.trim(),
          jurisdictionNote: draft.seller.jurisdictionNote.trim(),
        },
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (saveError) {
      setError((saveError as Error).message)
    }
  }

  const downloadBackup = async () => {
    try {
      const backup = await createBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `nart-falcon-magaza-yedek-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (backupError) {
      setError((backupError as Error).message)
    }
  }

  const selectBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setError("Yedek dosyası en fazla 50 MB olabilir.")
      return
    }
    try {
      const parsed = JSON.parse(await file.text()) as StoreBackup
      if (
        parsed.schemaVersion !== 1 ||
        !Array.isArray(parsed.products) ||
        !Array.isArray(parsed.categories) ||
        !parsed.settings ||
        !Array.isArray(parsed.activity)
      ) {
        throw new Error("Yedek dosyasının yapısı geçersiz.")
      }
      setRestoreCandidate(parsed)
      setRestoreFileName(file.name)
      setRestoreOpen(true)
      setError("")
    } catch (restoreError) {
      setError(
        restoreError instanceof SyntaxError
          ? "Yedek dosyası geçerli JSON içermiyor."
          : (restoreError as Error).message,
      )
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="admin-settings-title">
      <div className="admin-panel-heading">
        <div>
          <span className="eyebrow">MAĞAZA DAVRANIŞI</span>
          <h2 id="admin-settings-title">Sistem ayarları</h2>
          <p>Vitrine ve WhatsApp sipariş akışına yansıyan ayarlar.</p>
        </div>
      </div>
      <form className="admin-settings-grid" onSubmit={submit} noValidate>
        <div className="admin-settings-card">
          <span className="eyebrow">GENEL</span>
          <label className="field">
            Üst duyuru metni
            <input
              value={draft.announcement}
              onChange={(event) =>
                setDraft({ ...draft, announcement: event.target.value })
              }
              maxLength={100}
            />
          </label>
          <label className="field">
            WhatsApp numarası
            <input
              type="tel"
              value={draft.whatsappNumber}
              onChange={(event) =>
                setDraft({ ...draft, whatsappNumber: event.target.value })
              }
              placeholder="905xxxxxxxxx"
            />
            <small className="field-help">
              Boş bırakırsanız WhatsApp açılmaz; mesaj kopyalama kullanılabilir.
            </small>
          </label>
          <label className="field">
            Kurumsal site adresi
            <input
              type="url"
              value={draft.corporateSiteUrl}
              onChange={(event) =>
                setDraft({ ...draft, corporateSiteUrl: event.target.value })
              }
              placeholder="https://www.nartfalcon.com"
            />
            <small className="field-help">
              Mağazadaki Creative Studio bağlantısı bu adrese döner.
            </small>
          </label>
        </div>
        <div className="admin-settings-card">
          <span className="eyebrow">SİPARİŞ MODU</span>
          <label className="admin-switch-row admin-setting-switch">
            <input
              type="checkbox"
              checked={draft.acceptingOrders}
              onChange={(event) =>
                setDraft({ ...draft, acceptingOrders: event.target.checked })
              }
            />
            <span>
              <strong>Sipariş alımını açık tut</strong>
              <small>
                Kapalıysa yeni ürünler sepete eklenemez ve WhatsApp siparişi
                başlatılamaz.
              </small>
            </span>
          </label>
          <div
            className={`admin-order-state ${
              draft.acceptingOrders ? "is-open" : ""
            }`}
          >
            <span />
            <div>
              <strong>
                {draft.acceptingOrders
                  ? "Mağaza siparişe açık"
                  : "Sipariş alımı kapalı"}
              </strong>
              <p>
                {draft.acceptingOrders
                  ? "Müşteriler ürün seçip WhatsApp mesajı hazırlayabilir."
                  : "Vitrin görünür kalır; yeni sipariş aksiyonları durdurulur."}
              </p>
            </div>
          </div>
        </div>
        <div className="admin-settings-card admin-settings-card-wide">
          <span className="eyebrow">İŞLETME & YASAL BİLGİLER</span>
          <div className="admin-business-grid">
            <label className="field">
              Resmî işletme / satıcı adı
              <input
                value={draft.seller.legalName}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    seller: { ...draft.seller, legalName: event.target.value },
                  })
                }
                maxLength={190}
              />
            </label>
            <label className="field">
              İşletme e-posta adresi
              <input
                type="email"
                value={draft.seller.email}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    seller: { ...draft.seller, email: event.target.value },
                  })
                }
                maxLength={190}
              />
            </label>
            <label className="field admin-field-wide">
              İşletme / iade adresi
              <textarea
                rows={3}
                value={draft.seller.address}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    seller: { ...draft.seller, address: event.target.value },
                  })
                }
                maxLength={500}
              />
            </label>
            <label className="field">
              Kayıt / vergi bilgisi
              <input
                value={draft.seller.registrationId}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    seller: {
                      ...draft.seller,
                      registrationId: event.target.value,
                    },
                  })
                }
                maxLength={190}
              />
            </label>
            <label className="field">
              Yetki alanı / ek yasal not
              <input
                value={draft.seller.jurisdictionNote}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    seller: {
                      ...draft.seller,
                      jurisdictionNote: event.target.value,
                    },
                  })
                }
                maxLength={300}
              />
            </label>
          </div>
          <p className="field-help">
            Bu bilgiler gizlilik, yasal bilgilendirme ve teslimat/iade
            sayfalarında kullanılır. Metinleri canlı satış öncesinde yetkili bir
            uzmana kontrol ettirin.
          </p>
        </div>
        {(error || dataError) && (
          <p className="form-error admin-settings-error" role="alert">
            {error || dataError}
          </p>
        )}
        <div className="admin-form-actions admin-settings-actions">
          {saved && (
            <span className="admin-saved">
              <Icon name="check" size={16} /> Ayarlar kaydedildi
            </span>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Kaydediliyor…" : "Ayarları Kaydet"}{" "}
            <Icon name="check" />
          </Button>
        </div>
      </form>

      <div className="admin-maintenance">
        <div>
          <span className="eyebrow">VERİ YÖNETİMİ</span>
          <h3>SQL mağaza verileri</h3>
          <p>
            Ürünleri, ayarları ve işlem geçmişini sunucudan JSON olarak
            yedekleyebilirsiniz.
          </p>
        </div>
        <div>
          <Button variant="outline" onClick={() => void downloadBackup()}>
            Yedeği İndir <Icon name="down" />
          </Button>
          <Button variant="outline" onClick={() => restoreInput.current?.click()}>
            Yedeği Geri Yükle <Icon name="up" />
          </Button>
          <input
            ref={restoreInput}
            className="admin-hidden-file"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void selectBackup(event)}
          />
          <Button
            variant="text"
            onClick={() => {
              setResetConfirm("")
              setResetOpen(true)
            }}
          >
            Sistemi Sıfırla
          </Button>
        </div>
      </div>

      {restoreOpen && restoreCandidate && (
        <Overlay
          title="SQL mağaza yedeğini geri yükle?"
          onClose={() => {
            setRestoreOpen(false)
            setRestoreCandidate(null)
          }}
          className="confirm-modal"
        >
          <p>
            <strong>{restoreFileName}</strong> içindeki {restoreCandidate.products.length}{" "}
            ürün ve {restoreCandidate.categories.length} kategori mevcut mağaza
            verilerinin yerini alacak. İşlem tek transaction içinde yapılır; önce
            güncel yedeği indirmeniz önerilir.
          </p>
          <div className="form-actions">
            <Button
              variant="outline"
              onClick={() => {
                setRestoreOpen(false)
                setRestoreCandidate(null)
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="dark"
              disabled={isSaving}
              onClick={() => {
                void restoreBackup(restoreCandidate)
                  .then(() => {
                    setRestoreOpen(false)
                    setRestoreCandidate(null)
                  })
                  .catch((restoreError) =>
                    setError((restoreError as Error).message),
                  )
              }}
            >
              {isSaving ? "Geri yükleniyor…" : "Yedeği Geri Yükle"}{" "}
              <Icon name="up" />
            </Button>
          </div>
        </Overlay>
      )}

      {resetOpen && (
        <Overlay
          title="SQL mağaza verilerini sıfırla?"
          onClose={() => {
            setResetOpen(false)
            setResetConfirm("")
          }}
          className="confirm-modal"
        >
          <p>
            Eklediğiniz ürünler ve değiştirdiğiniz ayarlar silinecek; ilk ürün
            kataloğu geri yüklenecek. Önce yedek indirmeniz önerilir.
          </p>
          <label className="field">
            Onaylamak için <strong>SIFIRLA</strong> yazın
            <input
              autoFocus
              value={resetConfirm}
              onChange={(event) => setResetConfirm(event.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="form-actions">
            <Button
              variant="outline"
              onClick={() => {
                setResetOpen(false)
                setResetConfirm("")
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="dark"
              disabled={isSaving || resetConfirm !== "SIFIRLA"}
              onClick={() => {
                void resetStore()
                  .then(() => {
                    setResetOpen(false)
                    setResetConfirm("")
                  })
                  .catch((resetError) =>
                    setError((resetError as Error).message),
                  )
              }}
            >
              {isSaving ? "Sıfırlanıyor…" : "Sıfırla"} <Icon name="trash" />
            </Button>
          </div>
        </Overlay>
      )}
    </section>
  )
}

function ActivityPanel() {
  const { activity } = useCatalog()
  return (
    <section className="admin-panel" aria-labelledby="admin-activity-title">
      <div className="admin-panel-heading">
        <div>
          <span className="eyebrow">DENETİM İZİ</span>
          <h2 id="admin-activity-title">İşlem geçmişi</h2>
          <p>SQL veritabanına kaydedilen son 40 yönetim işlemi.</p>
        </div>
      </div>
      {activity.length ? (
        <div className="admin-activity-list">
          {activity.map((item) => (
            <article key={item.id}>
              <span className="live-dot" />
              <div>
                <strong>{item.action}</strong>
                <p>{item.detail}</p>
              </div>
              <time dateTime={item.createdAt}>
                {formatDate(item.createdAt)}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <Icon name="check" size={34} />
          <h3>Henüz kayıtlı işlem yok.</h3>
          <p>Ürün veya ayar değişikliği yaptığınızda burada görünecek.</p>
        </div>
      )}
    </section>
  )
}

function AdminLogin() {
  const { login, isSaving, dataError } = useCatalog()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Geçerli yönetici e-posta adresini girin.")
      return
    }
    if (!password) {
      setError("Yönetici parolasını girin.")
      return
    }
    setError("")
    try {
      await login(email.trim().toLocaleLowerCase("tr"), password)
    } catch (loginError) {
      setError((loginError as Error).message)
    }
  }

  return (
    <main className="admin-page admin-gate-page">
      <section className="admin-gate" aria-labelledby="admin-login-title">
        <img src="/assets/logo.svg" alt="Nart Falcon Store" />
        <span className="eyebrow">GÜVENLİ YÖNETİM</span>
        <h1 id="admin-login-title">Yönetim paneli girişi.</h1>
        <p>SQL veritabanındaki mağaza verilerini yönetmek için oturum açın.</p>
        <form onSubmit={submit} noValidate>
          <label className="field">
            E-posta
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            Parola
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {(error || dataError) && (
            <p className="form-error" role="alert">
              {error || dataError}
            </p>
          )}
          <Button type="submit" disabled={isSaving} className="full-width">
            {isSaving ? "Giriş yapılıyor…" : "Güvenli Giriş"}
            <Icon name="arrow" />
          </Button>
        </form>
        <a className="text-link" href="#/">
          Mağazaya dön <Icon name="arrow" />
        </a>
      </section>
    </main>
  )
}

function AdminGate({
  mode,
  error,
  onRetry,
}: {
  mode: "loading" | "not-installed" | "error"
  error: string
  onRetry: () => void
}) {
  const installing = mode === "not-installed"
  return (
    <main className="admin-page admin-gate-page">
      <section className="admin-gate" aria-live="polite">
        <img src="/assets/logo.svg" alt="Nart Falcon Store" />
        <span className="eyebrow">NART FALCON / SQL CONTROL</span>
        <h1>
          {mode === "loading"
            ? "Veriler bağlanıyor."
            : installing
              ? "Kurulum gerekli."
              : "Veritabanına ulaşılamıyor."}
        </h1>
        <p>
          {mode === "loading"
            ? "Mağaza verileri güvenli API üzerinden alınıyor."
            : error}
        </p>
        {installing ? (
          <a className="button button-primary" href="/install.php">
            Otomatik Kurulumu Aç <Icon name="diagonal" />
          </a>
        ) : mode === "error" ? (
          <Button onClick={onRetry}>
            Tekrar Dene <Icon name="arrow" />
          </Button>
        ) : (
          <span className="admin-loading-line" />
        )}
      </section>
    </main>
  )
}

export function AdminPage() {
  const {
    products,
    categories,
    settings,
    backendMode,
    isLoading,
    isAuthenticated,
    adminUser,
    dataError,
    lastSavedAt,
    refresh,
    logout,
  } = useCatalog()
  const [tab, setTab] = useState<AdminTab>("products")
  const active = products.filter((product) => product.active !== false).length
  const hidden = products.length - active
  const categoryCount = categories.length - 1

  if (isLoading || backendMode === "loading") {
    return <AdminGate mode="loading" error="" onRetry={() => void refresh()} />
  }
  if (backendMode === "not-installed") {
    return (
      <AdminGate
        mode="not-installed"
        error={
          dataError ||
          "Veritabanını ve ilk yönetici hesabını oluşturmak için kurulum dosyasını çalıştırın."
        }
        onRetry={() => void refresh()}
      />
    )
  }
  if (backendMode === "error") {
    return (
      <AdminGate
        mode="error"
        error={dataError}
        onRetry={() => void refresh()}
      />
    )
  }
  if (backendMode === "sql" && !isAuthenticated) return <AdminLogin />

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-hero">
          <div>
            <span className="eyebrow">NART FALCON / STORE CONTROL</span>
            <h1>Mağaza yönetimi.</h1>
            <p>Ürün, içerik ve sipariş davranışını tek yerden yönetin.</p>
          </div>
          <div className="admin-hero-actions">
            <span
              className={`admin-live-state ${
                settings.acceptingOrders ? "is-open" : ""
              }`}
            >
              <i />{" "}
              {settings.acceptingOrders ? "Siparişe açık" : "Sipariş kapalı"}
            </span>
            <a className="button button-outline" href="#/magaza">
              Mağazayı Gör <Icon name="diagonal" />
            </a>
          </div>
        </header>

        <div className="admin-local-notice">
          <Icon name={dataError ? "alert" : "shield"} />
          <div>
            <strong>
              {dataError
                ? "Bağlantı sorunu"
                : backendMode === "sql"
                  ? "SQL bağlantısı aktif"
                  : "Geliştirme önizlemesi"}
            </strong>
            <p>
              {dataError ||
                (backendMode === "sql"
                  ? `Veriler MySQL'de saklanıyor. Oturum: ${adminUser?.email || "yönetici"}.`
                  : "PHP API yerel Vite önizlemesinde çalışmadığı için geçici demo verileri kullanılıyor. Yayında SQL zorunludur.")}
            </p>
          </div>
          {lastSavedAt && !dataError && (
            <span>
              Son kayıt{" "}
              {new Date(lastSavedAt).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {backendMode === "sql" && (
            <button className="admin-logout" onClick={() => void logout()}>
              Oturumu kapat
            </button>
          )}
        </div>

        <section className="admin-stats" aria-label="Mağaza özeti">
          <article>
            <span>Toplam ürün</span>
            <strong>{products.length.toString().padStart(2, "0")}</strong>
            <small>{active} ürün yayında</small>
          </article>
          <article>
            <span>Yayında</span>
            <strong>{active.toString().padStart(2, "0")}</strong>
            <small>Mağazada görünen ürün</small>
          </article>
          <article>
            <span>Gizli</span>
            <strong>{hidden.toString().padStart(2, "0")}</strong>
            <small>Yalnızca panelde görünen</small>
          </article>
          <article>
            <span>Kategori</span>
            <strong>{categoryCount.toString().padStart(2, "0")}</strong>
            <small>Aktif katalog grubu</small>
          </article>
        </section>

        <nav className="admin-nav" aria-label="Yönetim bölümleri">
          {[
            ["products", "Ürünler"],
            ["categories", "Kategoriler"],
            ["settings", "Sistem ayarları"],
            ["activity", "İşlem geçmişi"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "active" : ""}
              onClick={() => setTab(value as AdminTab)}
              aria-current={tab === value ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "products" ? (
          <ProductsPanel />
        ) : tab === "categories" ? (
          <CategoriesPanel />
        ) : tab === "settings" ? (
          <SettingsPanel />
        ) : (
          <ActivityPanel />
        )}
      </div>
    </main>
  )
}
