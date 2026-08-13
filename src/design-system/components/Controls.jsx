import { ChevronRight, SearchIcon } from './icons.jsx'

export function Surface({ children, className = '', onClick }) {
  const Component = onClick ? 'button' : 'section'
  return (
    <Component type={onClick ? 'button' : undefined} className={`kr-surface ${className}`} onClick={onClick}>
      {children}
    </Component>
  )
}

export function ServiceTile({ icon, label, circle = false, onClick }) {
  return (
    <button type="button" className={`kr-service-tile ${circle ? 'is-circular' : ''}`} onClick={onClick}>
      <img src={icon} alt="" />
      <span>{label}</span>
    </button>
  )
}

export function SegmentTabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`kr-segment-tabs ${className}`} role="tablist">
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={item.value === value}
          className={item.value === value ? 'is-active' : ''}
          key={item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function FilterChip({ children, active = false, onClick }) {
  return (
    <button type="button" className={`kr-chip ${active ? 'is-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function SearchField({ placeholder, value, onChange }) {
  return (
    <label className="kr-search-field">
      <SearchIcon size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function MenuRow({ label, meta, onClick }) {
  return (
    <button type="button" className="kr-menu-row" onClick={onClick}>
      <span>{label}</span>
      <span className="kr-menu-row__trailing">{meta && <small>{meta}</small>}<ChevronRight size={14} /></span>
    </button>
  )
}

export function ProductCard({ title, description, details, icon }) {
  return (
    <article className="kr-product-card">
      <div className="kr-product-card__heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <img src={icon} alt="" />
      </div>
      <div className="kr-product-card__rule" />
      {details.map((detail) => (
        <div className="kr-product-card__detail" key={detail.label}>
          <span>{detail.label}</span><strong>{detail.value}</strong>
        </div>
      ))}
    </article>
  )
}

export function Button({ children, onClick, disabled = false, className = '', type = 'button', variant = 'primary' }) {
  return <button type={type} className={`kr-button kr-button--${variant} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>
}

export function IconButton({ children, label, onClick, className = '', badge = 0 }) {
  return (
    <button type="button" className={`kr-icon-button ${className}`} aria-label={label} onClick={onClick}>
      {children}
      {badge > 0 && <i>{badge}</i>}
    </button>
  )
}

export function StatusPill({ children, tone = 'brand', className = '' }) {
  return <span className={`kr-status-pill kr-status-pill--${tone} ${className}`}>{children}</span>
}

export function SectionHeading({ eyebrow, title, aside, className = '' }) {
  return <div className={`kr-section-heading ${className}`}><div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>{aside}</div>
}

export function SubBottomNav({ items, active, onChange, className = '' }) {
  return (
    <nav className={`kr-sub-bottom-nav ${className}`} aria-label="화면 메뉴">
      {items.map((item) => {
        const selected = item.id === active
        return (
          <button type="button" key={item.id} className={selected ? 'is-active' : ''} aria-current={selected ? 'page' : undefined} onClick={() => onChange(item.id)}>
            <span>{item.icon}{item.badge > 0 && <i>{item.badge}</i>}</span>
            <b>{item.label}</b>
          </button>
        )
      })}
    </nav>
  )
}
