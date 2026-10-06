import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  categories as defaultCategories,
  products as defaultProducts,
  type Product,
  type ProductSize,
} from "./data"

const API_URL = "/api/index.php"
const PRODUCTS_KEY = "nf-admin-products-v1"
const CATEGORIES_KEY = "nf-admin-categories-v1"
const SETTINGS_KEY = "nf-admin-settings-v1"
const ACTIVITY_KEY = "nf-admin-activity-v1"

export type StoreSettings = {
  announcement: string
  whatsappNumber: string
  acceptingOrders: boolean
  corporateSiteUrl: string
  seller: {
    legalName: string
    address: string
    email: string
    registrationId: string
    jurisdictionNote: string
  }
}

export type StoreBackup = {
  schemaVersion: number
  exportedAt: string
  products: Product[]
  categories: string[]
  settings: StoreSettings
  activity: AdminActivity[]
}

export type AdminActivity = {
  id: string
  action: string
  detail: string
  createdAt: string
}

export type AdminUser = {
  id: number
  email: string
}

export type BackendMode = "loading" | "sql" | "demo" | "not-installed" | "error"

type BootstrapPayload = {
  installed: boolean
  products: Product[]
  categories?: string[]
  settings: StoreSettings
  session: {
    authenticated: boolean
    user?: AdminUser
    csrfToken?: string
  }
  activity?: AdminActivity[]
}

export const defaultSettings: StoreSettings = {
  announcement: "TASARIMDAN HAYATA. NART FALCON MAĞAZASIYLA TANIŞ.",
  whatsappNumber: "",
  acceptingOrders: false,
  corporateSiteUrl: "https://lab2.efecanakbulut.com",
  seller: {
    legalName: "",
    address: "",
    email: "",
    registrationId: "",
    jurisdictionNote: "",
  },
}

class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status = 0, code = "api_error") {
    super(message)
    this.status = status
    this.code = code
  }
}

function cloneDefaults() {
  return defaultProducts.map((product) => ({
    ...product,
    active: product.active !== false,
    images: product.images ? [...product.images] : undefined,
    templateVisible: product.templateVisible !== false,
    colors: [...product.colors],
    sizes: product.sizes.map((size) => ({ ...size })),
  }))
}

function normalizeImages(value: unknown, legacyImage: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof legacyImage === "string" && legacyImage
      ? [legacyImage]
      : []
  return Array.from(
    new Set(
      source
        .slice(0, 4)
        .filter(
          (image): image is string =>
            typeof image === "string" &&
            /^data:image\/(?:png|jpe?g|webp);base64,/i.test(image),
        ),
    ),
  )
}

function normalizeSizes(value: unknown): ProductSize[] {
  if (!Array.isArray(value)) return []
  const normalized: ProductSize[] = []
  for (const item of value.slice(0, 20)) {
    const name =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object" && "name" in item
          ? String(item.name).trim()
          : ""
    const rawDelta =
      item && typeof item === "object" && "priceDelta" in item
        ? Number(item.priceDelta)
        : 0
    const priceDelta = Number.isFinite(rawDelta) && rawDelta >= 0 ? rawDelta : 0
    if (name && !normalized.some((size) => size.name === name)) {
      normalized.push({ name, priceDelta })
    }
  }
  return normalized
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== "object") return null
  const product = value as Partial<Product> & {
    sizes?: unknown
    images?: unknown
  }
  const sizes = normalizeSizes(product.sizes)
  const images = normalizeImages(product.images, product.image)
  if (
    typeof product.id !== "string" ||
    !product.id ||
    typeof product.name !== "string" ||
    !product.name ||
    typeof product.category !== "string" ||
    !Number.isFinite(product.price) ||
    !Array.isArray(product.colors) ||
    !product.colors.length ||
    !sizes.length
  ) {
    return null
  }
  return {
    ...product,
    images,
    image: images[0],
    templateVisible: product.templateVisible !== false,
    colors: product.colors.filter(
      (color): color is string => typeof color === "string" && !!color.trim(),
    ),
    sizes,
  } as Product
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function loadDemoProducts() {
  const saved = readStored<unknown>(PRODUCTS_KEY, null)
  if (!Array.isArray(saved)) return cloneDefaults()
  const valid = saved
    .map(normalizeProduct)
    .filter((product): product is Product => product !== null)
  return valid.length
    ? valid.map((product) => ({
        ...product,
        active: product.active !== false,
        images: product.images ? [...product.images] : undefined,
        templateVisible: product.templateVisible !== false,
        colors: [...product.colors],
        sizes: product.sizes.map((size) => ({ ...size })),
      }))
    : cloneDefaults()
}

