# 🛍️ NART FALCON E-Ticaret Sitesi

**Yazılım Mühendisliği Projesi** | Modern E-Ticaret Platformu | React + Vite + Tailwind CSS

---

## 📋 İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Teknoloji Stack](#teknoloji-stack)
- [Kurulum ve Başlangıç](#kurulum-ve-başlangıç)
- [Proje Yapısı](#proje-yapısı)
- [Mimari Tasarım](#mimari-tasarım)
- [Tasarım Sistemi](#tasarım-sistemi)
- [Özellikler](#özellikler)
- [Geliştirme Rehberi](#geliştirme-rehberi)
- [Best Practices](#best-practices)

---

## 🎯 Proje Hakkında

**NART FALCON E-Ticaret Sitesi**, modern web teknolojileriyle geliştirilmiş, ölçeklenebilir ve bakımlanabilir bir e-ticaret platformudur. Proje, yazılım mühendisliği öğrencisinin full-stack geliştirme becerilerini sergilemeye yönelik kapsamlı bir çalışmadır.

### Temel Amaçlar
- ✅ Kullanıcı dostu ve responsive arayüz
- ✅ Etkili ürün yönetimi ve katalog sistemi
- ✅ Yönetim paneli (Admin Dashboard)
- ✅ Modern yazılım mimarisi ve best practices
- ✅ Type-safe geliştirme (TypeScript)
- ✅ Performans optimizasyonu

---

## 🛠️ Teknoloji Stack

### Frontend Framework
- **React 19** - UI component library, latest hooks ve concurrent features
- **TypeScript 5.7** - Static typing, better IDE support ve compile-time error detection

### Build & Dev Tooling
- **Vite 8** - Lightning-fast module bundler ve dev server
  - Instant HMR (Hot Module Replacement)
  - ESM-based development
  - Optimized production builds

### Styling
- **Tailwind CSS v4** - Utility-first CSS framework
  - `@tailwindcss/vite` plugin integration
  - Zero runtime CSS
  - Mobile-first responsive design
  - Dark mode support (hazır)

### Code Quality
- **oxfmt** - TypeScript/JavaScript formatter (consistent code style)
- **TypeScript Strict Mode** - Maksimum type safety

### Package Manager
- **pnpm** - Fast, disk space efficient package manager
- Node.js toolchain managed via **mise.toml**

---

## 📦 Kurulum ve Başlangıç

### Gereksinimler
```bash
Node.js >= 18.x
pnpm >= 8.x
```

### 1. Projeyi Klonla
```bash
git clone https://github.com/Rlosener/nart-falcon-ticaret.git
cd nart-falcon-ticaret
cd "E-Ticaret Sitesi Tasarımı"
```

### 2. Bağımlılıkları Yükle
```bash
pnpm install
```

### 3. Geliştirme Sunucusunu Başlat
```bash
pnpm run dev
```
- Sunucu otomatik olarak `http://localhost:5173` (varsayılan) adresinde başlayacak
- Dosya değişiklikleri otomatik olarak HMR ile reload olur

### 4. Production Build
```bash
pnpm run build
```
- Optimize edilmiş bundle oluşturulur
- `dist/` klasöründe çıktı dosyaları

### 5. Preview (Production Build Test)
```bash
pnpm run preview
```

### 6. Kodu Formatla
```bash
pnpm run format
```

---

## 📁 Proje Yapısı

```
E-Ticaret Sitesi Tasarımı/
├── src/
│   ├── App.tsx              # Ana uygulama bileşeni
│   ├── main.tsx             # React entrypoint
│   ├── index.css            # Global CSS ve Tailwind import
│   ├── admin.tsx            # Admin panel bileşenleri ve mantığı
│   ├── catalog.tsx          # Katalog/Ürün listeleme bileşenleri
│   ├── ui.tsx               # Ortak UI bileşenleri (Button, Modal, Card vb.)
│   ├── data.ts              # Statik veri ve mock data
│   └── vite-env.d.ts        # Vite type definitions
│
├── index.html               # HTML shell, #root element
├── vite.config.ts           # Vite konfigürasyonu
├── tsconfig.json            # TypeScript konfigürasyonu
├── package.json             # Proje bağımlılıkları ve scripts
├── .mise.toml               # Node.js ve pnpm versiyonları
├── .gitignore               # Git ignore kuralları
├── .gitattributes           # Git attributes
└── README.md                # Bu dosya
```

### Dosya Açıklamaları

#### `src/App.tsx` (88 KB)
Ana uygulama bileşeni. Uygulamanın tüm state yönetimi ve sayfa routing'i burada yapılır:
- Sayfa durumu (home, catalog, admin, product detail)
- Global state management
- Ana layout ve navigation
- Component composition

#### `src/admin.tsx` (60 KB)
Admin panel özellikleri:
- Ürün ekleme/düzenleme formu
- Satış raporları
- Kullanıcı yönetimi
- İstatistik dashboard

#### `src/catalog.tsx` (27 KB)
Ürün katalog sistemi:
- Ürün grid/list view
- Filtreleme (kategori, fiyat, rating)
- Arama fonksiyonalitesi
- Ürün detay sayfası

#### `src/ui.tsx` (11 KB)
Yeniden kullanılabilir UI bileşenleri:
- Button, Input, Select
- Modal, Toast, Dropdown
- Card, Badge, Spinner
- Tailwind CSS utilities ile styling

#### `src/data.ts` (6 KB)
Uygulama verisi:
- Ürün verileri
- Kategori listesi
- Kullanıcı mock data
- Sabit veriler

#### `src/index.css` (90 KB)
Global stil ve Tailwind konfigürasyonu:
- `@import 'tailwindcss';` - Tailwind CSS v4
- Custom font-family tanımları
- Global CSS reset
- Theme customization (colors, spacing, vb.)

---

## 🏗️ Mimari Tasarım

### Sistem Mimarisi

```
┌─────────────────────────────────────────────────────┐
│              React Application (UI Layer)            │
├─────────────────────────────────────────────────────┤
│  App.tsx (State Management & Routing)               │
├──────────────┬──────────────┬───────────────────────┤
│  Admin       │  Catalog     │  UI Components        │
│  Panel       │  (Products)  │  (Reusable)           │
├──────────────┴──────────────┴───────────────────────┤
│           Data Layer (data.ts)                       │
│       - Static data / Mock backend                   │
│       - Product database                            │
│       - User database                               │
└─────────────────────────────────────────────────────┘
         ↓ (In future: API calls)
    Backend API (TBD)
```

### Component Hierarchy

```
<App>
├── <Header/Navigation>
├── <MainPage>
│   ├── <HeroSection/>
│   ├── <FeaturedProducts/>
│   └── <CallToAction/>
├── <CatalogPage>
│   ├── <SidebarFilters/>
│   └── <ProductGrid/>
├── <ProductDetailPage>
│   ├── <ProductImages/>
│   ├── <ProductInfo/>
│   └── <ReviewSection/>
├── <AdminPanel>
│   ├── <Dashboard/>
│   ├── <ProductManager/>
│   ├── <UserManager/>
│   └── <SalesReports/>
└── <Footer/>
```

### Data Flow

1. **Initialization**: App.tsx yüklenir, data.ts'den veriler okunur
2. **State Management**: React hooks (useState, useReducer) ile state yönetimi
3. **Component Rendering**: Props üzerinden veri child component'lere iletilir
4. **Event Handling**: User interactions → setState → re-render
5. **Future Integration**: API calls yerine mock data kullanılıyor (scalable)

### Skalabilite Noktaları
- 🔄 **State Management**: Context API veya Redux geçişi mümkün
- 🌐 **Backend Integration**: Şu anda mock data, gerçek API endpoint'lere kolay geçiş
- 🔐 **Authentication**: Auth system eklenebilir (JWT/Session)
- 📊 **Database**: Backend veritabanı entegrasyonuna hazır

---

## 🎨 Tasarım Sistemi

### Renk Paleti

| Kullanım | Hex | RGB | Açıklama |
|----------|-----|-----|----------|
| Primary | `#3B82F6` | rgb(59, 130, 246) | Ana aksiyon, butonlar |
| Secondary | `#8B5CF6` | rgb(139, 92, 246) | İkincil aksiyonlar |
| Success | `#10B981` | rgb(16, 185, 129) | Başarı mesajları |
| Warning | `#F59E0B` | rgb(245, 158, 11) | Uyarılar |
| Error | `#EF4444` | rgb(239, 68, 68) | Hata mesajları |
| Gray-50 | `#F9FAFB` | rgb(249, 250, 251) | Arka planlar |
| Gray-900 | `#111827` | rgb(17, 24, 39) | Metin, koyu tema |

### Tipografi

```css
/* Heading'ler */
h1 { font-size: 2.25rem; font-weight: 700; line-height: 1.2; }
h2 { font-size: 1.875rem; font-weight: 600; line-height: 1.3; }
h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }

/* Body Text */
body  { font-size: 1rem; line-height: 1.6; }
small { font-size: 0.875rem; line-height: 1.5; }

/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Spacing System

```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
3xl: 4rem (64px)
```

### Component Tasarım

#### Button Variants
```jsx
// Primary
<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
  Button
</button>

// Secondary
<button className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300">
  Button
</button>

// Outline
<button className="border-2 border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50">
  Button
</button>
```

#### Card Component
```jsx
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-gray-600">Card content here</p>
</div>
```

#### Responsive Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

**Mobile-first approach**: 
```jsx
<div className="w-full md:w-1/2 lg:w-1/3">
  // Mobile: full width
  // Medium+: 50% width
  // Large+: 33.33% width
</div>
```

### İkonografi
- Heroicons veya Font Awesome eklenebilir
- SVG icon kullanımı tercih edilir (inline)

### Animasyon & Transitions
```css
/* Tailwind default transitions */
transition-all duration-200 ease-in-out
transition-colors duration-150
transition-opacity duration-300

/* Hover effects */
hover:shadow-lg
hover:scale-105
focus:ring-2 focus:ring-blue-500
```

---

## ✨ Özellikler

### ✅ Tamamlanan Özellikler

#### 1. Ürün Katalog Sistemi
- [x] Ürün grid/list görünümü
- [x] Ürün filtreleme (kategori, fiyat aralığı, rating)
- [x] Arama ve sıralama
- [x] Ürün detay sayfası
- [x] Ürün resimleri ve açıklamalar
- [x] Rating ve reviews

#### 2. Admin Dashboard
- [x] Ürün ekleme/düzenleme/silme (CRUD)
- [x] Kategori yönetimi
- [x] Satış raporları ve istatistikler
- [x] Kullanıcı yönetimi
- [x] Dashboard overview
- [x] Form validasyonu

#### 3. UI/UX
- [x] Responsive design (mobile, tablet, desktop)
- [x] Dark mode desteği
- [x] Smooth transitions ve animations
- [x] Tailwind CSS styling
- [x] Consistent component library
- [x] Accessibility (ARIA labels, semantic HTML)

#### 4. Teknik Özellikleri
- [x] TypeScript strict mode
- [x] Component based architecture
- [x] Reusable components
- [x] Fast HMR development
- [x] Vite optimized build
- [x] SEO friendly HTML structure

### 🔄 Planlanan Özellikler (Future)

- [ ] Backend API entegrasyonu (Node.js/Express)
- [ ] Kullanıcı authentication (JWT)
- [ ] Veritabanı (PostgreSQL/MongoDB)
- [ ] Sepet ve ödeme sistemi
- [ ] Email notifikasyonları
- [ ] Kullanıcı profili ve order history
- [ ] Payment gateway (Stripe/PayPal)
- [ ] Inventory management
- [ ] Multi-language support (i18n)
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Analytics integration
- [ ] PWA desteği

---

## 👨‍💻 Geliştirme Rehberi

### Temel Geliştirme Akışı

#### 1. Yeni Component Oluşturma

**File: `src/components/ProductCard.tsx`**
```typescript
import React from 'react';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  rating: number;
  onClick: () => void;
}

export default function ProductCard({
  id,
  name,
  price,
  image,
  rating,
  onClick,
}: ProductCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <img
        src={image}
        alt={name}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <h3 className="text-lg font-semibold mb-2">{name}</h3>
      <div className="flex justify-between items-center">
        <span className="text-blue-600 font-bold text-xl">${price}</span>
        <span className="text-yellow-500">★ {rating}</span>
      </div>
    </div>
  );
}
```

#### 2. State Yönetimi (Hooks)

```typescript
// useState örneği
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(false);

// useEffect örneği
useEffect(() => {
  const loadProducts = async () => {
    setLoading(true);
    // API call veya veri yükleme
    setLoading(false);
  };
  loadProducts();
}, []); // Dependency array

// useReducer örneği (kompleks state için)
const [state, dispatch] = useReducer(reducer, initialState);
```

#### 3. Props Drilling Alternatifi (Context API)

```typescript
// contexts/ProductContext.tsx
import React, { createContext, useState } from 'react';

export const ProductContext = createContext();

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  
  return (
    <ProductContext.Provider value={{ products, setProducts }}>
      {children}
    </ProductContext.Provider>
  );
}

// Kullanımı
const { products } = useContext(ProductContext);
```

#### 4. Tailwind CSS ile Styling

```jsx
// Responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns */}
</div>

// Hover ve focus states
<button className="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 active:scale-95 transition-all">
  Click me
</button>

// Dark mode
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

#### 5. Type Safety dengan TypeScript

```typescript
// Interface tanımı
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user'; // Union type
  createdAt: Date;
}

// Generic type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// Function typing
function fetchUsers(): Promise<ApiResponse<User[]>> {
  // ...
}
```

#### 6. Form Handling

```typescript
const [formData, setFormData] = useState({
  name: '',
  price: 0,
  description: '',
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value,
  }));
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Form validasyonu ve submission
  console.log(formData);
};
```

### Projeyi Genişletme

#### Yeni Sayfa Ekleme

1. **Component oluştur** (`src/pages/NewPage.tsx`)
2. **App.tsx'e state ekle**
3. **Navigation'a ekle**
4. **Styling uygula**

Örnek:
```typescript
// App.tsx'e
const [currentPage, setCurrentPage] = useState('home');

// Conditional rendering
{currentPage === 'aboutus' && <AboutUsPage />}
```

#### Stileri Özelleştirme

`src/index.css`'de Tailwind v4 customization:
```css
@import 'tailwindcss';

@theme {
  --color-primary: #3B82F6;
  --color-secondary: #8B5CF6;
  --font-family-serif: "Georgia", serif;
}
```

### Debugging ve Troubleshooting

#### Console Logging
```typescript
console.log('Value:', value); // Standard log
console.error('Error:', error); // Error log
console.warn('Warning:', warning); // Warning
console.table(array); // Table format
```

#### React DevTools
- Chrome/Firefox: React DevTools extension kur
- Component hierarchy inspection
- Props ve state debugging
- Performance profiling

#### TypeScript Errors
```bash
# Type checking
npx tsc --noEmit

# Compiler hataları
# IDE'de immediate feedback
```

---

## ✅ Best Practices

### Code Style

#### 1. Component Naming
```typescript
// ✅ İyi: PascalCase, açıklayıcı
export default function ProductCard() {}

// ❌ Kötü: camelCase, kısa
export default function prodCard() {}
```

#### 2. File Organization
```
✅ Good:
src/
├── components/
│   ├── ProductCard.tsx
│   └── ReviewSection.tsx
├── pages/
├── utils/
└── hooks/

❌ Bad:
src/
├── ProductCard.tsx
├── ReviewSection.tsx
├── helpers.ts
├── utils.ts
```

#### 3. Props ile Type Safety
```typescript
// ✅ İyi
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
}

function Button({ variant = 'primary', ...props }: ButtonProps) {}

// ❌ Kötü
function Button(props) {}
```

### Performance

#### 1. React.memo (Unnecesary Re-renders Önle)
```typescript
// Component sadece props değişirse re-render olur
const ProductCard = React.memo(function ProductCard({ product }) {
  return <div>{product.name}</div>;
});
```

#### 2. useMemo ve useCallback
```typescript
// Expensive calculations
const memoizedValue = useMemo(() => expensiveCalculation(), [dependency]);

// Callback functions
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
```

#### 3. Code Splitting (Future - React.lazy)
```typescript
const AdminPanel = React.lazy(() => import('./AdminPanel'));

<Suspense fallback={<Loading />}>
  <AdminPanel />
</Suspense>
```

### Accessibility (A11y)

```jsx
// ✅ Semantic HTML
<button onClick={handleClick}>Delete</button>
<nav>Navigation</nav>
<main>Main content</main>

// ✅ ARIA labels
<button aria-label="Close menu" onClick={closeMenu}>×</button>
<input type="text" aria-describedby="help-text" />
<span id="help-text">Enter your email</span>

// ✅ Keyboard navigation
<input onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />

// ❌ Non-semantic
<div onClick={handleClick}>Delete</div>
<div>Navigation</div>
```

### Error Handling

```typescript
// Try-catch örneği
try {
  const response = await fetchProducts();
  setProducts(response.data);
} catch (error) {
  console.error('Failed to fetch products:', error);
  setError('Failed to load products. Please try again.');
}

// Validation
if (!email.includes('@')) {
  setEmailError('Invalid email format');
  return;
}
```

### Git & Version Control

```bash
# ✅ Good commit messages
git commit -m "feat: Add product filtering in catalog"
git commit -m "fix: Resolve mobile layout issue on ProductCard"

# ❌ Bad commit messages
git commit -m "fix stuff"
git commit -m "update"
```

### Testing (Future)

```typescript
// Jest + React Testing Library
import { render, screen } from '@testing-library/react';

test('ProductCard renders product name', () => {
  render(<ProductCard product={{ name: 'Test Product' }} />);
  expect(screen.getByText('Test Product')).toBeInTheDocument();
});
```

### Documentation

```typescript
/**
 * Fetches products from the API
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 * @returns {Promise<Product[]>} Array of products
 * @throws {Error} If API call fails
 */
function fetchProducts(page: number, limit: number): Promise<Product[]> {
  // Implementation
}
```

---

## 📚 Kaynaklar ve Linkler

### Resmi Dokümantasyon
- [React 19 Docs](https://react.dev)
- [Vite Guide](https://vite.dev/guide/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Öğrenme Kaynakları
- [React Patterns](https://reactpatterns.com)
- [Web Accessibility Guide](https://www.w3.org/WAI/)
- [JavaScript.info](https://javascript.info)

### Araçlar
- [VS Code](https://code.visualstudio.com/) - Önerilen editor
- [Browser DevTools](https://developer.mozilla.org/en-US/docs/Tools)
- [React DevTools](https://github.com/facebook/react-devtools)

---

## 🤝 Katkı ve Geliştirme

### Pull Request Süreci

1. Feature branch oluştur: `git checkout -b feature/feature-name`
2. Değişiklikleri yap ve test et
3. Commit et: `git commit -m "feat: Add new feature"`
4. Push et: `git push origin feature/feature-name`
5. Pull Request oluştur

### Kod İncelemesi Kriterleri
- ✅ TypeScript type safety sağlanmış
- ✅ Responsive design kontrol edilmiş
- ✅ Accessibility standardlarına uygun
- ✅ Performance impact değerlendirilmiş
- ✅ Testler yazılmış (future)
- ✅ Documentation güncellenmiş

---

## 📞 İletişim ve Destek

**Proje Sahibi**: Yazılım Mühendisliği Öğrencisi  
**Repository**: https://github.com/Rlosener/nart-falcon-ticaret  
**Email**: [email info]

---

## 📄 Lisans

Bu proje eğitim amaçlı oluşturulmuştur. Detaylı bilgi için lisans dosyasını kontrol edin.

---

**Son Güncelleme**: 6 Ekim 2026  
**Version**: 1.0.0  
**Status**: Active Development
