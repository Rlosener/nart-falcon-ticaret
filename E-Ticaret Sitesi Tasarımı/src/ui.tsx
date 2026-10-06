import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react"
import type { Product } from "./data"

export function Icon({
  name = "arrow",
  size = 20,
}: {
  name?: string
  size?: number
}) {
  const paths: Record<string, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    diagonal: (
      <>
        <path d="M5 19 19 5M5 5h14v14" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 7h16M9 12h11M4 17h16" />,
    plus: <path d="M5 12h14M12 5v14" />,
    minus: <path d="M5 12h14" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m5 9 7 7 7-7" />,
    up: <path d="m5 15 7-7 7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    filter: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="8" cy="7" r="2" />
        <circle cx="16" cy="17" r="2" />
      </>
    ),
    truck: (
      <>
        <path d="M3 5h11v12H3V5ZM14 9h4l3 4v4h-7" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    ),
    return: (
      <>
        <path d="m8 4-5 5 5 5M3 9h11a6 6 0 1 1 0 12h-2" />
      </>
    ),
    chat: (
      <>
        <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.5-5a9 9 0 1 1 16.5-4.5Z" />
        <path d="M8 10h8M8 14h5" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 11 3 3 5-5" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="1" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    trash: (
      <>
        <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
      </>
    ),
    zoom: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6M7 10h6M10 7v6" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.arrow}
    </svg>
  )
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "dark" | "text"
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
export function IconButton({
  label,
  name,
  onClick,
  className = "",
  disabled = false,
}: {
  label: string
  name: string
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      className={`icon-button ${className}`}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={name} />
    </button>
  )
}
export function Quantity({
  value,
  onChange,
  max = 20,
}: {
  value: number
  onChange: (value: number) => void
  max?: number
}) {
  return (
    <div className="quantity">
      <IconButton
        label="Adedi azalt"
        name="minus"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      />
      <span aria-live="polite">{value}</span>
      <IconButton
        label="Adedi artır"
        name="plus"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      />
    </div>
  )
}
export function Overlay({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    ref.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]',
        )
        if (!nodes?.length) return
        const first = nodes[0],
          last = nodes[nodes.length - 1]
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault()
          last.focus()
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", key)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener("keydown", key)
      previous?.focus()
    }
  }, [onClose])
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`drawer ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a[href^="#/"]')) onClose()
        }}
      >
        <div className="drawer-heading">
          <h2>{title}</h2>
          <IconButton label="Kapat" name="close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}
export function ProductArt({
  product,
  alternate = false,
  color,
  imageSrc,
}: {
  product: Product
  alternate?: boolean
  color?: string
  imageSrc?: string
}) {
  const light = color === "Doğal" || color === "Beyaz"
  const uploadedImage = imageSrc || product.images?.[0] || product.image
  return (
    <div
      className={`product-art art-${product.kind} tone-${product.tone} ${
        alternate ? "alternate" : ""
      } ${light ? "light-product" : ""}`}
      role="img"
      aria-label={`${product.name} ürün görseli`}
    >
      {uploadedImage ? (
        <img
          className="product-uploaded-image"
          src={uploadedImage}
          alt=""
          loading="lazy"
        />
      ) : product.templateVisible === false ? (
        <div className="product-image-placeholder">
          <Icon name="alert" size={24} />
          <span>Görsel yok</span>
        </div>
      ) : product.kind === "poster" ? (
        <>
          <div className="print print-back">
            <span>NART FALCON / CREATIVE GOODS</span>
            <strong>
              FARK
              <br />
              YARAT.
            </strong>
            <small>STRATEJİ. TASARIM. TEKNOLOJİ.</small>
          </div>
          <div className="print print-front">
            <span>THE MANIFESTO — 01</span>
            <strong>
              İZ
              <br />
              BIRAK.
            </strong>
            <Icon name="diagonal" size={44} />
            <small>BAĞIMSIZ FİKİRLER. GÜÇLÜ İZLER.</small>
          </div>
        </>
      ) : product.kind === "tote" ? (
        <div className="tote">
          <div className="tote-handle" />
          <div className="tote-body">
            <small>
              NART FALCON
              <br />
              CREATIVE GOODS
            </small>
            <strong>
              FARK
              <br />
              YARAT.
            </strong>
            <span>EVERYDAY. EVERYWHERE.</span>
          </div>
        </div>
      ) : product.kind === "notebook" ? (
        <>
          <div className="notebook notebook-back" />
          <div className="notebook">
            <span>NART FALCON / STUDIO</span>
            <strong>
              İyi fikirler
              <br />
              burada
              <br />
              başlar.
            </strong>
            <div className="book-circle" />
            <small>CREATIVE NOTES — VOL. 01</small>
          </div>
        </>
      ) : product.kind === "tee" ? (
        <div className="tee">
          <div className="tee-neck" />
          <small>
            NART FALCON
            <br />
            <b>FARK YARAT.</b>
          </small>
        </div>
      ) : product.kind === "art" ? (
        <div className="art-print">
          <span>NART FALCON / ART SERIES</span>
          <div className="art-rings">
            <i />
            <i />
            <i />
          </div>
          <strong>
            Beyond
            <br />
            the ordinary.
          </strong>
          <small>EDITION 001 — BOLD</small>
        </div>
      ) : product.kind === "cup" ? (
        <div className="cup">
          <div className="cup-handle" />
          <span>
            MAKE
            <br />
            YOUR
            <br />
            <b>MARK.</b>
          </span>
        </div>
      ) : product.kind === "stickers" ? (
        <div className="sticker-set">
          <b>
            FARK
            <br />
            YARAT.
          </b>
          <span>İZ BIRAK. ↗</span>
          <i>NF</i>
          <small>
            DAHA
            <br />
            ÖZGÜN.
          </small>
        </div>
      ) : product.kind === "object" ? (
        <div className="loop-object">
          <i />
          <i />
        </div>
      ) : null}
    </div>
  )
}
export function HeroArt() {
  return (
    <div
      className="hero-art"
      aria-label="Manifesto koleksiyonu poster ve yaratıcı ürün kompozisyonu"
      role="img"
    >
      <div className="hero-grid" />
      <div className="hero-orbit" />
      <div className="hero-sheet sheet-white">
        <small>NART FALCON / CREATIVE STUDIO</small>
        <strong>
          DAHA
          <br />
          CESUR.
          <br />
          DAHA
          <br />
          ÖZGÜN.
        </strong>
        <div className="sheet-dot" />
      </div>
      <div className="hero-sheet sheet-black">
        <img src="/assets/logo.svg" alt="" />
        <strong>
          FARK
          <br />
          <span>YARAT.</span>
        </strong>
        <div className="sheet-line" />
        <small>
          BAĞIMSIZ FİKİRLER.
          <br />
          GÜÇLÜ İZLER.
        </small>
      </div>
      <div className="hero-sheet sheet-lime">
        <small>THE MANIFESTO — 01</small>
        <strong>
          İZ
          <br />
          BIRAK.
        </strong>
        <Icon name="diagonal" size={48} />
        <span>NART FALCON / CREATIVE GOODS</span>
      </div>
      <div className="hero-label">
        <span className="live-dot" /> MANIFESTO COLLECTION / 2026
      </div>
      <span className="hero-art-index">NF—001</span>
    </div>
  )
}