function loadDemoCategories(products: Product[]) {
  const saved = readStored<unknown>(CATEGORIES_KEY, null)
  const source = Array.isArray(saved) ? saved : defaultCategories.slice(1)
  return Array.from(
    new Set([
      ...source.filter(
        (category): category is string =>
          typeof category === "string" && !!category.trim(),
      ),
      ...products.map((product) => product.category).filter(Boolean),
    ]),
  )
}

function loadDemoSettings(): StoreSettings {
  const saved = readStored<Partial<StoreSettings>>(SETTINGS_KEY, {})
  const seller: Partial<StoreSettings["seller"]> =
    saved.seller && typeof saved.seller === "object" ? saved.seller : {}
  const whatsappNumber =
    typeof saved.whatsappNumber === "string" ? saved.whatsappNumber : ""
  return {
    announcement:
      typeof saved.announcement === "string"
        ? saved.announcement
        : defaultSettings.announcement,
    whatsappNumber,
    acceptingOrders:
      saved.acceptingOrders === true &&
      /^\d{10,15}$/.test(whatsappNumber) &&
      typeof seller.legalName === "string" &&
      !!seller.legalName.trim() &&
      typeof seller.address === "string" &&
      !!seller.address.trim() &&
      typeof seller.email === "string" &&
      /^\S+@\S+\.\S+$/.test(seller.email)
        ? saved.acceptingOrders
        : false,
    corporateSiteUrl:
      typeof saved.corporateSiteUrl === "string" && saved.corporateSiteUrl
        ? saved.corporateSiteUrl
        : defaultSettings.corporateSiteUrl,
    seller: {
      legalName: typeof seller.legalName === "string" ? seller.legalName : "",
      address: typeof seller.address === "string" ? seller.address : "",
      email: typeof seller.email === "string" ? seller.email : "",
      registrationId:
        typeof seller.registrationId === "string" ? seller.registrationId : "",
      jurisdictionNote:
        typeof seller.jurisdictionNote === "string"
          ? seller.jurisdictionNote
          : "",
    },
  }
}

function normalizeSettings(value: Partial<StoreSettings> | undefined): StoreSettings {
  const source = value || {}
  const seller: Partial<StoreSettings["seller"]> =
    source.seller && typeof source.seller === "object" ? source.seller : {}
  const whatsappNumber =
    typeof source.whatsappNumber === "string"
      ? source.whatsappNumber.replace(/\D/g, "")
      : ""
  return {
    announcement:
      typeof source.announcement === "string" && source.announcement.trim()
        ? source.announcement.trim()
        : defaultSettings.announcement,
    whatsappNumber,
    acceptingOrders:
      source.acceptingOrders === true &&
      /^\d{10,15}$/.test(whatsappNumber) &&
      typeof seller.legalName === "string" &&
      !!seller.legalName.trim() &&
      typeof seller.address === "string" &&
      !!seller.address.trim() &&
      typeof seller.email === "string" &&
      /^\S+@\S+\.\S+$/.test(seller.email),
    corporateSiteUrl:
      typeof source.corporateSiteUrl === "string" && source.corporateSiteUrl.trim()
        ? source.corporateSiteUrl.trim()
        : defaultSettings.corporateSiteUrl,
    seller: {
      legalName: typeof seller.legalName === "string" ? seller.legalName : "",
      address: typeof seller.address === "string" ? seller.address : "",
      email: typeof seller.email === "string" ? seller.email : "",
      registrationId:
        typeof seller.registrationId === "string" ? seller.registrationId : "",
      jurisdictionNote:
        typeof seller.jurisdictionNote === "string"
          ? seller.jurisdictionNote
          : "",
    },
  }
}

