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