function loadDemoActivity() {
  const saved = readStored<unknown>(ACTIVITY_KEY, [])
  if (!Array.isArray(saved)) return []
  return saved.filter((item): item is AdminActivity =>
    Boolean(
      item &&
        typeof item.id === "string" &&
        typeof item.action === "string" &&
        typeof item.detail === "string" &&
        typeof item.createdAt === "string",
    ),
  )
}

async function apiRequest<T>(
  resource: string,
  init: RequestInit = {},
  csrfToken = "",
): Promise<T> {
  const [resourceName, ...queryParts] = resource.split("&")
  const query = queryParts.length ? `&${queryParts.join("&")}` : ""
  const response = await fetch(
    `${API_URL}?resource=${encodeURIComponent(resourceName)}${query}`,
    {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...init.headers,
      },
    },
  )
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "SQL API yanıt vermiyor. Sunucuda PHP ve API dosyalarını kontrol edin.",
      response.status,
      "api_unavailable",
    )
  }
  const payload = (await response.json()) as T & {
    error?: string
    code?: string
  }
  if (!response.ok) {
    throw new ApiError(
      payload.error || "Sunucu isteği tamamlanamadı.",
      response.status,
      payload.code || "api_error",
    )
  }
  return payload
}

type CatalogContextValue = {
  products: Product[]
  storefrontProducts: Product[]
  categories: string[]
  settings: StoreSettings
  activity: AdminActivity[]
  backendMode: BackendMode
  isLoading: boolean
  isSaving: boolean
  isAuthenticated: boolean
  adminUser: AdminUser | null
  dataError: string
  lastSavedAt: string
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  upsertProduct: (product: Product, mode: "create" | "update") => Promise<void>
  removeProduct: (id: string) => Promise<void>
  toggleProduct: (id: string) => Promise<void>
  updateSettings: (settings: StoreSettings) => Promise<void>
  createBackup: () => Promise<StoreBackup>
  restoreBackup: (backup: StoreBackup) => Promise<void>
  resetStore: () => Promise<void>
  addCategory: (name: string) => Promise<void>
  renameCategory: (currentName: string, nextName: string) => Promise<void>
  removeCategory: (name: string) => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    import.meta.env.DEV ? cloneDefaults() : [],
  )
  const [categoryNames, setCategoryNames] = useState<string[]>(() =>
    import.meta.env.DEV ? defaultCategories.slice(1) : [],
  )
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings)
  const [activity, setActivity] = useState<AdminActivity[]>([])
  const [backendMode, setBackendMode] = useState<BackendMode>("loading")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [csrfToken, setCsrfToken] = useState("")
  const [dataError, setDataError] = useState("")
  const [lastSavedAt, setLastSavedAt] = useState("")

  const applyBootstrap = useCallback((payload: BootstrapPayload) => {
    const normalizedProducts = payload.products
      .map(normalizeProduct)
      .filter((product): product is Product => product !== null)
    setProducts(normalizedProducts)
    setCategoryNames(
      Array.from(
        new Set([
          ...(payload.categories || []).filter(Boolean),
          ...normalizedProducts.map((product) => product.category),
        ]),
      ),
    )
    setSettings(normalizeSettings(payload.settings))
    setIsAuthenticated(payload.session.authenticated)
    setAdminUser(payload.session.user || null)
    setCsrfToken(payload.session.csrfToken || "")
    setActivity(payload.activity || [])
    setBackendMode("sql")
    setDataError("")
  }, [])

  const loadDemo = useCallback(() => {
    const demoProducts = loadDemoProducts()
    setProducts(demoProducts)
    setCategoryNames(loadDemoCategories(demoProducts))
    setSettings(loadDemoSettings())
    setActivity(loadDemoActivity())
    setIsAuthenticated(true)
    setAdminUser({ id: 0, email: "demo@nartfalcon.local" })
    setBackendMode("demo")
    setDataError("")
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const payload = await apiRequest<BootstrapPayload>("bootstrap")
      applyBootstrap(payload)
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.code === "not_installed") {
        setProducts([])
        setCategoryNames([])
        setSettings(defaultSettings)
        setActivity([])
        setBackendMode("not-installed")
        setIsAuthenticated(false)
        setAdminUser(null)
        setDataError(apiError.message)
      } else if (import.meta.env.DEV) {
        loadDemo()
      } else {
        setProducts([])
        setCategoryNames([])
        setSettings(defaultSettings)
        setActivity([])
        setBackendMode("error")
        setIsAuthenticated(false)
        setAdminUser(null)
        setDataError(apiError.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [applyBootstrap, loadDemo])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const recordDemo = useCallback((action: string, detail: string) => {
    setActivity((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          action,
          detail,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 40),
    )
  }, [])

  useEffect(() => {
    if (backendMode !== "demo") return
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
      setLastSavedAt(new Date().toISOString())
    } catch {
      setDataError(
        "Demo verileri tarayıcıya kaydedilemedi. Görsel boyutunu küçültüp tekrar deneyin.",
      )
    }
  }, [backendMode, products])

  useEffect(() => {
    if (backendMode !== "demo") return
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categoryNames))
      setLastSavedAt(new Date().toISOString())
    } catch {
      setDataError("Demo kategori bilgileri tarayıcıya kaydedilemedi.")
    }
  }, [backendMode, categoryNames])

  useEffect(() => {
    if (backendMode !== "demo") return
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      setLastSavedAt(new Date().toISOString())
    } catch {
      setDataError("Demo ayarları tarayıcıya kaydedilemedi.")
    }
  }, [backendMode, settings])

  useEffect(() => {
    if (backendMode !== "demo") return
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity))
    } catch {
      setDataError("Demo işlem geçmişi kaydedilemedi.")
    }
  }, [activity, backendMode])

  const runSqlMutation = useCallback(
    async (resource: string, init: RequestInit) => {
      setIsSaving(true)
      setDataError("")
      try {
        await apiRequest(resource, init, csrfToken)
        await refresh()
        setLastSavedAt(new Date().toISOString())
      } catch (error) {
        const message = (error as Error).message
        setDataError(message)
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [csrfToken, refresh],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      setIsSaving(true)
      setDataError("")
      try {
        await apiRequest("session", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        })
        await refresh()
      } catch (error) {
        const message = (error as Error).message
        setDataError(message)
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    if (backendMode !== "sql") return
    try {
      await apiRequest("session", { method: "DELETE" }, csrfToken)
    } catch (error) {
      setDataError((error as Error).message)
    } finally {
      setIsAuthenticated(false)
      setAdminUser(null)
      setCsrfToken("")
      setActivity([])
    }
  }, [backendMode, csrfToken])

  const upsertProduct = useCallback(
    async (product: Product, mode: "create" | "update") => {
      if (backendMode === "demo") {
        setProducts((current) =>
          mode === "create"
            ? [{ ...product, active: product.active !== false }, ...current]
            : current.map((item) =>
                item.id === product.id
                  ? { ...product, active: product.active !== false }
                  : item,
              ),
        )
        recordDemo(
          mode === "create" ? "Ürün eklendi" : "Ürün güncellendi",
          product.name,
        )
        return
      }
      await runSqlMutation(
        mode === "create"
          ? "products"
          : `products&id=${encodeURIComponent(product.id)}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          body: JSON.stringify(product),
        },
      )
    },
    [backendMode, recordDemo, runSqlMutation],
  )

  const removeProduct = useCallback(
    async (id: string) => {
      const product = products.find((item) => item.id === id)
      if (backendMode === "demo") {
        setProducts((current) => current.filter((item) => item.id !== id))
        if (product) recordDemo("Ürün silindi", product.name)
        return
      }
      await runSqlMutation(`products&id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    },
    [backendMode, products, recordDemo, runSqlMutation],
  )

  const toggleProduct = useCallback(
    async (id: string) => {
      const product = products.find((item) => item.id === id)
      if (!product) return
      const active = product.active === false
      if (backendMode === "demo") {
        setProducts((current) =>
          current.map((item) => (item.id === id ? { ...item, active } : item)),
        )
        recordDemo(
          active ? "Ürün yayınlandı" : "Ürün yayından kaldırıldı",
          product.name,
        )
        return
      }
      await runSqlMutation(`products&id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      })
    },
    [backendMode, products, recordDemo, runSqlMutation],
  )

  const updateSettings = useCallback(
    async (next: StoreSettings) => {
      if (backendMode === "demo") {
        setSettings(next)
        recordDemo(
          "Mağaza ayarları güncellendi",
          next.acceptingOrders ? "Sipariş alımı açık" : "Sipariş alımı kapalı",
        )
        return
      }
      await runSqlMutation("settings", {
        method: "PUT",
        body: JSON.stringify(next),
      })
    },
    [backendMode, recordDemo, runSqlMutation],
  )

  const createBackup = useCallback(async (): Promise<StoreBackup> => {
    if (backendMode === "sql") {
      return apiRequest<StoreBackup>("backup", {}, csrfToken)
    }
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      products,
      categories: categoryNames,
      settings,
      activity,
    }
  }, [activity, backendMode, categoryNames, csrfToken, products, settings])

  const restoreBackup = useCallback(
    async (backup: StoreBackup) => {
      if (
        backup.schemaVersion !== 1 ||
        !Array.isArray(backup.products) ||
        !Array.isArray(backup.categories) ||
        !backup.settings ||
        !Array.isArray(backup.activity)
      ) {
        throw new Error("Yedek dosyası geçersiz veya desteklenmeyen bir sürümde.")
      }
      const nextProducts = backup.products
        .map(normalizeProduct)
        .filter((product): product is Product => product !== null)
      const nextCategories = Array.from(
        new Set(
          backup.categories
            .filter((category): category is string => typeof category === "string")
            .map((category) => category.trim())
            .filter(Boolean),
        ),
      )
      if (
        nextProducts.length !== backup.products.length ||
        !nextCategories.length ||
        nextProducts.some((product) => !nextCategories.includes(product.category))
      ) {
        throw new Error("Yedekte geçersiz ürün veya kategori bilgisi bulunuyor.")
      }
      const nextSettings = normalizeSettings(backup.settings)
      if (backendMode === "demo") {
        setProducts(nextProducts)
        setCategoryNames(nextCategories)
        setSettings(nextSettings)
        setActivity(backup.activity.slice(0, 200))
        recordDemo("Yedek geri yüklendi", `${nextProducts.length} ürün geri yüklendi`)
        return
      }
      await runSqlMutation("restore", {
        method: "POST",
        body: JSON.stringify({
          ...backup,
          products: nextProducts,
          categories: nextCategories,
          settings: nextSettings,
        }),
      })
    },
    [backendMode, recordDemo, runSqlMutation],
  )

  const resetStore = useCallback(async () => {
    if (backendMode === "demo") {
      setProducts(cloneDefaults())
      setCategoryNames(defaultCategories.slice(1))
      setSettings(defaultSettings)
      setActivity([])
      recordDemo(
        "Sistem sıfırlandı",
        "Varsayılan ürünler ve ayarlar geri yüklendi",
      )
      return
    }
    await runSqlMutation("reset", { method: "POST", body: "{}" })
  }, [backendMode, recordDemo, runSqlMutation])

  const addCategory = useCallback(
    async (name: string) => {
      const normalized = name.trim().replace(/\s+/g, " ")
      if (normalized.length < 2)
        throw new Error("Kategori adı en az 2 karakter olmalı.")
      if (
        categoryNames.some(
          (category) =>
            category.toLocaleLowerCase("tr") ===
            normalized.toLocaleLowerCase("tr"),
        )
      ) {
        throw new Error("Bu kategori zaten mevcut.")
      }
      if (backendMode === "demo") {
        setCategoryNames((current) => [...current, normalized])
        recordDemo("Kategori eklendi", normalized)
        return
      }
      await runSqlMutation("categories", {
        method: "POST",
        body: JSON.stringify({ name: normalized }),
      })
    },
    [backendMode, categoryNames, recordDemo, runSqlMutation],
  )

  const renameCategory = useCallback(
    async (currentName: string, nextName: string) => {
      const normalized = nextName.trim().replace(/\s+/g, " ")
      if (normalized.length < 2)
        throw new Error("Kategori adı en az 2 karakter olmalı.")
      if (
        categoryNames.some(
          (category) =>
            category !== currentName &&
            category.toLocaleLowerCase("tr") ===
              normalized.toLocaleLowerCase("tr"),
        )
      ) {
        throw new Error("Bu kategori zaten mevcut.")
      }
      if (backendMode === "demo") {
        setCategoryNames((current) =>
          current.map((category) =>
            category === currentName ? normalized : category,
          ),
        )
        setProducts((current) =>
          current.map((product) =>
            product.category === currentName
              ? { ...product, category: normalized }
              : product,
          ),
        )
        recordDemo("Kategori güncellendi", `${currentName} → ${normalized}`)
        return
      }
      await runSqlMutation(`categories&id=${encodeURIComponent(currentName)}`, {
        method: "PUT",
        body: JSON.stringify({ name: normalized }),
      })
    },
    [backendMode, categoryNames, recordDemo, runSqlMutation],
  )

  const removeCategory = useCallback(
    async (name: string) => {
      if (products.some((product) => product.category === name)) {
        throw new Error(
          "Bu kategori ürünlerde kullanılıyor. Önce ürünlerin kategorisini değiştirin.",
        )
      }
      if (backendMode === "demo") {
        setCategoryNames((current) =>
          current.filter((category) => category !== name),
        )
        recordDemo("Kategori silindi", name)
        return
      }
      await runSqlMutation(`categories&id=${encodeURIComponent(name)}`, {
        method: "DELETE",
      })
    },
    [backendMode, products, recordDemo, runSqlMutation],
  )

  const storefrontProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products],
  )
  const categories = useMemo(
    () => ["Tüm Ürünler", ...categoryNames],
    [categoryNames],
  )

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      storefrontProducts,
      categories,
      settings,
      activity,
      backendMode,
      isLoading,
      isSaving,
      isAuthenticated,
      adminUser,
      dataError,
      lastSavedAt,
      refresh,
      login,
      logout,
      upsertProduct,
      removeProduct,
      toggleProduct,
      updateSettings,
      createBackup,
      restoreBackup,
      resetStore,
      addCategory,
      renameCategory,
      removeCategory,
    }),
    [
      products,
      storefrontProducts,
      categories,
      settings,
      activity,
      backendMode,
      isLoading,
      isSaving,
      isAuthenticated,
      adminUser,
      dataError,
      lastSavedAt,
      refresh,
      login,
      logout,
      upsertProduct,
      removeProduct,
      toggleProduct,
      updateSettings,
      createBackup,
      restoreBackup,
      resetStore,
      addCategory,
      renameCategory,
      removeCategory,
    ],
  )

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  )
}

export function useCatalog() {
  const value = useContext(CatalogContext)
  if (!value) throw new Error("useCatalog must be used inside CatalogProvider")
  return value
}
